/**
 * classroom.js - Middleware for ModaPro Classroom
 */

// ==================== STORAGE & DATA ====================
const STORAGE_KEY_INVENTORY = 'sim_inventory_v1';
const STORAGE_KEY_LOGS = 'sim_inventory_logs_v1';

const INITIAL_INVENTORY = [{
    id: 1705650123456,
    name: 'Oxford Shirt',
    category: 'Men',
    price: 45.00,
    active: true,
    editable: false,
    variants: [
        { color: 'White', size: 'M', stock: 12 },
        { color: 'Blue', size: 'L', stock: 8 }
    ]
}];

function loadFromStorage(key, defaultVal) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultVal;
    } catch (e) {
        return defaultVal;
    }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Storage error:', e);
    }
}

let inventory = loadFromStorage(STORAGE_KEY_INVENTORY, INITIAL_INVENTORY.slice());
let logs = loadFromStorage(STORAGE_KEY_LOGS, []);

// ==================== OPERATIONS ====================
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
    product.editable = true;
    product.variants = [];
    inventory.unshift(product);
    logs.unshift(`${timestamp()} - Added: ${product.name}`);
    persistState();
}

function updateProduct(id, data) {
    const idx = inventory.findIndex(p => p.id === id);
    if (idx === -1) return false;
    if (inventory[idx].editable === false) return false;
    inventory[idx] = { ...inventory[idx], ...data };
    logs.unshift(`${timestamp()} - Updated: ${inventory[idx].name}`);
    persistState();
    return true;
}

function deleteProduct(id) {
    const product = findProduct(id);
    if (!product || product.editable === false) return false;
    inventory = inventory.filter(p => p.id !== id);
    logs.unshift(`${timestamp()} - Deleted: ${product.name}`);
    persistState();
    return true;
}

function sellItem(productId, variantIndex) {
    const product = findProduct(productId);
    if (!product || !product.active || product.editable === false) return false;
    const variant = product.variants[variantIndex];
    if (!variant || variant.stock <= 0) return false;
    variant.stock--;
    logs.unshift(`${timestamp()} - Sold: ${product.name} (${variant.color}/${variant.size})`);
    persistState();
    return true;
}

function damageItem(productId, variantIndex) {
    const product = findProduct(productId);
    if (!product || !product.active || product.editable === false) return false;
    const variant = product.variants[variantIndex];
    if (!variant || variant.stock <= 0) return false;
    variant.stock--;
    logs.unshift(`${timestamp()} - Damaged: ${product.name} (${variant.color}/${variant.size})`);
    persistState();
    return true;
}

function addVariant(productId, variant) {
    const product = findProduct(productId);
    if (!product || product.editable === false) return false;
    product.variants.push(variant);
    logs.unshift(`${timestamp()} - Added variant: ${product.name}`);
    persistState();
    return true;
}

function updateVariant(productId, variantIndex, data) {
    const product = findProduct(productId);
    if (!product || product.editable === false) return false;
    if (!product.variants[variantIndex]) return false;
    product.variants[variantIndex] = { ...product.variants[variantIndex], ...data };
    logs.unshift(`${timestamp()} - Updated variant: ${product.name}`);
    persistState();
    return true;
}

function timestamp() {
    return new Date().toLocaleTimeString();
}

// ==================== UI ELEMENTS ====================
const elements = {
    inventoryGrid: document.getElementById('sim-inventory-grid'),
    transactionLog: document.getElementById('sim-transaction-log'),
    addModal: document.getElementById('sim-add-item-modal'),
    addForm: document.getElementById('sim-add-product-form'),
    editModal: document.getElementById('sim-edit-item-modal'),
    editForm: document.getElementById('sim-edit-product-form'),
    variantModal: document.getElementById('sim-variant-modal'),
    variantForm: document.getElementById('sim-variant-form'),
    editVariantModal: document.getElementById('sim-edit-variant-modal'),
    editVariantForm: document.getElementById('sim-edit-variant-form'),
    addBtn: document.getElementById('sim-btn-add-item'),
    chatHistory: document.getElementById('tutor-chat-history'),
    userInput: document.getElementById('tutor-user-input'),
    sendBtn: document.getElementById('tutor-send-btn'),
    modeSelector: document.getElementById('tutor-instructor-mode')
};

// ==================== RENDERING ====================
function createProductCard(product) {
    const variantsHTML = product.variants.map((v, i) => {
        const isOut = v.stock <= 0;
        const isDefault = product.editable === false;
        return `
            <div class="variant-row">
                <div class="variant-info">${v.color} / ${v.size}</div>
                <div class="variant-stock ${isOut ? 'out' : ''}">${isOut ? 'Sold Out' : v.stock + ' left'}</div>
                <button class="btn btn-sm btn-secondary sell-btn" data-id="${product.id}" data-variant="${i}" ${isOut || isDefault ? 'disabled' : ''}>Sell</button>
                <button class="btn btn-sm btn-success damage-btn" data-id="${product.id}" data-variant="${i}" ${isOut || isDefault ? 'disabled' : ''}>Damage</button>
                ${!isDefault ? `<button class="btn btn-sm btn-secondary edit-variant-btn" data-id="${product.id}" data-variant="${i}">Edit</button>` : ''}
            </div>`;
    }).join('');

    const cardClass = product.editable === false ? 'sim-card default-item' : 'sim-card';
    const actionButtons = product.editable === false 
        ? '<span class="badge default">DEFAULT</span>'
        : `
            <button class="btn btn-sm btn-secondary edit-btn" data-id="${product.id}">Edit</button>
            <button class="btn btn-sm btn-success delete-btn" data-id="${product.id}">Delete</button>
        `;

    return `
        <div class="${cardClass}">
            <div class="card-head">
                <div>
                    <div class="category">${product.category}</div>
                    <h3 class="title">${product.name}</h3>
                    <div class="price">€${product.price.toFixed(2)}</div>
                </div>
                <div class="card-actions">
                    ${actionButtons}
                </div>
            </div>
            <div class="card-body">${variantsHTML || '<p class="muted" style="font-size: 13px; margin: 10px 0;">No variants yet</p>'}</div>
            ${product.editable !== false ? `<button class="btn btn-sm btn-secondary" style="margin-top: 12px; width: 100%; font-weight: 700;" onclick="openVariantModal(${product.id})">+ Add Variant</button>` : ''}
        </div>`;
}

function renderInventory() {
    if (!elements.inventoryGrid) return;
    if (inventory.length === 0) {
        elements.inventoryGrid.innerHTML = '<div class="empty-state">No products yet.</div>';
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
    elements.transactionLog.innerHTML = logs.slice(0, 50).map(l => `<div class="log-item">${l}</div>`).join('');
}

// ==================== MODALS ====================
function openModal(modal) {
    if (modal) modal.classList.remove('hidden');
}

function closeModal(modal) {
    if (modal) modal.classList.add('hidden');
}

function showToast(msg, success = true) {
    const t = document.createElement('div');
    t.className = `toast ${success ? 'toast-success' : 'toast-error'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('visible'), 10);
    setTimeout(() => {
        t.classList.remove('visible');
        setTimeout(() => t.remove(), 300);
    }, 2500);
}

window.openVariantModal = (productId) => {
    const product = findProduct(productId);
    if (!product || product.editable === false) return;
    if (elements.variantForm) {
        elements.variantForm.dataset.productId = productId;
    }
    openModal(elements.variantModal);
};

window.openEditVariantModal = (productId, variantIndex) => {
    const product = findProduct(productId);
    if (!product || product.editable === false) return;
    const variant = product.variants[variantIndex];
    if (!variant) return;
    if (elements.editVariantForm) {
        elements.editVariantForm.dataset.productId = productId;
        elements.editVariantForm.dataset.variantIndex = variantIndex;
        elements.editVariantForm.elements['color'].value = variant.color;
        elements.editVariantForm.elements['size'].value = variant.size;
        elements.editVariantForm.elements['stock'].value = variant.stock;
    }
    openModal(elements.editVariantModal);
};

// ==================== TUTOR CHAT ====================
function addMessage(text, sender) {
    if (!elements.chatHistory) return;
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('tutor-message', 'tutor-' + sender);
    const bubble = document.createElement('div');
    bubble.classList.add('tutor-bubble');
    bubble.textContent = text;
    msgDiv.appendChild(bubble);
    elements.chatHistory.appendChild(msgDiv);
    elements.chatHistory.scrollTop = elements.chatHistory.scrollHeight;
}

function sendMessage() {
    if (!elements.userInput) return;
    const text = elements.userInput.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    elements.userInput.value = '';
    elements.userInput.focus();
    setTimeout(() => {
        addMessage('AI features are currently disabled. This is a placeholder interface.', 'bot');
    }, 500);
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    renderInventory();
    renderLogs();

    if (elements.addBtn) {
        elements.addBtn.addEventListener('click', () => openModal(elements.addModal));
    }

    if (elements.addForm) {
        elements.addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(elements.addForm);
            const name = fd.get('name')?.trim();
            const category = fd.get('category');
            const price = parseFloat(fd.get('price')) || 0;
            if (!name) {
                showToast('Name required', false);
                return;
            }
            addProduct({ name, category, price });
            elements.addForm.reset();
            closeModal(elements.addModal);
            renderInventory();
            renderLogs();
            showToast('Product added');
        });
    }

    if (elements.editForm) {
        elements.editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = parseInt(elements.editForm.elements['id'].value);
            const name = elements.editForm.elements['name'].value.trim();
            const category = elements.editForm.elements['category'].value;
            const price = parseFloat(elements.editForm.elements['price'].value) || 0;
            const ok = updateProduct(id, { name, category, price });
            if (!ok) {
                showToast('Cannot update', false);
                return;
            }
            closeModal(elements.editModal);
            renderInventory();
            renderLogs();
            showToast('Product updated');
        });
    }

    if (elements.variantForm) {
        elements.variantForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const productId = parseInt(elements.variantForm.dataset.productId);
            const fd = new FormData(elements.variantForm);
            const color = fd.get('color')?.trim();
            const size = fd.get('size');
            const stock = parseInt(fd.get('stock')) || 0;
            if (!color) {
                showToast('Color required', false);
                return;
            }
            const ok = addVariant(productId, { color, size, stock });
            if (!ok) {
                showToast('Cannot add variant', false);
                return;
            }
            elements.variantForm.reset();
            closeModal(elements.variantModal);
            renderInventory();
            renderLogs();
            showToast('Variant added');
        });
    }

    if (elements.editVariantForm) {
        elements.editVariantForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const productId = parseInt(elements.editVariantForm.dataset.productId);
            const variantIndex = parseInt(elements.editVariantForm.dataset.variantIndex);
            const fd = new FormData(elements.editVariantForm);
            const color = fd.get('color')?.trim();
            const size = fd.get('size');
            const stock = parseInt(fd.get('stock')) || 0;
            if (!color) {
                showToast('Color required', false);
                return;
            }
            const ok = updateVariant(productId, variantIndex, { color, size, stock });
            if (!ok) {
                showToast('Cannot update variant', false);
                return;
            }
            closeModal(elements.editVariantModal);
            renderInventory();
            renderLogs();
            showToast('Variant updated');
        });
    }

    document.addEventListener('click', (e) => {
        const t = e.target;

        if (t.id === 'sim-btn-close-modal' || t.id === 'sim-btn-cancel-modal') {
            closeModal(elements.addModal);
        }
        if (t.id === 'sim-btn-close-edit-modal' || t.id === 'sim-btn-cancel-edit-modal') {
            closeModal(elements.editModal);
        }
        if (t.id === 'sim-btn-close-variant-modal' || t.id === 'sim-btn-cancel-variant-modal') {
            closeModal(elements.variantModal);
        }
        if (t.id === 'sim-btn-close-edit-variant-modal' || t.id === 'sim-btn-cancel-edit-variant-modal') {
            closeModal(elements.editVariantModal);
        }

        if (t.classList.contains('sell-btn')) {
            const pid = parseInt(t.dataset.id);
            const vi = parseInt(t.dataset.variant);
            const ok = sellItem(pid, vi);
            if (ok) {
                renderInventory();
                renderLogs();
                showToast('Sold 1 unit');
            } else {
                showToast('Unable to sell', false);
            }
        }

        if (t.classList.contains('damage-btn')) {
            const pid = parseInt(t.dataset.id);
            const vi = parseInt(t.dataset.variant);
            const ok = damageItem(pid, vi);
            if (ok) {
                renderInventory();
                renderLogs();
                showToast('Marked as damaged');
            } else {
                showToast('Unable to mark damaged', false);
            }
        }

        if (t.classList.contains('edit-variant-btn')) {
            const pid = parseInt(t.dataset.id);
            const vi = parseInt(t.dataset.variant);
            window.openEditVariantModal(pid, vi);
        }

        if (t.classList.contains('edit-btn')) {
            const pid = parseInt(t.dataset.id);
            const product = findProduct(pid);
            if (!product || product.editable === false) return;
            elements.editForm.elements['id'].value = product.id;
            elements.editForm.elements['name'].value = product.name;
            elements.editForm.elements['category'].value = product.category;
            elements.editForm.elements['price'].value = product.price;
            openModal(elements.editModal);
        }

        if (t.classList.contains('delete-btn')) {
            const pid = parseInt(t.dataset.id);
            const product = findProduct(pid);
            if (!product || product.editable === false) return;
            if (confirm('Delete this product?')) {
                deleteProduct(pid);
                renderInventory();
                renderLogs();
                showToast('Product deleted');
            }
        }
    });

    if (elements.sendBtn) {
        elements.sendBtn.addEventListener('click', sendMessage);
    }
    if (elements.userInput) {
        elements.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    if (elements.modeSelector) {
        elements.modeSelector.addEventListener('change', () => {
            console.log('Mode:', elements.modeSelector.value);
        });
    }
});
