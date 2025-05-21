// Firebase imports
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, sendEmailVerification, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { get, getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

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

// Helper function to normalize mobile numbers
function formatMobileNumber(mobile) {
  // Remove all non-digit characters
  let cleaned = mobile.replace(/\D/g, "");

  // Handle Philippine numbers: convert +639xxxxxxxxx to 09xxxxxxxxx
  if (cleaned.startsWith("63") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(2); // Convert +639761658549 to 09761658549
  }

  // Validate the cleaned number (10-15 digits)
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

  // Handle redirect after email verification
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");
  const oobCode = urlParams.get("oobCode");
  if (mode === "verifyEmail" && oobCode) {
    // Email verification link was clicked
    alert("Email verified successfully! Please log in.");
    // Clear query parameters from the URL
    window.history.replaceState({}, document.title, "/Bayanihan-PWA/pages/login.html");
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

      const mobileInput = document.getElementById("login-mobile").value.trim();
      const password = document.getElementById("login-password").value;

      const mobile = formatMobileNumber(mobileInput);

      if (!mobile) {
        alert("Please enter a valid mobile number (10-15 digits, e.g., 091xxxxxxxx or +639xxxxxxxxx).");
        return;
      }

      console.log("Login successful (client-side validation passed)!", { mobile, password });

      try {
        // Look up the user's email in the database using the mobile number
        const usersSnapshot = await get(ref(database, "users"));
        const users = usersSnapshot.val();
        if (!users) {
          throw new Error("No users found in the database.");
        }

        // Find the user with the matching mobile number
        let userEmail = null;
        let userUid = null;
        let userData = null;
        for (const [uid, data] of Object.entries(users)) {
          // Normalize the stored mobile number for comparison
          const storedMobile = formatMobileNumber(data.mobile);
          if (storedMobile === mobile) {
            userEmail = data.email;
            userUid = uid;
            userData = data;
            break;
          }
        }

        // If no user is found with the mobile number, try to sign in with synthetic email
        if (!userEmail) {
          userEmail = `${mobile}@bayanihan.com`;
        }

        // Attempt to sign in with the email from the database (or synthetic email)
        let userCredential;
        try {
          console.log("Attempting to sign in with email from database:", userEmail);
          userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
        } catch (error) {
          if (error.code === "auth/invalid-credential") {
            // If the email from the database fails, try a synthetic email as a fallback
            const fallbackEmail = `${mobile}@bayanihan.com`;
            if (userEmail !== fallbackEmail) {
              console.log("Database email failed, trying fallback email:", fallbackEmail);
              try {
                userCredential = await signInWithEmailAndPassword(auth, fallbackEmail, password);
                // Update the database with the correct email if the fallback succeeds
                if (userData && userEmail !== fallbackEmail) {
                  console.log("Updating user email in database to:", fallbackEmail);
                  await set(ref(database, `users/${userUid}/email`), fallbackEmail);
                  userData.email = fallbackEmail;
                }
              } catch (fallbackError) {
                throw new Error("Invalid mobile number or password.");
              }
            } else {
              throw new Error("Invalid mobile number or password.");
            }
          } else {
            throw error;
          }
        }

        const user = userCredential.user;

        // If user data wasn't found, create it (e.g., for admin or new users)
        if (!userData) {
          userData = {
            role: "AB ADMIN", // Default to AB ADMIN for synthetic email users (like the admin)
            name: "Admin User",
            group: "Admin Group",
            contactPerson: "Admin",
            email: user.email,
            mobile: mobile,
            createdAt: new Date().toISOString(),
            emailVerified: user.emailVerified,
          };
          await set(ref(database, `users/${user.uid}`), userData);
          userUid = user.uid;
        }

        // Check if the user is an admin by their role in the database
        const isAdmin = userData?.role === "AB ADMIN";

        // Skip email verification for admin; enforce it for ABVN (volunteer) users
        if (!isAdmin && !user.emailVerified) {
          // Automatically send a verification email for ABVN users who haven't verified
          try {
            const actionCodeSettings = {
              url: `${window.location.origin}/Bayanihan-PWA/pages/login.html`,
              handleCodeInApp: false,
            };
            console.log("Sending verification email to ABVN user:", user.email);
            await sendEmailVerification(user, actionCodeSettings);
            console.log("Verification email sent successfully to:", user.email);
            alert("Your email address is not verified. A verification email has been sent to your email address. Please verify your email to proceed with login (check spam/junk folder).");
          } catch (error) {
            console.error("Error sending verification email:", error);
            alert("Failed to send verification email: " + error.message);
          }
          await signOut(auth); // Sign out after sending the email
          return;
        }

        // Ensure all necessary fields are included in userData
        const updatedUserData = {
          name: userData.name || "",
          role: userData.role || "",
          group: userData.group || "",
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

        if (userRole === "AB ADMIN" || userRole === "ABVN") {
          window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
        } else {
          console.error("Unknown user role:", userRole);
          window.location.replace(`${BASE_PATH}/pages/login.html`);
        }
      } catch (error) {
        if (error.code === "auth/invalid-credential") {
          alert("Invalid mobile number or password.");
        } else {
          alert("An error occurred during login: " + error.message);
        }
      }
    });
  }
});