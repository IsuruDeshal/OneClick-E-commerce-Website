(function() {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const preferSupabase = true;

  const API_BASE_URL = (() => {
    if (isLocalhost) return '../api';
    if (window.API_CONFIG && window.API_CONFIG.apiUrl) return window.API_CONFIG.apiUrl;
    if (window.location && window.location.origin) {
      return `${window.location.origin.replace(/\/$/, '')}/api`;
    }
    return '../api';
  })();

  const ADMIN_API_BASE_URL = (() => {
    try {
      const origin = (window.location && window.location.origin) ? window.location.origin : '';
      const path = (window.location && window.location.pathname) ? window.location.pathname : '';
      const adminIndex = path.indexOf('/admin');
      const adminBase = adminIndex >= 0 ? path.slice(0, adminIndex + '/admin'.length) : '/admin';
      return `${origin}${adminBase}`.replace(/\/$/, '') + '/api';
    } catch (err) {
      console.warn('[AdminAPI] Failed to resolve admin API base, defaulting to relative path', err);
      return 'api';
    }
  })();

  let supabasePromise = null;

  function resolveApiUrl(endpoint) {
    const base = API_BASE_URL.replace(/\/$/, '');
    const path = (endpoint || '').toString().replace(/^\//, '');
    return `${base}/${path}`;
  }

  function resolveAdminApiUrl(endpoint) {
    const base = ADMIN_API_BASE_URL.replace(/\/$/, '');
    const path = (endpoint || '').toString().replace(/^\//, '');
    return `${base}/${path}`;
  }

  async function ensureSupabaseClient() {
    if (supabasePromise) return supabasePromise;
    if (typeof window.ensureSupabase !== 'function') {
      throw new Error('Supabase client not initialised. Include supabase-config.js and supabase-init.js before admin/js/api.js');
    }
    supabasePromise = window.ensureSupabase();
    return supabasePromise;
  }

  async function runSupabase(handler) {
    if (!preferSupabase) {
      return { ok: false, error: new Error('Supabase disabled') };
    }
    try {
      const client = await ensureSupabaseClient();
      const data = await handler(client);
      return { ok: true, data };
    } catch (error) {
      console.warn('[AdminAPI] Supabase handler failed, will try fallback if available:', error.message || error);
      return { ok: false, error };
    }
  }

  async function fetchJson(endpoint, options = {}) {
    const url = resolveApiUrl(endpoint);
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (_) {
        body = text;
      }
    }

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    return body;
  }

  // =========================
  // Products
  // =========================

  async function listProductsPhp() {
    const data = await fetchJson('get-products.php');
    if (data && data.success && Array.isArray(data.products)) {
      return data.products;
    }
    if (Array.isArray(data)) return data;
    throw new Error((data && data.message) || 'Failed to load products');
  }

  async function listProducts() {
    const supa = await runSupabase(async (client) => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    });
    if (supa.ok) return supa.data;
    return listProductsPhp();
  }

  async function getProductPhp(id) {
    const products = await listProductsPhp();
    return products.find((p) => String(p.id) === String(id)) || null;
  }

  async function getProduct(id) {
    const supa = await runSupabase(async (client) => {
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    });
    if (supa.ok) return supa.data;
    return getProductPhp(id);
  }

  function normalizeProductPayload(data) {
    const visibility = data.visibility_homepage;
    return {
      name: data.name ?? data.title ?? '',
      title: data.title ?? data.name ?? '',
      description: data.description ?? '',
      category: data.category ?? null,
      stock: Number.isFinite(Number(data.stock)) ? Number(data.stock) : 0,
      price: Number.isFinite(Number(data.price)) ? Number(data.price) : 0,
      offer_price: data.offer_price !== undefined && data.offer_price !== null && data.offer_price !== ''
        ? Number(data.offer_price)
        : (data.offerPrice !== undefined && data.offerPrice !== null && data.offerPrice !== '' ? Number(data.offerPrice) : null),
      sku: data.sku || data.id || `SKU-${Date.now()}`,
      image_url: (data.image_url || (Array.isArray(data.imageUrls) && data.imageUrls[0]) || data.images || '').toString(),
      condition: data.condition || 'Brand New',
      type: data.type || null,
      visibility_homepage: visibility === true || visibility === 'true' || visibility === 1 || visibility === '1',
      status: data.status || 'active',
      tags: data.tags || null,
      updated_at: new Date().toISOString()
    };
  }

  async function saveProductPhp(id, payload) {
    const action = id ? 'update' : 'create';
    const response = await fetch(resolveAdminApiUrl('save-product.php'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, product: { ...payload, id: id || null } })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data || data.error) {
      const message = (data && (data.error || data.message)) || `Failed to ${action} product`;
      throw new Error(message);
    }

    if (data.success) {
      return data.product_id || data.id || id;
    }

    throw new Error((data && data.message) || `Failed to ${action} product`);
  }

  async function saveProduct(id, data) {
    const payload = normalizeProductPayload(data);
    const supa = await runSupabase(async (client) => {
      if (id) {
        const { data: updated, error } = await client
          .from('products')
          .update(payload)
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return updated?.id || id;
      }
      const insertPayload = { ...payload, created_at: new Date().toISOString(), status: payload.status || 'active' };
      const { data: created, error } = await client
        .from('products')
        .insert(insertPayload)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      return created?.id;
    });
    if (supa.ok) return supa.data;
    return saveProductPhp(id, payload);
  }

  async function deleteProductPhp(id) {
    if (!id) throw new Error('Missing product ID');
    const response = await fetch(resolveAdminApiUrl('save-product.php'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', product: { id } })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data || data.success !== true) {
      const message = (data && (data.error || data.message)) || 'Failed to delete product';
      throw new Error(message);
    }
  }

  async function deleteProduct(id) {
    const supa = await runSupabase(async (client) => {
      const { error } = await client.from('products').delete().eq('id', id);
      if (error) throw error;
      return true;
    });
    if (supa.ok) return;
    return deleteProductPhp(id);
  }

  // =========================
  // Orders
  // =========================

  async function listOrdersPhp() {
    const data = await fetchJson('get-orders.php');
    if (data && data.success && Array.isArray(data.orders)) {
      return data.orders;
    }
    if (Array.isArray(data)) return data;
    throw new Error((data && data.message) || 'Failed to load orders');
  }

  async function listOrders() {
    const supa = await runSupabase(async (client) => {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    });
    if (supa.ok) return supa.data;
    return listOrdersPhp();
  }

  async function getOrderPhp(id) {
    const orders = await listOrdersPhp();
    return orders.find((o) => String(o.id) === String(id) || String(o.order_number) === String(id)) || null;
  }

  async function getOrder(id) {
    const supa = await runSupabase(async (client) => {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .or(`id.eq.${id},order_number.eq.${id}`)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    });
    if (supa.ok) return supa.data;
    return getOrderPhp(id);
  }

  async function updateOrderStatusPhp(id, status) {
    const response = await fetchJson('update-order-status.php', {
      method: 'POST',
      body: JSON.stringify({ id, status })
    });
    if (!response || response.success !== true) {
      throw new Error((response && response.message) || 'Failed to update order');
    }
  }

  async function updateOrderStatus(id, status) {
    const supa = await runSupabase(async (client) => {
      const payload = { status, updated_at: new Date().toISOString() };
      const { error } = await client
        .from('orders')
        .update(payload)
        .or(`id.eq.${id},order_number.eq.${id}`);
      if (error) throw error;
      return true;
    });
    if (supa.ok) return;
    return updateOrderStatusPhp(id, status);
  }

  // =========================
  // Users / Shop Owners
  // =========================

  async function listUsersPhp() {
    // No legacy endpoint available yet
    return [];
  }

  async function listUsers() {
    const supa = await runSupabase(async (client) => {
      const { data, error } = await client
        .from('users')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    });
    if (supa.ok) return supa.data;
    return listUsersPhp();
  }

  async function setUserRolePhp() {
    throw new Error('Legacy user role update not implemented');
  }

  async function setUserRole(uid, role) {
    const supa = await runSupabase(async (client) => {
      const { error } = await client
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', uid);
      if (error) throw error;
      return true;
    });
    if (supa.ok) return;
    return setUserRolePhp(uid, role);
  }

  // =========================
  // Categories
  // =========================

  async function listCategoriesPhp() {
    const data = await fetchJson('get-categories.php');
    if (data && data.success && Array.isArray(data.categories)) {
      return data.categories;
    }
    if (Array.isArray(data)) return data;
    throw new Error((data && data.message) || 'Failed to load categories');
  }

  async function listCategories() {
    const supa = await runSupabase(async (client) => {
      const { data, error } = await client.from('categories').select('*');
      if (error) throw error;
      return data || [];
    });
    if (supa.ok) return supa.data;
    return listCategoriesPhp();
  }

  window.AdminAPI = {
    listProducts,
    getProduct,
    saveProduct,
    deleteProduct,
    listOrders,
    getOrder,
    listUsers,
    setUserRole,
    updateOrderStatus,
    listCategories
  };
})();
