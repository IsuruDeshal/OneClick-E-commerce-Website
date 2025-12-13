// C:\xampp\htdocs\oneclick\api\image-upload.js
// Image upload functionality - Fixes Issue #14 (image upload inefficient)

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

/**
 * Initialize image upload for product
 * Issue #14: Admin had to manually paste image URL
 * Fix: Direct file upload to Supabase storage with auto-save
 */
async function setupProductImageUpload() {
    try {
        const fileInput = document.getElementById('product-image-upload');
        const imagePreview = document.getElementById('image-preview');
        const imageUrlInput = document.getElementById('product-image-url');
        
        if (!fileInput) {
            console.warn('File input not found');
            return;
        }
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Show preview
            const reader = new FileReader();
            reader.onload = (event) => {
                if (imagePreview) {
                    imagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                }
            };
            reader.readAsDataURL(file);
            
            // Upload to Supabase
            await uploadProductImage(file, imageUrlInput);
        });
        
    } catch (error) {
        console.error('Error setting up image upload:', error);
    }
}

/**
 * Upload image to Supabase storage
 */
async function uploadProductImage(file, urlInput) {
    try {
        if (!urlInput) {
            console.warn('URL input not found');
            return;
        }
        
        showUploadProgress('Uploading...');
        
        // Validate file
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            showUploadError('Invalid file type. Use JPEG, PNG, WebP, or GIF.');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {  // 5MB limit
            showUploadError('File too large. Max 5MB.');
            return;
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `product-${timestamp}-${file.name.replace(/\s+/g, '-')}`;
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
            .from('product-images')
            .upload(`products/${filename}`, file);
        
        if (error) {
            console.error('Upload error:', error);
            showUploadError('Upload failed: ' + error.message);
            return;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(`products/${filename}`);
        
        if (publicUrl) {
            urlInput.value = publicUrl;
            showUploadSuccess('Image uploaded successfully!');
            console.log('✓ Image URL:', publicUrl);
        } else {
            showUploadError('Failed to get image URL');
        }
        
    } catch (error) {
        console.error('Unexpected upload error:', error);
        showUploadError('Error: ' + error.message);
    } finally {
        hideUploadProgress();
    }
}

/**
 * Upload multiple images for gallery (optional)
 */
async function uploadMultipleImages(files) {
    try {
        const uploadedUrls = [];
        
        for (const file of files) {
            showUploadProgress(`Uploading ${uploadedUrls.length + 1} of ${files.length}...`);
            
            const timestamp = Date.now();
            const filename = `gallery-${timestamp}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
            
            const { error } = await supabase.storage
                .from('product-images')
                .upload(`gallery/${filename}`, file);
            
            if (!error) {
                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(`gallery/${filename}`);
                
                uploadedUrls.push(publicUrl);
            }
        }
        
        return uploadedUrls;
        
    } catch (error) {
        console.error('Multiple upload error:', error);
        return [];
    } finally {
        hideUploadProgress();
    }
}

/**
 * Handle drag-and-drop upload
 */
function setupDragAndDrop(containerId, urlInput) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.style.borderColor = '#007bff';
        container.style.backgroundColor = '#e7f3ff';
    });
    
    container.addEventListener('dragleave', (e) => {
        e.preventDefault();
        container.style.borderColor = '#ddd';
        container.style.backgroundColor = 'transparent';
    });
    
    container.addEventListener('drop', async (e) => {
        e.preventDefault();
        container.style.borderColor = '#ddd';
        container.style.backgroundColor = 'transparent';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await uploadProductImage(files[0], urlInput);
        }
    });
}

/**
 * Upload status UI
 */
function showUploadProgress(msg) {
    const statusEl = document.getElementById('upload-status');
    if (statusEl) {
        statusEl.innerHTML = `<div class="upload-progress"><span class="spinner"></span> ${msg}</div>`;
        statusEl.style.display = 'block';
    }
}

function hideUploadProgress() {
    const statusEl = document.getElementById('upload-status');
    if (statusEl) {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 500);
    }
}

function showUploadSuccess(msg) {
    const statusEl = document.getElementById('upload-status');
    if (statusEl) {
        statusEl.innerHTML = `<div class="upload-success">✓ ${msg}</div>`;
    }
}

function showUploadError(msg) {
    const statusEl = document.getElementById('upload-status');
    if (statusEl) {
        statusEl.innerHTML = `<div class="upload-error">✗ ${msg}</div>`;
    }
}

/**
 * Delete product image
 */
async function deleteProductImage(url) {
    try {
        if (!url) return;
        
        // Extract filename from URL
        const filename = url.split('/').pop();
        if (!filename) return;
        
        const { error } = await supabase.storage
            .from('product-images')
            .remove([`products/${filename}`]);
        
        if (error) {
            console.error('Delete error:', error);
            alert('Failed to delete image');
        } else {
            console.log('✓ Image deleted');
            document.getElementById('product-image-url').value = '';
            document.getElementById('image-preview').innerHTML = '';
        }
        
    } catch (error) {
        console.error('Unexpected delete error:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupProductImageUpload();
    
    // Setup drag-and-drop if element exists
    const dropZone = document.getElementById('image-drop-zone');
    const urlInput = document.getElementById('product-image-url');
    if (dropZone && urlInput) {
        setupDragAndDrop('image-drop-zone', urlInput);
    }
});

// Export functions
window.uploadProductImage = uploadProductImage;
window.uploadMultipleImages = uploadMultipleImages;
window.deleteProductImage = deleteProductImage;
window.setupDragAndDrop = setupDragAndDrop;


