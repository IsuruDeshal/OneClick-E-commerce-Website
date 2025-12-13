/**
 * ========================================
 * GLOBAL SEARCH INITIALIZATION
 * ========================================
 * Handles search across all pages
 * Redirects to search results page or shows inline results
 */

(function() {
  'use strict';

  /**
   * Initialize search functionality on page load
   */
  function initGlobalSearch() {
    console.log('Initializing global search...');

    // Get all search inputs
    const searchInputs = document.querySelectorAll('#searchInput, input[type="search"]');
    const searchForms = document.querySelectorAll('.search, form.search');

    if (searchInputs.length === 0) {
      console.log('No search inputs found on this page');
      return;
    }

    // Handle search submission
    searchForms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        performSearch();
      });
    });

    // Handle Enter key on search inputs
    searchInputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          performSearch();
        }
      });

      // Sync all search inputs
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        searchInputs.forEach(otherInput => {
          if (otherInput !== e.target) {
            otherInput.value = value;
          }
        });
      });
    });

    // Handle search button clicks
    const searchButtons = document.querySelectorAll('.search button, button[type="submit"]');
    searchButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        // Check if this is within a search form
        const searchForm = button.closest('.search, form.search');
        if (searchForm) {
          e.preventDefault();
          performSearch();
        }
      });
    });

    // Mobile search toggle
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    const mobileSearchBar = document.getElementById('mobileSearchBar');
    
    if (mobileSearchBtn && mobileSearchBar) {
      mobileSearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        mobileSearchBar.classList.toggle('active');
        
        if (mobileSearchBar.classList.contains('active')) {
          const mobileInput = mobileSearchBar.querySelector('input');
          if (mobileInput) {
            setTimeout(() => mobileInput.focus(), 100);
          }
        }
      });
    }

    console.log('Global search initialized');
  }

  /**
   * Perform search and redirect to results page
   */
  function performSearch() {
    // Get search query from any active search input
    const searchInputs = document.querySelectorAll('#searchInput, input[type="search"]');
    let searchQuery = '';

    for (const input of searchInputs) {
      if (input.value && input.value.trim()) {
        searchQuery = input.value.trim();
        break;
      }
    }

    if (!searchQuery) {
      console.log('No search query entered');
      return;
    }

    console.log('Searching for:', searchQuery);

    // Check if we're already on the search page
    const isSearchPage = window.location.pathname.includes('search.html');

    if (isSearchPage) {
      // Trigger search on current page
      if (window.onSearch && typeof window.onSearch === 'function') {
        window.onSearch();
      } else {
        console.log('Search function not available, page will reload');
        const url = new URL(window.location);
        url.searchParams.set('search', searchQuery);
        window.location.href = url.toString();
      }
    } else {
      // Redirect to search results page
      window.location.href = `search.html?search=${encodeURIComponent(searchQuery)}`;
    }
  }

  /**
   * Check if on search results page and trigger search
   */
  function checkSearchPage() {
    const isSearchPage = window.location.pathname.includes('search.html');
    
    if (isSearchPage) {
      // Get search query from URL
      const urlParams = new URLSearchParams(window.location.search);
      const searchQuery = urlParams.get('search');
      
      if (searchQuery) {
        // Populate search inputs
        const searchInputs = document.querySelectorAll('#searchInput, input[type="search"]');
        searchInputs.forEach(input => {
          input.value = searchQuery;
        });

        console.log('Search page loaded with query:', searchQuery);
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initGlobalSearch();
      checkSearchPage();
    });
  } else {
    initGlobalSearch();
    checkSearchPage();
  }

  // Export for use in other scripts
  window.GlobalSearch = {
    init: initGlobalSearch,
    perform: performSearch
  };

})();
