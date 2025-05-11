// Flag to prevent multiple restriction alerts
let isRestricted = false;

function initSidebar() {
  // Prevent multiple executions of initSidebar
  if (window.sidebarInitialized) {
    console.log("initSidebar already executed, skipping.");
    return;
  }
  window.sidebarInitialized = true;

  const menuBtn = document.querySelector(".menu-btn");
  const sidebar = document.querySelector(".sidebar");
  const logoutBtn = document.querySelector("#logout-btn");

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function () {
      sidebar.classList.toggle("active");
    });
  } else {
    console.log("Menu button or sidebar element NOT found (from within sidebar.js).");
  }

  document.querySelectorAll(".menu ul li.has-dropdown > a").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const parentLi = this.parentElement;

      document.querySelectorAll(".menu ul li.has-dropdown").forEach((li) => {
        if (li !== parentLi) {
          li.classList.remove("active");
          const sub = li.querySelector(".sub-menu");
          if (sub) sub.style.display = "none";
        }
      });

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
          localStorage.removeItem("userData");

          Swal.fire({
            title: "Logged out!",
            text: "You have been successfully logged out.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });

          setTimeout(() => {
            const absolutePath = "../pages/login.html";
            window.location.replace(absolutePath);
          }, 1600);
        }
      });
    });
  } else {
    console.log("Logout button element NOT found (from within sidebar.js).");
  }

  // Restrict ABVN access to specific pages
  function restrictPageAccess() {
    // Skip if already restricted
    if (isRestricted) {
      console.log("Page access already restricted, skipping.");
      return;
    }

    const restrictedPages = [
      'volunteergroupmanagement.html',
      'reportsVerification.html',
      'reportsLog.html',
      'activation.html',
      'reliefsLog.html'
    ];
    const currentPath = window.location.pathname;
    const isRestrictedPage = restrictedPages.some(page => currentPath.includes(page));

    if (isRestrictedPage) {
      const userRole = localStorage.getItem("userRole");
      if (!userRole) {
        console.log("No user role found in localStorage, redirecting to login.");
        isRestricted = true; // Set flag to prevent further triggers
        Swal.fire({
          icon: "warning",
          title: "Authentication Required",
          text: "Please sign in to continue.",
          timer: 2000,
          showConfirmButton: false
        });
        setTimeout(() => {
          window.location.replace("/Bayanihan-PWA/pages/login.html");
        }, 2000);
        return;
      }
      if (userRole === "ABVN") {
        console.log("ABVN user attempted to access restricted page:", currentPath);
        isRestricted = true; // Set flag to prevent further triggers
        Swal.fire({
          icon: "error",
          title: "Access Denied",
          text: "This page is for admins only.",
          timer: 2000,
          showConfirmButton: false
        });
        setTimeout(() => {
          window.location.replace("/Bayanihan-PWA/pages/dashboard.html");
        }, 2000);
      }
    }
  }

  function populateUserDetails() {
    const userRoleElement = document.querySelector("#user-role");
    const userNameElement = document.querySelector("#user-name");

    const user = JSON.parse(localStorage.getItem("userData")) || {};

    console.log("User Data retrieved in sidebar:", user);

    const group = user.group || "";
    const contactPerson = user.contactPerson || "";
    const role = user.role || "";

    let roleDisplay = "";
    if (role === "AB ADMIN") {
      roleDisplay = "Admin";
    } else if (role === "ABVN") {
      roleDisplay = group;
    } else {
      roleDisplay = "";
    }

    console.log("Role Display for #user-role:", roleDisplay);

    if (userRoleElement) {
      userRoleElement.textContent = roleDisplay;
    } else {
      console.log("#user-role element not found in DOM");
    }

    if (userNameElement) {
      userNameElement.textContent = contactPerson;
    } else {
      console.log("#user-name element not found in DOM");
    }

    restrictMenuAccess(role);
  }

  function restrictMenuAccess(role) {
    const restrictedItems = [
      ".menu-activation",
      ".menu-reports",
      ".menu-reliefs-log",
    ];

    console.log("Restricting menu access for role:", role);

    if (role === "ABVN") {
      restrictedItems.forEach((selector) => {
        const parentLi = document.querySelector(selector);
        if (parentLi) {
          parentLi.style.display = "none";
          console.log(`Hid menu item: ${selector}`);
        } else {
          console.log(`Menu item not found: ${selector}`);
        }
      });
    } else {
      restrictedItems.forEach((selector) => {
        const parentLi = document.querySelector(selector);
        if (parentLi) {
          parentLi.style.display = "block";
          console.log(`Showed menu item: ${selector}`);
        }
      });
    }
  }

  // Call restrictPageAccess on page load
  restrictPageAccess();
  populateUserDetails();

  window.addEventListener("updateSidebar", () => {
    populateUserDetails();
  });
}

initSidebar();