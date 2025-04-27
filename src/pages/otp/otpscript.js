import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
  authDomain: "bayanihan-5ce7e.firebaseapp.com",
  projectId: "bayanihan-5ce7e",
  storageBucket: "bayanihan-5ce7e.appspot.com",
  messagingSenderId: "593123849917",
  appId: "1:593123849917:web:eb85a63a536eeff78ce9d4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elements
const inputs = document.querySelectorAll(".input-field input");
const verifyBtn = document.querySelector(".otp-btn");
const form = document.getElementById("otp-form");
const mobile = localStorage.getItem("userMobile");
const displayMobile = document.getElementById("display-mobile");
let confirmationResult = null;

// Show mobile number
displayMobile.textContent = `+63${mobile}`;

// Setup reCAPTCHA
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  size: 'invisible',
  callback: () => {}
});
recaptchaVerifier.render().then(() => {
  sendOTP();
});

function sendOTP() {
  const fullPhoneNumber = `+63${mobile}`;

  signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier)
    .then((result) => {
      confirmationResult = result;
      startTimer(180, document.getElementById("timer"));
      inputs[0].focus();
    })
    .catch((error) => {
      alert("Failed to send OTP: " + error.message);
    });
}

// Handle OTP input
inputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    if (input.value.length > 1) input.value = input.value[0];

    if (input.value && index < inputs.length - 1) {
      inputs[index + 1].removeAttribute("disabled");
      inputs[index + 1].focus();
    }

    const allFilled = [...inputs].every(i => i.value);
    verifyBtn.disabled = !allFilled;
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && index > 0 && !input.value) {
      inputs[index - 1].focus();
    }
  });
});

// Timer
function startTimer(duration, display) {
  let timer = duration;
  const interval = setInterval(() => {
    const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
    const seconds = String(timer % 60).padStart(2, '0');
    display.textContent = `${minutes}:${seconds}`;

    if (--timer < 0) {
      clearInterval(interval);
      display.textContent = "Expired";
      inputs.forEach(input => input.disabled = true);
      verifyBtn.disabled = true;
    }
  }, 1000);
}

// Form submission
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = [...inputs].map(i => i.value).join("");

  if (!confirmationResult) {
    alert("OTP not yet sent.");
    return;
  }

  confirmationResult.confirm(code)
    .then((result) => {
      alert("OTP Verified!");
      window.location.href = "../login/Login&RegistrationForm.html";
    })
    .catch((error) => {
      alert("Invalid OTP. Try again.");
    });
});

// Resend OTP
document.getElementById("resend-otp").addEventListener("click", (e) => {
  e.preventDefault();

  inputs.forEach((input, index) => {
    input.value = "";
    if (index === 0) input.removeAttribute("disabled");
    else input.setAttribute("disabled", true);
  });
  verifyBtn.disabled = true;
  inputs[0].focus();

  // Send again
  sendOTP();
});
