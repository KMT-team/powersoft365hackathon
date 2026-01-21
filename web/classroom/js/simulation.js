/*
  simulation.js
  Main controller for the client-side inventory simulator.
  - Stores data in localStorage so it works for guests and logged-in users
  - Provides add, edit, delete, sell, and logs
  - Keeps code modular and beginner-friendly
*/

// -----------------------------
// Storage & Initial Data
// -----------------------------
const STORAGE_KEY_INVENTORY = 'sim_inventory_v1';
const STORAGE_KEY_LOGS = 'sim_inventory_logs_v1';

const INITIAL_INVENTORY = [
    {
        id: 1705650123456,
        name: 'Classic Oxford Shirt',
        category: 'Men',
        unit: 'piece',
        price: 45.00,
        active: true,
        editable: false, // displayed but not editable
        variants: [ { color: 'White', size: 'M', stock: 12 }, { color: 'Blue', size: 'L', stock: 8 } ]
    }
];

function loadFromStorage(key, defaultVal) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultVal;
    } catch (e) {
        console.error('Error reading storage', e);
        return defaultVal;
    }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving to storage', e);
    }
}

let inventory = loadFromStorage(STORAGE_KEY_INVENTORY, INITIAL_INVENTORY.slice());
let logs = loadFromStorage(STORAGE_KEY_LOGS, []);

// -----------------------------
// Helpers: Inventory operations
// -----------------------------
function findProduct(id) {
    return inventory.find(p => p.id === id);
}

function persistState() {
    saveToStorage(STORAGE_KEY_INVENTORY, inventory);
    saveToStorage(STORAGE_KEY_LOGS, logs);
}

function addProduct(product) {
    product.id = Date.now();
    product.active = true;
    product.editable = product.editable === false ? false : true;
    if (!Array.isArray(product.variants) || product.variants.length === 0) {
        product.variants = [ { color: 'Default', size: 'OneSize', stock: Math.max(0, parseInt(product.quantity || 0)) } ];
    }
    inventory.unshift(product);
    logs.unshift(`${timestamp()} - Added product: ${product.name}`);
    persistState();
}

function updateProduct(id, data) {
    const idx = inventory.findIndex(p => p.id === id);
    if (idx === -1) return false;
    const existing = inventory[idx];
    if (existing.editable === false) return false;
    inventory[idx] = { ...existing, ...data };
    logs.unshift(`${timestamp()} - Updated product: ${inventory[idx].name}`);
    persistState();
    return true;
}

function deleteProduct(id) {
    const idx = inventory.findIndex(p => p.id === id);
    if (idx === -1) return false;
    const [removed] = inventory.splice(idx, 1);
    logs.unshift(`${timestamp()} - Deleted product: ${removed.name}`);
    persistState();
    return true;
}

function sellItem(productId, variantIndex) {
    const product = findProduct(productId);
    if (!product) return false;
    if (!product.active) return false;
    const variant = product.variants[variantIndex];
    if (!variant || variant.stock <= 0) return false;
    variant.stock = Math.max(0, variant.stock - 1);
    logs.unshift(`${timestamp()} - Sold 1 x ${product.name} (${variant.color}/${variant.size})`);
    persistState();
    return true;
}

function timestamp() {
    return new Date().toLocaleString();
}

// -----------------------------
// UI Rendering
// -----------------------------
const elements = {
    inventoryGrid: document.getElementById('sim-inventory-grid'),
    transactionLog: document.getElementById('sim-transaction-log'),
    addModal: document.getElementById('sim-add-item-modal'),
    addForm: document.getElementById('sim-add-product-form'),
    editModal: document.getElementById('sim-edit-item-modal'),
    editForm: document.getElementById('sim-edit-product-form'),
    addBtn: document.getElementById('sim-btn-add-item'),
    refreshBtn: document.getElementById('sim-btn-refresh')
};

function createProductCard(product) {
    const variantsHTML = product.variants.map((variant, index) => {
        const isOut = variant.stock <= 0;
        return `
            <div class="variant-row">
                <div class="variant-info">${variant.color} / ${variant.size}</div>
                <div class="variant-stock ${isOut ? 'out' : ''}">${isOut ? 'Sold Out' : variant.stock + ' left'}</div>
                <button class="btn btn-sm sell-btn" data-id="${product.id}" data-variant="${index}" ${isOut || !product.active ? 'disabled' : ''}>Sell</button>
            </div>`;
    }).join('');

    const inactiveBadge = product.active ? '' : '<span class="badge inactive">INACTIVE</span>';

    return `
        <div class="sim-card">
            <div class="card-head">
                <div>
                    <div class="category">${product.category}</div>
                    <h3 class="title">${product.name}</h3>
                    <div class="price">€${(product.price||0).toFixed(2)}</div>
                </div>
                <div class="card-actions">
                    ${inactiveBadge}
                    <button class="btn btn-sm edit-btn" data-id="${product.id}" ${product.editable===false? 'disabled title="Default item not editable"' : ''}>Edit</button>
                    <button class="btn btn-sm delete-btn" data-id="${product.id}">Delete</button>
                </div>
            </div>
            <div class="card-body">${variantsHTML}</div>
        </div>`;
}

function renderInventory() {
    if (!elements.inventoryGrid) return;
    if (inventory.length === 0) {
        elements.inventoryGrid.innerHTML = `<div class="empty-state">No products yet. Use "Add Product" to get started.</div>`;
        return;
    }
    elements.inventoryGrid.innerHTML = inventory.map(createProductCard).join('');
}

function renderLogs() {
    if (!elements.transactionLog) return;
    if (logs.length === 0) {
        elements.transactionLog.innerHTML = '<p class="muted">No transactions yet.</p>';
        return;
    }
    elements.transactionLog.innerHTML = logs.slice(0,50).map(l => `<div class="log-item">${l}</div>`).join('');
}

// -----------------------------
// UI interactions
// -----------------------------
function openModal(modal) { modal.classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

function showToast(msg, success = true) {
    const t = document.createElement('div');
    t.className = `toast ${success ? 'toast-success' : 'toast-error'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('visible'), 10);
    setTimeout(() => { t.classList.remove('visible'); setTimeout(()=>t.remove(), 300); }, 2500);
}

// Wire global handlers (used in inline onclick for simplicity)
window.handleSell = (productId, variantIndex) => {
    const ok = sellItem(productId, variantIndex);
    if (ok) { renderInventory(); renderLogs(); showToast('Sold 1 unit'); }
    else showToast('Unable to sell', false);
};

window.handleEdit = (productId) => {
    const product = findProduct(productId);
    if (!product) return;
    // populate edit form
    if (!elements.editForm) return;
    elements.editForm.elements['id'].value = product.id;
    elements.editForm.elements['name'].value = product.name;
    elements.editForm.elements['category'].value = product.category;
    elements.editForm.elements['price'].value = product.price;
    elements.editForm.elements['quantity'].value = product.variants && product.variants[0] ? product.variants[0].stock : 0;
    openModal(elements.editModal);
};

// Attach event listeners after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Render initial state
    renderInventory();
    renderLogs();

    // Add product button
    if (elements.addBtn) elements.addBtn.addEventListener('click', () => openModal(elements.addModal));
    if (elements.refreshBtn) elements.refreshBtn.addEventListener('click', () => { renderInventory(); renderLogs(); showToast('Refreshed'); });

    // Add form
    if (elements.addForm) {
        elements.addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(elements.addForm);
            const name = fd.get('name')?.trim();
            const category = fd.get('category');
            const price = parseFloat(fd.get('price')) || 0;
            const quantity = parseInt(fd.get('quantity')) || 0;
            if (!name) { showToast('Name required', false); return; }
            if (quantity < 0) { showToast('Quantity cannot be negative', false); return; }
            addProduct({ name, category, price, quantity, variants: [ { color: 'Default', size: 'OneSize', stock: Math.max(0, quantity) } ] });
            elements.addForm.reset();
            closeModal(elements.addModal);
            renderInventory(); renderLogs(); showToast('Product added');
        });
    }

    // Edit form
    if (elements.editForm) {
        elements.editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = parseInt(elements.editForm.elements['id'].value);
            const name = elements.editForm.elements['name'].value.trim();
            const category = elements.editForm.elements['category'].value;
            const price = parseFloat(elements.editForm.elements['price'].value) || 0;
            const quantity = parseInt(elements.editForm.elements['quantity'].value) || 0;
            if (quantity < 0) { showToast('Quantity cannot be negative', false); return; }
            const ok = updateProduct(id, { name, category, price, variants: [ { color: 'Default', size: 'OneSize', stock: quantity } ] });
            if (!ok) { showToast('Unable to update (maybe default item)', false); return; }
            closeModal(elements.editModal);
            renderInventory(); renderLogs(); showToast('Product updated');
        });
    }

    // Close/cancel buttons in modals
    document.addEventListener('click', (ev) => {
        const t = ev.target;
        if (t.id === 'sim-btn-close-modal' || t.id === 'sim-btn-cancel-modal') closeModal(elements.addModal);
        if (t.id === 'sim-btn-close-edit-modal' || t.id === 'sim-btn-cancel-edit-modal') closeModal(elements.editModal);

        // Delegated actions: sell, edit, delete
        if (t.classList.contains('sell-btn')) {
            const pid = parseInt(t.dataset.id);
            const vi = parseInt(t.dataset.variant);
            const ok = sellItem(pid, vi);
            if (ok) { renderInventory(); renderLogs(); showToast('Sold 1 unit'); }
            else showToast('Unable to sell', false);
        }

        if (t.classList.contains('edit-btn')) {
            const pid = parseInt(t.dataset.id);
            window.handleEdit(pid);
        }

        if (t.classList.contains('delete-btn')) {
            const pid = parseInt(t.dataset.id);
            if (confirm('Delete this product?')) {
                deleteProduct(pid);
                renderInventory(); renderLogs(); showToast('Product deleted');
            }
        }
    });
});

// Exported for debugging (not necessary but useful)
export { inventory, logs, addProduct, updateProduct, deleteProduct, sellItem };