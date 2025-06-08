const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailjs = require('@emailjs/nodejs');

// Initialize the Admin SDK
admin.initializeApp();

exports.verifyRecaptchaAndSubmit = require('./verifyRecaptchaAndSubmit').verifyRecaptchaAndSubmit;
// exports.sendAbvnApprovalEmail = require('./sendAbvnApprovalEmail').sendAbvnApprovalEmail;

// Initialize EmailJS with your public key
emailjs.init('ULA8rmn7VM-3fZ7ik'); // Your EmailJS public key

exports.resetPassword = functions.https.onCall(async (data, context) => {
    const { mobileNumber, newPassword } = data;

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
        const syntheticEmail = `${mobileNumber}@bayanihan.com`;
        const user = await admin.auth().getUserByEmail(syntheticEmail);

        await admin.auth().updateUser(user.uid, {
            password: newPassword
        });

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

        // Send confirmation email
        if (userEmail) {
            await emailjs.send('service_g5f0erj', 'template_0yk865p', {
                email: userEmail,
                mobileNumber: mobileNumber,
                message: `Your password for Bayanihan has been successfully reset. Please log in with your new password.`
            });
        }

        return { success: true, message: 'Password reset successfully.' };
    } catch (error) {
        console.error('Error resetting password:', error);
        throw new functions.https.HttpsError('internal', `Failed to reset password: ${error.message}`);
    }
});