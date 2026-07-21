/**
 * =============================================================================
 * FOLLOW-UP PAGE SCRIPT
 * =============================================================================
 * - Editable: Height, Weight, Trikafta toggle, Duration, Strength
 * - Auto: BMI, Age, Next Visit Date
 * - Read-only: Everything else (name, DOB, mutation, etc.)
 * =============================================================================
 */

var allPatients = [];
var selectedPatient = null;

document.addEventListener('DOMContentLoaded', function () {
    loadPatients();
    setupEventListeners();
});

async function loadPatients() {
    showLoading('Loading patients...');
    try {
        var response = await apiGetAllPatients();
        if (response.success && response.data) {
            allPatients = response.data;
            console.log('Loaded ' + allPatients.length + ' patients');
        } else {
            showToast(response.error || 'Failed to load patients', 'error');
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        showToast('Failed to load patients', 'error');
    } finally {
        hideLoading();
    }
}

function setupEventListeners() {
    var searchInput = document.getElementById('patientSearch');

    searchInput.addEventListener('input', function () {
        var q = this.value.trim();
        if (q.length < 1) { hideSearchResults(); return; }
        showSearchResults(filterPatients(q));
    });

    searchInput.addEventListener('focus', function () {
        if (this.value.trim().length === 0 && allPatients.length > 0) {
            showSearchResults(allPatients.slice(0, 50));
        } else if (this.value.trim().length > 0) {
            showSearchResults(filterPatients(this.value.trim()));
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.search-section')) hideSearchResults();
    });

    document.getElementById('followUpForm').addEventListener('submit', handleSubmit);

    // BMI recalc on height/weight change
    document.getElementById('heightCm').addEventListener('input', recalcBMI);
    document.getElementById('weightKg').addEventListener('input', recalcBMI);
    document.getElementById('heightCm').addEventListener('input', function () { clearFieldError('heightCm'); });
    document.getElementById('weightKg').addEventListener('input', function () { clearFieldError('weightKg'); });

    // Trikafta toggle
    document.getElementById('trikaftaToggle').addEventListener('change', function () {
        var on = this.checked;
        document.getElementById('trikaftaLabel').textContent = on ? 'Yes' : 'No';
        document.getElementById('trikaftaOptions').style.display = on ? 'block' : 'none';

        if (!on) {
            document.getElementById('trikaftaDuration').value = '';
            document.getElementById('trikaftaStrength').value = '';
        }

        updateNextVisitPreview();
    });

    // Duration change → recalculate next visit live
    document.getElementById('trikaftaDuration').addEventListener('change', updateNextVisitPreview);
}

// ==================== SEARCH ====================

function filterPatients(query) {
    var q = String(query).toLowerCase().trim();
    return allPatients.filter(function (p) {
        var mr     = String(p.mrNumber    || '').toLowerCase();
        var name   = String(p.patientName || '').toLowerCase();
        var father = String(p.fatherName  || '').toLowerCase();
        return mr.indexOf(q) > -1 || name.indexOf(q) > -1 || father.indexOf(q) > -1;
    });
}

function showSearchResults(patients) {
    var div = document.getElementById('searchResults');
    if (patients.length === 0) {
        div.innerHTML = '<div class="search-result-item text-muted">No patients found</div>';
        div.style.display = 'block';
        return;
    }

    var html = '';
    for (var i = 0; i < patients.length; i++) {
        var p = patients[i];
        html += '<div class="search-result-item" data-mr="' + encodeURIComponent(String(p.mrNumber)) + '">'
             +    '<span class="mr-number">' + p.mrNumber + '</span> — '
             +    '<span class="patient-name">' + p.patientName + '</span>'
             +    '<br><small class="father-name">S/O ' + p.fatherName + '</small>'
             + '</div>';
    }

    div.innerHTML = html;
    div.style.display = 'block';

    div.querySelectorAll('.search-result-item[data-mr]').forEach(function (item) {
        item.addEventListener('click', function () {
            selectPatient(decodeURIComponent(this.getAttribute('data-mr')));
        });
    });
}

function hideSearchResults() {
    document.getElementById('searchResults').style.display = 'none';
}

// ==================== SELECT PATIENT ====================

function selectPatient(mrNumber) {
    var searchMR = String(mrNumber).trim().toLowerCase();
    selectedPatient = allPatients.find(function (p) {
        return String(p.mrNumber).trim().toLowerCase() === searchMR;
    });

    if (!selectedPatient) {
        showToast('Patient not found', 'error');
        return;
    }

    document.getElementById('patientSearch').value =
        selectedPatient.mrNumber + ' — ' + selectedPatient.patientName;
    hideSearchResults();

    // Recalculate age
    selectedPatient.age = calculateAge(selectedPatient.dateOfBirth);

    // Show read-only info
    displayPatientInfo();

    // Populate editable fields
    document.getElementById('heightCm').value = selectedPatient.heightCm || '';
    document.getElementById('weightKg').value = selectedPatient.weightKg || '';
    recalcBMI();

    // Populate Trikafta fields from patient data
    var trikafta = selectedPatient.trikafta === 'Yes';
    document.getElementById('trikaftaToggle').checked = trikafta;
    document.getElementById('trikaftaLabel').textContent = trikafta ? 'Yes' : 'No';
    document.getElementById('trikaftaOptions').style.display = trikafta ? 'block' : 'none';

    if (trikafta) {
        document.getElementById('trikaftaDuration').value = selectedPatient.trikaftaDuration || '';
        document.getElementById('trikaftaStrength').value = selectedPatient.trikaftaStrength || '';
    } else {
        document.getElementById('trikaftaDuration').value = '';
        document.getElementById('trikaftaStrength').value = '';
    }

    // Show next visit preview
    updateNextVisitPreview();

    // Show form, hide empty/success
    document.getElementById('patientInfoSection').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('successCard').style.display = 'none';

    document.getElementById('heightCm').focus();
}

// ==================== PATIENT INFO DISPLAY ====================

function displayPatientInfo() {
    var html = '';
    html += infoItem('MR Number', selectedPatient.mrNumber);
    html += infoItem('Patient Name', selectedPatient.patientName);
    html += infoItem('Father Name', selectedPatient.fatherName);
    html += infoItem('Date of Birth', formatDateDisplay(selectedPatient.dateOfBirth));
    html += infoItem('Age', selectedPatient.age, 'highlight');
    html += infoItem('Gender', selectedPatient.gender);
    html += infoItem('Mutation', selectedPatient.mutation);
    html += infoItem('Sweat Chloride', selectedPatient.sweatChloride + ' mmol/L');
    html += infoItem('Last Visit', formatDateDisplay(selectedPatient.lastVisitDate));
    if (selectedPatient.nextVisitDate) {
        html += infoItem('Prev Next Visit', formatDateDisplay(selectedPatient.nextVisitDate), 'success');
    }
    document.getElementById('patientInfoGrid').innerHTML = html;
}

function infoItem(label, value, cls) {
    return '<div class="patient-info-item">'
         +   '<span class="label">' + label + '</span>'
         +   '<span class="value' + (cls ? ' ' + cls : '') + '">' + (value || '-') + '</span>'
         + '</div>';
}

function recalcBMI() {
    var h = parseFloat(document.getElementById('heightCm').value) || 0;
    var w = parseFloat(document.getElementById('weightKg').value) || 0;
    updateBMIDisplay(calculateBMI(h, w));
}

/**
 * Live recalculate and display next visit date whenever
 * Trikafta toggle or Duration changes
 */
function updateNextVisitPreview() {
    var trikafta = document.getElementById('trikaftaToggle').checked;
    var duration = document.getElementById('trikaftaDuration').value;

    if (trikafta && duration) {
        var nextVisit = calculateNextVisitDate('Yes', duration);
        document.getElementById('nextVisitDate').textContent = formatDateDisplay(nextVisit);
        document.getElementById('nextVisitSection').style.display = 'block';
    } else {
        document.getElementById('nextVisitSection').style.display = 'none';
        document.getElementById('nextVisitDate').textContent = '--';
    }
}

// ==================== FORM SUBMISSION ====================

async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedPatient) { showToast('Select a patient first', 'error'); return; }
    clearAllErrors();

    // Validate height & weight
    var ok = true;
    var hErr = validateNumeric(document.getElementById('heightCm').value, 'Height', 0, 300);
    if (hErr) { showFieldError('heightCm', hErr); ok = false; }
    var wErr = validateNumeric(document.getElementById('weightKg').value, 'Weight', 0, 500);
    if (wErr) { showFieldError('weightKg', wErr); ok = false; }

    // Validate Trikafta if toggled on
    var trikaftaOn = document.getElementById('trikaftaToggle').checked;
    if (trikaftaOn) {
        if (!document.getElementById('trikaftaDuration').value) {
            showFieldError('trikaftaDuration', 'Duration is required');
            ok = false;
        }
        if (!document.getElementById('trikaftaStrength').value) {
            showFieldError('trikaftaStrength', 'Strength is required');
            ok = false;
        }
    }

    if (!ok) { showToast('Please fix the errors', 'error'); return; }

    showLoading('Saving follow-up...');
    document.getElementById('saveBtn').disabled = true;

    try {
        var heightCm     = parseFloat(document.getElementById('heightCm').value);
        var weightKg     = parseFloat(document.getElementById('weightKg').value);
        var bmi          = calculateBMI(heightCm, weightKg);
        var age          = calculateAge(selectedPatient.dateOfBirth);
        var trikafta     = trikaftaOn ? 'Yes' : 'No';
        var duration     = trikaftaOn ? document.getElementById('trikaftaDuration').value : '';
        var strength     = trikaftaOn ? document.getElementById('trikaftaStrength').value : '';
        var nextVisitDate = calculateNextVisitDate(trikafta, duration);

        var updateData = {
            mrNumber:         String(selectedPatient.mrNumber).trim(),
            heightCm:         heightCm,
            weightKg:         weightKg,
            bmi:              bmi,
            age:              age,
            trikafta:         trikafta,
            trikaftaDuration: duration,
            trikaftaStrength: strength,
            lastVisitDate:    getCurrentDate(),
            nextVisitDate:    nextVisitDate,
            updatedDate:      getCurrentDateTime(),
            updatedBy:        getCurrentUsername()
        };

        console.log('Sending follow-up update:', updateData);
        var response = await apiUpdateFollowUp(updateData);
        console.log('Response:', response);
        hideLoading();

        if (response.success) {
            showToast('✅ Follow-up Updated Successfully', 'success');
            showSuccessCard(updateData, trikafta, duration, strength);
            loadPatients();
        } else {
            showToast(response.error || 'Failed to update', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showToast('An error occurred.', 'error');
    } finally {
        document.getElementById('saveBtn').disabled = false;
    }
}

// ==================== SUCCESS CARD ====================

function showSuccessCard(data, trikafta, duration, strength) {
    document.getElementById('patientInfoSection').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('successCard').style.display = 'block';

    var html = '';
    html += detailItem('MR Number', selectedPatient.mrNumber, 'highlight-blue');
    html += detailItem('Patient Name', selectedPatient.patientName);
    html += detailItem('Age', data.age, 'highlight-blue');
    html += detailItem('Height', data.heightCm + ' cm');
    html += detailItem('Weight', data.weightKg + ' kg');
    html += detailItem('BMI', data.bmi);
    html += detailItem('Trikafta', trikafta);

    if (trikafta === 'Yes') {
        html += detailItem('Duration', duration);
        html += detailItem('Strength', strength);
    }

    html += detailItem('Last Visit', formatDateDisplay(data.lastVisitDate));

    if (data.nextVisitDate) {
        html += '<div class="success-detail-item full-width">'
             +    '<span class="detail-label"><i class="bi bi-calendar-check"></i> Next Visit Date (Friday Clinic)</span>'
             +    '<span class="detail-value">' + formatDateDisplay(data.nextVisitDate) + '</span>'
             + '</div>';
    } else {
        html += '<div class="success-detail-item full-width">'
             +    '<span class="detail-label"><i class="bi bi-calendar-x"></i> Next Visit Date</span>'
             +    '<span class="detail-value">Not applicable (Trikafta: No)</span>'
             + '</div>';
    }

    document.getElementById('successDetails').innerHTML = html;
}

function detailItem(label, value, cls) {
    return '<div class="success-detail-item">'
         +   '<span class="detail-label">' + label + '</span>'
         +   '<span class="detail-value' + (cls ? ' ' + cls : '') + '">' + (value || '-') + '</span>'
         + '</div>';
}

function doAnotherFollowUp() {
    selectedPatient = null;
    document.getElementById('patientSearch').value = '';
    document.getElementById('heightCm').value = '';
    document.getElementById('weightKg').value = '';
    document.getElementById('trikaftaToggle').checked = false;
    document.getElementById('trikaftaLabel').textContent = 'No';
    document.getElementById('trikaftaOptions').style.display = 'none';
    document.getElementById('trikaftaDuration').value = '';
    document.getElementById('trikaftaStrength').value = '';
    document.getElementById('patientInfoSection').style.display = 'none';
    document.getElementById('successCard').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('nextVisitSection').style.display = 'none';
    updateBMIDisplay(0);
    clearAllErrors();
    document.getElementById('patientSearch').focus();
}

function clearForm() { doAnotherFollowUp(); }
