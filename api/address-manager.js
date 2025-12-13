// ============================================
// address-manager.js
// Address management & validation
// Fixes Issue #3 (Cannot Place Order Without Address)
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
 * Get user's addresses
 */
async function getUserAddresses() {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            console.error('User not authenticated');
            return [];
        }

        const { data, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', session.user.id)
            .order('is_default', { ascending: false });

        if (error) {
            console.error('Failed to get addresses:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching addresses:', error);
        return [];
    }
}

/**
 * Get default address
 */
async function getDefaultAddress() {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return null;

        const { data, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('is_default', true)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned (not an error)
            console.error('Failed to get default address:', error);
        }

        return data || null;
    } catch (error) {
        console.error('Error fetching default address:', error);
        return null;
    }
}

/**
 * Add new address
 * Issue #3: Allow user to add address
 */
async function addAddress(addressData) {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return { success: false, error: 'Not authenticated' };
        }

        // Validate required fields
        const required = ['full_name', 'phone', 'address_line1', 'city', 'postal_code'];
        for (const field of required) {
            if (!addressData[field]) {
                return { success: false, error: `${field} is required` };
            }
        }

        const { data, error } = await supabase
            .from('addresses')
            .insert({
                user_id: session.user.id,
                full_name: addressData.full_name,
                phone: addressData.phone,
                address_line1: addressData.address_line1,
                address_line2: addressData.address_line2 || '',
                city: addressData.city,
                postal_code: addressData.postal_code,
                country: addressData.country || 'Sri Lanka',
                is_default: addressData.is_default || false
            })
            .select();

        if (error) {
            console.error('Failed to add address:', error);
            return { success: false, error: error.message };
        }

        console.log('✓ Address added:', data);
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error adding address:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update address
 */
async function updateAddress(addressId, addressData) {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return { success: false, error: 'Not authenticated' };
        }

        const { data, error } = await supabase
            .from('addresses')
            .update(addressData)
            .eq('id', addressId)
            .eq('user_id', session.user.id)
            .select();

        if (error) {
            console.error('Failed to update address:', error);
            return { success: false, error: error.message };
        }

        console.log('✓ Address updated:', data);
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error updating address:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete address
 */
async function deleteAddress(addressId) {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return { success: false, error: 'Not authenticated' };
        }

        const { error } = await supabase
            .from('addresses')
            .delete()
            .eq('id', addressId)
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Failed to delete address:', error);
            return { success: false, error: error.message };
        }

        console.log('✓ Address deleted');
        return { success: true };
    } catch (error) {
        console.error('Error deleting address:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Set default address
 */
async function setDefaultAddress(addressId) {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return { success: false, error: 'Not authenticated' };
        }

        // Clear previous default
        await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', session.user.id);

        // Set new default
        const { data, error } = await supabase
            .from('addresses')
            .update({ is_default: true })
            .eq('id', addressId)
            .eq('user_id', session.user.id)
            .select();

        if (error) {
            console.error('Failed to set default address:', error);
            return { success: false, error: error.message };
        }

        console.log('✓ Default address set:', data);
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error setting default address:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if user has at least one address
 * Issue #3: Validate before order
 */
async function hasAddress() {
    try {
        const addresses = await getUserAddresses();
        return addresses.length > 0;
    } catch (error) {
        console.error('Error checking addresses:', error);
        return false;
    }
}

/**
 * Validate address before checkout
 * Issue #3: Block order without address
 */
async function validateAddressForCheckout() {
    try {
        supabase = await ensureSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return { valid: false, error: 'Please log in first' };
        }

        const addresses = await getUserAddresses();

        if (addresses.length === 0) {
            return {
                valid: false,
                error: 'No address found. Please add an address to proceed.',
                action: 'Go to Account'
            };
        }

        const defaultAddress = addresses.find(a => a.is_default);

        if (!defaultAddress) {
            return {
                valid: false,
                error: 'No default address set. Please select one.',
                action: 'Go to Account'
            };
        }

        return { valid: true, address: defaultAddress };
    } catch (error) {
        console.error('Error validating address:', error);
        return { valid: false, error: error.message };
    }
}

/**
 * Display address form (for inline checkout)
 * Issue #3: Quick address form in checkout
 */
function createAddressForm() {
    return `
        <div id="address-form" class="address-form">
            <h3>Delivery Address</h3>
            <form id="quick-address-form">
                <div class="form-group">
                    <label>Full Name *</label>
                    <input type="text" name="full_name" required class="form-control">
                </div>
                <div class="form-group">
                    <label>Phone *</label>
                    <input type="tel" name="phone" required class="form-control">
                </div>
                <div class="form-group">
                    <label>Address Line 1 *</label>
                    <input type="text" name="address_line1" required class="form-control">
                </div>
                <div class="form-group">
                    <label>Address Line 2 (Optional)</label>
                    <input type="text" name="address_line2" class="form-control">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>City *</label>
                        <input type="text" name="city" required class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Postal Code *</label>
                        <input type="text" name="postal_code" required class="form-control">
                    </div>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="is_default">
                        Set as default address
                    </label>
                </div>
                <button type="submit" class="btn btn-primary">Save Address</button>
            </form>
        </div>
    `;
}

// Export functions to global window
window.getUserAddresses = getUserAddresses;
window.getDefaultAddress = getDefaultAddress;
window.addAddress = addAddress;
window.updateAddress = updateAddress;
window.deleteAddress = deleteAddress;
window.setDefaultAddress = setDefaultAddress;
window.hasAddress = hasAddress;
window.validateAddressForCheckout = validateAddressForCheckout;
window.createAddressForm = createAddressForm;
