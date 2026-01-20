/**
 * simulator-ui.js
 * 
 * Handles DOM modifications for the Simulator.
 * Using namespaced IDs (sim- prefix).
 */

const elements = {
    inventoryGrid: document.getElementById('sim-inventory-grid'),
    transactionLog: document.getElementById('sim-transaction-log'),
    editModalInputs: {
        id: document.getElementById('sim-edit-product-id'),
        name: document.getElementById('sim-edit-name'),
        category: document.getElementById('sim-edit-category'),
        price: document.getElementById('sim-edit-price'),
        variantsContainer: document.getElementById('sim-edit-variants-container')
    }
};

export function populateEditModal(product, role = 'admin') {
    elements.editModalInputs.id.value = product.id;
    elements.editModalInputs.name.value = product.name;
    elements.editModalInputs.category.value = product.category;
    elements.editModalInputs.price.value = product.price;

    const sizes = ["Small", "Medium", "Large", "XLarge", "XXLarge", "OneSize"];
    const isEmployee = role === 'employee';

    const disabledAttr = isEmployee ? 'disabled' : '';
    elements.editModalInputs.name.disabled = isEmployee;
    elements.editModalInputs.category.disabled = isEmployee;
    elements.editModalInputs.price.disabled = isEmployee;

    const adminControls = document.getElementById('sim-admin-controls');
    const employeeControls = document.getElementById('sim-employee-controls');

    if (isEmployee) {
        adminControls.classList.add('hidden');
        elements.editModalInputs.name.disabled = true;
        elements.editModalInputs.category.disabled = true;
        elements.editModalInputs.price.disabled = true;
    } else {
        adminControls.classList.remove('hidden');
        elements.editModalInputs.name.disabled = false;
        elements.editModalInputs.category.disabled = false;
        elements.editModalInputs.price.disabled = false;
    }

    employeeControls.classList.remove('hidden');

    const btnDeactivate = document.getElementById('sim-btn-deactivate-product');
    const btnActivate = document.getElementById('sim-btn-activate-product');
    const deactivationSection = document.getElementById('sim-deactivation-section');

    if (product.active) {
        deactivationSection.classList.remove('hidden');
        btnActivate.classList.add('hidden');
    } else {
        deactivationSection.classList.add('hidden');
        btnActivate.classList.remove('hidden');
    }

    elements.editModalInputs.variantsContainer.innerHTML = product.variants.map((v, index) => {
        const sizeOptions = sizes.map(s => `<option value="${s}" ${v.size === s ? 'selected' : ''}>${s}</option>`).join('');
        const inputDisabled = isEmployee ? 'disabled' : '';
        const removeBtnClass = isEmployee ? 'hidden' : 'sim-btn-remove-variant';

        return `
        <div class="sim-variant-row grid grid-cols-12 gap-2 items-center text-sm">
            <input type="text" value="${v.color}" placeholder="Color" ${inputDisabled} class="sim-variant-color col-span-3 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500">
            <select ${inputDisabled} class="sim-variant-size col-span-2 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500">
                ${sizeOptions}
            </select>
            <input type="number" value="${v.stock}" min="0" placeholder="Stock" ${inputDisabled} class="sim-variant-stock col-span-5 px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500">
            
            <button type="button" class="${removeBtnClass} col-span-2 text-red-400 hover:text-red-600 flex justify-center items-center" title="Remove Variant">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        `;
    }).join('');

    const btnAddVariant = document.getElementById('sim-btn-add-variant');
    if (btnAddVariant) {
        btnAddVariant.style.display = isEmployee ? 'none' : 'flex';
    }
}

export function renderInventory(products) {
    if (products.length === 0) {
        elements.inventoryGrid.innerHTML = `
            <div class="col-span-full text-center py-10 text-gray-400">
                <p>No items found.</p>
            </div>
        `;
        return;
    }
    const htmlString = products.map(product => createProductCard(product)).join('');
    elements.inventoryGrid.innerHTML = htmlString;
}

export function renderLogs(logs) {
    if (logs.length === 0) {
        elements.transactionLog.innerHTML = '<p class="text-slate-600 italic">No transactions yet.</p>';
        return;
    }
    const htmlString = logs.map(log => `
        <div class="bg-slate-800/50 p-2 rounded border-l-2 border-indigo-500 animate-fade-in">
            <p class="text-slate-300 font-mono">${log}</p>
        </div>
    `).join('');
    elements.transactionLog.innerHTML = htmlString;
}

function createProductCard(product) {
    const variantsHTML = product.variants.map((variant, index) => {
        const isOutOfStock = variant.stock === 0;
        const stockClass = isOutOfStock ? 'text-red-500 bg-red-50' : 'text-emerald-600 bg-emerald-50';
        const btnDisabled = isOutOfStock || !product.active ? 'disabled class="opacity-50 cursor-not-allowed"' : '';

        return `
            <div class="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                <div class="flex flex-col">
                    <span class="font-medium text-gray-700">${variant.color} / ${variant.size}</span>
                    <span class="text-xs ${stockClass} px-2 py-0.5 rounded-full w-fit mt-0.5 font-semibold">
                        ${isOutOfStock ? 'Sold Out' : `${variant.stock} left`}
                    </span>
                </div>
                <button 
                    onclick="window.handleSell(${product.id}, ${index})"
                    ${btnDisabled}
                    class="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded uppercase tracking-wide transition-colors"
                >
                    Sell
                </button>
            </div>
        `;
    }).join('');

    const opacityClass = product.active ? '' : 'opacity-60 grayscale';
    const activeLabel = product.active ? '' : '<span class="absolute top-2 right-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">INACTIVE</span>';

    return `
        <div class="sim-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col ${opacityClass} relative">
            ${activeLabel}
            <div class="sim-card-header p-5 border-b border-gray-50 bg-gradient-to-br from-white to-gray-50">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-xs font-bold text-indigo-500 uppercase tracking-widest">${product.category}</span>
                        <h3 
                            onclick="window.handleEdit(${product.id})"
                            class="text-lg font-bold text-gray-900 mt-1 sim-product-card-title cursor-pointer"
                            title="Click to Edit"
                        >
                            ${product.name}
                        </h3>
                    </div>
                    <span class="text-lg font-serif text-gray-600">$${product.price.toFixed(2)}</span>
                </div>
            </div>
            <div class="sim-card-variants p-5 flex-1 bg-white custom-scrollbar">
                <div class="space-y-1">
                    ${variantsHTML}
                </div>
            </div>
        </div>
    `;
}
