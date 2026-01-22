/**
 * hint-overlay.js - Floating Hint System
 * 
 * Renders contextual hints near UI elements with smart positioning logic.
 * Hints fade in sequentially (150ms stagger), reposition on scroll/resize,
 * and stay within viewport boundaries.
 * 
 * Smart positioning priority:
 * 1. Above target (preferred)
 * 2. Below target (if not enough space above)
 * 3. Left/right adjustment if hint extends beyond viewport
 */

// ==================== STATE ====================
// Track active hint elements for cleanup
let activeHints = [];

// ==================== HINT RENDERING ====================
/**
 * Create and display hint overlays for array of hint definitions
 * Staggered appearance (150ms between each hint)
 * @param {Array} hints - Array of {target, text, step} objects
 */
function renderHints(hints) {
    clearHints();

    if (!hints || hints.length === 0) return;

    hints.forEach((hint, index) => {
        setTimeout(() => {
            const targets = document.querySelectorAll(hint.target);
            if (!targets || targets.length === 0) return;

            const target = targets[0];
            const hintElement = createHintElement(hint.text, target);
            if (hintElement) {
                document.body.appendChild(hintElement);
                activeHints.push(hintElement);

                setTimeout(() => hintElement.classList.add('visible'), 10);
            }
        }, index * 150);
    });
}

/**
 * Create hint DOM element with lightbulb icon and arrow
 * @param {string} text - Hint text content
 * @param {Element} targetElement - Element to attach hint near
 * @returns {Element} Hint element
 */
function createHintElement(text, targetElement) {
    const hint = document.createElement('div');
    hint.className = 'hint-overlay';
    hint.innerHTML = `
        <div class="hint-content">
            <i class="fas fa-lightbulb"></i>
            <span>${text}</span>
        </div>
        <div class="hint-arrow"></div>
    `;

    document.body.appendChild(hint);

    const reposition = () => {
        if (!document.body.contains(hint) || !document.body.contains(targetElement)) {
            return;
        }
        positionHint(hint, targetElement);
    };

    reposition();

    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    // Auto-fade after 3 seconds
    hint._fadeTimeout = setTimeout(() => {
        hint.style.transition = 'opacity 0.5s ease';
        hint.style.opacity = '0.3';
    }, 3000);

    // Restore opacity on hover
    hint.addEventListener('mouseenter', () => {
        clearTimeout(hint._fadeTimeout);
        hint.style.opacity = '1';
    });

    hint.addEventListener('mouseleave', () => {
        hint._fadeTimeout = setTimeout(() => {
            hint.style.opacity = '0.3';
        }, 3000); // Reset full 3s timer
    });

    hint._cleanup = () => {
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('resize', reposition);
        if (hint._fadeTimeout) clearTimeout(hint._fadeTimeout);
    };

    return hint;
}

/**
 * Position hint element near target with smart viewport-aware placement
 * Priority: above > below > adjust left/right
 * @param {Element} hint - Hint element to position
 * @param {Element} target - Target element
 */
function positionHint(hint, target) {
    if (!document.body.contains(target)) return;

    const rect = target.getBoundingClientRect();
    const hintRect = hint.getBoundingClientRect();
    const gap = 8;

    // Calculate position above target (preferred)
    let top = rect.top + window.scrollY - hintRect.height - gap;
    let left = rect.left + window.scrollX + (rect.width / 2) - (hintRect.width / 2);

    // Fall back to below if not enough space above
    if (rect.top - hintRect.height - gap < 10) {
        top = rect.bottom + window.scrollY + gap;
        hint.classList.add('below');
    } else {
        hint.classList.remove('below');
    }

    // Adjust left/right if hint extends beyond viewport
    const minLeft = window.scrollX + 10;
    const maxLeft = window.innerWidth + window.scrollX - hintRect.width - 10;

    if (left < minLeft) {
        left = minLeft;
        const arrowOffset = (rect.left + window.scrollX + rect.width / 2) - left;
        const arrow = hint.querySelector('.hint-arrow');
        if (arrow && arrowOffset > 10 && arrowOffset < hintRect.width - 10) {
            arrow.style.left = arrowOffset + 'px';
            arrow.style.transform = 'translateX(0)';
        }
    } else if (left > maxLeft) {
        left = maxLeft;
        const arrowOffset = (rect.left + window.scrollX + rect.width / 2) - left;
        const arrow = hint.querySelector('.hint-arrow');
        if (arrow && arrowOffset > 10 && arrowOffset < hintRect.width - 10) {
            arrow.style.left = arrowOffset + 'px';
            arrow.style.transform = 'translateX(0)';
        }
    } else {
        const arrow = hint.querySelector('.hint-arrow');
        if (arrow) {
            arrow.style.left = '50%';
            arrow.style.transform = 'translateX(-50%)';
        }
    }

    hint.style.position = 'absolute';
    hint.style.top = top + 'px';
    hint.style.left = left + 'px';
}

/**
 * Remove all active hints with fade-out animation
 */
function clearHints() {
    activeHints.forEach(hint => {
        hint.classList.remove('visible');
        if (hint._cleanup) hint._cleanup();
        setTimeout(() => {
            if (hint.parentNode) hint.remove();
        }, 300);
    });
    activeHints = [];
}

// ==================== EXPORTS ====================
window.renderHints = renderHints;
window.clearHints = clearHints;
