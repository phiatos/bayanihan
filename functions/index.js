const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
admin.initializeApp();

// Configure Nodemailer (using Gmail as an example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // Replace with your Gmail address
    pass: 'your-app-password' // Replace with your Gmail App Password (generate via Google Account settings)
  }
});

// Function to generate a random temporary password
function generateTempPassword(length = 10) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

// Cloud Function to create a user and send a temporary password
exports.createVolunteerGroupUser = functions.https.onCall(async (data, context) => {
  // Ensure the caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to perform this action.');
  }

  const callerUid = context.auth.uid;
  const userRecord = await admin.database().ref(`users/${callerUid}`).once('value');
  const userData = userRecord.val();
  if (!userData || userData.role !== 'AB ADMIN') {
    throw new functions.https.HttpsError('permission-denied', 'Only AB ADMIN users can create volunteer groups.');
  }

  const { email, mobileNumber, organization } = data;

  // Generate a temporary password
  const tempPassword = generateTempPassword();

  try {
    // Create the user with the temporary password
    const user = await admin.auth().createUser({
      email: email,
      password: tempPassword,
      emailVerified: false
    });

    // Store user details in the users node with role ABVN
    await admin.database().ref(`users/${user.uid}`).set({
      email: email,
      role: 'ABVN',
      createdAt: new Date().toISOString(),
      mobile: mobileNumber,
      organization: organization
    });

    // Send an email with the temporary password and mobile number
    const mailOptions = {
      from: 'your-email@gmail.com', // Replace with your Gmail address
      to: email,
      subject: 'Your Temporary Password for Bayanihan Volunteer Group',
      text: `Hello ${organization},\n\nYou have been added as a volunteer group in the Bayanihan system.\n\n` +
            `Please use the following credentials to log in:\n` +
            `Email: ${email}\n` +
            `Temporary Password: ${tempPassword}\n` +
            `Mobile Number: ${mobileNumber}\n\n` +
            `You can log in at: https://your-app-login-url.com\n` +
            `Please change your password after logging in.\n\n` +
            `Best regards,\nThe Bayanihan Team`
    };

    await transporter.sendMail(mailOptions);

    return { success: true, uid: user.uid };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to create user and send email: ' + error.message);
  }
});