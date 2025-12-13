/**
 * Supabase Database Helper
 * Simplified database operations using Supabase
 */

class SupabaseDB {
  constructor() {
    this.supabase = null;
  }

  async init() {
    this.supabase = await window.ensureSupabase();
    return this.supabase;
  }

  // Get all products
  async getProducts(filters = {}) {
    try {
      await this.init();

      let query = this.supabase.from('products').select('*');

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Sorting
      if (filters.sortBy) {
        query = query.order(filters.sortBy, { ascending: filters.sortOrder !== 'desc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, products: data || [], count: data?.length || 0 };
    } catch (error) {
      console.error('❌ Get products error:', error);
      return { success: false, error: error.message, products: [] };
    }
  }

  // Get single product
  async getProduct(id) {
    try {
      await this.init();

      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, product: data };
    } catch (error) {
      console.error('❌ Get product error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create product (admin only)
  async createProduct(productData) {
    try {
      await this.init();

      const { data, error } = await this.supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, product: data };
    } catch (error) {
      console.error('❌ Create product error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update product
  async updateProduct(id, updates) {
    try {
      await this.init();

      const { data, error } = await this.supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, product: data };
    } catch (error) {
      console.error('❌ Update product error:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete product
  async deleteProduct(id) {
    try {
      await this.init();

      const { error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('❌ Delete product error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get orders
  async getOrders(userId = null) {
    try {
      await this.init();

      let query = this.supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, orders: data || [] };
    } catch (error) {
      console.error('❌ Get orders error:', error);
      return { success: false, error: error.message, orders: [] };
    }
  }

  // Create order
  async createOrder(orderData) {
    try {
      await this.init();

      const { data, error } = await this.supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, order: data };
    } catch (error) {
      console.error('❌ Create order error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      await this.init();

      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { success: true, user: data };
    } catch (error) {
      console.error('❌ Get user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      await this.init();

      const { data, error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, user: data };
    } catch (error) {
      console.error('❌ Update user profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Cart operations (using user_carts table)
  async getCart(userId) {
    try {
      await this.init();

      const { data, error } = await this.supabase
        .from('user_carts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error

      return { success: true, cart: data?.items || [] };
    } catch (error) {
      console.error('❌ Get cart error:', error);
      return { success: false, cart: [] };
    }
  }

  async updateCart(userId, items) {
    try {
      await this.init();

      const { data, error } = await this.supabase
        .from('user_carts')
        .upsert({ user_id: userId, items: items, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;

      return { success: true, cart: data };
    } catch (error) {
      console.error('❌ Update cart error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create global instance
window.supabaseDB = new SupabaseDB();

console.log('✅ Supabase DB Helper loaded');

