// ============================================
// auth-guard.js
// AUTHENTICATION GUARD FOR PROTECTED PAGES
// Fixes: Issue #2 (Smart Redirect, Context Preservation)
// ============================================

// Guard against double loading
if (typeof window.__AUTH_GUARD_LOADED__ === 'undefined') {
window.__AUTH_GUARD_LOADED__ = true;

const REDIRECT_AFTER_LOGIN_KEY = 'oc_redirect_after_login';

// ============================================
// CHECK AUTHENTICATION STATUS
// ============================================

async function isUserAuthenticated() {
    try {
        const supabase = await window.ensureSupabase();
        if (!supabase) return false;
        
        const { data: { user }, error } = await supabase.auth.getUser();
        return !error && user !== null;
    } catch (error) {
        console.error('isUserAuthenticated error:', error);
        return false;
    }
}

async function getCurrentUser() {
    try {
        const supabase = await window.ensureSupabase();
        if (!supabase) return null;
        
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) return null;
        return user || null;
    } catch (error) {
        console.error('getCurrentUser error:', error);
        return null;
    }
}

// ============================================
// REDIRECT MANAGEMENT
// ============================================

function setRedirectAfterLogin(path) {
    sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, path);
    console.log('[AuthGuard] Redirect target saved:', path);
}

function consumeRedirectAfterLogin() {
    const path = sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
    if (path) {
        sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
        console.log('[AuthGuard] Redirect target consumed:', path);
    }
    return path;
}

// ============================================
// GUARD: Cart Page
// ============================================

async function guardCartPage() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            console.log('[AuthGuard] Cart: User not authenticated, redirecting to login');
            setRedirectAfterLogin('/oneclick/cart.html');
            window.location.href = '/oneclick/login.html';
            return false;
        }

        console.log('[AuthGuard] Cart: User authenticated ✓');
        return true;
    } catch (error) {
        console.error('[AuthGuard] guardCartPage error:', error);
        window.location.href = '/oneclick/login.html';
        return false;
    }
}

// ============================================
// GUARD: Checkout Page
// ============================================

async function guardCheckoutPage() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            console.log('[AuthGuard] Checkout: User not authenticated, redirecting to login');
            setRedirectAfterLogin('/oneclick/checkout.html');
            window.location.href = '/oneclick/login.html';
            return false;
        }

        // Also check if user has at least one address
        const supabase = await window.ensureSupabase();
        const { data, error } = await supabase
            .from('addresses')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

        if (error) {
            console.error('[AuthGuard] Address check error:', error);
        }

        if (!data || data.length === 0) {
            console.log('[AuthGuard] Checkout: No address found, showing address form');
            window.showCheckoutAddressForm = true;
        }

        console.log('[AuthGuard] Checkout: User authenticated ✓');
        return true;
    } catch (error) {
        console.error('[AuthGuard] guardCheckoutPage error:', error);
        window.location.href = '/oneclick/login.html';
        return false;
    }
}

// ============================================
// GUARD: Wishlist Page
// ============================================

async function guardWishlistPage() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            console.log('[AuthGuard] Wishlist: User not authenticated, redirecting to login');
            setRedirectAfterLogin('/oneclick/wishlist.html');
            window.location.href = '/oneclick/login.html';
            return false;
        }

        console.log('[AuthGuard] Wishlist: User authenticated ✓');
        return true;
    } catch (error) {
        console.error('[AuthGuard] guardWishlistPage error:', error);
        window.location.href = '/oneclick/login.html';
        return false;
    }
}

// ============================================
// GUARD: Account Page
// ============================================

async function guardAccountPage() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            console.log('[AuthGuard] Account: User not authenticated, redirecting to login');
            setRedirectAfterLogin('/oneclick/account.html');
            window.location.href = '/oneclick/login.html';
            return false;
        }

        console.log('[AuthGuard] Account: User authenticated ✓');
        return true;
    } catch (error) {
        console.error('[AuthGuard] guardAccountPage error:', error);
        window.location.href = '/oneclick/login.html';
        return false;
    }
}

// ============================================
// GENERIC PROTECTED PAGE GUARD
// ============================================

async function initProtectedPage(options = {}) {
    const {
        requireAuth = true,
        requireAddress = false,
        redirectPath = '/oneclick/login.html'
    } = options;

    try {
        if (!requireAuth) {
            console.log('[AuthGuard] No auth required, continuing');
            return { authenticated: false };
        }

        const user = await getCurrentUser();
        if (!user) {
            console.log('[AuthGuard] Protected page: User not authenticated, saving redirect');
            setRedirectAfterLogin(window.location.pathname);
            window.location.href = redirectPath;
            return { authenticated: false };
        }

        if (requireAddress) {
            const supabase = await window.ensureSupabase();
            const { data, error } = await supabase
                .from('addresses')
                .select('id')
                .eq('user_id', user.id)
                .limit(1);

            if (error) {
                console.error('[AuthGuard] Address check error:', error);
            }

            if (!data || data.length === 0) {
                console.log('[AuthGuard] No address found, blocking page');
                return { authenticated: true, hasAddress: false };
            }

            return { authenticated: true, hasAddress: true };
        }

        console.log('[AuthGuard] Protected page guard passed ✓');
        return { authenticated: true };
    } catch (error) {
        console.error('[AuthGuard] initProtectedPage error:', error);
        window.location.href = redirectPath;
        return { authenticated: false };
    }
}

// ============================================
// POST-LOGIN HANDLER
// ============================================

async function handlePostLogin() {
    try {
        console.log('[AuthGuard] Post-login: Merging local cart...');

        // Merge cart if available
        if (window.mergeLocalCartIntoSupabase) {
            await window.mergeLocalCartIntoSupabase();
        }

        // Merge wishlist if available
        if (window.syncGuestWishlistToUser) {
            const user = await getCurrentUser();
            if (user) {
                await window.syncGuestWishlistToUser(user.id);
            }
        }

        // Check for redirect target
        const redirectPath = consumeRedirectAfterLogin();
        if (redirectPath && redirectPath !== window.location.pathname) {
            console.log('[AuthGuard] Redirecting to:', redirectPath);
            window.location.href = redirectPath;
        } else {
            console.log('[AuthGuard] Post-login complete, staying on current page');
        }
    } catch (error) {
        console.error('[AuthGuard] handlePostLogin error:', error);
    }
}

// ============================================
// LOGOUT HANDLER
// ============================================

async function handleLogout() {
    try {
        console.log('[AuthGuard] Logout: Clearing local storage...');
        
        // Clear local cart
        localStorage.removeItem('oneclick_cart');
        
        // Clear redirect target
        sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
        
        console.log('[AuthGuard] Logout complete, redirecting to home');
        window.location.href = '/oneclick/index.html';
    } catch (error) {
        console.error('[AuthGuard] handleLogout error:', error);
    }
}

// ============================================
// LISTEN FOR AUTH CHANGES
// ============================================

async function initAuthStateListener() {
    try {
        const supabase = await window.ensureSupabase();

        supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AuthGuard] Auth state changed:', event);

            if (event === 'SIGNED_IN') {
                handlePostLogin();
            } else if (event === 'SIGNED_OUT') {
                handleLogout();
            }
        });

        console.log('[AuthGuard] Auth state listener initialized');
    } catch (error) {
        console.error('[AuthGuard] initAuthStateListener error:', error);
    }
}

// ============================================
// AUTO-INITIALIZE ON LOAD
// ============================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initAuthStateListener();
    });
} else {
    initAuthStateListener();
}

// ============================================
// EXPORTS TO GLOBAL WINDOW
// ============================================

window.isUserAuthenticated = isUserAuthenticated;
window.getCurrentUser = getCurrentUser;
window.setRedirectAfterLogin = setRedirectAfterLogin;
window.consumeRedirectAfterLogin = consumeRedirectAfterLogin;
window.guardCartPage = guardCartPage;
window.guardCheckoutPage = guardCheckoutPage;
window.guardWishlistPage = guardWishlistPage;
window.guardAccountPage = guardAccountPage;
window.initProtectedPage = initProtectedPage;
window.handlePostLogin = handlePostLogin;
window.handleLogout = handleLogout;
window.initAuthStateListener = initAuthStateListener;

} // End of auth-guard double-load protection

