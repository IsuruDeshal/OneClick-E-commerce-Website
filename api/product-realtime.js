// ============================================
// product-realtime.js
// ISSUE #5 FIX: REAL-TIME PRODUCT UPDATES
// Subscribe to product changes and update frontend
// ============================================

let supabase = null;
const productSubscriptions = new Map();
const productCache = new Map();

// Get Supabase client directly (no wrapper to avoid recursion)
async function getSupabaseClient() {
    if (!supabase && window.supabaseClient) {
        supabase = window.supabaseClient;
    }
    return supabase;
}

// ============================================
// LOAD PRODUCTS INITIALLY
// ============================================

async function loadProductsInitial(options = {}) {
    try {
        supabase = await getSupabaseClient();

        const {
            category = null,
            limit = 100,
            offset = 0
        } = options;

        let query = supabase
            .from('products')
            .select('id, name, price, description, category, stock_quantity, main_image_url, status, created_at, updated_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query.range(offset, offset + limit - 1);

        if (error) {
            console.error('[ProductRealtime] Load error:', error);
            return [];
        }

        // Cache products
        data.forEach(product => {
            productCache.set(product.id, product);
        });

        console.log('[ProductRealtime] Loaded', data.length, 'products');
        return data;

    } catch (error) {
        console.error('[ProductRealtime] Exception:', error);
        return [];
    }
}

// ============================================
// SUBSCRIBE TO PRODUCT CHANGES (REAL-TIME)
// ============================================

async function subscribeProductsRealtime(callback) {
    try {
        supabase = await getSupabaseClient();

        console.log('[ProductRealtime] Subscribing to product changes...');

        // Subscribe to INSERT events
        const insertSub = supabase
            .channel('products_insert')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'products'
                },
                (payload) => {
                    console.log('[ProductRealtime] New product:', payload.new);
                    productCache.set(payload.new.id, payload.new);
                    if (callback) callback('INSERT', payload.new);
                }
            )
            .subscribe();

        // Subscribe to UPDATE events
        const updateSub = supabase
            .channel('products_update')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'products'
                },
                (payload) => {
                    console.log('[ProductRealtime] Product updated:', payload.new);
                    const oldProduct = productCache.get(payload.new.id);
                    productCache.set(payload.new.id, payload.new);
                    
                    // Detect what changed
                    const changes = detectChanges(oldProduct, payload.new);
                    if (callback) callback('UPDATE', payload.new, changes);
                }
            )
            .subscribe();

        // Subscribe to DELETE events
        const deleteSub = supabase
            .channel('products_delete')
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'products'
                },
                (payload) => {
                    console.log('[ProductRealtime] Product deleted:', payload.old);
                    productCache.delete(payload.old.id);
                    if (callback) callback('DELETE', payload.old);
                }
            )
            .subscribe();

        // Store subscription refs
        productSubscriptions.set('insert', insertSub);
        productSubscriptions.set('update', updateSub);
        productSubscriptions.set('delete', deleteSub);

        console.log('[ProductRealtime] ✓ Subscribed to real-time changes');

    } catch (error) {
        console.error('[ProductRealtime] Subscribe error:', error);
    }
}

// ============================================
// UNSUBSCRIBE FROM CHANGES
// ============================================

async function unsubscribeProductsRealtime() {
    try {
        supabase = await getSupabaseClient();

        for (const [key, subscription] of productSubscriptions) {
            await supabase.removeChannel(subscription);
        }

        productSubscriptions.clear();
        console.log('[ProductRealtime] ✓ Unsubscribed from real-time changes');

    } catch (error) {
        console.error('[ProductRealtime] Unsubscribe error:', error);
    }
}

// ============================================
// DETECT CHANGES
// ============================================

function detectChanges(oldProduct, newProduct) {
    if (!oldProduct) return null;

    const changes = {};
    const fields = ['name', 'price', 'description', 'category', 'stock_quantity', 'main_image_url', 'status'];

    fields.forEach(field => {
        if (oldProduct[field] !== newProduct[field]) {
            changes[field] = {
                old: oldProduct[field],
                new: newProduct[field]
            };
        }
    });

    return Object.keys(changes).length > 0 ? changes : null;
}

// ============================================
// APPLY PRODUCT CHANGES (UI UPDATE)
// ============================================

function applyProductChange(action, product, changes) {
    console.log('[ProductRealtime] Applying change:', action, product.id);

    const productElement = document.querySelector(`[data-product-id="${product.id}"]`);
    if (!productElement) {
        console.log('[ProductRealtime] Product element not found:', product.id);
        return;
    }

    switch (action) {
        case 'INSERT':
            // Add new product to grid
            insertProductIntoGrid(product);
            break;

        case 'UPDATE':
            // Update product in grid
            updateProductInGrid(product, changes);
            break;

        case 'DELETE':
            // Remove product from grid
            removeProductFromGrid(product.id);
            break;
    }
}

function insertProductIntoGrid(product) {
    const grid = document.querySelector('[data-product-grid]');
    if (!grid) return;

    const productHTML = createProductHTML(product);
    grid.insertAdjacentHTML('afterbegin', productHTML);
    console.log('[ProductRealtime] ✓ Product inserted');
}

function updateProductInGrid(product, changes) {
    const element = document.querySelector(`[data-product-id="${product.id}"]`);
    if (!element) return;

    if (changes && changes.price) {
        const priceEl = element.querySelector('[data-product-price]');
        if (priceEl) {
            priceEl.textContent = `LKR ${product.price.toLocaleString()}`;
            priceEl.classList.add('highlight-change');
            setTimeout(() => priceEl.classList.remove('highlight-change'), 2000);
        }
    }

    if (changes && changes.stock_quantity) {
        const stockEl = element.querySelector('[data-product-stock]');
        if (stockEl) {
            stockEl.textContent = product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock';
            stockEl.classList.add('highlight-change');
            setTimeout(() => stockEl.classList.remove('highlight-change'), 2000);
        }
    }

    if (changes && changes.name) {
        const nameEl = element.querySelector('[data-product-name]');
        if (nameEl) {
            nameEl.textContent = product.name;
        }
    }

    console.log('[ProductRealtime] ✓ Product updated');
}

function removeProductFromGrid(productId) {
    const element = document.querySelector(`[data-product-id="${productId}"]`);
    if (element) {
        element.classList.add('fade-out');
        setTimeout(() => element.remove(), 300);
        console.log('[ProductRealtime] ✓ Product removed');
    }
}

function createProductHTML(product) {
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                ${product.main_image_url ? `<img src="${product.main_image_url}" alt="${product.name}">` : '<div style="background: #333; height: 200px;"></div>'}
            </div>
            <div class="product-info">
                <h3 data-product-name>${product.name}</h3>
                <p class="product-category">${product.category || 'Uncategorized'}</p>
                <div class="product-footer">
                    <div class="price" data-product-price>LKR ${Math.floor(product.price || 0).toLocaleString()}</div>
                    <button onclick="addProductToCart('${product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price})" class="btn btn-primary btn-sm">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// BROADCAST CHANGES TO OTHER LISTENERS
// ============================================

function broadcastChange(action, product) {
    const event = new CustomEvent('productRealtimeChange', {
        detail: { action, product, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
}

// Listen for broadcasts
if (window.addEventListener) {
    window.addEventListener('productRealtimeChange', (e) => {
        const { action, product } = e.detail;
        console.log('[ProductRealtime] Broadcast received:', action);
        // Don't apply change here to avoid recursion - only listen
    });
}

// ============================================
// GET CACHED PRODUCT
// ============================================

function getCachedProduct(productId) {
    return productCache.get(productId) || null;
}

function getAllCachedProducts() {
    return Array.from(productCache.values());
}

// ============================================
// EXPORTS
// ============================================

window.loadProductsInitial = loadProductsInitial;
window.subscribeProductsRealtime = subscribeProductsRealtime;
window.unsubscribeProductsRealtime = unsubscribeProductsRealtime;
window.applyProductChange = applyProductChange;
window.getCachedProduct = getCachedProduct;
window.getAllCachedProducts = getAllCachedProducts;
window.broadcastChange = broadcastChange;
