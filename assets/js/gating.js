// Global auth gating for Add to Cart / Buy Now buttons
// Usage: add data-add-to-cart='{ "id":"sku1","name":"Product","price":199.99 }'
// or data-buy-now='{"id":"sku1",...}' on buttons/links
document.addEventListener('click', (e)=>{
  const target = e.target.closest('[data-add-to-cart],[data-buy-now],[data-auth-required],.cart-btn,.buy-now');
  if(!target) return;
  // Gate generic auth-required actions
  if(target.hasAttribute('data-auth-required')){
    if(!Mock.Auth.isSignedIn()){ e.preventDefault(); UI.toast('Please log in first','error'); localStorage.setItem('redirectAfterLogin', location.pathname); location.href='login.html'; return }
  }
  // Add to cart
  if(target.hasAttribute('data-add-to-cart') || target.classList.contains('cart-btn')){
    e.preventDefault();
    let payload = target.hasAttribute('data-add-to-cart') ? safeParse(target.getAttribute('data-add-to-cart')) : null;
    if(!payload){ payload = deriveFromCard(target) }
    if(!Mock.Auth.isSignedIn()){ UI.toast('Please log in to add items','error'); localStorage.setItem('redirectAfterLogin', location.pathname); location.href='login.html'; return }
    if(!payload.id){ UI.toast('Missing item data','error'); return }
    Mock.addToCart(payload);
  }
  // Buy now
  if(target.hasAttribute('data-buy-now') || target.classList.contains('buy-now')){
    e.preventDefault();
    let payload = target.hasAttribute('data-buy-now') ? safeParse(target.getAttribute('data-buy-now')) : null;
    if(!payload){ payload = deriveFromCard(target) }
    if(!Mock.Auth.isSignedIn()){ UI.toast('Please log in to continue','error'); localStorage.setItem('redirectAfterLogin', location.pathname); location.href='login.html'; return }
    if(!payload.id){ UI.toast('Missing item data','error'); return }
    Mock.addToCart(payload);
    location.href = 'checkout.html';
  }
});

function safeParse(s){ try{ return JSON.parse(s) }catch{ return null } }

function deriveFromCard(target){
  // Walk up to a product card to infer item data
  const card = target.closest('.p-card, article, .product-card');
  const title = card?.querySelector('.title')?.textContent?.trim() || card?.querySelector('h3,h4')?.textContent?.trim() || 'Item';
  // try reading price from .price .now or any price-looking text
  let priceText = card?.querySelector('.price .now')?.textContent || card?.querySelector('.price')?.textContent || '';
  const n = parseFloat((priceText||'').replace(/[^0-9.]/g,''));
  const price = isNaN(n) ? 0 : n;
  const id = (title||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  return { id, name: title, price, qty: 1 };
}
