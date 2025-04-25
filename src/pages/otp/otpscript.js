const inputs = document.querySelectorAll("input");
const button = document.querySelector("button");

// Show user's number
document.addEventListener("DOMContentLoaded", () => {
  const display = document.getElementById("timer");
  const mobile = localStorage.getItem("userMobile");
  const displayMobile = document.getElementById("display-mobile");
  if (mobile) {
    displayMobile.textContent = `+63${mobile}`;
  } else {
    displayMobile.textContent = "[unknown number]";
  }

  startTimer(180, display);
});

function startTimer(duration, display) {
  let timer = duration, minutes, seconds;
  const interval = setInterval(() => {
    minutes = String(Math.floor(timer / 60)).padStart(2, '0');
    seconds = String(timer % 60).padStart(2, '0');
    display.textContent = `${minutes}:${seconds}`;

    if (--timer < 0) {
      clearInterval(interval);
      display.textContent = "Expired";
      document.querySelectorAll("input").forEach(input => input.disabled = true);
      document.querySelector(".otp-btn").disabled = true;
    }
  }, 1000);
}

// Input behavior logic
inputs.forEach((input, index1) => {
  input.addEventListener("keyup", (e) => {
    const currentInput = input;
    const nextInput = input.nextElementSibling;
    const prevInput = input.previousElementSibling;

    if (currentInput.value.length > 1) {
      currentInput.value = "";
      return;
    }

    if (nextInput && nextInput.hasAttribute("disabled") && currentInput.value !== "") {
      nextInput.removeAttribute("disabled");
      nextInput.focus();
    }

    if (e.key === "Backspace") {
      inputs.forEach((input, index2) => {
        if (index1 <= index2 && prevInput) {
          input.setAttribute("disabled", true);
          input.value = "";
          prevInput.focus();
        }
      });
    }

    // Enable button only if all fields are filled
    const allFilled = [...inputs].every(inp => inp.value !== "");
    const verifyBtn = document.querySelector("button");
    if (allFilled) {
      verifyBtn.classList.add("active");
      verifyBtn.disabled = false;
    } else {
      verifyBtn.classList.remove("active");
      verifyBtn.disabled = true;
    }
  });
});

window.addEventListener("load", () => inputs[0].focus());

// OTP form submission
document.getElementById("otp-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const otpCode = [...inputs].map(input => input.value).join("");
  console.log("Entered OTP:", otpCode);

  // Dummy validation for now – replace this with Firebase/Backend verification
  if (otpCode === "1234") {
    alert("OTP Verified!");
    // Redirect or proceed
    // window.location.href = "dashboard.html";
  } else {
    alert("Invalid OTP. Please try again.");
  }
});

// Resend OTP logic
document.getElementById("resend-otp").addEventListener("click", (e) => {
  e.preventDefault();
  alert("OTP has been resent to your mobile number.");
  // Restart timer and reset fields
  inputs.forEach((input, index) => {
    input.value = "";
    if (index === 0) input.removeAttribute("disabled");
    else input.setAttribute("disabled", true);
  });
  inputs[0].focus();
  document.querySelector("button").disabled = true;
  startTimer(180, document.getElementById("timer"));
});
