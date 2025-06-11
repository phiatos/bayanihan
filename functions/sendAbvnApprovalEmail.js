// const functions = require('firebase-functions');
// const { sendApprovalEmail } = require('./utils/emailSender'); // Import the helper function

// // IMPORTANT: admin.initializeApp() should NOT be here. It should be in index.js only.

// // Cloud Function to trigger on new approved ABVN applications
// exports.sendAbvnApprovalEmail = functions.database.ref('/abvnApplications/approvedABVN/{applicationId}')
//   .onCreate(async (snapshot, context) => {
//     const applicationData = snapshot.val();
//     const email = applicationData.email;
//     const organizationName = applicationData.organizationName;

//     if (!email || !organizationName) {
//       console.warn('Missing email or organizationName for approved application:', applicationData);
//       return null;
//     }

//     await sendApprovalEmail(email, organizationName);
//     return null;
//   });


  
/**
 * Sends an approval email to the ABVN organization using EmailJS.
 * This helper function uses your already initialized EmailJS setup.
 */
// async function sendApprovalEmail(email, organizationName) {
//   const serviceId = 'YOUR_EMAILJS_SERVICE_ID_FOR_ABVN_APPROVAL'; // e.g., 'service_abcdefg'
//   const templateId = 'YOUR_EMAILJS_TEMPLATE_ID_FOR_ABVN_APPROVAL'; // e.g., 'template_abvn_approved'

//   // These are the parameters your EmailJS template expects.
//   // Make sure these match the variable names you set up in your EmailJS template.
//   const templateParams = {
//     to_email: email,                   // e.g., if your template has {{to_email}}
//     to_organization_name: organizationName, // e.g., if your template has {{to_organization_name}}
//     // You can add other parameters here if your template needs them, like subject, body content etc.
//   };

//   try {
//     await emailjs.send(serviceId, templateId, templateParams);
//     console.log('ABVN approval email sent via EmailJS to:', email);
//   } catch (error) {
//     console.error('Error sending ABVN approval email via EmailJS to:', email, error);
//   }
// }

// // Cloud Function to trigger on new approved ABVN applications
// // This function listens for new data being added to 'abvnApplications/approvedABVN'
// exports.sendAbvnApprovalEmail = functions.database.ref('/abvnApplications/approvedABVN/{applicationId}')
//   .onCreate(async (snapshot, context) => {
//     const applicationData = snapshot.val();
//     const email = applicationData.email; // Get the email from the approved application data
//     const organizationName = applicationData.organizationName; // Get the organization name

//     if (!email || !organizationName) {
//       console.warn('Missing email or organizationName for approved application:', applicationData);
//       return null; // Exit if critical data is missing
//     }

//     await sendApprovalEmail(email, organizationName);
//     return null; // Cloud Functions should return null or a Promise
//   });