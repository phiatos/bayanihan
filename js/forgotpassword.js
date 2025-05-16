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
    const verifyOtpBtn = document.getElementById('verify-otp');
    const resendOtp = document.getElementById('resend-otp');
    const updatePwdBtn = document.getElementById('update-password');
    const backToLogin = document.getElementById('back-to-login');
    const timerDisplay = document.getElementById('timer');
    const mobileInput = document.getElementById('mobile');
    const displayMobileEl = document.getElementById('display-mobile');
    const otpInputs = document.querySelectorAll('#step2 .otp');
    const newPwdInput = document.getElementById('new-password');
    const confirmPwdIn = document.getElementById('confirm-password');
    const backButton = document.querySelector('.back-btn');

    // OTP state
    let confirmationResult = null;
    let recaptchaVerifier = null;
    let mobileNumber = null;

    // Track OTP sending attempts and last send time in the database
    const MAX_OTP_ATTEMPTS = 4;
    const COOLDOWN_SECONDS = 30; // 30-second cooldown between OTP sends

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

    // Timer state
    let timerInterval, timerActive = false;

    // OTP timer
    function startTimer(sec) {
        clearInterval(timerInterval);
        timerActive = true;
        resendOtp.classList.add('disabled');

        let t = sec;
        function tick() {
            const m = String(Math.floor(t / 60)).padStart(2, '0');
            const s = String(t % 60).padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;
            if (t-- < 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = 'Expired';
                timerActive = false;
                resendOtp.classList.remove('disabled');
                otpInputs.forEach(i => i.disabled = true);
                verifyOtpBtn.disabled = true;
            }
        }
        tick();
        timerInterval = setInterval(tick, 1000);
    }

    // Initialize OTP inputs
    function resetOtpInputs() {
        otpInputs.forEach((inp, i) => {
            inp.value = '';
            inp.disabled = i !== 0;
        });
        otpInputs[0].focus();
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.classList.remove('active');
    }

    // Function to check and update OTP send count in the database
    async function checkAndUpdateOtpSendCount(phoneNumber) {
        const otpRef = database.ref(`otpAttempts/${phoneNumber.replace(/[^0-9]/g, '')}`);
        const snapshot = await otpRef.once('value');
        let data = snapshot.val() || { count: 0, lastSent: 0 };

        // Check if we're within the cooldown period
        const now = Date.now();
        const timeSinceLastSent = (now - data.lastSent) / 1000; // in seconds
        if (timeSinceLastSent < COOLDOWN_SECONDS && data.count > 0) {
            throw new Error(`Please wait ${Math.ceil(COOLDOWN_SECONDS - timeSinceLastSent)} seconds before requesting another OTP.`);
        }

        // Check OTP send limit
        if (data.count >= MAX_OTP_ATTEMPTS) {
            throw new Error(`OTP sending limit reached. You can only send ${MAX_OTP_ATTEMPTS} OTPs to this number.`);
        }

        // Increment count and update last sent time
        data.count += 1;
        data.lastSent = now;
        await otpRef.set(data);

        return data.count;
    }

    // Function to send OTP
    async function sendOTP(phoneNumber) {
        try {
            // Check and update OTP send count in the database
            const attemptCount = await checkAndUpdateOtpSendCount(phoneNumber);

            // Initialize reCAPTCHA verifier
            console.log("Initializing reCAPTCHA verifier...");
            recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    console.log("reCAPTCHA solved successfully:", response);
                },
                'expired-callback': () => {
                    console.log("reCAPTCHA expired.");
                    Swal.fire({
                        icon: 'error',
                        title: 'reCAPTCHA Expired',
                        text: 'Please try again.'
                    });
                    recaptchaVerifier = null;
                },
                'error-callback': (error) => {
                    console.error("reCAPTCHA error:", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'reCAPTCHA Error',
                        text: 'Failed to verify reCAPTCHA. Please try again.'
                    });
                }
            });

            // Render the reCAPTCHA to ensure it’s loaded
            console.log("Rendering reCAPTCHA...");
            await recaptchaVerifier.render().catch(error => {
                console.error("Error rendering reCAPTCHA:", error);
                throw new Error("Failed to render reCAPTCHA.");
            });

            // Format phone number to international format (+63 for Philippines)
            const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+63${phoneNumber.slice(1)}`;
            
            // Enforce SMS region policy: only allow Philippine numbers (+63)
            if (!formattedPhoneNumber.startsWith('+63')) {
                throw new Error("Only Philippine mobile numbers (+63) are allowed.");
            }

            console.log(`Sending OTP to: ${formattedPhoneNumber} (Attempt ${attemptCount} of ${MAX_OTP_ATTEMPTS})`);
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
        } finally {
            // Clear reCAPTCHA after use
            if (recaptchaVerifier) {
                console.log("Clearing reCAPTCHA...");
                recaptchaVerifier.clear();
                recaptchaVerifier = null;
            }
        }
    }

    // Step 1 → Step 2
    toStep2Btn.addEventListener('click', async () => {
        const mob = mobileInput.value.trim();
        if (!/^09\d{9}$/.test(mob)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Mobile Number',
                text: 'Enter a valid 11-digit Philippine mobile number starting with 09.'
            });
            return;
        }

        mobileNumber = mob;
        displayMobileEl.textContent = mob;

        try {
            confirmationResult = await sendOTP(mob);
            current = 1;
            resetOtpInputs();
            startTimer(180);
            showStep(current);
        } catch (error) {
            // Error handled in sendOTP
        }
    });

    // Resend OTP (only after timer expires)
    resendOtp.addEventListener('click', async (e) => {
        e.preventDefault();
        if (timerActive) return;

        try {
            confirmationResult = await sendOTP(mobileNumber);
            resetOtpInputs();
            startTimer(180);
        } catch (error) {
            // Error handled in sendOTP
        }
    });

    // OTP input logic
    otpInputs.forEach((inp, idx) => {
        inp.addEventListener('input', () => {
            inp.value = inp.value.replace(/[^0-9]/g, ''); // Only allow numbers
            const val = inp.value, next = otpInputs[idx + 1], prev = otpInputs[idx - 1];
            if (val.length > 0 && next) {
                next.disabled = false;
                next.focus();
            }
            const allFilled = [...otpInputs].every(i => i.value.trim() !== '');
            verifyOtpBtn.disabled = !allFilled;
            verifyOtpBtn.classList.toggle('active', allFilled);
        });

        inp.addEventListener('keyup', e => {
            const prev = otpInputs[idx - 1];
            if (e.key === 'Backspace' && inp.value.length === 0 && prev) {
                inp.disabled = true;
                prev.focus();
            }
        });
    });

    // Verify OTP → Step 3
    verifyOtpBtn.addEventListener('click', async () => {
        if (verifyOtpBtn.disabled) return;

        const otpCode = [...otpInputs].map(inp => inp.value).join('');
        if (!confirmationResult) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No OTP confirmation available. Please request a new OTP.'
            });
            return;
        }

        // Ensure the OTP is exactly 6 digits
        if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid OTP',
                text: 'Please enter a valid 6-digit OTP.'
            });
            return;
        }

        try {
            await confirmationResult.confirm(otpCode);
            current = 2;
            showStep(current);
        } catch (error) {
            console.error('Error verifying OTP:', error);
            Swal.fire({
                icon: 'error',
                title: 'Invalid OTP',
                text: error.message || 'The OTP you entered is incorrect. Please try again.'
            });
        }
    });

    // Update Password → Step 4
    updatePwdBtn.addEventListener('click', async () => {
        const np = newPwdInput.value, cp = confirmPwdIn.value;
        if (!np || np !== cp) {
            Swal.fire({
                icon: 'error',
                title: 'Password Mismatch',
                text: 'Passwords must match and not be empty.'
            });
            return;
        }

        // Validate password length and complexity (align with Firebase Password Policy)
        if (np.length < 8) {
            Swal.fire({
                icon: 'error',
                title: 'Weak Password',
                text: 'Password must be at least 8 characters long.'
            });
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(np)) {
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

            // Update the password in Firebase Authentication
            await user.updatePassword(np);

            // Update the password in localStorage for consistency with global.js
            localStorage.setItem('userPassword', np);

            // Update the database with the password change
            await database.ref('users').orderByChild('mobile').equalTo(mobileNumber).once('value', snapshot => {
                if (!snapshot.exists()) {
                    console.error("No user found with mobile:", mobileNumber);
                    Swal.fire({
                        icon: 'error',
                        title: 'User Not Found',
                        text: 'User data not found in the database. Please contact support.'
                    });
                    return;
                }

                snapshot.forEach(childSnapshot => {
                    database.ref(`users/${childSnapshot.key}`).update({
                        lastPasswordChange: new Date().toISOString(),
                        // Do NOT store the password in the database in production
                        tempPasswordLog: np // Remove this in production
                    }).then(() => {
                        console.log("Database updated with new password details for mobile:", mobileNumber);
                    }).catch(error => {
                        console.error("Error updating database:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Database Error',
                            text: 'Failed to update password in database: ' + error.message
                        });
                    });
                });
            });

            Swal.fire({
                icon: 'success',
                title: 'Password Updated',
                text: 'Your password has been updated successfully.'
            });

            current = 3;
            showStep(current);
        } catch (error) {
            console.error('Error updating password:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to update password.'
            });
        }
    });

    // Back to login
    backToLogin.addEventListener('click', () => {
        window.location.href = '/pages/login.html';
    });

    if (newPwdInput && confirmPwdIn) {
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const newPasswordLockIcon = newPwdInput.nextElementSibling;
        const newPasswordOpenLockIcon = newPasswordLockIcon.nextElementSibling;
        const confirmPasswordLockIcon = confirmPwdIn.nextElementSibling;
        const confirmPasswordOpenLockIcon = confirmPasswordLockIcon.nextElementSibling;

        if (newPasswordLockIcon && newPasswordOpenLockIcon) {
            newPasswordLockIcon.addEventListener('click', () => {
                newPasswordInput.type = 'text';
                newPasswordLockIcon.style.display = 'none';
                newPasswordOpenLockIcon.style.display = 'inline';
            });

            newPasswordOpenLockIcon.addEventListener('click', () => {
                newPasswordInput.type = 'password';
                newPasswordOpenLockIcon.style.display = 'none';
                newPasswordLockIcon.style.display = 'inline';
            });
        }

        if (confirmPasswordLockIcon && confirmPasswordOpenLockIcon) {
            confirmPasswordLockIcon.addEventListener('click', () => {
                confirmPasswordInput.type = 'text';
                confirmPasswordLockIcon.style.display = 'none';
                confirmPasswordOpenLockIcon.style.display = 'inline';
            });

            confirmPasswordOpenLockIcon.addEventListener('click', () => {
                confirmPasswordInput.type = 'password';
                confirmPasswordOpenLockIcon.style.display = 'none';
                confirmPasswordLockIcon.style.display = 'inline';
            });
        }
    }
});