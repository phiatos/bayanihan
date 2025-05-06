document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".container");
    const loginBtn = document.querySelector(".login-btn");
    const assistBtn = document.querySelector(".assist-btn");
    const loginForm = document.querySelector(".login form");
    const assistanceBox = document.querySelector(".assistance");
    const backBtn = document.querySelector(".back-btn");
    const mobileInput = document.getElementById('login-mobile');
    const passwordInput = document.getElementById('login-password');
    const lockIcon = document.querySelector('.bxs-lock-alt');
    const openLockIcon = document.querySelector('.bxs-lock-open-alt');

    openLockIcon.style.display = 'none';
    
    if (!container) console.error("Container not found");
    if (!loginBtn) console.error("Login button not found");
    if (!assistBtn) console.error("Assistance button not found");
    if (!loginForm) console.error("Login form not found");
    if (!assistanceBox) console.error("Assistance box not found");
    if (!backBtn) console.error("Back button not found");
    if (!mobileInput) console.error("Mobile input not found");
    if (!passwordInput) console.error("Password input not found");
    if (!lockIcon) console.error("Closed lock icon not found");
    if (!openLockIcon) console.error("Open lock icon not found");
    
    // Function to display error messages
    const displayError = (inputElement, message) => {
      const errorDiv = inputElement.parentElement.querySelector('.error-message');
      if (errorDiv) {
        errorDiv.textContent = message;
      } else {
        const newErrorDiv = document.createElement('div');
        newErrorDiv.className = 'error-message';
        newErrorDiv.style.color = 'red';
        newErrorDiv.style.fontSize = '0.8em';
        newErrorDiv.style.marginTop = '5px';
        newErrorDiv.textContent = message;
        inputElement.parentElement.appendChild(newErrorDiv);
      }
    };

    // Function to clear error messages
    const clearError = (inputElement) => {
      const errorDiv = inputElement.parentElement.querySelector('.error-message');
      if (errorDiv) {
        errorDiv.textContent = '';
      }
    };

    // Validate Mobile Number
    const validateMobile = () => {
      clearError(mobileInput);
      const mobileNumber = mobileInput.value.trim();
      if (!mobileNumber) {
        displayError(mobileInput, 'Mobile number is required.');
        return false;
      }
      if (!/^\d+$/.test(mobileNumber)) {
        displayError(mobileInput, 'Mobile number should only contain digits.');
        return false;
      }
      if (!/^(09|\+639)\d{9}$/.test(mobileNumber)) {
        displayError(mobileInput, 'Invalid Philippine mobile number format (e.g., 09xxxxxxxxx or +639xxxxxxxxx).');
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
        event.preventDefault();
        const isMobileValid = validateMobile();
        const isPasswordValid = validatePassword();

        if (isMobileValid && isPasswordValid) {
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
      });
    }
  
    if (loginBtn && assistanceBox) {
      loginBtn.addEventListener("click", () => {
        container.classList.remove("active");
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

  });

  