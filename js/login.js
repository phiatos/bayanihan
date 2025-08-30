export const clearError = (inputElement) => {
    // Check if inputElement is defined before proceeding
    if (!inputElement) {
        return;
    }
    const inputBox = inputElement.closest('.input-box');
    // Check if inputBox is found
    if (!inputBox) {
        inputElement.classList.remove('error');
        return;
    }
    const errorDiv = inputBox.querySelector('.error-message');

    if (errorDiv) {
        errorDiv.classList.remove('show');
        setTimeout(() => {
            errorDiv.remove();
        }, 300); // match CSS transition time
    }

    inputElement.classList.remove('error');
};

// Define displayError function to show inline input error
export const displayError = (inputElement, message) => {
    // Check if inputElement is defined before proceeding
    if (!inputElement) {
        return;
    }
    const inputBox = inputElement.closest('.input-box');
    // Check if inputBox is found
    if (!inputBox) {
        // If no .input-box, we can still add the error class to the input
        inputElement.classList.add('error');
        return;
    }

    let errorDiv = inputBox.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.classList.add('error-message');
        inputBox.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    inputElement.classList.add('error');
};

// Validate Email
export const validateEmail = (emailInput) => {
    if (!emailInput) {
        return false;
    }
    clearError(emailInput);
    const email = emailInput.value.trim();

    if (!email) {
        displayError(emailInput, 'Email is required.');
        return false;
    }

    // Basic email regex check
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        displayError(emailInput, 'Please enter a valid email address.');
        return false;
    }
    return true;
};

// Validate Password
export const validatePassword = (passwordInput) => {
    if (!passwordInput) {
        return false;
    }
    clearError(passwordInput);
    const password = passwordInput.value;
    if (!password) {
        displayError(passwordInput, 'Password is required.');
        return false;
    }
    // IMPORTANT: Ensure this matches the minlength in login.html (currently 8)
    if (password.length < 8) { // Changed from 6 to 8 for consistency
        displayError(passwordInput, 'Password must be at least 8 characters long.');
        return false;
    }
    return true;
};

document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".container");
    const loginBtn = document.querySelector(".login-btn");
    const assistBtn = document.querySelector(".assist-btn");
    const loginForm = document.querySelector(".login form");
    const assistanceBox = document.querySelector(".assistance");
    const backBtn = document.querySelector(".login-back-btn"); // Changed from ".back-btn" if that's the correct class
    const passwordInput = document.getElementById('login-password');
    const emailInput = document.getElementById('login-email');
    const lockIcon = document.querySelector('.bxs-lock-alt');
    const openLockIcon = document.querySelector('.bxs-lock-open-alt');

    // Initialize display style for openLockIcon
    if (openLockIcon) {
        openLockIcon.style.display = 'none';
    }

    // Login form submission listener
    if (loginForm && emailInput && passwordInput) { // Ensure all necessary elements exist
        loginForm.addEventListener('submit', (event) => {
            // Pass the input elements to the validation functions
            const isEmailValid = validateEmail(emailInput);
            const isPasswordValid = validatePassword(passwordInput);

            if (!isEmailValid || !isPasswordValid) {
                event.preventDefault(); 
            } 
        });
    }

    // Toggle between login form and assistance box
    if (assistanceBox && loginForm && assistBtn && container) {
        assistBtn.addEventListener("click", () => {
            container.classList.add("active");
            loginForm.reset();
            // Clear any previous error messages when switching to assistance
            clearError(emailInput);
            clearError(passwordInput);
        });
    }

    if (loginBtn && assistanceBox && container) {
        loginBtn.addEventListener("click", () => {
            container.classList.remove("active");
            // Clear any previous error messages when switching back to login
            clearError(emailInput);
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
            openLockIcon.style.display = 'inline-block';
        });

        openLockIcon.addEventListener('click', () => {
            passwordInput.type = 'password';
            openLockIcon.style.display = 'none';
            lockIcon.style.display = 'inline-block';
        });
    }

    // Add event listeners for input fields to clear errors on focus
    if (emailInput) {
        emailInput.addEventListener('focus', () => {
            clearError(emailInput);
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('focus', () => {
            clearError(passwordInput);
        });
    }
});