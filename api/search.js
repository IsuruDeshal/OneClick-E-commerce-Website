// C:\xampp\htdocs\oneclick\api\search.js
// Search functionality - Fixes Issue #11 (faulty search with partial matching)

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

/**
 * Perform search with partial matching
 * Issue #11: Old search was exact-match only ("def" wouldn't find "Desktop")
 * Fix: Use ilike() for case-insensitive partial matching
 */
async function performSearch(query) {
    try {
        if (!query || query.trim().length === 0) {
            clearSearchResults();
            return;
        }
        
        showSearchLoading();
        
        // Issue #11 FIX: Use ilike for partial matching
        const { data: products, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .ilike('name', `%${query}%`)  // Name partial match
            .order('name', { ascending: true })
            .limit(20);
        
        if (productError) {
            console.error('Search error:', productError);
            showSearchError('Search failed: ' + productError.message);
            return;
        }
        
        // Also search in product descriptions (optional)
        const { data: byDescription, error: descError } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .ilike('description', `%${query}%`)
            .order('name', { ascending: true })
            .limit(10);
        
        // Merge results, removing duplicates
        const allResults = [
            ...(products || []),
            ...(byDescription || [])
        ];
        
        const uniqueResults = Array.from(
            new Map(allResults.map(p => [p.id, p])).values()
        );
        
        displaySearchResults(uniqueResults, query);
        
    } catch (error) {
        console.error('Unexpected search error:', error);
        showSearchError('Error: ' + error.message);
    } finally {
        hideSearchLoading();
    }
}

/**
 * Display search results
 */
function displaySearchResults(results, query) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-empty">
                <p>No products found matching "${query}"</p>
                <small>Try different keywords or browse our categories</small>
            </div>
        `;
        return;
    }
    
    let html = `<div class="search-results-header">
        <h3>Found ${results.length} product${results.length !== 1 ? 's' : ''}</h3>
    </div>`;
    
    html += '<div class="search-results-list">';
    
    results.forEach(product => {
        const price = parseFloat(product.price);
        const offerPrice = product.offer_price ? parseFloat(product.offer_price) : null;
        
        html += `
            <div class="search-result-item">
                ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" class="search-result-image">` : '<div class="search-result-image-placeholder">No image</div>'}
                <div class="search-result-info">
                    <h4>${highlightMatch(product.name, query)}</h4>
                    <p class="search-result-category">${product.category}</p>
                    ${product.description ? `<p class="search-result-description">${product.description.substring(0, 80)}...</p>` : ''}
                    <div class="search-result-footer">
                        <div class="price">
                            ${offerPrice ? `
                                <span class="original-price">LKR ${price.toFixed(2)}</span>
                                <span class="sale-price">LKR ${offerPrice.toFixed(2)}</span>
                            ` : `
                                <span class="price-value">LKR ${price.toFixed(2)}</span>
                            `}
                        </div>
                        <button onclick="addToCart('${product.id}', '${product.name}', ${offerPrice || price})" class="btn btn-primary btn-sm">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    resultsContainer.innerHTML = html;
}

/**
 * Highlight search term in results (UX improvement)
 */
function highlightMatch(text, query) {
    if (!query || query.length === 0) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
}

/**
 * Clear search results
 */
function clearSearchResults() {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="search-empty"><p>Enter a search term to find products</p></div>';
    }
}

/**
 * Show/hide loading state
 */
function showSearchLoading() {
    const loader = document.getElementById('search-loading');
    if (loader) loader.style.display = 'block';
}

function hideSearchLoading() {
    const loader = document.getElementById('search-loading');
    if (loader) loader.style.display = 'none';
}

/**
 * Show search error
 */
function showSearchError(msg) {
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `<div class="search-error"><p>${msg}</p></div>`;
    }
}

/**
 * Set up search event listeners (debounced)
 */
function setupSearchListeners() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        // Debounce search (300ms)
        searchTimeout = setTimeout(() => {
            if (query.length === 0) {
                clearSearchResults();
            } else if (query.length >= 2) {
                performSearch(query);
            }
        }, 300);
    });
    
    // Clear on escape key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            clearSearchResults();
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', setupSearchListeners);

// Export functions
window.performSearch = performSearch;
window.clearSearchResults = clearSearchResults;


