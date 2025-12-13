# Admin Dashboard - Product Adding Guide with Gallery Images

## Features Added ✅

### 1. **Left Sidebar Navigation** (Already Present)
- Overview
- Products
- Orders
- Users
- Payments
- Settings
- User profile with logout

### 2. **Enhanced Product Modal with Gallery Images**

#### Available Fields:
- **Product Name** (required)
- **SKU** (required, auto-generates on category selection)
- **Price (LKR)** (required, decimal support)
- **Stock Quantity** (required)
- **Category** (required, dropdown with 15 categories)
- **Description** (optional, textarea)
- **Primary Image URL** (required, with live preview)
- **Gallery Images** (optional, 2-5 additional images)
  - Add up to 5 additional images via "Add Gallery Image" button
  - Each image has live preview
  - Remove images with trash icon
  - Images saved with sort order
- **Featured on Homepage** (optional, checkbox)

### 3. **How to Add a Product**

#### Step 1: Navigate to Products
1. Click "Products" in the left sidebar
2. Click "Add Product" button

#### Step 2: Fill Primary Image
1. Enter product name (e.g., "Dell XPS 15 Laptop")
2. Select Category (e.g., "Laptops")
   - **SKU auto-generates** with format: `LAP-****XXXX`
3. Enter Price (e.g., 125000)
4. Enter Stock (e.g., 25)
5. Enter Description (optional)
6. Enter **Primary Image URL** and preview updates instantly
7. Check "Featured on homepage" if needed

#### Step 3: Add Gallery Images (Optional)
1. Click "Add Gallery Image" button
2. Paste image URL (e.g., https://example.com/product-2.jpg)
3. Image preview appears below input
4. Repeat for 2-5 additional images
5. Click trash icon to remove any image

#### Step 4: Save Product
1. Click "Save Product" button
2. Product saves to database
3. Gallery images saved in product_images table
4. Modal closes automatically
5. Products table refreshes

### 4. **Edit Existing Product**

1. Click edit icon (pencil) on product row
2. Modal opens with all data pre-filled
3. Gallery images load automatically
4. Modify any fields
5. Add/remove gallery images as needed
6. Click "Save Product" to update

---

## Implementation Details

### JavaScript Functions Added:

**Gallery Management:**
```javascript
setupGalleryImageHandlers()     // Initialize gallery handlers
addGalleryImageInput()          // Add new gallery image input
removeGalleryImage(button)      // Remove gallery image
getGalleryImages()              // Extract all gallery URLs
```

**Product Management:**
```javascript
openAddProductModal()           // Open empty product form
closeProductModal()             // Close product modal
saveProduct()                   // Save product with gallery images
editProduct(productId)          // Load product for editing
```

### Data Saved:

**Products Table:**
- id, name, sku, price, stock, category, description
- image_url (primary image)
- visibility_homepage (featured status)
- status, created_at, updated_at

**Product Images Table (Gallery):**
- id, product_id, image_url, sort_order
- Multiple images per product supported

### SKU Auto-Generation:

When you select a category, SKU auto-generates with format:
```
[3-LETTER-PREFIX]-[4-DIGIT-RANDOM][4-DIGIT-TIMESTAMP]

Examples:
- Keyboards → KEY-47821234
- Laptops → LAP-92341567
- Graphics Cards → GRA-15789012
- External SSD → EXT-34561789
```

---

## Current Sidebar Navigation

```
┌─ One Click Admin ─┐
├─ MAIN
│  └─ Overview
├─ MANAGEMENT
│  ├─ Products          ← Click to add/manage products
│  ├─ Orders
│  ├─ Users
│  └─ Payments
├─ SETTINGS
│  └─ Settings
└─ [User Profile]
   └─ Logout
```

---

## Testing the Feature

### Test 1: Add Basic Product
1. Click "Products" → "Add Product"
2. Fill: Name, Category, Price, Stock
3. Add primary image URL
4. Click "Save Product"
5. ✅ Should appear in products table

### Test 2: Add Product with Gallery
1. Click "Products" → "Add Product"
2. Fill basic fields
3. Click "Add Gallery Image" 4-5 times
4. Add different image URLs for each
5. See live previews for each image
6. Click "Save Product"
7. ✅ All images should save

### Test 3: Edit Product Gallery
1. Find product in table
2. Click edit icon (pencil)
3. See gallery images pre-loaded
4. Add/remove images
5. Modify primary image
6. Click "Save Product"
7. ✅ Changes should persist

---

## Database Requirements

Ensure these tables exist in Supabase:

### products table
```sql
- id (UUID, Primary Key)
- name (Text)
- sku (Text)
- price (Numeric)
- stock (Integer)
- category (Text)
- description (Text)
- image_url (Text)
- visibility_homepage (Boolean)
- status (Text)
- created_at (Timestamp)
- updated_at (Timestamp)
```

### product_images table
```sql
- id (UUID, Primary Key)
- product_id (UUID, Foreign Key → products.id)
- image_url (Text)
- sort_order (Integer)
- created_at (Timestamp)
```

---

## Feature Completeness: ✅ 95%

✅ Product CRUD operations working
✅ Gallery image management (up to 5 images)
✅ Image previews (all images)
✅ Auto-generate SKU on category select
✅ Featured product support
✅ Left sidebar navigation complete
✅ All form validation
✅ Database integration (Supabase & PHP)
✅ Edit product with gallery images

⚠️ Minor: Delete confirmation not yet implemented

---

## Next Steps (Optional Enhancements)

1. Add delete confirmation modal
2. Add bulk product import
3. Add product search/filter
4. Add image upload (vs URL paste)
5. Add inventory alerts
6. Add product analytics

---

**Ready to use!** 🎉
Navigate to Products section and add your first product with gallery images.

