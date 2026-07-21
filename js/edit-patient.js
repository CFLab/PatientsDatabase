/**
 * =============================================================================
 * EDIT PATIENT PAGE SCRIPT — FIXED SEARCH
 * =============================================================================
 */

var allPatients = [];
var selectedPatient = null;

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('dateOfBirth').max = getCurrentDate();
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

    document.getElementById('editPatientForm').addEventListener('submit', handleSubmit);
    document.getElementById('dateOfBirth').addEventListener('change', function () {
        updateAgeDisplay(calculateAge(this.value));
    });
    document.getElementById('heightCm').addEventListener('input', recalcBMI);
    document.getElementById('weightKg').addEventListener('input', recalcBMI);

    document.getElementById('trikaftaToggle').addEventListener('change', function () {
        var on = this.checked;
        document.getElementById('trikaftaLabel').textContent = on ? 'Yes' : 'No';
        document.getElementById('trikaftaOptions').style.display = on ? 'block' : 'none';
        if (!on) {
            document.getElementById('trikaftaDuration').value = '';
            document.getElementById('trikaftaStrength').value = '';
        }
    });

    document.querySelectorAll('input, select').forEach(function (el) {
        el.addEventListener('input', function () { clearFieldError(this.id); });
    });
}

// ==================== SEARCH (FIXED) ====================

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

    var searchMR = String(mrNumber).trim().toLowerCase();
    selectedPatient = allPatients.find(function (p) {
        return String(p.mrNumber).trim().toLowerCase() === searchMR;
    });

    if (!selectedPatient) {
        console.error('Patient NOT found for MR:', mrNumber);
        console.log('Available MRs:', allPatients.map(function(p){ return p.mrNumber; }));
        showToast('Patient not found', 'error');
        return;
    }

    console.log('Patient found:', selectedPatient);

    document.getElementById('patientSearch').value =
        selectedPatient.mrNumber + ' — ' + selectedPatient.patientName;
    hideSearchResults();
    populateForm();

    document.getElementById('editFormSection').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('successCard').style.display = 'none';
}

function populateForm() {
    document.getElementById('mrNumber').value      = selectedPatient.mrNumber;
    document.getElementById('patientName').value    = selectedPatient.patientName;
    document.getElementById('fatherName').value     = selectedPatient.fatherName;
    document.getElementById('dateOfBirth').value    = selectedPatient.dateOfBirth;
    document.getElementById('gender').value         = selectedPatient.gender;
    document.getElementById('heightCm').value       = selectedPatient.heightCm || '';
    document.getElementById('weightKg').value       = selectedPatient.weightKg || '';
    document.getElementById('mutation').value       = selectedPatient.mutation;
    document.getElementById('sweatChloride').value  = selectedPatient.sweatChloride || '';

    var trikafta = selectedPatient.trikafta === 'Yes';
    document.getElementById('trikaftaToggle').checked = trikafta;
    document.getElementById('trikaftaLabel').textContent = trikafta ? 'Yes' : 'No';
    document.getElementById('trikaftaOptions').style.display = trikafta ? 'block' : 'none';

    if (trikafta) {
        document.getElementById('trikaftaDuration').value  = selectedPatient.trikaftaDuration;
        document.getElementById('trikaftaStrength').value   = selectedPatient.trikaftaStrength;
    }

    updateAgeDisplay(calculateAge(selectedPatient.dateOfBirth));
    recalcBMI();
}

function recalcBMI() {
    var h = parseFloat(document.getElementById('heightCm').value) || 0;
    var w = parseFloat(document.getElementById('weightKg').value) || 0;
    updateBMIDisplay(calculateBMI(h, w));
}

// ==================== FORM SUBMISSION ====================

async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedPatient) { showToast('Select a patient first', 'error'); return; }
    clearAllErrors();
    if (!validateForm()) { showToast('Fix errors first', 'error'); return; }

    showLoading('Updating patient...');
    document.getElementById('updateBtn').disabled = true;

    try {
        var patientData = buildPatientData();
        console.log('Sending updatePatient:', patientData);
        var response = await apiUpdatePatient(patientData);
        console.log('Response:', response);
        hideLoading();

        if (response.success) {
            showToast('✅ Patient Updated Successfully', 'success');
            showSuccessCard(patientData);
            loadPatients();
        } else {
            showToast(response.error || 'Failed to update', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showToast('An error occurred.', 'error');
    } finally {
        document.getElementById('updateBtn').disabled = false;
    }
}

function validateForm() {
    var ok = true;
    if (!document.getElementById('patientName').value.trim()) { showFieldError('patientName','Required'); ok=false; }
    if (!document.getElementById('fatherName').value.trim()) { showFieldError('fatherName','Required'); ok=false; }
    var dobErr = validateDOB(document.getElementById('dateOfBirth').value);
    if (dobErr) { showFieldError('dateOfBirth', dobErr); ok=false; }
    if (!document.getElementById('gender').value) { showFieldError('gender','Required'); ok=false; }
    var hErr = validateNumeric(document.getElementById('heightCm').value,'Height',0,300);
    if (hErr) { showFieldError('heightCm',hErr); ok=false; }
    var wErr = validateNumeric(document.getElementById('weightKg').value,'Weight',0,500);
    if (wErr) { showFieldError('weightKg',wErr); ok=false; }
    if (!document.getElementById('mutation').value.trim()) { showFieldError('mutation','Required'); ok=false; }
    var scErr = validateNumeric(document.getElementById('sweatChloride').value,'Sweat Chloride',-1,200);
    if (scErr) { showFieldError('sweatChloride',scErr); ok=false; }
    if (document.getElementById('trikaftaToggle').checked) {
        if (!document.getElementById('trikaftaDuration').value) { showFieldError('trikaftaDuration','Required'); ok=false; }
        if (!document.getElementById('trikaftaStrength').value) { showFieldError('trikaftaStrength','Required'); ok=false; }
    }
    return ok;
}

function buildPatientData() {
    var trikafta = document.getElementById('trikaftaToggle').checked;
    var heightCm = parseFloat(document.getElementById('heightCm').value);
    var weightKg = parseFloat(document.getElementById('weightKg').value);
    var dob      = document.getElementById('dateOfBirth').value;
    var duration = trikafta ? document.getElementById('trikaftaDuration').value : '';

    return {
        mrNumber:         String(selectedPatient.mrNumber).trim(),
        patientName:      sanitizeInput(document.getElementById('patientName').value),
        fatherName:       sanitizeInput(document.getElementById('fatherName').value),
        dateOfBirth:      dob,
        age:              calculateAge(dob),
        gender:           document.getElementById('gender').value,
        heightCm:         heightCm,
        weightKg:         weightKg,
        bmi:              calculateBMI(heightCm, weightKg),
        mutation:         sanitizeInput(document.getElementById('mutation').value),
        sweatChloride:    parseFloat(document.getElementById('sweatChloride').value),
        trikafta:         trikafta ? 'Yes' : 'No',
        trikaftaDuration: duration,
        trikaftaStrength: trikafta ? document.getElementById('trikaftaStrength').value : '',
        lastVisitDate:    getCurrentDate(),
        nextVisitDate:    calculateNextVisitDate(trikafta ? 'Yes' : 'No', duration),
        createdDate:      selectedPatient.createdDate,
        updatedDate:      getCurrentDateTime(),
        updatedBy:        getCurrentUsername()
    };
}

// ==================== SUCCESS CARD ====================

function showSuccessCard(data) {
    document.getElementById('editFormSection').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('successCard').style.display = 'block';

    var html = '';
    html += detailItem('MR Number', data.mrNumber, 'highlight-blue');
    html += detailItem('Patient Name', data.patientName);
    html += detailItem('Father Name', data.fatherName);
    html += detailItem('Gender', data.gender);
    html += detailItem('DOB', formatDateDisplay(data.dateOfBirth));
    html += detailItem('Age', data.age, 'highlight-blue');
    html += detailItem('Height', data.heightCm + ' cm');
    html += detailItem('Weight', data.weightKg + ' kg');
    html += detailItem('BMI', data.bmi);
    html += detailItem('Mutation', data.mutation);
    html += detailItem('Sweat Chloride', data.sweatChloride + ' mmol/L');
    html += detailItem('Trikafta', data.trikafta);
    if (data.trikafta === 'Yes') {
        html += detailItem('Duration', data.trikaftaDuration);
        html += detailItem('Strength', data.trikaftaStrength);
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

function editAnotherPatient() {
    selectedPatient = null;
    document.getElementById('patientSearch').value = '';
    document.getElementById('editPatientForm').reset();
    document.getElementById('trikaftaOptions').style.display = 'none';
    document.getElementById('trikaftaLabel').textContent = 'No';
    document.getElementById('editFormSection').style.display = 'none';
    document.getElementById('successCard').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    updateBMIDisplay(0);
    updateAgeDisplay('');
    clearAllErrors();
    document.getElementById('patientSearch').focus();
}

function clearForm() { editAnotherPatient(); }
