// C:\xampp\htdocs\oneclick\api\admin.js
// Admin dashboard - Fixes Issues #4 (loading), #6 (null checks), #10 (RLS)

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

/**
 * Show loading state
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
 * Show error message with null check (Issue #6)
 */
function showError(msg) {
    const errorContainer = document.getElementById('error-message');
    if (errorContainer) {
        errorContainer.innerHTML = `<div class="error-alert">${msg}</div>`;
        setTimeout(() => {
            if (errorContainer) errorContainer.innerHTML = '';
        }, 5000);
    } else {
        console.error('ERROR:', msg);
    }
}

/**
 * Load recent orders (Issue #4)
 */
async function loadRecentOrders() {
    try {
        supabase = await ensureSupabase();
        showLoading();
        
        // Verify ordersContainer exists (Issue #6 - Null check)
        const ordersContainer = document.getElementById('recent-orders-list');
        if (!ordersContainer) {
            console.warn('Orders container not found');
            hideLoading();
            return;
        }
        
        // Load orders from Supabase
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                status,
                total_amount,
                created_at,
                user_id
            `)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('Order load error:', error);
            showError(`Failed to load orders: ${error.message}`);
            hideLoading();
            return;
        }
        
        if (!data || data.length === 0) {
            ordersContainer.innerHTML = '<p>No recent orders</p>';
            hideLoading();
            return;
        }
        
        // Render orders
        let html = '';
        data.forEach(order => {
            html += `
                <tr>
                    <td>${order.order_number}</td>
                    <td>
                        <span class="badge badge-${order.status}">
                            ${order.status}
                        </span>
                    </td>
                    <td>LKR ${parseFloat(order.total_amount).toFixed(2)}</td>
                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                        <a href="order-details.html?id=${order.id}" class="btn btn-sm">
                            View
                        </a>
                    </td>
                </tr>
            `;
        });
        
        ordersContainer.innerHTML = html;
        console.log('✓ Orders loaded:', data.length);
        
    } catch (error) {
        console.error('Unexpected error loading orders:', error);
        showError('Unexpected error: ' + error.message);
    } finally {
        hideLoading();
        
        // Safety timeout (Issue #4)
        setTimeout(() => {
            const loader = document.getElementById('loading-spinner');
            if (loader && loader.style.display === 'block') {
                console.warn('Loading timeout - forcing hide');
                hideLoading();
            }
        }, 5000);
    }
}

/**
 * Load products with null check (Issue #6)
 */
async function loadProducts() {
    try {
        supabase = await ensureSupabase();
        showLoading();
        
        const productsContainer = document.getElementById('products-list');
        if (!productsContainer) {
            console.warn('Products container not found');
            hideLoading();
            return;
        }
        
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Product load error:', error);
            showError(`Failed to load products: ${error.message}`);
            return;
        }
        
        if (!data || data.length === 0) {
            productsContainer.innerHTML = '<p>No products found</p>';
            hideLoading();
            return;
        }
        
        // Render products
        let html = '';
        data.forEach(product => {
            html += `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>LKR ${parseFloat(product.price).toFixed(2)}</td>
                    <td>
                        <span class="badge badge-${product.status}">
                            ${product.status}
                        </span>
                    </td>
                    <td>
                        <a href="edit-product.html?id=${product.id}" class="btn btn-sm">Edit</a>
                        <button onclick="deleteProduct('${product.id}')" class="btn btn-sm btn-danger">Delete</button>
                    </td>
                </tr>
            `;
        });
        
        productsContainer.innerHTML = html;
        console.log('✓ Products loaded:', data.length);
        
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Delete product with confirmation
 */
async function deleteProduct(productId) {
    // Check if SweetAlert2 is available (Issue #15)
    if (typeof Swal !== 'undefined') {
        // Use SweetAlert2
        Swal.fire({
            title: 'Delete Product?',
            text: 'This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Delete'
        }).then(async (result) => {
            if (result.isConfirmed) {
                await performDelete(productId);
            }
        });
    } else {
        // Fallback to confirm
        if (confirm('Are you sure you want to delete this product?')) {
            await performDelete(productId);
        }
    }
}

/**
 * Perform product deletion
 */
async function performDelete(productId) {
    try {
        supabase = await ensureSupabase();
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);
        
        if (error) {
            showError('Delete failed: ' + error.message);
            return;
        }
        
        console.log('✓ Product deleted');
        loadProducts(); // Reload list
        
    } catch (error) {
        console.error('Delete error:', error);
        showError('Error: ' + error.message);
    }
}

/**
 * Initialize dashboard
 */
async function initDashboard() {
    try {
        supabase = await ensureSupabase();
        // Check authentication with null check (Issue #6)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            window.location.href = '/oneclick/admin/login.html';
            return;
        }
        
        // Load all dashboard data
        await loadRecentOrders();
        await loadProducts();
        
    } catch (error) {
        console.error('Dashboard init error:', error);
        showError('Failed to initialize dashboard: ' + error.message);
    }
}

// Export functions
window.loadRecentOrders = loadRecentOrders;
window.loadProducts = loadProducts;
window.deleteProduct = deleteProduct;
window.showError = showError;

// Initialize on load
document.addEventListener('DOMContentLoaded', initDashboard);
