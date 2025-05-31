// Firebase imports
// import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
// import { getAuth, sendEmailVerification, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
// import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js';
// import { getDatabase, ref, get, set } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';
import { initializeApp } from 'firebase/app'; 
import { getAuth, sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase, ref, get, set } from 'firebase/database';

import { validateEmail, validatePassword, displayError, clearError } from '../js/login.js';


// Firebase config (keep as is)
const firebaseConfig = {
    // apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    // authDomain: "bayanihan-5ce7e.firebaseapp.com",
    // databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    // projectId: "bayanihan-5ce7e",
    // storageBucket: "bayanihan-5ce7e.appspot.com",
    // messagingSenderId: "593123849917",
    // appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    // measurementId: "G-ZTQ9VXXVV0",
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

const showToast = (message, type = 'error') => {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        console.error("Toast container not found!");
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".container");
    const registerBtn = document.querySelector(".register-btn");
    const loginBtn = document.querySelector(".login-btn");
    const loginForm = document.querySelector(".login form");
    const emailInputElem = document.getElementById("login-email");
    const passwordInputElem = document.getElementById("login-password");

    // Handle redirect after email verification
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");
    const oobCode = urlParams.get("oobCode");
    if (mode === "verifyEmail" && oobCode) {
        showToast("Email verified successfully! Please log in.");
        window.history.replaceState({}, document.title, 'pages/login.html');
    }

    // Switch to Register form
    if (registerBtn && container) {
        registerBtn.addEventListener("click", () => {
            container.classList.add("active");
            if (loginForm) loginForm.reset(); 
            if (emailInputElem) clearError(emailInputElem);
            if (passwordInputElem) clearError(passwordInputElem);
        });
    }

    // Switch to Login form
    if (loginBtn && container) {
        loginBtn.addEventListener("click", () => {
            container.classList.remove("active");
            if (emailInputElem) clearError(emailInputElem);
            if (passwordInputElem) clearError(passwordInputElem);
        });
    }

    // Handle Login
    if (loginForm && emailInputElem && passwordInputElem) { // Ensure elements exist
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // Always prevent default here, as this is the main submit handler

            // Run client-side validations using imported functions
            const isEmailValid = validateEmail(emailInputElem);
            const isPasswordValid = validatePassword(passwordInputElem);

            if (!isEmailValid || !isPasswordValid) {
                showToast("Please correct the errors in the form.", 'error');
                console.log('Login failed due to client-side validation errors.');
                return; // Stop execution if validation fails
            }

            // Get validated email and password values
            const email = emailInputElem.value.trim();
            const password = passwordInputElem.value;

            console.log("Attempting to sign in with email:", { email: email });

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                const userSnapshot = await get(ref(database, `users/${user.uid}`));
                let userData = userSnapshot.val();

                if (!userData) {
                    console.warn("User data not found in Realtime Database for UID:", user.uid, "Creating a default entry.");
                    userData = {
                        role: "ABVN", 
                        name: "New User",
                        group: "N/A",
                        contactPerson: "N/A",
                        email: user.email,
                        mobile: "", 
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
                            url: '../pages/login.html', 
                            handleCodeInApp: false,
                        };
                        console.log("Sending verification email to:", user.email);
                        await sendEmailVerification(user, actionCodeSettings);
                        console.log("Verification email sent successfully to:", user.email);
                        showToast("Your email address is not verified. A verification email has been sent to your email address. Please verify your email to proceed with login (check spam/junk folder).");
                    } catch (error) {
                        console.error("Error sending verification email:", error);
                        showToast("Failed to send verification email: " + error.message);
                    }
                    await signOut(auth); 
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
                localStorage.setItem("userEmail", user.email); 
                localStorage.setItem("userRole", userData.role);

                showToast("Login successful!", 'success');

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
                 setTimeout(() => {
                    // Redirection Logic
                    if (isAdmin && !isFirstLogin && termsAccepted) {
                        console.log("Redirecting Admin to dashboard.");
                        window.location.replace('../pages/dashboard.html');
                    } else if (isFirstLogin || !termsAccepted) {
                        console.log("Redirecting to profile.html for first login or unaccepted terms.");
                        window.location.replace('../pages/profile.html');
                    } else {
                        console.log("Redirecting based on role.");
                        const userRole = userData.role;

                        if (userRole === "ABVN") {
                            window.location.replace('../pages/dashboard.html');
                        } else {
                            console.error("Unknown user role or unhandled redirection:", userRole);
                            window.location.replace('../pages/dashboard.html'); 
                        }
                    }
                }, 2000); 

            } catch (error) {
                // Handle Firebase authentication errors
                if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
                    showToast("Invalid email or password.", 'error');
                } else {
                    showToast("An error occurred during login: " + error.message);
                    console.error("Login error:", error);
                }
            }
        });
    }
});

