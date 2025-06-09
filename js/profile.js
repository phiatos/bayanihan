import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Variables for inactivity detection --------------------------------------------------------------------
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    console.log("Inactivity timer reset.");
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
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // User chose to log out
            auth.signOut().then(() => {
                console.log("User logged out due to inactivity.");
                window.location.href = "../pages/login.html"; // Redirect to login page
            }).catch((error) => {
                console.error("Error logging out:", error);
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

// Attach event listeners to detect user activity
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});
//-------------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const groupTitleElement = document.getElementById('group-title');
    const groupDescriptionElement = document.getElementById('group-description');
    const profilePositionElement = document.getElementById('profile-position');
    const profileOrgNameElement = document.getElementById('profile-org-name');
    const profileHqElement = document.getElementById('profile-hq');
    const profileContactPersonElement = document.getElementById('profile-contact-person');
    const profileEmailElement = document.getElementById('profile-email');
    const profileMobileElement = document.getElementById('profile-mobile');
    const profileAreaElement = document.getElementById('profile-area');

    // Parent containers for organization/HQ/area
    const orgNameFieldContainer = document.getElementById('org-name-field');
    const hqFieldContainer = document.getElementById('hq-field');
    const areaFieldContainer = document.getElementById('area-field');

    // Terms and Conditions Modal elements
    const termsModal = document.getElementById('termsAndConditionsModal');
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    const agreeButton = document.getElementById('agreeButton');
    const navLinks = document.querySelectorAll('.sidebar a, .header a');
    const currentTermsVersion = 1; // Increment this number when terms change

    // Form sections
    const basicInfoSection = document.getElementById('basic-info-section');
    const changePasswordFormContainer = document.querySelector('.form-container-2');

    // Password Strength Indicator elements
    const newPasswordInput = document.getElementById('new-password');
    const strengthMessage = document.getElementById('password-strength-message');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthContainer = document.querySelector('.strength-bar-container');
    const tooltip = document.getElementById('password-tooltip');
    const checkLength = document.getElementById('check-length');
    const checkUppercase = document.getElementById('check-uppercase');
    const checkNumber = document.getElementById('check-number');
    const checkSymbol = document.getElementById('check-symbol');

    let isNavigationBlocked = false;

    const showError = (title, text, redirectToLogin = false) => {
        Swal.fire({
            icon: 'error',
            title: title,
            text: text
        }).then(() => {
            if (redirectToLogin) {
                window.location.replace('../pages/login.html');
            }
        });
    };

    const setFieldsToNA = () => {
        console.log("Setting profile fields to N/A due to data fetch failure or irrelevance.");
        if (groupTitleElement) groupTitleElement.textContent = 'Group Information Unavailable';
        if (groupDescriptionElement) groupDescriptionElement.textContent = 'Unable to fetch group details.';
        if (profileOrgNameElement) profileOrgNameElement.textContent = 'N/A';
        if (profileHqElement) profileHqElement.textContent = 'N/A';
        if (profileContactPersonElement) profileContactPersonElement.textContent = 'N/A';
        if (profileEmailElement) profileEmailElement.textContent = 'N/A';
        if (profileMobileElement) profileMobileElement.textContent = 'N/A';
        if (profileAreaElement) profileAreaElement.textContent = 'N/A';
    };

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

            if (profilePositionElement) profilePositionElement.innerText = userData.role || 'N/A';

            // === ADMIN ROLE HANDLING ===
            if (userData.role === 'AB ADMIN') {
                console.log("User is AB ADMIN. Adjusting display.");

                if (profileContactPersonElement) profileContactPersonElement.innerText = userData.contactPerson || 'N/A';
                if (profileEmailElement) profileEmailElement.innerText = userData.email || 'N/A';
                if (profileMobileElement) profileMobileElement.innerText = userData.mobile || 'N/A';

                // Explicitly handle group-related display for AB ADMIN
                if (groupTitleElement) groupTitleElement.textContent = 'Admin Account';
                if (groupDescriptionElement) groupDescriptionElement.textContent = 'This is an administrative account. Group-specific information is not applicable.';

                // Hide the relevant profile fields containers for admins
                if (orgNameFieldContainer) orgNameFieldContainer.style.display = 'none';
                if (hqFieldContainer) hqFieldContainer.style.display = 'none';
                if (areaFieldContainer) areaFieldContainer.style.display = 'none';

                return; 
            }

            // --- This block runs ONLY for non-admin roles (ABVN, volunteer, etc.) ---
            if (orgNameFieldContainer) orgNameFieldContainer.style.display = 'flex';
            if (hqFieldContainer) hqFieldContainer.style.display = 'flex';
            if (areaFieldContainer) areaFieldContainer.style.display = 'flex';

            // Check if the user has an organization (applicable to ABVN, volunteer, etc.)
            if (!userData.organization) {
                console.error("No organization found for user:", user.uid);
                showError('Organization Not Found', 'Organization data not found for this user. Please contact support.');
                setFieldsToNA(); 
                return;
            }

            // Fetch volunteer group data by matching organization
            console.log("Querying volunteerGroups node for organization:", userData.organization);
            const groupSnapshot = await get(ref(database, 'volunteerGroups'));

            let groupData = null;
            let groupId = null;

            if (groupSnapshot.exists()) {
                groupSnapshot.forEach(childSnapshot => {
                    if (childSnapshot.val().organization === userData.organization) {
                        groupId = childSnapshot.key;
                        groupData = childSnapshot.val();
                        return true; 
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
            if (groupTitleElement) groupTitleElement.textContent = `Volunteer Group: ${groupData.organization || 'N/A'}`;
            if (groupDescriptionElement) groupDescriptionElement.textContent = `You are logged in as part of the ${groupData.organization || 'N/A'} group.`;

            // Display profile data for non-admin users
            if (profileOrgNameElement) profileOrgNameElement.textContent = groupData.organization || 'N/A';
            if (profileHqElement) profileHqElement.textContent = groupData.hq || 'N/A';
            if (profileContactPersonElement) profileContactPersonElement.textContent = groupData.contactPerson || 'N/A';
            if (profileEmailElement) profileEmailElement.textContent = groupData.email || 'N/A';
            if (profileMobileElement) profileMobileElement.textContent = groupData.mobileNumber || userData.mobile || 'N/A';
            if (profileAreaElement) profileAreaElement.textContent = groupData.areaOfOperation || 'N/A';

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

            // When showing terms modal, hide other sections
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

    // Function to apply or remove navigation blocking based on isNavigationBlocked flag
    function applyNavigationBlocking() {
        navLinks.forEach(link => {
            link.removeEventListener('click', preventNavigation);
            if (isNavigationBlocked) {
                if (!link.dataset.originalHref) {
                    link.dataset.originalHref = link.href;
                }
                link.href = '#'; 
                link.addEventListener('click', preventNavigation);
            } else {
                if (link.dataset.originalHref) {
                    link.href = link.dataset.originalHref; 
                }
                //link.removeEventListener('click', preventNavigation);
            }
        });
    }

    function preventNavigation(e) {
        e.preventDefault();
        // Check if the current page is 'profile.html' or 'dashboard.html'
        // const currentPage = window.location.pathname.split('/').pop(); // Currently not used
        
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
        // history.pushState(null, null, location.href);
        if ((termsModal && !termsModal.classList.contains('hidden')) || 
        (changePasswordFormContainer && changePasswordFormContainer.style.display !== 'none')) {
            history.pushState(null, null, location.href); 
            Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Action required!', showConfirmButton: false, timer: 1500 });
        }
    }

    // Main authentication state check for profile and terms modal (Modular SDK)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User is authenticated:", user.uid);
            resetInactivityTimer(); //TSAKA ITO SA AUTH ILALAGAY
            await fetchUserData(user); 

            try {
                const snapshot = await get(ref(database, 'users/' + user.uid));
                const userDataFromDb = snapshot.val();
                const userAgreedVersion = userDataFromDb ? (userDataFromDb.terms_agreed_version || 0) : 0;
                const passwordNeedsReset = userDataFromDb ? (userDataFromDb.password_needs_reset || false) : false;

                const localStorageUserData = JSON.parse(localStorage.getItem("userData"));
                const isFirstLogin = localStorageUserData ? (localStorageUserData.isFirstLogin === true) : false;
                const termsAcceptedInLocalStorage = localStorageUserData ? (localStorageUserData.termsAccepted === true) : false;

                // Determine if terms acceptance is pending
                const termsPending = userAgreedVersion < currentTermsVersion || (isFirstLogin && !termsAcceptedInLocalStorage);

                // Check conditions for showing terms modal or forcing password reset
                if (termsPending) {
                    console.log("Showing terms modal: termsPending=true");
                    showTermsModal();
                } else if (passwordNeedsReset) {
                    console.log("Password change required: passwordNeedsReset=true");
                    hideTermsModal(); 
                    isNavigationBlocked = true;
                    applyNavigationBlocking(); 

                    // Explicitly show/hide sections
                    if (basicInfoSection) basicInfoSection.style.display = 'none'; 
                    if (changePasswordFormContainer) changePasswordFormContainer.style.display = 'block'; 
                    
                    history.pushState(null, null, location.href); 
                    window.removeEventListener('popstate', handlePopState);
                    window.addEventListener('popstate', handlePopState);

                    // Only show this Swal if it's the *first* time this state is encountered on page load
                    const passwordChangePromptShown = sessionStorage.getItem('passwordChangePromptShown');
                    if (!passwordChangePromptShown) {
                        Swal.fire({
                            icon: 'info',
                            title: 'Password Change Required',
                            text: 'For security reasons, please change your password.',
                            allowOutsideClick: false, 
                            allowEscapeKey: false,   
                            showConfirmButton: true, 
                            confirmButtonText: 'okay'
                        });
                        sessionStorage.setItem('passwordChangePromptShown', 'true'); 
                    }

                } else {
                    console.log("No action required: full profile visible");
                    hideTermsModal(); 
                    isNavigationBlocked = false;
                    applyNavigationBlocking();
                    sessionStorage.removeItem('passwordChangePromptShown');

                }
            } catch (error) {
                console.error("Error fetching user terms agreement or password reset status:", error);
                Swal.fire({
                    icon: 'warning',
                    title: 'Agreement/Password Check Failed',
                    text: 'Could not verify your account status. Please review and agree to terms or change password if prompted.'
                }).then(() => {
                    showTermsModal();
                });
            }
        } else {
            console.error("No user is authenticated. Redirecting to login.");
            showError('Not Logged In', 'Please log in to view your profile.', true);
        }
    });

    // Enable/disable the Agree button based on checkbox state
    if (agreeCheckbox) { 
        agreeCheckbox.addEventListener('change', () => {
            if (agreeButton) {
                agreeButton.disabled = !agreeCheckbox.checked;
            }
        });
    }

    // Handle 'Agree and Continue' button click (Modular SDK)
    if (agreeButton) { 
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
                            isFirstLogin: false, 
                            termsAccepted: true 
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

                        // Always hide the terms modal once agreed
                        hideTermsModal();

                        if (passwordNeedsResetAfterTerms) {
                            await Swal.fire({
                                 icon: 'success',
                                title: 'Agreement Accepted',
                                text: 'Thank you for accepting the Terms and Conditions. For your security, please change your temporary password now.',
                                allowOutsideClick: false,
                                allowEscapeKey: false,
                                confirmButtonText: 'Change Password',
                                width: '460px',
                                padding: '1.75em',
                                background: '#f9f9f9',
                                color: '#2c3e50',
                                confirmButtonColor: '#007BFF', // Bootstrap primary blue
                                buttonsStyling: true,
                                customClass: {
                                    popup: 'rounded-xl shadow-lg',
                                    title: 'text-lg font-semibold',
                                    confirmButton: 'px-4 py-2'
                                }
                            });
                            if (basicInfoSection) basicInfoSection.style.display = 'none';
                            if (changePasswordFormContainer) changePasswordFormContainer.style.display = 'block';
                            // window.location.replace('../pages/profile.html');

                            isNavigationBlocked = true;
                            applyNavigationBlocking();
                        } else {
                            await Swal.fire({
                                icon: 'success',
                                title: 'Agreement Accepted!',
                                text: 'Thank you for accepting the Terms and Conditions.',
                                timer: 2000,
                                showConfirmButton: false,
                                timerProgressBar: true,
                                background: '#fff',
                                color: '#333',
                                padding: '1.5em',
                                width: '360px',
                            });

                            const userRole = localStorage.getItem("userRole");
                            let redirectPath = '../pages/dashboard.html'; 

                            if (wasFirstLoginBeforeAgreement) {
                                if (userRole === "ABVN" || userRole === "volunteer") {
                                    redirectPath = '../pages/profile.html';
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
    }

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

            // Same Password Check
            if (newPassword === currentPassword) {
                Swal.fire({
                    icon: 'error',
                    title: 'Same Password',
                    text: 'Your new password cannot be the same as your current password.'
                });
                return; // Stop the function here
            }

            // Validate password length and complexity
            const hasLength = newPassword.length >= 8;
            const hasUppercase = /[A-Z]/.test(newPassword);
            const hasNumber = /[0-9]/.test(newPassword);
            const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

            if (!hasLength || !hasUppercase || !hasNumber || !hasSymbol) {
                Swal.fire({
                    icon: 'error',
                    title: 'Weak Password',
                    text: 'Your new password must have at least 8 characters, including one uppercase letter, one number, and one symbol.',
                    confirmButtonText: 'Got it',
                    background: '#fff',
                    color: '#333',
                    padding: '1.5em',
                    width: '360px',
                    showClass: {
                        popup: 'swal2-show animate__animated animate__fadeInDown',
                    },
                    hideClass: {
                        popup: 'animate__animated animate__fadeOutUp',
                    },
                    didOpen: () => {
                        const btn = Swal.getConfirmButton();
                        btn.style.transition = 'transform 0.3s ease';
                        btn.addEventListener('mouseenter', () => {
                        btn.style.transform = 'scale(1.1)';
                        });
                        btn.addEventListener('mouseleave', () => {
                        btn.style.transform = 'scale(1)';
                        });
                    }  
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
                    showConfirmButton: false,
                    timerProgressBar: true,
                    background: '#fff',
                    color: '#333',
                    width: '360px',
                    padding: '1.5em',
                    didOpen: () => {
                        Swal.showLoading();
                    }
                }).then(() => {
                    form.reset();
                    sessionStorage.removeItem('passwordChangePromptShown'); 
                    window.location.replace('../pages/login.html');
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
    if (newPasswordInput && strengthMessage && strengthBar && strengthContainer && tooltip && checkLength && checkUppercase && checkNumber && checkSymbol) {
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
    } else {
        console.warn("Password strength indicator elements not found. Skipping password strength logic.");
    }
});