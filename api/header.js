// C:\xampp\htdocs\oneclick\api\header.js
// Header and navigation auth checking - Fixes Issue #9 (inconsistent auth, redirects when logged in)

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

/**
 * Check authentication state on every page
 * Issue #9: User was logged in but still redirected to login page
 * Fix: Consistent auth state checking before redirect
 */
async function initializeAuthState() {
    try {
        supabase = await ensureSupabase();
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Auth check error:', error);
            return;
        }
        
        const isAuthenticated = !!session;
        console.log('Auth state:', isAuthenticated ? 'Logged in' : 'Logged out');
        
        // Update UI
        updateHeaderUI(isAuthenticated, session);
        
        // Set up listener for auth changes
        supabase.auth.onAuthStateChange((event, newSession) => {
            console.log('Auth event:', event);
            updateHeaderUI(!!newSession, newSession);
        });
        
    } catch (error) {
        console.error('Unexpected auth error:', error);
    }
}

/**
 * Update header UI based on auth state
 */
function updateHeaderUI(isAuthenticated, session) {
    try {
        // Login/Logout buttons
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const accountLink = document.getElementById('account-link');
        const adminLink = document.getElementById('admin-link');
        
        if (isAuthenticated) {
            // User is logged in
            if (loginBtn) {
                loginBtn.style.display = 'none';
                // Also update text to say "Account" instead of "Login"
                loginBtn.textContent = 'Account';
                loginBtn.href = 'account.html';
            }
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (accountLink) {
                accountLink.style.display = 'inline-block';
                accountLink.href = 'account.html';
                accountLink.onclick = null;  // Remove any redirect
            }
            
            // Show admin link if user is admin
            if (adminLink) {
                checkIfAdmin(session, adminLink);
            }
            
        } else {
            // User is logged out
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (accountLink) {
                accountLink.style.display = 'none';
            }
            if (adminLink) {
                adminLink.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Error updating header UI:', error);
    }
}

/**
 * Check if user is admin and show admin link
 */
async function checkIfAdmin(session, adminLink) {
    try {
        if (!session || !session.user) {
            adminLink.style.display = 'none';
            return;
        }
        
        // Check if user is admin
        const { data: admin, error } = await supabase
            .from('admins')
            .select('id')
            .eq('user_id', session.user.id)
            .single();
        
        if (admin && !error) {
            adminLink.style.display = 'inline-block';
            adminLink.href = '/admin/index.html';
            console.log('✓ Admin access granted');
        } else {
            adminLink.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error checking admin status:', error);
        adminLink.style.display = 'none';
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
            alert('Logout failed: ' + error.message);
            return;
        }
        
        console.log('✓ Logged out');
        
        // Clear local storage
        localStorage.removeItem('checkout-cart');
        
        // Redirect to home
        window.location.href = '/index.html';
        
    } catch (error) {
        console.error('Unexpected logout error:', error);
    }
}

/**
 * Protect pages (redirect if not authenticated)
 */
async function protectPage() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            console.log('Not authenticated, redirecting...');
            window.location.href = '/login.html';
            return;
        }
        
        return session;
        
    } catch (error) {
        console.error('Error protecting page:', error);
        window.location.href = '/login.html';
    }
}

/**
 * Protect admin pages (redirect if not admin)
 */
async function protectAdminPage() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            window.location.href = '/login.html';
            return;
        }
        
        // Check if admin
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('id')
            .eq('user_id', session.user.id)
            .single();
        
        if (adminError || !admin) {
            console.log('Not admin, redirecting...');
            window.location.href = '/index.html';
            return;
        }
        
        return session;
        
    } catch (error) {
        console.error('Error protecting admin page:', error);
        window.location.href = '/index.html';
    }
}

/**
 * Redirect if already logged in (for login/register pages)
 */
async function redirectIfAuthenticated(targetPath = '/account.html') {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Issue #9 FIX: Check for actual error before redirecting
        if (error) {
            console.error('Auth check error:', error);
            return;
        }
        
        // Only redirect if session exists
        if (session) {
            console.log('Already authenticated, redirecting...');
            window.location.href = targetPath;
        }
        
    } catch (error) {
        console.error('Error checking auth before redirect:', error);
    }
}

/**
 * Set up logout button
 */
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeAuthState();
    setupLogoutButton();
});

// Export functions
window.initializeAuthState = initializeAuthState;
window.handleLogout = handleLogout;
window.protectPage = protectPage;
window.protectAdminPage = protectAdminPage;
window.redirectIfAuthenticated = redirectIfAuthenticated;
