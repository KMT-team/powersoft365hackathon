/**
 * simulator-main.js
 * 
 * Controller for the Simulator.
 * Imports simulator-store.js and simulator-ui.js.
 */

import * as Store from './simulator-store.js';
import * as UI from './simulator-ui.js';

let currentFilter = 'all';
let currentRole = 'admin';

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
        document.getElementById('sim-edit-item-modal').classList.remove('hidden');
    }
};

// DOM Elements
const modal = document.getElementById('sim-add-item-modal');
const form = document.getElementById('sim-add-product-form');
const btnAddItem = document.getElementById('sim-btn-add-item');
const btnCloseModal = document.getElementById('sim-btn-close-modal');
const btnCancelModal = document.getElementById('sim-btn-cancel-modal');

const editModal = document.getElementById('sim-edit-item-modal');
const editForm = document.getElementById('sim-edit-product-form');
const btnCloseEditModal = document.getElementById('sim-btn-close-edit-modal');
const btnCancelEditModal = document.getElementById('sim-btn-cancel-edit-modal');
const btnDeleteProduct = document.getElementById('sim-btn-delete-product');

const btnDeactivate = document.getElementById('sim-btn-deactivate-product');
const btnActivate = document.getElementById('sim-btn-activate-product');
const reasonSelect = document.getElementById('sim-deactivation-reason');

// Note: Ensure dynamic classes in HTML also match namespacing
const filterButtons = document.querySelectorAll('.sim-filter-btn');
const roleButtons = document.querySelectorAll('.sim-role-btn');

function init() {
    console.log("Simulator App Starting...");
    refreshUI();
    setupEventListeners();
}

function refreshUI() {
    refreshInventory();
    refreshLogs();
}

function refreshInventory() {
    const allProducts = Store.getInventory();
    const filteredProducts = allProducts.filter(product => {
        if (currentFilter === 'all') return true;
        return product.category === currentFilter;
    });
    UI.renderInventory(filteredProducts);
}

function refreshLogs() {
    const logs = Store.getLogs();
    UI.renderLogs(logs);
}

function getVariantRowHTML() {
    return `
        <input type="text" placeholder="Color" class="sim-variant-color col-span-3 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500">
        <select class="sim-variant-size col-span-2 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500">
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Large">Large</option>
            <option value="XLarge">XLarge</option>
            <option value="XXLarge">XXLarge</option>
            <option value="OneSize">OneSize</option>
        </select>
        <input type="number" value="0" min="0" placeholder="Stock" class="sim-variant-stock col-span-5 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500">
        <button type="button" class="sim-btn-remove-variant col-span-2 text-red-400 hover:text-red-600 flex justify-center items-center" title="Remove Variant">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;
}

function setupEventListeners() {

    // --- Role Switcher ---
    roleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentRole = btn.dataset.role;

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
        const container = document.getElementById('sim-add-variants-container');
        container.innerHTML = '';
        const row = document.createElement('div');
        row.className = 'sim-variant-row grid grid-cols-12 gap-2 items-center text-sm';
        row.innerHTML = getVariantRowHTML();
        container.appendChild(row);
    };
    const closeAddModal = () => modal.classList.add('hidden');

    if (btnAddItem) btnAddItem.addEventListener('click', openAddModal);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeAddModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeAddModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAddModal();
        });
    }

    // --- Dynamic Variant Management (Add Modal) ---
    const btnAddVariantNew = document.getElementById('sim-btn-add-variant-new');
    const addVariantsContainer = document.getElementById('sim-add-variants-container');

    if (btnAddVariantNew) {
        btnAddVariantNew.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'sim-variant-row grid grid-cols-12 gap-2 items-center text-sm animate-fade-in';
            row.innerHTML = getVariantRowHTML();
            addVariantsContainer.appendChild(row);
        });
    }

    if (addVariantsContainer) {
        addVariantsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.sim-btn-remove-variant');
            if (btn) {
                btn.parentElement.remove();
            }
        });
    }

    // --- Edit Item Modal Toggles ---
    const closeEditModal = () => editModal.classList.add('hidden');

    if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', closeEditModal);
    if (btnCancelEditModal) btnCancelEditModal.addEventListener('click', closeEditModal);
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }

    // --- Dynamic Variant Management (Edit Modal) ---
    const btnAddVariantEdit = document.getElementById('sim-btn-add-variant');
    const editVariantsContainer = document.getElementById('sim-edit-variants-container');

    if (btnAddVariantEdit) {
        btnAddVariantEdit.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'sim-variant-row grid grid-cols-12 gap-2 items-center text-sm animate-fade-in';
            row.innerHTML = getVariantRowHTML();
            editVariantsContainer.appendChild(row);
        });
    }

    if (editVariantsContainer) {
        editVariantsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.sim-btn-remove-variant');
            if (btn) {
                btn.parentElement.remove();
            }
        });
    }

    // --- Form Submissions ---
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);

            const variantRows = document.querySelectorAll('#sim-add-variants-container .sim-variant-row');
            const variants = Array.from(variantRows).map(row => ({
                color: row.querySelector('.sim-variant-color').value,
                size: row.querySelector('.sim-variant-size').value,
                stock: parseInt(row.querySelector('.sim-variant-stock').value) || 0
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
    }

    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (currentRole === 'employee') return;

            const formData = new FormData(editForm);
            const id = parseInt(formData.get('id'));

            const variantRows = document.querySelectorAll('#sim-edit-variants-container .sim-variant-row');
            const updatedVariants = Array.from(variantRows).map(row => ({
                color: row.querySelector('.sim-variant-color').value,
                size: row.querySelector('.sim-variant-size').value,
                stock: parseInt(row.querySelector('.sim-variant-stock').value) || 0
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
    }

    // --- Delete Product Logic ---
    if (btnDeleteProduct) {
        btnDeleteProduct.addEventListener('click', () => {
            if (currentRole === 'employee') return;
            const id = parseInt(document.getElementById('sim-edit-product-id').value);
            if (confirm("Are you sure you want to delete this product?")) {
                Store.deleteProduct(id);
                refreshUI();
                closeEditModal();
            }
        });
    }

    // --- Deactivation / Activation Logic ---
    if (btnDeactivate) {
        btnDeactivate.addEventListener('click', () => {
            const id = parseInt(document.getElementById('sim-edit-product-id').value);
            const reason = reasonSelect.value;
            if (!reason) {
                alert("Please select a reason for deactivation.");
                return;
            }
            Store.toggleProductStatus(id, false, reason);
            refreshUI();
            closeEditModal();
        });
    }

    if (btnActivate) {
        btnActivate.addEventListener('click', () => {
            const id = parseInt(document.getElementById('sim-edit-product-id').value);
            Store.toggleProductStatus(id, true);
            refreshUI();
            closeEditModal();
        });
    }

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
            refreshInventory();
        });
    });
}

init();
