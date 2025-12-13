/**
 * ========================================
 * USER DASHBOARD CONTROLLER
 * ========================================
 * Manages user account dashboard functionality
 */

(async function() {
  'use strict';

  // Ensure Firebase is ready
  await window.ensureFirebase();

  const { auth, db } = window.Firebase;

  // Check authentication
  const user = await new Promise((resolve) => {
    auth.onAuthStateChanged(resolve);
  });

  if (!user) {
    sessionStorage.setItem('postLoginRedirect', 'account.html');
    window.location.href = 'login.html';
    return;
  }

  // DOM Elements
  const helloElement = document.getElementById('hello');
  const logoutBtn = document.getElementById('logout');
  const ordersContainer = document.getElementById('recent-orders');
  const addressesContainer = document.getElementById('saved-addresses');

  /**
   * Load user profile
   */
  const loadUserProfile = async () => {
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const role = userData.role || 'user';
        const displayName = userData.displayName || user.email;

        if (helloElement) {
          helloElement.innerHTML = `
            <h2>Welcome back, ${displayName}!</h2>
            <p class="muted">Account: ${user.email} ${role === 'admin' ? '• <span style="color: #00d4ff;">Admin</span>' : ''}</p>
          `;
        }

        // Show admin link if user is admin
        if (role === 'admin') {
          const adminLink = document.createElement('a');
          adminLink.href = 'dashboard.html';
          adminLink.className = 'btn btn-primary';
          adminLink.innerHTML = '<i class="fas fa-cog"></i> Admin Dashboard';
          adminLink.style.marginTop = '1rem';
          helloElement.appendChild(adminLink);
        }
      } else {
        // Create user document if it doesn't exist
        await db.collection('users').doc(user.uid).set({
          email: user.email,
          displayName: user.displayName || user.email,
          role: 'user',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });

        if (helloElement) {
          helloElement.innerHTML = `
            <h2>Welcome, ${user.email}!</h2>
            <p class="muted">Your account has been set up.</p>
          `;
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      if (helloElement) {
        helloElement.innerHTML = `
          <h2>Hello!</h2>
          <p class="muted">Signed in as ${user.email}</p>
        `;
      }
    }
  };

  /**
   * Load recent orders
   */
  const loadRecentOrders = async () => {
    if (!ordersContainer) return;

    try {
      ordersContainer.innerHTML = '<p class="muted"><i class="fas fa-spinner fa-spin"></i> Loading orders...</p>';

      const ordersSnapshot = await db.collection('orders')
        .where('userId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      if (ordersSnapshot.empty) {
        ordersContainer.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: #999;">
            <i class="fas fa-shopping-bag" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
            <p>No orders yet</p>
            <a href="index.html" class="btn small" style="margin-top: 1rem;">Start Shopping</a>
          </div>
        `;
        return;
      }

      const ordersHTML = ordersSnapshot.docs.map(doc => {
        const order = doc.data();
        const date = new Date(order.createdAt).toLocaleDateString();
        const total = order.total || 0;
        const status = order.status || 'pending';
        
        const statusClass = status === 'delivered' ? 'success' : 
                           status === 'cancelled' ? 'error' : 'warning';

        return `
          <div class="order-card" style="border: 1px solid #333; padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Order #${doc.id.substring(0, 8).toUpperCase()}</strong>
                <p class="muted" style="font-size: 0.9rem; margin: 0.5rem 0;">
                  ${date} • ${order.items?.length || 0} items
                </p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.1rem; font-weight: bold; color: #00d4ff;">
                  Rs ${total.toLocaleString()}
                </div>
                <span class="badge ${statusClass}" style="margin-top: 0.5rem; display: inline-block;">
                  ${status}
                </span>
              </div>
            </div>
            <div style="margin-top: 1rem;">
              <a href="order-details.html?id=${doc.id}" class="btn small">View Details</a>
            </div>
          </div>
        `;
      }).join('');

      ordersContainer.innerHTML = ordersHTML;
    } catch (error) {
      console.error('Error loading orders:', error);
      ordersContainer.innerHTML = `
        <p class="muted" style="color: #ff4444;">Failed to load orders</p>
      `;
    }
  };

  /**
   * Load saved addresses
   */
  const loadAddresses = async () => {
    if (!addressesContainer) return;

    try {
      addressesContainer.innerHTML = '<p class="muted"><i class="fas fa-spinner fa-spin"></i> Loading addresses...</p>';

      const userDoc = await db.collection('users').doc(user.uid).get();
      const addresses = userDoc.data()?.addresses || [];

      if (addresses.length === 0) {
        addressesContainer.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: #999;">
            <i class="fas fa-map-marker-alt" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
            <p>No saved addresses</p>
            <a href="addresses.html" class="btn small" style="margin-top: 1rem;">Add Address</a>
          </div>
        `;
        return;
      }

      const addressesHTML = addresses.slice(0, 3).map((addr, idx) => `
        <div class="address-card" style="border: 1px solid #333; padding: 1rem; border-radius: 8px;">
          ${addr.isDefault ? '<span class="badge success">Default</span>' : ''}
          <p style="margin: 0.5rem 0;"><strong>${addr.name || 'Address'}</strong></p>
          <p class="muted" style="font-size: 0.9rem; margin: 0;">
            ${addr.street}<br>
            ${addr.city}, ${addr.postalCode}<br>
            ${addr.phone || ''}
          </p>
        </div>
      `).join('');

      addressesContainer.innerHTML = addressesHTML;
    } catch (error) {
      console.error('Error loading addresses:', error);
      addressesContainer.innerHTML = `
        <p class="muted" style="color: #ff4444;">Failed to load addresses</p>
      `;
    }
  };

  /**
   * Handle logout
   */
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Logging out...';
        
        await auth.signOut();
        
        // Clear any cached data
        sessionStorage.clear();
        
        // Redirect to home
        window.location.href = 'index.html';
      } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
        logoutBtn.disabled = false;
        logoutBtn.textContent = 'Logout';
      }
    });
  }

  // Initialize
  await loadUserProfile();
  await Promise.all([
    loadRecentOrders(),
    loadAddresses()
  ]);

})();
