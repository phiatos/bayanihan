const functions = require('firebase-functions');
const admin = require('firebase-admin');
const emailjs = require('@emailjs/nodejs');

// Initialize the Admin SDK
admin.initializeApp();

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


/**
 * Sends an approval email to the ABVN organization using EmailJS.
 * This helper function uses your already initialized EmailJS setup.
 */
async function sendApprovalEmail(email, organizationName) {
  const serviceId = 'YOUR_EMAILJS_SERVICE_ID_FOR_ABVN_APPROVAL'; // e.g., 'service_abcdefg'
  const templateId = 'YOUR_EMAILJS_TEMPLATE_ID_FOR_ABVN_APPROVAL'; // e.g., 'template_abvn_approved'

  // These are the parameters your EmailJS template expects.
  // Make sure these match the variable names you set up in your EmailJS template.
  const templateParams = {
    to_email: email,                   // e.g., if your template has {{to_email}}
    to_organization_name: organizationName, // e.g., if your template has {{to_organization_name}}
    // You can add other parameters here if your template needs them, like subject, body content etc.
  };

  try {
    await emailjs.send(serviceId, templateId, templateParams);
    console.log('ABVN approval email sent via EmailJS to:', email);
  } catch (error) {
    console.error('Error sending ABVN approval email via EmailJS to:', email, error);
  }
}

// Cloud Function to trigger on new approved ABVN applications
// This function listens for new data being added to 'abvnApplications/approvedABVN'
exports.sendAbvnApprovalEmail = functions.database.ref('/abvnApplications/approvedABVN/{applicationId}')
  .onCreate(async (snapshot, context) => {
    const applicationData = snapshot.val();
    const email = applicationData.email; // Get the email from the approved application data
    const organizationName = applicationData.organizationName; // Get the organization name

    if (!email || !organizationName) {
      console.warn('Missing email or organizationName for approved application:', applicationData);
      return null; // Exit if critical data is missing
    }

    await sendApprovalEmail(email, organizationName);
    return null; // Cloud Functions should return null or a Promise
  });