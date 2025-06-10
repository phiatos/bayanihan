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

document.addEventListener('DOMContentLoaded', () => {
    // Step IDs in order
    const steps = ['step1', 'step2', 'step3', 'step4'];
    let current = 0;

    // Elements
    const toStep2Btn = document.getElementById('to-step2');
    const toStep3Btn = document.getElementById('to-step3');
    const toStep4Btn = document.getElementById('to-step4');
    const backToLogin = document.getElementById('back-to-login');
    const emailInput = document.getElementById('email');
    const displayEmailEl = document.getElementById('display-email');
    const backButton = document.querySelector('.back-btn');

    if (backButton) {
        backButton.addEventListener('click', () => {
            window.history.back();
        });
    }

    // Show only one step
    function showStep(idx) {
        steps.forEach((id, i) => {
            document.getElementById(id).classList.toggle('hidden', i !== idx);
        });
    }
    showStep(current);

    // Step 1 → Step 2: Send Password Reset Email
    toStep2Btn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            Swal.fire({
                toast: true,
                position: 'top',
                icon: 'error',
                title: 'Invalid Email Address',
                text: 'Enter a valid email address.',
                showConfirmButton: false,
                timer: 3000,                      // auto-dismiss after 3 seconds
                timerProgressBar: true,           // show progress bar
                background: '#f8d7da',           // soft pink/red background
                color: '#721c24',                // dark red text
                iconColor: '#721c24',            // dark red icon
                customClass: {
                    popup: 'my-error-toast',
                    title: 'swal2-title-custom',    // optional custom class for title
                    htmlContainer: 'swal2-text-custom' // optional for body text
                },
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });

            return;
        }

        try {
            // Check if the email exists in the database
            let userFound = false;
            let userMobile = null;
            let userId = null;
            await database.ref('users').orderByChild('email').equalTo(email).once('value', snapshot => {
                if (snapshot.exists()) {
                    snapshot.forEach(childSnapshot => {
                        userFound = true;
                        userMobile = childSnapshot.val().mobile;
                        userId = childSnapshot.key;
                    });
                }
            });

            if (!userFound) {
                Swal.fire({
                icon: 'error',
                title: 'Email Not Found',
                text: 'No account is associated with this email address. Please try again or register.',
                background: '#f8d7da',             
                color: '#721c24',                   
                iconColor: '#721c24',                
                confirmButtonColor: '#c82333',    
                confirmButtonText: 'Okay',
                customClass: {
                popup: 'my-error-toast',
                title: 'my-error-title',
                confirmButton: 'my-error-button'
                }
                });
                return;
            }

            // Send password reset email
            const actionCodeSettings = {
                url: '../pages/login.html',
                handleCodeInApp: false,
            };
            await auth.sendPasswordResetEmail(email, actionCodeSettings);

            // Store userId in localStorage for consistency
            localStorage.setItem('resetUserId', userId);
            localStorage.setItem('userEmail', email);
            if (userMobile) {
                localStorage.setItem('userMobile', userMobile);
            }

            // Display the email in Step 2
            displayEmailEl.textContent = email;

           Swal.fire({
            icon: 'success',
            title: 'Reset Link Sent',
            text: `A password reset link has been sent to ${email}. Please check your email (including spam/junk folder).`,
            background: '#f0fdf4',             
            color: '#065f46',                   
            iconColor: '#16a34a',               
            confirmButtonColor: '#16a34a',      
            confirmButtonText: 'Got it!',
            customClass: {
                popup: 'my-success-popup',
                title: 'my-success-title',
                confirmButton: 'my-success-button'
            }
        });


            current = 1;
            showStep(current);
        } catch (error) {
            console.error('Error in Step 1:', error);
            let errorMessage = 'Failed to send reset email. Please try again.';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account is associated with this email address.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address format.';
            }
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage
            });
        }
    });

    // Step 2 → Step 3: Proceed to Instructions
    toStep3Btn.addEventListener('click', () => {
        current = 2;
        showStep(current);
    });

    // Step 3 → Step 4: Proceed to Success
    toStep4Btn.addEventListener('click', () => {
        current = 3;
        showStep(current);
    });

    // Back to login
    backToLogin.addEventListener('click', () => {
        window.location.href = '../pages/login.html';
    });
});