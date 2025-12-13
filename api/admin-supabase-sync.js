// ============================================
// admin-supabase-sync.js
// Admin Dashboard → Supabase Sync
// Fixes Issues #4 & #5 (Admin sync + instant frontend updates)
// ============================================

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

const ADMIN_SYNC_EVENT = 'admin-product-updated';
const UPDATE_CHECK_INTERVAL = 2000; // Check for updates every 2 seconds

/**
 * Add product to Supabase (from Admin Dashboard)
 * Issue #4: Admin edits → Supabase updates
 */
async function addProductToSupabase(productData) {
    try {
        supabase = await ensureSupabase();
        const { data, error } = await supabase
            .from('products')
            .insert({
                name: productData.name,
                description: productData.description,
                price: parseFloat(productData.price),
                category: productData.category,
                stock: parseInt(productData.stock) || 0,
                status: productData.status || 'active',
                image_url: productData.image_url || ''
            })
            .select();

        if (error) {
            console.error('Failed to add product:', error);
            return { success: false, error: error.message };
        }

        console.log('✓ Product added to Supabase:', data);

        // Broadcast update to all pages
        broadcastProductUpdate('create', data[0]);

        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error adding product:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update product in Supabase (from Admin Dashboard)
 * Issue #4: Admin edits → Supabase updates
 */
async function updateProductInSupabase(productId, productData) {
    try {
        supabase = await ensureSupabase();
        const { data, error } = await supabase
            .from('products')
            .update({
                name: productData.name,
                description: productData.description,
                price: parseFloat(productData.price),
                category: productData.category,
                stock: parseInt(productData.stock),
                status: productData.status || 'active',
                image_url: productData.image_url || ''
            })
            .eq('id', productId)
            .select();

        if (error) {
            console.error('Failed to update product:', error);
            return { success: false, error: error.message };
        }

        console.log('✓ Product updated in Supabase:', data);

        // Broadcast update to all pages
        broadcastProductUpdate('update', data[0]);

        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error updating product:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete product from Supabase (from Admin Dashboard)
 * Issue #4: Admin deletes → Supabase deletes
 */
async function deleteProductFromSupabase(productId) {
    try {
        supabase = await ensureSupabase();
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) {
            console.error('Failed to delete product:', error);
            return { success: false, error: error.message };
        }

        console.log('✓ Product deleted from Supabase');

        // Broadcast update to all pages
        broadcastProductUpdate('delete', { id: productId });

        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all products from Supabase
 * Issue #4: Admin dashboard fetches from Supabase (source of truth)
 */
async function getProductsFromSupabase() {
    try {
        supabase = await ensureSupabase();
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch products:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

/**
 * Broadcast product update to all open tabs/windows
 * Issue #5: All pages get instant notification
 */
function broadcastProductUpdate(action, product) {
    try {
        // Broadcast via localStorage (works across tabs)
        const update = {
            action,
            product,
            timestamp: Date.now()
        };

        localStorage.setItem('admin-product-update', JSON.stringify(update));

        // Also dispatch custom event (for current page)
        window.dispatchEvent(new CustomEvent(ADMIN_SYNC_EVENT, { detail: update }));

        console.log('✓ Broadcast:', action, product.id);
    } catch (error) {
        console.error('Error broadcasting update:', error);
    }
}

/**
 * Listen for product updates (for customer-facing pages)
 * Issue #5: Shop.html, cart.html auto-update when admin changes product
 */
function listenForProductUpdates(callback) {
    try {
        // Listen for custom event (same tab)
        window.addEventListener(ADMIN_SYNC_EVENT, (event) => {
            console.log('Product update received:', event.detail);
            if (callback) callback(event.detail);
        });

        // Listen for storage changes (from other tabs)
        window.addEventListener('storage', (event) => {
            if (event.key === 'admin-product-update') {
                try {
                    const update = JSON.parse(event.newValue);
                    console.log('Product update from other tab:', update);
                    if (callback) callback(update);
                } catch (error) {
                    console.error('Error parsing update:', error);
                }
            }
        });

        console.log('✓ Listening for product updates');
    } catch (error) {
        console.error('Error setting up listener:', error);
    }
}

/**
 * Periodic check for updates (fallback for real-time sync)
 * Issue #5: Auto-refresh prices/availability even if page is open
 */
function startPeriodicUpdateCheck(productIds = [], callback) {
    try {
        if (productIds.length === 0) {
            console.warn('No product IDs provided for update check');
            return;
        }

        setInterval(async () => {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .in('id', productIds);

                if (error) {
                    console.error('Update check failed:', error);
                    return;
                }

                if (data && callback) {
                    callback(data);
                }
            } catch (error) {
                console.error('Error in update check:', error);
            }
        }, UPDATE_CHECK_INTERVAL);

        console.log('✓ Started periodic update checks for', productIds.length, 'products');
    } catch (error) {
        console.error('Error starting update checks:', error);
    }
}

/**
 * Update product display on shop.html/cart.html
 * Issue #5: Update UI instantly when admin changes product
 */
function updateProductDisplay(product) {
    try {
        // Update price
        const priceElements = document.querySelectorAll(`[data-product-id="${product.id}"] .price`);
        priceElements.forEach(el => {
            el.textContent = `LKR ${product.price.toFixed(2)}`;
            el.classList.add('price-updated');
            setTimeout(() => el.classList.remove('price-updated'), 1000);
        });

        // Update availability
        const stockElements = document.querySelectorAll(`[data-product-id="${product.id}"] .stock-status`);
        stockElements.forEach(el => {
            const status = product.stock > 0 ? 'In Stock' : 'Out of Stock';
            el.textContent = status;
            el.className = 'stock-status ' + (product.stock > 0 ? 'in-stock' : 'out-of-stock');
        });

        // Update name/description
        const nameElements = document.querySelectorAll(`[data-product-id="${product.id}"] .product-name`);
        nameElements.forEach(el => {
            el.textContent = product.name;
        });

        // Update image if changed
        if (product.image_url) {
            const imageElements = document.querySelectorAll(`[data-product-id="${product.id}"] img.product-image`);
            imageElements.forEach(el => {
                el.src = product.image_url;
                el.classList.add('image-updated');
                setTimeout(() => el.classList.remove('image-updated'), 1000);
            });
        }

        console.log('✓ Product display updated:', product.id);
    } catch (error) {
        console.error('Error updating product display:', error);
    }
}

/**
 * Initialize admin sync listener on customer pages
 * Issue #5: Shop.html calls this to get instant updates
 */
function initFrontendUpdateListener() {
    try {
        listenForProductUpdates((update) => {
            const { action, product } = update;

            if (action === 'create') {
                // Add product to shop (if listener is set up)
                console.log('New product added:', product);
                window.dispatchEvent(new CustomEvent('product-added', { detail: product }));
            } else if (action === 'update') {
                // Update product display
                updateProductDisplay(product);
            } else if (action === 'delete') {
                // Remove product from display
                const elements = document.querySelectorAll(`[data-product-id="${product.id}"]`);
                elements.forEach(el => {
                    el.style.opacity = '0.5';
                    el.style.pointerEvents = 'none';
                    setTimeout(() => el.remove(), 1000);
                });
            }
        });

        console.log('✓ Frontend update listener initialized');
    } catch (error) {
        console.error('Error initializing listener:', error);
    }
}

// Export functions to global window
window.addProductToSupabase = addProductToSupabase;
window.updateProductInSupabase = updateProductInSupabase;
window.deleteProductFromSupabase = deleteProductFromSupabase;
window.getProductsFromSupabase = getProductsFromSupabase;
window.broadcastProductUpdate = broadcastProductUpdate;
window.listenForProductUpdates = listenForProductUpdates;
window.startPeriodicUpdateCheck = startPeriodicUpdateCheck;
window.updateProductDisplay = updateProductDisplay;
window.initFrontendUpdateListener = initFrontendUpdateListener;
