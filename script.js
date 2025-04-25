document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".container");
    const registerBtn = document.querySelector(".register-btn");
    const loginBtn = document.querySelector(".login-btn");
    const registerForm = document.querySelector(".register-form");
    const loginForm = document.querySelector(".login form");
  
    if (!container) console.error("Container not found");
    if (!registerBtn) console.error("Register button not found");
    if (!loginBtn) console.error("Login button not found");
  
    registerBtn.addEventListener("click", () => {
      console.log("Register toggle button clicked");
      container.classList.add("active");
      loginForm.reset(); // Clear login form
    });
  
    loginBtn.addEventListener("click", () => {
      console.log("Login toggle button clicked");
      container.classList.remove("active");
      registerForm.reset(); // Clear register form
    });
  });