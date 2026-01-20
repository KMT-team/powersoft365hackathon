/**
 * tutor.js
 * 
 * Handles chat interaction for the Tutor.
 * Uses namespaced IDs (tutor-) and classes.
 */

const chatHistory = document.getElementById('tutor-chat-history');
const userInput = document.getElementById('tutor-user-input');
const sendBtn = document.getElementById('tutor-send-btn');
const modeSelector = document.getElementById('tutor-instructor-mode');

const SESSION_ID = 'session-' + Math.random().toString(36).substr(2, 9);
const USER_ID = 'user-web';

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    // Namespace: tutor-message, tutor-user/tutor-bot
    msgDiv.classList.add('tutor-message', 'tutor-' + sender);

    const bubble = document.createElement('div');
    bubble.classList.add('tutor-bubble');
    bubble.innerText = text;

    msgDiv.appendChild(bubble);
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    userInput.value = '';
    userInput.focus();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                user_id: USER_ID,
                session_id: SESSION_ID,
                mode: modeSelector.value
            })
        });

        if (!res.ok) throw new Error('Network response was not ok');

        const data = await res.json();
        addMessage(data.response, 'bot');
    } catch (error) {
        console.error('Error:', error);
        addMessage("Sorry, something went wrong. 😓", 'bot');
    }
}

// --- Collapsible Pane Logic ---
const toggleBtn = document.getElementById('tutor-toggle-btn');
const toggleIcon = document.getElementById('tutor-toggle-icon');
const classroomGrid = document.getElementById('classroom-grid');

if (toggleBtn && classroomGrid) {
    toggleBtn.addEventListener('click', () => {
        classroomGrid.classList.toggle('classroom-collapsed');

        // Rotate icon 180deg if collapsed
        if (classroomGrid.classList.contains('classroom-collapsed')) {
            toggleIcon.style.transform = 'rotate(180deg)';
        } else {
            toggleIcon.style.transform = 'rotate(0deg)';
        }
    });
}

if (sendBtn) sendBtn.addEventListener('click', sendMessage);

if (userInput) {
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}
