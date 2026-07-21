/**
 * =============================================================================
 * FOLLOW-UP PAGE SCRIPT — FIXED SEARCH
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
        console.log('loadPatients response:', response);

        if (response.success && response.data) {
            allPatients = response.data;
            console.log('Loaded ' + allPatients.length + ' patients');
            // Log first patient for debugging
            if (allPatients.length > 0) {
                console.log('Sample patient:', allPatients[0]);
            }
        } else {
            showToast(response.error || 'Failed to load patients', 'error');
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        showToast('Failed to load patients. Check console for details.', 'error');
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
        // Show all patients on focus when input is empty
        if (this.value.trim().length === 0 && allPatients.length > 0) {
            showSearchResults(allPatients.slice(0, 50)); // Show first 50
        } else if (this.value.trim().length > 0) {
            showSearchResults(filterPatients(this.value.trim()));
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.search-section')) hideSearchResults();
    });

    document.getElementById('followUpForm').addEventListener('submit', handleSubmit);
    document.getElementById('heightCm').addEventListener('input', recalcBMI);
    document.getElementById('weightKg').addEventListener('input', recalcBMI);
    document.getElementById('heightCm').addEventListener('input', function () { clearFieldError('heightCm'); });
    document.getElementById('weightKg').addEventListener('input', function () { clearFieldError('weightKg'); });
}

// ==================== SEARCH (FIXED) ====================

function filterPatients(query) {
    var q = String(query).toLowerCase().trim();
    return allPatients.filter(function (p) {
        var mr   = String(p.mrNumber   || '').toLowerCase();
        var name = String(p.patientName|| '').toLowerCase();
        var father = String(p.fatherName || '').toLowerCase();
        return mr.indexOf(q) > -1 || name.indexOf(q) > -1 || father.indexOf(q) > -1;
    });
}

/**
 * FIXED: Use data-index attribute instead of inline onclick with string escaping
 * This prevents bugs when MR Number contains quotes, spaces, or special chars
 */
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

    // Attach click handlers via delegation (much safer than inline onclick)
    div.querySelectorAll('.search-result-item[data-mr]').forEach(function (item) {
        item.addEventListener('click', function () {
            var mr = decodeURIComponent(this.getAttribute('data-mr'));
            selectPatient(mr);
        });
    });
}

function hideSearchResults() {
    document.getElementById('searchResults').style.display = 'none';
}

// ==================== SELECT PATIENT (FIXED) ====================

function selectPatient(mrNumber) {
    console.log('selectPatient called with:', mrNumber);

    // FIXED: String comparison with trim on both sides
    var searchMR = String(mrNumber).trim().toLowerCase();
    selectedPatient = allPatients.find(function (p) {
        return String(p.mrNumber).trim().toLowerCase() === searchMR;
    });

    if (!selectedPatient) {
        console.error('Patient NOT found for MR:', mrNumber);
        console.log('Available MR numbers:', allPatients.map(function(p) { return p.mrNumber; }));
        showToast('Patient not found', 'error');
        return;
    }

    console.log('Patient found:', selectedPatient);

    document.getElementById('patientSearch').value =
        selectedPatient.mrNumber + ' — ' + selectedPatient.patientName;
    hideSearchResults();

    // Recalculate age from DOB
    selectedPatient.age = calculateAge(selectedPatient.dateOfBirth);

    displayPatientInfo();

    document.getElementById('patientInfoSection').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('successCard').style.display = 'none';

    document.getElementById('heightCm').value = selectedPatient.heightCm || '';
    document.getElementById('weightKg').value = selectedPatient.weightKg || '';
    recalcBMI();

    // Next Visit preview
    if (selectedPatient.trikafta === 'Yes' && selectedPatient.trikaftaDuration) {
        var nextVisit = calculateNextVisitDate('Yes', selectedPatient.trikaftaDuration);
        document.getElementById('nextVisitDate').textContent = formatDateDisplay(nextVisit);
        document.getElementById('nextVisitSection').style.display = 'block';
    } else {
        document.getElementById('nextVisitSection').style.display = 'none';
    }

    document.getElementById('heightCm').focus();
}

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
    html += infoItem('Trikafta', selectedPatient.trikafta, selectedPatient.trikafta === 'Yes' ? 'success' : '');
    if (selectedPatient.trikafta === 'Yes') {
        html += infoItem('Duration', selectedPatient.trikaftaDuration);
        html += infoItem('Strength', selectedPatient.trikaftaStrength);
    }
    html += infoItem('Last Visit', formatDateDisplay(selectedPatient.lastVisitDate));
    if (selectedPatient.nextVisitDate) {
        html += infoItem('Next Visit', formatDateDisplay(selectedPatient.nextVisitDate), 'success');
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

// ==================== FORM SUBMISSION ====================

async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedPatient) { showToast('Please select a patient first', 'error'); return; }
    clearAllErrors();

    var ok = true;
    var hErr = validateNumeric(document.getElementById('heightCm').value, 'Height', 0, 300);
    if (hErr) { showFieldError('heightCm', hErr); ok = false; }
    var wErr = validateNumeric(document.getElementById('weightKg').value, 'Weight', 0, 500);
    if (wErr) { showFieldError('weightKg', wErr); ok = false; }
    if (!ok) { showToast('Please fix the errors', 'error'); return; }

    showLoading('Saving follow-up...');
    document.getElementById('saveBtn').disabled = true;

    try {
        var heightCm = parseFloat(document.getElementById('heightCm').value);
        var weightKg = parseFloat(document.getElementById('weightKg').value);
        var bmi = calculateBMI(heightCm, weightKg);
        var age = calculateAge(selectedPatient.dateOfBirth);
        var nextVisitDate = calculateNextVisitDate(selectedPatient.trikafta, selectedPatient.trikaftaDuration);

        var updateData = {
            mrNumber: String(selectedPatient.mrNumber).trim(),
            heightCm: heightCm,
            weightKg: weightKg,
            bmi: bmi,
            age: age,
            lastVisitDate: getCurrentDate(),
            nextVisitDate: nextVisitDate,
            updatedDate: getCurrentDateTime(),
            updatedBy: getCurrentUsername()
        };

        console.log('Sending updateFollowUp:', updateData);
        var response = await apiUpdateFollowUp(updateData);
        console.log('Response:', response);
        hideLoading();

        if (response.success) {
            showToast('✅ Follow-up Updated Successfully', 'success');
            showSuccessCard(updateData);
            loadPatients();
        } else {
            showToast(response.error || 'Failed to update follow-up', 'error');
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

function showSuccessCard(data) {
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
    html += detailItem('Last Visit', formatDateDisplay(data.lastVisitDate));

    if (selectedPatient.trikafta === 'Yes') {
        html += detailItem('Trikafta Duration', selectedPatient.trikaftaDuration);
        html += detailItem('Trikafta Strength', selectedPatient.trikaftaStrength);
    }

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
    document.getElementById('patientInfoSection').style.display = 'none';
    document.getElementById('successCard').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('nextVisitSection').style.display = 'none';
    updateBMIDisplay(0);
    clearAllErrors();
    document.getElementById('patientSearch').focus();
}

function clearForm() { doAnotherFollowUp(); }
