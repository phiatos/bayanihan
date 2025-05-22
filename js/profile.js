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

// Initialize Firebase (using compat syntax)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Base path for redirects
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
    const fetchUserData = (user) => {
        const userMobile = localStorage.getItem("userMobile");
        console.log("Fetching data for userMobile:", userMobile);

        if (!userMobile) {
            console.error("No userMobile found in localStorage.");
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'No user mobile found. Please log in again.'
            }).then(() => {
                window.location.replace(`${BASE_PATH}/pages/login.html`);
            });
            return;
        }

        // Fetch user data by UID
        database.ref('users/' + user.uid).once('value')
            .then(userSnapshot => {
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
                database.ref('volunteerGroups').once('value')
                    .then(groupSnapshot => {
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
                    })
                    .catch(error => {
                        console.error('Error fetching volunteer group data:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to fetch volunteer group data: ' + error.message
                        });
                        setFieldsToNA();
                    });
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to fetch user data: ' + error.message
                });
                setFieldsToNA();
            });
    };

    // --- Terms and Conditions Modal Logic ---
    const termsModal = document.getElementById('termsAndConditionsModal');
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    const agreeButton = document.getElementById('agreeButton');
    const navLinks = document.querySelectorAll('.sidebar a, .header a');
    const currentTermsVersion = 1;

    function showTermsModal() {
        if (termsModal) {
            termsModal.classList.remove('hidden');
            document.body.classList.add('modal-open');
            agreeButton.disabled = true;
            agreeCheckbox.checked = false;

            navLinks.forEach(link => {
                if (!link.dataset.originalHref) {
                    link.dataset.originalHref = link.href;
                }
                link.href = '#';
                link.removeEventListener('click', preventNavigation);
                link.addEventListener('click', preventNavigation);
            });

            history.pushState(null, null, location.href);
            window.removeEventListener('popstate', handlePopState);
            window.addEventListener('popstate', handlePopState);
        }
    }

    function hideTermsModal() {
        if (termsModal) {
            termsModal.classList.add('hidden');
            document.body.classList.remove('modal-open');

            navLinks.forEach(link => {
                if (link.dataset.originalHref) {
                    link.href = link.dataset.originalHref;
                }
                link.removeEventListener('click', preventNavigation);
            });

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
        showTermsModal();
    }

    function handlePopState(event) {
        history.pushState(null, null, location.href);
        showTermsModal();
    }

    // Main authentication state check for profile and terms modal
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("User is authenticated:", user.uid);
            fetchUserData(user);

            database.ref('users/' + user.uid).once('value')
                .then(snapshot => {
                    const userDataFromDb = snapshot.val();
                    const userAgreedVersion = userDataFromDb ? (userDataFromDb.terms_agreed_version || 0) : 0;

                    const localStorageUserData = JSON.parse(localStorage.getItem("userData"));
                    const isFirstLogin = localStorageUserData ? (localStorageUserData.isFirstLogin === true) : false;
                    const termsAcceptedInLocalStorage = localStorageUserData ? (localStorageUserData.termsAccepted === true) : false;

                    if (userAgreedVersion < currentTermsVersion || (isFirstLogin && !termsAcceptedInLocalStorage)) {
                        console.log("Showing terms modal: userAgreedVersion:", userAgreedVersion, "currentTermsVersion:", currentTermsVersion, "isFirstLogin:", isFirstLogin, "termsAcceptedInLocalStorage:", termsAcceptedInLocalStorage);
                        showTermsModal();
                    } else {
                        console.log("Hiding terms modal: userAgreedVersion:", userAgreedVersion, "currentTermsVersion:", currentTermsVersion, "isFirstLogin:", isFirstLogin, "termsAcceptedInLocalStorage:", termsAcceptedInLocalStorage);
                        hideTermsModal();
                    }
                })
                .catch(error => {
                    console.error("Error fetching user terms agreement:", error);
                    Swal.fire({
                        icon: 'warning',
                        title: 'Agreement Check Failed',
                        text: 'Could not verify your terms agreement. Please review and agree to proceed.'
                    }).then(() => {
                        showTermsModal();
                    });
                });
        } else {
            console.error("No user is authenticated. Redirecting to login.");
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'Please log in to view your profile.'
            }).then(() => {
                window.location.replace(`${BASE_PATH}/pages/login.html`);
            });
        }
    });

    // Enable/disable the Agree button based on checkbox state
    agreeCheckbox.addEventListener('change', () => {
        agreeButton.disabled = !agreeCheckbox.checked;
    });

    // Handle 'Agree and Continue' button click
    agreeButton.addEventListener('click', () => {
        if (agreeCheckbox.checked) {
            const user = auth.currentUser;
            if (user) {
                database.ref('users/' + user.uid).update({
                    terms_agreed_version: currentTermsVersion,
                    terms_agreed_at: new Date().toISOString(),
                    isFirstLogin: false,
                    termsAccepted: true
                })
                    .then(() => {
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

                        hideTermsModal();

                        const userRole = localStorage.getItem("userRole");
                        if (userRole === "admin") {
                            window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
                        } else if (userRole === "volunteer" || userRole === "ABVN") {
                            window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
                        } else {
                            window.location.replace(`${BASE_PATH}/pages/dashboard.html`);
                        }
                    })
                    .catch(error => {
                        console.error("Error updating terms agreement:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Oops...',
                            text: 'Failed to record your agreement. Please try again.',
                        });
                    });
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

    // Password change handling
    const form = document.querySelector("form"); // Updated selector to match HTML
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                console.error("No user is signed in.");
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

            const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Weak Password',
                    text: 'Password must contain at least one uppercase letter and one number.'
                });
                return;
            }

            const userEmail = user.email;
            if (!userEmail) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No email associated with this user.'
                });
                return;
            }

            const credential = firebase.auth.EmailAuthProvider.credential(userEmail, currentPassword);
            user.reauthenticateWithCredential(credential)
                .then(() => {
                    return user.updatePassword(newPassword);
                })
                .then(() => {
                    // Update the database with the last password change
                    return database.ref(`users/${user.uid}`).update({
                        lastPasswordChange: new Date().toISOString()
                    });
                })
                .then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Password Changed',
                        text: 'Your password has been updated successfully.'
                    });
                    form.reset();
                })
                .catch(error => {
                    console.error('Password change error:', error);
                    let errorMessage = 'Failed to change password. Please ensure your current password is correct.';
                    if (error.code === 'auth/invalid-credential') {
                        errorMessage = 'Incorrect current password or authentication issue.';
                    } else if (error.code === 'auth/requires-recent-login') {
                        errorMessage = 'Please log in again before changing your password.';
                    }
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: errorMessage
                    });
                });
        });
    }
});