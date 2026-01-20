/**
 * simulator-store.js
 * 
 * "Database" and "State Manager" for the Simulator.
 * Handles persistence using local storage.
 */

const STORAGE_KEY_INVENTORY = 'sim_luxe_threads_inventory';
const STORAGE_KEY_LOGS = 'sim_luxe_threads_logs';

// Initial Seed Data
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

function loadFromStorage(key, defaultVal) {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultVal;
}

function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

let inventory = loadFromStorage(STORAGE_KEY_INVENTORY, INITIAL_INVENTORY);
let logs = loadFromStorage(STORAGE_KEY_LOGS, []);

export function getInventory() {
    return inventory;
}

export function getLogs() {
    return logs;
}

export function addProduct(product) {
    if (!product.id) {
        product.id = Date.now();
    }
    product.active = true;
    product.deactivationReason = null;
    inventory.unshift(product);
    saveToStorage(STORAGE_KEY_INVENTORY, inventory);
}

export function sellItem(productId, variantIndex) {
    const product = inventory.find(p => p.id === productId);
    if (!product) {
        console.error("Product not found");
        return false;
    }
    if (!product.active) {
        alert("This item is currently inactive and cannot be sold.");
        return false;
    }
    const variant = product.variants[variantIndex];
    if (variant.stock > 0) {
        variant.stock--;
        const time = new Date().toLocaleTimeString();
        const logEntry = `Sold ${product.name} (${variant.color}/${variant.size}) - ${time}`;
        logs.unshift(logEntry);
        saveToStorage(STORAGE_KEY_INVENTORY, inventory);
        saveToStorage(STORAGE_KEY_LOGS, logs);
        return true;
    } else {
        alert("Out of Stock!");
        return false;
    }
}

export function updateProduct(id, updatedData) {
    const index = inventory.findIndex(p => p.id === id);
    if (index !== -1) {
        const existing = inventory[index];
        inventory[index] = { ...existing, ...updatedData };
        saveToStorage(STORAGE_KEY_INVENTORY, inventory);
        const logEntry = `Updated Product: ${updatedData.name} - ${new Date().toLocaleTimeString()}`;
        logs.unshift(logEntry);
        saveToStorage(STORAGE_KEY_LOGS, logs);
        return true;
    }
    return false;
}

export function deleteProduct(id) {
    const product = inventory.find(p => p.id === id);
    if (product) {
        inventory = inventory.filter(p => p.id !== id);
        saveToStorage(STORAGE_KEY_INVENTORY, inventory);
        const logEntry = `Deleted Product: ${product.name} - ${new Date().toLocaleTimeString()}`;
        logs.unshift(logEntry);
        saveToStorage(STORAGE_KEY_LOGS, logs);
        return true;
    }
    return false;
}

export function toggleProductStatus(id, isActive, reason = null) {
    const product = inventory.find(p => p.id === id);
    if (product) {
        product.active = isActive;
        product.deactivationReason = isActive ? null : reason;
        saveToStorage(STORAGE_KEY_INVENTORY, inventory);
        const action = isActive ? "Activated" : "Deactivated";
        const reasonText = reason ? `(Reason: ${reason})` : "";
        const logEntry = `Status Change: ${product.name} ${action} ${reasonText} - ${new Date().toLocaleTimeString()}`;
        logs.unshift(logEntry);
        saveToStorage(STORAGE_KEY_LOGS, logs);
        return true;
    }
    return false;
}
