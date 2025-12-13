// C:\xampp\htdocs\oneclick\api\shop.js
// Shop product loading - Fixes Issue #5 (product loading), #11 (search)

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

/**
 * Load products from Supabase
 * Issue #5: Shop was showing "Unable to load products"
 */
async function loadProducts(category = null, searchQuery = null) {
    try {
        supabase = await ensureSupabase();
        const productsContainer = document.getElementById('products-list');
        if (!productsContainer) {
            console.warn('Products container not found');
            return;
        }
        
        showLoading();
        
        // Build query
        let query = supabase
            .from('products')
            .select('*')
            .eq('status', 'active');
        
        // Filter by category
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }
        
        // Issue #11: Fix - Add partial search matching with ilike
        if (searchQuery && searchQuery.trim().length > 0) {
            query = query.ilike('name', `%${searchQuery}%`);
        }
        
        // Execute query
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
            console.error('Product load error:', error);
            showError('Unable to load products: ' + error.message);
            return;
        }
        
        if (!data || data.length === 0) {
            productsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <h3>No products found</h3>
                    <p>Try a different category or search term</p>
                </div>
            `;
            hideLoading();
            return;
        }
        
        // Render products
        let html = '';
        data.forEach(product => {
            const price = parseFloat(product.price);
            const offerPrice = product.offer_price ? parseFloat(product.offer_price) : null;
            
            html += `
                <div class="product-card">
                    ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" class="product-image">` : '<div class="product-image-placeholder">No image</div>'}
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p class="product-category">${product.category}</p>
                        ${product.description ? `<p class="product-description">${product.description.substring(0, 100)}</p>` : ''}
                        <div class="product-footer">
                            <div class="price">
                                ${offerPrice ? `
                                    <span class="original-price">LKR ${price.toFixed(2)}</span>
                                    <span class="sale-price">LKR ${offerPrice.toFixed(2)}</span>
                                ` : `
                                    <span class="price-value">LKR ${price.toFixed(2)}</span>
                                `}
                            </div>
                            <button onclick="addToCart('${product.id}', '${product.name}', ${offerPrice || price})" class="btn btn-primary">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        productsContainer.innerHTML = html;
        console.log('✓ Products loaded:', data.length);
        
    } catch (error) {
        console.error('Unexpected error loading products:', error);
        showError('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Add product to cart
 */
function addToCart(productId, productName, price) {
    try {
        let cart = JSON.parse(localStorage.getItem('checkout-cart') || '[]');
        
        // Check if product already in cart
        const existing = cart.find(item => item.id === productId);
        
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({
                id: productId,
                name: productName,
                price: price,
                quantity: 1
            });
        }
        
        localStorage.setItem('checkout-cart', JSON.stringify(cart));
        alert(`Added "${productName}" to cart`);
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Failed to add to cart');
    }
}

/**
 * Show loading state (Issue #8 - Light spinner instead of matrix)
 */
function showLoading() {
    const loader = document.getElementById('loading-spinner');
    if (loader) loader.style.display = 'block';
}

/**
 * Hide loading state
 */
function hideLoading() {
    const loader = document.getElementById('loading-spinner');
    if (loader) loader.style.display = 'none';
}

/**
 * Show error
 */
function showError(msg) {
    const errorContainer = document.getElementById('error-message');
    if (errorContainer) {
        errorContainer.innerHTML = `<div class="error-alert">${msg}</div>`;
    } else {
        console.error('ERROR:', msg);
    }
}

/**
 * Handle category filter (Issue #13)
 */
function filterByCategory(category) {
    loadProducts(category);
}

/**
 * Handle search (Issue #11 - Partial matching)
 */
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Only search if 2+ characters
            if (query.length < 2 && query.length > 0) {
                return;
            }
            
            loadProducts(null, query);
        });
    }
    
    // Load all products on initial load
    loadProducts();
});

// Export functions
window.loadProducts = loadProducts;
window.addToCart = addToCart;
window.filterByCategory = filterByCategory;
