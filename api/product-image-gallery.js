// ============================================
// product-image-gallery.js
// Product Image Management & Gallery
// Fixes Issue #6 (Product Image Upload)
// ============================================

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const STORAGE_BUCKET = 'product-images';

/**
 * Upload images directly to Supabase Storage
 * Issue #6: Admin uploads → Supabase stores → URL auto-saved
 */
async function uploadProductImages(productId, files) {
    try {
        if (!productId) {
            return { success: false, error: 'Product ID required' };
        }

        if (!files || files.length === 0) {
            return { success: false, error: 'No files selected' };
        }

        if (files.length > MAX_IMAGES) {
            return { success: false, error: `Maximum ${MAX_IMAGES} images allowed` };
        }

        const uploadedUrls = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Validate file
            const validation = validateImageFile(file);
            if (!validation.valid) {
                errors.push(`Image ${i + 1}: ${validation.error}`);
                continue;
            }

            // Upload to Supabase Storage
            const uploadResult = await uploadImageToStorage(productId, file, i + 1);

            if (uploadResult.success) {
                uploadedUrls.push({
                    index: i + 1,
                    url: uploadResult.url
                });
                console.log(`✓ Image ${i + 1} uploaded: ${uploadResult.url}`);
            } else {
                errors.push(`Image ${i + 1}: ${uploadResult.error}`);
            }
        }

        if (uploadedUrls.length === 0) {
            return { success: false, error: 'No images uploaded. ' + errors.join(', ') };
        }

        // Save URLs to product table
        const saveResult = await saveImageUrlsToProduct(productId, uploadedUrls);

        if (!saveResult.success) {
            return { success: false, error: 'Images uploaded but failed to save URLs: ' + saveResult.error };
        }

        return {
            success: true,
            uploaded: uploadedUrls.length,
            urls: uploadedUrls,
            errors: errors.length > 0 ? errors : null
        };
    } catch (error) {
        console.error('Error uploading images:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Validate image file
 */
function validateImageFile(file) {
    if (!file) {
        return { valid: false, error: 'No file' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Only JPEG, PNG, WebP allowed' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
    }

    return { valid: true };
}

/**
 * Upload single image to Supabase Storage
 */
async function uploadImageToStorage(productId, file, imageNumber) {
    try {
        supabase = await ensureSupabase();
        const timestamp = Date.now();
        const fileName = `${productId}_image_${imageNumber}_${timestamp}`;
        const filePath = `${productId}/${fileName}`;

        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Storage upload error:', error);
            return { success: false, error: error.message };
        }

        // Get public URL
        const { data: publicUrl } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

        return { success: true, url: publicUrl.publicUrl };
    } catch (error) {
        console.error('Error uploading to storage:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save image URLs to product table columns
 * Updates: image1_url, image2_url, image3_url, image4_url, image5_url
 */
async function saveImageUrlsToProduct(productId, imageUrls) {
    try {
        supabase = await ensureSupabase();
        // Build update object with image1_url, image2_url, etc.
        const updateData = {};
        imageUrls.forEach(({ index, url }) => {
            updateData[`image${index}_url`] = url;
        });

        const { data, error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', productId)
            .select();

        if (error) {
            console.error('Failed to save image URLs:', error);
            return { success: false, error: error.message };
        }

        console.log('✓ Image URLs saved to product');
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error saving image URLs:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all images for a product
 */
async function getProductImages(productId) {
    try {
        supabase = await ensureSupabase();
        const { data, error } = await supabase
            .from('products')
            .select('image1_url, image2_url, image3_url, image4_url, image5_url')
            .eq('id', productId)
            .single();

        if (error) {
            console.error('Failed to get images:', error);
            return [];
        }

        // Return only non-null image URLs
        const images = [];
        for (let i = 1; i <= 5; i++) {
            const url = data[`image${i}_url`];
            if (url) {
                images.push({ index: i, url });
            }
        }

        return images;
    } catch (error) {
        console.error('Error fetching product images:', error);
        return [];
    }
}

/**
 * Delete image from product
 */
async function deleteProductImage(productId, imageIndex) {
    try {
        supabase = await ensureSupabase();
        if (imageIndex < 1 || imageIndex > MAX_IMAGES) {
            return { success: false, error: 'Invalid image index' };
        }

        const columnName = `image${imageIndex}_url`;

        const { data, error } = await supabase
            .from('products')
            .update({ [columnName]: null })
            .eq('id', productId)
            .select();

        if (error) {
            console.error('Failed to delete image:', error);
            return { success: false, error: error.message };
        }

        console.log(`✓ Image ${imageIndex} deleted`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting image:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create product image gallery HTML
 * Issue #6: Display 4-5 images in responsive grid
 */
function createProductGallery(productId, images = []) {
    if (images.length === 0) {
        return `
            <div class="product-gallery">
                <div class="gallery-placeholder">
                    <p>No images available</p>
                </div>
            </div>
        `;
    }

    // Main image (first)
    const mainImage = images[0];
    const thumbnails = images.slice(0, 5);

    let html = `
        <div class="product-gallery">
            <div class="main-image-container">
                <img id="main-product-image" src="${mainImage.url}" alt="Product" class="main-image">
            </div>
            <div class="gallery-thumbnails">
    `;

    thumbnails.forEach((image, idx) => {
        html += `
            <img 
                src="${image.url}" 
                alt="Image ${idx + 1}" 
                class="thumbnail ${idx === 0 ? 'active' : ''}"
                onclick="switchMainImage('${image.url}')"
            >
        `;
    });

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Switch main image (for gallery thumbnails)
 */
function switchMainImage(imageUrl) {
    const mainImage = document.getElementById('main-product-image');
    if (mainImage) {
        mainImage.src = imageUrl;
    }

    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
        if (thumb.src === imageUrl) {
            thumb.classList.add('active');
        }
    });
}

/**
 * Create admin image upload form
 * Issue #6: Admin uploads directly from dashboard
 */
function createAdminImageUploadForm(productId) {
    return `
        <div class="admin-image-upload" data-product-id="${productId}">
            <h3>Product Images (up to 5)</h3>
            
            <div class="upload-zone" id="upload-zone-${productId}">
                <p>Drag & drop images or click to select</p>
                <input 
                    type="file" 
                    id="image-input-${productId}" 
                    multiple 
                    accept="image/jpeg,image/png,image/webp"
                    style="display: none;"
                >
            </div>

            <div id="image-preview-${productId}" class="image-preview-grid"></div>

            <button type="button" class="btn btn-primary" onclick="uploadProductImages('${productId}')">
                Upload Images
            </button>

            <div id="upload-status-${productId}" class="upload-status"></div>
        </div>
    `;
}

/**
 * Handle drag and drop for image upload
 */
function setupImageDropZone(productId) {
    const dropZone = document.getElementById(`upload-zone-${productId}`);
    const fileInput = document.getElementById(`image-input-${productId}`);

    if (!dropZone || !fileInput) return;

    // Click to open file picker
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#f0f0f0';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = 'transparent';
        fileInput.files = e.dataTransfer.files;
        previewImages(productId, e.dataTransfer.files);
    });

    // File picker change
    fileInput.addEventListener('change', () => {
        previewImages(productId, fileInput.files);
    });
}

/**
 * Preview selected images before upload
 */
function previewImages(productId, files) {
    const previewContainer = document.getElementById(`image-preview-${productId}`);
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    Array.from(files).slice(0, MAX_IMAGES).forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${idx + 1}">
                <span>${file.name}</span>
            `;
            previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Upload images from admin form
 */
async function uploadProductImagesFromForm(productId) {
    try {
        const fileInput = document.getElementById(`image-input-${productId}`);
        const statusDiv = document.getElementById(`upload-status-${productId}`);

        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            if (statusDiv) statusDiv.innerHTML = '<p class="error">No files selected</p>';
            return;
        }

        if (statusDiv) statusDiv.innerHTML = '<p class="loading">Uploading...</p>';

        const result = await uploadProductImages(productId, fileInput.files);

        if (result.success) {
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <p class="success">✓ ${result.uploaded} image(s) uploaded successfully!</p>
                    ${result.errors ? '<p class="warning">' + result.errors.join('<br>') + '</p>' : ''}
                `;
            }
            fileInput.value = '';
            document.getElementById(`image-preview-${productId}`).innerHTML = '';
        } else {
            if (statusDiv) statusDiv.innerHTML = `<p class="error">❌ ${result.error}</p>`;
        }
    } catch (error) {
        console.error('Error in upload form:', error);
        const statusDiv = document.getElementById(`upload-status-${productId}`);
        if (statusDiv) statusDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    }
}

// Export functions to global window
window.uploadProductImages = uploadProductImages;
window.getProductImages = getProductImages;
window.deleteProductImage = deleteProductImage;
window.createProductGallery = createProductGallery;
window.switchMainImage = switchMainImage;
window.createAdminImageUploadForm = createAdminImageUploadForm;
window.setupImageDropZone = setupImageDropZone;
window.uploadProductImagesFromForm = uploadProductImagesFromForm;
