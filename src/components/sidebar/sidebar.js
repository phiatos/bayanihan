$(document).ready(function () {
  // === Handle menu item clicks ===
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

  // === Handle sidebar collapse/expand ===
  $(".menu-btn").click(function () {
    $(".sidebar").toggleClass("active");
  });

  // === Show logged-in user info from localStorage ===
  const userMobile = localStorage.getItem("userMobile");
  if (userMobile) {
    $(".user-details .name").text(userMobile);
    $(".user-details .title").text("Logged-in User");
  }

  // === Disable all menu items except these ===
  const allowed = ["Help", "Logout", "Profile"];
  $(".menu .text").each(function () {
    const itemText = $(this).text().trim();
    const li = $(this).closest("li");

    if (!allowed.includes(itemText)) {
      li.addClass("disabled");
      li.find("a").on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
      });
    }
  });

  // === Dynamically load Profile page on click ===
  $("#load-profile").on("click", function (e) {
    e.preventDefault();
    $("#main-content").load("../../../public/ProfilePage.html");
  });
});
