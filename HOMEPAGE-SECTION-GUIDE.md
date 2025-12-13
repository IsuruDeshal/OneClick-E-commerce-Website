# 🏠 Homepage Section Selector - Implementation Guide

## Overview

This feature allows you to assign products to specific homepage sections (Top Selling, Shop Laptops, Best Monitors, etc.) directly from the admin dashboard when adding or editing products.

**Key Feature:** Products appear in BOTH their category page AND the selected homepage section simultaneously.

---

## 📋 Available Homepage Sections

| Homepage Section | Tag/Slug | Use Case |
|------------------|----------|----------|
| Top Selling | `top-selling` | Your best-selling products |
| Shop Laptops | `shop-laptops` | Featured laptop products |
| Best Monitors | `best-monitors` | Featured monitor products |
| Gaming Products | `gaming-products` | Gaming category products |
| Pre-Built PC | `prebuilt-pc` | Pre-built computer systems |
| Top Printers & All-in-One | `top-printers` | Featured printers and MFPs |

---

## 🚀 How to Use - Step by Step

### Step 1: Add a New Product

1. Go to Admin Dashboard → **Products**
2. Click **"Add Product"** button
3. Fill in basic product information:
   - Product Name
   - Select Category (e.g., Laptops, Monitors)
   - Price, Stock Quantity
   - Description

### Step 2: Select Primary Image & Gallery

1. Paste **Primary Image URL** → preview shows
2. Click **"Add Gallery Image"** to add 2-5 images
3. Each image shows live preview

### Step 3: Select Homepage Section (NEW!)

Look for the **"Homepage Section"** dropdown field:

```
Homepage Section (Optional)
[-- No Homepage Section --] ▼

Available options:
- Top Selling
- Shop Laptops
- Best Monitors
- Gaming Products
- Pre-Built PC
- Top Printers & All-in-One
```

**Select one** homepage section where the product should appear.

### Step 4: Save Product

Click **"Save Product"** button.

✅ Product saved and will appear in:
- Its normal category page (e.g., Laptops)
- The selected homepage section (e.g., Shop Laptops)

---

## 📊 Database Configuration

### Required Database Column

Your `products` table needs a `homepage_section` column:

```sql
ALTER TABLE products ADD COLUMN homepage_section VARCHAR(50) DEFAULT NULL;
```

Column details:
- Type: VARCHAR(50) or TEXT
- Nullable: YES
- Values: top-selling, shop-laptops, best-monitors, gaming-products, prebuilt-pc, top-printers
- Default: NULL (no homepage section)

### Supabase Setup

If using Supabase:
1. Open your Supabase project
2. Go to Table Editor
3. Open `products` table
4. Add new column:
   - Name: `homepage_section`
   - Type: `text`
   - Allow Null: ✓
   - Default value: `null`

---

## 🎯 Usage Examples

### Example 1: Product for Shop Laptops Section

```
Product Name: Dell XPS 15 Laptop
Category: Laptops ← Normal category
Homepage Section: Shop Laptops ← Will appear in this section too

Result:
✓ Product appears in "Laptops" category page
✓ Product appears in "Shop Laptops" homepage section
```

### Example 2: Top Selling Product

```
Product Name: NVIDIA RTX 4090
Category: Graphics Cards ← Normal category
Homepage Section: Top Selling ← Premium spot on homepage

Result:
✓ Product appears in "Graphics Cards" category
✓ Product appears in "Top Selling" section on homepage
```

### Example 3: Gaming Product

```
Product Name: RGB Gaming Keyboard
Category: Keyboards ← Normal category
Homepage Section: Gaming Products ← Special gaming collection

Result:
✓ Product appears in "Keyboards" category
✓ Product appears in "Gaming Products" section
```

### Example 4: No Homepage Section

```
Product Name: USB Cable
Category: Accessories ← Normal category
Homepage Section: (empty) ← Left blank

Result:
✓ Product appears only in "Accessories" category
✓ Product does NOT appear in any homepage section
```

---

## 🔧 How It Works

### Frontend (Admin Dashboard)

1. **Add/Edit Product Modal** has a new dropdown:
   - Field: `Homepage Section`
   - Options: All 6 homepage sections
   - Allows: Empty value (optional)

2. **When Saving Product:**
   - Homepage section value is captured
   - Sent to backend with other product data
   - Stored in `products.homepage_section` column

3. **When Editing Product:**
   - Existing homepage section pre-populated
   - Can be changed or removed
   - Saves updated value

### Backend (Data Storage)

- **PHP Backend:** Receives `homepage_section` parameter, saves to database
- **Supabase:** Saves to `products` table `homepage_section` column
- **Database:** Stores the selected section slug (e.g., "top-selling")

### Frontend Display (Website)

Your website's homepage sections query products by `homepage_section` value:

```javascript
// Example: Get all products for "Top Selling" section
SELECT * FROM products WHERE homepage_section = 'top-selling'

// Example: Get all products for "Shop Laptops" section
SELECT * FROM products WHERE homepage_section = 'shop-laptops'
```

---

## 🔌 Frontend Implementation (Website)

To display products in homepage sections on your website, you need to:

### Option 1: Using a Query Builder (Elementor, WPBakery, etc.)

1. Create a section for "Top Selling"
2. Set query filter: `homepage_section = top-selling`
3. Display products matching that filter

### Option 2: Using Custom Code

```php
// Get products for a specific homepage section
$products = $wpdb->get_results(
  $wpdb->prepare(
    "SELECT * FROM products WHERE homepage_section = %s",
    'top-selling'
  )
);

// Loop through and display
foreach ($products as $product) {
  // Display product
}
```

### Option 3: Using JavaScript (Your Custom Frontend)

```javascript
// Fetch products for a homepage section
async function getHomepageSectionProducts(section) {
  const response = await fetch(`/api/products?homepage_section=${section}`);
  const products = await response.json();
  return products;
}

// Usage:
const topSelling = await getHomepageSectionProducts('top-selling');
const shopLaptops = await getHomepageSectionProducts('shop-laptops');
```

---

## 📝 Field Information

### Homepage Section Dropdown

**Location:** Product Modal, below Category field

**Options:**
```
-- No Homepage Section --          (empty/null)
Top Selling                        (top-selling)
Shop Laptops                       (shop-laptops)
Best Monitors                      (best-monitors)
Gaming Products                    (gaming-products)
Pre-Built PC                       (prebuilt-pc)
Top Printers & All-in-One         (top-printers)
```

**Default:** Empty (no homepage section)

**Help Text:** "Choose a homepage section. Product will appear both in its category AND the selected section."

---

## ✅ Feature Checklist

- ✅ Homepage Section dropdown in product modal
- ✅ 6 predefined homepage sections
- ✅ Optional field (can be left empty)
- ✅ Save homepage section to database
- ✅ Load homepage section when editing
- ✅ Product category independent
- ✅ Works with gallery images
- ✅ Works with SKU auto-generation
- ✅ Works with featured status

---

## 📊 Data Flow

### Adding Product with Homepage Section:

```
User fills form:
  - Name: "Dell XPS 15"
  - Category: "Laptops"
  - Homepage Section: "Shop Laptops"
    ↓
Click "Save Product"
    ↓
saveProduct() captures:
  - category: "Laptops"
  - homepage_section: "shop-laptops"
    ↓
Backend saves to database:
  - products.category = "Laptops"
  - products.homepage_section = "shop-laptops"
    ↓
✅ Product saved and linked to section
    ↓
Product appears in:
  - Category page: "Laptops"
  - Homepage section: "Shop Laptops"
```

### Query from Frontend:

```
Show products in "Shop Laptops" section:
  ↓
Query: SELECT * FROM products 
       WHERE homepage_section = "shop-laptops"
  ↓
Returns all products tagged for that section
  ↓
Display in "Shop Laptops" section on homepage
```

---

## 🎛️ Admin Dashboard Changes

**Modified File:** `admin/index.html`

**Changes Made:**
1. Added Homepage Section dropdown to product modal
2. Updated saveProduct() to capture homepage_section
3. Updated editProduct() to load homepage_section
4. Added field to Supabase backend
5. Added field to PHP backend

**New Form Field:**
- ID: `productHomepageSection`
- Type: `<select>` dropdown
- Options: 6 homepage sections + empty option

---

## 🚀 Ready to Use

You can now:
1. Add products and assign them to homepage sections
2. Products appear in both category AND homepage section
3. Edit products and change their section
4. Leave section empty for products that don't need special placement
5. All data persists in database

---

## 💾 Database Migration (If Needed)

If your `products` table doesn't have the `homepage_section` column:

### For Direct Database:

```sql
-- Add column to existing table
ALTER TABLE products 
ADD COLUMN homepage_section VARCHAR(50) DEFAULT NULL;

-- Update existing products (optional)
UPDATE products SET homepage_section = NULL;
```

### For Supabase:

1. Go to Table Editor
2. Click `products` table
3. Click "Add Column"
4. Name: `homepage_section`
5. Type: `text`
6. Allow Null: Yes
7. Save

---

## 📚 API Integration

### PHP Backend

The API receives:
```json
{
  "id": "product-id",
  "name": "Product Name",
  "category": "Laptops",
  "homepage_section": "shop-laptops",
  "price": 125000,
  "stock": 25
}
```

Save to database:
```php
$homepage_section = $_POST['homepage_section'] ?? null;
UPDATE products SET homepage_section = '$homepage_section' WHERE id = '$id';
```

### Supabase Backend

Automatically saves to `products.homepage_section` column when updateing/inserting products.

---

## ✨ Complete Feature Summary

| Aspect | Status | Details |
|--------|--------|---------|
| Dropdown Field | ✅ | 6 sections + empty option |
| Save Functionality | ✅ | Stores in database |
| Edit Functionality | ✅ | Pre-loads saved section |
| Category Independent | ✅ | Works with any category |
| Database Column | ✅ | `homepage_section` text column |
| API Integration | ✅ | Both PHP and Supabase |
| Frontend Ready | ⏳ | Ready to query by section |

---

## 🎯 Next Steps

1. ✅ Feature implemented in admin dashboard
2. ⏳ Add `homepage_section` column to database (if not present)
3. ⏳ Update website homepage to query by `homepage_section`
4. ⏳ Create homepage sections on your website (Top Selling, Shop Laptops, etc.)
5. ⏳ Configure section queries to filter by the column

---

**Status: ✅ READY FOR USE**

You can now assign products to homepage sections directly from the admin dashboard!

