(function(){
  const Firebase = window.Firebase;
  if (!Firebase) return;
  const { auth, db } = Firebase;

  // Simple event bus
  const bus = document.createElement('div');
  function emit(name, detail){ bus.dispatchEvent(new CustomEvent(name, { detail })); }

  // Session helpers
  function setRedirect(url){ sessionStorage.setItem('postLoginRedirect', url || location.pathname + location.search); }
  function consumeRedirect(){ const u = sessionStorage.getItem('postLoginRedirect'); if(u){ sessionStorage.removeItem('postLoginRedirect'); return u; } return null; }
  function isProtectedPath(){ return /account|dashboard|orders|checkout|address|cart/i.test(location.pathname); }

  // Guard utilities
  async function requireAuth(){
    return new Promise((resolve)=>{
      const unsub = auth.onAuthStateChanged(user=>{
        unsub();
        if(user) resolve(user); else {
          setRedirect(location.pathname + location.search);
          location.href = 'login.html';
        }
      });
    });
  }

  // Expose guard for buttons
  window.AuthGuard = {
    async ensure(){ return requireAuth(); },
    isSignedIn(){ return !!auth.currentUser; },
    onChange(cb){ return auth.onAuthStateChanged(cb); }
  };

  // Attach to Add to Cart / Buy buttons (data-auth-required)
  document.addEventListener('click', async (e)=>{
    const btn = e.target.closest('[data-auth-required]');
    if(!btn) return;
    if(!auth.currentUser){
      e.preventDefault();
      setRedirect(location.pathname + location.search);
      location.href = 'login.html';
    }
  });

  // Login form handler
  function initLoginForm(){
    const form = document.getElementById('loginForm');
    if(!form) return;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = form.querySelector('input[type=email]').value.trim();
      const password = form.querySelector('input[type=password]').value;
      const remember = form.querySelector('#remember')?.checked;
      const submit = form.querySelector('button[type=submit]');
      const errEl = document.getElementById('loginError');
      submit.disabled = true; errEl.textContent = '';
      try {
        // Set persistence based on Remember me
        await auth.setPersistence(
          remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION
        );
        await auth.signInWithEmailAndPassword(email, password);
        const dest = consumeRedirect() || 'account.html';
        location.href = dest;
      } catch (err){
        errEl.textContent = err.message || 'Login failed';
      } finally { submit.disabled = false; }
    });
  }

  // Forgot password page handler
  function initForgotForm(){
    const form = document.getElementById('forgotForm');
    if(!form) return;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = form.querySelector('input[type=email]').value.trim();
      const msgEl = document.getElementById('forgotMsg');
      try{
        // Prefer backend email via Brevo (Cloud Function)
        try{
          const res = await fetch('/api/send-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
          if(!res.ok) throw new Error('Backend reset failed');
          msgEl.textContent = 'If an account exists, a reset email has been sent.';
        } catch(_err){
          // Fallback to Firebase default
          await auth.sendPasswordResetEmail(email);
          msgEl.textContent = 'If an account exists, a reset email has been sent.';
        }
      } catch(err){
        msgEl.textContent = err.message || 'Unable to send reset email';
      }
    });
  }

  // Password reset completion page
  function initResetForm(){
    const form = document.getElementById('resetForm');
    if(!form) return;
    const params = new URLSearchParams(location.search);
    const oobCode = params.get('oobCode');
    if(!oobCode){ document.getElementById('resetMsg').textContent = 'Invalid reset link.'; return; }
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const pass = form.querySelector('input[name=newPassword]').value;
      const msgEl = document.getElementById('resetMsg');
      try{
        await auth.confirmPasswordReset(oobCode, pass);
        msgEl.textContent = 'Password reset successful. Redirecting to login...';
        setTimeout(()=> location.href='login.html', 1600);
      }catch(err){
        msgEl.textContent = err.message || 'Reset failed';
      }
    });
  }

  // Account page basics: show user email and load addresses/orders
  async function loadAccount(){
    const accountRoot = document.getElementById('accountRoot');
    if(!accountRoot) return;
    const user = await requireAuth();
    accountRoot.querySelector('[data-user-email]').textContent = user.email;
  }

  // Initialize per page
  document.addEventListener('DOMContentLoaded', ()=>{
    initLoginForm();
    initForgotForm();
    initResetForm();
    if(isProtectedPath()) { requireAuth(); }
    loadAccount();
    // Account icon routing
    const onReady = ()=>{
      const acctLinks = Array.from(document.querySelectorAll('a.icon-btn[title="Account"]'));
      auth.onAuthStateChanged(user=>{
        acctLinks.forEach(a=>{
          a.href = user ? 'account.html' : 'login.html';
        });
      });
    };
    onReady();
  });
})();
