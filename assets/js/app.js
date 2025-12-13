(function(){
  const $ = (s, c=document)=>c.querySelector(s);
  const $$ = (s, c=document)=>Array.from(c.querySelectorAll(s));

  // Year
  const y = document.getElementById('yearCopy'); if(y) y.textContent = new Date().getFullYear();

  // Mega menu
  const allMegas = $$('.mega');
  let megaOpen = false;
  let activeMegaType = 'all';
  
  function openMega(type){ 
    activeMegaType = type || 'all';
    allMegas.forEach(m => {
      const megaType = m.getAttribute('data-mega-content');
      if(megaType === activeMegaType) {
        m.classList.add('open'); 
        m.setAttribute('aria-hidden','false');
      } else {
        m.classList.remove('open');
        m.setAttribute('aria-hidden','true');
      }
    });
    megaOpen = true; 
  }
  
  function closeMega(){ 
    allMegas.forEach(m => {
      m.classList.remove('open'); 
      m.setAttribute('aria-hidden','true');
    });
    megaOpen = false; 
  }
  
  $$('.mega-trigger').forEach(btn => {
    const megaType = btn.getAttribute('data-mega');
    btn.addEventListener('mouseenter', ()=> openMega(megaType));
    btn.addEventListener('click', ()=> megaOpen?closeMega():openMega(megaType));
  });
  
  allMegas.forEach(m => m.addEventListener('mouseleave', closeMega));
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMega(); });

  // Mobile Menu
  const mobileMenuBtn = $('#mobileMenuBtn');
  const mobileDrawer = $('#mobileDrawer');
  const closeMobileDrawer = $('#closeMobileDrawer');
  const mobileDrawerOverlay = $('.mobile-drawer-overlay');
  
  if(mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileDrawer.classList.add('open');
      mobileMenuBtn.classList.add('active');
      mobileDrawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
    
    const closeMobileMenu = () => {
      mobileDrawer.classList.remove('open');
      mobileMenuBtn.classList.remove('active');
      mobileDrawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    
    closeMobileDrawer?.addEventListener('click', closeMobileMenu);
    mobileDrawerOverlay?.addEventListener('click', closeMobileMenu);
    
    // Close on menu item click
    $$('.mobile-menu-item').forEach(item => {
      item.addEventListener('click', closeMobileMenu);
    });
  }
  
  // Mobile Search Toggle
  const mobileSearchBtn = $('#mobileSearchBtn');
  const mobileSearchBar = $('#mobileSearchBar');
  
  if(mobileSearchBtn && mobileSearchBar) {
    mobileSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      mobileSearchBar.classList.toggle('active');
      if(mobileSearchBar.classList.contains('active')) {
        mobileSearchBar.querySelector('input')?.focus();
      }
    });
  }

  // More Categories Button (Mobile) - Remove this as we're using drawer now
  const moreCategoriesBtn = $('#moreCategoriesBtn');
  const headerBottom = $('.header-bottom');
  if(moreCategoriesBtn && headerBottom) {
    moreCategoriesBtn.addEventListener('click', () => {
      headerBottom.classList.toggle('show-all');
      if(headerBottom.classList.contains('show-all')) {
        moreCategoriesBtn.textContent = 'Show Less';
      } else {
        moreCategoriesBtn.textContent = '+2 More';
      }
    });
  }

  // Drawer (old)
  const drawer = $('#drawer');
  $('#openDrawer')?.addEventListener('click', ()=>{drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false');});
  $('#closeDrawer')?.addEventListener('click', ()=>{drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');});
  drawer?.addEventListener('click', (e)=>{ if(e.target===drawer) { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); } });

  // Carousel (simple)
  $$('.carousel').forEach(car => {
    const track = car.querySelector('[data-track]');
    const prev = car.querySelector('[data-prev]');
    const next = car.querySelector('[data-next]');
    const scrollBy = () => track.clientWidth * 0.9;
    prev?.addEventListener('click', ()=> track.scrollBy({left:-scrollBy(), behavior:'smooth'}));
    next?.addEventListener('click', ()=> track.scrollBy({left: scrollBy(), behavior:'smooth'}));
  });

  // Accordion
  $$('.accordion .item .head').forEach(h => {
    h.addEventListener('click', ()=>{
      const item = h.closest('.item');
      const open = item.classList.contains('open');
      $$('.accordion .item').forEach(i=>i.classList.remove('open'));
      if(!open) item.classList.add('open');
      h.setAttribute('aria-expanded', String(!open));
    });
  });

  // Product Row Navigation & Scroll Indicators
  $$('.product-row').forEach(row => {
    const wrapper = row.parentElement;
    if (!wrapper.classList.contains('product-row-wrapper')) {
      const newWrapper = document.createElement('div');
      newWrapper.className = 'product-row-wrapper';
      row.parentNode.insertBefore(newWrapper, row);
      newWrapper.appendChild(row);
    }
    
    const actualWrapper = row.parentElement;
    
    // Create navigation buttons
    const prevBtn = document.createElement('button');
    prevBtn.className = 'scroll-nav-btn prev';
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
    prevBtn.setAttribute('aria-label', 'Scroll Left');
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'scroll-nav-btn next';
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';
    nextBtn.setAttribute('aria-label', 'Scroll Right');
    
    actualWrapper.appendChild(prevBtn);
    actualWrapper.appendChild(nextBtn);
    
    // Update scroll indicators
    const updateScrollIndicators = () => {
      const scrollLeft = row.scrollLeft;
      const maxScroll = row.scrollWidth - row.clientWidth;
      
      // Update fade indicators
      if (scrollLeft > 20) {
        actualWrapper.classList.add('show-left');
      } else {
        actualWrapper.classList.remove('show-left');
      }
      
      if (scrollLeft < maxScroll - 20) {
        actualWrapper.classList.add('show-right');
      } else {
        actualWrapper.classList.remove('show-right');
      }
      
      // Update button visibility
      if (scrollLeft > 10) {
        prevBtn.classList.add('active');
      } else {
        prevBtn.classList.remove('active');
      }
      
      if (scrollLeft < maxScroll - 10) {
        nextBtn.classList.add('active');
      } else {
        nextBtn.classList.remove('active');
      }
    };
    
    // Scroll handlers
    const scrollAmount = 300;
    prevBtn.addEventListener('click', () => {
      row.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
    
    nextBtn.addEventListener('click', () => {
      row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
    
    row.addEventListener('scroll', updateScrollIndicators);
    window.addEventListener('resize', updateScrollIndicators);
    
    // Initial update
    setTimeout(updateScrollIndicators, 100);
  });

  // Auto-scroll Shop by Category (cat-grid) - Left to Right with Seamless Loop
  const catGrid = $('.cat-grid');
  if (catGrid) {
    let scrollInterval;
    let isHovering = false;
    let scrollSpeed = 1; // pixels per interval
    
    const startAutoScroll = () => {
      if (scrollInterval || isHovering) return;
      scrollInterval = setInterval(() => {
        if (!isHovering) {
          const maxScroll = catGrid.scrollWidth - catGrid.clientWidth;
          
          if (catGrid.scrollLeft >= maxScroll) {
            // Reached the end, smoothly reset to start
            catGrid.style.scrollBehavior = 'auto';
            catGrid.scrollLeft = 0;
            setTimeout(() => {
              catGrid.style.scrollBehavior = 'smooth';
            }, 50);
          } else {
            // Continue scrolling left to right
            catGrid.scrollLeft += scrollSpeed;
          }
        }
      }, 30);
    };
    
    const stopAutoScroll = () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
    };
    
    catGrid.addEventListener('mouseenter', () => {
      isHovering = true;
      stopAutoScroll();
    });
    
    catGrid.addEventListener('mouseleave', () => {
      isHovering = false;
      startAutoScroll();
    });
    
    // Start auto-scroll on load
    setTimeout(() => startAutoScroll(), 1000);
  }

  // Header icon actions: Account, Compare, Wishlist, Cart
  const routeIcon = (title, handler) => {
    $$(`.icon-btn[title="${title}"]`).forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); handler(); });
    });
  };
  routeIcon('Account', () => { window.location.href = 'login.html'; });
  routeIcon('Cart', () => { window.location.href = 'checkout.html'; });
  routeIcon('Compare', () => {
    const target = document.getElementById('compare');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.location.href = 'index.html#compare';
  });
  routeIcon('Wishlist', () => {
    const target = document.getElementById('wishlist');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.location.href = 'index.html#wishlist';
  });
})();
