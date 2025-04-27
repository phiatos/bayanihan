// Firebase imports
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
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
  measurementId: "G-ZTQ9VXXVV0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// Toggle forms logic
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  const registerBtn = document.querySelector(".register-btn");
  const loginBtn = document.querySelector(".login-btn");
  const registerForm = document.querySelector(".register-form");
  const loginForm = document.querySelector(".login form");

  if (registerBtn) {
    registerBtn.addEventListener("click", () => {
      container.classList.add("active");
      loginForm.reset();
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      container.classList.remove("active");
      registerForm.reset();
    });
  }

  // Registration Form Submission
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const mobile = document.getElementById("register-mobile").value.trim();
      const password = document.getElementById("register-password").value;
      const confirmPassword = document.getElementById("register-confirm-password").value;
      const role = document.getElementById("register-role").value;

      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      if (!/^\d{10,15}$/.test(mobile)) {
        alert("Please enter a valid mobile number (10–15 digits).");
        return;
      }

      const email = `${mobile}@bayanihan.com`;

      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          return set(ref(database, "users/" + user.uid), {
            mobile: mobile,
            role: role,
            createdAt: new Date().toISOString()
          });
        })
        .then(() => {
          alert("Registration successful!");
          localStorage.setItem("userMobile", mobile);
          window.location.href = "../otp/OTPVerification.html"; // ✅ Correct path
        })
        .catch((error) => {
          if (error.code === "auth/email-already-in-use") {
            alert("This mobile number is already registered!");
          } else if (error.code === "auth/weak-password") {
            alert("Password must be at least 6 characters long!");
          } else {
            alert("Error: " + error.message);
          }
        });
    });
  }

  // Login Form Submission
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const mobile = document.getElementById("login-mobile").value.trim();
      const password = document.getElementById("login-password").value;

      if (!/^\d{10,15}$/.test(mobile)) {
        alert("Please enter a valid mobile number (10–15 digits).");
        return;
      }

      const email = `${mobile}@bayanihan.com`;

      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          const userRef = ref(database, "users/" + user.uid);

          // Fetch user data from database
          return get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
              alert("Login successful!");
              loginForm.reset();
              localStorage.setItem("userMobile", mobile);
              window.location.href = "../../../public/index.html";
            } else {
              alert("User data not found in the database.");
            }
          });
        })
        .catch((error) => {
          if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
            alert("Invalid mobile number or password!");
          } else {
            alert("Login failed: " + error.message);
          }
        });
    });
  }
});
