// UI helpers, mock session/auth/cart/address/orders using localStorage
(() => {
  const ls = window.localStorage;

  function on(el, ev, cb, opts){el && el.addEventListener(ev, cb, opts)}
  function qs(sel, ctx=document){return ctx.querySelector(sel)}
  function qsa(sel, ctx=document){return Array.from(ctx.querySelectorAll(sel))}

  // Toasts
  const toastArea = document.createElement('div');
  toastArea.className = 'toast-area';
  document.addEventListener('DOMContentLoaded', ()=> document.body.appendChild(toastArea));
  function toast(msg, type=''){const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = msg; toastArea.appendChild(el); setTimeout(()=> el.remove(), 2800)}

  // Floating labels support for dynamic placeholders
  function initFloatingLabels(root=document){
    qsa('.field input, .field textarea, .field select', root).forEach(inp=>{
      // Ensure placeholder exists so :placeholder-shown works
      if(!inp.getAttribute('placeholder')) inp.setAttribute('placeholder',' ');
    })
  }
  document.addEventListener('DOMContentLoaded', ()=> initFloatingLabels());

  // Validation helpers
  function setError(input, message){
    let wrap = input.closest('.field');
    if(!wrap) return;
    let err = qs('.error', wrap); if(!err){err = document.createElement('div'); err.className='error'; wrap.appendChild(err)}
    err.textContent = message || '';
    input.dataset.invalid = message ? '1' : '';
  }

  function required(input, label){
    if(!input.value.trim()){ setError(input, `${label||'This field'} is required`); return false }
    setError(input,''); return true
  }
  function email(input){
    const v = input.value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    setError(input, ok ? '' : 'Enter a valid email');
    return ok
  }
  function minlen(input, n){ const ok = input.value.trim().length >= n; setError(input, ok? '' : `Must be at least ${n} characters`); return ok }
  function equals(a,b,msg){ const ok = a.value === b.value; setError(b, ok? '' : (msg||'Values do not match')); return ok }

  // Mock Auth API
  const mock = {
    get users(){ try{ return JSON.parse(ls.getItem('users')||'[]') }catch{ return [] } },
    set users(v){ ls.setItem('users', JSON.stringify(v)) },
    // Session persistence: prefer sessionStorage when ephemeral
    get session(){
      try{
        const s = sessionStorage.getItem('session');
        if(s) return JSON.parse(s);
        return JSON.parse(ls.getItem('session')||'null')
      }catch{ return null }
    },
    set session(v){
      // default to persistent localStorage unless ephemeral flag set temporary
      const ephem = JSON.parse(sessionStorage.getItem('ephemeral')||'false');
      if(v){
        if(ephem){ sessionStorage.setItem('session', JSON.stringify(v)); ls.removeItem('session') }
        else { ls.setItem('session', JSON.stringify(v)); sessionStorage.removeItem('session') }
      } else { ls.removeItem('session'); sessionStorage.removeItem('session') }
    },
    get addresses(){ try{ return JSON.parse(ls.getItem('addresses')||'{}') }catch{ return {} } }, // by uid
    set addresses(v){ ls.setItem('addresses', JSON.stringify(v)) },
    get carts(){ try{ return JSON.parse(ls.getItem('carts')||'{}') }catch{ return {} } },
    set carts(v){ ls.setItem('carts', JSON.stringify(v)) },
    get orders(){ try{ return JSON.parse(ls.getItem('orders')||'{}') }catch{ return {} } },
    set orders(v){ ls.setItem('orders', JSON.stringify(v)) },
  };

  function uid(){ return 'u_' + Math.random().toString(36).slice(2,10) }
  function oid(){ return 'ord_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6) }

  const Auth = {
    isSignedIn(){ return !!mock.session },
    user(){ return mock.session },
    login(email, password, {remember=true}={}){
      const u = mock.users.find(x=> x.email.toLowerCase()===email.toLowerCase());
      if(!u || u.password !== password) throw new Error('Invalid email or password');
      sessionStorage.setItem('ephemeral', JSON.stringify(!remember));
      mock.session = { uid: u.uid, email: u.email, name: u.firstName + ' ' + u.lastName };
      ls.setItem('token','mock-'+u.uid); // mock token for gating
      return mock.session
    },
    register(payload){
      if(mock.users.some(x=> x.email.toLowerCase()===payload.email.toLowerCase())){
        throw new Error('Email already registered');
      }
      const u = { uid: uid(), ...payload };
      mock.users = [...mock.users, u];
      sessionStorage.setItem('ephemeral', 'false');
      mock.session = { uid: u.uid, email: u.email, name: u.firstName+' '+u.lastName };
      ls.setItem('token','mock-'+u.uid);
      return u
    },
    logout(){ mock.session = null; ls.removeItem('token') }
  };

  // Cart API (per-user)
  function getCart(){ const uid = mock.session?.uid; if(!uid) return []; const carts = mock.carts; return carts[uid]||[] }
  function setCart(items){ const uid = mock.session?.uid; if(!uid) return; const carts = mock.carts; carts[uid]=items; mock.carts=carts }
  function addToCart(item){ const cart = getCart(); const idx = cart.findIndex(i=> i.id===item.id); if(idx>=0){ cart[idx].qty += item.qty||1 } else { cart.push({...item, qty:item.qty||1}) } setCart(cart); toast('Added to cart','success') }

  // Address API (per-user, supports defaults)
  function getAddresses(){ const uid = mock.session?.uid; if(!uid) return []; const a = mock.addresses; return a[uid]||[] }
  function saveAddress(addr){ const uid = mock.session?.uid; if(!uid) return []; const all = mock.addresses; const list = all[uid]||[]; if(addr.id){ const i=list.findIndex(x=>x.id===addr.id); if(i>=0) list[i]=addr } else { addr.id = 'addr_'+Math.random().toString(36).slice(2,9); list.push(addr) } if(addr.defaultBilling){ list.forEach(x=>{ if(x.id!==addr.id) x.defaultBilling=false }) } if(addr.defaultShipping){ list.forEach(x=>{ if(x.id!==addr.id) x.defaultShipping=false }) } all[uid]=list; mock.addresses=all; return addr }

  // Orders
  function placeOrder({items, address, payment}){ if(!Auth.isSignedIn()) throw new Error('Login required'); const uid = mock.session.uid; const all = mock.orders; const list = all[uid]||[]; const id = oid(); const total = items.reduce((sum,i)=> sum + (i.price||0)*(i.qty||1), 0); const order = { id, items, address, payment, total, createdAt: new Date().toISOString(), status:'PLACED' }; all[uid]=[order, ...list]; mock.orders=all; // clear cart
    ls.setItem('lastOrder', JSON.stringify({uid, order}));
    setCart([]); return order }

  // Access gating helpers
  function requireAuth(redirect='login.html'){ if(!Auth.isSignedIn()){ ls.setItem('redirectAfterLogin', location.pathname); location.href = redirect; return false } return true }

  // Expose API for pages
  window.UI = { toast, initFloatingLabels, setError, required, email, minlen, equals };
  window.Mock = { Auth, addToCart, getCart, setCart, getAddresses, saveAddress, placeOrder, requireAuth };
})();
