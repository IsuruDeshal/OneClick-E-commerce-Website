// ============================================
// address-ui.js
// Address UI Management & Form Handling
// Fixes: Address Add/Edit/Delete functionality
// ============================================

// Wait for supabase to be initialized globally
let supabase = null;

async function ensureSupabase() {
    if (!supabase) {
        supabase = await window.ensureSupabase();
    }
    return supabase;
}

/**
 * Display all addresses
 */
async function displayAddresses() {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            document.getElementById('addresses-container').innerHTML = `
                <div class="alert alert-warning">
                    Please <a href="login.html">log in</a> to manage addresses.
                </div>
            `;
            return;
        }

        const addresses = await getUserAddresses();

        if (addresses.length === 0) {
            document.getElementById('addresses-container').innerHTML = `
                <div class="no-addresses">
                    <p>No addresses saved yet</p>
                    <button class="btn btn-primary" onclick="toggleAddressForm()">
                        + Add Your First Address
                    </button>
                </div>
            `;
            return;
        }

        let html = '<div class="addresses-list">';

        addresses.forEach(address => {
            const defaultBadge = address.is_default ? '<span class="badge badge-primary">Default</span>' : '';

            html += `
                <div class="address-card" data-address-id="${address.id}">
                    <div class="address-header">
                        <h3>${address.full_name}</h3>
                        ${defaultBadge}
                    </div>

                    <div class="address-details">
                        <p><strong>Phone:</strong> ${address.phone}</p>
                        <p><strong>Address:</strong> ${address.address_line1}${address.address_line2 ? ', ' + address.address_line2 : ''}</p>
                        <p><strong>City:</strong> ${address.city}</p>
                        <p><strong>Postal Code:</strong> ${address.postal_code}</p>
                        <p><strong>Country:</strong> ${address.country}</p>
                    </div>

                    <div class="address-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editAddress('${address.id}')">
                            ✎ Edit
                        </button>
                        ${!address.is_default ? `
                            <button class="btn btn-sm btn-info" onclick="setAsDefault('${address.id}')">
                                ★ Set as Default
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger" onclick="confirmDelete('${address.id}', '${address.full_name}')">
                            🗑 Delete
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        html += `
            <div class="add-address-button">
                <button class="btn btn-primary btn-lg" onclick="toggleAddressForm()">
                    + Add New Address
                </button>
            </div>
        `;

        document.getElementById('addresses-container').innerHTML = html;
    } catch (error) {
        console.error('Error displaying addresses:', error);
        document.getElementById('addresses-container').innerHTML = `
            <div class="alert alert-danger">
                Error loading addresses: ${error.message}
            </div>
        `;
    }
}

/**
 * Show/hide add address form
 */
function toggleAddressForm(mode = 'add', addressId = null) {
    const formContainer = document.getElementById('address-form-container');

    if (formContainer.style.display === 'block') {
        formContainer.style.display = 'none';
        return;
    }

    if (mode === 'add') {
        formContainer.innerHTML = createAddressForm(null);
    } else if (mode === 'edit' && addressId) {
        loadAddressForEdit(addressId);
    }

    formContainer.style.display = 'block';
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Create address form HTML
 */
function createAddressForm(address = null) {
    const isEdit = address !== null;
    const title = isEdit ? 'Edit Address' : 'Add New Address';
    const submitBtn = isEdit ? 'Update Address' : 'Save Address';

    return `
        <div class="address-form">
            <div class="form-header">
                <h2>${title}</h2>
                <button type="button" class="close-btn" onclick="toggleAddressForm()">✕</button>
            </div>

            <form id="address-form" onsubmit="submitAddressForm(event, ${isEdit ? "'" + address.id + "'" : 'null'})">
                
                <div class="form-group">
                    <label for="full_name">Full Name *</label>
                    <input 
                        type="text" 
                        id="full_name" 
                        name="full_name" 
                        value="${address?.full_name || ''}"
                        placeholder="John Doe"
                        required 
                        class="form-control"
                    >
                </div>

                <div class="form-group">
                    <label for="phone">Phone *</label>
                    <input 
                        type="tel" 
                        id="phone" 
                        name="phone" 
                        value="${address?.phone || ''}"
                        placeholder="+94 712 345 678"
                        required 
                        class="form-control"
                    >
                </div>

                <div class="form-group">
                    <label for="address_line1">Address Line 1 *</label>
                    <input 
                        type="text" 
                        id="address_line1" 
                        name="address_line1" 
                        value="${address?.address_line1 || ''}"
                        placeholder="123 Main Street"
                        required 
                        class="form-control"
                    >
                </div>

                <div class="form-group">
                    <label for="address_line2">Address Line 2 (Optional)</label>
                    <input 
                        type="text" 
                        id="address_line2" 
                        name="address_line2" 
                        value="${address?.address_line2 || ''}"
                        placeholder="Apartment 4B"
                        class="form-control"
                    >
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="city">City *</label>
                        <input 
                            type="text" 
                            id="city" 
                            name="city" 
                            value="${address?.city || ''}"
                            placeholder="Colombo"
                            required 
                            class="form-control"
                        >
                    </div>

                    <div class="form-group">
                        <label for="postal_code">Postal Code *</label>
                        <input 
                            type="text" 
                            id="postal_code" 
                            name="postal_code" 
                            value="${address?.postal_code || ''}"
                            placeholder="00100"
                            required 
                            class="form-control"
                        >
                    </div>
                </div>

                <div class="form-group">
                    <label for="country">Country</label>
                    <input 
                        type="text" 
                        id="country" 
                        name="country" 
                        value="${address?.country || 'Sri Lanka'}"
                        disabled 
                        class="form-control"
                    >
                </div>

                ${!isEdit ? `
                    <div class="form-group checkbox">
                        <label>
                            <input 
                                type="checkbox" 
                                id="is_default" 
                                name="is_default"
                            >
                            Set as default address
                        </label>
                    </div>
                ` : ''}

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-lg">
                        ${submitBtn}
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="toggleAddressForm()">
                        Cancel
                    </button>
                </div>

                <div id="form-message"></div>
            </form>
        </div>
    `;
}

/**
 * Handle address form submission
 */
async function submitAddressForm(event, addressId = null) {
    event.preventDefault();

    try {
        const form = document.getElementById('address-form');
        const formData = new FormData(form);

        const addressData = {
            full_name: formData.get('full_name'),
            phone: formData.get('phone'),
            address_line1: formData.get('address_line1'),
            address_line2: formData.get('address_line2'),
            city: formData.get('city'),
            postal_code: formData.get('postal_code'),
            country: formData.get('country'),
            is_default: formData.get('is_default') === 'on'
        };

        // Validate
        if (!addressData.full_name || !addressData.phone || !addressData.address_line1 || 
            !addressData.city || !addressData.postal_code) {
            showFormMessage('Please fill in all required fields', 'error');
            return;
        }

        showFormMessage('Saving...', 'info');

        let result;
        if (addressId) {
            // Update existing
            result = await updateAddress(addressId, addressData);
        } else {
            // Add new
            result = await addAddress(addressData);
        }

        if (result.success) {
            showFormMessage(
                addressId ? 'Address updated successfully!' : 'Address added successfully!',
                'success'
            );

            setTimeout(() => {
                toggleAddressForm();
                displayAddresses();
            }, 1500);
        } else {
            showFormMessage(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showFormMessage(`Error: ${error.message}`, 'error');
    }
}

/**
 * Load address for editing
 */
async function editAddress(addressId) {
    try {
        const addresses = await getUserAddresses();
        const address = addresses.find(a => a.id === addressId);

        if (!address) {
            alert('Address not found');
            return;
        }

        const formContainer = document.getElementById('address-form-container');
        formContainer.innerHTML = createAddressForm(address);
        formContainer.style.display = 'block';
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('Error loading address:', error);
        alert('Error loading address: ' + error.message);
    }
}

/**
 * Set address as default
 */
async function setAsDefault(addressId) {
    try {
        const result = await setDefaultAddress(addressId);

        if (result.success) {
            showNotification('Default address updated!', 'success');
            displayAddresses();
        } else {
            showNotification(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error setting default:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Confirm delete
 */
function confirmDelete(addressId, name) {
    if (confirm(`Delete address "${name}"? This cannot be undone.`)) {
        deleteAddressConfirmed(addressId);
    }
}

/**
 * Delete address
 */
async function deleteAddressConfirmed(addressId) {
    try {
        const result = await deleteAddress(addressId);

        if (result.success) {
            showNotification('Address deleted', 'success');
            displayAddresses();
        } else {
            showNotification(`Error: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting address:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Show form message
 */
function showFormMessage(message, type = 'info') {
    const messageDiv = document.getElementById('form-message');
    if (!messageDiv) return;

    messageDiv.textContent = message;
    messageDiv.className = `form-message alert alert-${type}`;
}

/**
 * Show notification (toast)
 */
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export functions to global window immediately (before DOMContentLoaded)
window.displayAddresses = displayAddresses;
window.toggleAddressForm = toggleAddressForm;
window.submitAddressForm = submitAddressForm;
window.editAddress = editAddress;
window.setAsDefault = setAsDefault;
window.confirmDelete = confirmDelete;
window.deleteAddressConfirmed = deleteAddressConfirmed;
window.showFormMessage = showFormMessage;
window.showNotification = showNotification;

console.log('[AddressUI] Functions exported to window object');

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for supabase to be initialized
    await window.ensureSupabase();
    // Then display addresses
    displayAddresses();
});
