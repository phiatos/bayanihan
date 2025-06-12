let isRestricted = false;

function highlightActiveMenuItem() {
  const currentPath = window.location.pathname;
  const currentPage = currentPath.split("/").pop();

  document.querySelectorAll(".menu ul li").forEach((menuItem) => {
    const link = menuItem.querySelector("a");
    if (link) {
      const linkHref = link.getAttribute("href") || "";
      if (linkHref.includes(currentPage)) {
        menuItem.classList.add("active");
      } else {
        menuItem.classList.remove("active");
      }
    }
  });
}


function initSidebar() {
  highlightActiveMenuItem();
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
      confirmButtonText: "Yes, log out",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: 'swal2-popup-clean',
        title: 'swal2-title-clean',
        content: 'swal2-text-clean',
        confirmButton: 'swal2-btn-confirm-clean',
        cancelButton: 'swal2-btn-cancel-clean'
      },
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("userMobile");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userData");

        Swal.fire({
          title: "Logged out!",
          text: "You have been successfully logged out.",
          icon: "success",
          timer: 1600,
          showConfirmButton: false,
          timerProgressBar: true,
          customClass: {
            popup: 'swal2-popup-success-clean',
            title: 'swal2-title-success-clean',
            content: 'swal2-text-success-clean'
          },
          didClose: () => {
            window.location.replace("../pages/login.html");
          }
        });
      }
    });

    });
  } else {
    console.log("Logout button element NOT found (from within sidebar.js).");
  }

  function restrictPageAccess() {
    // Skip if already restricted
    if (isRestricted) {
      console.log("Page access already restricted, skipping.");
      return;
    }

    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop(); // Get just the filename

    // Allow access to login.html without authentication
    if (currentPage === 'login.html') {
      return;
    }

    const userRole = localStorage.getItem("userRole");

    // All pages except login.html require a user role
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
        window.location.replace("../pages/login.html");
      }, 2000);
      return;
    }

    // Specific restrictions for ABVN role on certain pages
    const abvnRestrictedPages = [
      'volunteergroupmanagement.html',
      'reportsVerification.html',
      'activation.html',
      'rdanaVerification.html',
      'inkind.html',
      'monetary.html',
    ];

    const isAbvnRestrictedPage = abvnRestrictedPages.some(page => currentPath.includes(page));

    if (userRole === "ABVN" && isAbvnRestrictedPage) {
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
        window.location.replace("../pages/dashboard.html");
      }, 2000);
    }
  }

  function populateUserDetails() {
    const userRoleElement = document.querySelector("#user-role");
    const userNameElement = document.querySelector("#user-name");

    const user = JSON.parse(localStorage.getItem("userData")) || {};

    console.log("User Data retrieved in sidebar:", user);

    const group = user.organization || "";
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
    // Define menu items to control visibility
    const menuItems = {
      //admin
      dashboard: document.querySelector(".menu-dashboard"),
      communityboard: document.querySelector(".menu-communityboard"),
      volunteergroupmanagement: document.querySelector(".menu-volunteergroupmanagement"),
      activation: document.querySelector(".menu-activation"),
      donationTracksheet: document.querySelector(".menu-donation-tracksheet"),
      inkind: document.querySelector(".menu-inkind"),
      monetary: document.querySelector(".menu-monetary"),
      reliefsLog: document.querySelector(".menu-reliefs-log"),
      rdanaVerification: document.querySelector(".menu-rdana-verification"),
      rdanaLog: document.querySelector(".menu-rdana-log"),
      reportsVerification: document.querySelector(".menu-reports-verification"),
      reportsLog: document.querySelector(".menu-reports-log"),
      //approvals
      abvnApplications: document.querySelector(".menu-abvn-applications"),
      pendingABVN: document.querySelector(".menu-pending-abvn"),
      approvedABVN: document.querySelector(".menu-approved-abvn"),
      volunteerApplications: document.querySelector(".menu-volunteer-applications"),
      pendingVolunteers: document.querySelector(".menu-pending-volunteers"),
      approvedVolunteers: document.querySelector(".menu-approved-volunteers"),
      endorsedVolunteers: document.querySelector(".menu-endorsed-volunteers"),
      pendingDonations: document.querySelector(".menu-pending-donations"),
      pendingInkind: document.querySelector(".menu-pending-inkind"),
      pendingMonetary: document.querySelector(".menu-pending-monetary"),
      //abvn
      rdana: document.querySelector(".menu-rdana"),
      rdanaMain: document.querySelector(".menu-rdana-main"),
      callfordonation: document.querySelector(".menu-callfordonation"),
      reliefs: document.querySelector(".menu-reliefs"),
      reliefsRequest: document.querySelector(".menu-reliefs-request"),
      reports: document.querySelector(".menu-reports"),
      reportsSubmission: document.querySelector(".menu-reports-submission"),
    };
    console.log("Restricting menu access for role:", role);

    const allTitles = document.querySelectorAll("p.title");
    if (role === "ABVN") {
      allTitles.forEach((title) => {
        // Hide the "Admin" title
        if (title.textContent.trim() === "Admin") {
          title.style.display = "none";
        }
      });

      // Show allowed menu items for ABVN volunteers
      const allowedItems = [
        menuItems.dashboard,
        menuItems.rdana,
        menuItems.rdanaMain,
        menuItems.callfordonation,
        menuItems.reliefs,
        menuItems.reliefsRequest,
        menuItems.reports,
        menuItems.reportsSubmission,
        menuItems.endorsedVolunteers,
        menuItems.reportsLog, // Allow ABVN to see Reports Log
        menuItems.rdanaLog,   // Allow ABVN to see RDANA Log
        menuItems.reliefsLog, // Allow ABVN to see Reliefs Log
      ];

      // Hide restricted menu items for ABVN volunteers
      const restrictedItems = [
        menuItems.volunteergroupmanagement,
        menuItems.activation,
        menuItems.donationTracksheet,
        menuItems.abvnApplications,
        menuItems.pendingDonations,
        menuItems.rdanaVerification,
        menuItems.reportsVerification,
        menuItems.pendingVolunteers,
        menuItems.approvedVolunteers
      ];

      // Show allowed items
      allowedItems.forEach((item) => {
        if (item) {
          item.style.display = "block";
          console.log(`Showed menu item: ${item.className}`);
        }
      });

      // Hide restricted items
      restrictedItems.forEach((item) => {
        if (item) {
          item.style.display = "none";
          console.log(`Hid menu item: ${item.className}`);
        }
      });

      // If RDANA has no visible sub-items, hide the parent RDANA menu
      if (!menuItems.rdanaMain || menuItems.rdanaMain.style.display === "none") {
        if (menuItems.rdana) {
          menuItems.rdana.style.display = "none";
          console.log("Hid RDANA parent menu as no sub-items are visible");
        }
      }

      // If Reliefs has no visible sub-items, hide the parent Reliefs menu
      if (!menuItems.reliefsRequest || menuItems.reliefsRequest.style.display === "none") {
        if (menuItems.reliefs) {
          menuItems.reliefs.style.display = "none";
          console.log("Hid Reliefs parent menu as no sub-items are visible");
        }
      }

      // If Reports has no visible sub-items, hide the parent Reports menu
      if (!menuItems.reportsSubmission || menuItems.reportsSubmission.style.display === "none") {
        if (menuItems.reports) {
          menuItems.reports.style.display = "none";
          console.log("Hid Reports parent menu as no sub-items are visible");
        }
      }
    } else {
      // For non-ABVN users (e.g., admins), show all menu items
      Object.values(menuItems).forEach((item) => {
        if (item) {
          item.style.display = "block";
          console.log(`Showed menu item: ${item.className}`);
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