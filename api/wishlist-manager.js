// ============================================
// wishlist-manager.js
// Wishlist Management
// Fixes Issue #7 (Wishlist Broken)
// ============================================

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

const WISHLIST_UPDATE_EVENT = 'wishlist-updated';
const WISHLIST_STORAGE_KEY = 'guest-wishlist';

/**
 * Add item to wishlist
 * Issue #7: "Add to Wishlist" actually works
 */
async function addToWishlist(productId) {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // User is logged in - save to Supabase
            const { data, error } = await supabase
                .from('wishlists')
                .insert({
                    user_id: session.user.id,
                    product_id: productId
                })
                .select();

            if (error) {
                // Item already exists - that's OK
                if (error.code === '23505') {
                    console.log('Item already in wishlist');
                    return { success: true, message: 'Already in wishlist' };
                }
                console.error('Failed to add to wishlist:', error);
                return { success: false, error: error.message };
            }

            console.log('✓ Added to wishlist:', productId);
            broadcastWishlistUpdate('added', productId);
            updateWishlistUI(productId, true);
            return { success: true, data: data[0] };
        } else {
            // User is guest - save to localStorage
            const wishlist = getGuestWishlist();
            if (!wishlist.includes(productId)) {
                wishlist.push(productId);
                saveGuestWishlist(wishlist);
                broadcastWishlistUpdate('added', productId);
                updateWishlistUI(productId, true);
                console.log('✓ Added to guest wishlist:', productId);
            }
            return { success: true };
        }
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remove item from wishlist
 */
async function removeFromWishlist(productId) {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // Remove from Supabase
            const { error } = await supabase
                .from('wishlists')
                .delete()
                .match({ user_id: session.user.id, product_id: productId });

            if (error) {
                console.error('Failed to remove from wishlist:', error);
                return { success: false, error: error.message };
            }
        } else {
            // Remove from localStorage
            const wishlist = getGuestWishlist();
            const filtered = wishlist.filter(id => id !== productId);
            saveGuestWishlist(filtered);
        }

        console.log('✓ Removed from wishlist:', productId);
        broadcastWishlistUpdate('removed', productId);
        updateWishlistUI(productId, false);
        return { success: true };
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user's wishlist
 */
async function getWishlist() {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // Fetch from Supabase
            const { data, error } = await supabase
                .from('wishlists')
                .select('*, products(*)')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Failed to fetch wishlist:', error);
                return [];
            }

            return data || [];
        } else {
            // Get from localStorage
            return getGuestWishlist();
        }
    } catch (error) {
        console.error('Error getting wishlist:', error);
        return [];
    }
}

/**
 * Check if product is in wishlist
 */
async function isInWishlist(productId) {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            const { data, error } = await supabase
                .from('wishlists')
                .select('id')
                .match({ user_id: session.user.id, product_id: productId })
                .single();

            return !error && data !== null;
        } else {
            const wishlist = getGuestWishlist();
            return wishlist.includes(productId);
        }
    } catch (error) {
        return false;
    }
}

/**
 * Toggle wishlist (add if not present, remove if present)
 */
async function toggleWishlist(productId) {
    try {
        const inWishlist = await isInWishlist(productId);

        if (inWishlist) {
            return await removeFromWishlist(productId);
        } else {
            return await addToWishlist(productId);
        }
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get guest wishlist from localStorage
 */
function getGuestWishlist() {
    try {
        const wishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
        return wishlist ? JSON.parse(wishlist) : [];
    } catch (error) {
        console.error('Failed to get guest wishlist:', error);
        return [];
    }
}

/**
 * Save guest wishlist to localStorage
 */
function saveGuestWishlist(items) {
    try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
        console.log('✓ Guest wishlist saved:', items.length, 'items');
    } catch (error) {
        console.error('Failed to save guest wishlist:', error);
    }
}

/**
 * Clear guest wishlist
 */
function clearGuestWishlist() {
    try {
        localStorage.removeItem(WISHLIST_STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear guest wishlist:', error);
    }
}

/**
 * Sync guest wishlist to user account after login
 */
async function syncGuestWishlistToUser(userId) {
    try {
        supabase = await ensureSupabase();
        const guestWishlist = getGuestWishlist();

        if (guestWishlist.length === 0) {
            console.log('✓ No guest wishlist to sync');
            return;
        }

        console.log('Syncing guest wishlist to user:', guestWishlist.length, 'items');

        // Insert each item
        const itemsToInsert = guestWishlist.map(productId => ({
            user_id: userId,
            product_id: productId
        }));

        const { error } = await supabase
            .from('wishlists')
            .upsert(itemsToInsert, { onConflict: 'user_id,product_id' });

        if (error) {
            console.error('Failed to sync wishlist:', error);
            return;
        }

        console.log('✓ Guest wishlist synced');
        clearGuestWishlist();

        // Notify listeners
        window.dispatchEvent(new CustomEvent('wishlist-synced', { detail: { synced: true } }));
    } catch (error) {
        console.error('Error syncing guest wishlist:', error);
    }
}

/**
 * Broadcast wishlist update
 */
function broadcastWishlistUpdate(action, productId) {
    try {
        const update = { action, productId, timestamp: Date.now() };

        // Broadcast via localStorage (across tabs)
        localStorage.setItem('wishlist-update', JSON.stringify(update));

        // Dispatch event
        window.dispatchEvent(new CustomEvent(WISHLIST_UPDATE_EVENT, { detail: update }));

        console.log('✓ Wishlist broadcast:', action, productId);
    } catch (error) {
        console.error('Error broadcasting wishlist update:', error);
    }
}

/**
 * Update UI - change button state
 */
async function updateWishlistUI(productId, isInWishlist) {
    try {
        // Find wishlist buttons for this product
        const buttons = document.querySelectorAll(`[data-product-id="${productId}"] .wishlist-btn`);

        buttons.forEach(btn => {
            if (isInWishlist) {
                btn.classList.add('in-wishlist');
                btn.textContent = '❤ Remove from Wishlist';
                btn.setAttribute('aria-label', 'Remove from wishlist');
            } else {
                btn.classList.remove('in-wishlist');
                btn.textContent = '🤍 Add to Wishlist';
                btn.setAttribute('aria-label', 'Add to wishlist');
            }
        });
    } catch (error) {
        console.error('Error updating wishlist UI:', error);
    }
}

/**
 * Initialize wishlist for a product
 */
async function initWishlistButton(productId) {
    try {
        const inWishlist = await isInWishlist(productId);
        await updateWishlistUI(productId, inWishlist);
    } catch (error) {
        console.error('Error initializing wishlist button:', error);
    }
}

/**
 * Listen for wishlist updates across tabs
 */
function listenForWishlistUpdates(callback) {
    try {
        window.addEventListener(WISHLIST_UPDATE_EVENT, (event) => {
            if (callback) callback(event.detail);
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'wishlist-update') {
                try {
                    const update = JSON.parse(event.newValue);
                    if (callback) callback(update);
                } catch (error) {
                    console.error('Error parsing wishlist update:', error);
                }
            }
        });

        console.log('✓ Listening for wishlist updates');
    } catch (error) {
        console.error('Error setting up listener:', error);
    }
}

/**
 * Initialize auth listener for wishlist sync
 */
function initWishlistSync() {
    try {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                console.log('User signed in - syncing wishlist...');
                await syncGuestWishlistToUser(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out - wishlist reverted to guest mode');
            }
        });
    } catch (error) {
        console.error('Error initializing wishlist sync:', error);
    }
}

/**
 * Create wishlist button HTML
 */
function createWishlistButton(productId, inWishlist = false) {
    return `
        <button 
            class="wishlist-btn ${inWishlist ? 'in-wishlist' : ''}"
            data-product-id="${productId}"
            onclick="toggleWishlist('${productId}')"
            aria-label="${inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}"
        >
            ${inWishlist ? '❤ Remove from Wishlist' : '🤍 Add to Wishlist'}
        </button>
    `;
}

/**
 * Display wishlist count
 */
async function displayWishlistCount() {
    try {
        const wishlist = await getWishlist();
        const countElement = document.getElementById('wishlist-count');

        if (countElement) {
            countElement.textContent = wishlist.length;
        }
    } catch (error) {
        console.error('Error displaying wishlist count:', error);
    }
}

// Export functions
window.addToWishlist = addToWishlist;
window.removeFromWishlist = removeFromWishlist;
window.getWishlist = getWishlist;
window.isInWishlist = isInWishlist;
window.toggleWishlist = toggleWishlist;
window.syncGuestWishlistToUser = syncGuestWishlistToUser;
window.initWishlistButton = initWishlistButton;
window.listenForWishlistUpdates = listenForWishlistUpdates;
window.initWishlistSync = initWishlistSync;
window.createWishlistButton = createWishlistButton;
window.displayWishlistCount = displayWishlistCount;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initWishlistSync();
    displayWishlistCount();
});
