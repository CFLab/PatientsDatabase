/**
 * =============================================================================
 * API MODULE
 * =============================================================================
 * Handles all communication with Google Apps Script backend
 * =============================================================================
 */

/**
 * Make API request to Google Apps Script
 */
async function apiRequest(action, data) {
    const apiUrl = getApiUrl();
    
    if (!apiUrl) {
        return {
            success: false,
            error: 'API URL not configured. Please configure the Google Apps Script deployment URL.'
        };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify({
                action: action,
                ...data
            })
        });

        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            error: error.message || 'Network error occurred'
        };
    }
}

/**
 * Login user
 */
async function apiLogin(username, password) {
    return await apiRequest('login', {
        username: sanitizeInput(username),
        password: password
    });
}

/**
 * Get all patients
 */
async function apiGetAllPatients() {
    return await apiRequest('getAllPatients', {});
}

/**
 * Get patient by MR Number
 */
async function apiGetPatient(mrNumber) {
    return await apiRequest('getPatient', {
        mrNumber: sanitizeInput(mrNumber)
    });
}

/**
 * Search patients
 */
async function apiSearchPatients(query) {
    return await apiRequest('searchPatients', {
        query: sanitizeInput(query)
    });
}

/**
 * Check if MR Number exists
 */
async function apiCheckMRExists(mrNumber) {
    return await apiRequest('checkMRExists', {
        mrNumber: sanitizeInput(mrNumber)
    });
}

/**
 * Add new patient
 */
async function apiAddPatient(patientData) {
    return await apiRequest('addPatient', {
        patient: patientData
    });
}

/**
 * Update follow-up
 */
async function apiUpdateFollowUp(data) {
    console.log('apiUpdateFollowUp called with:', data);
    const result = await apiRequest('updateFollowUp', data);
    console.log('apiUpdateFollowUp result:', result);
    return result;
}

/**
 * Update patient (full edit)
 */
async function apiUpdatePatient(patientData) {
    return await apiRequest('updatePatient', {
        patient: patientData
    });
}
