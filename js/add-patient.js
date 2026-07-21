/**
 * =============================================================================
 * ADD PATIENT PAGE SCRIPT
 * =============================================================================
 * Handles Add New Patient form functionality
 * - Live BMI, Age, Next Visit Date calculations
 * - After-save success card showing all details
 * =============================================================================
 */

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function () {
    // Set max date for DOB (today)
    document.getElementById('dateOfBirth').max = getCurrentDate();

    setupEventListeners();

    // Focus MR Number field
    document.getElementById('mrNumber').focus();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Form submission
    document.getElementById('addPatientForm').addEventListener('submit', handleSubmit);

    // Date of Birth change → calculate age
    document.getElementById('dateOfBirth').addEventListener('change', function () {
        updateAgeDisplay(calculateAge(this.value));
    });

    // Height/Weight change → calculate BMI
    document.getElementById('heightCm').addEventListener('input', recalcBMI);
    document.getElementById('weightKg').addEventListener('input', recalcBMI);

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

    // Duration change → update next visit preview
    document.getElementById('trikaftaDuration').addEventListener('change', updateNextVisitPreview);

    // Clear errors on input
    document.querySelectorAll('input, select').forEach(function (el) {
        el.addEventListener('input', function () { clearFieldError(this.id); });
    });
}

// ==================== LIVE CALCULATIONS ====================

function recalcBMI() {
    var h = parseFloat(document.getElementById('heightCm').value) || 0;
    var w = parseFloat(document.getElementById('weightKg').value) || 0;
    updateBMIDisplay(calculateBMI(h, w));
}

/**
 * Show / update next visit preview whenever Trikafta or Duration changes
 */
function updateNextVisitPreview() {
    var trikafta = document.getElementById('trikaftaToggle').checked;
    var duration = document.getElementById('trikaftaDuration').value;
    var section = document.getElementById('nextVisitPreviewSection');
    var dateEl = document.getElementById('nextVisitPreviewDate');

    if (trikafta && duration) {
        var nextVisit = calculateNextVisitDate('Yes', duration);
        dateEl.textContent = formatDateDisplay(nextVisit);
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
        dateEl.textContent = '--';
    }
}

// ==================== FORM SUBMISSION ====================

async function handleSubmit(e) {
    e.preventDefault();
    clearAllErrors();

    if (!validateForm()) {
        showToast('Please fix the errors before submitting', 'error');
        return;
    }

    showLoading('Saving patient...');
    document.getElementById('saveBtn').disabled = true;

    try {
        // Check duplicate MR
        var mrNumber = document.getElementById('mrNumber').value.trim();
        var existsRes = await apiCheckMRExists(mrNumber);

        if (existsRes.success && existsRes.data && existsRes.data.exists) {
            hideLoading();
            showFieldError('mrNumber', 'This MR Number already exists');
            showToast('MR Number already exists', 'error');
            document.getElementById('saveBtn').disabled = false;
            return;
        }

        var patientData = buildPatientData();
        var response = await apiAddPatient(patientData);
        hideLoading();

        if (response.success) {
            showToast('✅ Patient Added Successfully', 'success');
            showSuccessCard(patientData);
        } else {
            showToast(response.error || 'Failed to add patient', 'error');
        }
    } catch (error) {
        console.error('Error adding patient:', error);
        hideLoading();
        showToast('An error occurred. Please try again.', 'error');
    } finally {
        document.getElementById('saveBtn').disabled = false;
    }
}

// ==================== VALIDATION ====================

function validateForm() {
    var ok = true;

    if (!document.getElementById('mrNumber').value.trim()) { showFieldError('mrNumber', 'MR Number is required'); ok = false; }
    if (!document.getElementById('patientName').value.trim()) { showFieldError('patientName', 'Patient Name is required'); ok = false; }
    if (!document.getElementById('fatherName').value.trim()) { showFieldError('fatherName', 'Father Name is required'); ok = false; }

    var dobErr = validateDOB(document.getElementById('dateOfBirth').value);
    if (dobErr) { showFieldError('dateOfBirth', dobErr); ok = false; }

    if (!document.getElementById('gender').value) { showFieldError('gender', 'Gender is required'); ok = false; }

    var hErr = validateNumeric(document.getElementById('heightCm').value, 'Height', 0, 300);
    if (hErr) { showFieldError('heightCm', hErr); ok = false; }

    var wErr = validateNumeric(document.getElementById('weightKg').value, 'Weight', 0, 500);
    if (wErr) { showFieldError('weightKg', wErr); ok = false; }

    if (!document.getElementById('mutation').value.trim()) { showFieldError('mutation', 'Mutation is required'); ok = false; }

    var scErr = validateNumeric(document.getElementById('sweatChloride').value, 'Sweat Chloride', -1, 200);
    if (scErr) { showFieldError('sweatChloride', scErr); ok = false; }

    if (document.getElementById('trikaftaToggle').checked) {
        if (!document.getElementById('trikaftaDuration').value) { showFieldError('trikaftaDuration', 'Duration is required'); ok = false; }
        if (!document.getElementById('trikaftaStrength').value) { showFieldError('trikaftaStrength', 'Strength is required'); ok = false; }
    }

    return ok;
}

// ==================== BUILD DATA ====================

function buildPatientData() {
    var trikafta = document.getElementById('trikaftaToggle').checked;
    var heightCm = parseFloat(document.getElementById('heightCm').value);
    var weightKg = parseFloat(document.getElementById('weightKg').value);
    var dob = document.getElementById('dateOfBirth').value;
    var duration = trikafta ? document.getElementById('trikaftaDuration').value : '';

    return {
        mrNumber: sanitizeInput(document.getElementById('mrNumber').value),
        patientName: sanitizeInput(document.getElementById('patientName').value),
        fatherName: sanitizeInput(document.getElementById('fatherName').value),
        dateOfBirth: dob,
        age: calculateAge(dob),
        gender: document.getElementById('gender').value,
        heightCm: heightCm,
        weightKg: weightKg,
        bmi: calculateBMI(heightCm, weightKg),
        mutation: sanitizeInput(document.getElementById('mutation').value),
        sweatChloride: parseFloat(document.getElementById('sweatChloride').value),
        trikafta: trikafta ? 'Yes' : 'No',
        trikaftaDuration: duration,
        trikaftaStrength: trikafta ? document.getElementById('trikaftaStrength').value : '',
        lastVisitDate: getCurrentDate(),
        nextVisitDate: calculateNextVisitDate(trikafta ? 'Yes' : 'No', duration),
        createdDate: getCurrentDateTime(),
        updatedDate: getCurrentDateTime(),
        updatedBy: getCurrentUsername()
    };
}

// ==================== SUCCESS CARD ====================

/**
 * Hide the form and show a success card with all saved details
 */
function showSuccessCard(data) {
    document.getElementById('addPatientForm').style.display = 'none';
    document.getElementById('successCard').style.display = 'block';

    var html = '';
    html += detailItem('MR Number', data.mrNumber, 'highlight-blue');
    html += detailItem('Patient Name', data.patientName);
    html += detailItem('Father Name', data.fatherName);
    html += detailItem('Gender', data.gender);
    html += detailItem('Date of Birth', formatDateDisplay(data.dateOfBirth));
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

    // Next Visit – prominent
    if (data.nextVisitDate) {
        html += '<div class="success-detail-item full-width">'
             +    '<span class="detail-label"><i class="bi bi-calendar-check"></i> Next Visit Date (Friday Clinic)</span>'
             +    '<span class="detail-value">' + formatDateDisplay(data.nextVisitDate) + '</span>'
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

/**
 * Reset everything so user can add another patient
 */
function addAnotherPatient() {
    document.getElementById('successCard').style.display = 'none';
    document.getElementById('addPatientForm').style.display = 'block';
    document.getElementById('addPatientForm').reset();
    document.getElementById('trikaftaOptions').style.display = 'none';
    document.getElementById('trikaftaLabel').textContent = 'No';
    document.getElementById('nextVisitPreviewSection').style.display = 'none';
    updateBMIDisplay(0);
    updateAgeDisplay('');
    clearAllErrors();
    document.getElementById('mrNumber').focus();
}
