// [Previous Firebase and Gemini API configurations remain unchanged]
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

// Global variables
let userRegion = null;
let conversationHistory = []; // Local cache of conversation history
let isTyping = false;

// Valid website pages for URL validation
const validUrls = [
  "https://bayanihan.vercel.app",
  "https://bayanihan.vercel.app/pages/donatenearme.html",
  "https://bayanihan.vercel.app/pages/beavolunteer.html",
  "https://bayanihan.vercel.app/pages/joinasvolunteerorg.html",
  "https://bayanihan.vercel.app/pages/askbayanihan.html",
  "https://bayanihan.vercel.app/pages/login.html",
];

// Get or create a unique session ID
function getSessionId() {
  return auth.currentUser ? auth.currentUser.uid : `guest_${Date.now()}`;
}

// Load conversation history from Firebase
function loadConversationHistory(sessionId) {
  const chatRef = database.ref(`chat_sessions/${sessionId}`);
  chatRef.once('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      conversationHistory = Object.values(data).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    }
  });
}

// Save message to Firebase
function saveMessage(sessionId, message, isUser = false) {
  const chatRef = database.ref(`chat_sessions/${sessionId}`).push();
  chatRef.set({
    role: isUser ? 'user' : 'bot',
    content: message,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  const chatContainer = document.getElementById('chat-container');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-button');

  const sessionId = getSessionId();
  loadConversationHistory(sessionId);

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Magandang umaga po! I'm Lenlen, your AI assistant. Ask me about the Bayanihan system or share your location for tailored help!";
    } else if (hour < 17) {
      return "Magandang tanghali po! I'm Lenlen, your AI assistant. Ask me about the Bayanihan system or share your location for tailored help!";
    } else {
      return "Magandang gabi po! I'm Lenlen, your AI assistant. Ask me about the Bayanihan system or share your location for tailored help!";
    }
  }

  function addMessage(message, isUser = false, saveToDb = true) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', isUser ? 'user' : 'bot');
    messageDiv.innerHTML = message;
    messageDiv.addEventListener('click', () => {
      messageDiv.classList.toggle('expanded');
    });
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    conversationHistory.push({ role: isUser ? 'user' : 'bot', content: message });
    if (saveToDb && conversationHistory.length > 1) { // Only save after first user interaction
      saveMessage(sessionId, message, isUser);
    }
    if (conversationHistory.length > 10) conversationHistory.shift();
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

  function isSystemRelated(query) {
    const lowerQuery = query.toLowerCase().trim();
    const systemKeywords = [
      'bayanihan', 'donate', 'donation', 'volunteer', 'disaster', 'emergency',
      'hotline', 'fire', 'police', 'ambulance', 'mental health', 'relief', 'track',
      'contact', 'about', 'news', 'resources', 'org', 'portal', 'angat buhay',
      'home', 'login', 'leni robredo', 'naga city', 'non-profit', 'relief operations'
    ];
    const regex = new RegExp(`\\b(${systemKeywords.join('|')})\\b`, 'i');
    return regex.test(lowerQuery);
  }

  function isGreeting(query) {
    const lowerQuery = query.toLowerCase().trim();
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(g => lowerQuery === g || lowerQuery.startsWith(g));
  }

  function isLocationQuery(query) {
    const lowerQuery = query.toLowerCase().trim();
    const locationKeywords = ['where am i', 'my location', 'i am in', 'i\'m in', 'city', 'barangay', 'region'];
    return locationKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  function sanitizeString(str) {
    if (!str) return '';
    return str.replace(/[\\'"`()]/g, '').replace(/\s+/g, ' ').trim();
  }

  function validateResponseLinks(response) {
    let cleanedResponse = response;
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>/gi;
    let match;
    while ((match = linkRegex.exec(response)) !== null) {
      const url = match[2];
      if (!validUrls.includes(url)) {
        cleanedResponse = cleanedResponse.replace(match[0], url);
      }
    }
    return cleanedResponse;
  }

  async function getGeminiResponse(prompt, isSystemQuery = true) {
    try {
      const sanitizedPrompt = sanitizeString(prompt);
      const sanitizedLocation = sanitizeString(userRegion);
      const locationContext = sanitizedLocation
        ? `User's location: ${sanitizedLocation}.`
        : "User's location is not specified.";
      const historyContext =
        conversationHistory.length > 0
          ? `Conversation history:\n${conversationHistory
              .map((msg) => `${msg.role}: ${msg.content}`)
              .join('\n')}\n`
          : '';
      let fullPrompt;

      if (isSystemQuery) {
        fullPrompt = `
You are Lenlen, an AI assistant for the Bayanihan | Angat Buhay Disaster Relief Portal (<a href="https://bayanihan.vercel.app">bayanihan.vercel.app</a>), founded by Leni Robredo on July 1, 2022. Leni Robredo is the Chairperson of Angat Buhay, served as the 14th Vice President of the Philippines (2016-2022), and is mayor-elect of Naga City (2025). The portal focuses on disaster relief, education, health, and community empowerment.

${historyContext}
${locationContext}

Answer questions about the Bayanihan system, including:
- Home page (<a href="https://bayanihan.vercel.app">bayanihan.vercel.app</a>)
- Donations (<a href="https://bayanihan.vercel.app/pages/donatenearme.html">Donate Near Me</a>)
- Volunteering (<a href="https://bayanihan.vercel.app/pages/beavolunteer.html">Be a Volunteer</a>, <a href="https://bayanihan.vercel.app/pages/joinasvolunteerorg.html">Join as Volunteer Org</a>)
- Chatbot (<a href="https://bayanihan.vercel.app/pages/askbayanihan.html">Ask Bayanihan</a>)
- Login (<a href="https://bayanihan.vercel.app/pages/login.html">Log in to Bayanihan</a>)
- News, resources, or relief updates

For emergency queries (e.g., fire, police, ambulance, hotline):
- If location is specified, respond with: 'For [emergency type] in [location], dial 911. Contact your local government unit (LGU) for specific numbers.'
- If no location, respond with: 'Please specify your city (e.g., Manila). For now, dial 911 for emergencies and contact your LGU.'
- Do not suggest external search engines or provide specific numbers beyond 911.

For website requests (e.g., 'send me the website'):
- Always provide the Bayanihan website: <a href="https://bayanihan.vercel.app">bayanihan.vercel.app</a> as the primary resource.
- If the query is outside the Bayanihan system, politely note it and suggest visiting <a href="https://bayanihan.vercel.app">bayanihan.vercel.app</a> for system-related info.

Guidelines:
- Keep responses concise (under 100 words), natural, and conversational.
- Format links as HTML <a> tags only for: ${validUrls.join(', ')}.
- If ambiguous, ask for clarification or suggest relevant pages.
- Use context from ${historyContext ? 'conversation history' : 'no prior conversation'} to maintain coherence.

User query: ${sanitizedPrompt}
`;
      } else if (isGreeting(prompt)) {
        fullPrompt = `
You are Lenlen, an AI assistant for the Bayanihan | Angat Buhay Disaster Relief Portal. The user sent a greeting ("${sanitizedPrompt}"). Respond with a friendly, time-appropriate greeting (current time: 1:05 PM PST, June 15, 2025). Example: "Magandang tanghali po! I'm Lenlen, how can I assist you today?" Keep it under 50 words, avoid emergency info, and do not format links.
`;
      } else if (isLocationQuery(prompt)) {
        fullPrompt = `
You are Lenlen, an AI assistant for the Bayanihan | Angat Buhay Disaster Relief Portal. The user asked about their location ("${sanitizedPrompt}"). Since exact location is unknown, ask them to specify their city or barangay (e.g., "Please share your city, like Taguig or Naga!"). Keep it under 50 words, avoid emergency info, and do not format links.
`;
      } else {
        fullPrompt = `
You are Lenlen, an AI assistant for the Bayanihan | Angat Buhay Disaster Relief Portal. The query ("${sanitizedPrompt}") is unrelated to the Bayanihan system, greetings, or location. Politely note it’s outside the scope, provide a general response if possible, and suggest visiting <a href="https://bayanihan.vercel.app">bayanihan.vercel.app</a>. Keep it under 100 words, use HTML <a> tags only for: ${validUrls.join(', ')}. Current time: 1:05 PM PST, June 15, 2025.
${historyContext}
`;
      }

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limit exceeded');
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      const rawResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't understand that.";
      return validateResponseLinks(rawResponse);
    } catch (error) {
      console.error("Error fetching Gemini response:", error);
      if (error.message === 'Rate limit exceeded') {
        return "I'm getting a lot of questions! Please try again in a moment.";
      }
      return "Sorry, I encountered an error. Please try again later.";
    }
  }

  async function detectLocation(attempt = 1, maxAttempts = 3) {
    if (!navigator.geolocation) {
      userRegion = "Philippines";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        console.log(`Geolocation: Lat=${lat}, Lon=${lon}`);

        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=AIzaSyBDtlY28p-MvLHRtxnjiibSAadSETvM3VU`);
          if (!res.ok) {
            if (res.status === 429 && attempt < maxAttempts) {
              console.warn(`Google Maps API rate limit, retrying attempt ${attempt + 1}`);
              setTimeout(() => detectLocation(attempt + 1, maxAttempts), 2000);
              return;
            }
            throw new Error(`Google Maps API error: ${res.status}`);
          }
          const data = await res.json();
          console.log("Google Maps Geocode response:", data);

          if (data.results && data.results.length > 0) {
            const addressComponents = data.results[0].address_components;
            const city = addressComponents.find(c => c.types.includes('locality'))?.long_name || 
                         addressComponents.find(c => c.types.includes('administrative_area_level_2'))?.long_name;
            const barangay = addressComponents.find(c => c.types.includes('sublocality_level_1'))?.long_name;
            const region = addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.long_name;

            if (city || barangay || region) {
              userRegion = [barangay, city, region, "Philippines"].filter(Boolean).join(", ");
            } else {
              userRegion = "Philippines";
              console.warn("No valid location data, defaulting to Philippines");
            }
          } else {
            userRegion = "Philippines";
            console.warn("No results from Google Maps Geocode, defaulting to Philippines");
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          if (attempt < maxAttempts) {
            console.warn(`Retrying attempt ${attempt + 1}`);
            setTimeout(() => detectLocation(attempt + 1, maxAttempts), 2000);
            return;
          }
          userRegion = "Philippines";
          addMessage("Couldn't detect your location. Defaulting to Philippines. Please specify your city if needed!", false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        userRegion = "Philippines";
        addMessage("Geolocation access denied. Defaulting to Philippines. Please specify your city if needed!", false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  sendButton.addEventListener('click', async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    const lowerMessage = message.toLowerCase();
    if (isLocationQuery(message)) {
      const locationWords = message
        .replace(/my location is|i'm in|in|at|where am i/i, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !['the', 'and', 'near'].includes(word.toLowerCase()));
      if (locationWords.length > 0) {
        userRegion = locationWords
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(", ") + ", Philippines";
        addMessage(`Location set to ${userRegion}. How can I assist you?`, false);
        chatInput.value = '';
        return;
      } else {
        addMessage("Please specify your city or barangay, like 'Taguig' or 'Naga'!", false);
        chatInput.value = '';
        return;
      }
    }

    addMessage(message, true);
    chatInput.value = '';
    showLoading();

    const isSystemQuery = isSystemRelated(message);
    const response = await getGeminiResponse(message, isSystemQuery);
    removeLoading();
    addMessage(response, false);
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendButton.click();
  });

  // Display greeting without saving to database initially
  addMessage(getGreeting(), false, false);
  detectLocation();
});

  const toggle = document.getElementById('toggle-questions');
  const container = document.getElementById('preMadeQuestions');
  const chevron = toggle.querySelector('.chevron');
  const chips = document.querySelectorAll('.chip');

  toggle.addEventListener('click', () => {
  const isExpanded = preMadeQuestions.classList.toggle('expanded');

  // Rotate chevron arrow
  if (isExpanded) {
    chevron.style.transform = 'rotate(180deg)';
  } else {
    chevron.style.transform = 'rotate(0deg)';
  }
});

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('chat-input');
      input.value = chip.textContent;
      document.getElementById('send-button').click();

      chip.classList.add('fade-out');
      setTimeout(() => chip.remove(), 300);
    });
  });

  

document.getElementById('send-button').addEventListener('click', () => {
  if (isTyping) return; // prevent sending while bot is "typing"

  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  appendMessage(message, 'user');
  input.value = '';

  // Simulate typing delay
  isTyping = true;
  showTypingIndicator(true);

  setTimeout(() => {
    showTypingIndicator(false);
    appendMessage("Here's Lenlen's response.", 'bot');
    isTyping = false;
    autoScrollChat();
  }, 1200); // adjust timing as needed
});

function showTypingIndicator(show) {
  const indicator = document.getElementById('typing-indicator');
  const input = document.getElementById('chat-input');
  const button = document.getElementById('send-button');

  if (show) {
    indicator.classList.remove('hidden');
    input.disabled = true;
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
  } else {
    indicator.classList.add('hidden');
    input.disabled = false;
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
  }
}

function autoScrollChat() {
  const chatContainer = document.getElementById('chat-container');
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

