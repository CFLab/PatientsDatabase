/**
 * =============================================================================
 * AUTHENTICATION SCRIPT
 * =============================================================================
 * Handles authentication check and user display for protected pages
 * =============================================================================
 */

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthentication();
    
    // Display user info
    displayUserInfo();
});

/**
 * Check if user is authenticated, redirect if not
 */
function checkAuthentication() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

/**
 * Display user info in header
 */
function displayUserInfo() {
    const user = getStoredUser();
    const displayNameEl = document.getElementById('displayName');
    
    if (user && displayNameEl) {
        displayNameEl.textContent = user.displayName || user.username;
    }
}

/**
 * Logout user
 */
function logout() {
    clearStoredUser();
    window.location.href = 'index.html';
}

/**
 * Get current username for audit
 */
function getCurrentUsername() {
    const user = getStoredUser();
    return user ? user.username : 'Unknown';
}
