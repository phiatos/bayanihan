const form = document.querySelector("form");
const nextBtnFirst = document.querySelector(".first .nextBtn"); 
const submitBtnOTP = document.querySelector(".otp-verification .nextBtn"); 
const termsCheckbox = document.querySelector("#terms");
const otpInput = document.querySelector("#otp-code"); 

if (nextBtnFirst) {
    nextBtnFirst.addEventListener('click', (event) => {
        if (termsCheckbox && termsCheckbox.checked) {
            form.classList.add('secActive');
        } else {
            event.preventDefault(); 
            Swal.fire({
                icon: 'warning',
                title: 'Terms not accepted',
                text: 'Please agree to the terms and privacy policy to continue.',
            });
        }
    });
}


if (submitBtnOTP) {
    submitBtnOTP.addEventListener('click', (event) => {
        event.preventDefault(); 

        // Add your OTP verification logic here
        let otpCode = '';
        if (otpInput) {
            otpCode = otpInput.value;
        }

        if (otpCode.length === 6) {
            // Call your Firebase OTP verification function here
            console.log("Verifying OTP:", otpCode);
            // Example using SweetAlert for now (replace with actual Firebase logic)
            Swal.fire({
                icon: 'success',
                title: 'OTP Verified!',
                text: 'Your account has been verified.',
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '../pages/dashboard.html'; // Redirect to the dashboard or next step
                }
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Invalid OTP',
                text: 'Please enter the 6-digit OTP code.',
            });
        }
    });
}

// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
// import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// // Firebase config (replace with yours)
// const firebaseConfig = {
//     apiKey: "YOUR_API_KEY",
//     authDomain: "YOUR_PROJECT.firebaseapp.com",
//     projectId: "YOUR_PROJECT_ID",
//     storageBucket: "YOUR_BUCKET.appspot.com",
//     messagingSenderId: "SENDER_ID",
//     appId: "APP_ID"
// };

// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);

// let confirmationResult; // will hold OTP confirmation result

// // Get mobile number from database (assume already fetched)
// const mobileNumber = "+63xxxxxxxxxx"; // replace with fetched number
// document.getElementById("otp-info").textContent = `Sending OTP to ${mobileNumber}`;

// // Initialize reCAPTCHA verifier
// window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
//     'size': 'invisible',
//     'callback': () => {
//         // on successful captcha
//         sendOTP();
//     }
// }, auth);

// function sendOTP() {
//     signInWithPhoneNumber(auth, mobileNumber, window.recaptchaVerifier)
//         .then(result => {
//             confirmationResult = result;
//             console.log("OTP sent.");
//         })
//         .catch(error => {
//             console.error("OTP send error:", error);
//             Swal.fire("Error", "Failed to send OTP. Try again.", "error");
//         });
// }

// // Trigger OTP send
// sendOTP();

// document.getElementById("verify-otp").addEventListener("click", () => {
//     const code = document.getElementById("otp-code").value;
//     confirmationResult.confirm(code).then(result => {
//         Swal.fire("Verified!", "Mobile number verified.", "success");
//         // proceed to next step or submit
//     }).catch(error => {
//         Swal.fire("Invalid", "The OTP you entered is incorrect.", "error");
//     });
// });
