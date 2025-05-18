// Firebase imports
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// We no longer need 'update' here to set isFirstLogin to false, as that happens on profile.js
import { get, getDatabase, ref } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";


// Firebase config (keep as is)
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

// Initialize Firebase (keep as is)
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// Helper function to format mobile numbers (keep as is)
function formatMobileNumber(mobile) {
    const cleaned = mobile.replace(/\D/g, ""); // Remove non-digit characters
    if (/^\d{10,15}$/.test(cleaned)) {
        return cleaned;
    }
    return null;
}

// Base path for redirects (keep as is)
const BASE_PATH = "/Bayanihan-PWA";

// Main logic (keep as is until the redirection part)
document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".container");
    const registerBtn = document.querySelector(".register-btn");
    const loginBtn = document.querySelector(".login-btn");
    const registerForm = document.querySelector(".register-form");
    const loginForm = document.querySelector(".login form");

    // Switch to Register form (keep as is)
    if (registerBtn) {
        registerBtn.addEventListener("click", () => {
            container.classList.add("active");
            loginForm.reset();
        });
    }

    // Switch to Login form (keep as is)
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

                    // Retrieve both flags from Firebase
                    // If isFirstLogin or termsAccepted are not present, treat them as false (or undefined)
                    const isFirstLogin = userData.isFirstLogin === true;
                    const termsAccepted = userData.termsAccepted === true;
                    const termsAgreedVersion = userData.terms_agreed_version || 0; // Assuming 0 if not set

                    // Prepare user data for storage in localStorage
                    // This now includes isFirstLogin and termsAccepted, and termsAgreedVersion
                    const updatedUserData = {
                        name: userData.name || "",
                        role: userData.role || "",
                        group: userData.group || "",
                        contactPerson: userData.contactPerson || "",
                        isFirstLogin: isFirstLogin, // Store the flag in localStorage
                        termsAccepted: termsAccepted, // Store the flag in localStorage
                        terms_agreed_version: termsAgreedVersion // Store the version in localStorage
                    };

                    // Debug
                    console.log("User Data being stored in localStorage:", updatedUserData);

                    localStorage.setItem("userData", JSON.stringify(updatedUserData));
                    localStorage.setItem("userMobile", mobile);
                    localStorage.setItem("userRole", userData.role);

                    alert("Login successful!");

                    // Dispatch event to update sidebar (keep as is)
                    const event = new Event("updateSidebar");
                    window.dispatchEvent(event);

                    // Notify service worker to update cache (keep as is)
                    if ("serviceWorker" in navigator) {
                        navigator.serviceWorker.ready.then((registration) => {
                            registration.active?.postMessage({ type: "UPDATE_CACHE" });
                        }).catch((error) => {
                            console.error("Service Worker error:", error);
                        });
                    }

                    // --- CORRECTED REDIRECTION LOGIC ---
                    // Redirect to profile.html if it's the first login OR if terms haven't been accepted yet
                    if (isFirstLogin || !termsAccepted) {
                        console.log("Redirecting to profile.html for first login or unaccepted terms.");
                        window.location.replace(`${BASE_PATH}/pages/profile.html`);
                    } else {
                        // Regular login flow: Role-based Redirection
                        console.log("Redirecting to dashboard based on role.");
                        const userRole = userData.role;

                        if (userRole === "admin") {
                            window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
                        } else if (userRole === "volunteer" || userRole === "ABVN") {
                            window.location.replace(`${BASE_PATH}/volunteer-dashboard.html`); // Assuming volunteer-dashboard is correct
                        } else {
                            // Default redirection if role is not recognized or missing
                            window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
                        }
                    }
                    // --- END CORRECTED REDIRECTION LOGIC ---

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