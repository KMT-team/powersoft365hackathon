const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const modeSelector = document.getElementById('instructor-mode');

const SESSION_ID = 'session-' + Math.random().toString(36).substr(2, 9);
const USER_ID = 'user-web';

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
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

sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
