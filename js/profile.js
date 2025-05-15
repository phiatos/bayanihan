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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

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
        document.getElementById('otp-info').textContent = 'Mobile number not available for OTP verification.';
    };

    // Function to fetch user data (unchanged as per your request)
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
                window.location.href = '/Bayanihan-PWA/login.html';
            });
            return;
        }

        // Fetch user data to get the organization
        console.log("Querying users node for mobile:", userMobile);
        database.ref('users').orderByChild('mobile').equalTo(userMobile).once('value')
            .then(snapshot => {
                console.log("Users snapshot:", snapshot.val());
                if (!snapshot.exists()) {
                    console.error("No user found with mobile:", userMobile);
                    Swal.fire({
                        icon: 'error',
                        title: 'User Not Found',
                        text: 'User data not found in the database. Please contact support.'
                    });
                    setFieldsToNA();
                    return;
                }

                let userData = null;
                let userId = null;
                snapshot.forEach(childSnapshot => {
                    userId = childSnapshot.key;
                    userData = childSnapshot.val();
                });

                console.log("User data retrieved:", userData);

                if (!userData.organization) {
                    console.error("No organization found for user:", userId);
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
                database.ref('volunteerGroups').orderByChild('organization').equalTo(userData.organization).once('value')
                    .then(groupSnapshot => {
                        console.log("Volunteer group snapshot:", groupSnapshot.val());
                        if (!groupSnapshot.exists()) {
                            console.error("No group found for organization:", userData.organization);
                            Swal.fire({
                                icon: 'error',
                                title: 'Group Data Not Found',
                                text: 'Volunteer group data not found. Please contact support.'
                            });
                            setFieldsToNA();
                            return;
                        }

                        let groupData = null;
                        let groupId = null;
                        groupSnapshot.forEach(childSnapshot => {
                            groupId = childSnapshot.key;
                            groupData = childSnapshot.val();
                        });

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

                        // Update OTP info (no functionality)
                        const mobileForOTP = groupData.mobileNumber || userMobile;
                        if (mobileForOTP) {
                            document.getElementById('otp-info').textContent = `OTP will be sent to ${mobileForOTP}`;
                        } else {
                            console.warn("No mobile number available for OTP.");
                            document.getElementById('otp-info').textContent = 'Mobile number not available for OTP verification.';
                        }

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

    // Check authentication state
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("User is authenticated:", user.uid);
            fetchUserData(user);
        } else {
            console.error("No user is authenticated.");
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'Please log in to view your profile.'
            }).then(() => {
                window.location.href = '/Bayanihan-PWA/login.html';
            });
        }
    });

    // OTP handling shared between password change and mobile verification
    let recaptchaVerifier;
    let confirmationResult = null;
    let passwordChangeData = null;

    // Function to initialize reCAPTCHA and send OTP
    const sendOTP = async (phoneNumber) => {
        try {
            // Initialize reCAPTCHA verifier
            recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    console.log("reCAPTCHA solved:", response);
                },
                'expired-callback': () => {
                    Swal.fire({
                        icon: 'error',
                        title: 'reCAPTCHA Expired',
                        text: 'Please try again.'
                    });
                }
            });

            // Send OTP to the phone number
            const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+63${phoneNumber.slice(1)}`; // Assuming Philippine number format
            confirmationResult = await auth.signInWithPhoneNumber(formattedPhoneNumber, recaptchaVerifier);
            Swal.fire({
                icon: 'success',
                title: 'OTP Sent',
                text: `An OTP has been sent to ${phoneNumber}.`
            });

            return confirmationResult;
        } catch (error) {
            console.error('Error sending OTP:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to send OTP. Please try again.'
            });
            throw error;
        }
    };

    // Function to verify OTP
    const verifyOTP = async (otpCode, context = 'mobileVerification') => {
        try {
            const result = await confirmationResult.confirm(otpCode);
            Swal.fire({
                icon: 'success',
                title: 'OTP Verified',
                text: 'OTP verified successfully!'
            });

            if (context === 'mobileVerification') {
                // Update the user's profile or database with the verified phone number
                const user = auth.currentUser;
                await user.updatePhoneNumber(result.credential);

                // Update the database with the verified phone number
                const userMobile = localStorage.getItem("userMobile");
                if (userMobile) {
                    await database.ref('users').orderByChild('mobile').equalTo(userMobile).once('value', snapshot => {
                        snapshot.forEach(childSnapshot => {
                            database.ref(`users/${childSnapshot.key}`).update({
                                phoneVerified: true
                            });
                        });
                    });
                }

                // Reset the OTP field
                document.getElementById('otp-code').value = '';
            } else if (context === 'passwordChange') {
                // Proceed with password change after OTP verification
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('No user is currently signed in.');
                }

                const userEmail = user.email;
                if (!userEmail) {
                    throw new Error('User email not found. Please log in again.');
                }

                const { currentPassword, newPassword } = passwordChangeData;
                const credential = firebase.auth.EmailAuthProvider.credential(userEmail, currentPassword);
                await user.reauthenticateWithCredential(credential);

                // Update the password
                await user.updatePassword(newPassword);
                Swal.fire({
                    icon: 'success',
                    title: 'Password Changed',
                    text: 'Your password has been updated successfully.'
                });

                // Reset form and switch back to the first form
                form.classList.remove('secActive');
                form.querySelector('.form.first').reset();
                passwordChangeData = null;
            }

            // Clear confirmation result
            confirmationResult = null;
            localStorage.removeItem('confirmationResult');
        } catch (error) {
            console.error('Error verifying OTP:', error);
            Swal.fire({
                icon: 'error',
                title: 'Invalid OTP',
                text: error.message || 'The OTP you entered is incorrect. Please try again.'
            });
        }
    };

    // Password Change Handling with OTP Verification
    const form = document.querySelector("form");
    const changePasswordButton = form.querySelector('.form-container-2 button.nextBtn');
    changePasswordButton.addEventListener('click', async (e) => {
        e.preventDefault();

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

        // Store password change data
        passwordChangeData = { currentPassword, newPassword };

        // Get mobile number for OTP
        const mobileNumber = document.getElementById('profile-mobile').textContent;
        if (mobileNumber === 'N/A') {
            Swal.fire({
                icon: 'error',
                title: 'No Mobile Number',
                text: 'No mobile number available to send OTP.'
            });
            return;
        }

        try {
            // Send OTP and switch to the second form
            confirmationResult = await sendOTP(mobileNumber);
            localStorage.setItem('confirmationResult', JSON.stringify(confirmationResult));
            form.classList.add('secActive');
        } catch (error) {
            // Error handled in sendOTP
        }
    });

    // OTP Verification for Password Change
    const verifyOtpPasswordButton = document.querySelector(".form.second .verify-otp-password");
    if (verifyOtpPasswordButton) {
        verifyOtpPasswordButton.addEventListener('click', async () => {
            const otpCode = document.getElementById('otp-code-password').value;

            if (!otpCode || otpCode.length !== 6) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid OTP',
                    text: 'Please enter a valid 6-digit OTP.'
                });
                return;
            }

            await verifyOTP(otpCode, 'passwordChange');
        });
    }

    // Resend OTP for Password Change
    const resendOtpPasswordButton = document.querySelector(".form.second .resend-otp-password");
    if (resendOtpPasswordButton) {
        resendOtpPasswordButton.addEventListener('click', async () => {
            const mobileNumber = document.getElementById('profile-mobile').textContent;
            if (mobileNumber === 'N/A') {
                Swal.fire({
                    icon: 'error',
                    title: 'No Mobile Number',
                    text: 'No mobile number available to send OTP.'
                });
                return;
            }

            try {
                confirmationResult = await sendOTP(mobileNumber);
                localStorage.setItem('confirmationResult', JSON.stringify(confirmationResult));
            } catch (error) {
                // Error handled in sendOTP
            }
        });
    }

    // Back button to return to the first form
    const backButton = document.querySelector(".form.second .backBtn");
    if (backButton) {
        backButton.addEventListener('click', () => {
            form.classList.remove('secActive');
            passwordChangeData = null;
            localStorage.removeItem('confirmationResult');
            confirmationResult = null;
        });
    }

    // OTP Verification Handling for Mobile Number
    const verifyOtpButton = document.querySelector(".verify-otp");
    if (verifyOtpButton) {
        verifyOtpButton.addEventListener('click', async () => {
            const otpCode = document.getElementById('otp-code').value;
            const termsChecked = document.getElementById('terms').checked;
            const dataConsentChecked = document.getElementById('data-consent').checked;

            if (!termsChecked || !dataConsentChecked) {
                Swal.fire({
                    icon: 'error',
                    title: 'Consent Required',
                    text: 'You must agree to the terms and data consent to proceed.'
                });
                return;
            }

            if (!otpCode || otpCode.length !== 6) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid OTP',
                    text: 'Please enter a valid 6-digit OTP.'
                });
                return;
            }

            const mobileNumber = document.getElementById('profile-mobile').textContent;
            if (mobileNumber === 'N/A') {
                Swal.fire({
                    icon: 'error',
                    title: 'No Mobile Number',
                    text: 'No mobile number available to verify.'
                });
                return;
            }

            // Send OTP if not already sent
            if (!confirmationResult) {
                confirmationResult = await sendOTP(mobileNumber);
                localStorage.setItem('confirmationResult', JSON.stringify(confirmationResult));
            }

            // Verify the OTP
            await verifyOTP(otpCode, 'mobileVerification');

            // Clear the confirmation result from localStorage after successful verification
            localStorage.removeItem('confirmationResult');
            confirmationResult = null;
        });
    }
});