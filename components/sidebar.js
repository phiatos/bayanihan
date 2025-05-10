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
          localStorage.removeItem("userData"); // Clear userData on logout

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

    // Retrieve user data from localStorage
    const user = JSON.parse(localStorage.getItem("userData")) || {};

    // Debug: Log the user data and role display
    console.log("User Data retrieved in sidebar:", user);

    // Extract group, contact person, and role, default to empty strings if not available
    const group = user.group || "";
    const contactPerson = user.contactPerson || "";
    const role = user.role || "";

    // Determine group display for user-role
    let roleDisplay = "";
    if (role === "admin") {
      roleDisplay = "Admin";
    } else if (role === "ABVN") {
      roleDisplay = group; // Show the specific volunteer group name, e.g., "Sample 26 Organization"
    } else {
      roleDisplay = ""; // Empty if no matching role
    }

    // Debug: Log the role display value
    console.log("Role Display for #user-role:", roleDisplay);

    // Update DOM elements
    if (userRoleElement) {
      userRoleElement.textContent = roleDisplay;
    } else {
      console.log("#user-role element not found in DOM");
    }

    if (userNameElement) {
      userNameElement.textContent = contactPerson; // Show the contact person's name
    } else {
      console.log("#user-name element not found in DOM");
    }
  }

  // Call the function to populate user details initially
  populateUserDetails();

  // Listen for sidebar update event after login
  window.addEventListener("updateSidebar", () => {
    populateUserDetails();
  });
}

// Call initSidebar when the script loads
initSidebar();