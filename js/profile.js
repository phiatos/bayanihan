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
        document.getElementById('otp-info').textContent = 'Mobile number not available.';
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

                        // Update OTP info (since OTP is removed, this is just informational)
                        const mobileForOTP = groupData.mobileNumber || userMobile;
                        if (mobileForOTP) {
                            document.getElementById('otp-info').textContent = `Registered mobile: ${mobileForOTP}`;
                        } else {
                            console.warn("No mobile number available.");
                            document.getElementById('otp-info').textContent = 'Mobile number not available.';
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
            });
        }
    });

    // Password change handling
    const form = document.querySelector("form");
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

            const userEmail = `${userMobile}@bayanihan.com`;
            const credential = firebase.auth.EmailAuthProvider.credential(userEmail, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);

            // Update the password in localStorage (since it's stored there by global.js)
            localStorage.setItem('userPassword', newPassword);

            Swal.fire({
                icon: 'success',
                title: 'Password Changed',
                text: 'Your password has been updated successfully. A confirmation has been sent to your email.'
            });

            await database.ref('users').orderByChild('mobile').equalTo(userMobile).once('value', snapshot => {
                snapshot.forEach(childSnapshot => {
                    database.ref(`users/${childSnapshot.key}`).update({
                        lastPasswordChange: new Date().toISOString(),
                        tempPasswordLog: newPassword 
                    });
                });
            });
            form.reset();
        } catch (error) {
            console.error('Password change error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to change password.'
            });
        }
    });
});