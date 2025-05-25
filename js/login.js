document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  const loginBtn = document.querySelector(".login-btn");
  const assistBtn = document.querySelector(".assist-btn");
  const loginForm = document.querySelector(".login form");
  const assistanceBox = document.querySelector(".assistance");
  const backBtn = document.querySelector(".back-btn");
  const passwordInput = document.getElementById('login-password');
  const mobileInput = document.getElementById('login-mobile');
  const lockIcon = document.querySelector('.bxs-lock-alt');
  const openLockIcon = document.querySelector('.bxs-lock-open-alt');

  openLockIcon.style.display = 'none';

  if (!container) console.error("Container not found");
  if (!loginBtn) console.error("Login button not found");
  if (!assistBtn) console.error("Assistance button not found");
  if (!loginForm) console.error("Login form not found");
  if (!assistanceBox) console.error("Assistance box not found");
  if (!backBtn) console.error("Back button not found");
  if (!passwordInput) console.error("Password input not found");
  if (!mobileInput) console.error("Mobile input not found");
  if (!lockIcon) console.error("Closed lock icon not found");
  if (!openLockIcon) console.error("Open lock icon not found");

  // Function to display error messages
const showToast = (message, type = 'error') => {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); // match CSS transition
    }, 3000);
};


const clearError = (inputElement) => {
    const inputBox = inputElement.closest('.input-box');
    const errorDiv = inputBox.querySelector('.error-message');

    if (errorDiv) {
        errorDiv.classList.remove('show');
        setTimeout(() => {
            errorDiv.remove();
        }, 300); // match CSS transition time
    }

    inputElement.classList.remove('error');
};



  // Validate Mobile Number
  const validateMobile = () => {
    clearError(mobileInput);
    const mobileNumber = mobileInput.value.trim();

    if (!mobileNumber) {
        showToast('Mobile number is required.');
        return false;
    }

    if (!/^\d+$/.test(mobileNumber)) {
      showToast('Mobile number should only contain digits.');
      return false;
    }

    // Mobile number should be at least 10 digits (for 9XXXXXXXXX) or 11 for 09XXXXXXXXX
    if (mobileNumber.length < 10) {
      showToast('Mobile number should only contain digits.');
      return false;
    }

    // Philippine mobile numbers must start with 09 or +639
    if (!mobileNumber.startsWith('09') && !mobileNumber.startsWith('+639')) {
      showToast('Mobile number must start with 09 or +639.');
      return false;
    }

    // Strict length validation based on prefix
    if ((mobileNumber.startsWith('09') && mobileNumber.length !== 11) ||
      (mobileNumber.startsWith('+639') && mobileNumber.length !== 13)) {
      showToast('Invalid mobile number length.');
      return false;
    }

    return true;
  };

  // Validate Password
  const validatePassword = () => {
      clearError(passwordInput);
      const password = passwordInput.value;
      if (!password) {
          displayError(passwordInput, 'Password is required.');
          return false;
      }
      if (password.length < 6) {
          displayError(passwordInput, 'Password must be at least 6 characters long.');
          return false;
      }
      return true;
  };

  // Login form submission listener
  if (loginForm) {
      loginForm.addEventListener('submit', (event) => {
          event.preventDefault(); // Prevent default form submission
          const isMobileValid = validateMobile();
          const isPasswordValid = validatePassword();

          if (isMobileValid && isPasswordValid) {
              // Proceed with login logic (e.g., sending data to the server)
              showToast('Login Successful!', 'success');
              console.log('Login successful (client-side validation passed)!', {
                  mobile: mobileInput.value,
                  password: passwordInput.value
              });
              // In a real application, you would typically send this data using fetch or XMLHttpRequest.
          } else {
              console.log('Login failed due to validation errors.');
          }
      });
  }

  // Toggle between login form and assistance box
  if (assistanceBox && loginForm) {
      assistBtn.addEventListener("click", () => {
          container.classList.add("active");
          loginForm.reset();
          // Clear any previous error messages when switching to assistance
          clearError(mobileInput);
          clearError(passwordInput);
      });
  }

  if (loginBtn && assistanceBox) {
      loginBtn.addEventListener("click", () => {
          container.classList.remove("active");
          // Clear any previous error messages when switching back to login
          clearError(mobileInput);
          clearError(passwordInput);
      });
  }

  if (backBtn) {
      backBtn.addEventListener("click", () => {
          window.location.href = '../index.html';
      });
  }

  if (lockIcon && openLockIcon && passwordInput) {
      lockIcon.addEventListener('click', () => {
          passwordInput.type = 'text';
          lockIcon.style.display = 'none';
          openLockIcon.style.display = 'inline';
      });

      openLockIcon.addEventListener('click', () => {
          passwordInput.type = 'password';
          openLockIcon.style.display = 'none';
          lockIcon.style.display = 'inline';
      });
  }

  // Add event listeners for input fields to clear errors on focus
  if (mobileInput) {
      mobileInput.addEventListener('focus', () => {
          clearError(mobileInput);
      });
  }

  if (passwordInput) {
      passwordInput.addEventListener('focus', () => {
          clearError(passwordInput);
      });
  }
});