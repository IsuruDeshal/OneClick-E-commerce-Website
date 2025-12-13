# 🖥️ One Click Computers - E-commerce Platform


<img width="1866" height="947" alt="Opera Snapshot_2025-12-13_123146_localhost" src="https://github.com/user-attachments/assets/7e0a2b24-e279-4032-a6f5-905fe5766fc8" />





A modern, full-featured e-commerce platform for computer hardware and electronics, built with vanilla JavaScript and powered by Supabase for real-time backend operations.

![One Click Computers](assets/img/one-logo.png)

## ✨ Features

<img width="1866" height="947" alt="Opera Snapshot_2025-12-13_123236_localhost" src="https://github.com/user-attachments/assets/41ee499d-ff19-4107-ba2e-14a998b7807d" />

### 🛒 Customer Features
- **Product Catalog** - Browse 20+ categories of computer hardware
- **Advanced Search** - Real-time search with filters and sorting
- **Shopping Cart** - Persistent cart with guest & authenticated support
- **Wishlist** - Save favorite items for later
- **User Accounts** - Registration, login, password reset
- **Order Tracking** - View order history and status
- **Responsive Design** - Works on desktop, tablet, and mobile

### 👑 Admin Dashboard
- **Product Management** - Add, edit, delete products with image uploads
- **Order Management** - View, update status, print invoices
- **Real-time Updates** - Changes sync instantly to database
- **Analytics Overview** - Track products, orders, and sales

### 🔐 Security
- **Supabase Authentication** - Secure JWT-based auth
- **Row Level Security (RLS)** - Database-level access control
- **Role-based Access** - Admin vs customer permissions
- **Session Management** - Secure token handling

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | HTML5, CSS3, JavaScript ES6+ |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| API | PHP 8.x (XAMPP) |
| Payment | PayHere Gateway |
| Hosting | Apache (XAMPP) |

## 📁 Project Structure

```
oneclick/
├── admin/              # Admin dashboard
│   ├── index.html      # Admin panel
│   ├── login.html      # Admin login
│   └── css/            # Admin styles
├── api/                # PHP API endpoints
│   ├── auth/           # Authentication APIs
│   ├── cart/           # Cart operations
│   ├── wishlist/       # Wishlist operations
│   └── orders/         # Order management
├── assets/
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript modules
│   ├── img/            # Images & banners
│   └── icons/          # SVG icons
├── components/         # Reusable HTML components
├── sql/                # Database setup scripts
└── docs/               # Documentation
```

## 🚀 Quick Start

### Prerequisites
- [XAMPP](https://www.apachefriends.org/) (PHP 8.x, Apache)
- [Supabase Account](https://supabase.com/)
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/IsuruDeshal/OneClick-E-commerce-Website.git
   cd OneClick-E-commerce-Website
   ```

2. **Move to XAMPP htdocs**
   ```bash
   # Windows
   move OneClick-E-commerce-Website C:\xampp\htdocs\oneclick
   
   # Mac/Linux
   mv OneClick-E-commerce-Website /opt/lampp/htdocs/oneclick
   ```

3. **Setup Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL from `sql/COMPLETE-DATABASE-SETUP.sql` in SQL Editor
   - Run `sql/FIX-AUTH-TRIGGER.sql` for authentication fixes
   - Copy your project URL and anon key

4. **Configure Supabase Connection**
   
   Edit `assets/js/supabase-config.js`:
   ```javascript
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

5. **Start XAMPP**
   - Start Apache from XAMPP Control Panel
   - Visit: `http://localhost/oneclick`

### Create Admin User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create New User"
3. Enter email and password
4. Add to user metadata:
   ```json
   {"role": "admin"}
   ```

## 📱 Pages

### Customer Pages
| Page | URL | Description |
|------|-----|-------------|
| Homepage | `/index.html` | Landing page with featured products |
| Shop | `/shop.html` | All products catalog |
| Product | `/product.html?id=xxx` | Product details |
| Cart | `/cart.html` | Shopping cart |
| Checkout | `/checkout.html` | Order checkout |
| Login | `/login.html` | User login |
| Register | `/register.html` | New user registration |
| Account | `/account.html` | User dashboard |
| Orders | `/orders.html` | Order history |

### Category Pages
`/laptops.html`, `/desktops.html`, `/monitors.html`, `/printers.html`, `/keyboard.html`, `/mouse.html`, `/graphics-card.html`, `/power-supply.html`, and more...

### Admin Pages
| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/admin/index.html` | Admin control panel |
| Login | `/admin/login.html` | Admin authentication |

## 🗄️ Database Schema

### Main Tables
- `users` - User profiles and roles
- `products` - Product catalog
- `categories` - Product categories
- `orders` - Customer orders
- `order_items` - Order line items
- `user_carts` - Shopping cart items
- `wishlists` - User wishlists
- `product_reviews` - Product ratings
- `addresses` - Shipping addresses

## 🔧 API Endpoints

### Authentication
- `POST /api/user-login.php` - User login
- `POST /api/user-register.php` - User registration
- `POST /api/admin-login-supabase.php` - Admin login

### Products
- `GET /api/get-products.php` - List products
- `GET /api/get-categories.php` - List categories

### Cart
- `POST /api/cart/add-to-cart-supabase.php` - Add item
- `GET /api/cart/get-cart-supabase.php` - Get cart
- `DELETE /api/cart/remove-from-cart-supabase.php` - Remove item

### Orders
- `POST /api/create-order-supabase.php` - Create order
- `GET /api/get-orders-supabase.php` - Get orders

## 🎨 Customization

### Changing Theme Colors
Edit `assets/css/styles.css`:
```css
:root {
  --primary: #your-color;
  --accent: #your-accent;
  --background: #your-bg;
}
```

### Adding Products
1. Login to Admin Dashboard
2. Go to Products → Add New Product
3. Fill in details and upload images
4. Save product

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**Isuru Deshal**
- GitHub: [@IsuruDeshal](https://github.com/IsuruDeshal)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⭐ Show Your Support

Give a ⭐ if this project helped you!

---

Made with ❤️ by [Isuru Deshal](https://github.com/IsuruDeshal)
