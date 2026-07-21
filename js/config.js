/**
 * =============================================================================
 * CONFIGURATION MODULE
 * =============================================================================
 * CF Patient Management System - Indus Hospital
 * =============================================================================
 */

// ==================== HARDCODED API URL ====================
// UPDATE THIS with your Google Apps Script deployment URL
const API_URL = 'https://script.google.com/macros/s/AKfycbyNSf-OKS6SYDI32bW6LKCeA5M8kT__HhnxUwFhYZ0n0bWacsrknx55Jeh_Yf62JJte/exec';

// ==================== STORAGE KEYS ====================
const STORAGE_KEYS = {
    USER: 'pms_user'
};

/**
 * Get the API URL
 */
function getApiUrl() {
    return API_URL;
}

/**
 * Check if API is configured
 */
function isApiConfigured() {
    return API_URL && !API_URL.includes('YOUR_DEPLOYMENT_ID_HERE');
}

/**
 * Get stored user
 */
function getStoredUser() {
    const userData = localStorage.getItem(STORAGE_KEYS.USER);
    if (userData) {
        try {
            return JSON.parse(userData);
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Set stored user
 */
function setStoredUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

/**
 * Clear stored user
 */
function clearStoredUser() {
    localStorage.removeItem(STORAGE_KEYS.USER);
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return getStoredUser() !== null;
}
