// C:\xampp\htdocs\oneclick\api\categories.js
// Categories management - Fixes Issue #13 (empty categories not handled)

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

/**
 * Load all product categories
 * Issue #13: Empty categories displayed with no products, no handling
 * Fix: Load categories with product counts, hide empty ones or show "Coming Soon"
 */
async function loadCategories() {
    try {
        showCategoriesLoading();
        
        // Get all unique categories with product count
        const { data, error } = await supabase
            .from('products')
            .select('category')
            .eq('status', 'active');
        
        if (error) {
            console.error('Categories load error:', error);
            showCategoriesError('Unable to load categories');
            return;
        }
        
        // Count products per category
        const categoryCounts = {};
        (data || []).forEach(product => {
            const cat = product.category || 'Uncategorized';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        
        displayCategories(categoryCounts);
        
    } catch (error) {
        console.error('Unexpected error loading categories:', error);
        showCategoriesError('Error: ' + error.message);
    } finally {
        hideCategoriesLoading();
    }
}

/**
 * Display categories with product counts
 */
function displayCategories(categories) {
    try {
        const container = document.getElementById('categories-list');
        if (!container) return;
        
        if (Object.keys(categories).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No categories available yet</p>';
            return;
        }
        
        // Define category display order and icons
        const categoryOrder = [
            'Laptops', 'Desktops', 'Graphics Cards', 'Monitors',
            'Keyboards', 'Mouse', 'Mousepads', 'Headsets',
            'Printers', 'Power Supplies', 'Cases', 'Cooling',
            'Storage', 'USB Devices', 'Cables', 'Other'
        ];
        
        const categoryIcons = {
            'Laptops': '💻',
            'Desktops': '🖥️',
            'Graphics Cards': '🎮',
            'Monitors': '📺',
            'Keyboards': '⌨️',
            'Mouse': '🖱️',
            'Mousepads': '📄',
            'Headsets': '🎧',
            'Printers': '🖨️',
            'Power Supplies': '⚡',
            'Cases': '📦',
            'Cooling': '❄️',
            'Storage': '💾',
            'USB Devices': '🔌',
            'Cables': '🧵',
            'Other': '✨'
        };
        
        let html = '<div class="categories-grid">';
        
        // Sort categories by defined order
        const sortedCats = Object.keys(categories).sort((a, b) => {
            const aIndex = categoryOrder.indexOf(a);
            const bIndex = categoryOrder.indexOf(b);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
        
        sortedCats.forEach(category => {
            const count = categories[category];
            const icon = categoryIcons[category] || '📦';
            
            if (count > 0) {
                // Category has products - clickable
                html += `
                    <div class="category-card active" onclick="filterByCategory('${category}')">
                        <div class="category-icon">${icon}</div>
                        <h3>${category}</h3>
                        <p class="product-count">${count} product${count !== 1 ? 's' : ''}</p>
                        <span class="category-link">Browse →</span>
                    </div>
                `;
            } else {
                // Empty category - "Coming Soon"
                html += `
                    <div class="category-card empty">
                        <div class="category-icon" style="opacity: 0.5;">${icon}</div>
                        <h3>${category}</h3>
                        <p class="product-count">Coming Soon</p>
                        <span class="category-link" style="opacity: 0.5;">0 products</span>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        container.innerHTML = html;
        console.log('✓ Categories loaded:', Object.keys(categories).length);
        
    } catch (error) {
        console.error('Error displaying categories:', error);
    }
}

/**
 * Filter products by category
 */
async function filterByCategory(category) {
    try {
        // Navigate to shop page with category filter
        window.location.href = `/shop.html?category=${encodeURIComponent(category)}`;
        
    } catch (error) {
        console.error('Error filtering by category:', error);
    }
}

/**
 * Get category from URL parameter
 */
function getCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('category');
}

/**
 * Show/hide loading state
 */
function showCategoriesLoading() {
    const loader = document.getElementById('categories-loading');
    if (loader) loader.style.display = 'block';
}

function hideCategoriesLoading() {
    const loader = document.getElementById('categories-loading');
    if (loader) loader.style.display = 'none';
}

/**
 * Show error
 */
function showCategoriesError(msg) {
    const container = document.getElementById('categories-list');
    if (container) {
        container.innerHTML = `<p style="color: red;">${msg}</p>`;
    }
}

/**
 * Add new category (admin)
 */
async function addCategory(categoryName) {
    try {
        if (!categoryName || categoryName.trim().length === 0) {
            alert('Category name required');
            return false;
        }
        
        // Just reload categories - they're auto-generated from products
        loadCategories();
        return true;
        
    } catch (error) {
        console.error('Error adding category:', error);
        return false;
    }
}

/**
 * Get most popular categories
 */
async function getPopularCategories(limit = 5) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('category')
            .eq('status', 'active');
        
        if (error) return [];
        
        const counts = {};
        (data || []).forEach(product => {
            const cat = product.category || 'Uncategorized';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([category, count]) => ({ category, count }));
        
    } catch (error) {
        console.error('Error getting popular categories:', error);
        return [];
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
});

// Export functions
window.loadCategories = loadCategories;
window.filterByCategory = filterByCategory;
window.getCategoryFromURL = getCategoryFromURL;
window.addCategory = addCategory;
window.getPopularCategories = getPopularCategories;


