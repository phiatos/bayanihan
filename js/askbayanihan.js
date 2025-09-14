// ======================= Firebase Config =======================
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

// Initialize Firebase
let database, auth;
try {
  firebase.initializeApp(firebaseConfig);
  database = firebase.database();
  auth = firebase.auth();
} catch (error) {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to connect to Firebase. Please refresh the page.",
    });
  }
  console.error("Firebase init error:", error);
}

// ======================= Global Vars =======================
let conversationHistory = [];
let isTyping = false;
let requestCount = 0;
let lastRequestTime = 0;

// Valid website pages
const validUrls = [
  "https://www.angat-bayanihan.com",
  "https://www.angat-bayanihan.com/pages/donatenearme.html",
  "https://www.angat-bayanihan.com/pages/beavolunteer.html",
  "https://www.angat-bayanihan.com/pages/joinasvolunteerorg.html",
  "https://www.angat-bayanihan.com/pages/askbayanihan.html",
  "https://www.angat-bayanihan.com/pages/login.html",
  "https://www.angat-bayanihan.com/pages/dashboard.html",
  "https://www.angat-bayanihan.com/index.html",
];

// ======================= Gemini AI =======================
async function askAI(prompt) {
  const MINUTE_MS = 60000;
  const MAX_REQUESTS_PER_MINUTE = 5; // Safety limit to control costs

  // Rate limiting check
  const now = Date.now();
  if (now - lastRequestTime > MINUTE_MS) {
    requestCount = 0; // Reset count after a minute
    lastRequestTime = now;
  }
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    return "Sorry, I’ve reached the request limit for this minute. Please wait a moment and try again to avoid excessive costs.";
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyD1gkrLFf2TtRbKmIJgMGXJZcN0nHJHGKA",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are Lenlen, the Bayanihan AI assistant. Help users with disaster relief, donations, volunteering, emergencies, and general Filipino community support. Respond in a polite tone, using "po" for respect. Current date and time: September 14, 2025, 10:05 PM PST. For queries like 'How can I get involved?' or 'Where can I find updates on ongoing operations?', include relevant links from the following list in your response: ${validUrls.join(", ")}. User prompt: ${prompt}`
            }]
          }],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Response status:", response.status, "Error details:", errorText);
      throw new Error(`AI HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    requestCount++; // Increment only on success
    return data.candidates[0].content.parts[0].text || "No response from AI.";

  } catch (error) {
    console.error("AI fetch error:", error);
    if (error.message.includes("429")) {
      return "Sorry, the API has exceeded its quota. Please check your Google Cloud Console for usage and consider upgrading your plan if needed.";
    } else if (error.message.includes("401") || error.message.includes("403")) {
      return "Sorry, authentication failed. The API key might be invalid. Please verify it in the Google Cloud Console.";
    }
    return `Sorry, I couldn’t connect to the AI right now. Please try again or check your internet connection. Error: ${error.message}`;
  }
}

// ======================= Helpers =======================
function getSessionId() {
  return auth && auth.currentUser ? auth.currentUser.uid : `guest_${Date.now()}`;
}

function loadConversationHistory(sessionId) {
  if (!database) return;
  const chatRef = database.ref(`chat_sessions/${sessionId}`);
  chatRef.once("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
      conversationHistory = Object.values(data).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
      updateChatDisplay();
    }
  }, (error) => {
    console.error("Failed to load conversation history:", error);
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "warning",
        title: "Warning",
        text: "Could not load chat history. Starting fresh.",
      });
    }
  });
}

function saveMessage(sessionId, message, isUser = false) {
  if (!database) return;
  const chatRef = database.ref(`chat_sessions/${sessionId}`).push();
  chatRef.set(
    {
      role: isUser ? "user" : "bot",
      content: message,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    },
    (error) => {
      if (error) console.error("Failed to save message:", error);
    }
  );
}

function addMessage(message, isUser = false, saveToDb = true) {
  const chatContainer = document.getElementById("chat-container");
  if (!chatContainer) return;
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("chat-message", isUser ? "user" : "bot");
  messageDiv.innerHTML = message; // Sanitization handled by DOMPurify if available
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  conversationHistory.push({ role: isUser ? "user" : "bot", content: message });
  if (saveToDb && conversationHistory.length > 1) {
    saveMessage(getSessionId(), message, isUser);
  }
  if (conversationHistory.length > 20) conversationHistory.shift();
}

function updateChatDisplay() {
  const chatContainer = document.getElementById("chat-container");
  if (!chatContainer) return;
  chatContainer.innerHTML = '';
  conversationHistory.forEach(msg => {
    addMessage(msg.content, msg.role === "user", false);
  });
}

function showTypingIndicator(show) {
  const typingIndicator = document.getElementById("typing-indicator") || document.createElement("div");
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-button");
  const clearButton = document.getElementById("clear-button");

  if (!typingIndicator.id) {
    typingIndicator.id = "typing-indicator";
    typingIndicator.classList.add("hidden");
    typingIndicator.textContent = "Lenlen is typing...";
    const chatContainer = document.getElementById("chat-container");
    chatContainer.appendChild(typingIndicator);
  }

  if (show) {
    typingIndicator.classList.remove("hidden");
    if (chatInput) chatInput.disabled = true;
    if (sendButton) sendButton.disabled = true;
    if (clearButton) clearButton.disabled = true;
  } else {
    typingIndicator.classList.add("hidden");
    if (chatInput) chatInput.disabled = false;
    if (sendButton) sendButton.disabled = false;
    if (clearButton) clearButton.disabled = false;
  }
}

// ======================= DOM Ready =======================
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle-questions");
  const preMadeQuestions = document.getElementById("preMadeQuestions");
  const questionChips = document.getElementById("questionChips");
  const chatContainer = document.getElementById("chat-container");
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-button");
  const clearButton = document.getElementById("clear-button");

  if (!chatContainer || !chatInput || !sendButton) {
    console.error("Missing required DOM elements: chat-container, chat-input, or send-button");
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Chat interface failed to load. Please refresh the page.",
      });
    }
    return;
  }

  showTypingIndicator(false);

  const sessionId = getSessionId();
  loadConversationHistory(sessionId);

  // Initial greeting from AI
  addMessage("👋 Magandang gabi po! I'm Lenlen, your Bayanihan assistant. What can I do for you?", false, false);

  // Toggle pre-made questions
  if (toggle && preMadeQuestions) {
    const chevron = toggle.querySelector(".chevron path");
    toggle.addEventListener("click", () => {
      const isExpanded = preMadeQuestions.classList.toggle("expanded");
      if (chevron) {
        chevron.setAttribute("d", isExpanded ? "M6 12l4-4 4 4" : "M6 8l4 4 4-4");
      }
    });
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") toggle.click();
    });
  }

  // Handle pre-made questions
  if (questionChips) {
    questionChips.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", async () => {
        if (isTyping) return;
        const message = chip.textContent;
        isTyping = true;
        addMessage(message, true);
        showTypingIndicator(true);
        const response = await askAI(message);
        showTypingIndicator(false);
        addMessage(response, false);
        isTyping = false;
        chip.classList.add("fade-out");
        setTimeout(() => chip.remove(), 300);
      });
      chip.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") chip.click();
      });
    });
  }

  // Send button click
  sendButton.addEventListener("click", async () => {
    if (isTyping) return;
    const message = chatInput.value.trim();
    if (!message) return;

    isTyping = true;
    addMessage(message, true);
    chatInput.value = "";
    showTypingIndicator(true);

    const response = await askAI(message);
    showTypingIndicator(false);
    addMessage(response, false);
    isTyping = false;
  });

  // Enter key support
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !isTyping) sendButton.click();
  });

  // Clear chat
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      if (isTyping) return;
      if (confirm("Are you sure you want to clear the chat history?")) {
        conversationHistory = [];
        chatContainer.innerHTML = '';
        saveMessage(sessionId, "Chat cleared by user", true);
        addMessage("Chat history has been cleared.", false, false);
      }
    });
  }
});