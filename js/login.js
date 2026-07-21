/**
 * =============================================================================
 * LOGIN PAGE SCRIPT
 * =============================================================================
 * CF Patient Management System - Indus Hospital
 * =============================================================================
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if already authenticated
    if (isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Check if API is configured
    if (!isApiConfigured()) {
        showLoginError('API not configured. Please update the API_URL in config.js');
    }
    
    // Setup form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('username').focus();
});

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showLoginError('Please enter username and password');
        return;
    }
    
    if (!isApiConfigured()) {
        showLoginError('API not configured. Please update the API_URL in config.js');
        return;
    }
    
    // Show loading
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Signing in...';
    hideLoginError();
    
    try {
        const response = await apiLogin(username, password);
        
        if (response.success && response.data) {
            // Save user
            setStoredUser({
                username: response.data.username,
                displayName: response.data.displayName
            });
            
            showToast('Login successful!', 'success');
            
            // Redirect
            setTimeout(function() {
                window.location.href = 'dashboard.html';
            }, 500);
        } else {
            showLoginError(response.error || 'Invalid credentials');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span class="btn-text">Sign In</span><i class="bi bi-arrow-right"></i>';
        }
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Login failed. Please check your connection.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span class="btn-text">Sign In</span><i class="bi bi-arrow-right"></i>';
    }
}

/**
 * Show login error
 */
function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorText');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = 'flex';
    }
}

/**
 * Hide login error
 */
function hideLoginError() {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}
