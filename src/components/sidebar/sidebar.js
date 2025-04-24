$(document).ready(function() {
  // Handle menu item clicks
  $(".menu > ul > li").click(function (e) {
    // Prevent event propagation
    e.stopPropagation();

    // Remove 'active' class from siblings
    $(this).siblings().removeClass("active");
    // Toggle 'active' class on clicked item
    $(this).toggleClass("active");
    // Toggle the sub-menu (if it exists) visibility
    var subMenu = $(this).find("ul");
    if (subMenu.length > 0) {
      subMenu.stop(true, true).slideToggle();
    }
    // Close other sub-menus
    $(this).siblings().find("ul").stop(true, true).slideUp();
    // Remove active class from any sub-menu items
    $(this).siblings().find("ul li").removeClass("active");
    // Handle sidebar toggle button click
  });
  
  $(".menu-btn").click(function () {
    $(".sidebar").toggleClass("active");
  });
});