function initSidebar() {
  const menuBtn = document.querySelector(".menu-btn");
  const sidebar = document.querySelector(".sidebar");
  const logoutBtn = document.querySelector("#logout-btn");

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function() {
      sidebar.classList.toggle("active");
    });
  } else {
    console.log("Menu button or sidebar element NOT found (from within sidebar.js).");
  }

  // Sub Menu Toggle (updated logic)
  document.querySelectorAll(".menu ul li.has-dropdown > a").forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const parentLi = this.parentElement;
  
      // Deactivate all other dropdowns
      document.querySelectorAll(".menu ul li.has-dropdown").forEach(li => {
        if (li !== parentLi) {
          li.classList.remove("active");
          const sub = li.querySelector(".sub-menu");
          if (sub) sub.style.display = "none";
        }
      });
  
      // Toggle current dropdown
      const subMenu = parentLi.querySelector(".sub-menu");
      const isVisible = subMenu && subMenu.style.display === "block";
  
      parentLi.classList.toggle("active", !isVisible);
      if (subMenu) {
        subMenu.style.display = isVisible ? "none" : "block";
      }
    });
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();

      Swal.fire({
        title: "Are you sure you want to log out?",
        text: "You will need to log in again to access your account.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, logout",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          localStorage.removeItem("userMobile");
          localStorage.removeItem("userRole");

          Swal.fire({
            title: "Logged out!",
            text: "You have been successfully logged out.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });

          setTimeout(() => {
            const absolutePath = "../pages/login.html";
            window.location.replace(absolutePath); // Redirect to login
          }, 1600);
        }
      });
    });
    } else {
      console.log("Logout button element NOT found (from within sidebar.js).");
    }
  }

// Call initSidebar when the script loads
initSidebar();