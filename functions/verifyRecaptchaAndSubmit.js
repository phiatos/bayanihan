const functions = require('firebase-functions');
const admin = require('firebase-admin'); 

exports.verifyRecaptchaAndSubmit = functions.https.onCall(async (data, context) => {
    // Access the secret key inside the function handler
    const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

    const { applicationData, recaptchaToken } = data;

    // 2. Validate incoming data and reCAPTCHA token
    if (!recaptchaToken) {
        throw new functions.https.HttpsError('invalid-argument', 'reCAPTCHA token is missing.');
    }
    if (!applicationData || typeof applicationData !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', 'Application data is missing or invalid.');
    }

    // Basic validation for applicationData (add more as needed)
    if (!applicationData.organizationName || !applicationData.email || !applicationData.headquarters) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required application data fields.');
    }

    // 3. Verify reCAPTCHA token with Google
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;

    try {
        const googleResponse = await fetch(verificationUrl, { method: 'POST' });
        const recaptchaResult = await googleResponse.json();

        if (!recaptchaResult.success) {
            console.error('reCAPTCHA verification failed:', recaptchaResult['error-codes']);
            throw new functions.https.HttpsError(
                'unauthenticated',
                'reCAPTCHA verification failed.',
                recaptchaResult['error-codes'] 
            );
        }

        // 4. If reCAPTCHA is successful, save data to Realtime Database
        const dbRef = admin.database().ref('abvnApplications/pendingABVN');
        await dbRef.push(applicationData);

        console.log('Application saved to Realtime Database successfully!');
        return { success: true, message: 'Application submitted successfully!' };

    } catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error; // Re-throw already handled HTTPS errors
        }
        console.error('Error during reCAPTCHA verification or database write:', error);
        let errorDetails = null;
        if (error && typeof error === 'object') {
            if (error.message) {
                errorDetails = { message: error.message };
            } else {
                try {
                    errorDetails = JSON.parse(JSON.stringify(error));
                } catch (e) {
                    errorDetails = { message: 'An unknown error occurred on the server.' };
                }
            }   
        } else {
            errorDetails = { message: String(error) || 'An unknown error occurred on the server.' };
        }

        throw new functions.https.HttpsError('internal', 'Internal server error.', errorDetails);
    }
});