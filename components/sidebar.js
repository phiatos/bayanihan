let isRestricted = false;

/* ---------- helpers ---------- */
function getFileName(path) {
  try {
    return new URL(path, window.location.href).pathname.split("/").pop();
  } catch {
    return (path || "").split("/").pop();
  }
}

/* Ensure native tooltips are populated from the visible label */
function ensureMenuTitles() {
  // iterate over all <a> elements inside the sidebar menu
  document.querySelectorAll(".sidebar .menu a").forEach((a) => {
    // get the label from the immediate span.text
    const label = a.querySelector(".text")?.textContent?.trim();
    if (label) {
      a.setAttribute("title", label);      // native tooltip
      a.setAttribute("aria-label", label); // accessibility
      a.dataset.tooltip = label;           // optional for CSS tooltip
    }
  });
}

/* Single-source-of-truth highlighter */
function highlightActiveMenuItem() {
  const currentPage = getFileName(window.location.pathname);

  // clear previous state
  document.querySelectorAll(".menu ul li").forEach((li) => {
    li.classList.remove("active", "active-parent");
  });
  document
    .querySelectorAll('.menu ul li a[aria-current="page"]')
    .forEach((a) => a.removeAttribute("aria-current"));

  // find exact match by file name
  let activeLi = null;
  document.querySelectorAll(".menu ul li a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!href || href === "#" || href.startsWith("javascript:")) return;
    const target = getFileName(href);
    if (target === currentPage) {
      activeLi = a.closest("li");
    }
  });

  if (!activeLi) return;

  // mark the active item
  activeLi.classList.add("active");
  const activeLink = activeLi.querySelector("a[href]");
  if (activeLink) activeLink.setAttribute("aria-current", "page");

  // also mark (only) its parent dropdown
  const parentDropdown = activeLi.closest("li.has-dropdown");
  if (parentDropdown) {
    parentDropdown.classList.add("active", "active-parent");
    // expand it when sidebar is expanded; collapsed relies on hover/flyout CSS
    const sub = parentDropdown.querySelector(".sub-menu");
    const sidebar = document.querySelector(".sidebar");
    if (sub && sidebar && !sidebar.classList.contains("active")) {
      sub.style.display = "block";
    }
  }
}

function initSidebar() {
  if (window.sidebarInitialized) return;
  window.sidebarInitialized = true;

  const sidebar = document.querySelector(".sidebar");
  const menuBtn = document.querySelector(".menu-btn");
  const logoutBtn = document.querySelector("#logout-btn");

  // tooltips (so minimized state still shows names on hover)
  ensureMenuTitles();

  // Toggle sidebar collapse
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => {
      // toggle collapsed state
      const collapsed = sidebar.classList.toggle("active");

      const logoutText = logoutBtn.querySelector(".text");
      if (logoutText) {
        logoutText.style.display = collapsed ? "none" : "inline";
      }

      // when collapsing, clear inline submenu states (flyout handled by CSS)
      if (collapsed) {
        document
          .querySelectorAll(".menu ul li.has-dropdown .sub-menu")
          .forEach((sub) => (sub.style.display = ""));
      } else {
        // when expanding, re-open the active parent's submenu (if any)
        const currentChild = document.querySelector(
          ".menu ul li.active:not(.has-dropdown)"
        );
        const parent = currentChild?.closest("li.has-dropdown");
        const sub = parent?.querySelector(".sub-menu");
        if (parent && sub) sub.style.display = "block";
      }

      // re-assert tooltips (titles survive, but keep in sync)
      ensureMenuTitles();
    });
  }

  // Handle dropdown menus (click toggles only their own — no global highlight here)
  document
    .querySelectorAll(".menu ul li.has-dropdown > a")
    .forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();

        const parentLi = this.parentElement;
        const subMenu = parentLi.querySelector(".sub-menu");
        const isVisible = subMenu && subMenu.style.display === "block";

        // close other dropdowns
        document.querySelectorAll(".menu ul li.has-dropdown").forEach((li) => {
          if (li !== parentLi) {
            li.classList.remove("active");
            const sub = li.querySelector(".sub-menu");
            if (sub) sub.style.display = "none";
          }
        });

        parentLi.classList.toggle("active", !isVisible);
        if (subMenu) subMenu.style.display = isVisible ? "none" : "block";
      });
    });

  // Logout button (unchanged)
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
        focusCancel: true,
        customClass: {
          popup: 'custom-swal-popup-small',
          title: 'custom-swal-title',
          htmlContainer: 'custom-swal-content',
          confirmButton: 'custom-confirm-btn',
          cancelButton: 'custom-cancel-btn'
        },
      }).then((result) => {
        if (result.isConfirmed) {
          ["userMobile", "userRole", "userData", "userUID"].forEach((k) =>
            localStorage.removeItem(k)
          );
          Swal.fire({
            title: "Logged out!",
            text: "You have been successfully logged out.",
            icon: "success",
            timer: 1600,
            showConfirmButton: false,
            timerProgressBar: true,
            customClass: {
              popup: "swal2-popup-success-clean",
              title: "swal2-title-success-clean",
              content: "swal2-text-success-clean",
            },
            didClose: () => window.location.replace("../pages/login.html"),
          });
        }
      });
    });
  }

  // Page access restrictions (exact-match check)
  function restrictPageAccess() {
    if (isRestricted) return;
    const currentPage = getFileName(window.location.pathname);
    if (currentPage === "login.html") return;

    const userRole = localStorage.getItem("userRole");
    if (!userRole) {
      isRestricted = true;
      Swal.fire({
        icon: "warning",
        title: "Authentication Required",
        text: "Please sign in.",
        timer: 2000,
        showConfirmButton: false,
      });
      return setTimeout(
        () => window.location.replace("../pages/login.html"),
        2000
      );
    }

    const abvnRestrictedPages = [
      "volunteergroupmanagement.html",
      "reportsVerification.html",
      "rdanaVerification.html",
      "activation.html",
      "reliefsLog.html",
      "rdanaLog.html",
      "inkind.html",
      "monetary.html",
      "reportsLog.html",
    ];

    if (userRole === "ABVN" && abvnRestrictedPages.includes(currentPage)) {
      isRestricted = true;
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "This page is for admins only.",
        timer: 2000,
        showConfirmButton: false,
      });
      return setTimeout(
        () => window.location.replace("../pages/dashboard.html"),
        2000
      );
    }
  }

  // Populate user details (unchanged)
  function populateUserDetails() {
    const user = JSON.parse(localStorage.getItem("userData")) || {};
    const userRoleElement = document.querySelector("#user-role");
    const userNameElement = document.querySelector("#user-name");

    let roleDisplay = "";
    if (user.role === "AB ADMIN") {
      roleDisplay =
        "Admin" + (user.adminPosition ? ` (${user.adminPosition})` : "");
    } else if (user.role === "ABVN") {
      roleDisplay = user.organization || "";
    }

    if (userRoleElement) userRoleElement.textContent = roleDisplay;
    if (userNameElement)
        userNameElement.textContent =
          user.role === "AB ADMIN" && user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.contactPerson || "";

    restrictMenuAccess(user.role, user.adminPosition || "");
  }

  function restrictMenuAccess(role, adminPosition) {
    const menuItems = {
      activitylogs: document.querySelector(".menu-activitylogs"),
      adminmanagement: document.querySelector(".menu-adminmanagement"),
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
      rdana: document.querySelector(".menu-rdana"),
      rdanaMain: document.querySelector(".menu-rdana-main"),
      callfordonation: document.querySelector(".menu-callfordonation"),
      reliefs: document.querySelector(".menu-reliefs"),
      reliefsRequest: document.querySelector(".menu-reliefs-request"),
      reports: document.querySelector(".menu-reports"),
      reportsSubmission: document.querySelector(".menu-reports-submission"),
    };

    if (role === "ABVN") {
      document.querySelectorAll("p.title").forEach((title) => {
          if (title.textContent.trim() === "Admin") title.style.display = "none";
      });

      const allowedItems = [
          menuItems.dashboard,
          menuItems.communityboard,
          menuItems.volunteerApplications,
          menuItems.endorsedVolunteers,
          menuItems.rdana,
          menuItems.rdanaMain,
          menuItems.callfordonation,
          menuItems.reliefs,
          menuItems.reliefsRequest,
          menuItems.reports,
          menuItems.reportsSubmission,
      ];
      const restrictedItems = Object.values(menuItems).filter(
          (i) => !allowedItems.includes(i)
      );

      allowedItems.forEach((i) => i && (i.style.display = "block"));
      restrictedItems.forEach((i) => i && (i.style.display = "none"));

      ["rdanaMain", "reliefsRequest", "reportsSubmission"].forEach(
          (parentKey) => {
              if (!menuItems[parentKey] || menuItems[parentKey].style.display === "none") {
                  const parent = menuItems[parentKey.replace(/Main|Request|Submission/, "")];
                  if (parent) parent.style.display = "none";
              }
          }
      );
    } else if (role === "AB ADMIN") {
      Object.values(menuItems).forEach((i) => i && (i.style.display = "block"));
      if (adminPosition !== "Super Admin") {
        ["activitylogs", "adminmanagement"].forEach(
          (k) => menuItems[k] && (menuItems[k].style.display = "none")
        );
      }
    } else {
      Object.values(menuItems).forEach((i) => i && (i.style.display = "none"));
    }
  }

  // init
  restrictPageAccess();
  populateUserDetails();
  highlightActiveMenuItem();

  // keep tooltips and highlights fresh after updates
  window.addEventListener("updateSidebar", () => {
    populateUserDetails();
    ensureMenuTitles();
    highlightActiveMenuItem();
  });

  // belt & suspenders: if any link appears later, make sure it has a tooltip
  document.addEventListener("mouseover", (e) => {
      const a = e.target.closest(".menu a");
      if (a && !a.getAttribute("title")) {
        const label = a.querySelector(".text")?.textContent?.trim();
        if (label) {
          a.setAttribute("title", label);
          a.setAttribute("aria-label", label);
          a.dataset.tooltip = label;
        }
      }
    });
  }

  function handleResponsiveSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const logoutBtn = document.querySelector("#logout-btn");
    if (!sidebar) return;

    const mobileWidth = 768; // define breakpoint for mobile

    function updateSidebar() {
      if (window.innerWidth <= mobileWidth) {
        // auto-collapse for mobile
        sidebar.classList.add("active");
        if (logoutBtn) {
          const logoutText = logoutBtn.querySelector(".text");
          if (logoutText) logoutText.style.display = "none";
        }
        // hide all submenus
        document
          .querySelectorAll(".menu ul li.has-dropdown .sub-menu")
          .forEach((sub) => (sub.style.display = "none"));
      } else {
        // expand for larger screens
        sidebar.classList.remove("active");
        if (logoutBtn) {
          const logoutText = logoutBtn.querySelector(".text");
          if (logoutText) logoutText.style.display = "inline";
        }
      }
    }

    // initial check
    updateSidebar();

    // update on resize
    window.addEventListener("resize", updateSidebar);
  }

  initSidebar();
  handleResponsiveSidebar();
