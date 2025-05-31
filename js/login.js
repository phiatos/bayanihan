

//     export const clearError = (inputElement) => {
//         const inputBox = inputElement.closest('.input-box');
//         const errorDiv = inputBox.querySelector('.error-message');

//         if (errorDiv) {
//             errorDiv.classList.remove('show');
//             setTimeout(() => {
//                 errorDiv.remove();
//             }, 300); // match CSS transition time
//         }

//         inputElement.classList.remove('error');
//     };

//     // Define displayError function to show inline input error
//     export const displayError = (inputElement, message) => {
//         const inputBox = inputElement.closest('.input-box');
//         let errorDiv = inputBox.querySelector('.error-message');
//         if (!errorDiv) {
//             errorDiv = document.createElement('div');
//             errorDiv.classList.add('error-message');
//             inputBox.appendChild(errorDiv);
//         }
//         errorDiv.textContent = message;
//         errorDiv.classList.add('show');
//         inputElement.classList.add('error');
//     };

//     // Validate Email
//     export const validateEmail = (emailInput) => {
//         clearError(emailInput);
//         const email = emailInput.value.trim();

//         if (!email) {
//             displayError(emailInput, 'Email is required.');
//             return false;
//         }

//         // Basic email regex check
//         const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailPattern.test(email)) {
//             displayError(emailInput, 'Please enter a valid email address.');
//             return false;
//         }
//         return true;
//     };

//     // Validate Password
//     export const validatePassword = (passwordInput) => {
//         clearError(passwordInput);
//         const password = passwordInput.value;
//         if (!password) {
//             displayError(passwordInput, 'Password is required.');
//             return false;
//         }
//         // IMPORTANT: Ensure this matches the minlength in login.html (currently 8)
//         if (password.length < 8) { // Changed from 6 to 8 for consistency
//             displayError(passwordInput, 'Password must be at least 8 characters long.');
//             return false;
//         }
//         return true;
//     };


// document.addEventListener("DOMContentLoaded", () => {
//     const container = document.querySelector(".container");
//     const loginBtn = document.querySelector(".login-btn");
//     const assistBtn = document.querySelector(".assist-btn");
//     const loginForm = document.querySelector(".login form");
//     const assistanceBox = document.querySelector(".assistance");
//     const backBtn = document.querySelector(".login-back-btn");
//     const passwordInput = document.getElementById('login-password');
//     const emailInput = document.getElementById('login-email'); 
//     const lockIcon = document.querySelector('.bxs-lock-alt');
//     const openLockIcon = document.querySelector('.bxs-lock-open-alt');

//     openLockIcon.style.display = 'none';

//     if (!container) console.error("Container not found");
//     if (!loginBtn) console.error("Login button not found");
//     if (!assistBtn) console.error("Assistance button not found");
//     if (!loginForm) console.error("Login form not found");
//     if (!assistanceBox) console.error("Assistance box not found");
//     if (!backBtn) console.error("Back button not found");
//     if (!passwordInput) console.error("Password input not found");
//     if (!emailInput) console.error("Email input not found");
//     if (!lockIcon) console.error("Closed lock icon not found");
//     if (!openLockIcon) console.error("Open lock icon not found");

//     // Login form submission listen
//     if (loginForm) {
//         loginForm.addEventListener('submit', (event) => {
//             const isEmailValid = validateEmail();
//             const isPasswordValid = validatePassword();

//             if (!isEmailValid || !isPasswordValid) {
//                 event.preventDefault();
//                 console.log('Login failed due to client-side validation errors.');
//             }
//         });
//     }

//     // Toggle between login form and assistance box
//     if (assistanceBox && loginForm && assistBtn) { 
//         assistBtn.addEventListener("click", () => {
//             container.classList.add("active");
//             loginForm.reset();
//             // Clear any previous error messages when switching to assistance
//             clearError(emailInput);
//             clearError(passwordInput);
//         });
//     }

//     if (loginBtn && assistanceBox && container) { 
//         loginBtn.addEventListener("click", () => {
//             container.classList.remove("active");
//             // Clear any previous error messages when switching back to login
//             clearError(emailInput);
//             clearError(passwordInput);
//         });
//     }

//     if (backBtn) {
//         backBtn.addEventListener("click", () => {
//             window.location.href = '../index.html';
//         });
//     }

//     if (lockIcon && openLockIcon && passwordInput) {
//         lockIcon.addEventListener('click', () => {
//             passwordInput.type = 'text';
//             lockIcon.style.display = 'none';
//             openLockIcon.style.display = 'inline-block';
//         });

//         openLockIcon.addEventListener('click', () => {
//             passwordInput.type = 'password';
//             openLockIcon.style.display = 'none';
//             lockIcon.style.display = 'inline-block';
//         });
//     }

//     // Add event listeners for input fields to clear errors on focus
//     if (emailInput) {
//         emailInput.addEventListener('focus', () => {
//             clearError(emailInput);
//         });
//     }

//     if (passwordInput) {
//         passwordInput.addEventListener('focus', () => {
//             clearError(passwordInput);
//         });
//     }
// });

export const clearError = (inputElement) => {
    // Check if inputElement is defined before proceeding
    if (!inputElement) {
        console.error("clearError: inputElement is undefined.");
        return;
    }
    const inputBox = inputElement.closest('.input-box');
    // Check if inputBox is found
    if (!inputBox) {
        console.error("clearError: .input-box not found for", inputElement);
        // It's possible the input doesn't have a parent .input-box,
        // so we might just clear the error class on the input itself.
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
        console.error("displayError: inputElement is undefined.");
        return;
    }
    const inputBox = inputElement.closest('.input-box');
    // Check if inputBox is found
    if (!inputBox) {
        console.error("displayError: .input-box not found for", inputElement);
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
        console.error("validateEmail: emailInput is undefined.");
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
        console.error("validatePassword: passwordInput is undefined.");
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

    // Comprehensive null checks and error reporting for all critical elements
    if (!container) console.error("Container not found");
    if (!loginBtn) console.error("Login button not found");
    if (!assistBtn) console.error("Assistance button not found");
    if (!loginForm) console.error("Login form not found");
    if (!assistanceBox) console.error("Assistance box not found");
    if (!backBtn) console.error("Back button not found");
    if (!passwordInput) console.error("Password input not found");
    if (!emailInput) console.error("Email input not found");
    if (!lockIcon) console.error("Closed lock icon not found");
    if (!openLockIcon) console.error("Open lock icon not found");


    // Login form submission listener
    if (loginForm && emailInput && passwordInput) { // Ensure all necessary elements exist
        loginForm.addEventListener('submit', (event) => {
            // Pass the input elements to the validation functions
            const isEmailValid = validateEmail(emailInput);
            const isPasswordValid = validatePassword(passwordInput);

            if (!isEmailValid || !isPasswordValid) {
                event.preventDefault(); // Prevent form submission if validation fails
                console.log('Login failed due to client-side validation errors.');
            } else {
                console.log('Login successful (client-side validation passed)!', {
                    mobile: emailInput.value,
                    password: passwordInput.value
                });
                // If you want to submit the form normally after success,
                // don't preventDefault, or handle the submission via AJAX.
                // For now, it will proceed with default submission if validation passes.
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