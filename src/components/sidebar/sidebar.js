$(document).ready(function () {
  // Function to update sidebar based on login state
  function updateSidebar() {
    const userMobile = localStorage.getItem("userMobile");
    const userRole = localStorage.getItem("userRole");

    if (userMobile) {
      $(".user-details .name").text(userMobile);
      $(".user-details .title").text("Logged-in User");
    } else {
      $(".user-details .name").text("Guest");
      $(".user-details .title").text("Please log in");
    }

    // Disable menu for ABVN users
    if (userRole === "ABVN") {
      const allowed = ["Help", "Logout", "Profile", "User"];
      $(".menu .text").each(function () {
        const itemText = $(this).text().trim();
        const li = $(this).closest("li");
        if (!allowed.includes(itemText)) {
          li.addClass("disabled");
        }
      });
    } else {
      // Re-enable menu items if userRole is not ABVN
      $(".menu .text").closest("li").removeClass("disabled");
    }
  }

  // Run on initial load
  updateSidebar();

  // Menu toggling logic
  $(".menu > ul > li").click(function (e) {
    e.stopPropagation();
    $(this).siblings().removeClass("active");
    $(this).toggleClass("active");

    const subMenu = $(this).find("ul");
    if (subMenu.length > 0) {
      subMenu.stop(true, true).slideToggle();
    }

    $(this).siblings().find("ul").stop(true, true).slideUp();
    $(this).siblings().find("ul li").removeClass("active");
  });

  $(".menu-btn").click(function () {
    $(".sidebar").toggleClass("active");
  });

  // Load profile page
  $("#load-profile").on("click", function (e) {
    e.preventDefault();
    $("#main-content").load("../../../public/ProfilePage.html");
  });

  // Logout functionality
  $("#logout-btn").on("click", function (e) {
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
          // Updated absolute path
          const absolutePath = "/Bayanihan-PWA/src/pages/login/Login&RegistrationForm.html";
          console.log("Attempting redirect to absolute path after logout:", absolutePath);
          window.location.replace(absolutePath); // Force full page reload
        }, 1600);

        // Update sidebar after logout
        updateSidebar();
      }
    });
  });

  // Listen for a custom event to update the sidebar after login
  $(window).on("updateSidebar", function () {
    updateSidebar();
  });
});