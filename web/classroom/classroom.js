/**
 * classroom.js - ModaPro Inventory Simulation Controller
 * 
 * Manages inventory CRUD operations, localStorage persistence, transaction logging,
 * and UI rendering for the classroom simulator. Supports both guest (localStorage only)
 * and authenticated users (localStorage + backend sync).
 */

// ==================== STORAGE & DATA ====================
// LocalStorage keys for persistent inventory and transaction data
const STORAGE_KEY_INVENTORY = 'sim_inventory_v1';
const STORAGE_KEY_LOGS = 'sim_inventory_logs_v1';

// Initial inventory state for new users/guests
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

/**
 * Load data from browser localStorage with fallback to default value
 * @param {string} key - Storage key
 * @param {*} defaultVal - Default value if key not found or parse fails
 * @returns {*} Parsed data or default value
 */
function loadFromStorage(key, defaultVal) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultVal;
    } catch (e) {
        return defaultVal;
    }
}

/**
 * Save data to browser localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} data - Data to serialize and save
 */
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Storage error:', e);
    }
}

// Initialize inventory and logs from localStorage
let inventory = loadFromStorage(STORAGE_KEY_INVENTORY, INITIAL_INVENTORY.slice());
let logs = loadFromStorage(STORAGE_KEY_LOGS, []);

// ==================== OPERATIONS ====================
/**
 * Find product by ID in inventory array
 * @param {number} id - Product ID
 * @returns {Object|undefined} Product object or undefined
 */
function findProduct(id) {
    return inventory.find(p => p.id === id);
}

/**
 * Persist current inventory and logs to localStorage, trigger exercise log capture
 */
function persistState() {
    saveToStorage(STORAGE_KEY_INVENTORY, inventory);
    saveToStorage(STORAGE_KEY_LOGS, logs);

    // Notify exercise engine of log update
    if (window.addExerciseLog && logs.length > 0) {
        window.addExerciseLog(logs[0]);
    }
}

/**
 * Add new product to inventory
 * @param {Object} product - Product object with name, category, price
 */
function addProduct(product) {
    product.id = Date.now();
    product.active = true;
    product.editable = true;
    product.variants = [];
    inventory.unshift(product);
    logs.unshift(`${timestamp()} - Added: ${product.name}`);
    persistState();
}

/**
 * Update existing product (name, category, price)
 * @param {number} id - Product ID
 * @param {Object} data - Updated fields
 * @returns {boolean} Success status
 */
function updateProduct(id, data) {
    const idx = inventory.findIndex(p => p.id === id);
    if (idx === -1) return false;
    if (inventory[idx].editable === false) return false;
    inventory[idx] = { ...inventory[idx], ...data };
    logs.unshift(`${timestamp()} - Updated: ${inventory[idx].name}`);
    persistState();
    return true;
}

/**
 * Delete product from inventory (only if editable)
 * @param {number} id - Product ID
 * @returns {boolean} Success status
 */
function deleteProduct(id) {
    const product = findProduct(id);
    if (!product || product.editable === false) return false;
    inventory = inventory.filter(p => p.id !== id);
    logs.unshift(`${timestamp()} - Deleted: ${product.name}`);
    persistState();
    return true;
}

/**
 * Sell one unit of product variant, decrement stock
 * @param {number} productId - Product ID
 * @param {number} variantIndex - Index in product.variants array
 * @returns {boolean} Success status
 */
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

/**
 * Mark one unit as damaged, decrement stock
 * @param {number} productId - Product ID
 * @param {number} variantIndex - Index in product.variants array
 * @returns {boolean} Success status
 */
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

/**
 * Add color/size variant to product
 * @param {number} productId - Product ID
 * @param {Object} variant - Variant object with color, size, stock
 * @returns {boolean} Success status
 */
function addVariant(productId, variant) {
    const product = findProduct(productId);
    if (!product || product.editable === false) return false;
    product.variants.push(variant);
    logs.unshift(`${timestamp()} - Added variant: ${product.name}`);
    persistState();
    return true;
}

/**
 * Update existing variant (color, size, stock)
 * @param {number} productId - Product ID
 * @param {number} variantIndex - Index in product.variants array
 * @param {Object} data - Updated fields
 * @returns {boolean} Success status
 */
function updateVariant(productId, variantIndex, data) {
    const product = findProduct(productId);
    if (!product || product.editable === false) return false;
    if (!product.variants[variantIndex]) return false;
    product.variants[variantIndex] = { ...product.variants[variantIndex], ...data };
    logs.unshift(`${timestamp()} - Updated variant: ${product.name}`);
    persistState();
    return true;
}

/**
 * Delete variant from product
 * @param {number} productId - Product ID
 * @param {number} variantIndex - Index in product.variants array
 * @returns {boolean} Success status
 */
function deleteVariant(productId, variantIndex) {
    const product = findProduct(productId);
    if (!product || product.editable === false) return false;
    if (!product.variants[variantIndex]) return false;
    product.variants.splice(variantIndex, 1);
    logs.unshift(`${timestamp()} - Deleted variant from: ${product.name}`);
    persistState();
    return true;
}

/**
 * Get current time as HH:MM:SS string for transaction logs
 * @returns {string} Formatted time string
 */
function timestamp() {
    return new Date().toLocaleTimeString();
}

// ==================== UI ELEMENTS ====================
// Cache DOM references for classroom UI
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
/**
 * Create HTML card element for a product with variants and action buttons
 * @param {Object} product - Product object with variants array
 * @returns {string} HTML string for product card
 */
function createProductCard(product) {
    const variantsHTML = product.variants.map((v, i) => {
        const isOut = v.stock <= 0;
        const isDefault = product.editable === false;
        return `
            <div class="variant-row">
                <div class="variant-info">${v.color} / ${v.size}</div>
                <div class="variant-stock ${isOut ? 'out' : ''}">${isOut ? 'Sold Out' : v.stock + ' left'}</div>
                <div class="variant-actions">
                    <div class="variant-actions-row">
                        <button class="btn btn-sm btn-secondary sell-btn" data-id="${product.id}" data-variant="${i}" ${isOut || isDefault ? 'disabled' : ''}>Sell</button>
                        <button class="btn btn-sm btn-success damage-btn" data-id="${product.id}" data-variant="${i}" ${isOut || isDefault ? 'disabled' : ''}>Damage</button>
                    </div>
                    ${!isDefault ? `<div class="variant-actions-row">
                        <button class="btn btn-sm btn-secondary edit-variant-btn" data-id="${product.id}" data-variant="${i}">Edit</button>
                        <button class="btn btn-sm btn-success delete-variant-btn" data-id="${product.id}" data-variant="${i}">X</button>
                    </div>` : ''}
                </div>
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

/**
 * Render inventory grid with all products and their variants
 * Updates the DOM with product cards
 */
function renderInventory() {
    if (!elements.inventoryGrid) return;
    if (inventory.length === 0) {
        elements.inventoryGrid.innerHTML = '<div class="empty-state">No products yet.</div>';
        return;
    }
    elements.inventoryGrid.innerHTML = inventory.map(createProductCard).join('');
}

/**
 * Render transaction log of recent operations
 * Shows up to 50 most recent entries
 */
function renderLogs() {
    if (!elements.transactionLog) return;
    if (logs.length === 0) {
        elements.transactionLog.innerHTML = '<p class="muted">No transactions yet.</p>';
        return;
    }
    elements.transactionLog.innerHTML = logs.slice(0, 50).map(l => `<div class="log-item">${l}</div>`).join('');
}

// ==================== MODALS ====================
/**
 * Show modal dialog by removing 'hidden' class
 * @param {Element} modal - Modal element
 */
function openModal(modal) {
    if (modal) modal.classList.remove('hidden');
}

/**
 * Hide modal dialog by adding 'hidden' class
 * @param {Element} modal - Modal element
 */
function closeModal(modal) {
    if (modal) modal.classList.add('hidden');
}

/**
 * Display temporary toast notification
 * @param {string} msg - Message text
 * @param {boolean} success - True for success (green), false for error (red)
 */
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

// Expose showToast globally for exercise engine
window.showToast = showToast;

window.reloadInventory = () => {
    inventory = loadFromStorage(STORAGE_KEY_INVENTORY, INITIAL_INVENTORY.slice());
    logs = loadFromStorage(STORAGE_KEY_LOGS, []);
    renderInventory();
    renderLogs();
};

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

let isWaitingForResponse = false;

async function sendMessage() {
    if (!elements.userInput || isWaitingForResponse) return;
    const text = elements.userInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    elements.userInput.value = '';
    elements.userInput.disabled = true;
    elements.sendBtn.disabled = true;
    isWaitingForResponse = true;

    const mode = elements.modeSelector ? elements.modeSelector.value : 'soft';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                mode: mode,
                user_id: 'guest',
                session_id: 'classroom-session'
            })
        });

        if (!response.ok) {
            throw new Error('Chat service unavailable');
        }

        const data = await response.json();
        addMessage(data.response || 'No response', 'bot');
    } catch (err) {
        addMessage('AI tutor is currently unavailable. Please check your API key.', 'bot');
        console.error('Chat error:', err);
    } finally {
        elements.userInput.disabled = false;
        elements.sendBtn.disabled = false;
        isWaitingForResponse = false;
        elements.userInput.focus();
    }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    renderInventory();
    renderLogs();

    // Initialize exercise engine
    if (window.initExerciseEngine) {
        window.initExerciseEngine();
    }

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

        if (t.id === 'sim-btn-return-dashboard') {
            window.location.href = '/dashboard.html';
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

        if (t.classList.contains('delete-variant-btn')) {
            const pid = parseInt(t.dataset.id);
            const vi = parseInt(t.dataset.variant);
            if (confirm('Delete this variant permanently?')) {
                const ok = deleteVariant(pid, vi);
                if (ok) {
                    renderInventory();
                    renderLogs();
                    showToast('Variant deleted');
                } else {
                    showToast('Unable to delete variant', false);
                }
            }
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
            if (confirm('Are you sure you want to delete this product permanently?')) {
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

// ==================== RESIZABLE DIVIDERS ====================
function initResizableDividers() {
    const verticalDivider = document.getElementById('classroom-divider');
    const horizontalDivider = document.querySelector('.resizable-divider.horizontal');
    const simulatorPane = document.getElementById('simulator-pane');

    // Updated IDs for new layout
    const exercisePane = document.getElementById('exercise-pane'); // Right Side
    const tutorPane = document.getElementById('tutor-pane');       // Bottom Left
    const inventorySection = document.querySelector('.inventory-section'); // Top Left

    // Vertical Divider: Resizes Exercise Pane (Right Sidebar)
    if (verticalDivider && exercisePane) {
        let isResizing = false;
        verticalDivider.addEventListener('mousedown', () => { isResizing = true; });
        document.addEventListener('mouseup', () => { isResizing = false; });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const containerWidth = window.innerWidth;
            // Calculate width from the right side
            const newExerciseWidth = containerWidth - e.clientX - 4;

            if (newExerciseWidth >= 350 && newExerciseWidth <= 700) {
                exercisePane.style.width = newExerciseWidth + 'px';
            }
        });
    }

    // Horizontal Divider: Resizes Tutor Pane (Bottom Left) vs Inventory (Top Left)
    if (horizontalDivider && inventorySection && tutorPane && simulatorPane) {
        let isResizing = false;
        horizontalDivider.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isResizing = true;
        });
        document.addEventListener('mouseup', () => { isResizing = false; });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            e.preventDefault();
            const rect = simulatorPane.getBoundingClientRect();
            const newInvHeight = e.clientY - rect.top;
            const totalHeight = rect.height;
            const percentage = (newInvHeight / totalHeight) * 100;

            // Limit resizing between 20% and 80%
            if (percentage > 20 && percentage < 80) {
                inventorySection.style.flex = `1 1 ${percentage}%`;
                tutorPane.style.flex = `1 1 ${100 - percentage}%`;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initResizableDividers);

// ==================== THEME TOGGLE ====================
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const themeIcon = themeToggle.querySelector('i');
    const systemTheme = window.matchMedia('(prefers-color-scheme: light)');

    function updateThemeIcon() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (isLight) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    }

    function applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        updateThemeIcon();
    }

    function initTheme() {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'light' || storedTheme === 'dark') {
            applyTheme(storedTheme);
            return;
        }
        applyTheme(systemTheme.matches ? 'light' : 'dark');
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const nextTheme = isLight ? 'dark' : 'light';
        localStorage.setItem('theme', nextTheme);
        applyTheme(nextTheme);
    });

    initTheme();
}

document.addEventListener('DOMContentLoaded', initThemeToggle);
