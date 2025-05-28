// Firebase imports (Modular SDK syntax)
// import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

import { initializeApp } from 'firebase/app'; 
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, get, update } from 'firebase/database';

// Firebase configuration (keep as is)
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

// Initialize Firebase (Modular SDK)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Base path for redirects (keep as is)
const BASE_PATH = "/bayanihan";

document.addEventListener("DOMContentLoaded", () => {
    // Helper function for consistent error display
    const showError = (title, text, redirectToLogin = false) => {
        Swal.fire({
            icon: 'error',
            title: title,
            text: text
        }).then(() => {
            if (redirectToLogin) {
                window.location.replace(`${BASE_PATH}/pages/login.html`);
            }
        });
    };

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

    // Function to fetch user data and display profile information
    const fetchUserData = async (user) => {
        const userEmail = localStorage.getItem("userEmail");
        console.log("Fetching data for user email:", userEmail);

        if (!userEmail) {
            console.error("No userEmail found in localStorage.");
            showError('Not Logged In', 'No user email found. Please log in again.', true);
            return;
        }

        try {
            const userSnapshot = await get(ref(database, 'users/' + user.uid));
            console.log("Users snapshot:", userSnapshot.val());

            if (!userSnapshot.exists()) {
                console.error("No user found with UID:", user.uid);
                showError('User Not Found', 'User data not found in the database. Please contact support.');
                setFieldsToNA();
                return;
            }

            let userData = userSnapshot.val();
            console.log("User data retrieved:", userData);

            // --- Always display the user's role/position first ---
            document.getElementById('profile-position').innerText = userData.role || 'N/A';

            // === ADMIN ROLE HANDLING ===
            if (userData.role === 'AB ADMIN') {
                const name = userData.contactPerson;
                const email = userData.email;
                const mobile = userData.mobile;

                document.getElementById('profile-contact-person').innerText = name || 'N/A';
                document.getElementById('profile-email').innerText = email || 'N/A';
                document.getElementById('profile-mobile').innerText = mobile || 'N/A';
            }

            // Check if the user has an organization (applicable to ABVN, volunteer, etc.)
            // This block will now execute for non-admin users.
            if (!userData.organization && userData.role !== 'AB ADMIN') { // Added condition to exclude AB ADMIN
                console.error("No organization found for user:", user.uid);
                showError('Organization Not Found', 'Organization data not found for this user. Please contact support.');
                setFieldsToNA();
                return;
            }

            // If it's an AB ADMIN, we might not have 'organization' or 'groupData'
            // so we should only proceed to fetch group data if it's not an admin.
            if (userData.role === 'AB ADMIN') {
                // For admins, we've already displayed their info.
                // We can set group-related fields to N/A or hide them if they don't apply.
                document.getElementById('group-title').textContent = 'Admin Account';
                document.getElementById('group-description').textContent = 'This is an administrative account.';
                document.getElementById('profile-org-name').textContent = 'N/A (Admin)';
                document.getElementById('profile-hq').textContent = 'N/A (Admin)';
                document.getElementById('profile-area').textContent = 'N/A (Admin)';
                // Ensure the contact person, email, mobile are already set from userData for admin
                return; // Exit after setting admin specific fields and N/A for group related fields.
            }


            // Fetch volunteer group data by matching organization (only for non-admin roles)
            console.log("Querying volunteerGroups node for organization:", userData.organization);
            const groupSnapshot = await get(ref(database, 'volunteerGroups'));

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
            if (!groupData) {
                console.error("No group found for organization:", userData.organization);
                showError('Group Data Not Found', 'Volunteer group data not found. Please contact support.');
                setFieldsToNA();
                return;
            }

            console.log("Volunteer group data retrieved:", groupData);

            // Display group information at the top
            document.getElementById('group-title').textContent = `Volunteer Group: ${groupData.organization || 'N/A'}`;
            document.getElementById('group-description').textContent = `You are logged in as part of the ${groupData.organization || 'N/A'} group.`;

            // Display profile data for non-admin users
            document.getElementById('profile-org-name').textContent = groupData.organization || 'N/A';
            document.getElementById('profile-hq').textContent = groupData.hq || 'N/A';
            document.getElementById('profile-contact-person').textContent = groupData.contactPerson || 'N/A';
            document.getElementById('profile-email').textContent = groupData.email || 'N/A';
            document.getElementById('profile-mobile').textContent = groupData.mobileNumber || userData.mobile || 'N/A';
            document.getElementById('profile-area').textContent = groupData.areaOfOperation || 'N/A';

            // Store group data in localStorage for use in volunteergroupmanagement.html
            localStorage.setItem('loggedInVolunteerGroup', JSON.stringify({
                no: groupId,
                organization: groupData.organization,
                hq: groupData.hq,
                areaOfOperation: groupData.areaOfOperation,
                contactPerson: groupData.contactPerson,
                email: groupData.email,
                mobileNumber: groupData.mobileNumber || userData.mobile,
                socialMedia: groupData.socialMedia || ''
            }));

        } catch (error) {
            console.error('Error fetching user or group data:', error);
            showError('Error', 'Failed to fetch data: ' + error.message);
            setFieldsToNA();
        }
    };

    // --- Terms and Conditions Modal Logic ---
    const termsModal = document.getElementById('termsAndConditionsModal');
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    const agreeButton = document.getElementById('agreeButton');
    const navLinks = document.querySelectorAll('.sidebar a, .header a');
    const currentTermsVersion = 1; // Increment this number when terms change

    // Get the basic info and change password sections
    const basicInfoSection = document.getElementById('basic-info-section');
    const changePasswordFormContainer = document.querySelector('.form-container-2');

    let isNavigationBlocked = false; // Flag to indicate if navigation is currently blocked

    function showTermsModal() {
        if (termsModal) {
            termsModal.classList.remove('hidden');
            document.body.classList.add('modal-open');
            agreeButton.disabled = true;
            agreeCheckbox.checked = false;

            // Set navigation blocked state
            isNavigationBlocked = true;
            applyNavigationBlocking();

            // Prevent going back in history to bypass the modal
            history.pushState(null, null, location.href);
            window.removeEventListener('popstate', handlePopState);
            window.addEventListener('popstate', handlePopState);

            // MODIFIED: When showing terms modal, hide other sections
            if (basicInfoSection) basicInfoSection.style.display = 'none';
            if (changePasswordFormContainer) changePasswordFormContainer.style.display = 'none';
        }
    }

    function hideTermsModal() {
        if (termsModal) {
            termsModal.classList.add('hidden');
            document.body.classList.remove('modal-open');

            // Reset navigation blocked state and apply (to potentially unblock)
            isNavigationBlocked = false;
            applyNavigationBlocking();

            window.removeEventListener('popstate', handlePopState);
        }
    }

    // NEW: Function to apply or remove navigation blocking based on isNavigationBlocked flag
    function applyNavigationBlocking() {
        navLinks.forEach(link => {
            if (isNavigationBlocked) {
                if (!link.dataset.originalHref) {
                    link.dataset.originalHref = link.href;
                }
                link.href = '#'; // Temporarily disable navigation
                link.removeEventListener('click', preventNavigation);
                link.addEventListener('click', preventNavigation);
            } else {
                if (link.dataset.originalHref) {
                    link.href = link.dataset.originalHref; // Restore original href
                }
                link.removeEventListener('click', preventNavigation);
            }
        });
    }

    function preventNavigation(e) {
        e.preventDefault();
        // Check if the current page is 'profile.html' or 'dashboard.html'
        const currentPage = window.location.pathname.split('/').pop();
        
        let message = 'You must complete the required actions to navigate the application.';

        // Customize message based on current blocking state
        if (isNavigationBlocked) {
            Swal.fire({
                icon: 'warning',
                title: 'Action Required',
                text: message
            });
        }
    }

    function handlePopState(event) {
        history.pushState(null, null, location.href); 
        onAuthStateChanged(auth, async (user) => { /* This will trigger the main logic to display correct UI */ });
    }

    // Main authentication state check for profile and terms modal (Modular SDK)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User is authenticated:", user.uid);
            await fetchUserData(user); 

            try {
                const snapshot = await get(ref(database, 'users/' + user.uid));
                const userDataFromDb = snapshot.val();
                const userAgreedVersion = userDataFromDb ? (userDataFromDb.terms_agreed_version || 0) : 0;
                // Get the password_needs_reset flag from the database
                const passwordNeedsReset = userDataFromDb ? (userDataFromDb.password_needs_reset || false) : false;

                const localStorageUserData = JSON.parse(localStorage.getItem("userData"));
                const isFirstLogin = localStorageUserData ? (localStorageUserData.isFirstLogin === true) : false;
                const termsAcceptedInLocalStorage = localStorageUserData ? (localStorageUserData.termsAccepted === true) : false;

                // ADDED: Determine if terms acceptance is pending
                const termsPending = userAgreedVersion < currentTermsVersion || (isFirstLogin && !termsAcceptedInLocalStorage);

                // MODIFIED: Check conditions for showing terms modal or forcing password reset
                if (termsPending) { // Changed condition to use termsPending
                    console.log("Showing terms modal: termsPending=true");
                    showTermsModal();
                    // Navigation is blocked inside showTermsModal
                } else if (passwordNeedsReset) {
                    // Terms accepted, but password reset is still required
                    console.log("Password change required: passwordNeedsReset=true");
                    hideTermsModal(); // Ensure modal is hidden if already accepted terms

                    // Set navigation blocked state for password reset
                    isNavigationBlocked = true;
                    applyNavigationBlocking(); // Apply blocking for password reset

                    // MODIFIED: Explicitly show/hide sections
                    if (basicInfoSection) basicInfoSection.style.display = 'none'; // Hide basic info
                    if (changePasswordFormContainer) changePasswordFormContainer.style.display = 'block'; // Show password form

                    // ADDED: Only show this Swal if it's the *first* time this state is encountered on page load
                    const passwordChangePromptShown = sessionStorage.getItem('passwordChangePromptShown');
                    if (!passwordChangePromptShown) {
                        Swal.fire({
                            icon: 'info',
                            title: 'Password Change Required',
                            text: 'For security reasons, please change your password.',
                            allowOutsideClick: false, // Prevent closing
                            allowEscapeKey: false,   // Prevent closing
                            showConfirmButton: true, // Allow user to acknowledge
                            confirmButtonText: 'Understood'
                        });
                        sessionStorage.setItem('passwordChangePromptShown', 'true'); // ADDED: Set flag
                    }

                } else {
                    // All conditions met: terms accepted and password does not need reset
                    console.log("No action required: full profile visible");
                    // MODIFIED: Logging updated to reflect the new state handling
                    hideTermsModal(); // Ensure terms modal is hidden
                    // Ensure navigation is unblocked
                    isNavigationBlocked = false;
                    applyNavigationBlocking();

                    // MODIFIED: Ensure full profile is visible
                    if (basicInfoSection) basicInfoSection.style.display = 'block';
                    if (changePasswordFormContainer) changePasswordFormContainer.style.display = 'block';
                    // ADDED: Clear the session storage flag if no action is needed
                    sessionStorage.removeItem('passwordChangePromptShown');
                }
            } catch (error) {
                console.error("Error fetching user terms agreement or password reset status:", error);
                Swal.fire({
                    icon: 'warning',
                    title: 'Agreement/Password Check Failed',
                    text: 'Could not verify your account status. Please review and agree to terms or change password if prompted.'
                }).then(() => {
                    // Fallback to showing terms if there's an error, as a safe default
                    showTermsModal();
                });
            }
        } else {
            console.error("No user is authenticated. Redirecting to login.");
            showError('Not Logged In', 'Please log in to view your profile.', true);
        }

        
    });

    // Enable/disable the Agree button based on checkbox state
    agreeCheckbox.addEventListener('change', () => {
        agreeButton.disabled = !agreeCheckbox.checked;
    });

    // Handle 'Agree and Continue' button click (Modular SDK)
    agreeButton.addEventListener('click', async () => {
        if (agreeCheckbox.checked) {
            const user = auth.currentUser;
            if (user) {
                try {
                    const currentLocalStorageUserData = JSON.parse(localStorage.getItem("userData"));
                    const wasFirstLoginBeforeAgreement = currentLocalStorageUserData ? (currentLocalStorageUserData.isFirstLogin === true) : false;

                    // 1. Update terms agreed version and mark as not first login
                    await update(ref(database, 'users/' + user.uid), {
                        terms_agreed_version: currentTermsVersion,
                        terms_agreed_at: new Date().toISOString(),
                        isFirstLogin: false, // Mark as not first login after agreement
                        termsAccepted: true // Explicitly mark terms as accepted
                    });

                    // Update localStorage userData to reflect the change
                    if (currentLocalStorageUserData) {
                        currentLocalStorageUserData.isFirstLogin = false;
                        currentLocalStorageUserData.termsAccepted = true;
                        localStorage.setItem("userData", JSON.stringify(currentLocalStorageUserData));
                    }

                    // 2. Re-fetch user data to get the latest password_needs_reset status
                    const snapshotAfterAgreement = await get(ref(database, 'users/' + user.uid));
                    const userDataAfterAgreement = snapshotAfterAgreement.val();
                    const passwordNeedsResetAfterTerms = userDataAfterAgreement ? (userDataAfterAgreement.password_needs_reset || false) : false;

                    // MODIFIED: Always hide the terms modal once agreed
                    hideTermsModal();

                    if (passwordNeedsResetAfterTerms) {
                        await Swal.fire({
                            icon: 'success', 
                            title: 'Agreement Accepted & Password Change Required!', 
                            text: 'Thank you for accepting the Terms and Conditions. For security reasons, please proceed to change your temporary password now.', 
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            showConfirmButton: true,
                            confirmButtonText: 'Continue to Password Change'
                        });
                        if (basicInfoSection) basicInfoSection.style.display = 'none';
                        if (changePasswordFormContainer) changePasswordFormContainer.style.display = 'block';
                        window.location.replace(`${BASE_PATH}/pages/profile.html`); 
                    } else {
                        await Swal.fire({
                            icon: 'success',
                            title: 'Agreement Accepted!',
                            text: 'Thank you for accepting the Terms and Conditions.',
                            timer: 2000,
                            showConfirmButton: false
                        });

                        const userRole = localStorage.getItem("userRole");
                        let redirectPath = `${BASE_PATH}/pages/dashboard.html`; // Default redirect

                        if (wasFirstLoginBeforeAgreement) {
                            if (userRole === "ABVN" || userRole === "volunteer") {
                                redirectPath = `${BASE_PATH}/pages/profile.html`;
                            }
                        }
                        window.location.replace(redirectPath);
                    }

                } catch (error) {
                    console.error("Error updating terms agreement:", error);
                    showError('Oops...', 'Failed to record your agreement. Please try again.');
                }
            } else {
                showError('Authentication Error', 'User not logged in. Please refresh and try again.', true);
            }
        }
    });


    // --- Password Toggle Functionality ---
    const setupPasswordToggle = (passwordInputId) => {
        const passwordInput = document.getElementById(passwordInputId);
        const parentDiv = passwordInput ? passwordInput.parentElement : null;
        const lockIcon = parentDiv ? parentDiv.querySelector('.password-toggle-closed') : null;
        const openLockIcon = parentDiv ? parentDiv.querySelector('.password-toggle-open') : null;

        if (lockIcon && openLockIcon && passwordInput && parentDiv) {
            openLockIcon.style.display = 'none';
            lockIcon.style.display = 'inline'; 

            lockIcon.addEventListener('click', () => {
                passwordInput.type = 'text';
                parentDiv.classList.add('show-open-lock'); 
            });

            openLockIcon.addEventListener('click', () => {
                passwordInput.type = 'password';
                parentDiv.classList.remove('show-open-lock'); 
            });
        } else {
            console.warn(`Password toggle icons or input not found for ${passwordInputId}`);
        }
    };

    // Apply password toggle to all password fields
    setupPasswordToggle('current-password');
    setupPasswordToggle('new-password');
    setupPasswordToggle('confirm-new-password');

    // Password change handling (Modular SDK)
    const form = document.querySelector("form"); 
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                console.error("No user is signed in.");
                showError('Not Logged In', 'Please log in to change your password.', true);
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

            // Validate password length and complexity (using the same logic as strength indicator for consistency)
            const hasLength = newPassword.length >= 8;
            const hasUppercase = /[A-Z]/.test(newPassword);
            const hasNumber = /[0-9]/.test(newPassword);
            const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

            if (!hasLength || !hasUppercase || !hasNumber || !hasSymbol) {
                Swal.fire({
                    icon: 'error',
                    title: 'Weak Password',
                    text: 'Your new password does not meet the complexity requirements. Please ensure it has at least 8 characters, one uppercase letter, one number, and one symbol.'
                });
                return;
            }

            const userEmail = user.email;
            if (!userEmail) {
                showError('Error', 'No email associated with this user for re-authentication.');
                return;
            }

            try {
                
                const credential = EmailAuthProvider.credential(userEmail, currentPassword);
                await reauthenticateWithCredential(user, credential);

                await updatePassword(user, newPassword);

                await update(ref(database, `users/${user.uid}`), {
                    lastPasswordChange: new Date().toISOString(),
                    password_needs_reset: false 
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Password Changed',
                    text: 'Your password has been updated successfully. You can now access your full profile.',
                    timer: 3000,
                    showConfirmButton: false
                }).then(() => {
                    form.reset();
                    sessionStorage.removeItem('passwordChangePromptShown');
                    window.location.replace(`${BASE_PATH}/pages/profile.html`);
                });

            } catch (error) {
                console.error('Password change error:', error);
                let errorMessage = 'Failed to change password. Please ensure your current password is correct.';
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                    errorMessage = 'Incorrect current password or authentication issue.';
                } else if (error.code === 'auth/requires-recent-login') {
                    errorMessage = 'For security, please log in again before changing your password.';
                }
                showError('Error', errorMessage);
            }
        });
    }

    // Password Strength Logic
    const newPasswordInput = document.getElementById('new-password');
    const strengthMessage = document.getElementById('password-strength-message');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthContainer = document.querySelector('.strength-bar-container');
    const tooltip = document.getElementById('password-tooltip');

    const checkLength = document.getElementById('check-length');
    const checkUppercase = document.getElementById('check-uppercase');
    const checkNumber = document.getElementById('check-number');
    const checkSymbol = document.getElementById('check-symbol');

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            const password = this.value.trim();

            if (password.length === 0) {
                tooltip.classList.remove('show');
                strengthMessage.classList.remove('show');
                strengthContainer.classList.remove('show');
                return;
            }

            tooltip.classList.add('show');
            strengthMessage.classList.add('show');
            strengthContainer.classList.add('show');

            // Check criteria
            const hasLength = password.length >= 8;
            const hasUppercase = /[A-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const hasSymbol = /[^A-Za-z0-9]/.test(password); 

            checkLength.textContent = (hasLength ? '✅' : '❌') + ' At least 8 characters';
            checkUppercase.textContent = (hasUppercase ? '✅' : '❌') + ' An uppercase letter';
            checkNumber.textContent = (hasNumber ? '✅' : '❌') + ' A number';
            checkSymbol.textContent = (hasSymbol ? '✅' : '❌') + ' A symbol (!@#$ etc.)';

            // Strength logic
            let strength = '';
            let strengthClass = '';
            let barWidth = '0%';
            let barColor = 'red'; 

            const passedChecks = [hasLength, hasUppercase, hasNumber, hasSymbol].filter(Boolean).length;

            if (passedChecks <= 1) {
                strength = 'Weak';
                strengthClass = 'strength-weak';
                barWidth = '25%'; 
                barColor = 'red';
            } else if (passedChecks === 2) {
                strength = 'Medium';
                strengthClass = 'strength-medium';
                barWidth = '50%';
                barColor = 'orange';
            } else if (passedChecks === 3) {
                strength = 'Good';
                strengthClass = 'strength-good';
                barWidth = '75%';
                barColor = 'yellowgreen'; 
            } else if (passedChecks === 4) {
                strength = 'Strong';
                strengthClass = 'strength-strong';
                barWidth = '100%';
                barColor = 'green';
            }

            strengthMessage.textContent = 'Strength: ' + strength;
            strengthMessage.className = 'strength-message ' + strengthClass; 

            strengthBar.style.width = barWidth;
            strengthBar.style.backgroundColor = barColor;
        });
    }
});