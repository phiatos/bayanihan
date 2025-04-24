// $(document).ready(function() {
//   // Handle menu item clicks
//   $(".menu > ul > li").click(function (e) {
//     // Prevent event propagation
//     e.stopPropagation();

//     // Remove 'active' class from siblings
//     $(this).siblings().removeClass("active");
//     // add active to clicked
//     $(this).toggleClass("active");
//     // if has sub menu open it
//     $(this).find("ul").slideToggle();
//     // close other sub menu if any open
//     $(this).siblings().find("ul").slideUp();
//     // remove active class of sub menu items
//     $(this).siblings().find("ul").find("li").removeClass("active");
//   });

//   // Handle sidebar toggle button click
//   $(".menu-btn").click(function () {
//     $(".sidebar").toggleClass("active");
//   });

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
  });

  // Handle sidebar toggle button click
  $(".menu-btn").click(function () {
    $(".sidebar").toggleClass("active");
  });
});

