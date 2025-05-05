document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".container");
    const loginBtn = document.querySelector(".login-btn");
    const assistBtn = document.querySelector(".assist-btn");
    const loginForm = document.querySelector(".login form");
    const assistanceBox = document.querySelector(".assistance");
    const backBtn = document.querySelector(".back-btn");
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
    if (!passwordInput) console.error("Password input not found");
    if (!lockIcon) console.error("Closed lock icon not found");
    if (!openLockIcon) console.error("Open lock icon not found");
    
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

  