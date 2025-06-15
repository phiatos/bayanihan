// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
// import { getAuth, sendEmailVerification, signInWithEmailAndPassword, signOut, applyActionCode } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
// import { getDatabase, ref, get, set } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';
// import { validateEmail, validatePassword, displayError, clearError } from '../js/login.js';
import { applyActionCode, getAuth, sendEmailVerification, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { get, getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';
import { clearError, validateEmail, validatePassword } from '../js/login.js';

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
const auth = getAuth(app);
const database = getDatabase(app);


const showToast = (message, type = 'error') => {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        console.error("Toast container not found!");
        return;
    }
    // Remove any existing toast to ensure only one is shown
    const existingToast = toastContainer.querySelector('.toast');
    if (existingToast) existingToast.remove();
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

// Helper functions for login attempt limiting
const isLockedOut = () => {
    const failedAttempts = parseInt(localStorage.getItem('failedLoginAttempts') || '0');
    const lockoutStart = parseInt(localStorage.getItem('lockoutStart') || '0');
    const lockoutDuration = 60000; // 1 minute in milliseconds
    const currentTime = Date.now();

    if (failedAttempts >= 3 && lockoutStart && (currentTime - lockoutStart < lockoutDuration)) {
        const remainingTime = Math.ceil((lockoutDuration - (currentTime - lockoutStart)) / 1000);
        return { isLocked: true, remainingTime };
    }
    return { isLocked: false, remainingTime: 0 };
};

const incrementFailedAttempts = () => {
    let failedAttempts = parseInt(localStorage.getItem('failedLoginAttempts') || '0');
    failedAttempts += 1;
    localStorage.setItem('failedLoginAttempts', failedAttempts.toString());
    if (failedAttempts >= 3) {
        localStorage.setItem('lockoutStart', Date.now().toString());
    }
    return failedAttempts;
};

const resetFailedAttempts = () => {
    localStorage.removeItem('failedLoginAttempts');
    localStorage.removeItem('lockoutStart');
};

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.querySelector(".container");
    const registerBtn = document.querySelector(".register-btn");
    const loginBtn = document.querySelector(".login-btn");
    const loginForm = document.querySelector(".login form");
    const emailInputElem = document.getElementById("login-email");
    const passwordInputElem = document.getElementById("login-password");
    const loginSubmitButton = document.querySelector(".loginform-btn");

    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");
    const oobCode = urlParams.get("oobCode");

    if (mode === "verifyEmail" && oobCode) {
        try {
            await applyActionCode(auth, oobCode);
            showToast("Email verified successfully! You can now log in.", 'success');
            // Clean the URL after successful verification
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            console.error("Error applying email verification code:", error);
            showToast("Failed to verify email: " + error.message, 'error');
            // Clean the URL even on error
            window.history.replaceState({}, document.title, window.location.pathname);
        }
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
            e.preventDefault(); 

            // Check lockout status
            const lockoutStatus = isLockedOut();
            if (lockoutStatus.isLocked) {
                showToast(`Too many failed login attempts. Please wait ${lockoutStatus.remainingTime} seconds before trying again.`, 'error');
                loginSubmitButton.disabled = true;
                loginSubmitButton.textContent = `Locked (${lockoutStatus.remainingTime}s)`;
                const countdownInterval = setInterval(() => {
                    const status = isLockedOut();
                    if (!status.isLocked) {
                        loginSubmitButton.disabled = false;
                        loginSubmitButton.textContent = 'Login';
                        clearInterval(countdownInterval);
                        showToast('You can now try logging in again.', 'success');
                    } else {
                        loginSubmitButton.textContent = `Locked (${status.remainingTime}s)`;
                    }
                }, 1000);
                return;
            }

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

            loginSubmitButton.disabled = true;
            loginSubmitButton.textContent = 'Logging In...';

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                resetFailedAttempts();

                const userSnapshot = await get(ref(database, `users/${user.uid}`));
                let userData = userSnapshot.val();

                if (!userData) {
                    console.warn("User data not found in Realtime Database for UID:", user.uid, "Creating a default entry.");
                    userData = {
                        role: "ABVN", 
                        name: "New User",
                        organization: "N/A",
                        contactPerson: "N/A",
                        email: user.email,
                        mobile: "", 
                        createdAt: new Date().toISOString(),
                        emailVerified: user.emailVerified, 
                        password_needs_reset: user.password_needs_reset,
                        isFirstLogin: true,
                        termsAccepted: false,
                        terms_agreed_version: 0,
                    };
                    await set(ref(database, `users/${user.uid}`), userData);
                }

                await user.reload(); 
                const updatedUser = auth.currentUser; 

                // if (updatedUser && updatedUser.emailVerified && !userData.emailVerified) {
                //     console.log("Email is now verified in Auth, updating Realtime Database...");
                //     await set(ref(database, `users/${updatedUser.uid}/emailVerified`), true);
                //     userData.emailVerified = true; 
                //     showToast("Your email has been successfully verified upon login!", 'success'); 
                // }
               
                if (!updatedUser.emailVerified) {
                    try {
                        const actionCodeSettings = {
                            url: 'https://bayanihan-drrm.vercel.app/pages/login.html',
                            handleCodeInApp: true,
                        };
                        console.log("Sending verification email to:", updatedUser.email);
                        await sendEmailVerification(updatedUser, actionCodeSettings);
                        console.log("Verification email sent successfully to:", updatedUser.email);
                        showToast("Your email address is not verified. A new verification email has been sent to your email address. Please verify your email to proceed with login (check spam/junk folder).");
                    } catch (error) {
                        console.error("Error sending verification email:", error);
                        showToast("Failed to send verification email: " + error.message);
                    }
                    // Crucially, sign out the user if their email is not verified,
                    // so they cannot proceed until they click the verification link.
                    await signOut(auth);
                    loginSubmitButton.disabled = false;
                    loginSubmitButton.textContent = 'Login';
                    return; // Stop the login process here
                }


                // If the user's email is now verified in Auth but not yet in DB, update DB.
                // This block should run *after* the email verification check above.
                if (updatedUser.emailVerified && !userData.emailVerified) {
                    console.log("Email is now verified in Auth, updating Realtime Database...");
                    await set(ref(database, `users/${updatedUser.uid}/emailVerified`), true);
                    userData.emailVerified = true;
                    showToast("Your email has been successfully verified upon login!", 'success');
                }

                const isAdmin = userData?.role === "AB ADMIN" || userData?.role === "admin";
                if (!isAdmin && !updatedUser.emailVerified) {
                    try {
                        const actionCodeSettings = {
                            // absolute url required for email verification kasi naka-firebase auth

                            //for host
                            url: 'https://bayanihan-drrm.vercel.app/pages/login.html', 
                            handleCodeInApp: true, 
                            //for live server       
                            // url: 'http://127.0.0.1:5500/bayanihan/pages/login.html',
                            // handleCodeInApp: true, 
                        };
                        console.log("Sending verification email to:", updatedUser.email);
                        await sendEmailVerification(updatedUser, actionCodeSettings);
                        console.log("Verification email sent successfully to:", updatedUser.email);
                        showToast("Your email address is not verified. A new verification email has been sent to your email address. Please verify your email to proceed with login (check spam/junk folder).");
                    } catch (error) {
                        console.error("Error sending verification email:", error);
                        showToast("Failed to send verification email: " + error.message);
                    }
                    await signOut(auth); // Sign out user until they verify email
                    loginSubmitButton.disabled = false;
                    loginSubmitButton.textContent = 'Login';
                    return;
                }

                // Retrieve first-time login and terms acceptance flags (use potentially updated userData)
                const isFirstLogin = userData.isFirstLogin === true;
                const termsAccepted = userData.termsAccepted === true;
                const termsAgreedVersion = userData.terms_agreed_version || 0;
                const password_needs_reset = userData.password_needs_reset === true;

                // Prepare user data for localStorage
                const updatedUserData = {
                    name: userData.name || "",
                    role: userData.role || "",
                    organization: userData.organization || "",
                    contactPerson: userData.contactPerson || "",
                    isFirstLogin: isFirstLogin,
                    termsAccepted: termsAccepted,
                    terms_agreed_version: termsAgreedVersion,
                    password_needs_reset: password_needs_reset,

                    adminPosition: userData.adminPosition || "", 
                    firstName: userData.firstName || "", 
                    lastName: userData.lastName || "",
                    middleInitial: userData.middleInitial || "",
                    nameExtension: userData.nameExtension || "",
                    
                    isSuperAdmin: userData.isSuperAdmin === true,
                };

                console.log("User Data being stored in localStorage:", updatedUserData);

                // Store user data in localStorage
                localStorage.setItem("userData", JSON.stringify(updatedUserData));
                localStorage.setItem("userEmail", updatedUser.email);
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
                    // Determine if the user is an admin or an ABVN user
                    const isAdminOrABVN = userData?.role === "AB ADMIN" || userData?.role === "admin" || userData?.role === "ABVN";

                    if (isAdminOrABVN && !isFirstLogin && termsAccepted && !password_needs_reset) {
                        console.log("Redirecting Admin/ABVN to dashboard (fully onboarded).");
                        window.location.replace('../pages/dashboard.html');
                    } else if (isFirstLogin || !termsAccepted || password_needs_reset) {
                        console.log("Redirecting to profile.html for setup (first login, unaccepted terms, or password reset).");
                        window.location.replace('../pages/profile.html');
                    } else {
                        console.log("Redirecting based on role (fallback).");
                        const userRole = userData.role;

                        if (userRole === "ABVN") { // This condition is now largely redundant due to the new isAdminOrABVN check
                            window.location.replace('../pages/dashboard.html');
                        } else {
                            console.error("Unknown user role or unhandled redirection:", userRole);
                            window.location.replace('../pages/dashboard.html');
                        }
                    }
                }, 2000); 

            } catch (error) {
                loginSubmitButton.disabled = false;
                loginSubmitButton.textContent = 'Login';
                
                // Handle Firebase authentication errors
                if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
                    // showToast("Invalid email or password.", 'error');
                     const failedAttempts = incrementFailedAttempts();
                    if (failedAttempts >= 3) {
                        const lockoutStatus = isLockedOut();
                        showToast(`Too many failed login attempts. Please wait ${lockoutStatus.remainingTime} seconds before trying again.`, 'error');
                        loginSubmitButton.disabled = true;
                        loginSubmitButton.textContent = `Locked (${lockoutStatus.remainingTime}s)`;
                        const countdownInterval = setInterval(() => {
                            const status = isLockedOut();
                            if (!status.isLocked) {
                                loginSubmitButton.disabled = false;
                                loginSubmitButton.textContent = 'Login';
                                clearInterval(countdownInterval);
                                showToast('You can now try logging in again.', 'success');
                            } else {
                                loginSubmitButton.textContent = `Locked (${status.remainingTime}s)`;
                            }
                        }, 1000);
                    } else {
                        showToast(`Invalid email or password. ${3 - failedAttempts} attempts remaining.`, 'error');
                    }
                } else if (error.code === "auth/too-many-requests") {
                    showToast("Access to this account has been temporarily disabled due to many failed login attempts. Please try again later.", 'error');
                } else {
                    showToast("An error occurred during login: " + error.message);
                    console.error("Login error:", error);
                }
            }
        });
    }
});
