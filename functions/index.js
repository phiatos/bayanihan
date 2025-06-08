// functions/index.js

// Firebase Cloud Functions core imports
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// v2 HTTP callable function imports (for verifyRecaptchaAndSubmit)
const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

// Third-party library for email sending
const emailjs = require('@emailjs/nodejs');

// --- Initialize Firebase Admin SDK (do this ONLY ONCE) ---
admin.initializeApp();

// --- Import and export functions from other files ---

// Example: Importing your audit function.
// Adjust the path based on where 'auditFunctions.js' is relative to 'index.js'.
// If 'auditFunctions.js' is in 'functions/src/', use './src/auditFunctions'.
const { auditApplicationChanges } = require('./src/auditFunctions'); 
exports.auditApplicationChanges = auditApplicationChanges;

// Example: If you had other functions in separate files:
// const { verifyRecaptchaAndSubmit } = require('./src/verifyRecaptchaAndSubmit');
// exports.verifyRecaptchaAndSubmit = verifyRecaptchaAndSubmit;

// const { sendAbvnApprovalEmail } = require('./src/sendAbvnApprovalEmail');
// exports.sendAbvnApprovalEmail = sendAbvnApprovalEmail;


// --- Define Secrets for v2 Functions (recommended approach) ---
// This secret will be securely available to functions that declare it.
const recaptchaSecret = defineSecret('RECAPTCHA_SECRET_KEY');


// --- Define your v2 HTTP callable function ---
exports.verifyRecaptchaAndSubmit = onCall(
    { secrets: [recaptchaSecret] }, // Attach the secret to this function
    async (request) => {
        // Access the secret value
        const RECAPTCHA_SECRET_KEY = recaptchaSecret.value();

        const { applicationData, recaptchaToken } = request.data;
        // The 'context' parameter in v2 functions is now 'request' itself for HTTP functions
        // For callable functions, `request.auth` contains authentication info.
        // `request.rawRequest` is the underlying Express Request object if you need raw headers etc.

        // --- Important: Server-side reCAPTCHA verification using RECAPTCHA_SECRET_KEY ---
        // This logic was previously in auditApplicationChanges but should ideally be done
        // *before* writing data to the database, within the function that receives the submission.
        // If this function is the entry point for submissions, put reCAPTCHA verification here.

        // Example reCAPTCHA verification (Moved from audit function for immediate verification)
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;

        try {
            const response = await fetch(verifyUrl); // `fetch` needs to be imported or available globally
            const data = await response.json();

            if (!data.success) {
                console.warn(`reCAPTCHA verification failed:`, data['error-codes']);
                // You might also log this failure to an audit trail via `logAudit` function
                throw new functions.https.HttpsError('unauthenticated', 'reCAPTCHA verification failed.');
            }
            console.log(`reCAPTCHA verification successful.`);

            // --- Database Write Logic (if this function is handling the submission) ---
            const db = admin.database(); // Access the Firebase Realtime Database instance
            const newApplicationRef = await db.ref("abvnApplications/pendingABVN").push(applicationData);

            // You can also trigger an audit log *here* immediately after successful submission
            // though the onWrite trigger will also catch it.
            // Consider if you need a separate log for 'submission received' vs 'data written'.
            console.log(`Application submitted successfully with ID: ${newApplicationRef.key}`);

            return { success: true, message: 'Application submitted successfully!', applicationId: newApplicationRef.key };

        } catch (error) {
            console.error('Error in verifyRecaptchaAndSubmit:', error);
            throw new functions.https.HttpsError('internal', `Submission failed: ${error.message}`);
        }
    }
);


// --- Define your 1st generation HTTP callable function (resetPassword) ---
// Note: This is a 1st gen function. Consider migrating to v2 `onCall` for consistency.
exports.resetPassword = functions.https.onCall(async (data, context) => {
    const { mobileNumber, newPassword } = data;

    // --- Input Validation ---
    if (!mobileNumber || !newPassword) {
        throw new functions.https.HttpsError('invalid-argument', 'Mobile number and new password are required.');
    }
    if (newPassword.length < 8) {
        throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 8 characters long.');
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        throw new functions.https.HttpsError('invalid-argument', 'Password must contain at least one uppercase letter and one number.');
    }

    try {
        // --- Firebase Authentication Update ---
        const syntheticEmail = `${mobileNumber}@bayanihan.com`; // Assuming this is how you link mobile to Firebase Auth
        const user = await admin.auth().getUserByEmail(syntheticEmail);
        await admin.auth().updateUser(user.uid, {
            password: newPassword
        });

        // --- Realtime Database Update (for lastPasswordChange) ---
        const db = admin.database();
        const usersSnapshot = await db.ref('users').orderByChild('mobile').equalTo(mobileNumber).once('value');
        let userEmail = null;
        if (usersSnapshot.exists()) {
            usersSnapshot.forEach(childSnapshot => {
                userEmail = childSnapshot.val().email;
                db.ref(`users/${childSnapshot.key}`).update({
                    lastPasswordChange: new Date().toISOString()
                });
            });
        }

        // --- Email Confirmation ---
        if (userEmail) {
            await emailjs.send('service_g5f0erj', 'template_0yk865p', {
                email: userEmail,
                mobileNumber: mobileNumber,
                message: `Your password for Bayanihan has been successfully reset. Please log in with your new password.`
            });
        }

        console.log(`Password reset successfully for mobile: ${mobileNumber}`);
        // Consider logging this password reset event to your audit trail as well!
        // For example:
        // await logAudit('PASSWORD_RESET', { mobile: mobileNumber }, { actor: { uid: user.uid, type: 'user' } });

        return { success: true, message: 'Password reset successfully.' };

    } catch (error) {
        console.error(`Error resetting password for ${mobileNumber}:`, error);
        // Distinguish between different error types for better client feedback
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'User not found with the provided mobile number.');
        }
        throw new functions.https.HttpsError('internal', `Failed to reset password: ${error.message}`);
    }
});

// Initialize EmailJS with your public key (do this once)
emailjs.init('ULA8rmn7VM-3fZ7ik');