$(document).ready(function () {
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

  const userMobile = localStorage.getItem("userMobile");
  const userRole = localStorage.getItem("userRole");

  if (userMobile) {
    $(".user-details .name").text(userMobile);
    $(".user-details .title").text("Logged-in User");
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
  }

  $("#load-profile").on("click", function (e) {
    e.preventDefault();
    $("#main-content").load("../../../public/ProfilePage.html");
  });

  // === Logout functionality ===
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
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        // Clear localStorage
        localStorage.removeItem("userMobile");
        localStorage.removeItem("userRole");

        // Success notification
        Swal.fire({
          title: "Logged out!",
          text: "You have been successfully logged out.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });

        // Redirect to login after short delay
        setTimeout(() => {
          window.location.href = "/src/pages/login/Login&Registration.html";
        }, 1600);
      }
    });
  });
});
