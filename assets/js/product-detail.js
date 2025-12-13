/**
 * Dynamic Product Detail Page
 * Loads product data from backend API and renders it dynamically
 */

// Configuration
// Use auto-detected API config or fallback to Supabase
const getApiBase = () => {
  if (window.API_CONFIG && window.API_CONFIG.apiUrl) {
    return window.API_CONFIG.apiUrl;
  }
  return 'https://pvnlavcuswjxhywbsodm.supabase.co/rest/v1';
};

const API_BASE_URL = getApiBase() + '/api'; // Change to your backend URL
const USE_BACKEND = false; // Set to true when backend is running
const USE_FIREBASE = true; // Set to false to use backend API instead

// Get product ID from URL
function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || params.get('productId');
}

// Load product from Firebase
async function loadProductFromFirebase(productId) {
  if (!window.Firebase) {
    throw new Error('Firebase not initialized');
  }
  
  const { db } = window.Firebase;
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  
  const docRef = doc(db, 'products', productId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Product not found');
  }
  
  return { id: docSnap.id, ...docSnap.data() };
}

// Load product from Backend API
async function loadProductFromAPI(productId) {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`);
  
  if (!response.ok) {
    throw new Error('Product not found');
  }
  
  const data = await response.json();
  return data;
}

// Main function to load product
async function loadProduct() {
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const productContent = document.getElementById('productContent');
  const errorMessage = document.getElementById('errorMessage');
  
  const productId = getProductId();
  
  if (!productId) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    errorMessage.textContent = 'No product ID specified. Please select a product from our catalog.';
    return;
  }
  
  try {
    let product;
    
    // Choose data source
    if (USE_FIREBASE) {
      product = await loadProductFromFirebase(productId);
    } else if (USE_BACKEND) {
      product = await loadProductFromAPI(productId);
    } else {
      // Fallback: Load sample data for demo
      product = getSampleProduct(productId);
    }
    
    // Render product
    renderProduct(product);
    
    // Hide loading, show content
    loadingState.style.display = 'none';
    productContent.style.display = 'block';
    
  } catch (error) {
    console.error('Error loading product:', error);
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    errorMessage.textContent = error.message || 'Failed to load product. Please try again.';
  }
}

// Render product data to page
function renderProduct(product) {
  // Update page title and meta
  const pageTitle = `${product.name || product.title} | One Computers`;
  document.getElementById('pageTitle').textContent = pageTitle;
  document.title = pageTitle;
  
  if (product.seoSummary || product.description) {
    document.getElementById('pageDescription').setAttribute('content', 
      product.seoSummary || product.description?.substring(0, 160) || '');
  }
  
  // Breadcrumb
  if (product.category) {
    const categoryLink = document.getElementById('categoryLink');
    categoryLink.textContent = product.category;
    categoryLink.href = `${product.category.toLowerCase()}.html`;
  }
  document.getElementById('productBreadcrumb').textContent = product.name || product.title;
  
  // Brand
  if (product.brand) {
    document.getElementById('productBrand').textContent = product.brand;
    document.getElementById('productBrand').style.display = 'block';
  }
  
  // Title
  document.getElementById('productTitle').textContent = product.name || product.title || 'Product';
  
  // Price
  const currency = product.currency || 'LKR';
  const price = parseFloat(product.price) || 0;
  document.getElementById('productPrice').textContent = 
    `${currency} ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  
  // Stock/Availability
  const stockBadge = document.getElementById('stockBadge');
  const availability = product.availability || (product.stock > 0 ? 'in_stock' : 'out_of_stock');
  
  if (availability === 'in_stock' || product.stock > 0) {
    stockBadge.textContent = '✓ In Stock';
    stockBadge.className = 'stock-badge in-stock';
  } else {
    stockBadge.textContent = '✗ Out of Stock';
    stockBadge.className = 'stock-badge out-of-stock';
  }
  
  // Images
  const images = Array.isArray(product.images) && product.images.length 
    ? product.images 
    : [product.image].filter(Boolean);
  
  if (images.length === 0) {
    images.push('assets/img/placeholder.png');
  }
  
  const mainImage = document.getElementById('mainImage');
  mainImage.src = images[0];
  mainImage.alt = product.name || 'Product Image';
  
  // Thumbnails
  const thumbnailGrid = document.getElementById('thumbnailGrid');
  thumbnailGrid.innerHTML = '';
  
  images.forEach((imgSrc, index) => {
    const thumb = document.createElement('img');
    thumb.src = imgSrc;
    thumb.alt = `Image ${index + 1}`;
    thumb.className = 'thumbnail' + (index === 0 ? ' active' : '');
    thumb.addEventListener('click', () => {
      mainImage.src = imgSrc;
      document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
    thumbnailGrid.appendChild(thumb);
  });
  
  // Highlights/Features
  if (product.highlights && Array.isArray(product.highlights) && product.highlights.length > 0) {
    const highlightsList = document.getElementById('highlightsList');
    highlightsList.innerHTML = '';
    product.highlights.forEach(highlight => {
      const li = document.createElement('li');
      li.textContent = highlight;
      highlightsList.appendChild(li);
    });
    document.getElementById('highlightsSection').style.display = 'block';
  }
  
  // Specifications
  if (product.specs) {
    const specsGrid = document.getElementById('specsGrid');
    specsGrid.innerHTML = '';
    
    let specsArray = [];
    if (Array.isArray(product.specs)) {
      specsArray = product.specs;
    } else if (typeof product.specs === 'object') {
      specsArray = Object.entries(product.specs).map(([key, value]) => ({ label: key, value }));
    }
    
    specsArray.forEach(spec => {
      const specItem = document.createElement('div');
      specItem.className = 'spec-item';
      specItem.innerHTML = `
        <span class="spec-label">${spec.label || spec.key || 'Spec'}</span>
        <span class="spec-value">${spec.value || spec}</span>
      `;
      specsGrid.appendChild(specItem);
    });
    
    if (specsArray.length > 0) {
      document.getElementById('specsSection').style.display = 'block';
    }
  }
  
  // Description (prioritize AI-generated description)
  const description = product.generatedDescription || product.description;
  if (description) {
    const descSection = document.getElementById('descriptionSection');
    descSection.innerHTML = description;
    descSection.style.display = 'block';
  }
  
  // Action buttons
  setupActionButtons(product);
}

// Setup action buttons (Buy Now, Add to Cart, Wishlist)
function setupActionButtons(product) {
  const btnBuyNow = document.getElementById('btnBuyNow');
  const btnAddToCart = document.getElementById('btnAddToCart');
  const btnWishlist = document.getElementById('btnWishlist');
  
  // Buy Now - Add to cart and redirect to checkout
  btnBuyNow.addEventListener('click', async () => {
    await addProductToCart(product);
    window.location.href = 'checkout.html';
  });
  
  // Add to Cart
  btnAddToCart.addEventListener('click', async () => {
    const success = await addProductToCart(product);
    if (success) {
      btnAddToCart.textContent = '✓ Added to Cart';
      setTimeout(() => {
        btnAddToCart.textContent = 'Add to Cart';
      }, 2000);
      updateCartBadge();
    }
  });
  
  // Wishlist
  btnWishlist.addEventListener('click', async () => {
    const isInWishlist = await toggleWishlist(product);
    btnWishlist.textContent = isInWishlist ? '❤️ In Wishlist' : '❤️ Wishlist';
  });
}

// Add product to cart
async function addProductToCart(product) {
  try {
    const cartItem = {
      id: product.id || product._id,
      name: product.name || product.title,
      price: parseFloat(product.price),
      image: (Array.isArray(product.images) ? product.images[0] : product.image) || 'assets/img/placeholder.png',
      quantity: 1
    };
    
    // Get existing cart from localStorage
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.id === cartItem.id);
    
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push(cartItem);
    }
    
    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // If Firebase cart is available, sync it
    if (window.Firebase && window.Firebase.auth.currentUser) {
      await syncCartToFirebase(cart);
    }
    
    return true;
  } catch (error) {
    console.error('Error adding to cart:', error);
    alert('Failed to add to cart. Please try again.');
    return false;
  }
}

// Sync cart to Firebase
async function syncCartToFirebase(cart) {
  try {
    const { db, auth } = window.Firebase;
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    
    const user = auth.currentUser;
    if (!user) return;
    
    const cartRef = doc(db, 'carts', user.uid);
    await setDoc(cartRef, { items: cart, updatedAt: new Date() });
  } catch (error) {
    console.error('Error syncing cart to Firebase:', error);
  }
}

// Toggle wishlist
async function toggleWishlist(product) {
  try {
    const wishlistItem = {
      id: product.id || product._id,
      name: product.name || product.title,
      price: parseFloat(product.price),
      image: (Array.isArray(product.images) ? product.images[0] : product.image) || 'assets/img/placeholder.png'
    };
    
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    const index = wishlist.findIndex(item => item.id === wishlistItem.id);
    
    if (index > -1) {
      wishlist.splice(index, 1);
      return false;
    } else {
      wishlist.push(wishlistItem);
      return true;
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    return false;
  }
}

// Update cart badge count
function updateCartBadge() {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    const badges = document.querySelectorAll('#cartBadge, #cartBadgeDesktop');
    badges.forEach(badge => {
      badge.textContent = totalItems;
    });
  } catch (error) {
    console.error('Error updating cart badge:', error);
  }
}

// Sample product data for demo (when backend is not available)
function getSampleProduct(id) {
  return {
    id: id,
    name: 'Sample Gaming Laptop',
    brand: 'ASUS',
    category: 'Laptops',
    price: 245000,
    currency: 'LKR',
    availability: 'in_stock',
    stock: 5,
    images: [
      'assets/img/one-logo.png',
      'assets/img/one-logo.png'
    ],
    highlights: [
      'Intel Core i7-12700H Processor',
      'NVIDIA GeForce RTX 3060 Graphics',
      '16GB DDR5 RAM',
      '512GB NVMe SSD',
      '15.6" FHD 144Hz Display',
      'RGB Backlit Keyboard'
    ],
    specs: {
      'Processor': 'Intel Core i7-12700H',
      'Graphics': 'NVIDIA RTX 3060 6GB',
      'RAM': '16GB DDR5',
      'Storage': '512GB NVMe SSD',
      'Display': '15.6" FHD 144Hz',
      'OS': 'Windows 11',
      'Weight': '2.3 kg',
      'Warranty': '2 Years'
    },
    generatedDescription: `
      <h2>About this Gaming Laptop</h2>
      <p>Experience ultimate gaming performance with this powerful gaming laptop. Featuring the latest Intel Core i7 processor and NVIDIA RTX 3060 graphics, you'll enjoy smooth gameplay at high settings.</p>
      
      <h3>Performance</h3>
      <p>The Intel Core i7-12700H processor delivers exceptional performance for gaming, content creation, and multitasking. Paired with 16GB of fast DDR5 RAM, you can run multiple applications simultaneously without slowdown.</p>
      
      <h3>Graphics</h3>
      <p>The NVIDIA GeForce RTX 3060 graphics card with 6GB GDDR6 VRAM provides stunning visuals and ray tracing capabilities. Play the latest AAA games at high settings with smooth framerates.</p>
      
      <h3>Display</h3>
      <p>The 15.6-inch Full HD display with 144Hz refresh rate ensures buttery-smooth gameplay and vibrant colors. Perfect for competitive gaming and content consumption.</p>
    `,
    seoSummary: 'High-performance gaming laptop with Intel Core i7, RTX 3060, 16GB RAM, and 144Hz display. Perfect for gaming and content creation.'
  };
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadProduct();
    updateCartBadge();
  });
} else {
  loadProduct();
  updateCartBadge();
}

// Update year in footer
document.getElementById('yearCopy').textContent = new Date().getFullYear();
