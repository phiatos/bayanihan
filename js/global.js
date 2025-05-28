// Firebase imports
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, sendEmailVerification, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { get, getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// Base path for redirects (keep as is)
const BASE_PATH = "/bayanihan";

document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".container");
    const registerBtn = document.querySelector(".register-btn");
    const loginBtn = document.querySelector(".login-btn");
    const registerForm = document.querySelector(".register-form");
    const loginForm = document.querySelector(".login form");

    // Handle redirect after email verification
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");
    const oobCode = urlParams.get("oobCode");
    if (mode === "verifyEmail" && oobCode) {
        alert("Email verified successfully! Please log in.");
        // Clear query parameters from the URL
        window.history.replaceState({}, document.title, `${BASE_PATH}/pages/login.html`);
    }

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

            // Get email and password directly from the form
            const emailInput = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;

            if (!emailInput || !password) {
                alert("Please enter both email and password.");
                return;
            }

            console.log("Attempting to sign in with email:", { email: emailInput });

            try {
                // Sign in with email and password using Firebase Authentication
                const userCredential = await signInWithEmailAndPassword(auth, emailInput, password);
                const user = userCredential.user;

                // Fetch user data from Realtime Database using the authenticated user's UID
                const userSnapshot = await get(ref(database, `users/${user.uid}`));
                let userData = userSnapshot.val();

                // If user data doesn't exist in the database, create a default entry
                if (!userData) {
                    console.warn("User data not found in Realtime Database for UID:", user.uid, "Creating a default entry.");
                    userData = {
                        role: "ABVN", // Default role for new users
                        name: "New User",
                        group: "N/A",
                        contactPerson: "N/A",
                        email: user.email,
                        mobile: "", // Mobile will be empty or set during registration
                        createdAt: new Date().toISOString(),
                        emailVerified: user.emailVerified,
                        isFirstLogin: true,
                        termsAccepted: false,
                        terms_agreed_version: 0,
                    };
                    await set(ref(database, `users/${user.uid}`), userData);
                }

                // Check for email verification (skipped for admins)
                const isAdmin = userData?.role === "AB ADMIN" || userData?.role === "admin";
                if (!isAdmin && !user.emailVerified) {
                    try {
                        const actionCodeSettings = {
                            url: `${window.location.origin}${BASE_PATH}/pages/login.html`,
                            handleCodeInApp: false,
                        };
                        console.log("Sending verification email to:", user.email);
                        await sendEmailVerification(user, actionCodeSettings);
                        console.log("Verification email sent successfully to:", user.email);
                        alert("Your email address is not verified. A verification email has been sent to your email address. Please verify your email to proceed with login (check spam/junk folder).");
                    } catch (error) {
                        console.error("Error sending verification email:", error);
                        alert("Failed to send verification email: " + error.message);
                    }
                    await signOut(auth); // Sign out the user until email is verified
                    return;
                }

                // Retrieve first-time login and terms acceptance flags
                const isFirstLogin = userData.isFirstLogin === true;
                const termsAccepted = userData.termsAccepted === true;
                const termsAgreedVersion = userData.terms_agreed_version || 0;

                // Prepare user data for localStorage
                const updatedUserData = {
                    name: userData.name || "",
                    role: userData.role || "",
                    group: userData.group || "",
                    contactPerson: userData.contactPerson || "",
                    isFirstLogin: isFirstLogin,
                    termsAccepted: termsAccepted,
                    terms_agreed_version: termsAgreedVersion,
                };

                console.log("User Data being stored in localStorage:", updatedUserData);

                // Store user data in localStorage
                localStorage.setItem("userData", JSON.stringify(updatedUserData));
                localStorage.setItem("userEmail", user.email); // Store email instead of mobile
                localStorage.setItem("userRole", userData.role);

                alert("Login successful!");

                // Dispatch event to update sidebar (if applicable)
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

                // Redirection Logic
                if (isAdmin && !isFirstLogin && termsAccepted) {
                    console.log("Redirecting Admin to dashboard.");
                    window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
                } else if (isFirstLogin || !termsAccepted) {
                    console.log("Redirecting to profile.html for first login or unaccepted terms.");
                    window.location.replace(`${BASE_PATH}/pages/profile.html`);
                } else {
                    console.log("Redirecting based on role.");
                    const userRole = userData.role;

                    if (userRole === "ABVN") {
                        window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
                    } else {
                        console.error("Unknown user role or unhandled redirection:", userRole);
                        window.location.replace(`${BASE_PATH}/pages/dashboard.html`); // Fallback
                    }
                }

            } catch (error) {
                // Handle Firebase authentication errors
                if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
                    alert("Invalid email or password.");
                } else {
                    alert("An error occurred during login: " + error.message);
                    console.error("Login error:", error);
                }
            }
        });
    }
});