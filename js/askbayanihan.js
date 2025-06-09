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

// Valid website pages for URL validation
const validUrls = [
  "https://bayanihan.vercel.app",
  "https://bayanihan.vercel.app/pages/donatenearme.html",
  "https://bayanihan.vercel.app/pages/beavolunteer.html",
  "https://bayanihan.vercel.app/pages/joinasvolunteerorg.html",
  "https://bayanihan.vercel.app/pages/askbayanihan.html",
  "https://bayanihan.vercel.app/pages/login.html",
];

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  const chatContainer = document.getElementById('chat-container');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-button');

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Magandang umaga po! I'm Lenlen, your AI assistant. Ask me anything about the Bayanihan system or let me know your location for tailored help!";
    } else if (hour < 17) {
      return "Magandang tanghali po! I'm Lenlen, your AI assistant. Ask me anything about the Bayanihan system or let me know your location for tailored help!";
    } else {
      return "Magandang gabi po! I'm Lenlen, your AI assistant. Ask me anything about the Bayanihan system or let me know your location for tailored help!";
    }
  }

  function addMessage(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', isUser ? 'user' : 'bot');
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

  function isSystemRelated(query) {
    const lowerQuery = query.toLowerCase().trim();
    const systemKeywords = [
      'bayanihan', 'donate', 'donation', 'volunteer', 'disaster', 'emergency',
      'hotline', 'fire', 'police', 'ambulance', 'mental health', 'relief', 'track',
      'contact', 'about', 'news', 'resources', 'org', 'portal', 'angat buhay',
      'home', 'login'
    ];
    return systemKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  function isGreeting(query) {
    const lowerQuery = query.toLowerCase().trim();
    return ['hi', 'hello', 'hey'].includes(lowerQuery);
  }

  function isLocationQuery(query) {
    const lowerQuery = query.toLowerCase().trim();
    return lowerQuery.includes("where") && (lowerQuery.includes("i am") || lowerQuery.includes("my location"));
  }

  function sanitizeString(str) {
    if (!str) return '';
    return str.replace(/['"`()]/g, '');
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
      const locationContext = sanitizedLocation ? `The user's location is ${sanitizedLocation}.` : "The user's location is not specified.";
      let fullPrompt;

      if (isSystemQuery) {
        fullPrompt = `
You are Lenlen, an AI assistant for the Bayanihan | Angat Buhay Disaster Relief Portal (accessible at <a href="https://bayanihan.vercel.app">bayanihan.vercel.app</a>), founded by Leni Robredo, the Chairperson of Angat Buhay. She established the non-profit on July 1, 2022, focusing on disaster relief, education, health, and community empowerment. She served as the 14th Vice President of the Philippines (2016-2022) and is now mayor-elect of Naga City (2025). Your job is to answer questions related to the Bayanihan system, covering all content on the website, including:
- Home page (<a href="https://bayanihan.vercel.app">bayanihan.vercel.app</a>)
- Donating (via <a href="https://bayanihan.vercel.app/pages/donatenearme.html">Donate Near Me</a>)
- Volunteering (individuals at <a href="https://bayanihan.vercel.app/pages/beavolunteer.html">Be a Volunteer</a>, organizations at <a href="https://bayanihan.vercel.app/pages/joinasvolunteerorg.html">Join as Volunteer Org</a>)
- Ask Bayanihan chatbot (<a href="https://bayanihan.vercel.app/pages/askbayanihan.html">Ask Bayanihan</a>)
- Login page (<a href="https://bayanihan.vercel.app/pages/login.html">Log in to Bayanihan</a>)
- Other website content (e.g., news, resources, or relief operation updates)

The system connects Filipinos with resources during disasters, facilitating donations and organizing volunteers, but it does not directly connect to live emergency hotlines.

For emergency-related queries (e.g., fire hotlines):
- Recommend calling 911, the national emergency hotline in the Philippines, as the first step.
- Use the user's location if provided (${locationContext}) to suggest checking local government unit (LGU) websites for specific hotline numbers.
- Do not include links to external sites like bfp.gov.ph or ncmh.gov.ph; mention them as plain text if relevant.

For all responses:
- Keep answers concise, under 100 words.
- Format links as HTML <a> tags only for valid URLs: ${validUrls.join(', ')}.
- If asked about Leni Robredo, state she is the Chairperson of Angat Buhay, founded it on July 1, 2022, served as Vice President (2016-2022), and is mayor-elect of Naga City (2025).
- If the query is ambiguous, ask for clarification or direct to relevant website pages.
- Avoid lengthy explanations.

User query: ${sanitizedPrompt}
`;
      } else if (isGreeting(prompt)) {
        fullPrompt = `
You are Lenlen, an AI assistant for the Bayanihan | Angat Buhay Disaster Relief Portal. The user sent a simple greeting ("${sanitizedPrompt}"). Respond with a concise, friendly greeting (e.g., 'Magandang tanghali po! I'm Lenlen, your AI assistant. How can I help you?') based on the current time (12:00 PM PST on Sunday, June 08, 2025). Keep it under 100 words, avoid emergency hotline info, and do not format any links.
`;
      } else if (isLocationQuery(prompt)) {
        fullPrompt = `
You are Lenlen, an AI assistant for the Bayanihan | Angat Buhay Disaster Relief Portal. The user asked about their location ("${sanitizedPrompt}"). Since I cannot determine their exact location, respond with a concise prompt asking them to specify their city (e.g., 'Please tell me your city, like Taguig!'). Keep the response under 100 words, avoid emergency hotline info unless explicitly asked, and do not format any links. Current date and time: 12:00 PM PST on Sunday, June 08, 2025.
`;
      } else {
        fullPrompt = `
You are Lenlen, an AI assistant for the Bayanihan | Angat Buhay Disaster Relief Portal. The user has asked a question that is not related to the Bayanihan system, not a greeting, and not a location query. Provide a concise, accurate, and helpful answer based on your knowledge. Politely note that the query is outside the Bayanihan system's scope but still provide a brief response. Keep answers under 100 words and format any links as HTML <a> tags only for valid URLs: ${validUrls.join(', ')}. Current date and time: 12:00 PM PST on Sunday, June 08, 2025.

User query: ${sanitizedPrompt}
`;
      }

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
      const rawResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't understand that.";
      return validateResponseLinks(rawResponse);
    } catch (error) {
      console.error("Error fetching Gemini response:", error);
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
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`);
          if (!res.ok) {
            if (res.status === 429 && attempt < maxAttempts) {
              console.warn(`Nominatim rate limit, retrying attempt ${attempt + 1}`);
              setTimeout(() => detectLocation(attempt + 1, maxAttempts), 2000);
              return;
            }
            throw new Error(`Nominatim error: ${res.status}`);
          }
          const data = await res.json();
          console.log("Nominatim response:", data);

          const address = data.address || {};
          const city = address.city || address.municipality || address.town || '';
          const barangay = address.village || address.barangay || '';
          const region = address.region || address.state || '';
          const displayName = data.display_name || '';

          if (city || barangay || region) {
            userRegion = [barangay, city, region, "Philippines"].filter(Boolean).join(", ");
          } else if (displayName) {
            userRegion = displayName.split(", ").slice(0, 3).join(", ") + ", Philippines";
          } else {
            userRegion = "Philippines";
            console.warn("No valid location data, defaulting to Philippines");
          }
        } catch (error) {
          console.error("Reverse-geocode error:", error);
          if (attempt < maxAttempts) {
            console.warn(`Retrying attempt ${attempt + 1}`);
            setTimeout(() => detectLocation(attempt + 1, maxAttempts), 2000);
            return;
          }
          userRegion = "Philippines";
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        userRegion = "Philippines";
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  sendButton.addEventListener('click', async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("location") || lowerMessage.includes("region") || lowerMessage.includes("city") || lowerMessage.includes("barangay") || lowerMessage.includes("i'm in")) {
      const locationWords = message
        .replace(/my location is|i'm in|in|at/i, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !['the', 'and', 'near'].includes(word.toLowerCase()));
      if (locationWords.length > 0) {
        userRegion = locationWords
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(", ") + ", Philippines";
        addMessage(`I've set your location to ${userRegion}. How can I assist you?`, true);
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

  addMessage(getGreeting());
  detectLocation();
});