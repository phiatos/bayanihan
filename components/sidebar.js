function initSidebar() {
  const menuBtn = document.querySelector(".menu-btn");
  const sidebar = document.querySelector(".sidebar");
  const logoutBtn = document.querySelector("#logout-btn");

  // Menu button toggle logic
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function() {
      sidebar.classList.toggle("active");
    });
  } else {
    console.log("Menu button or sidebar element NOT found (from within sidebar.js).");
  }

  // Sub-menu toggle logic
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

  // Logout button logic
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

  // Logic to populate user details
  function populateUserDetails() {
    const userRoleElement = document.querySelector("#user-role");
    const userNameElement = document.querySelector("#user-name");

    // Retrieve user data from localStorage (or fallback to defaults)
    const user = JSON.parse(localStorage.getItem("userData")) || {
      name: "John Doe",
      role: "web developer",
      group: "Unknown",
      contactPerson: "N/A"
    };

    // Determine group/role display for user-role
    let roleDisplay = "";
    if (user.role === "admin") {
      roleDisplay = "Admin";
    } else if (user.group === "ABVN") {
      roleDisplay = "ABVN Group";
    } else {
      roleDisplay = `Volunteer Group: ${user.group || "None"}`;
    }

    // Update DOM elements
    if (userRoleElement) {
      userRoleElement.textContent = roleDisplay;
    }
    if (userNameElement) {
      const contactInfo = user.contactPerson && user.contactPerson !== "N/A" 
        ? ` (Contact: ${user.contactPerson})` 
        : "";
      userNameElement.textContent = `${user.name || "John Doe"}${contactInfo}`;
    }
  }

  // Call the function to populate user details
  populateUserDetails();
}

// Call initSidebar when the script loads
initSidebar();