// Firebase configuration (keep this, or import from a shared config)
const firebaseConfig = {
    apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    authDomain: "bayanihan-5ce7e.firebaseapp.com",
    databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bayanihan-5ce7e",
    storageBucket: "bayanihan-5ce7e.appspot.com",
    messagingSenderId: "593123849917",
    appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    measurementId: "G-ZTQ9VXXVV0"
};

// Initialize Firebase (using the modular SDK imports as per your global.js)
// Make sure to add these imports at the top of your profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"; // Added signOut for potential use
import { get, getDatabase, ref, update } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

const app = initializeApp(firebaseConfig); // Initialize the app here
const auth = getAuth(app); // Use getAuth from modular SDK
const database = getDatabase(app); // Use getDatabase from modular SDK

// Base path for redirects (should match global.js)
const BASE_PATH = "/Bayanihan-PWA";

document.addEventListener("DOMContentLoaded", () => {
    // Function to update UI with "N/A" if data fetch fails
    const setFieldsToNA = () => {
        console.log("Setting profile fields to N/A due to data fetch failure.");
        document.getElementById('group-title').textContent = 'Group Information Unavailable';
        document.getElementById('group-description').textContent = 'Unable to fetch group details.';
        document.getElementById('profile-org-name').textContent = 'N/A';
        document.getElementById('profile-hq').textContent = 'N/A';
        document.getElementById('profile-contact-person').textContent = 'N/A';
        document.getElementById('profile-email').textContent = 'N/A';
        document.getElementById('profile-mobile').textContent = 'N/A';
        document.getElementById('profile-area').textContent = 'N/A';
    };

    // Function to fetch user data
    // **IMPORTANT**: Modified to use modular SDK's get and ref
    const fetchUserData = async (user) => {
        const userMobile = localStorage.getItem("userMobile");
        console.log("Fetching data for userMobile:", userMobile);

        if (!userMobile) {
            console.error("No userMobile found in localStorage.");
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'No user mobile found. Please log in again.'
            }).then(() => {
                window.location.replace(`${BASE_PATH}/pages/login.html`); // Redirect if no mobile
            });
            return;
        }

        try {
            console.log("Querying users node for mobile:", userMobile);
            const userSnapshot = await get(ref(database, 'users/' + user.uid)); // Direct access by UID is better

            console.log("Users snapshot:", userSnapshot.val());
            if (!userSnapshot.exists()) {
                console.error("No user found with UID:", user.uid);
                Swal.fire({
                    icon: 'error',
                    title: 'User Not Found',
                    text: 'User data not found in the database. Please contact support.'
                });
                setFieldsToNA();
                return;
            }

            let userData = userSnapshot.val();
            console.log("User data retrieved:", userData);

            if (!userData.organization) {
                console.error("No organization found for user:", user.uid);
                Swal.fire({
                    icon: 'error',
                    title: 'Organization Not Found',
                    text: 'Organization data not found for this user. Please contact support.'
                });
                setFieldsToNA();
                return;
            }

            // Fetch volunteer group data by matching organization
            console.log("Querying volunteerGroups node for organization:", userData.organization);
            const groupQuery = ref(database, 'volunteerGroups');
            const groupSnapshot = await get(groupQuery);

            let groupData = null;
            let groupId = null;
            if (groupSnapshot.exists()) {
                groupSnapshot.forEach(childSnapshot => {
                    if (childSnapshot.val().organization === userData.organization) {
                        groupId = childSnapshot.key;
                        groupData = childSnapshot.val();
                        return true; // Stop iterating
                    }
                });
            }

            console.log("Volunteer group snapshot:", groupSnapshot.val());
            if (!groupData) { // Check groupData, not groupSnapshot.exists()
                console.error("No group found for organization:", userData.organization);
                Swal.fire({
                    icon: 'error',
                    title: 'Group Data Not Found',
                    text: 'Volunteer group data not found. Please contact support.'
                });
                setFieldsToNA();
                return;
            }

            console.log("Volunteer group data retrieved:", groupData);

            // Display group information at the top
            document.getElementById('group-title').textContent = `Volunteer Group: ${groupData.organization || 'N/A'}`;
            document.getElementById('group-description').textContent = `You are logged in as part of the ${groupData.organization || 'N/A'} group.`;

            // Display profile data
            document.getElementById('profile-org-name').textContent = groupData.organization || 'N/A';
            document.getElementById('profile-hq').textContent = groupData.hq || 'N/A';
            document.getElementById('profile-contact-person').textContent = groupData.contactPerson || 'N/A';
            document.getElementById('profile-email').textContent = groupData.email || 'N/A';
            document.getElementById('profile-mobile').textContent = groupData.mobileNumber || userMobile || 'N/A';
            document.getElementById('profile-area').textContent = groupData.areaOfOperation || 'N/A';

            // Store group data in localStorage for use in volunteergroupmanagement.html
            localStorage.setItem('loggedInVolunteerGroup', JSON.stringify({
                no: groupId,
                organization: groupData.organization,
                hq: groupData.hq,
                areaOfOperation: groupData.areaOfOperation,
                contactPerson: groupData.contactPerson,
                email: groupData.email,
                mobileNumber: groupData.mobileNumber || userMobile,
                socialMedia: groupData.socialMedia || ''
            }));
        } catch (error) {
            console.error('Error fetching user or group data:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to fetch profile data: ' + error.message
            });
            setFieldsToNA();
        }
    };

    // --- Terms and Conditions Modal Logic ---
    const termsModal = document.getElementById('termsAndConditionsModal');
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    const agreeButton = document.getElementById('agreeButton');
    const navLinks = document.querySelectorAll('.sidebar a, .header a'); // Select all navigation links
    // ** IMPORTANT: Increment this number when you make a material change to your T&C **
    const currentTermsVersion = 1; // Start at 1. If you update terms, change to 2, 3, etc.

    function showTermsModal() {
        if (termsModal) {
            termsModal.classList.remove('hidden'); // Remove 'hidden' class to show
            document.body.classList.add('modal-open'); // Add class to body to blur background/prevent scroll
            agreeButton.disabled = true; // Ensure button is disabled on show
            agreeCheckbox.checked = false; // Ensure checkbox is unchecked on show

            // Disable all navigation links
            navLinks.forEach(link => {
                // Store original href only if it hasn't been stored yet
                if (!link.dataset.originalHref) {
                    link.dataset.originalHref = link.href;
                }
                link.href = '#'; // Make link non-functional
                // Remove existing click listeners to avoid duplicates
                link.removeEventListener('click', preventNavigation);
                link.addEventListener('click', preventNavigation); // Add the new one
            });

            // Prevent browser back button navigation
            history.pushState(null, null, location.href); // Push current state
            window.removeEventListener('popstate', handlePopState); // Remove old listener
            window.addEventListener('popstate', handlePopState); // Add new listener
        }
    }

    function hideTermsModal() {
        if (termsModal) {
            termsModal.classList.add('hidden'); // Add 'hidden' class to hide
            document.body.classList.remove('modal-open'); // Remove class from body

            // Re-enable all navigation links
            navLinks.forEach(link => {
                if (link.dataset.originalHref) {
                    link.href = link.dataset.originalHref; // Restore original href
                }
                link.removeEventListener('click', preventNavigation); // Remove the prevention listener
            });

            // Remove the popstate listener when modal is hidden
            window.removeEventListener('popstate', handlePopState);
        }
    }

    function preventNavigation(e) {
        e.preventDefault();
        Swal.fire({
            icon: 'warning',
            title: 'Terms Required',
            text: 'You must accept the Terms and Conditions to navigate the application.'
        });
        showTermsModal(); // Re-show modal if they try to click something
    }

    function handlePopState(event) {
        history.pushState(null, null, location.href); // Keep them on the current page
        showTermsModal(); // Always show the modal if they try to go back
    }

    // Main authentication state check for profile and terms modal
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User is authenticated:", user.uid);
            await fetchUserData(user); // Fetch profile data

            // Check if user needs to agree to the latest terms
            const userRef = ref(database, 'users/' + user.uid);
            try {
                const snapshot = await get(userRef);
                const userDataFromDb = snapshot.val();
                const userAgreedVersion = userDataFromDb ? (userDataFromDb.terms_agreed_version || 0) : 0;

                // Also check isFirstLogin flag from localStorage if available (from global.js)
                const localStorageUserData = JSON.parse(localStorage.getItem("userData"));
                const isFirstLogin = localStorageUserData ? (localStorageUserData.isFirstLogin === true) : false;
                const termsAcceptedInLocalStorage = localStorageUserData ? (localStorageUserData.termsAccepted === true) : false;


                // CONDITION FOR SHOWING THE MODAL:
                // 1. If terms_agreed_version is less than currentTermsVersion (new/updated terms)
                // 2. OR if it's the very first login and terms haven't been explicitly accepted yet (handles browser back from login)
                // We show the modal if terms_agagreed_version is less, OR if isFirstLogin is true AND termsAcceptedInLocalStorage is false
                if (userAgreedVersion < currentTermsVersion || (isFirstLogin && !termsAcceptedInLocalStorage)) {
                    console.log("Showing terms modal: userAgreedVersion:", userAgreedVersion, "currentTermsVersion:", currentTermsVersion, "isFirstLogin:", isFirstLogin, "termsAcceptedInLocalStorage:", termsAcceptedInLocalStorage);
                    showTermsModal(); // Show the mandatory modal
                } else {
                    console.log("Hiding terms modal: userAgreedVersion:", userAgreedVersion, "currentTermsVersion:", currentTermsVersion, "isFirstLogin:", isFirstLogin, "termsAcceptedInLocalStorage:", termsAcceptedInLocalStorage);
                    hideTermsModal(); // Hide it if they've already agreed
                }
            } catch (error) {
                console.error("Error fetching user terms agreement:", error);
                Swal.fire({
                    icon: 'warning',
                    title: 'Agreement Check Failed',
                    text: 'Could not verify your terms agreement. Please review and agree to proceed.'
                }).then(() => {
                    showTermsModal(); // Fallback: show modal if there's an error checking
                });
            }

        } else {
            console.error("No user is authenticated. Redirecting to login.");
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'Please log in to view your profile.'
            }).then(() => {
                window.location.replace(`${BASE_PATH}/pages/login.html`); // Redirect to login page if not logged in
            });
        }
    });

    // Enable/disable the Agree button based on checkbox state
    agreeCheckbox.addEventListener('change', () => {
        agreeButton.disabled = !agreeCheckbox.checked;
    });

    // Handle 'Agree and Continue' button click
    agreeButton.addEventListener('click', async () => {
        if (agreeCheckbox.checked) {
            const user = auth.currentUser;
            if (user) {
                const userRef = ref(database, 'users/' + user.uid); // Use modular ref
                try {
                    await update(userRef, { // Use modular update
                        terms_agreed_version: currentTermsVersion, // Records the version they agreed to
                        terms_agreed_at: new Date().toISOString(), // Use ISO string for consistent timestamp if ServerValue not available
                        // Also set the new isFirstLogin and termsAccepted flags here!
                        isFirstLogin: false,
                        termsAccepted: true
                    });

                    // Update localStorage as well to keep it in sync
                    const localStorageUserData = JSON.parse(localStorage.getItem("userData"));
                    if (localStorageUserData) {
                        localStorageUserData.isFirstLogin = false;
                        localStorageUserData.termsAccepted = true;
                        localStorage.setItem("userData", JSON.stringify(localStorageUserData));
                    }


                    Swal.fire({
                        icon: 'success',
                        title: 'Agreement Accepted!',
                        text: 'Thank you for accepting the Terms and Conditions.',
                        timer: 2000,
                        showConfirmButton: false
                    });

                    hideTermsModal(); // Hide the modal after successful agreement

                    // Now, redirect them to their intended dashboard based on their role
                    const userRole = localStorage.getItem("userRole"); // Get role from localStorage

                    if (userRole === "admin") {
                        window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
                    } else if (userRole === "volunteer" || userRole === "ABVN") {
                        window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
                    } else {
                        window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
                    }

                } catch (error) {
                    console.error("Error updating terms agreement:", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Oops...',
                        text: 'Failed to record your agreement. Please try again.',
                    });
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Authentication Error',
                    text: 'User not logged in. Please refresh and try again.'
                });
                window.location.replace(`${BASE_PATH}/pages/login.html`);
            }
        }
    });

    // Password change handling (Keep existing logic)
    const form = document.querySelector(".password-change-form"); // Assuming your form has a class or ID
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const userMobile = localStorage.getItem("userMobile");
            if (!userMobile) {
                console.error("No userMobile found for password change.");
                Swal.fire({
                    icon: 'error',
                    title: 'Not Logged In',
                    text: 'Please log in to change your password.'
                });
                return;
            }

            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;

            // Validate new password match
            if (newPassword !== confirmNewPassword) {
                Swal.fire({
                    icon: 'error',
                    title: 'Password Mismatch',
                    text: 'New password and confirmation do not match.'
                });
                return;
            }

            // Validate password length and complexity
            if (newPassword.length < 8) {
                Swal.fire({
                    icon: 'error',
                    title: 'Weak Password',
                    text: 'Password must be at least 8 characters long.'
                });
                return;
            }

            // Password complexity check (at least one uppercase, one number)
            const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Weak Password',
                    text: 'Password must contain at least one uppercase letter and one number.'
                });
                return;
            }

            try {
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('No user is currently signed in.');
                }

                // Re-authenticate user
                const userEmail = `${userMobile}@bayanihan.com`;
                // Use modular firebase.auth.EmailAuthProvider.credential
                const credential = EmailAuthProvider.credential(userEmail, currentPassword);
                await reauthenticateWithCredential(user, credential); // Use modular function

                // Update password
                await updatePassword(user, newPassword); // Use modular function

                // Update the password in localStorage (this isn't standard, usually you don't store plain passwords)
                // Consider if you really need to store password in localStorage
                // localStorage.setItem('userPassword', newPassword);

                Swal.fire({
                    icon: 'success',
                    title: 'Password Changed',
                    text: 'Your password has been updated successfully.'
                });

                // Update the password change timestamp in the database
                // Use modular SDK for database operations
                const userRef = ref(database, `users/${user.uid}`);
                await update(userRef, {
                    lastPasswordChange: new Date().toISOString(),
                    // Consider removing tempPasswordLog for security reasons in production
                    // tempPasswordLog: newPassword
                });
                form.reset();
            } catch (error) {
                console.error('Password change error:', error);
                let errorMessage = error.message;
                if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    errorMessage = 'Current password is incorrect.';
                } else if (error.code === 'auth/requires-recent-login') {
                    errorMessage = 'Please log in again before changing your password.';
                }
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        });
    }
});