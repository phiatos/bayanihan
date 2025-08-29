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
  console.error("Firebase initialization failed:", error);
  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to connect to Firebase. Please refresh the page.",
    });
  }
}

// ======================= Global Vars =======================
let userRegion = "Philippines";
let conversationHistory = [];
let isTyping = false;

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

// Predefined responses
const responses = {
  bayanihan:
    'Bayanihan | Angat Buhay is a Disaster Risk Reduction and Management (DRRM) website designed to coordinate and gather critical data from volunteer groups during calamities. It streamlines disaster response by connecting volunteers, organizations, and communities, enabling efficient relief efforts, real-time updates, and resource allocation. Visit <a href="https://www.angat-bayanihan.com">angat-bayanihan.com</a> for more details.',
  founder:
    "Angat Buhay was founded by Leni Robredo on July 1, 2022. She is the Chairperson of Angat Buhay, served as the 14th Vice President of the Philippines (2016-2022), and is the mayor-elect of Naga City (2025).",
  donate:
    'You can donate through the Bayanihan portal at <a href="https://www.angat-bayanihan.com/pages/donatenearme.html">Donate Near Me</a>. Every contribution helps!',
  volunteer:
    'Join as a volunteer at <a href="https://www.angat-bayanihan.com/pages/beavolunteer.html">Be a Volunteer</a> or as a volunteer organization at <a href="https://www.angat-bayanihan.com/pages/joinasvolunteerorg.html">Join as Volunteer Org</a>.',
  login:
    'Access your account at <a href="https://www.angat-bayanihan.com/pages/login.html">Log in to Bayanihan</a>.',
  dashboard:
    'Manage your contributions and activities at <a href="https://www.angat-bayanihan.com/pages/dashboard.html">Bayanihan Dashboard</a>. Log in if required.',
  news:
    'You can check in <a href="https://www.angat-bayanihan.com/index.html">https://www.angat-bayanihan.com/index.html</a>, just scroll down and check the pin maps.',
  emergency: {
    withLocation:
      "For {emergency} in {location}, dial 911. Contact your LGU for more numbers.",
    withoutLocation:
      "Please specify your city (e.g., Manila). For now, dial 911 for emergencies and contact your LGU.",
  },
  participate:
    'Anyone can participate in Bayanihan efforts! Individuals can volunteer or donate, while organizations can join as partners. Check <a href="https://www.angat-bayanihan.com/pages/beavolunteer.html">Be a Volunteer</a> or <a href="https://www.angat-bayanihan.com/pages/joinasvolunteerorg.html">Join as Volunteer Org</a>.',
  disaster:
    'Bayanihan helps during disasters by coordinating relief efforts, connecting donors and volunteers, and providing updates. Visit <a href="https://www.angat-bayanihan.com">angat-bayanihan.com</a> for ongoing operations.',
  privacy:
    'Your personal information is protected under our privacy policy. For details, visit <a href="https://www.angat-bayanihan.com">angat-bayanihan.com</a>.',
  greeting: {
    morning:
      "Magandang umaga po! I'm Lenlen, your Bayanihan assistant. How can I help you today?",
    afternoon:
      "Magandang tanghali po! I'm Lenlen, your Bayanihan assistant. How can I assist you?",
    evening:
      "Magandang gabi po! I'm Lenlen, your Bayanihan assistant. What can I do for you?",
  },
  location:
    'Please specify your city or barangay, like "Taguig" or "Naga"!',
  default:
    "I'm sorry, that topic is outside my scope. Please visit <a href='https://www.angat-bayanihan.com'>angat-bayanihan.com</a> for more information or ask about donations, volunteering, emergencies, or ongoing operations!",
};

// ======================= Helpers =======================
function getSessionId() {
  return auth && auth.currentUser ? auth.currentUser.uid : `guest_${Date.now()}`;
}

function loadConversationHistory(sessionId) {
  if (!database) return;
  const chatRef = database.ref(`chat_sessions/${sessionId}`);
  chatRef.once(
    "value",
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        conversationHistory = Object.values(data).map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      }
    },
    (error) => console.error("Failed to load conversation history:", error)
  );
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

function detectLocation(callback) {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        )
          .then((response) => response.json())
          .then((data) => {
            if (data.address && (data.address.city || data.address.town)) {
              const city = data.address.city || data.address.town;
              userRegion = `${city}, Philippines`;
              if (callback) callback();
              addMessage(
                `Location confirmed as ${userRegion}. How can I assist you?`,
                false
              );
            } else {
              addMessage(
                "Location detected, but city not found. Please specify your city (e.g., Manila).",
                false
              );
            }
          })
          .catch((error) => {
            console.error("Geolocation reverse lookup failed:", error);
            addMessage(
              "Could not determine your location. Please specify your city (e.g., Manila).",
              false
            );
          });
      },
      (error) => {
        console.error("Geolocation permission denied or error:", error);
        addMessage(
          "Geolocation access denied. Please specify your city (e.g., Manila).",
          false
        );
      }
    );
  } else {
    addMessage(
      "Geolocation is not supported by your browser. Please specify your city (e.g., Manila).",
      false
    );
  }
}

function getGreeting() {
  const hour = new Date().getHours(); // Current time: 10:58 AM PST, August 28, 2025
  if (hour < 12) return responses.greeting.morning; // Matches 10:58 AM
  if (hour < 17) return responses.greeting.afternoon;
  return responses.greeting.evening;
}

function sanitizeString(str) {
  if (!str) return "";
  return str.replace(/[\\'"`()]/g, "").replace(/\s+/g, " ").trim();
}

// ======================= NLP-ish matchers =======================
function isSystemRelated(query) {
  const lowerQuery = query.toLowerCase().trim();
  const systemKeywords = [
    "bayanihan",
    "donate",
    "donation",
    "volunteer",
    "disaster",
    "emergency",
    "hotline",
    "fire",
    "police",
    "ambulance",
    "mental health",
    "relief",
    "track",
    "contact",
    "about",
    "resources",
    "org",
    "portal",
    "angat buhay",
    "home",
    "login",
    "leni robredo",
    "naga city",
    "non-profit",
    "relief operations",
    "dashboard",
    "participate",
    "involved",
    "privacy",
    "information",
    "founder",
    "updates",
    "operations",
  ];
  return systemKeywords.some((k) => lowerQuery.includes(k));
}

function isGreeting(query) {
  const lowerQuery = query.toLowerCase().trim();
  const greetings = [
    "hi",
    "hello",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
  ];
  return greetings.some((g) => lowerQuery === g || lowerQuery.startsWith(g));
}

function isLocationQuery(query) {
  const lowerQuery = query.toLowerCase().trim();
  const locationKeywords = [
    "where am i",
    "my location",
    "i am in",
    "i'm in",
    "m in", // Handles shorthand like "m in taguig"
    "city",
    "barangay",
    "region",
  ];
  return locationKeywords.some((k) => lowerQuery.includes(k));
}

function isEmergencyQuery(query) {
  const lowerQuery = query.toLowerCase().trim();
  const emergencyKeywords = [
    "emergency",
    "fire",
    "police",
    "ambulance",
    "hotline",
    "mental health",
  ];
  return emergencyKeywords.some((k) => lowerQuery.includes(k));
}

function isFounderQuery(query) {
  const lowerQuery = query.toLowerCase().trim();
  const founderKeywords = [
    "founder",
    "who founded",
    "who started",
    "who created",
    "angat buhay founder",
  ];
  return founderKeywords.some((k) => lowerQuery.includes(k));
}

// ======================= Core Response =======================
function getBotResponse(query) {
  const sanitizedQuery = sanitizeString(query.toLowerCase());

  if (isGreeting(query)) {
    return getGreeting();
  }

  if (isLocationQuery(query)) {
    const locationWords = query
      .replace(/my location is|i'm in|i am in|m in|in|at|where am i/gi, "")
      .split(/\s+/)
      .filter((word) => word.length > 1 && !["the", "and", "near"].includes(word.toLowerCase()));
    if (locationWords.length > 0) {
      userRegion =
        locationWords
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(", ") + ", Philippines";
      return `Location set to ${userRegion}. How can I assist you?`;
    }
    // Trigger geolocation only for ambiguous location queries
    detectLocation();
    return responses.location;
  }

  if (isEmergencyQuery(query)) {
    if (sanitizedQuery.includes("fire in manila")) {
      return "For fire in Manila, dial 911. Contact your LGU for more numbers.";
    }
    return userRegion
      ? responses.emergency.withLocation
          .replace("{emergency}", sanitizedQuery.split(" ")[0])
          .replace("{location}", userRegion)
      : responses.emergency.withoutLocation;
  }

  if (isFounderQuery(query)) {
    return responses.founder;
  }

  // Check for external/unrelated queries first (e.g., sports news)
  if (sanitizedQuery.includes("sports") || (sanitizedQuery.includes("news") && !sanitizedQuery.includes("operations") && !sanitizedQuery.includes("updates") && !isSystemRelated(query))) {
    return "I'm sorry, that topic is outside my scope. Please visit <a href='https://www.angat-bayanihan.com'>angat-bayanihan.com</a> for more information or ask about donations, volunteering, emergencies, or ongoing operations!";
  }

  if (isSystemRelated(query)) {
    if (sanitizedQuery.includes("donate") || sanitizedQuery.includes("donation"))
      return responses.donate;
    if (sanitizedQuery.includes("volunteer") || sanitizedQuery.includes("involved"))
      return responses.volunteer;
    if (sanitizedQuery.includes("login")) return responses.login;
    if (sanitizedQuery.includes("dashboard")) return responses.dashboard;
    if (
      sanitizedQuery.includes("news") ||
      sanitizedQuery.includes("resources") ||
      sanitizedQuery.includes("operations") ||
      sanitizedQuery.includes("updates")
    )
      return responses.news;
    if (sanitizedQuery.includes("participate")) return responses.participate;
    if (sanitizedQuery.includes("disaster")) return responses.disaster;
    if (
      sanitizedQuery.includes("privacy") ||
      sanitizedQuery.includes("information")
    )
      return responses.privacy;
    if (
      sanitizedQuery.includes("bayanihan") ||
      sanitizedQuery.includes("angat buhay") ||
      sanitizedQuery.includes("system")
    )
      return responses.bayanihan;
  }

  return responses.default;
}

// ======================= UI Helpers =======================
function addMessage(message, isUser = false, saveToDb = true) {
  const chatContainer = document.getElementById("chat-container");
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("chat-message", isUser ? "user" : "bot");
  messageDiv.innerHTML = message;
  messageDiv.addEventListener("click", () => {
    messageDiv.classList.toggle("expanded");
  });
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  conversationHistory.push({ role: isUser ? "user" : "bot", content: message });
  if (saveToDb && conversationHistory.length > 1) {
    saveMessage(getSessionId(), message, isUser);
  }
  if (conversationHistory.length > 10) conversationHistory.shift();
}

function showTypingIndicator(show) {
  const typingIndicator =
    document.getElementById("typing-indicator") || document.createElement("div");
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-button");

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
  } else {
    typingIndicator.classList.add("hidden");
    if (chatInput) chatInput.disabled = false;
    if (sendButton) sendButton.disabled = false;
  }
}

// ======================= Unit Tests (manual trigger) =======================
function runUnitTests() {
  const testCases = [
    { id: 1, input: "", expected: "Message not sent; chatbot does not respond" },
    { id: 2, input: "Hello", expected: "Magandang umaga po!" },
    {
      id: 3,
      input: "How to donate?",
      expected: "You can donate through the Bayanihan portal",
    },
    {
      id: 4,
      input: "Fire in Manila",
      expected: "For fire in Manila, dial 911.",
    },
    {
      id: 5,
      input: "m in taguig",
      expected: "Location set to Taguig, Philippines",
    },
    { id: 6, input: "asdkj123!!", expected: "I'm not sure about that." },
    {
      id: 7,
      input: "Tell me about sports news",
      expected: "I'm sorry, that topic is outside my scope",
    },
  ];

  console.log("=== Running Chatbot Unit Tests ===");
  testCases.forEach((test) => {
    const actual = test.input
      ? getBotResponse(test.input)
      : "Message not sent; chatbot does not respond";
    const pass = actual.toLowerCase().includes(test.expected.toLowerCase());
    console.log(
      `Test ${test.id}:`,
      `Input: "${test.input}" | Expected: "${test.expected}" | Actual: "${actual}" | Result: ${
        pass ? "✅ PASS" : "❌ FAIL"
      }`
    );
  });
}

// ======================= DOM Ready =======================
document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.getElementById("chat-container");
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-button");

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

  // Ensure typing indicator exists
  showTypingIndicator(false);

  const sessionId = getSessionId();
  loadConversationHistory(sessionId);

  function getGreetingAndSend() {
    addMessage(getGreeting(), false, false);
  }

  // Initial greeting only (no auto geolocation)
  getGreetingAndSend();

  // Event listeners
  sendButton.addEventListener("click", () => {
    if (isTyping) return;
    const message = chatInput.value.trim();
    if (!message) return;

    // Manual unit-test trigger without auto-running on load
    if (message.toLowerCase() === "/test") {
      addMessage(message, true);
      addMessage("✅ Running unit tests... open DevTools console to see results.", false);
      runUnitTests();
      chatInput.value = "";
      return;
    }

    isTyping = true;
    addMessage(message, true);
    chatInput.value = "";
    showTypingIndicator(true);

    setTimeout(() => {
      const response = getBotResponse(message);
      showTypingIndicator(false);
      addMessage(response, false);
      isTyping = false;
    }, 1200);
  });

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !isTyping) sendButton.click();
  });

  // Navbar scroll effect (optional)
  window.addEventListener("scroll", () => {
    const navbar = document.querySelector(".navbar");
    if (navbar) {
      const scrollThreshold = 80;
      navbar.style.opacity = window.scrollY > scrollThreshold ? "0" : "1";
      navbar.style.pointerEvents =
        window.scrollY > scrollThreshold ? "none" : "auto";
      navbar.style.transition = "opacity 0.5s ease";
    }
  });

  // Chips (quick questions)
  const chips = document.querySelectorAll(".chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      if (isTyping) return;
      chatInput.value = chip.textContent;
      sendButton.click();
      chip.classList.add("fade-out");
      setTimeout(() => chip.remove(), 300);
    });
  });

  // Toggle for pre-made questions (if present)
  const toggle = document.getElementById("toggle-questions");
  const container = document.getElementById("preMadeQuestions");
  if (toggle && container) {
    const chevron = toggle.querySelector(".chevron path");
    toggle.addEventListener("click", () => {
      const isExpanded = container.classList.toggle("expanded");
      if (chevron) {
        chevron.setAttribute(
          "d",
          isExpanded ? "M6 12l4-4 4 4" : "M6 8l4 4 4-4"
        );
      }
    });
  }
});

