# 🎯 QUICK START - Add Product with Gallery Images

## In 60 Seconds

### 1️⃣ Open Admin Dashboard
```
http://localhost/oneclick/admin/index.html
```

### 2️⃣ Click Products (Left Sidebar)
```
Products → Add Product button
```

### 3️⃣ Fill Form
```
Name: Dell XPS 15 Laptop
Category: Laptops (SKU auto-generates: LAP-XXXX)
Price: 125000
Stock: 25
Description: High performance laptop
```

### 4️⃣ Add Primary Image
```
Primary Image URL: https://example.com/image.jpg
→ Preview shows instantly
```

### 5️⃣ Add Gallery Images (Click button 4-5 times)
```
Gallery Image 1: https://example.com/angle1.jpg → Preview ✓
Gallery Image 2: https://example.com/angle2.jpg → Preview ✓
Gallery Image 3: https://example.com/angle3.jpg → Preview ✓
Gallery Image 4: https://example.com/close.jpg  → Preview ✓
Gallery Image 5: https://example.com/specs.jpg  → Preview ✓
```

### 6️⃣ Save Product
```
Click "Save Product" button
✅ Product saved with all gallery images!
```

---

## 📸 What Users See

### In Admin:
- Product appears in products table
- Edit icon to modify
- Delete icon to remove

### In Shop:
- Primary image shows in product grid
- Gallery images in product details page
- User can view 5 images total

---

## 🎨 Form Layout

```
┌─────────────────────────────────┐
│ Add Product                  ✕  │
├─────────────────────────────────┤
│ Product Name *: [Input]         │
│ SKU *: [Auto: LAP-4782]         │
│ Price (LKR) *: [125000]         │
│ Stock *: [25]                   │
│ Category *: [Laptops ▼]         │
│ Description: [Textarea]         │
│                                 │
│ Primary Image URL *: [URL]      │
│ [Image Preview]                 │
│                                 │
│ Gallery Images:                 │
│ [URL 1] [Preview] [Trash]       │
│ [URL 2] [Preview] [Trash]       │
│ [URL 3] [Preview] [Trash]       │
│ [URL 4] [Preview] [Trash]       │
│ [URL 5] [Preview] [Trash]       │
│ [+ Add Gallery Image]           │
│                                 │
│ ☐ Featured on homepage          │
│                                 │
│ [Cancel] [Save Product]         │
└─────────────────────────────────┘
```

---

## ✨ Key Features

| Feature | How It Works |
|---------|-------------|
| **SKU Auto-Gen** | Select category → SKU generates automatically |
| **Image Preview** | Paste URL → Image preview appears instantly |
| **Gallery Images** | Add 2-5 images → Each shows preview |
| **Remove Images** | Click trash icon → Image removed |
| **Edit Product** | Click edit icon → Modify product + gallery |
| **Featured** | Check "Featured" → Shows on homepage |

---

## 🔗 Image Examples

Working image URLs you can test:
```
https://via.placeholder.com/400
https://picsum.photos/400/300
https://images.unsplash.com/photo-...
```

Or use real product images from your site.

---

## ⚠️ Important Notes

✓ **Primary image is required**
✓ **Gallery images are optional**
✓ **Maximum 5 gallery images per product**
✓ **All images use URLs (no file upload)**
✓ **Images show live preview before saving**
✓ **SKU auto-generates, don't override unless needed**
✓ **Featured checkbox shows on homepage**

---

## 🆘 Troubleshooting

| Issue | Fix |
|-------|-----|
| Image preview not showing | Check image URL is valid |
| Gallery images not saving | Verify product_images table exists |
| SKU not auto-generating | Select a category from dropdown |
| Edit doesn't load gallery | Clear browser cache |

---

## 📊 What Gets Saved

**Products Table:**
- Product name, SKU, price, stock
- Category, description
- Primary image URL
- Featured status

**Product_Images Table:**
- 1-5 gallery images per product
- Image URL and sort order
- Linked to product ID

---

## 🚀 Ready to Add Products!

Follow the 6 steps above to add your first product with gallery images.

**Questions?** Check the detailed guides:
- ADMIN-DASHBOARD-FEATURES.md
- PRODUCT-GALLERY-GUIDE.md
- GALLERY-IMAGES-IMPLEMENTATION.md

---

**Status:** ✅ Ready to Use  
**Version:** admin/index.html (2047 lines)  
**Features:** Complete and Tested

