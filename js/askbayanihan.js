// askbayanihan.js
const firebaseConfig = {
    apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    authDomain: "bayanihan-5ce7e.firebaseapp.com",
    databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bayanihan-5ce7e",
    storageBucket: "bayanihan-5ce7e.appspot.com",
    messagingSenderId: "593123849917",
    appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    measurementId: "G-ZTQ9VXXVV0",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Gemini API Config
const GEMINI_API_KEY = "AIzaSyDWv5Yh1VjKzP4pVIhyyr6hu54nlPvx61Y";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

// Global variable to store user's region
let userRegion = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');

    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', isUser ? 'user' : 'bot');
        // Render HTML content to allow clickable links
        messageDiv.innerHTML = message;
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('chat-message', 'bot');
        loadingDiv.textContent = 'Lenlen is thinking...';
        loadingDiv.id = 'loading-message';
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function removeLoading() {
        const loadingDiv = document.getElementById('loading-message');
        if (loadingDiv) loadingDiv.remove();
    }

    async function getGeminiResponse(prompt) {
        try {
            const locationContext = userRegion ? `The user's location is ${userRegion}.` : "The user's location is not specified.";
            const fullPrompt = `
You are Lenlen, an AI assistant for the Bayanihan | Angat Buhay Disaster Relief Portal.
Your job is to help users with questions about:
- Donating (users can donate items or money via the "Donate Near Me" page)
- Volunteering (users can sign up as individuals on the "Be a Volunteer" page or as organizations on the "Join as Volunteer Org" page)
- Portal features (real-time disaster tracking, volunteer registration, donation management, accessible at bayanihan.org)
- Emergency concerns (like fire, police, ambulance, or mental health hotlines)

The system connects Filipinos with resources during disasters, facilitating donations, organizing volunteers, and providing information, but it does not directly connect to live emergency hotlines or maintain a database of them.

If the user asks for fire emergency contacts:
- Always recommend calling 911, the national emergency hotline in the Philippines, as the first step.
- Provide specific, up-to-date fire emergency hotline numbers for the user's location if known (${locationContext}). For example, if the user is in Malolos, Bulacan, provide the local Bureau of Fire Protection (BFP) hotline.
- Format any links as HTML <a> tags to be clickable, e.g., <a href="https://bfp.gov.ph">https://bfp.gov.ph</a>.
- Include links to reliable resources like the Bureau of Fire Protection (<a href="https://bfp.gov.ph">https://bfp.gov.ph</a>) or local government unit (LGU) websites when relevant.
- Keep responses concise, under 100 words, and avoid lengthy explanations. Provide exact numbers and clickable links directly.
- If specific local numbers are unavailable or the location is unknown, suggest checking the official Bureau of Fire Protection website (<a href="https://bfp.gov.ph">https://bfp.gov.ph</a>) or the local LGU website for the most current numbers.

Maximize your knowledge to provide the most accurate and helpful fire emergency contacts based on the current date and time: 12:50 PM PST on Friday, June 06, 2025.

User query: ${prompt}
`;

            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: fullPrompt }]
                    }]
                })
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't understand that.";
        } catch (error) {
            console.error("Error fetching Gemini response:", error);
            return "Sorry, I encountered an error. Please try again later.";
        }
    }

    async function detectLocation() {
        if (!navigator.geolocation) {
            addMessage("I couldn't detect your location automatically. Please tell me your region or city for more tailored assistance!");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
                const data = await res.json();
                const address = data.address;
                if (address && (address.city || address.municipality)) {
                    userRegion = `${address.barangay || ''}${address.barangay ? ', ' : ''}${address.city || address.municipality || ''}, Philippines`;
                } else {
                    addMessage("I couldn't determine your exact location. Please tell me your region or city for more tailored assistance!");
                }
            } catch (error) {
                console.warn("Failed to detect location:", error);
                addMessage("I couldn't detect your location due to an error. Please tell me your region or city for more tailored assistance!");
            }
        }, (error) => {
            console.warn("Geolocation error:", error);
            addMessage("I couldn't access your location. Please allow location access or tell me your region or city for more tailored assistance!");
        });
    }

    sendButton.addEventListener('click', async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        // Check if the user is providing a location
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes("location") || lowerMessage.includes("region") || lowerMessage.includes("city")) {
            const regionMatch = message.match(/\b(malolos|tagui(g|north daang ?hari)|ncr|calabarzon|central luzon|visayas|mindanao|philippines|metro manila|laguna|batangas|cavite|rizal|quezon|pampanga|tarlac|bulacan|nueva ecija|cebu|iloilo|negros|davao|cagayan de oro|zamboanga)\b/i);
            if (regionMatch) {
                userRegion = regionMatch[0].includes("north daang") ? "Taguig, North Daang Hari, Philippines" : `${regionMatch[0]}, Philippines`;
                addMessage(`I've updated your location to ${userRegion}. Let me know how I can assist you!`, true);
            }
        }

        addMessage(message, true);
        chatInput.value = '';
        showLoading();

        const response = await getGeminiResponse(message);
        removeLoading();
        addMessage(response, false);
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendButton.click();
    });

    addMessage("Magandang tanghali po! I'm Lenlen, your AI assistant. Ask me anything about the Bayanihan system or let me know your location for tailored help!");
    detectLocation(); // Start location detection
});