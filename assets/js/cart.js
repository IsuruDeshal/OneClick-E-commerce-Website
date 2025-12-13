(function(){
  // Use Supabase instead of Firebase
  async function getSupabase() {
    if (window.supabase) return window.supabase;
    if (window.ensureSupabase) return await window.ensureSupabase();
    throw new Error('Supabase not available');
  }

  async function getUser() {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user;
  }

  async function addToCart(item){
    const user = await getUser();
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('user_carts')
      .select('items')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found

    let items = data ? data.items : [];

    const idx = items.findIndex(i => i.product_id === item.product_id);
    if (idx >= 0) {
      items[idx].quantity += item.quantity || 1;
    } else {
      items.push({ ...item, quantity: item.quantity || 1 });
    }

    const { error: upsertError } = await supabase
      .from('user_carts')
      .upsert({ user_id: user.id, items }, { onConflict: 'user_id' });

    if (upsertError) throw upsertError;
  }

  // Bind Add to Cart buttons
  document.addEventListener('click', async (e)=>{
    const btn = e.target.closest('[data-add-to-cart], .cart-btn, .add-to-cart');
    if(!btn) return;
    e.preventDefault();
    try {
      const user = await getUser();
    } catch (err) {
      // Not authenticated, redirect to login
      sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
      location.href = 'login.html';
      return;
    }
    const productId = btn.getAttribute('data-id') || btn.closest('.p-card')?.getAttribute('data-product-id');
    const name = btn.closest('.p-card')?.querySelector('h3')?.textContent?.trim() || 'Unknown Product';
    const priceText = btn.closest('.p-card')?.querySelector('.price')?.textContent || '';
    const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
    if (!productId) return;
    btn.disabled = true;
    btn.textContent = 'Adding...';
    try{
      await addToCart({ product_id: productId, name, price });
      btn.textContent = 'Added ✓';
      setTimeout(()=> btn.textContent='Add to Cart', 1200);
    }catch(err){
      console.error(err);
      btn.textContent = 'Failed';
      setTimeout(()=> btn.textContent='Add to Cart', 1200);
    } finally { btn.disabled = false; }
  });

  // Bind Buy Now buttons
  document.addEventListener('click', async (e)=>{
    const btn = e.target.closest('[data-buy-now], .buy-now');
    if(!btn) return;
    e.preventDefault();
    try {
      const user = await getUser();
    } catch (err) {
      sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
      location.href = 'login.html';
      return;
    }
    // Similar to add to cart, then redirect to cart
    const productId = btn.getAttribute('data-id') || btn.closest('.p-card')?.getAttribute('data-product-id');
    if (productId) {
      await addToCart({ product_id: productId, quantity: 1 });
      location.href = 'cart.html';
    }
  });

})();
