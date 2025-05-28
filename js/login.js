// document.addEventListener("DOMContentLoaded", () => {
//     const container = document.querySelector(".container");
//     const loginBtn = document.querySelector(".login-btn");
//     const assistBtn = document.querySelector(".assist-btn");
//     const loginForm = document.querySelector(".login form");
//     const assistanceBox = document.querySelector(".assistance");
//     const backBtn = document.querySelector(".back-btn");
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

//     // Function to display error messages
//     const showToast = (message, type = 'error') => {
//         const toastContainer = document.querySelector('.toast-container');
//         const toast = document.createElement('div');
//         toast.className = `toast ${type}`;
//         toast.textContent = message;

//         toastContainer.appendChild(toast);

//         // Trigger animation
//         setTimeout(() => toast.classList.add('show'), 10);

//         // Remove after 3 seconds
//         setTimeout(() => {
//             toast.classList.remove('show');
//             setTimeout(() => toast.remove(), 300); // match CSS transition
//         }, 3000);
//     };

//     const clearError = (inputElement) => {
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

//     const displayError = (inputElement, message) => {
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
//     const validateEmail = () => {
//         clearError(emailInput);
//         const email = emailInput.value.trim();
        
//         if (!email) {
//             showToast('Email is required.');
//             return false;
//         }

//         // Basic email regex check
//         const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailPattern.test(email)) {
//             showToast('Please enter a valid email address.');
//             return false;
//         }

//         return true;
//     };

//     // Validate Password
//     const validatePassword = () => {
//         clearError(passwordInput);
//         const password = passwordInput.value;
//         if (!password) {
//             displayError(passwordInput, 'Password is required.');
//             return false;
//         }
//         if (password.length < 6) {
//             displayError(passwordInput, 'Password must be at least 6 characters long.');
//             return false;
//         }
//         return true;
//     };

//   // Login form submission listener
//   if (loginForm) {
//       loginForm.addEventListener('submit', (event) => {
//           event.preventDefault(); 
//           const isEmailValid = validateEmail();
//           const isPasswordValid = validatePassword();

//           if (isEmailValid && isPasswordValid) {
//               showToast('Login Successful!', 'success');
//               console.log('Login successful (client-side validation passed)!', {
//                   mobile: emailInput.value,
//                   password: passwordInput.value
//               });
//           } else {
//               console.log('Login failed due to validation errors.');
//           }
//       });
//   }

//   // Toggle between login form and assistance box
//   if (assistanceBox && loginForm) {
//       assistBtn.addEventListener("click", () => {
//           container.classList.add("active");
//           loginForm.reset();
//           clearError(emailInput);
//           clearError(passwordInput);
//       });
//   }

//   if (loginBtn && assistanceBox) {
//       loginBtn.addEventListener("click", () => {
//           container.classList.remove("active");
//           clearError(emailInput);
//           clearError(passwordInput);
//       });
//   }

//   if (backBtn) {
//       backBtn.addEventListener("click", () => {
//           window.location.href = '../index.html';
//       });
//   }

//   if (lockIcon && openLockIcon && passwordInput) {
//       lockIcon.addEventListener('click', () => {
//           passwordInput.type = 'text';
//           lockIcon.style.display = 'none';
//           openLockIcon.style.display = 'inline';
//       });

//       openLockIcon.addEventListener('click', () => {
//           passwordInput.type = 'password';
//           openLockIcon.style.display = 'none';
//           lockIcon.style.display = 'inline';
//       });
//   }

//   // Add event listeners for input fields to clear errors on focus
//     if (emailInput) {
//     emailInput.addEventListener('focus', () => {
//         clearError(emailInput);
//     });
//     }

//   if (passwordInput) {
//       passwordInput.addEventListener('focus', () => {
//           clearError(passwordInput);
//       });
//   }
// });

document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".container");
    const loginBtn = document.querySelector(".login-btn");
    const assistBtn = document.querySelector(".assist-btn");
    const loginForm = document.querySelector(".login form");
    const assistanceBox = document.querySelector(".assistance");
    const backBtn = document.querySelector(".back-btn");
    const passwordInput = document.getElementById('login-password');
    const emailInput = document.getElementById('login-email'); 
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
    if (!emailInput) console.error("Email input not found");
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

    // Define displayError function to show inline input error
    const displayError = (inputElement, message) => {
        const inputBox = inputElement.closest('.input-box');
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
    const validateEmail = () => {
        clearError(emailInput);
        const email = emailInput.value.trim();
        
        if (!email) {
            showToast('Email is required.');
            return false;
        }

        // Basic email regex check
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            showToast('Please enter a valid email address.');
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
            const isEmailValid = validateEmail();
            const isPasswordValid = validatePassword();

            if (isEmailValid && isPasswordValid) {
                showToast('Login Successful!', 'success');
                console.log('Login successful (client-side validation passed)!', {
                    email: emailInput.value,
                    password: passwordInput.value
                });
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
            clearError(emailInput);
            clearError(passwordInput);
        });
    }

    if (loginBtn && assistanceBox) {
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
