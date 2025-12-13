/**
 * User Authentication Check
 * Keeps user logged in across pages
 */

(function() {
    'use strict';

    // Pages that don't require authentication
    const publicPages = [
        '/index.html',
        '/login.html',
        '/register.html',
        '/shop.html',
        '/product.html',
        '/product-details.html',
        '/about.html',
        '/contact.html',
        '/services.html',
        '/privacy-policy.html',
        '/terms-conditions.html'
    ];

    // Check if current page is public
    function isPublicPage() {
        const path = window.location.pathname;
        return publicPages.some(page => path.endsWith(page)) || path === '/' || path.endsWith('/oneclick/');
    }

    // Check user session
    async function checkUserAuth() {
        try {
            // Check localStorage first
            const userDataStr = localStorage.getItem('user_data');
            const isLoggedIn = localStorage.getItem('is_logged_in');

            if (!userDataStr || isLoggedIn !== 'true') {
                if (!isPublicPage()) {
                    window.location.href = '/oneclick/login.html';
                }
                return false;
            }

            // Verify with server
            const response = await fetch('/oneclick/api/check-user-session.php', {
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success && data.isAuthenticated) {
                // Update localStorage with fresh data
                localStorage.setItem('user_data', JSON.stringify(data.user));
                localStorage.setItem('is_logged_in', 'true');
                
                // Update UI if elements exist
                updateUserUI(data.user);
                return true;
            } else {
                // Session expired
                clearUserData();
                if (!isPublicPage()) {
                    window.location.href = '/oneclick/login.html?session_expired=1';
                }
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    // Update user UI elements
    function updateUserUI(user) {
        // Update user name displays
        const userNameElements = document.querySelectorAll('.user-name, [data-user-name]');
        userNameElements.forEach(el => {
            el.textContent = user.name || user.email.split('@')[0];
        });

        // Update user email displays
        const userEmailElements = document.querySelectorAll('.user-email, [data-user-email]');
        userEmailElements.forEach(el => {
            el.textContent = user.email;
        });
    }

    // Clear user data
    function clearUserData() {
        localStorage.removeItem('user_data');
        localStorage.removeItem('is_logged_in');
        sessionStorage.clear();
    }

    // Logout function
    window.userLogout = function() {
        clearUserData();
        
        // Clear server session
        fetch('/oneclick/api/user-logout.php', {
            method: 'POST',
            credentials: 'include'
        }).finally(() => {
            window.location.href = '/oneclick/login.html';
        });
    };

    // Run auth check on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkUserAuth);
    } else {
        checkUserAuth();
    }

    // Expose globally
    window.checkUserAuth = checkUserAuth;
})();
