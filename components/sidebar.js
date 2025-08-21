let isRestricted = false;

function initSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const menuBtn = document.querySelector(".menu-btn");
  const logoutBtn = document.querySelector("#logout-btn");

  // --- Highlight active menu item including sub-menus ---
  function highlightActiveMenuItem() {
    const currentPage = window.location.pathname.split("/").pop();

    document.querySelectorAll(".menu ul li").forEach((item) => {
      const link = item.querySelector("a");
      if (link) {
        const linkHref = link.getAttribute("href") || "";
        if (linkHref.includes(currentPage)) {
          item.classList.add("active");

          // Expand parent dropdown if it exists
          const parentDropdown = item.closest("li.has-dropdown");
          if (parentDropdown) {
            parentDropdown.classList.add("active");
            const subMenu = parentDropdown.querySelector(".sub-menu");
            if (subMenu) subMenu.style.height = subMenu.scrollHeight + "px";
          }
        } else {
          if (!item.closest("li.has-dropdown") || !item.closest("li.has-dropdown").classList.contains("active")) {
            item.classList.remove("active");
          }
        }
      }
    });
  }

function toggleSidebar() {
  const userNameElement = document.querySelector("#user-name");
  const userRoleElement = document.querySelector("#user-role");
  const logoutText = logoutBtn.querySelector("span"); // logout text span

  sidebar.classList.toggle("collapsed");

  // Use transform to position the button at the edge
  if (sidebar.classList.contains("collapsed")) {
    menuBtn.style.transform = `translateX(0)`; // button sticks to collapsed sidebar edge
  } else {
    menuBtn.style.transform = `translateX(${sidebar.offsetWidth + 80}px)`; // sticks to expanded edge
  }

  // Hide/show user details
  if (userNameElement) userNameElement.style.display = sidebar.classList.contains("collapsed") ? "none" : "inline";
  if (userRoleElement) userRoleElement.style.display = sidebar.classList.contains("collapsed") ? "none" : "inline";

  // Hide/show logout text
  if (logoutText) logoutText.style.display = sidebar.classList.contains("collapsed") ? "none" : "inline";
}

// Initial button position
if (menuBtn && sidebar) {
  menuBtn.addEventListener("click", toggleSidebar);
  menuBtn.style.transform = `translateX(${sidebar.offsetWidth - 80}px)`; // correct starting position
}



  // --- Smooth dropdown toggle ---
  document.querySelectorAll(".menu ul li.has-dropdown > a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const parentLi = link.parentElement;
      const subMenu = parentLi.querySelector(".sub-menu");

      // Close other dropdowns
      document.querySelectorAll(".menu ul li.has-dropdown").forEach((li) => {
        if (li !== parentLi) {
          li.classList.remove("active");
          const sub = li.querySelector(".sub-menu");
          if (sub) sub.style.height = "0px";
        }
      });

      // Toggle current dropdown
      parentLi.classList.toggle("active");
      if (subMenu) {
        subMenu.style.height = parentLi.classList.contains("active") ? subMenu.scrollHeight + "px" : "0px";
      }
    });
  });

  // --- Logout confirmation ---
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      Swal.fire({
        title: "Are you sure you want to log out?",
        text: "You will need to log in again to access your account.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, log out",
        cancelButtonText: "Cancel",
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          ["userMobile", "userRole", "userData", "userUID"].forEach(key => localStorage.removeItem(key));
          Swal.fire({
            title: "Logged out!",
            icon: "success",
            timer: 1600,
            showConfirmButton: false,
            timerProgressBar: true,
            didClose: () => window.location.replace("../pages/login.html"),
          });
        }
      });
    });
  }

  // --- Page access restrictions ---
  function restrictPageAccess() {
    if (isRestricted) return;

    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'login.html') return;

    const userRole = localStorage.getItem("userRole");
    if (!userRole) {
      isRestricted = true;
      Swal.fire({ icon: "warning", title: "Authentication Required", text: "Please sign in.", timer: 2000, showConfirmButton: false });
      setTimeout(() => window.location.replace("../pages/login.html"), 2000);
      return;
    }

    const abvnRestrictedPages = [
      'volunteergroupmanagement.html', 'reportsVerification.html', 'rdanaVerification.html',
      'activation.html', 'reliefsLog.html', 'rdanaLog.html',
      'inkind.html', 'monetary.html', 'reportsLog.html'
    ];

    if (userRole === "ABVN" && abvnRestrictedPages.some(page => currentPage.includes(page))) {
      isRestricted = true;
      Swal.fire({ icon: "error", title: "Access Denied", text: "This page is for admins only.", timer: 2000, showConfirmButton: false });
      setTimeout(() => window.location.replace("../pages/dashboard.html"), 2000);
    }
  }

  // --- Populate user details & control menu visibility ---
  function populateUserDetails() {
    const userRoleElement = document.querySelector("#user-role");
    const userNameElement = document.querySelector("#user-name");
    const user = JSON.parse(localStorage.getItem("userData")) || {};

    let roleDisplay = "";
    if (user.role === "AB ADMIN") roleDisplay = "Admin" + (user.adminPosition ? ` (${user.adminPosition})` : "");
    else if (user.role === "ABVN") roleDisplay = user.organization || "";
    if (userRoleElement) userRoleElement.textContent = roleDisplay;

    if (userNameElement) {
      userNameElement.textContent = user.role === "AB ADMIN"
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : user.contactPerson || "";
    }

    restrictMenuAccess(user.role, user.isSuperAdmin || false);
  }

  // --- Show/hide menu items based on role ---
  function restrictMenuAccess(role, isSuperAdmin) {
    const menuItems = {
      activitylogs: ".menu-activitylogs", adminmanagement: ".menu-adminmanagement", dashboard: ".menu-dashboard",
      communityboard: ".menu-communityboard", volunteergroupmanagement: ".menu-volunteergroupmanagement",
      activation: ".menu-activation", donationTracksheet: ".menu-donation-tracksheet",
      inkind: ".menu-inkind", monetary: ".menu-monetary", reliefsLog: ".menu-reliefs-log",
      rdanaVerification: ".menu-rdana-verification", rdanaLog: ".menu-rdana-log",
      reportsVerification: ".menu-reports-verification", reportsLog: ".menu-reports-log",
      abvnApplications: ".menu-abvn-applications", pendingABVN: ".menu-pending-abvn",
      approvedABVN: ".menu-approved-abvn", volunteerApplications: ".menu-volunteer-applications",
      pendingVolunteers: ".menu-pending-volunteers", approvedVolunteers: ".menu-approved-volunteers",
      endorsedVolunteers: ".menu-endorsed-volunteers", pendingDonations: ".menu-pending-donations",
      pendingInkind: ".menu-pending-inkind", pendingMonetary: ".menu-pending-monetary",
      rdana: ".menu-rdana", rdanaMain: ".menu-rdana-main", callfordonation: ".menu-callfordonation",
      reliefs: ".menu-reliefs", reliefsRequest: ".menu-reliefs-request",
      reports: ".menu-reports", reportsSubmission: ".menu-reports-submission"
    };

    const allItems = {};
    for (const key in menuItems) allItems[key] = document.querySelector(menuItems[key]);

    if (role === "ABVN") {
      document.querySelectorAll("p.title").forEach(t => { if (t.textContent.trim() === "Admin") t.style.display = "none"; });

      const allowed = ["dashboard", "rdana", "rdanaMain", "callfordonation", "reliefs", "reliefsRequest", "reports", "reportsSubmission", "endorsedVolunteers"];
      const restricted = Object.keys(allItems).filter(k => !allowed.includes(k));

      allowed.forEach(k => allItems[k] && (allItems[k].style.display = "block"));
      restricted.forEach(k => allItems[k] && (allItems[k].style.display = "none"));

      if (allItems.rdanaMain?.style.display === "none") allItems.rdana && (allItems.rdana.style.display = "none");
      if (allItems.reliefsRequest?.style.display === "none") allItems.reliefs && (allItems.reliefs.style.display = "none");
      if (allItems.reportsSubmission?.style.display === "none") allItems.reports && (allItems.reports.style.display = "none");
    } else if (role === "AB ADMIN") {
      Object.values(allItems).forEach(el => el && (el.style.display = "block"));
      if (!isSuperAdmin) {
        allItems.activitylogs && (allItems.activitylogs.style.display = "none");
        allItems.adminmanagement && (allItems.adminmanagement.style.display = "none");
      }
    } else {
      Object.values(allItems).forEach(el => el && (el.style.display = "none"));
    }
  }

  // --- Initialize sidebar ---
  highlightActiveMenuItem();
  restrictPageAccess();
  populateUserDetails();

  window.addEventListener("updateSidebar", populateUserDetails);
}

// --- Run once ---
if (!window.sidebarInitialized) {
  window.sidebarInitialized = true;
  initSidebar();
}
