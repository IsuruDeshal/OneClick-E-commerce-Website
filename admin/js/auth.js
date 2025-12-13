(function(){
  function start(){
    const Firebase = window.Firebase;
    if(!Firebase || !Firebase.auth || !Firebase.db){
      // Wait until firebase-init has finished
      window.addEventListener('firebase-initialized', start, { once: true });
      return;
    }
    const { auth, db } = Firebase;

    // Show preloader while checking auth
    function showPreloader(){
      const existing = document.getElementById('auth-preloader');
      if(existing) return;
      const loader = document.createElement('div');
      loader.id = 'auth-preloader';
      loader.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: var(--bg, #0b0f14); z-index: 9999; 
        display: flex; align-items: center; justify-content: center;
        color: var(--text, #e5eef7); font-family: system-ui;
      `;
      loader.innerHTML = '<div>Verifying access...</div>';
      document.body.appendChild(loader);
      // Hide main content until verified
      const main = document.querySelector('main, .main, .container');
      if(main) main.style.display = 'none';
    }

    function hidePreloader(){
      const loader = document.getElementById('auth-preloader');
      if(loader) loader.remove();
      // Show main content
      const main = document.querySelector('main, .main, .container');
      if(main) main.style.display = '';
    }

    async function isAdmin(uid){
      try {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists && (doc.data().role === 'admin');
      } catch (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
    }

    function guard(){
      const path = location.pathname;
      const onLogin = /\/admin\/login\.html$/.test(path);
      const onReset = /\/admin\/password-reset\.html$/.test(path);
      
      // Show preloader for non-login pages
      if(!(onLogin || onReset)) {
        showPreloader();
      }

      auth.onAuthStateChanged(async (user)=>{
        try {
          // Not logged in
          if(!user){ 
            hidePreloader();
            if(!(onLogin || onReset)) {
              location.href = '/admin/login.html?reason=signin';
            }
            return; 
          }

          // Check admin role
          const isUserAdmin = await isAdmin(user.uid);
          
          if(!isUserAdmin){
            hidePreloader();
            if(!onLogin) {
              // Non-admin users go to main site
              location.href = '/?error=access-denied';
            }
            return;
          }

          // User is admin - allow access
          hidePreloader();
          
          // If on login/reset page and already admin, go to dashboard
          if(onLogin || onReset) {
            location.href = '/admin/';
            return;
          }

          // Wire logout button
          const logoutBtn = document.getElementById('logout');
          if(logoutBtn && !logoutBtn.hasAttribute('data-wired')){ 
            logoutBtn.setAttribute('data-wired', 'true');
            logoutBtn.addEventListener('click', async ()=> {
              try {
                await auth.signOut();
                location.href = '/admin/login.html?reason=logout';
              } catch (error) {
                console.error('Logout error:', error);
                location.href = '/admin/login.html';
              }
            });
          }
        } catch (error) {
          console.error('Auth guard error:', error);
          hidePreloader();
          location.href = '/admin/login.html?reason=error';
        }
      });
    }

    function wireLogin(){
      const form = document.getElementById('adminLoginForm');
      if(!form) return;
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errEl = document.getElementById('error');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if(submitBtn) submitBtn.textContent = 'Signing in...';
        errEl.textContent = '';
        
        try{
          // Always use session persistence - no "remember me" functionality
          await auth.setPersistence('session');
          const userCred = await auth.signInWithEmailAndPassword(email, password);
          
          // Verify admin role
          const ok = await isAdmin(userCred.user.uid);
          if(!ok){ 
            await auth.signOut(); 
            throw new Error('Access denied: This account does not have admin privileges');
          }
          
          // Success - redirect will happen via onAuthStateChanged
          
        }catch(err){ 
          errEl.textContent = err.message || 'Login failed';
          if(submitBtn) submitBtn.textContent = 'Login';
        }
      });
    }

    function wireReset(){
      const form = document.getElementById('resetForm');
      if(!form) return;
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const msg = document.getElementById('msg');
        try{ await auth.sendPasswordResetEmail(email); msg.textContent = 'If the email exists, a reset link was sent.' }
        catch(err){ msg.textContent = err.message || 'Unable to send reset email'; }
      });
    }

    document.addEventListener('DOMContentLoaded', ()=>{
      guard();
      wireLogin();
      wireReset();
      // Fallback: if a logout button exists before auth state resolves, still bind signOut
      const earlyLogout = document.getElementById('logout');
      if(earlyLogout){ earlyLogout.addEventListener('click', ()=> auth.signOut().then(()=> location.href='/admin/login.html')); }
    });
  }
  // Start immediately; if Firebase isn't ready yet, start() will wait for the event
  start();
})();
