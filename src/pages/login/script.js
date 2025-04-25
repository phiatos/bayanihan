document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".container");
    const registerBtn = document.querySelector(".register-btn");
    const loginBtn = document.querySelector(".login-btn");
    const registerForm = document.querySelector(".register-form");
    const loginForm = document.querySelector(".login form");
  
    if (!container) console.error("Container not found");
    if (!registerBtn) console.error("Register button not found");
    if (!loginBtn) console.error("Login button not found");
    if (!registerForm) console.error("Register form not found");
    if (!loginForm) console.error("Login form not found");
  
    if (registerBtn && loginForm) {
      registerBtn.addEventListener("click", () => {
        console.log("Register toggle button clicked");
        container.classList.add("active");
        loginForm.reset();
      });
    }
  
    if (loginBtn && registerForm) {
      loginBtn.addEventListener("click", () => {
        console.log("Login toggle button clicked");
        container.classList.remove("active");
        registerForm.reset();
      });
    }
  });
  