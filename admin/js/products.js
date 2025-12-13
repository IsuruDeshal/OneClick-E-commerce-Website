(function(){
  const { qs, getParams, toast } = window.AdminUtils || {};
  const { listProducts, saveProduct, getProduct, deleteProduct } = window.AdminAPI;

  function normalizeBool(v){ return v===true || v==='true' || v==='1' || v===1; }

  function renderTable(items){
    const t = document.getElementById('prodTable');
    if(!t) return;

    const tbody = t.querySelector('tbody');
    if (!tbody) {
      t.innerHTML = `
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Category</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
    }

    const tableBody = t.querySelector('tbody');

    if (items.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: #a9b0bf;">
            No products found. <a href="add-product.html" style="color: #e44d61;">Add your first product</a>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = items.map(p=> {
      const stockClass = p.stock > 10 ? 'success' : p.stock > 0 ? 'warning' : 'danger';
      const cond = (p.condition||'Brand New');
      const vis = p.visibility_homepage ? '★' : '';
      return `<tr>
        <td>#${p.id}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${p.image_url ? `<img src="${p.image_url}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #272a36">` : '<div style="width:48px;height:48px;background:#272a36;border-radius:6px"></div>'}
            <span>${p.name || p.title}</span>
            <span class="badge ${cond==='Brand New'?'success':'warning'}" title="Condition">${cond}</span>
            ${p.visibility_homepage?'<span class="badge info" title="Featured on homepage">Featured</span>':''}
          </div>
        </td>
        <td>LKR ${parseFloat(p.price || 0).toLocaleString()}</td>
        <td><span class="badge ${stockClass}">${p.stock || 0} units</span></td>
        <td>${p.category || 'N/A'}</td>
        <td>
          <button class="btn btn-sm" data-edit="${p.id}" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm" data-del="${p.id}" title="Delete" style="background: rgba(239,68,68,0.1); color: #ef4444;">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    // Update product count
    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = items.length;

    // Add event listeners
    tableBody.addEventListener('click', async (e)=>{
      const delId = e.target.closest('[data-del]')?.dataset?.del;
      const editId = e.target.closest('[data-edit]')?.dataset?.edit;

      if (delId) {
        if(!confirm('Delete this product? This action cannot be undone.')) return;
        try {
          await deleteProduct(delId);
          if (toast) toast('Product deleted successfully');
          location.reload();
        } catch (error) {
          alert('Error deleting product: ' + error.message);
        }
      }

      if (editId) {
        window.location.href = `edit-product.html?id=${editId}`;
      }
    });
  }

  async function initList(){
    try {
      const items = await listProducts();
      renderTable(items);

      const search = document.getElementById('search');
      if(search){
        search.addEventListener('input', ()=>{
          const q = search.value.toLowerCase();
          const filtered = items.filter(p=>
            String(p.name||'').toLowerCase().includes(q) ||
            String(p.category||'').toLowerCase().includes(q) ||
            String(p.id||'').toLowerCase().includes(q)
          );
          renderTable(filtered);
        });
      }
    } catch (error) {
      console.error('Error loading products:', error);
      const tbody = document.querySelector('#prodTable tbody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 2rem; color: #ef4444;">
              Error loading products: ${error.message}
            </td>
          </tr>
        `;
      }
    }
  }

  function parseImages(s){ return s.split(',').map(x=>x.trim()).filter(Boolean); }
  function parseVariations(s){ try{ const v = JSON.parse(s); return Array.isArray(v)?v:[] }catch{ return [] } }

  async function uploadSelectedFiles(){
    const input = document.getElementById('imageFiles');
    const files = Array.from(input?.files || []);
    if(!files.length) return [];
    const { storage } = window.Firebase || {};
    if(!storage){
      console.warn('Storage not initialized, skipping file upload');
      return [];
    }
    // Use a folder per day to keep paths tidy
    const folder = new Date().toISOString().slice(0,10);
    const uploads = files.map(async (file)=>{
      const path = `products/${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
      const ref = storage.ref().child(path);
      await ref.put(file);
      return await ref.getDownloadURL();
    });
    return Promise.all(uploads);
  }

  async function initAdd(){
    const form = document.getElementById('productForm');
    if(!form) return;

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const uploaded = await uploadSelectedFiles();

      const prod = {
        name: data.title,
        title: data.title,
        description: data.description,
        category: data.category,
        stock: Number(data.stock||0),
        price: Number(data.price||0),
        offer_price: data.offerPrice? Number(data.offerPrice) : null,
        sku: data.sku || `SKU-${Date.now()}`,
        image_url: (data.image_url || '').trim() || uploaded[0] || '',
        condition: data.condition || 'Brand New',
        type: data.type || '',
        visibility_homepage: normalizeBool(data.visibility_homepage),
        status: data.status || 'active',
        createdAt: new Date().toISOString()
      };

      try {
        const id = await saveProduct(null, prod);
          if (toast) toast('Product created successfully!');
          location.href = 'index.html#products';
      } catch (error) {
        alert('Error creating product: ' + error.message);
      }
    });
  }

  async function initEdit(){
    const form = document.getElementById('productForm');
    if(!form) return;
    const { id } = getParams ? getParams() : {};
    if(!id){ form.innerHTML = '<div class="note">Missing product ID</div>'; return; }

    try {
      const p = await getProduct(id);
      if(!p){ form.innerHTML = '<div class="note">Product not found</div>'; return; }

      form.innerHTML = `
        <div>
          <label class="label">Title</label>
          <input class="input" name="title" value="${p.name||''}"/>
          <label class="label">Description</label>
          <textarea class="input" name="description" rows="6">${p.description||''}</textarea>
          <label class="label">Category</label>
          <input class="input" name="category" value="${p.category||''}"/>
          <label class="label">Stock</label>
          <input class="input" name="stock" type="number" value="${p.stock||0}"/>
          <label class="label">Condition</label>
          <select class="input" name="condition">
            <option ${ (p.condition||'Brand New')==='Brand New'?'selected':''}>Brand New</option>
            <option ${ p.condition==='Used'?'selected':''}>Used</option>
            <option ${ p.condition==='Refurbished'?'selected':''}>Refurbished</option>
          </select>
          <label class="label">Product Type</label>
          <input class="input" name="type" value="${p.type||''}"/>
          <div style="margin:.6rem 0">
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer">
              <input type="checkbox" name="visibility_homepage" ${p.visibility_homepage? 'checked':''}/> Featured on homepage
            </label>
          </div>
          <label class="label">Status</label>
          <select class="input" name="status">
            <option ${ (p.status||'active')==='active'?'selected':''}>active</option>
            <option ${ p.status==='inactive'?'selected':''}>inactive</option>
            <option ${ p.status==='out_of_stock'?'selected':''}>out_of_stock</option>
          </select>
        </div>
        <div>
          <label class="label">Price</label>
          <input class="input" name="price" type="number" step="0.01" value="${p.price||0}"/>
          <label class="label">Image URL</label>
          <input class="input" name="image_url" value="${p.image_url||''}"/>
          <label class="label">SKU</label>
          <input class="input" name="sku" value="${p.sku||''}"/>
          <div class="row" style="margin-top:10px">
            <button class="btn primary" type="submit">Save Changes</button>
              <a class="btn" href="index.html#products">Cancel</a>
          </div>
        </div>`;

      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const prod = {
          name: data.title,
          title: data.title,
          description: data.description,
          category: data.category,
          stock: Number(data.stock||0),
          price: Number(data.price||0),
          sku: data.sku,
          image_url: data.image_url,
          condition: data.condition || 'Brand New',
          type: data.type || '',
          visibility_homepage: normalizeBool(data.visibility_homepage),
          status: data.status || 'active',
          updatedAt: new Date().toISOString()
        };

        try {
          await saveProduct(id, prod);
          if (toast) toast('Product updated successfully!');
            location.href = 'index.html#products';
        } catch (error) {
          alert('Error updating product: ' + error.message);
        }
      });
    } catch (error) {
      form.innerHTML = `<div class="note" style="color:#ef4444">Error loading product: ${error.message}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{ initList(); initAdd(); initEdit(); });
})();
