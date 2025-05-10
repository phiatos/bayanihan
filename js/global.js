// Firebase imports
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { get, getDatabase, ref } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Firebase config
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// Helper function to format mobile numbers
function formatMobileNumber(mobile) {
  const cleaned = mobile.replace(/\D/g, ""); // Remove non-digit characters
  if (/^\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

// Base path for redirects
const BASE_PATH = "/Bayanihan-PWA";

// Main logic
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  const registerBtn = document.querySelector(".register-btn");
  const loginBtn = document.querySelector(".login-btn");
  const registerForm = document.querySelector(".register-form");
  const loginForm = document.querySelector(".login form");

  // Switch to Register form
  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      container.classList.add("active");
      loginForm.reset();
    });
  }

  // Switch to Login form
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      container.classList.remove("active");
      registerForm.reset();
    });
  }

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const mobileInput = document.getElementById("login-mobile").value.trim();
      const password = document.getElementById("login-password").value;

      const mobile = formatMobileNumber(mobileInput);

      if (!mobile) {
        alert("Please enter a valid mobile number (10-15 digits).");
        return;
      }

      const email = `${mobile}@bayanihan.com`;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userRef = ref(database, "users/" + user.uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userData = snapshot.val();
          // Ensure all necessary fields are included in userData
          const updatedUserData = {
            name: userData.name || "",
            role: userData.role || "",
            group: userData.group || "", // Ensure group is stored
            contactPerson: userData.contactPerson || "",
          };

          // Debug: Log the user data to verify the group field
          console.log("User Data being stored in localStorage:", updatedUserData);

          // Store the full userData in localStorage
          localStorage.setItem("userData", JSON.stringify(updatedUserData));
          localStorage.setItem("userMobile", mobile);
          localStorage.setItem("userRole", userData.role);

          alert("Login successful!");

          // Dispatch a custom event to update the sidebar
          const event = new Event("updateSidebar");
          window.dispatchEvent(event);

          // Notify service worker to update cache
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.active?.postMessage({ type: "UPDATE_CACHE" });
            }).catch((error) => {
              console.error("Service Worker error:", error);
            });
          }

          // Role-based Redirection
          const userRole = userData.role;

          if (userRole === "admin") {
            window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
          } else if (userRole === "volunteer") {
            window.location.replace(`${BASE_PATH}/volunteer-dashboard.html`);
          } else {
            window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
          }
          
        } else {
          alert("User data not found. Contact support.");
        }
      } catch (error) {
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
          alert("Invalid mobile number or password.");
        } else {
          alert("An error occurred during login. Please try again or contact support.");
        }
      }
    });
  }
});