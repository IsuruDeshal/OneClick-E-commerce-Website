// ============================================
// cart-sync.js
// Cart persistence & sync across login
// Fixes Issues: #1 (Login Breaks Cart), #2 (Auto Redirect)
// ============================================

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

const CART_STORAGE_KEY = 'oneclick-guest-cart';
const CART_SYNC_EVENT = 'cart-synced';

/**
 * Save cart items to localStorage (for guest users)
 */
function saveGuestCart(items) {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        console.log('✓ Guest cart saved:', items.length, 'items');
    } catch (error) {
        console.error('Failed to save guest cart:', error);
    }
}

/**
 * Get guest cart from localStorage
 */
function getGuestCart() {
    try {
        const cart = localStorage.getItem(CART_STORAGE_KEY);
        return cart ? JSON.parse(cart) : [];
    } catch (error) {
        console.error('Failed to get guest cart:', error);
        return [];
    }
}

/**
 * Clear guest cart from localStorage
 */
function clearGuestCart() {
    try {
        localStorage.removeItem(CART_STORAGE_KEY);
        console.log('✓ Guest cart cleared');
    } catch (error) {
        console.error('Failed to clear guest cart:', error);
    }
}

/**
 * Add item to cart (works for both guest and logged-in users)
 * Issue #1: Save to localStorage for guests
 */
async function addToCart(productId, quantity = 1) {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // User is logged in - save to Supabase
            const { data, error } = await supabase
                .from('cart_items')
                .upsert(
                    {
                        user_id: session.user.id,
                        product_id: productId,
                        quantity: quantity
                    },
                    { onConflict: 'user_id,product_id' }
                )
                .select();

            if (error) {
                console.error('Failed to add to cart:', error);
                return { success: false, error: error.message };
            }

            console.log('✓ Item added to database cart');
            return { success: true, data };
        } else {
            // User is guest - save to localStorage
            const cart = getGuestCart();
            const existingItem = cart.find(item => item.product_id === productId);

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.push({ product_id: productId, quantity });
            }

            saveGuestCart(cart);
            return { success: true, data: cart };
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get full cart (handles both guest and logged-in)
 */
async function getCart() {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // Fetch from Supabase
            const { data, error } = await supabase
                .from('cart_items')
                .select('*, products(*)')
                .eq('user_id', session.user.id);

            if (error) {
                console.error('Failed to fetch cart:', error);
                return [];
            }

            return data || [];
        } else {
            // Get from localStorage
            return getGuestCart();
        }
    } catch (error) {
        console.error('Error getting cart:', error);
        return [];
    }
}

/**
 * CRITICAL: Sync guest cart to user account after login
 * Issue #1: Merge guest cart items with database when user logs in
 */
async function syncGuestCartToUser(userId) {
    try {
        supabase = await ensureSupabase();
        const guestCart = getGuestCart();

        if (guestCart.length === 0) {
            console.log('✓ No guest cart to sync');
            return;
        }

        console.log('Syncing guest cart to user account:', guestCart.length, 'items');

        // Get user's existing cart
        const { data: existingCart, error: fetchError } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', userId);

        if (fetchError) {
            console.error('Failed to fetch existing cart:', fetchError);
            return;
        }

        // Merge: for each guest item, add to user's cart
        const itemsToInsert = guestCart.map(item => ({
            user_id: userId,
            product_id: item.product_id,
            quantity: item.quantity
        }));

        // Upsert (insert or update if exists)
        const { error: upsertError } = await supabase
            .from('cart_items')
            .upsert(itemsToInsert, { onConflict: 'user_id,product_id' });

        if (upsertError) {
            console.error('Failed to sync cart:', upsertError);
            return;
        }

        console.log('✓ Guest cart synced successfully');

        // Clear guest cart
        clearGuestCart();

        // Notify listeners
        window.dispatchEvent(new CustomEvent(CART_SYNC_EVENT, { detail: { synced: true } }));

    } catch (error) {
        console.error('Error syncing guest cart:', error);
    }
}

/**
 * Listen for auth changes and sync cart on login
 * Issue #1: Auto-sync when user logs in
 */
function initCartSync() {
    try {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                console.log('User signed in - syncing cart...');
                await syncGuestCartToUser(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out - cart reverted to guest mode');
                // Cart automatically switches to localStorage mode
            }
        });
    } catch (error) {
        console.error('Error initializing cart sync:', error);
    }
}

/**
 * Save redirect target before login
 * Issue #2: Remember where user was going
 */
function saveRedirectTarget(url) {
    try {
        localStorage.setItem('redirect-after-login', url);
        console.log('✓ Redirect target saved:', url);
    } catch (error) {
        console.error('Failed to save redirect target:', error);
    }
}

/**
 * Get and clear redirect target
 * Issue #2: Go back to cart after login
 */
function getRedirectTarget() {
    try {
        const target = localStorage.getItem('redirect-after-login');
        if (target) {
            localStorage.removeItem('redirect-after-login');
            return target;
        }
        return null;
    } catch (error) {
        console.error('Failed to get redirect target:', error);
        return null;
    }
}

/**
 * Smart redirect to login with cart preservation
 * Issue #2: Go to login but come back to cart
 */
async function redirectToLoginWithCartSave(returnUrl = 'checkout.html') {
    try {
        // Save current cart to localStorage first
        const currentCart = await getCart();
        if (currentCart.length > 0) {
            saveGuestCart(currentCart);
            console.log('✓ Cart saved before redirect');
        }

        // Save redirect target
        saveRedirectTarget(returnUrl);

        // Redirect to login
        window.location.href = 'login.html?redirect=' + encodeURIComponent(returnUrl);
    } catch (error) {
        console.error('Error in redirect:', error);
        window.location.href = 'login.html';
    }
}

/**
 * Handle redirect after successful login
 * Issue #2: Return to cart with items
 */
async function handlePostLoginRedirect() {
    try {
        const redirectTarget = getRedirectTarget();
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');

        const target = redirectTarget || redirectParam || 'shop.html';

        console.log('Redirecting to:', target);
        window.location.href = target;
    } catch (error) {
        console.error('Error handling post-login redirect:', error);
    }
}

/**
 * Remove item from cart
 */
async function removeFromCart(productId) {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // Remove from Supabase
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .match({ user_id: session.user.id, product_id: productId });

            if (error) {
                console.error('Failed to remove from cart:', error);
                return false;
            }
        } else {
            // Remove from localStorage
            const cart = getGuestCart();
            const filtered = cart.filter(item => item.product_id !== productId);
            saveGuestCart(filtered);
        }

        return true;
    } catch (error) {
        console.error('Error removing from cart:', error);
        return false;
    }
}

/**
 * Clear entire cart
 */
async function clearCart() {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', session.user.id);
        } else {
            clearGuestCart();
        }

        console.log('✓ Cart cleared');
        return true;
    } catch (error) {
        console.error('Error clearing cart:', error);
        return false;
    }
}

// Export functions to global window
window.addToCart = addToCart;
window.getCart = getCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.syncGuestCartToUser = syncGuestCartToUser;
window.redirectToLoginWithCartSave = redirectToLoginWithCartSave;
window.handlePostLoginRedirect = handlePostLoginRedirect;
window.saveRedirectTarget = saveRedirectTarget;
window.getRedirectTarget = getRedirectTarget;
window.initCartSync = initCartSync;

// Initialize on load
document.addEventListener('DOMContentLoaded', initCartSync);
