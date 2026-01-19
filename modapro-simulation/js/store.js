/**
 * store.js
 * 
 * This module acts as our "Database" and "State Manager".
 * It handles all data persistence using the browser's localStorage API.
 * 
 * Responsibilities:
 * 1. Load data from localStorage on startup.
 * 2. Save data to localStorage whenever it changes.
 * 3. Provide functions to Add items, Sell items, and Get data.
 */

const STORAGE_KEY_INVENTORY = 'luxe_threads_inventory';
const STORAGE_KEY_LOGS = 'luxe_threads_logs';

// Initial Seed Data (Used if localStorage is empty)
// This gives the user something to see when they first open the app.
const INITIAL_INVENTORY = [
    {
        id: 1705650123456,
        name: "Classic Oxford Shirt",
        category: "Men",
        price: 45.00,
        active: true,
        deactivationReason: null,
        variants: [
            { color: "White", size: "M", stock: 12 },
            { color: "Blue", size: "L", stock: 8 }
        ]
    },
    {
        id: 1705650123457,
        name: "Floral Summer Dress",
        category: "Women",
        price: 65.50,
        active: true,
        deactivationReason: null,
        variants: [
            { color: "Floral", size: "S", stock: 5 },
            { color: "Floral", size: "M", stock: 2 }
        ]
    },
    {
        id: 1705650123458,
        name: "Leather Belt",
        category: "Accessories",
        price: 29.99,
        active: true,
        deactivationReason: null,
        variants: [
            { color: "Brown", size: "One Size", stock: 20 }
        ]
    }
];

/**
 * Helper to read from localStorage
 * Uses JSON.parse to convert the string back into a JavaScript Object/Array
 */
function loadFromStorage(key, defaultVal) {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultVal;
}

/**
 * Helper to write to localStorage
 * Uses JSON.stringify to convert the JavaScript Object/Array into a string
 */
function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// State containers
// We keep a local copy in memory to avoid reading from localStorage constantly.
let inventory = loadFromStorage(STORAGE_KEY_INVENTORY, INITIAL_INVENTORY);
let logs = loadFromStorage(STORAGE_KEY_LOGS, []);

// --- PUBLIC API EXPORTS ---

/**
 * Returns the current list of products.
 */
export function getInventory() {
    return inventory;
}

/**
 * Returns the transaction logs.
 */
export function getLogs() {
    return logs;
}

/**
 * Adds a new product to the inventory.
 * @param {Object} product - The product object to add.
 */
export function addProduct(product) {
    // Add timestamp ID if not present
    if (!product.id) {
        product.id = Date.now();
    }

    // Set default active status
    product.active = true;
    product.deactivationReason = null;

    // Add to beginning of array so it shows up first
    inventory.unshift(product);

    // Persist to storage
    saveToStorage(STORAGE_KEY_INVENTORY, inventory);
}

/**
 * Records a sale transaction.
 * Decrements stock and adds a log entry.
 * 
 * @param {number} productId - ID of the product
 * @param {number} variantIndex - Index of the variant in the variants array
 * @returns {boolean} - True if sale was successful (stock > 0), else False.
 */
export function sellItem(productId, variantIndex) {
    // 1. Find the product
    const product = inventory.find(p => p.id === productId);

    if (!product) {
        console.error("Product not found");
        return false;
    }

    if (!product.active) {
        alert("This item is currently inactive and cannot be sold.");
        return false;
    }

    // 2. Check stock
    const variant = product.variants[variantIndex];
    if (variant.stock > 0) {
        // 3. Decrement stock
        variant.stock--;

        // 4. Create Log Entry
        const time = new Date().toLocaleTimeString();
        const logEntry = `Sold ${product.name} (${variant.color}/${variant.size}) - ${time}`;
        logs.unshift(logEntry); // Add to top of logs

        // 5. Save everything
        saveToStorage(STORAGE_KEY_INVENTORY, inventory);
        saveToStorage(STORAGE_KEY_LOGS, logs);

        return true;
    } else {
        alert("Out of Stock!");
        return false;
    }
}

/**
 * Updates an existing product.
 * @param {number} id - Product ID to update
 * @param {Object} updatedData - Object containing new properties (name, price, variants, etc.)
 */
export function updateProduct(id, updatedData) {
    const index = inventory.findIndex(p => p.id === id);
    if (index !== -1) {
        // Merge existing product with new data
        // Preserve active status if not explicitly updated
        const existing = inventory[index];
        inventory[index] = { ...existing, ...updatedData };
        saveToStorage(STORAGE_KEY_INVENTORY, inventory);

        // Log it
        const logEntry = `Updated Product: ${updatedData.name} - ${new Date().toLocaleTimeString()}`;
        logs.unshift(logEntry);
        saveToStorage(STORAGE_KEY_LOGS, logs);
        return true;
    }
    return false;
}

/**
 * Deletes a product from the inventory.
 * @param {number} id - Product ID to delete
 */
export function deleteProduct(id) {
    const product = inventory.find(p => p.id === id);
    if (product) {
        inventory = inventory.filter(p => p.id !== id);
        saveToStorage(STORAGE_KEY_INVENTORY, inventory);

        // Log it
        const logEntry = `Deleted Product: ${product.name} - ${new Date().toLocaleTimeString()}`;
        logs.unshift(logEntry);
        saveToStorage(STORAGE_KEY_LOGS, logs);
        return true;
    }
    return false;
}

/**
 * Toggles product activation status.
 * @param {number} id - Product ID
 * @param {boolean} isActive - New active status
 * @param {string} reason - Reason for deactivation (null if activating)
 */
export function toggleProductStatus(id, isActive, reason = null) {
    const product = inventory.find(p => p.id === id);
    if (product) {
        product.active = isActive;
        product.deactivationReason = isActive ? null : reason;

        saveToStorage(STORAGE_KEY_INVENTORY, inventory);

        // Log it
        const action = isActive ? "Activated" : "Deactivated";
        const reasonText = reason ? `(Reason: ${reason})` : "";
        const logEntry = `Status Change: ${product.name} ${action} ${reasonText} - ${new Date().toLocaleTimeString()}`;
        logs.unshift(logEntry);
        saveToStorage(STORAGE_KEY_LOGS, logs);
        return true;
    }
    return false;
}
