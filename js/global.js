// Firebase imports
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { equalTo, get, getDatabase, orderByChild, query, ref } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

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

// Helper functions
function formatMobileNumber(mobile) {
  const cleaned = mobile.replace(/\D/g, "");
  if (/^\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

<<<<<<< HEAD
function generateTempPassword(length = 10) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

// Alert fallback if Swal is not defined
function showAlert(icon, title, text) {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon,
      title,
      text,
      timer: icon === 'success' ? 1500 : undefined,
      showConfirmButton: icon !== 'success'
    });
  } else {
    console.warn('SweetAlert2 not loaded, using native alert');
    alert(`${title}: ${text}`);
  }
}

// Login logic
=======
// Base path for redirects
const BASE_PATH = "/Bayanihan-PWA";

// Main logic
>>>>>>> 47542607496c29c4264373a23319286868a6706b
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
      loginForm?.reset();
    });
  }

  // Switch to Login form
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      container.classList.remove("active");
      registerForm?.reset();
    });
  }

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const mobileInput = document.getElementById("login-mobile")?.value.trim();
      const password = document.getElementById("login-password")?.value;
      const mobile = formatMobileNumber(mobileInput);

      if (!mobile) {
        showAlert('error', 'Invalid Mobile Number', 'Please enter a valid mobile number (10-15 digits, numbers only).');
        return;
      }

      const email = `${mobile}@bayanihan.com`;
      console.log(`Attempting login with email: ${email}`);

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log(`User logged in with UID: ${user.uid}`);

        const userRef = ref(database, `users/${user.uid}`);
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
          console.log(`User data retrieved:`, userData);

          showAlert('success', 'Login Successful', 'You have been logged in successfully!');

          // Dispatch custom event to update sidebar
          window.dispatchEvent(new Event("updateSidebar"));

          // Notify service worker to update cache
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.active?.postMessage({ type: "UPDATE_CACHE" });
<<<<<<< HEAD
            });
          }

          // Role-based redirection
          const userRole = userData.role;
          console.log(`Redirecting based on role: ${userRole}`);
          if (userRole === "AB ADMIN") {
            window.location.replace("/Bayanihan-PWA/pages/dashboard.html");
          } else if (userRole === "ABVN") {
            window.location.replace("/Bayanihan-PWA/pages/dashboard.html");
          } else {
            console.warn(`Unknown role: ${userRole}, redirecting to default dashboard`);
            window.location.replace("/Bayanihan-PWA/pages/dashboard.html");
=======
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
>>>>>>> 47542607496c29c4264373a23319286868a6706b
          }
        } else {
          console.error(`No user data found for UID: ${user.uid}`);
          // Check for duplicate mobile number
          const usersQuery = query(ref(database, 'users'), orderByChild('mobile'), equalTo(mobile));
          const usersSnapshot = await get(usersQuery);
          if (usersSnapshot.exists()) {
            const userData = Object.entries(usersSnapshot.val())[0];
            console.warn(`Found user data for mobile ${mobile} with UID: ${userData[0]}`, userData[1]);
            showAlert('error', 'Account Mismatch', `An account with mobile ${mobile} exists but is not linked correctly. Contact an admin to fix your account or try registering again with a different mobile number.`);
          } else {
            showAlert('error', 'User Data Not Found', 'Your account is not fully registered. Please contact an admin to complete registration.');
          }
        }
      } catch (error) {
        console.error("Login error:", error);
        let errorMessage = 'Login failed. ';
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
          errorMessage += 'Invalid mobile number or password.';
        } else if (error.code === "auth/too-many-requests") {
          errorMessage += 'Too many login attempts. Please try again later.';
        } else {
<<<<<<< HEAD
          errorMessage += error.message;
=======
          alert("An error occurred during login. Please try again or contact support.");
>>>>>>> 47542607496c29c4264373a23319286868a6706b
        }
        showAlert('error', 'Login Failed', errorMessage);
      }
    });
  }
});

// Export Firebase instances and utilities
export { analytics, app, auth, database, formatMobileNumber, generateTempPassword };

