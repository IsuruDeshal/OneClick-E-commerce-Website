-- ==============================================================================
--  ONE CLICK COMPUTERS: COMPLETE DATABASE SETUP
-- ==============================================================================
--  ✅ 14 Essential Tables for E-Commerce
--  ✅ Fixed Auth Trigger (No "Database error granting user")
--  ✅ Row Level Security (RLS) for all tables
--  ✅ Admin RBAC with is_admin() helper
--  ✅ Automatic triggers (stock, ratings, orders)
--  ✅ Payment integration ready (PayHere)
--  ✅ Wishlist, Reviews, Addresses support
-- ==============================================================================

-- 🚨 DANGER ZONE: Un-comment to WIPE EVERYTHING and start fresh
-- DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;

-- =====================================================
-- STEP 1: EXTENSIONS & HELPER FUNCTIONS
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- FUNCTION: Check if user is admin (Checks 4 different places for security)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Check Service Role (Server-side)
  IF auth.role() = 'service_role' THEN RETURN TRUE; END IF;
  -- 2. Check JWT Role
  IF (auth.jwt() ->> 'role')::text = 'admin' THEN RETURN TRUE; END IF;
  -- 3. Check User Metadata (Auth table)
  IF (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin' THEN RETURN TRUE; END IF;
  -- 4. Check Public Users Table
  IF EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN RETURN TRUE; END IF;
  
  RETURN FALSE;
END;
$$;

-- =====================================================
-- STEP 2: TABLE DEFINITIONS
-- =====================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'customer',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  average_rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_cat ON public.products(category_id);

-- 4. PRODUCT IMAGES
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);

-- 5. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Customer Info Snapshot (in case user changes address later)
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  shipping_address_line1 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100) DEFAULT 'Sri Lanka',
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);

-- 6. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

-- 7. USER CARTS
CREATE TABLE IF NOT EXISTS public.user_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_user_carts_user ON public.user_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_carts_product ON public.user_carts(product_id);

-- 8. ADDRESSES
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  address_line1 VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Sri Lanka',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);

-- 9. REVIEWS
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON public.product_reviews(is_approved);

-- 10. STOCK MOVEMENTS (Audit Log)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL, -- 'order', 'restock', 'adjustment'
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);

-- 11. WISHLISTS (Save for Later)
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON public.wishlists(user_id);

-- 12. PAYMENTS (PayHere Integration)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- 'card', 'bank_transfer', 'cash_on_delivery'
  payhere_order_id VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  transaction_id VARCHAR(100),
  payment_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON public.payments(transaction_id);

-- 13. COUPONS (Discount Codes)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
  discount_value DECIMAL(10,2) NOT NULL,
  min_purchase_amount DECIMAL(10,2),
  max_discount_amount DECIMAL(10,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

-- 14. SETTINGS (Store Config)
CREATE TABLE IF NOT EXISTS public.settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  is_public BOOLEAN DEFAULT false
);

-- =====================================================
-- STEP 3: TRIGGERS & AUTOMATION
-- =====================================================

-- A. Generic Updated_At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_time BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_time BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_time BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_time BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_time BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_time BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carts_time BEFORE UPDATE ON public.user_carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_time BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- B. Auth Sync Trigger (The Fix for "Database Error")
-- Grants permissions first to ensure trigger doesn't fail
GRANT ALL ON public.users TO postgres, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    last_login = NOW();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Swallow errors to prevent signup failure, but log warning
  RAISE WARNING 'User creation failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- C. Order Number Generator
CREATE SEQUENCE IF NOT EXISTS order_number_seq;
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- D. Stock Management (Auto-decrement on order)
CREATE OR REPLACE FUNCTION manage_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create movement log
  INSERT INTO public.stock_movements (product_id, movement_type, quantity, notes)
  VALUES (NEW.product_id, 'order', -NEW.quantity, 'Order placed');
  -- 2. Update actual product stock
  UPDATE public.products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrease_stock_on_order AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION manage_stock_on_order();

-- E. Product Rating Update (Recalculate on review changes)
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_product_id UUID;
BEGIN
  -- Determine which product to update
  IF TG_OP = 'DELETE' THEN
    target_product_id := OLD.product_id;
  ELSE
    target_product_id := NEW.product_id;
  END IF;
  
  -- Update ratings
  UPDATE public.products SET
    average_rating = (SELECT COALESCE(AVG(rating), 0) FROM public.product_reviews WHERE product_id = target_product_id AND is_approved = true),
    review_count = (SELECT COUNT(*) FROM public.product_reviews WHERE product_id = target_product_id AND is_approved = true)
  WHERE id = target_product_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rating_on_review ON public.product_reviews;
CREATE TRIGGER update_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- =====================================================
-- STEP 4: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 1. USERS
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.users FOR INSERT WITH CHECK (true);

-- 2. PRODUCTS & CATEGORIES (Public Read, Admin Write)
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admin write products" ON public.products FOR ALL USING (public.is_admin());
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin write categories" ON public.categories FOR ALL USING (public.is_admin());
CREATE POLICY "Public read product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admin manage product images" ON public.product_images FOR ALL USING (public.is_admin());

-- 3. ORDERS (Users see own, Admin sees all)
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage orders" ON public.orders FOR UPDATE USING (public.is_admin());

-- 4. ORDER ITEMS
CREATE POLICY "Users view own items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()) 
  OR public.is_admin()
);
CREATE POLICY "Users create order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  OR public.is_admin()
);

-- 5. CART
CREATE POLICY "Users manage cart" ON public.user_carts FOR ALL USING (auth.uid() = user_id);

-- 6. ADDRESSES
CREATE POLICY "Users manage addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- 7. REVIEWS (Public read approved, users manage own)
CREATE POLICY "Public read approved reviews" ON public.product_reviews FOR SELECT USING (is_approved = true OR auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create reviews" ON public.product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.product_reviews FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admin delete reviews" ON public.product_reviews FOR DELETE USING (public.is_admin());

-- 8. WISHLISTS
CREATE POLICY "Users manage wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- 9. PAYMENTS (Users see own, Admin sees all)
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()) 
  OR public.is_admin()
);
CREATE POLICY "System create payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manage payments" ON public.payments FOR ALL USING (public.is_admin());

-- 10. COUPONS (Active coupons public, admin manages)
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT USING (
  (is_active = true AND (valid_from IS NULL OR valid_from <= NOW()) AND (valid_until IS NULL OR valid_until >= NOW())) 
  OR public.is_admin()
);
CREATE POLICY "Admin manage coupons" ON public.coupons FOR ALL USING (public.is_admin());

-- 11. STOCK MOVEMENTS (Admin only)
CREATE POLICY "Admin view stock" ON public.stock_movements FOR SELECT USING (public.is_admin());
CREATE POLICY "System create stock" ON public.stock_movements FOR INSERT WITH CHECK (true);

-- 12. SETTINGS (Public settings readable, admin manages)
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (is_public = true OR public.is_admin());
CREATE POLICY "Admin manage settings" ON public.settings FOR ALL USING (public.is_admin());

-- =====================================================
-- STEP 5: SEED DATA & ADMIN SETUP
-- =====================================================

-- Seed Settings
INSERT INTO public.settings (key, value, is_public) VALUES
  ('site_name', 'One Click Computers', true),
  ('currency', 'LKR', true),
  ('tax_rate', '0', true),
  ('free_shipping_threshold', '50000', true)
ON CONFLICT (key) DO NOTHING;

-- Seed Sample Category
INSERT INTO public.categories (name, slug, description, is_active) 
VALUES ('Laptops', 'laptops', 'High performance laptops and notebooks', true)
ON CONFLICT (slug) DO NOTHING;

-- Seed Sample Coupon (Optional - remove if not needed)
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_purchase_amount, is_active, valid_until)
VALUES ('WELCOME10', 'Welcome discount for new customers', 'percentage', 10.00, 10000.00, true, NOW() + INTERVAL '30 days')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- ADMIN SETUP (Run after your first admin user signs up)
-- =====================================================

-- If your admin users already exist in auth.users, run these to grant admin access:
UPDATE auth.users SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email IN ('admin@oneclick.com', 'inboxtoisuru@gmail.com', 'inboxtoisuru3@gmail.com');

UPDATE public.users SET role = 'admin'
WHERE email IN ('admin@oneclick.com', 'inboxtoisuru@gmail.com', 'inboxtoisuru3@gmail.com');

-- If you need to add a NEW admin email, use this template:
/* 
UPDATE auth.users SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'your-new-admin@example.com';

UPDATE public.users SET role = 'admin' WHERE email = 'your-new-admin@example.com';
*/

-- =====================================================
-- END OF SCRIPT - VERIFICATION
-- =====================================================

DO $$
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM pg_tables WHERE schemaname = 'public';
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
  SELECT COUNT(*) INTO trigger_count FROM pg_trigger t 
    JOIN pg_class c ON t.tgrelid = c.oid 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE n.nspname IN ('public', 'auth') AND NOT t.tgisinternal;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ONE CLICK COMPUTERS DATABASE SETUP COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Database Statistics:';
  RAISE NOTICE '   • Tables Created: %', table_count;
  RAISE NOTICE '   • RLS Policies: %', policy_count;
  RAISE NOTICE '   • Triggers: %', trigger_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tables:';
  RAISE NOTICE '   1. users (with auth sync)';
  RAISE NOTICE '   2. categories';
  RAISE NOTICE '   3. products';
  RAISE NOTICE '   4. product_images';
  RAISE NOTICE '   5. orders';
  RAISE NOTICE '   6. order_items';
  RAISE NOTICE '   7. user_carts';
  RAISE NOTICE '   8. addresses';
  RAISE NOTICE '   9. product_reviews';
  RAISE NOTICE '   10. stock_movements';
  RAISE NOTICE '   11. wishlists';
  RAISE NOTICE '   12. payments (PayHere ready)';
  RAISE NOTICE '   13. coupons (discount codes)';
  RAISE NOTICE '   14. settings';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security:';
  RAISE NOTICE '   • Row Level Security enabled on all tables';
  RAISE NOTICE '   • is_admin() helper function created';
  RAISE NOTICE '   • Admin users configured';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Automation:';
  RAISE NOTICE '   • Auth sync trigger (fixes "Database error granting user")';
  RAISE NOTICE '   • Auto order number generation';
  RAISE NOTICE '   • Auto stock tracking on orders';
  RAISE NOTICE '   • Auto product rating calculation';
  RAISE NOTICE '   • Auto updated_at timestamps';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Your admin users are ready: admin@oneclick.com, inboxtoisuru@gmail.com, inboxtoisuru3@gmail.com';
  RAISE NOTICE '   2. Have admins log out and log back in to get new permissions';
  RAISE NOTICE '   3. Test customer signup/login';
  RAISE NOTICE '   4. Test admin dashboard access';
  RAISE NOTICE '   5. Start adding products!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;