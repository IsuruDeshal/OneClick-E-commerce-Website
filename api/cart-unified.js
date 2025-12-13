// ============================================
// cart-unified.js
// UNIFIED CART MANAGER (Guest + Logged-in)
// Fixes: Issue #1 (Cart Disappear), #2 (Smart Redirect)
// ============================================

const LOCAL_CART_KEY = 'oneclick_cart';
const REDIRECT_AFTER_LOGIN_KEY = 'oc_redirect_after_login';

// ============================================
// HELPER: Get Current User
// ============================================

async function getCurrentUser() {
    try {
        const supabase = await window.ensureSupabase();
        if (!supabase) return null;
        
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            console.error('getCurrentUser error:', error);
            return null;
        }
        return user || null;
    } catch (error) {
        console.error('getCurrentUser exception:', error);
        return null;
    }
}

// ============================================
// LOCAL CART HELPERS
// ============================================

function getLocalCart() {
    try {
        const raw = localStorage.getItem(LOCAL_CART_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('getLocalCart parse error:', error);
        return [];
    }
}

function saveLocalCart(items) {
    try {
        localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
        console.log('✓ Local cart saved:', items.length, 'items');
    } catch (error) {
        console.error('saveLocalCart error:', error);
    }
}

function clearLocalCart() {
    try {
        localStorage.removeItem(LOCAL_CART_KEY);
        console.log('✓ Local cart cleared');
    } catch (error) {
        console.error('clearLocalCart error:', error);
    }
}

// ============================================
// SUPABASE CART HELPERS
// ============================================

async function getSupabaseCart(userId) {
    try {
        const supabase = await window.ensureSupabase();
        const { data, error } = await supabase
            .from('cart_items')
            .select('product_id, quantity, products(name, price, main_image_url)')
            .eq('user_id', userId);

        if (error) {
            console.error('getSupabaseCart error:', error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('getSupabaseCart exception:', error);
        return [];
    }
}

async function upsertSupabaseCart(userId, items) {
    if (!items.length) return { success: true };

    try {
        const supabase = await window.ensureSupabase();
        const rows = items.map(item => ({
            user_id: userId,
            product_id: item.product_id,
            quantity: item.quantity
        }));

        const { error } = await supabase
            .from('cart_items')
            .upsert(rows, { onConflict: 'user_id,product_id' });

        if (error) {
            console.error('upsertSupabaseCart error:', error);
            return { success: false, error: error.message };
        }

        console.log('✓ Supabase cart upserted:', rows.length, 'items');
        return { success: true };
    } catch (error) {
        console.error('upsertSupabaseCart exception:', error);
        return { success: false, error: error.message };
    }
}

async function clearSupabaseCart(userId) {
    try {
        const supabase = await window.ensureSupabase();
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('clearSupabaseCart error:', error);
            return { success: false };
        }
        console.log('✓ Supabase cart cleared');
        return { success: true };
    } catch (error) {
        console.error('clearSupabaseCart exception:', error);
        return { success: false };
    }
}

// ============================================
// UNIFIED CART OPERATIONS
// ============================================

async function getCart() {
    const user = await getCurrentUser();
    
    if (user) {
        // Logged in: fetch from Supabase
        return await getSupabaseCart(user.id);
    } else {
        // Guest: fetch from localStorage
        return getLocalCart();
    }
}

async function addToCart(productId, quantity = 1) {
    try {
        const user = await getCurrentUser();

        if (user) {
            // Logged in: upsert to Supabase
            const supabase = await window.ensureSupabase();
            const { error } = await supabase
                .from('cart_items')
                .upsert(
                    {
                        user_id: user.id,
                        product_id: productId,
                        quantity: quantity
                    },
                    { onConflict: 'user_id,product_id' }
                );

            if (error) {
                console.error('addToCart Supabase error:', error);
                return { success: false, error: error.message };
            }
            console.log('✓ Added to Supabase cart:', productId);
            return { success: true };
        } else {
            // Guest: add to localStorage
            const cart = getLocalCart();
            const existing = cart.find(item => item.product_id === productId);

            if (existing) {
                existing.quantity += quantity;
            } else {
                cart.push({ product_id: productId, quantity });
            }

            saveLocalCart(cart);
            return { success: true };
        }
    } catch (error) {
        console.error('addToCart error:', error);
        return { success: false, error: error.message };
    }
}

async function removeFromCart(productId) {
    try {
        const user = await getCurrentUser();

        if (user) {
            // Logged in: delete from Supabase
            const supabase = await window.ensureSupabase();
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .match({ user_id: user.id, product_id: productId });

            if (error) {
                console.error('removeFromCart error:', error);
                return { success: false };
            }
            console.log('✓ Removed from Supabase cart');
            return { success: true };
        } else {
            // Guest: remove from localStorage
            const cart = getLocalCart();
            const filtered = cart.filter(item => item.product_id !== productId);
            saveLocalCart(filtered);
            return { success: true };
        }
    } catch (error) {
        console.error('removeFromCart exception:', error);
        return { success: false };
    }
}

async function updateCartQuantity(productId, quantity) {
    try {
        if (quantity <= 0) {
            return await removeFromCart(productId);
        }

        const user = await getCurrentUser();

        if (user) {
            const supabase = await window.ensureSupabase();
            const { error } = await supabase
                .from('cart_items')
                .update({ quantity })
                .match({ user_id: user.id, product_id: productId });

            if (error) {
                console.error('updateCartQuantity error:', error);
                return { success: false };
            }
            return { success: true };
        } else {
            const cart = getLocalCart();
            const item = cart.find(i => i.product_id === productId);
            if (item) {
                item.quantity = quantity;
            }
            saveLocalCart(cart);
            return { success: true };
        }
    } catch (error) {
        console.error('updateCartQuantity exception:', error);
        return { success: false };
    }
}

// ============================================
// MERGE LOCAL CART INTO SUPABASE ON LOGIN
// ============================================

async function mergeLocalCartIntoSupabase() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.log('No user logged in, skipping merge');
            return { success: true };
        }

        const localItems = getLocalCart();
        if (!localItems.length) {
            console.log('✓ No local cart to merge');
            return { success: true };
        }

        console.log('Merging local cart to Supabase:', localItems.length, 'items');

        // Get existing Supabase cart
        const existingCart = await getSupabaseCart(user.id);
        const map = new Map();

        // Existing DB items
        existingCart.forEach(item => {
            map.set(item.product_id, item.quantity);
        });

        // Local items (add quantities)
        localItems.forEach(item => {
            const q = map.get(item.product_id) || 0;
            map.set(item.product_id, q + item.quantity);
        });

        const merged = Array.from(map.entries()).map(([product_id, quantity]) => ({
            product_id,
            quantity
        }));

        const result = await upsertSupabaseCart(user.id, merged);
        if (result.success) {
            clearLocalCart();
            console.log('✓ Cart merged successfully');
        }

        return result;
    } catch (error) {
        console.error('mergeLocalCartIntoSupabase error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// REDIRECT MANAGEMENT
// ============================================

function setRedirectAfterLogin(path) {
    sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, path);
    console.log('Redirect after login set to:', path);
}

function consumeRedirectAfterLogin() {
    const path = sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
    if (path) {
        sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
    }
    return path;
}

// ============================================
// PROTECTED PAGE INITIALIZATION
// ============================================

async function initProtectedPage() {
    try {
        const user = await getCurrentUser();
        const currentPath = window.location.pathname;

        if (!user) {
            console.log('Not authenticated, redirecting to login');
            setRedirectAfterLogin(currentPath);
            window.location.href = '/oneclick/login.html';
            return;
        }

        console.log('✓ User authenticated, loading protected page');
        return { authenticated: true };
    } catch (error) {
        console.error('initProtectedPage error:', error);
        window.location.href = '/oneclick/login.html';
    }
}

// ============================================
// EXPORTS TO GLOBAL WINDOW
// ============================================

window.getCurrentUser = getCurrentUser;
window.getLocalCart = getLocalCart;
window.saveLocalCart = saveLocalCart;
window.clearLocalCart = clearLocalCart;
window.getCart = getCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.mergeLocalCartIntoSupabase = mergeLocalCartIntoSupabase;
window.setRedirectAfterLogin = setRedirectAfterLogin;
window.consumeRedirectAfterLogin = consumeRedirectAfterLogin;
window.initProtectedPage = initProtectedPage;
