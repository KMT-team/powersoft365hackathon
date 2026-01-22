/**
 * exercise-engine.js - Progressive Exercise System
 * 
 * Manages 5 guided exercises with progressive difficulty:
 * 1. Add a Product - Learn inventory creation
 * 2. Edit a Product - Learn inventory modification
 * 3. Add a Variant - Learn variant management
 * 4. Use Action Buttons - Learn Sell/Damage operations
 * 5. Delete Operations - Learn full CRUD lifecycle
 * 
 * Features:
 * - Progression locks (must complete 1 before 2, etc.)
 * - Hint overlay system with contextual tips
 * - Validation checks to ensure correct task completion
 * - localStorage persistence of progress
 * - Auto-complete detection with 1-second validation loop
 */

// ==================== STORAGE ====================
// localStorage keys for exercise state persistence
const EXERCISE_STORAGE_KEY = 'exercise_progress_v1';
const EXERCISE_COMPLETION_KEY = 'exercise_completions_v1';
const EXERCISE_LOGS_KEY = 'exercise_logs_v1';
const HINTS_STORAGE_KEY = 'exercise_hints_enabled_v1';

// ==================== EXERCISE DEFINITIONS ====================
/**
 * Exercise definitions with validation logic and progressive hints
 * Each exercise has: id, title, description, hints array, and validate() function
 */
const exercises = [
    {
        id: 1,
        title: 'Exercise 1: Add a Product',
        description: 'Click "Add New Product" and create any product you like. Fill in the name, category, and price.',
        hints: [
            { target: '#sim-btn-add-item', text: 'Click here to add a new product', step: 'click' },
            { target: 'input[name="name"]', text: 'Enter a product name (e.g., "Blue Jeans")', step: 'fill' },
            { target: 'select[name="category"]', text: 'Select a category', step: 'fill' },
            { target: 'input[name="price"]', text: 'Enter a price (e.g., 49.99)', step: 'fill' }
        ],
        currentStep: 'click',
        validate: () => {
            const inventory = JSON.parse(localStorage.getItem('sim_inventory_v1') || '[]');
            return inventory.filter(p => p.editable !== false).length > 0;
        }
    },
    {
        id: 2,
        title: 'Exercise 2: Edit Your Product',
        description: 'Edit the product you just created. Change its name to "Summer Jacket", category to "Women", and price to €89.99.',
        hints: [
            { target: '.edit-btn:not([disabled])', text: 'Click Edit on your product', step: 'click' },
            { target: '#sim-edit-item-modal input[name="name"]', text: 'Change name to "Summer Jacket"', step: 'fill' },
            { target: '#sim-edit-item-modal select[name="category"]', text: 'Change category to "Women"', step: 'fill' },
            { target: '#sim-edit-item-modal input[name="price"]', text: 'Change price to 89.99', step: 'fill' }
        ],
        currentStep: 'click',
        validate: () => {
            const inventory = JSON.parse(localStorage.getItem('sim_inventory_v1') || '[]');
            return inventory.some(p => 
                p.name === 'Summer Jacket' && 
                p.category === 'Women' && 
                p.price === 89.99
            );
        }
    },
    {
        id: 3,
        title: 'Exercise 3: Add a Variant',
        description: 'Add a variant to your "Summer Jacket". Choose any color and size, and set stock to at least 5 units.',
        hints: [
            { target: 'button[onclick*="openVariantModal"]', text: 'Click "+ Add Variant" on your product', step: 'click' },
            { target: 'input[name="color"]', text: 'Enter a color (e.g., "Blue")', step: 'fill' },
            { target: 'select[name="size"]', text: 'Select a size', step: 'fill' },
            { target: 'input[name="stock"]', text: 'Enter stock (at least 5)', step: 'fill' }
        ],
        currentStep: 'click',
        validate: () => {
            const inventory = JSON.parse(localStorage.getItem('sim_inventory_v1') || '[]');
            const jacket = inventory.find(p => p.name === 'Summer Jacket');
            return jacket && jacket.variants && jacket.variants.length > 0 && jacket.variants.some(v => v.stock >= 5);
        }
    },
    {
        id: 4,
        title: 'Exercise 4: Use Action Buttons',
        description: 'Click "Sell" once and "Damage" once on your variant to reduce stock.',
        hints: [
            { target: '.sell-btn', text: 'Click Sell to reduce stock by 1', step: 'sell' },
            { target: '.damage-btn', text: 'Click Damage to mark 1 unit as damaged', step: 'damage' }
        ],
        currentStep: 'sell',
        validate: () => {
            const inventory = JSON.parse(localStorage.getItem('sim_inventory_v1') || '[]');
            const jacket = inventory.find(p => p.name === 'Summer Jacket');
            if (!jacket || !jacket.variants || jacket.variants.length === 0) return false;
            
            const logs = getExerciseLogs();
            const hasSell = logs.some(log => log.includes('Sold'));
            const hasDamage = logs.some(log => log.includes('Damaged'));
            
            // Debug: log the state for troubleshooting
            console.log('[Ex4] Logs:', logs, 'Sell:', hasSell, 'Damage:', hasDamage);
            
            const ex = exercises[3];
            // If sell done but damage not done, move to damage step
            if (hasSell && !hasDamage && ex.currentStep === 'sell') {
                ex.currentStep = 'damage';
                if (window.clearHints) window.clearHints();
                if (hintsEnabled && window.renderHints) {
                    window.renderHints(ex.hints.filter(h => h.step === 'damage'));
                }
            }
            
            return hasSell && hasDamage;
        }
    },
    {
        id: 5,
        title: 'Exercise 5: Edit Variant & Actions',
        description: 'Edit your variant to set stock to exactly 20, then perform one more Sell and one more Damage action.',
        hints: [
            { target: '.edit-variant-btn', text: 'Click Edit on your variant', step: 'edit' },
            { target: '#sim-edit-variant-modal input[name="stock"]', text: 'Change stock to exactly 20', step: 'fill' },
            { target: '.sell-btn', text: 'Click Sell to reduce stock by 1', step: 'sell2' },
            { target: '.damage-btn', text: 'Click Damage to mark 1 unit as damaged', step: 'damage2' }
        ],
        currentStep: 'edit',
        validate: () => {
            const inventory = JSON.parse(localStorage.getItem('sim_inventory_v1') || '[]');
            const jacket = inventory.find(p => p.name === 'Summer Jacket');
            if (!jacket || !jacket.variants || jacket.variants.length === 0) return false;
            
            // Check if any variant has stock of 20 or close to it (accounting for sells/damages)
            const hasStock20 = jacket.variants.some(v => v.stock === 20 || v.stock === 19 || v.stock === 18);
            
            const logs = getExerciseLogs();
            const sellCount = logs.filter(log => log.includes('Sold')).length;
            const damageCount = logs.filter(log => log.includes('Damaged')).length;
            
            const ex = exercises[4];
            
            // Progress through steps
            if (hasStock20 && ex.currentStep === 'edit') {
                ex.currentStep = 'fill';
            } else if (hasStock20 && ex.currentStep === 'fill') {
                ex.currentStep = 'sell2';
                if (window.clearHints) window.clearHints();
                if (hintsEnabled && window.renderHints) {
                    window.renderHints(ex.hints.filter(h => h.step === 'sell2'));
                }
            } else if (sellCount >= 1 && ex.currentStep === 'sell2') {
                ex.currentStep = 'damage2';
                if (window.clearHints) window.clearHints();
                if (hintsEnabled && window.renderHints) {
                    window.renderHints(ex.hints.filter(h => h.step === 'damage2'));
                }
            }
            
            // Complete when all steps done
            return hasStock20 && sellCount >= 1 && damageCount >= 1;
        }
    }
];

// ==================== STATE ====================
let currentExercise = parseInt(localStorage.getItem(EXERCISE_STORAGE_KEY) || '0');
let completions = JSON.parse(localStorage.getItem(EXERCISE_COMPLETION_KEY) || '{}');
let hintsEnabled = localStorage.getItem(HINTS_STORAGE_KEY) === 'true';
let allCompleted = false;

// ==================== EXERCISE LOGS ====================
function getExerciseLogs() {
    return JSON.parse(localStorage.getItem(EXERCISE_LOGS_KEY) || '[]');
}

function addExerciseLog(log) {
    const logs = getExerciseLogs();
    logs.unshift(log);
    localStorage.setItem(EXERCISE_LOGS_KEY, JSON.stringify(logs));
    renderExerciseLogs();
}

// Expose globally so classroom.js can call it
window.addExerciseLog = addExerciseLog;

function clearExerciseLogs() {
    localStorage.setItem(EXERCISE_LOGS_KEY, JSON.stringify([]));
    renderExerciseLogs();
}

function renderExerciseLogs() {
    const logContainer = document.getElementById('exercise-activity-log');
    if (!logContainer) return;
    
    const logs = getExerciseLogs();
    if (logs.length === 0) {
        logContainer.innerHTML = '<p class="muted">No activity yet.</p>';
        return;
    }
    logContainer.innerHTML = logs.slice(0, 20).map(l => `<div class="log-item">${l}</div>`).join('');
}

// Intercept main logs and copy to exercise logs
window.addEventListener('storage', (e) => {
    if (e.key === 'sim_inventory_logs_v1' && currentExercise > 0) {
        const mainLogs = JSON.parse(e.newValue || '[]');
        if (mainLogs.length > 0) {
            addExerciseLog(mainLogs[0]);
        }
    }
});

// ==================== UI ELEMENTS ====================
const exerciseContent = document.querySelector('.exercise-content');

// ==================== CORE FUNCTIONS ====================
function getCurrentExercise() {
    if (currentExercise === 0 || allCompleted) return null;
    return exercises.find(ex => ex.id === currentExercise) || exercises[0];
}

function updateExerciseUI() {
    if (!exerciseContent) return;
    
    if (currentExercise === 0 || allCompleted) {
        renderExerciseList();
    } else {
        const exercise = getCurrentExercise();
        if (exercise) {
            exerciseContent.innerHTML = `
                <div class="exercise-item">
                    <h4>${exercise.title}</h4>
                    <p>${exercise.description}</p>
                </div>
                <div class="exercise-item">
                    <h4>Button Guide</h4>
                    <ul style="font-size: 13px; line-height: 1.6; margin: 8px 0; padding-left: 20px;">
                        <li><strong>Add New Product:</strong> Create a new inventory item</li>
                        <li><strong>Edit:</strong> Modify product details (name, category, price)</li>
                        <li><strong>Delete:</strong> Remove a product from inventory</li>
                        <li><strong>Sell:</strong> Reduce stock by 1 unit</li>
                        <li><strong>Damage:</strong> Mark 1 unit as damaged (reduces stock)</li>
                        <li><strong>+ Add Variant:</strong> Add color/size/stock combination</li>
                        <li><strong>Edit Variant:</strong> Modify variant details</li>
                    </ul>
                </div>
            `;
        }
    }
    
    const hintsToggle = document.getElementById('hints-toggle');
    if (hintsToggle) {
        hintsToggle.classList.toggle('active', hintsEnabled);
        hintsToggle.innerHTML = hintsEnabled 
            ? '<i class="fas fa-lightbulb"></i> Hints ON' 
            : '<i class="far fa-lightbulb"></i> Hints OFF';
    }
    
    updateSimulationsButton();
}

function renderExerciseList() {
    if (!exerciseContent) return;
    
    const listHTML = exercises.map(ex => {
        const isCompleted = completions[ex.id] && completions[ex.id] > 0;
        
        // Check if exercise is locked
        let isLocked = false;
        if (ex.id > 1) {
            for (let i = 1; i < ex.id; i++) {
                if (!completions[i]) {
                    isLocked = true;
                    break;
                }
            }
        }
        
        const buttonHTML = isLocked
            ? `<button class="btn btn-sm btn-secondary" style="opacity: 0.5;" disabled title="Complete Exercise ${ex.id - 1} first">
                <i class="fas fa-lock"></i> Locked
              </button>`
            : isCompleted
            ? `<button class="btn btn-sm btn-success" style="cursor: default;" disabled>
                <i class="fas fa-check"></i> Completed!
              </button>`
            : `<button class="btn btn-sm btn-primary start-exercise-btn" data-exercise="${ex.id}">
                Start
              </button>`;
        
        return `
            <div class="exercise-list-item" data-exercise="${ex.id}">
                <h4>${ex.title}</h4>
                <p>${ex.description}</p>
                ${buttonHTML}
            </div>
        `;
    }).join('');
    
    exerciseContent.innerHTML = `
        <div class="exercise-item">
            <h4>Available Exercises</h4>
            <p>Complete exercises in order to unlock the next ones:</p>
        </div>
        ${listHTML}
    `;
    
    document.querySelectorAll('.start-exercise-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const exId = parseInt(e.target.closest('button').dataset.exercise);
            startExercise(exId);
        });
    });
}

function startExercise(exId) {
    // Check if user has completed all previous exercises
    const targetExercise = exercises.find(ex => ex.id === exId);
    if (targetExercise && targetExercise.id > 1) {
        // Check all previous exercises
        for (let i = 1; i < targetExercise.id; i++) {
            if (!completions[i]) {
                if (window.showToast) {
                    window.showToast(`Complete Exercise ${i} first!`, false);
                }
                return;
            }
        }
    }
    
    // If redoing a completed exercise, remove the completion
    if (completions[exId] && completions[exId] > 0) {
        completions[exId]--;
        if (completions[exId] === 0) {
            delete completions[exId];
        }
        localStorage.setItem(EXERCISE_COMPLETION_KEY, JSON.stringify(completions));
    }
    
    currentExercise = exId;
    allCompleted = false;
    localStorage.setItem(EXERCISE_STORAGE_KEY, exId.toString());
    
    clearExerciseLogs();
    
    const exercise = exercises.find(ex => ex.id === exId);
    if (exercise) {
        exercise.currentStep = exercise.hints[0].step;
    }
    
    updateExerciseUI();
    
    if (window.clearHints) window.clearHints();
    if (hintsEnabled && window.renderHints && exercise) {
        const firstHints = exercise.hints.filter(h => h.step === exercise.hints[0].step);
        window.renderHints(firstHints);
    }
}

function checkExerciseCompletion() {
    if (currentExercise === 0 || allCompleted) return;
    
    const exercise = getCurrentExercise();
    if (!exercise) return;
    
    if (exercise.validate()) {
        completeExercise();
    } else {
        // Check for specific errors
        validateExerciseStep(exercise);
    }
}

function validateExerciseStep(exercise) {
    // Show error messages for common mistakes
    if (exercise.id === 1) {
        const inventory = JSON.parse(localStorage.getItem('sim_inventory_v1') || '[]');
        const hasProduct = inventory.filter(p => p.editable !== false).length > 0;
        if (!hasProduct) return; // Still waiting, no error yet
    }
    
    if (exercise.id === 2) {
        const inventory = JSON.parse(localStorage.getItem('sim_inventory_v1') || '[]');
        const wrongName = inventory.some(p => p.name === 'Summer Jacket' && p.category !== 'Women');
        const wrongPrice = inventory.some(p => p.name === 'Summer Jacket' && p.price !== 89.99);
        
        if (wrongName) {
            if (window.showToast) window.showToast('💡 Check the product category - it should be "Women"', false);
        }
        if (wrongPrice) {
            if (window.showToast) window.showToast('💡 Check the price - it should be €89.99', false);
        }
    }
    
    if (exercise.id === 3) {
        const inventory = JSON.parse(localStorage.getItem('sim_inventory_v1') || '[]');
        const jacket = inventory.find(p => p.name === 'Summer Jacket');
        if (jacket && jacket.variants && jacket.variants.length === 0) {
            if (window.showToast) window.showToast('💡 You need to add at least one variant. Look for the "+ Add Variant" button.', false);
        } else if (jacket && jacket.variants) {
            const lowStock = jacket.variants.some(v => v.stock < 5);
            if (lowStock) {
                if (window.showToast) window.showToast('💡 At least one variant needs 5+ stock. Try adding more.', false);
            }
        }
    }
}

function completeExercise() {
    const exercise = getCurrentExercise();
    if (!exercise) return;
    
    completions[exercise.id] = (completions[exercise.id] || 0) + 1;
    localStorage.setItem(EXERCISE_COMPLETION_KEY, JSON.stringify(completions));
    
    if (window.showToast) {
        window.showToast(`${exercise.title} completed!`);
    }
    
    currentExercise = 0;
    allCompleted = true;
    localStorage.setItem(EXERCISE_STORAGE_KEY, '0');
    
    if (window.clearHints) window.clearHints();
    
    updateExerciseUI();
}

function restartExercise() {
  const exercise = getCurrentExercise();
  if (!exercise) return;

  // 1. Ask for confirmation
  const confirmed = confirm('Restart this exercise? Your progress in this exercise will be reset.');
  if (!confirmed) return;

  const exId = exercise.id;
  const inventory = JSON.parse(localStorage.getItem('sim_inventory_v1') || '[]');

  // 2. Revert changes based on exercise ID
  switch (exId) {
    case 1:
      // Remove all user-added products (keep only default items)
      const preserved = inventory.filter(p => p.editable === false);
      localStorage.setItem('sim_inventory_v1', JSON.stringify(preserved));
      break;

    case 2:
      // Reset editable product to default state
      const product = inventory.find(p => p.editable !== false);
      if (product) {
        product.name = 'New Product';
        product.category = 'Men';
        product.price = 0;
        localStorage.setItem('sim_inventory_v1', JSON.stringify(inventory));
      }
      break;

    case 3:
      // Remove all variants from Summer Jacket
      const jacket3 = inventory.find(p => p.name === 'Summer Jacket');
      if (jacket3) {
        jacket3.variants = [];
        localStorage.setItem('sim_inventory_v1', JSON.stringify(inventory));
      }
      break;

    case 4:
      // Reset variant stock to 5
      const jacket4 = inventory.find(p => p.name === 'Summer Jacket');
      if (jacket4?.variants?.length > 0) {
        jacket4.variants[0].stock = 5;
        localStorage.setItem('sim_inventory_v1', JSON.stringify(inventory));
      }
      break;

    case 5:
      // Reset variant stock to 3
      const jacket5 = inventory.find(p => p.name === 'Summer Jacket');
      if (jacket5?.variants?.length > 0) {
        jacket5.variants[0].stock = 3;
        localStorage.setItem('sim_inventory_v1', JSON.stringify(inventory));
      }
      break;

    default:
      console.warn('Unknown exercise ID:', exId);
  }

  // 3. Clear logs
  localStorage.setItem('sim_inventory_logs_v1', JSON.stringify([]));
  clearExerciseLogs?.();

  // 4. Reset exercise step to beginning
  exercise.currentStep = exercise.hints?.[0]?.step || 0;

  // 5. Reload to refresh UI
  window.location.reload();
}


function restartAll() {
    if (!confirm('Reset all exercise progress AND clear all inventory? This cannot be undone.')) return;
    
    // Clear exercise progress
    localStorage.setItem(EXERCISE_STORAGE_KEY, '0');
    localStorage.setItem(EXERCISE_COMPLETION_KEY, '{}');
    localStorage.setItem(EXERCISE_LOGS_KEY, '[]');
    
    // Also clear the simulation inventory
    localStorage.setItem('sim_inventory_v1', JSON.stringify(INITIAL_INVENTORY.slice ? INITIAL_INVENTORY.slice() : []));
    localStorage.setItem('sim_inventory_logs_v1', JSON.stringify([]));
    
    currentExercise = 0;
    completions = {};
    allCompleted = false;
    
    exercises.forEach(ex => {
        if (ex.currentStep) ex.currentStep = ex.hints[0].step;
    });
    
    if (window.clearHints) window.clearHints();
    
    // Reload inventory in classroom
    if (window.reloadInventory) window.reloadInventory();
    
    updateExerciseUI();
    
    if (window.showToast) {
        window.showToast('All progress and inventory reset');
    }
}

function toggleHints() {
    hintsEnabled = !hintsEnabled;
    localStorage.setItem(HINTS_STORAGE_KEY, hintsEnabled.toString());
    updateExerciseUI();
    
    if (hintsEnabled && window.renderHints) {
        const exercise = getCurrentExercise();
        if (exercise) {
            const currentHints = exercise.hints.filter(h => h.step === exercise.currentStep);
            window.renderHints(currentHints);
        }
    } else if (window.clearHints) {
        window.clearHints();
    }
}

function updateSimulationsButton() {
    const simulationsBtn = document.getElementById('simulations-btn');
    if (!simulationsBtn) return;
    
    simulationsBtn.disabled = false;
    simulationsBtn.style.opacity = '1';
}

// ==================== MODAL OBSERVER ====================
function observeModals() {
    const observer = new MutationObserver(() => {
        const addModal = document.getElementById('sim-add-item-modal');
        const editModal = document.getElementById('sim-edit-item-modal');
        const variantModal = document.getElementById('sim-variant-modal');
        const editVariantModal = document.getElementById('sim-edit-variant-modal');
        
        if (addModal && !addModal.classList.contains('hidden')) {
            const exercise = getCurrentExercise();
            if (exercise && exercise.id === 1 && exercise.currentStep === 'click') {
                exercise.currentStep = 'fill';
                if (window.clearHints) window.clearHints();
                if (hintsEnabled && window.renderHints) {
                    window.renderHints(exercise.hints.filter(h => h.step === 'fill'));
                }
            }
        }
        
        if (editModal && !editModal.classList.contains('hidden')) {
            const exercise = getCurrentExercise();
            if (exercise && exercise.id === 2 && exercise.currentStep === 'click') {
                exercise.currentStep = 'fill';
                if (window.clearHints) window.clearHints();
                if (hintsEnabled && window.renderHints) {
                    window.renderHints(exercise.hints.filter(h => h.step === 'fill'));
                }
            }
        }
        
        if (variantModal && !variantModal.classList.contains('hidden')) {
            const exercise = getCurrentExercise();
            if (exercise && exercise.id === 3 && exercise.currentStep === 'click') {
                exercise.currentStep = 'fill';
                if (window.clearHints) window.clearHints();
                if (hintsEnabled && window.renderHints) {
                    window.renderHints(exercise.hints.filter(h => h.step === 'fill'));
                }
            }
        }
        
        if (editVariantModal && !editVariantModal.classList.contains('hidden')) {
            const exercise = getCurrentExercise();
            if (exercise && exercise.id === 5 && exercise.currentStep === 'edit') {
                exercise.currentStep = 'fill';
                if (window.clearHints) window.clearHints();
                if (hintsEnabled && window.renderHints) {
                    setTimeout(() => window.renderHints(exercise.hints.filter(h => h.step === 'fill')), 100);
                }
            }
        }
        
        // Detect when edit variant modal closes
        if (editVariantModal && editVariantModal.classList.contains('hidden')) {
            const exercise = getCurrentExercise();
            if (exercise && exercise.id === 5 && exercise.currentStep === 'fill') {
                // Modal closed, clear fill hints
                if (window.clearHints) window.clearHints();
            }
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

// ==================== INITIALIZATION ====================
function initExerciseEngine() {
    updateExerciseUI();
    
    const exerciseHeader = document.querySelector('.exercise-header');
    if (exerciseHeader) {
        const controlsDiv = document.createElement('div');
        controlsDiv.style.cssText = 'display: flex; gap: 12px; align-items: center; margin-top: 12px;';
        
        const hintsToggle = document.createElement('button');
        hintsToggle.id = 'hints-toggle';
        hintsToggle.className = 'btn btn-sm btn-secondary';
        hintsToggle.style.cssText = 'flex: 1;';
        hintsToggle.innerHTML = hintsEnabled 
            ? '<i class="fas fa-lightbulb"></i> Hints ON' 
            : '<i class="far fa-lightbulb"></i> Hints OFF';
        hintsToggle.addEventListener('click', toggleHints);
        
     const restartBtn = document.createElement('button');
restartBtn.id = 'restart-exercises';
restartBtn.className = 'btn btn-sm btn-secondary';
restartBtn.style.cssText = 'flex: 1;';
restartBtn.innerHTML = '<i class="fas fa-redo"></i> Restart';
restartBtn.addEventListener('click', () => {
  if (currentExercise > 0) {
    restartExercise();  // Restart current exercise
  } else {
    restartAll();       // Restart all exercises (if on overview screen)
  }
});

        
        const simulationsBtn = document.createElement('button');
        simulationsBtn.id = 'simulations-btn';
        simulationsBtn.className = 'btn btn-sm btn-primary';
        simulationsBtn.style.cssText = 'flex: 1;';
        simulationsBtn.innerHTML = '<i class="fas fa-robot"></i> Simulations';
        simulationsBtn.addEventListener('click', () => {
            if (window.showToast) {
                window.showToast('AI Simulations coming soon!');
            }
        });
        
        controlsDiv.appendChild(hintsToggle);
        controlsDiv.appendChild(restartBtn);
        controlsDiv.appendChild(simulationsBtn);
        exerciseHeader.appendChild(controlsDiv);
    }
    
    if (hintsEnabled && window.renderHints) {
        const exercise = getCurrentExercise();
        if (exercise) {
            setTimeout(() => {
                const firstHints = exercise.hints.filter(h => h.step === exercise.currentStep);
                window.renderHints(firstHints);
            }, 500);
        }
    }
    
    observeModals();
    setInterval(checkExerciseCompletion, 1000);
}

// ==================== EXPORTS ====================
window.initExerciseEngine = initExerciseEngine;
window.checkExerciseCompletion = checkExerciseCompletion;
window.addExerciseLog = addExerciseLog;
