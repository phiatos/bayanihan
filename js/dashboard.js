// document.addEventListener("DOMContentLoaded", function () {
//     console.log("DOMContentLoaded event fired!"); // Debug log
  
//     // Fetch the sidebar HTML component
//     fetch('../components/sidebar.html')  // Ensure the path is correct
//       .then(response => {
//         console.log("Fetch started"); // Debug fetch start
//         if (!response.ok) {
//           console.error("Failed to fetch sidebar HTML:", response.statusText);
//           return;
//         }
//         return response.text();
//       })
//       .then(data => {
//         console.log("Sidebar HTML loaded"); // Confirm HTML loaded
//         const sidebarContainer = document.getElementById("sidebar-container");
//         if (sidebarContainer) {
//           sidebarContainer.innerHTML = data;
//         } else {
//           console.error('Sidebar container not found!');
//         }
//       })
//       .catch(error => {
//         console.error('Sidebar load failed:', error); // Catch any fetch errors
//       });
//   });

// dashboard.js

// document.addEventListener('DOMContentLoaded', function() {
//   console.log("Dashboard script loaded!");
//   fetch('/api/user/stats') // Replace with your actual API endpoint
//     .then(response => response.json())
//     .then(data => {
//       document.getElementById('login-count').textContent = data.loginCount;
//       document.getElementById('last-active').textContent = data.lastActivity;
//     })
//     .catch(error => {
//       console.error('Error fetching user stats:', error);
//     });

//   // Any other dashboard-specific JavaScript would go here
// });