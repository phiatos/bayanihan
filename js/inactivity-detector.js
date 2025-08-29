let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 1800000 = 30 minutes in milliseconds

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
}

// Function to check for inactivity and prompt the user
function checkInactivity() {
    Swal.fire({
        title: 'Are you still there?',
        text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Stay Login',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false,
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            resetInactivityTimer(); // User chose to continue, reset the timer
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // User chose to log out
            // Make sure 'auth' is accessible in this context,
            // or pass it as an argument if needed.
            auth.signOut().then(() => {
                window.location.href = "../pages/login.html"; // Redirect to login page
            }).catch((error) => {
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

// Attach event listeners to detect user activity
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

// Initial call to start the timer when the script loads
document.addEventListener('DOMContentLoaded', resetInactivityTimer);