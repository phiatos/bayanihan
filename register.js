import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
  authDomain: "bayanihan-5ce7e.firebaseapp.com",
  databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bayanihan-5ce7e",
  storageBucket: "bayanihan-5ce7e.firebasestorage.app",
  messagingSenderId: "593123849917",
  appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
  measurementId: "G-ZTQ9VXXVV0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase initialized:", app);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// Registration Form
const registerForm = document.querySelector(".register-form");
if (!registerForm) console.error("Register form not found");
registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  console.log("Register form submitted");

  const mobile = document.getElementById("register-mobile").value;
  const password = document.getElementById("register-password").value;
  const confirmPassword = document.getElementById("register-confirm-password").value;
  const role = document.getElementById("register-role").value;

  // Basic validation
  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }
  if (!/^\d{10,15}$/.test(mobile)) {
    alert("Please enter a valid mobile number (10-15 digits).");
    return;
  }

  // Create email from mobile number
  const email = `${mobile}@bayanihan.com`;
  console.log("Registering with email:", email);

  // Create user with Firebase Authentication
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log("User created:", userCredential.user);
      const user = userCredential.user;

      // Store user data in Realtime Database
      set(ref(database, "users/" + user.uid), {
        mobile: mobile,
        role: role,
        createdAt: new Date().toISOString()
      })
        .then(() => {
          alert("Registration successful!");
          registerForm.reset();
          document.querySelector(".container").classList.remove("active");
        })
        .catch((error) => {
          console.error("Error saving user data:", error);
          alert("Error saving user data: " + error.message + ". Check Firebase rules.");
        });
    })
    .catch((error) => {
      console.error("Registration error:", error);
      if (error.code === "auth/email-already-in-use") {
        alert("This mobile number is already registered!");
      } else if (error.code === "auth/weak-password") {
        alert("Password must be at least 6 characters long!");
      } else {
        alert("Registration failed: " + error.message);
      }
    });
});

// Login Form
const loginForm = document.querySelector(".login form");
if (!loginForm) console.error("Login form not found");
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  console.log("Login form submitted");

  const mobile = document.getElementById("login-mobile").value;
  const password = document.getElementById("login-password").value;

  // Basic validation
  if (!/^\d{10,15}$/.test(mobile)) {
    alert("Please enter a valid mobile number (10-15 digits).");
    return;
  }

  // Create email from mobile number
  const email = `${mobile}@bayanihan.com`;
  console.log("Logging in with email:", email);

  // Sign in with Firebase Authentication
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log("User logged in:", userCredential.user);
      alert("Login successful!");
      loginForm.reset();
      // Optionally redirect to a dashboard
      // window.location.href = "dashboard.html";
    })
    .catch((error) => {
      console.error("Login error:", error);
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        alert("Invalid mobile number or password!");
      } else {
        alert("Login failed: " + error.message);
      }
    });
});