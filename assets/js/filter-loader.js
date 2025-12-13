(function(){
  const FILTER_URL = 'components/filter-panel.html';
  let state = { availability:[], brand:[], type:[], price:{min:0,max:1000000} };

  async function mount(){
    const mountEl = document.querySelector('[data-mount="filters"]');
    if(!mountEl){return;}
    try {
      const res = await fetch(FILTER_URL,{cache:'no-store'});
      if(!res.ok){ mountEl.innerHTML='<div class="filter-error">Failed to load filters</div>'; return; }
      mountEl.innerHTML = await res.text();
      init(mountEl);
    } catch(e){
      console.error('Filter load error', e);
      mountEl.innerHTML='<div class="filter-error">Unable to load filters</div>';
    }
  }

  function init(root){
    setupAccordion(root);
    setupPills(root);
    setupBrands(root);
    setupPrice(root);
    setupActions(root);
    setupGlobalToggle();
  }

  function setupAccordion(root){
    root.querySelectorAll('[data-accordion] .fp-group-head').forEach(head => {
      head.addEventListener('click', () => {
        const grp = head.closest('.fp-group');
        const body = grp.querySelector('.fp-group-body');
        const expanded = head.getAttribute('aria-expanded') === 'true';
        head.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        grp.setAttribute('aria-collapsed', expanded ? 'true' : 'false');
        body.style.display = expanded ? 'none' : 'block';
      });
    });
  }

  function setupPills(root){
    root.querySelectorAll('.pill').forEach(p => {
      p.addEventListener('click', () => {
        p.classList.toggle('active');
        const group = p.closest('.fp-group')?.dataset.group;
        if(!group){return;}
        if(!Array.isArray(state[group])) state[group] = [];
        const val = p.dataset.value;
        if(p.classList.contains('active')){ if(!state[group].includes(val)) state[group].push(val); }
        else { state[group] = state[group].filter(v => v !== val); }
      });
    });
  }

  function setupBrands(root){
    const btn = root.querySelector('[data-more-btn]');
    const col = root.querySelector('.fp-collapsible');
    if(btn && col){
      btn.addEventListener('click', () => {
        const collapsed = col.hasAttribute('data-collapsed');
        if(collapsed) col.removeAttribute('data-collapsed'); else col.setAttribute('data-collapsed','');
        btn.querySelector('.txt').textContent = collapsed ? 'Show Less' : 'Show More';
        btn.classList.toggle('open', collapsed);
      });
    }
  }

  function setupPrice(root){
    const minInput = root.querySelector('#fpMin');
    const maxInput = root.querySelector('#fpMax');
    const bar = root.querySelector('#fpRangeBar');
    const minVal = root.querySelector('#fpMinVal');
    const maxVal = root.querySelector('#fpMaxVal');
    if(!minInput || !maxInput){return;}
    function update(){
      let min = parseInt(minInput.value); let max = parseInt(maxInput.value);
      if(min > max){ [min,max] = [max,min]; }
      state.price.min = min; state.price.max = max;
      minVal.textContent = format(min); maxVal.textContent = format(max);
      const rangeMin = parseInt(minInput.min); const rangeMax = parseInt(minInput.max);
      const left = ((min - rangeMin)/(rangeMax - rangeMin))*100;
      const right = ((max - rangeMin)/(rangeMax - rangeMin))*100;
      bar.style.left = left + '%';
      bar.style.right = (100 - right) + '%';
    }
    minInput.addEventListener('input', update);
    maxInput.addEventListener('input', update);
    update();
  }

  function format(v){ return 'Rs ' + Number(v).toLocaleString(); }

  function setupActions(root){
    root.querySelector('#fpReset')?.addEventListener('click', () => { reset(root); animate(root.querySelector('#fpReset')); });
    root.querySelector('#fpApply')?.addEventListener('click', e => { e.preventDefault(); dispatch(); animate(root.querySelector('#fpApply')); });
    root.querySelector('#fpClearAll')?.addEventListener('click', () => { clearAll(root); dispatch(); animate(root.querySelector('#fpClearAll')); });
  }

  function reset(root){
    Object.keys(state).forEach(k => { if(Array.isArray(state[k])) state[k] = []; if(k==='price') state.price={min:0,max:1000000}; });
    root.querySelectorAll('.pill.active').forEach(p => p.classList.remove('active'));
    const min = root.querySelector('#fpMin'); const max = root.querySelector('#fpMax');
    if(min && max){ min.value=min.min; max.value=max.max; }
    setupPrice(root);
    dispatch();
  }

  function clearAll(root){ reset(root); }

  function animate(el){ if(!el) return; el.classList.add('pulse'); setTimeout(()=>el.classList.remove('pulse'),600); }

  function dispatch(){
    window.dispatchEvent(new CustomEvent('filters:changed',{detail:JSON.parse(JSON.stringify(state))}));
  }

  function setupGlobalToggle(){
    const toggleBtn = document.querySelector('.filters-toggle button');
    if(toggleBtn){ toggleBtn.addEventListener('click', () => { document.documentElement.classList.toggle('filters-open'); }); }
  }

  window.getActiveFilters = () => JSON.parse(JSON.stringify(state));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
