// ============================================
// admin-product-api.js
// ISSUE #4 FIX: SECURE ADMIN API WRAPPER
// Routes admin operations through PHP backend
// ============================================

let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

// ============================================
// CALL ADMIN API (PHP BACKEND)
// ============================================

async function callAdminAPI(action, product = {}) {
    try {
        // Get current user for auth token
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Not authenticated');
        }

        // Get auth session token
        supabase = await ensureSupabase();
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
            throw new Error('Session expired');
        }

        const token = data.session.access_token;

        // Call PHP API
        const response = await fetch('/oneclick/admin/api/save-product.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action, product })
        });

        const result = await response.json();

        if (!response.ok || result.error) {
            throw new Error(result.error || 'API call failed');
        }

        console.log(`[Admin API] ${action} successful:`, result.data);
        
        // Broadcast change to frontend
        broadcastProductChange(action, product);
        
        return result.data;

    } catch (error) {
        console.error('[Admin API] Error:', error);
        throw error;
    }
}

async function getCurrentUser() {
    try {
        supabase = await ensureSupabase();
        const { data: { user }, error } = await supabase.auth.getUser();
        return user || null;
    } catch (error) {
        console.error('getCurrentUser error:', error);
        return null;
    }
}

// ============================================
// PRODUCT OPERATIONS (SECURE)
// ============================================

async function createProduct(productData) {
    return await callAdminAPI('create', productData);
}

async function updateProduct(productId, productData) {
    return await callAdminAPI('update', {
        id: productId,
        ...productData
    });
}

async function deleteProduct(productId) {
    return await callAdminAPI('delete', { id: productId });
}

async function uploadProductImage(productId, file) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Not authenticated');
        }

        supabase = await ensureSupabase();
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
            throw new Error('Session expired');
        }

        const token = data.session.access_token;
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/oneclick/admin/api/save-product.php?action=upload-image&product_id=' + productId, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const result = await response.json();

        if (!response.ok || result.error) {
            throw new Error(result.error || 'Upload failed');
        }

        console.log('[Admin API] Image uploaded:', result.data);
        return result.data;

    } catch (error) {
        console.error('[Admin API] Upload error:', error);
        throw error;
    }
}

// ============================================
// BROADCAST CHANGES (REAL-TIME)
// ============================================

function broadcastProductChange(action, product) {
    const event = new CustomEvent('adminProductChange', {
        detail: { action, product, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(event);
    
    console.log('[Admin API] Broadcast:', action, product);
}

// Listen for changes from other admin tabs
if (window.addEventListener) {
    window.addEventListener('adminProductChange', (e) => {
        console.log('[Admin API] Received broadcast:', e.detail);
    });
}

// ============================================
// EXPORTS
// ============================================

window.callAdminAPI = callAdminAPI;
window.createProduct = createProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.uploadProductImage = uploadProductImage;
window.broadcastProductChange = broadcastProductChange;
