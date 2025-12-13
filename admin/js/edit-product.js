(function(){
  'use strict';
  const form = document.getElementById('editProductForm');
  if(!form) return;

  const statusBox = document.getElementById('editStatus');
  function setStatus(html, cls){ statusBox.innerHTML = `<div class="alert ${cls||''}" style="padding:.9rem 1rem;border:1px solid #272a36;border-radius:8px;background:#151821">${html}</div>`; }

  function getQuery(){ const p = new URLSearchParams(location.search); return Object.fromEntries(p.entries()); }
  const { id } = getQuery();
  if(!id){ setStatus('Missing product id in query (?id=...)','error'); return; }

  const api = window.AdminAPI;
  async function loadCategories(){
    const select = document.getElementById('pCategory');
    if(!select) return;

    // Standardized categories matching frontend filtering rules
    const categories = [
      { group: 'Main Categories', items: ['Laptops', 'Desktops', 'Monitors', 'Printers'] },
      { group: 'Gaming Peripherals', items: ['Mouse', 'Keyboard', 'Headset', 'Mousepad', 'Accessory'] },
      { group: 'PC Components', items: ['Pre-Built PC', 'Graphics Card', 'Motherboard', 'CPU', 'RAM', 'Storage', 'Power Supply', 'Case'] },
      { group: 'Other', items: ['General'] }
    ];

    let html = '<option value="">Select Category</option>';
    categories.forEach(group => {
      html += `<optgroup label="${group.group}">`;
      group.items.forEach(item => {
        html += `<option value="${item}">${item}</option>`;
      });
      html += `</optgroup>`;
    });

    select.innerHTML = html;
  }

  function bindLivePreview(){
    const preview = document.getElementById('pPreview');
    const meta = document.getElementById('pPreviewMeta');
    function update(){
      const name = document.getElementById('pName').value.trim();
      const price = document.getElementById('pPrice').value.trim();
      const img = document.getElementById('pImageUrl').value.trim();
      if(img){ preview.src = img; preview.style.display='block'; }
      meta.textContent = name? `${name} • Rs ${price || '0'}` : 'Fill fields to see preview.';
    }
    form.addEventListener('input', update);
  }

  async function loadProduct(){
    setStatus('<i class="fas fa-spinner fa-spin"></i> Loading product...');
    try{
      const product = await api.getProduct(id);
      if(!product){ setStatus('Product not found','error'); return; }
      // Fill form
      form.pName.value = product.name || '';
      form.pSku.value = product.sku || '';
      form.pPrice.value = product.price || 0;
      form.pOffer.value = product.offer_price || '';
      form.pStock.value = product.stock || 0;
      form.pCondition.value = product.condition || 'Brand New';
      form.pStatus.value = product.status || 'active';
      form.pFeatured.checked = !!product.visibility_homepage;
      form.pImageUrl.value = product.image_url || '';
      form.pDescription.value = product.description || '';
      form.pType.value = product.type || '';
      // Category after categories loaded
      const setCat = ()=>{ if(product.category){ form.pCategory.value = product.category; } };
      loadCategories().then(setCat);
      
      // Load gallery images
      await loadGalleryImages(id);
      
      setStatus('<span style="color:#34d399">Loaded.</span>');
    }catch(e){ setStatus('Error loading product: '+e.message,'error'); }
  }

  async function uploadImageIfSelected(){
    const fileInput = document.getElementById('pImageFile');
    const f = fileInput.files[0];
    if(!f) return null;
    const fd = new FormData(); fd.append('image', f);
    const res = await fetch('../api/admin-upload-image.php',{method:'POST',body:fd});
    const json = await res.json();
    if(json.success) return json.url;
    throw new Error(json.error || 'Upload failed');
  }

  async function safeSave(id, data){
    try{
      const res = await fetch('../api/admin-save-product.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, ...data }) });
      const text = await res.text();
      let json = {};
      try{ json = JSON.parse(text); }catch(_){ throw new Error('Invalid JSON from server'); }
      if(!res.ok || json.success===false){ throw new Error(json.message || 'Save failed'); }
      return json;
    }catch(e){ throw e; }
  }
  // Hook safeSave into submit flow by overriding api.saveProduct if available
  if (window.AdminAPI && typeof window.AdminAPI.saveProduct === 'function'){
    const orig = window.AdminAPI.saveProduct;
    window.AdminAPI.saveProduct = async function(id, payload){
      try{ return (await safeSave(id, payload)).product_id; }
      catch(e){ throw e; }
    };
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    setStatus('<i class="fas fa-spinner fa-spin"></i> Saving...');
    const data = Object.fromEntries(new FormData(form).entries());
    try{
      const uploadedUrl = await uploadImageIfSelected();
      if(uploadedUrl){ data.image_url = uploadedUrl; }
      data.visibility_homepage = form.pFeatured.checked;
      // numeric conversions
      data.price = parseFloat(data.price||'0');
      if(data.offer_price) data.offer_price = parseFloat(data.offer_price||'0');
      data.stock = parseInt(data.stock||'0',10);
      await api.saveProduct(id, data);
      
      // Save gallery images
      await saveGalleryImages(id);
      
      setStatus('<span style="color:#34d399">✅ Product updated successfully.</span>');
      setTimeout(()=>{ location.href='index.html#products'; }, 900);
    }catch(err){ setStatus('<span style="color:#ef4444">❌ '+err.message+'</span>','error'); }
  });

  document.getElementById('deleteBtn').addEventListener('click', async ()=>{
    if(!confirm('Delete this product permanently?')) return;
    try{
      await api.deleteProduct(id);
      setStatus('<span style="color:#34d399">Deleted.</span>');
      setTimeout(()=>{ location.href='index.html#products'; },600);
    }catch(err){ setStatus('<span style="color:#ef4444">Delete failed: '+err.message+'</span>'); }
  });

  // ============================================
  // GALLERY IMAGES MANAGEMENT
  // ============================================
  
  let imageCount = 0;
  const existingImages = new Map(); // Track existing images by ID
  const deletedImageIds = new Set(); // Track images to delete
  
  async function loadGalleryImages(productId) {
    try {
      const supabase = await window.ensureSupabase();
      if (!supabase) return;
      
      const { data: images, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.warn('Error loading gallery images:', error);
        return;
      }
      
      const container = document.getElementById('imageUrlsContainer');
      container.innerHTML = '';
      
      if (images && images.length > 0) {
        images.forEach((img, index) => {
          existingImages.set(img.id, img);
          const inputEl = createImageInput(index, img.image_url, img.id);
          container.appendChild(inputEl);
          imageCount++;
        });
      }
    } catch (error) {
      console.error('loadGalleryImages error:', error);
    }
  }
  
  async function saveGalleryImages(productId) {
    try {
      const supabase = await window.ensureSupabase();
      if (!supabase) return;
      
      // Delete removed images
      if (deletedImageIds.size > 0) {
        const { error: deleteError } = await supabase
          .from('product_images')
          .delete()
          .in('id', Array.from(deletedImageIds));
        
        if (deleteError) throw deleteError;
      }
      
      // Collect all current image URLs
      const imageInputs = document.querySelectorAll('input.gallery-image-url');
      const imagesToSave = [];
      
      imageInputs.forEach((input, index) => {
        const url = input.value?.trim();
        const existingId = input.dataset.imageId;
        
        if (url) {
          if (existingId && existingImages.has(existingId)) {
            // Update existing image
            imagesToSave.push({
              id: existingId,
              image_url: url,
              sort_order: index
            });
          } else {
            // New image
            imagesToSave.push({
              product_id: productId,
              image_url: url,
              is_primary: false,
              sort_order: index
            });
          }
        }
      });
      
      // Update existing images
      const updates = imagesToSave.filter(img => img.id);
      if (updates.length > 0) {
        for (const img of updates) {
          const { error } = await supabase
            .from('product_images')
            .update({ image_url: img.image_url, sort_order: img.sort_order })
            .eq('id', img.id);
          
          if (error) throw error;
        }
      }
      
      // Insert new images
      const inserts = imagesToSave.filter(img => !img.id);
      if (inserts.length > 0) {
        const { error } = await supabase
          .from('product_images')
          .insert(inserts);
        
        if (error) throw error;
      }
      
    } catch (error) {
      console.error('saveGalleryImages error:', error);
      throw new Error('Failed to save gallery images: ' + error.message);
    }
  }
  
  function createImageInput(index, existingUrl = '', existingId = null) {
    const div = document.createElement('div');
    div.className = 'gallery-image-row';
    div.style.cssText = 'display:flex;gap:0.5rem;align-items:flex-start;';
    
    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = 'flex:1;';
    
    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'input gallery-image-url';
    input.placeholder = `https://example.com/image-${index + 1}.jpg`;
    input.style.width = '100%';
    input.value = existingUrl || '';
    if (existingId) {
      input.dataset.imageId = existingId;
    }
    
    const previewDiv = document.createElement('div');
    previewDiv.style.cssText = 'margin-top:0.5rem;';
    previewDiv.innerHTML = '<img src="" alt="Preview" style="max-width:100%;max-height:150px;border-radius:6px;border:1px solid #2d2e3a;display:none;"/>';
    const previewImg = previewDiv.querySelector('img');
    
    // Show initial preview if URL exists
    if (existingUrl) {
      previewImg.src = existingUrl;
      previewImg.style.display = 'block';
    }
    
    inputWrapper.appendChild(input);
    inputWrapper.appendChild(previewDiv);
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn remove-image-btn';
    removeBtn.style.cssText = 'padding:0.5rem;color:#f56565;height:fit-content;background:rgba(239,68,68,.15);border:1px solid #ef4444;';
    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
    
    // Show preview on input change
    input.addEventListener('input', () => {
      const url = input.value?.trim();
      if (url) {
        previewImg.src = url;
        previewImg.style.display = 'block';
        previewImg.onerror = () => {
          previewImg.style.display = 'none';
          console.warn('Failed to load image:', url);
        };
      } else {
        previewImg.style.display = 'none';
      }
    });
    
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (existingId) {
        deletedImageIds.add(existingId);
      }
      div.remove();
    });
    
    div.appendChild(inputWrapper);
    div.appendChild(removeBtn);
    
    return div;
  }
  
  const addBtn = document.getElementById('addImageBtn');
  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const container = document.getElementById('imageUrlsContainer');
      const input = createImageInput(imageCount);
      container.appendChild(input);
      imageCount++;
      // Auto-focus new input
      input.querySelector('input').focus();
    });
  }

  bindLivePreview();
  loadProduct();
})();
