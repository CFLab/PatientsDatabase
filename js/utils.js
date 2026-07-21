/**
 * =============================================================================
 * UTILITIES MODULE
 * =============================================================================
 * Helper functions for calculations, validation, and UI
 * =============================================================================
 */

// ==================== CALCULATIONS ====================

/**
 * Calculate BMI from height (cm) and weight (kg)
 * BMI = Weight / (Height in meters)^2
 */
function calculateBMI(heightCm, weightKg) {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
        return 0;
    }
    
    // Convert height from cm to meters
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    
    return Math.round(bmi * 10) / 10;
}

/**
 * Get BMI category
 */
function getBMICategory(bmi) {
    if (bmi < 18.5) {
        return { category: 'Underweight', className: 'bmi-underweight' };
    } else if (bmi < 25) {
        return { category: 'Normal', className: 'bmi-normal' };
    } else if (bmi < 30) {
        return { category: 'Overweight', className: 'bmi-overweight' };
    } else {
        return { category: 'Obese', className: 'bmi-obese' };
    }
}

/**
 * Calculate age from date of birth
 * Returns formatted string: "X Years Y Months" or "Y Months" if under 1 year
 */
function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return '';
    
    const dob = new Date(dateOfBirth);
    const today = new Date();
    
    if (isNaN(dob.getTime()) || dob > today) {
        return '';
    }
    
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    
    if (months < 0) {
        years--;
        months += 12;
    }
    
    if (today.getDate() < dob.getDate()) {
        months--;
        if (months < 0) {
            years--;
            months += 12;
        }
    }
    
    if (years === 0) {
        return months + ' Month' + (months !== 1 ? 's' : '');
    } else {
        return years + ' Year' + (years !== 1 ? 's' : '') + ' ' + 
               months + ' Month' + (months !== 1 ? 's' : '');
    }
}

/**
 * Calculate next visit date based on Trikafta duration
 * Friday-only clinic rule
 */
function calculateNextVisitDate(trikafta, duration) {
    if (!trikafta || trikafta === 'No' || !duration) {
        return '';
    }
    
    // Parse duration
    let durationDays = 0;
    if (duration === '28 Days') {
        durationDays = 28;
    } else if (duration === '56 Days') {
        durationDays = 56;
    } else {
        return '';
    }
    
    // Calculate medicine end date
    const today = new Date();
    const endDate = new Date(today.getTime() + (durationDays * 24 * 60 * 60 * 1000));
    
    // Get day of week (0 = Sunday, 5 = Friday, 6 = Saturday)
    const dayOfWeek = endDate.getDay();
    
    // Calculate days to go back to reach Friday
    let daysBack = 0;
    
    if (dayOfWeek === 5) {
        daysBack = 0; // Friday
    } else if (dayOfWeek === 6) {
        daysBack = 1; // Saturday -> Friday
    } else {
        // Sunday (0) to Thursday (4)
        daysBack = dayOfWeek + 2;
    }
    
    const nextVisit = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    return formatDateISO(nextVisit);
}

// ==================== DATE FORMATTING ====================

/**
 * Format date to YYYY-MM-DD
 */
function formatDateISO(date) {
    if (!date) return '';
    if (typeof date === 'string') {
        date = new Date(date);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date for display (DD MMM YYYY)
 */
function formatDateDisplay(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-GB', options);
    } catch (e) {
        return dateString;
    }
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDate() {
    return formatDateISO(new Date());
}

/**
 * Get current datetime in ISO format
 */
function getCurrentDateTime() {
    return new Date().toISOString();
}

// ==================== VALIDATION ====================

/**
 * Sanitize string input
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '').substring(0, 500);
}

/**
 * Validate required field
 */
function validateRequired(value, fieldName) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        return fieldName + ' is required';
    }
    return null;
}

/**
 * Validate numeric field
 */
function validateNumeric(value, fieldName, min, max) {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return fieldName + ' must be a valid number';
    }
    if (min !== undefined && num <= min) {
        return fieldName + ' must be greater than ' + min;
    }
    if (max !== undefined && num > max) {
        return fieldName + ' must be less than ' + max;
    }
    return null;
}

/**
 * Validate date of birth
 */
function validateDOB(dob) {
    if (!dob) {
        return 'Date of Birth is required';
    }
    const date = new Date(dob);
    const today = new Date();
    if (isNaN(date.getTime()) || date > today) {
        return 'Date of Birth cannot be in the future';
    }
    return null;
}

// ==================== UI HELPERS ====================

/**
 * Show loading overlay
 */
function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const msgEl = document.getElementById('loadingMessage');
    if (overlay) {
        if (msgEl) msgEl.textContent = message || 'Loading...';
        overlay.style.display = 'flex';
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Show toast notification
 */
function showToast(message, type) {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    if (!toast) return;
    
    // Set content
    toastMessage.textContent = message;
    
    // Set type
    if (type === 'success') {
        toastTitle.textContent = 'Success';
        toastIcon.className = 'bi bi-check-circle text-success me-2';
    } else if (type === 'error') {
        toastTitle.textContent = 'Error';
        toastIcon.className = 'bi bi-exclamation-circle text-danger me-2';
    } else {
        toastTitle.textContent = 'Info';
        toastIcon.className = 'bi bi-info-circle text-info me-2';
    }
    
    // Show toast
    const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
    bsToast.show();
}

/**
 * Show field error
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.add('is-invalid');
    }
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

/**
 * Clear field error
 */
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.remove('is-invalid');
    }
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
}

/**
 * Clear all field errors
 */
function clearAllErrors() {
    document.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
    document.querySelectorAll('.invalid-feedback').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

/**
 * Update BMI display
 */
function updateBMIDisplay(bmi) {
    const bmiDisplay = document.getElementById('bmiDisplay');
    if (!bmiDisplay) return;
    
    const valueEl = bmiDisplay.querySelector('.bmi-value');
    const categoryEl = bmiDisplay.querySelector('.bmi-category');
    
    // Remove existing classes
    bmiDisplay.classList.remove('bmi-underweight', 'bmi-normal', 'bmi-overweight', 'bmi-obese');
    
    if (!bmi || bmi <= 0) {
        valueEl.textContent = '--';
        categoryEl.textContent = '';
        return;
    }
    
    const { category, className } = getBMICategory(bmi);
    valueEl.textContent = bmi.toFixed(1);
    categoryEl.textContent = category;
    bmiDisplay.classList.add(className);
}

/**
 * Update age display
 */
function updateAgeDisplay(age) {
    const ageDisplay = document.getElementById('ageDisplay');
    if (!ageDisplay) return;
    
    if (age) {
        ageDisplay.innerHTML = '<i class="bi bi-calendar3"></i><span>' + age + '</span>';
    } else {
        ageDisplay.innerHTML = '<i class="bi bi-calendar3"></i><span>Select date of birth</span>';
    }
}

/**
 * Disable/enable button
 */
function setButtonLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    btn.disabled = isLoading;
    
    const spinner = btn.querySelector('.spinner-border');
    const text = btn.querySelector('.btn-text');
    
    if (spinner) {
        spinner.classList.toggle('d-none', !isLoading);
    }
    if (text) {
        text.classList.toggle('d-none', isLoading);
    }
}
