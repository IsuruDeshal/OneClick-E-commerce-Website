/**
 * Admin Dashboard - One Click Computers
 * Complete Firebase-based admin panel for managing products, users, orders, and categories
 */

import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  Timestamp,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { 
  getAuth, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Initialize Firebase services
const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

// Global state
let currentUser = null;
let currentView = 'overview';
let productsCache = [];
let categoriesCache = [];
let usersCache = [];
let ordersCache = [];

// ============================================
// AUTHENTICATION & AUTHORIZATION
// ============================================

/**
 * Check if user is authenticated and has admin privileges
 */
function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Not logged in - redirect to login
      window.location.href = '/login.html?redirect=dashboard';
      return;
    }

    currentUser = user;

    // Check if user has admin role
    const isAdmin = await checkAdminRole(user.uid);
    if (!isAdmin) {
      showError('Access Denied', 'You do not have permission to access the admin dashboard.');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 2000);
      return;
    }

    // User is authenticated and is admin
    initDashboard();
  });
}

/**
 * Check if user has admin role in Firestore
 */
async function checkAdminRole(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    return userData.role === 'admin' || userData.isAdmin === true;
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

// ============================================
// DASHBOARD INITIALIZATION
// ============================================

/**
 * Initialize dashboard after authentication
 */
async function initDashboard() {
  showLoader();
  
  try {
    // Load initial data
    await Promise.all([
      loadProducts(),
      loadCategories(),
      loadUsers(),
      loadOrders()
    ]);

    // Setup event listeners
    setupEventListeners();

    // Show overview by default
    showView('overview');

    hideLoader();
  } catch (error) {
    console.error('Dashboard initialization error:', error);
    showError('Initialization Error', 'Failed to load dashboard data');
    hideLoader();
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', (e) => {
      const section = e.currentTarget.dataset.section;
      if (!section) return; // Skip items without data-section (like logout)
      
      e.preventDefault();
      showView(section);
    });
  });
  // Product actions
  document.getElementById('add-product-btn')?.addEventListener('click', showAddProductModal);
  document.getElementById('save-product-btn')?.addEventListener('click', saveProduct);
  document.getElementById('cancel-product-btn')?.addEventListener('click', hideProductModal);
  document.getElementById('cancel-product-btn-2')?.addEventListener('click', hideProductModal);

  // Category actions
  document.getElementById('add-category-btn')?.addEventListener('click', showAddCategoryModal);
  document.getElementById('save-category-btn')?.addEventListener('click', saveCategory);
  document.getElementById('cancel-category-btn')?.addEventListener('click', hideCategoryModal);
  document.getElementById('cancel-category-btn-2')?.addEventListener('click', hideCategoryModal);
  // Search and filters
  document.getElementById('product-search')?.addEventListener('input', filterProducts);
  document.getElementById('category-filter')?.addEventListener('change', filterProducts);
  document.getElementById('availability-filter')?.addEventListener('change', filterProducts);

  // Logout
  const logoutBtn = document.getElementById('logout-btn') || document.getElementById('logoutBtn');
  logoutBtn?.addEventListener('click', logout);
}

/**
 * Show specific dashboard view
 */
function showView(viewName) {
  currentView = viewName;

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(link => {
    link.classList.toggle('active', link.dataset.section === viewName);
  });

  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });

  // Show selected section
  const section = document.getElementById(viewName);
  if (section) {
    section.classList.add('active');
  }

  // Load section-specific data
  switch(viewName) {
    case 'overview':
      updateOverviewStats();
      break;
    case 'products':
      renderProductsTable();
      break;
    case 'categories':
      renderCategoriesTable();
      break;
    case 'users':
      renderUsersTable();
      break;
    case 'orders':
      renderOrdersTable();
      break;
  }
}

// ============================================
// OVERVIEW SECTION
// ============================================

/**
 * Update overview statistics
 */
function updateOverviewStats() {
  // Total Products
  const totalProducts = productsCache.length;
  const totalProductsEl = document.getElementById('totalProducts') || document.getElementById('total-products');
  if (totalProductsEl) totalProductsEl.textContent = totalProducts;

  // Total Users
  const totalUsers = usersCache.length;
  const totalUsersEl = document.getElementById('totalUsers') || document.getElementById('total-users');
  if (totalUsersEl) totalUsersEl.textContent = totalUsers;

  // Total Orders
  const totalOrders = ordersCache.length;
  const totalOrdersEl = document.getElementById('totalOrders') || document.getElementById('total-orders');
  if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;

  // Total Revenue
  const totalRevenue = ordersCache
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + (order.total || 0), 0);
  const totalRevenueEl = document.getElementById('totalRevenue') || document.getElementById('total-revenue');
  if (totalRevenueEl) totalRevenueEl.textContent = `$${totalRevenue.toFixed(2)}`;

  // Recent orders
  renderRecentOrders();
}

/**
 * Render recent orders in overview
 */
function renderRecentOrders() {
  const recentOrders = ordersCache
    .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
    .slice(0, 5);

  const tbody = document.getElementById('recent-orders-tbody');
  if (!tbody) return;

  if (recentOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No recent orders</td></tr>';
    return;
  }

  tbody.innerHTML = recentOrders.map(order => `
    <tr>
      <td>#${order.orderNumber || order.id.substring(0, 8)}</td>
      <td>${order.customerName || 'N/A'}</td>
      <td>$${(order.total || 0).toFixed(2)}</td>
      <td><span class="badge badge-${getStatusColor(order.status)}">${order.status || 'pending'}</span></td>
      <td>${formatDate(order.createdAt)}</td>
    </tr>
  `).join('');
}

// ============================================
// PRODUCTS SECTION
// ============================================

/**
 * Load products from Firestore
 */
async function loadProducts() {
  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    productsCache = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return productsCache;
  } catch (error) {
    console.error('Error loading products:', error);
    throw error;
  }
}

/**
 * Render products table
 */
function renderProductsTable() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  if (productsCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No products found</td></tr>';
    return;
  }

  tbody.innerHTML = productsCache.map(product => `
    <tr>
      <td>
        <img src="${product.images?.[0] || '/assets/images/placeholder.jpg'}" 
             alt="${product.name}" 
             style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
      </td>
      <td>${product.name || 'Unnamed Product'}</td>
      <td>${product.category || 'Uncategorized'}</td>
      <td>$${(product.price || 0).toFixed(2)}</td>
      <td>${product.stock || 0}</td>
      <td><span class="badge badge-${product.inStock ? 'success' : 'danger'}">${product.inStock ? 'In Stock' : 'Out of Stock'}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editProduct('${product.id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * Filter products based on search and filters
 */
function filterProducts() {
  const searchTerm = document.getElementById('product-search')?.value.toLowerCase() || '';
  const categoryFilter = document.getElementById('category-filter')?.value || '';
  const availabilityFilter = document.getElementById('availability-filter')?.value || '';

  const filtered = productsCache.filter(product => {
    // Search filter
    const matchesSearch = !searchTerm || 
      product.name?.toLowerCase().includes(searchTerm) ||
        (product.brand ? product.brand.toLowerCase().includes(searchTerm) : false) ||
      product.description?.toLowerCase().includes(searchTerm);

    // Category filter
    const matchesCategory = !categoryFilter || product.category === categoryFilter;

    // Availability filter
    const matchesAvailability = !availabilityFilter || 
      (availabilityFilter === 'in-stock' && product.inStock) ||
      (availabilityFilter === 'out-of-stock' && !product.inStock);

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  // Re-render with filtered products
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  tbody.innerHTML = filtered.map(product => `
    <tr>
      <td>
        <img src="${product.images?.[0] || '/assets/images/placeholder.jpg'}" 
             alt="${product.name}" 
             style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
      </td>
      <td>${product.name || 'Unnamed Product'}</td>
      <td>${product.category || 'Uncategorized'}</td>
      <td>$${(product.price || 0).toFixed(2)}</td>
      <td>${product.stock || 0}</td>
      <td><span class="badge badge-${product.inStock ? 'success' : 'danger'}">${product.inStock ? 'In Stock' : 'Out of Stock'}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editProduct('${product.id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * Show add product modal
 */
function showAddProductModal() {
  document.getElementById('product-modal-title').textContent = 'Add New Product';
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value = '';
  
  // Populate category dropdown
  const categorySelect = document.getElementById('product-category');
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Select Category</option>' +
      categoriesCache.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
  }

  document.getElementById('product-modal').style.display = 'flex';
}

/**
 * Show edit product modal
 */
window.editProduct = async function(productId) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('product-id').value = productId;
  document.getElementById('product-name').value = product.name || '';
  document.getElementById('product-brand').value = product.brand || '';
  document.getElementById('product-category').value = product.category || '';
  document.getElementById('product-price').value = product.price || '';
  document.getElementById('product-stock').value = product.stock || '';
  document.getElementById('product-description').value = product.description || '';
  document.getElementById('product-in-stock').checked = product.inStock || false;
  document.getElementById('product-featured').checked = product.featured || false;

  // Populate category dropdown
  const categorySelect = document.getElementById('product-category');
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Select Category</option>' +
      categoriesCache.map(cat => `<option value="${cat.name}"${cat.name === product.category ? ' selected' : ''}>${cat.name}</option>`).join('');
  }

  document.getElementById('product-modal').style.display = 'flex';
}

/**
 * Hide product modal
 */
function hideProductModal() {
  document.getElementById('product-modal').style.display = 'none';
  document.getElementById('product-form').reset();
}

/**
 * Save product (add or update)
 */
async function saveProduct() {
  const productId = document.getElementById('product-id').value;
  
  const productData = {
    name: document.getElementById('product-name').value,
    brand: document.getElementById('product-brand').value,
    category: document.getElementById('product-category').value,
    price: parseFloat(document.getElementById('product-price').value) || 0,
    stock: parseInt(document.getElementById('product-stock').value) || 0,
    description: document.getElementById('product-description').value,
    inStock: document.getElementById('product-in-stock').checked,
    featured: document.getElementById('product-featured').checked,
    updatedAt: serverTimestamp()
  };

  // Validation
  if (!productData.name || !productData.category || productData.price <= 0) {
    showError('Validation Error', 'Please fill in all required fields');
    return;
  }

  showLoader();

  try {
    if (productId) {
      // Update existing product
      await updateDoc(doc(db, 'products', productId), productData);
      showSuccess('Product updated successfully!');
    } else {
      // Add new product
      productData.createdAt = serverTimestamp();
      await addDoc(collection(db, 'products'), productData);
      showSuccess('Product added successfully!');
    }

    // Reload products and re-render
    await loadProducts();
    renderProductsTable();
    hideProductModal();
  } catch (error) {
    console.error('Error saving product:', error);
    showError('Save Error', 'Failed to save product');
  } finally {
    hideLoader();
  }
}

/**
 * Delete product
 */
window.deleteProduct = async function(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  showLoader();

  try {
    await deleteDoc(doc(db, 'products', productId));
    showSuccess('Product deleted successfully!');
    
    // Reload products and re-render
    await loadProducts();
    renderProductsTable();
  } catch (error) {
    console.error('Error deleting product:', error);
    showError('Delete Error', 'Failed to delete product');
  } finally {
    hideLoader();
  }
}

// ============================================
// CATEGORIES SECTION
// ============================================

/**
 * Load categories from Firestore
 */
async function loadCategories() {
  try {
    const snapshot = await getDocs(collection(db, 'categories'));
    
    categoriesCache = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return categoriesCache;
  } catch (error) {
    console.error('Error loading categories:', error);
    throw error;
  }
}

/**
 * Render categories table
 */
function renderCategoriesTable() {
  const tbody = document.getElementById('categories-tbody');
  if (!tbody) return;

  if (categoriesCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No categories found</td></tr>';
    return;
  }

  tbody.innerHTML = categoriesCache.map(category => `
    <tr>
      <td>${category.name || 'Unnamed Category'}</td>
      <td>${category.description || 'No description'}</td>
      <td>${category.productCount || 0}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editCategory('${category.id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * Show add category modal
 */
function showAddCategoryModal() {
  document.getElementById('category-modal-title').textContent = 'Add New Category';
  document.getElementById('category-form').reset();
  document.getElementById('category-id').value = '';
  document.getElementById('category-modal').style.display = 'flex';
}

/**
 * Show edit category modal
 */
window.editCategory = async function(categoryId) {
  const category = categoriesCache.find(c => c.id === categoryId);
  if (!category) return;

  document.getElementById('category-modal-title').textContent = 'Edit Category';
  document.getElementById('category-id').value = categoryId;
  document.getElementById('category-name').value = category.name || '';
  document.getElementById('category-description').value = category.description || '';

  document.getElementById('category-modal').style.display = 'flex';
}

/**
 * Hide category modal
 */
function hideCategoryModal() {
  document.getElementById('category-modal').style.display = 'none';
  document.getElementById('category-form').reset();
}

/**
 * Save category (add or update)
 */
async function saveCategory() {
  const categoryId = document.getElementById('category-id').value;
  
  const categoryData = {
    name: document.getElementById('category-name').value,
    description: document.getElementById('category-description').value,
    updatedAt: serverTimestamp()
  };

  // Validation
  if (!categoryData.name) {
    showError('Validation Error', 'Category name is required');
    return;
  }

  showLoader();

  try {
    if (categoryId) {
      // Update existing category
      await updateDoc(doc(db, 'categories', categoryId), categoryData);
      showSuccess('Category updated successfully!');
    } else {
      // Add new category
      categoryData.createdAt = serverTimestamp();
      categoryData.productCount = 0;
      await addDoc(collection(db, 'categories'), categoryData);
      showSuccess('Category added successfully!');
    }

    // Reload categories and re-render
    await loadCategories();
    renderCategoriesTable();
    hideCategoryModal();
  } catch (error) {
    console.error('Error saving category:', error);
    showError('Save Error', 'Failed to save category');
  } finally {
    hideLoader();
  }
}

/**
 * Delete category
 */
window.deleteCategory = async function(categoryId) {
  if (!confirm('Are you sure you want to delete this category?')) return;

  showLoader();

  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    showSuccess('Category deleted successfully!');
    
    // Reload categories and re-render
    await loadCategories();
    renderCategoriesTable();
  } catch (error) {
    console.error('Error deleting category:', error);
    showError('Delete Error', 'Failed to delete category');
  } finally {
    hideLoader();
  }
}

// ============================================
// USERS SECTION
// ============================================

/**
 * Load users from Firestore
 */
async function loadUsers() {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    
    usersCache = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return usersCache;
  } catch (error) {
    console.error('Error loading users:', error);
    throw error;
  }
}

/**
 * Render users table
 */
function renderUsersTable() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  if (usersCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = usersCache.map(user => `
    <tr>
      <td>${user.email || 'N/A'}</td>
      <td>${user.displayName || user.firstName + ' ' + user.lastName || 'N/A'}</td>
      <td><span class="badge badge-${user.role === 'admin' ? 'primary' : 'secondary'}">${user.role || 'customer'}</span></td>
      <td>${formatDate(user.createdAt)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewUser('${user.id}')">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * View user details
 */
window.viewUser = function(userId) {
  const user = usersCache.find(u => u.id === userId);
  if (!user) return;
  
  alert(`User Details:\n\nEmail: ${user.email}\nName: ${user.displayName || 'N/A'}\nRole: ${user.role || 'customer'}\nJoined: ${formatDate(user.createdAt)}`);
}

// ============================================
// ORDERS SECTION
// ============================================

/**
 * Load orders from Firestore
 */
async function loadOrders() {
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    ordersCache = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return ordersCache;
  } catch (error) {
    console.error('Error loading orders:', error);
    throw error;
  }
}

/**
 * Render orders table
 */
function renderOrdersTable() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  if (ordersCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No orders found</td></tr>';
    return;
  }

  tbody.innerHTML = ordersCache.map(order => `
    <tr>
      <td>#${order.orderNumber || order.id.substring(0, 8)}</td>
      <td>${order.customerName || order.customerEmail || 'N/A'}</td>
      <td>${order.items?.length || 0} items</td>
      <td>$${(order.total || 0).toFixed(2)}</td>
      <td><span class="badge badge-${getStatusColor(order.status)}">${order.status || 'pending'}</span></td>
      <td>${formatDate(order.createdAt)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewOrder('${order.id}')">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * View order details
 */
window.viewOrder = function(orderId) {
  const order = ordersCache.find(o => o.id === orderId);
  if (!order) return;
  
  const itemsList = order.items?.map(item => `- ${item.name} x${item.quantity}: $${item.price}`).join('\n') || 'No items';
  
  alert(`Order Details:\n\nOrder #${order.orderNumber || order.id.substring(0, 8)}\nCustomer: ${order.customerName || order.customerEmail}\nStatus: ${order.status}\nTotal: $${order.total}\n\nItems:\n${itemsList}`);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get status badge color
 */
function getStatusColor(status) {
  const colors = {
    'pending': 'warning',
    'processing': 'info',
    'shipped': 'primary',
    'delivered': 'success',
    'completed': 'success',
    'cancelled': 'danger'
  };
  return colors[status] || 'secondary';
}

/**
 * Format Firestore timestamp to readable date
 */
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  let date;
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp.toDate) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Show loading spinner
 */
function showLoader() {
  let loader = document.getElementById('dashboard-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'dashboard-loader';
    loader.className = 'dashboard-loader';
    loader.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loader);
  }
  loader.style.display = 'flex';
}

/**
 * Hide loading spinner
 */
function hideLoader() {
  const loader = document.getElementById('dashboard-loader');
  if (loader) {
    loader.style.display = 'none';
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  showNotification(message, 'success');
}

/**
 * Show error message
 */
function showError(title, message) {
  showNotification(`${title}: ${message}`, 'error');
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * Logout user
 */
async function logout() {
  if (!confirm('Are you sure you want to logout?')) return;
  
  try {
    await auth.signOut();
    window.location.href = '/login.html';
  } catch (error) {
    console.error('Logout error:', error);
    showError('Logout Error', 'Failed to logout');
  }
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
