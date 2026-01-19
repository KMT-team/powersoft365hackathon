/**
 * main.js
 * 
 * The Controller.
 * Imports Store and UI. Wires events.
 */

import * as Store from './store.js';
import * as UI from './ui.js';

// --- State Variables ---
let currentFilter = 'all';
let currentRole = 'admin'; // 'admin' or 'employee'

// --- Global Actions (Must be attached to window for HTML onclick attributes) ---
window.handleSell = (productId, variantIndex) => {
    const success = Store.sellItem(productId, variantIndex);
    if (success) {
        refreshUI();
    }
};

window.handleEdit = (productId) => {
    const product = Store.getInventory().find(p => p.id === productId);
    if (product) {
        UI.populateEditModal(product, currentRole);
        document.getElementById('edit-item-modal').classList.remove('hidden');
    }
};

// --- DOM Elements ---
// Add Item Modal
const modal = document.getElementById('add-item-modal');
const form = document.getElementById('add-product-form');
const btnAddItem = document.getElementById('btn-add-item');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');

// Edit Item Modal
const editModal = document.getElementById('edit-item-modal');
const editForm = document.getElementById('edit-product-form');
const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
const btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');
const btnDeleteProduct = document.getElementById('btn-delete-product');

// Deactivation Elements
const btnDeactivate = document.getElementById('btn-deactivate-product');
const btnActivate = document.getElementById('btn-activate-product');
const reasonSelect = document.getElementById('deactivation-reason');

const filterButtons = document.querySelectorAll('.filter-btn');
const roleButtons = document.querySelectorAll('.role-btn');

// --- Initialization ---
function init() {
    console.log("App Starting...");
    refreshUI();
    setupEventListeners();
}

/**
 * Refreshes the entire UI based on current store state and filters.
 */
function refreshUI() {
    // 1. Get data
    const allProducts = Store.getInventory();
    const logs = Store.getLogs();

    // 2. Filter data
    const filteredProducts = allProducts.filter(product => {
        if (currentFilter === 'all') return true;
        return product.category === currentFilter;
    });

    // 3. Render
    UI.renderInventory(filteredProducts);
    UI.renderLogs(logs);
}

/**
 * Helper to create a variant row HTML string
 */
function getVariantRowHTML() {
    return `
        <input type="text" placeholder="Color" class="variant-color col-span-3 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500">
        <select class="variant-size col-span-2 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500">
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Large">Large</option>
            <option value="XLarge">XLarge</option>
            <option value="XXLarge">XXLarge</option>
            <option value="OneSize">OneSize</option>
        </select>
        <input type="number" value="0" min="0" placeholder="Stock" class="variant-stock col-span-5 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500">
        <button type="button" class="btn-remove-variant col-span-2 text-red-400 hover:text-red-600 flex justify-center items-center" title="Remove Variant">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
}

/**
 * Sets up all click handles and form submissions.
 */
function setupEventListeners() {

    // --- Role Switcher ---
    roleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentRole = btn.dataset.role;

            // Update Active State of Buttons
            roleButtons.forEach(b => {
                if (b.dataset.role === currentRole) {
                    b.classList.remove('text-slate-400', 'hover:text-white');
                    b.classList.add('bg-indigo-600', 'text-white');
                } else {
                    b.classList.add('text-slate-400', 'hover:text-white');
                    b.classList.remove('bg-indigo-600', 'text-white');
                }
            });

            console.log(`Role switched to: ${currentRole}`);
            // Note: We don't necessarily need to refreshUI here unless visually things change in the grid
            // But if we wanted to hide "Add Product" button for employees, we would.
            // For now, simple Role switch.

            // Hide "Add Product" button if employee
            if (currentRole === 'employee') {
                btnAddItem.classList.add('hidden');
            } else {
                btnAddItem.classList.remove('hidden');
            }
        });
    });

    // --- Add Item Modal Toggles ---
    const openAddModal = () => {
        modal.classList.remove('hidden');
        // Reset variants to just one empty row
        const container = document.getElementById('add-variants-container');
        container.innerHTML = '';
        const row = document.createElement('div');
        row.className = 'variant-row grid grid-cols-12 gap-2 items-center text-sm';
        row.innerHTML = getVariantRowHTML();
        container.appendChild(row);
    };
    const closeAddModal = () => modal.classList.add('hidden');

    btnAddItem.addEventListener('click', openAddModal);
    btnCloseModal.addEventListener('click', closeAddModal);
    btnCancelModal.addEventListener('click', closeAddModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAddModal();
    });

    // --- Dynamic Variant Management (Add Modal) ---
    const btnAddVariantNew = document.getElementById('btn-add-variant-new');
    const addVariantsContainer = document.getElementById('add-variants-container');

    btnAddVariantNew.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'variant-row grid grid-cols-12 gap-2 items-center text-sm animate-fade-in';
        row.innerHTML = getVariantRowHTML();
        addVariantsContainer.appendChild(row);
    });

    addVariantsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-remove-variant');
        if (btn) {
            btn.parentElement.remove();
        }
    });


    // --- Edit Item Modal Toggles ---
    const closeEditModal = () => editModal.classList.add('hidden');

    btnCloseEditModal.addEventListener('click', closeEditModal);
    btnCancelEditModal.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });

    // --- Dynamic Variant Management (Edit Modal) ---
    const btnAddVariantEdit = document.getElementById('btn-add-variant');
    const editVariantsContainer = document.getElementById('edit-variants-container');

    btnAddVariantEdit.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'variant-row grid grid-cols-12 gap-2 items-center text-sm animate-fade-in';
        row.innerHTML = getVariantRowHTML();
        editVariantsContainer.appendChild(row);
    });

    editVariantsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-remove-variant');
        if (btn) {
            btn.parentElement.remove();
        }
    });

    // --- Form Submissions ---

    // 1. Add Item Form
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        // Scrape dynamic variants from Add Modal
        const variantRows = document.querySelectorAll('#add-variants-container .variant-row');
        const variants = Array.from(variantRows).map(row => ({
            color: row.querySelector('.variant-color').value,
            size: row.querySelector('.variant-size').value,
            stock: parseInt(row.querySelector('.variant-stock').value) || 0
        })).filter(v => v.color && v.size);

        if (variants.length === 0) {
            alert("Please add at least one valid variant (Color & Size required).");
            return;
        }

        const newProduct = {
            name: formData.get('name'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            variants: variants
        };
        Store.addProduct(newProduct);
        refreshUI();
        form.reset();
        closeAddModal();
    });

    // 2. Edit Item Form (Dynamic Scrape)
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Prevent Employees from saving edits via enter key or hacked form
        if (currentRole === 'employee') return;

        const formData = new FormData(editForm);
        const id = parseInt(formData.get('id'));

        // Scrape dynamic variants from Edit Modal
        const variantRows = document.querySelectorAll('#edit-variants-container .variant-row');
        const updatedVariants = Array.from(variantRows).map(row => ({
            color: row.querySelector('.variant-color').value,
            size: row.querySelector('.variant-size').value,
            stock: parseInt(row.querySelector('.variant-stock').value) || 0
        })).filter(v => v.color && v.size);

        const updatedData = {
            name: formData.get('name'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            variants: updatedVariants
        };

        Store.updateProduct(id, updatedData);
        refreshUI();
        closeEditModal();
    });

    // --- Delete Product Logic (Admin Only) ---
    btnDeleteProduct.addEventListener('click', () => {
        if (currentRole === 'employee') return;

        const id = parseInt(document.getElementById('edit-product-id').value);
        if (confirm("Are you sure you want to delete this product?")) {
            Store.deleteProduct(id);
            refreshUI();
            closeEditModal();
        }
    });

    // --- Deactivation / Activation Logic (Employee Only) ---
    btnDeactivate.addEventListener('click', () => {
        const id = parseInt(document.getElementById('edit-product-id').value);
        const reason = reasonSelect.value;

        if (!reason) {
            alert("Please select a reason for deactivation.");
            return;
        }

        Store.toggleProductStatus(id, false, reason);
        refreshUI();
        closeEditModal();
    });

    btnActivate.addEventListener('click', () => {
        const id = parseInt(document.getElementById('edit-product-id').value);
        Store.toggleProductStatus(id, true);
        refreshUI();
        closeEditModal();
    });

    // --- Filtering ---
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => {
                b.classList.remove('bg-gray-200', 'text-gray-700', 'active');
                b.classList.add('text-gray-600', 'hover:bg-gray-100');
            });
            btn.classList.remove('text-gray-600', 'hover:bg-gray-100');
            btn.classList.add('bg-gray-200', 'text-gray-700', 'active');

            currentFilter = btn.dataset.filter;
            refreshUI();
        });
    });
}

// Start the app
init();
