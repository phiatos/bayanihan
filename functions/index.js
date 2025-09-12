// functions/index.js

// Firebase Cloud Functions core imports
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// v2 HTTP callable function imports
const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

// Third-party library for email sending
const emailjs = require('@emailjs/nodejs');

// Import the Google Generative AI library
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Initialize Firebase Admin SDK (do this ONLY ONCE) ---
admin.initializeApp();

// --- Import and export functions from other files ---

// This is the correct way to import and export your background trigger.
// It is not wrapped in onCall because Firebase recognizes its trigger type
// from the function definition within auditFunctions.js itself.
const { auditApplicationChanges } = require('./src/auditFunctions');
exports.auditApplicationChanges = auditApplicationChanges;

// --- Define Secrets for v2 Functions (recommended approach) ---
// This secret will be securely available to functions that declare it.
const recaptchaSecret = defineSecret('RECAPTCHA_SECRET_KEY');
const geminiApiKeySecret = defineSecret('GEMINI_API_KEY');

// --- Define your v2 HTTP callable function for reCAPTCHA verification ---
exports.verifyRecaptchaAndSubmit = onCall(
    { secrets: [recaptchaSecret] }, // Attach the secret to this function
    async (request) => {
        // Access the secret value
        const RECAPTCHA_SECRET_KEY = recaptchaSecret.value();

        const { applicationData, recaptchaToken } = request.data;
        
        // Example reCAPTCHA verification
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`;

        try {
            const response = await fetch(verifyUrl);
            const data = await response.json();

            if (!data.success) {
                console.warn(`reCAPTCHA verification failed:`, data['error-codes']);
                throw new functions.https.HttpsError('unauthenticated', 'reCAPTCHA verification failed.');
            }
            console.log(`reCAPTCHA verification successful.`);

            const db = admin.database();
            const newApplicationRef = await db.ref("abvnApplications/pendingABVN").push(applicationData);
            
            console.log(`Application submitted successfully with ID: ${newApplicationRef.key}`);

            return { success: true, message: 'Application submitted successfully!', applicationId: newApplicationRef.key };

        } catch (error) {
            console.error('Error in verifyRecaptchaAndSubmit:', error);
            throw new functions.https.HttpsError('internal', `Submission failed: ${error.message}`);
        }
    }
);

// --- NEW FUNCTION: AI-powered volunteer-to-group matching score ---
exports.getMatchScore = onCall(
    { secrets: [geminiApiKeySecret] },
    async (request) => {
        const { volunteer, group } = request.data;

        // Ensure both volunteer and group data are provided
        if (!volunteer || !group) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing volunteer or group data.');
        }

        try {
            const GEMINI_API_KEY = geminiApiKeySecret.value();
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

            // Construct a detailed prompt for the AI to analyze the match
            const prompt = `
                You are a Bayanihan Matchmaking Specialist. Your task is to analyze the compatibility between a volunteer and a volunteer group based on location, skills, and the group's needs.

                **Instructions:**
                1.  Carefully read the volunteer's profile and the group's needs.
                2.  Provide a single numerical score from 0 to 100 representing the overall match.
                3.  Provide a short, one-sentence explanation for the score.
                4.  Your response must be in a specific JSON format: {"score": <number>, "explanation": "<string>"}. Do not include any other text, greetings, or formatting.

                **Volunteer Profile:**
                - Location: ${volunteer.address?.formattedAddress || 'Not specified'}
                - Skills: ${volunteer.skills?.join(', ') || 'None'}
                - Other Skills/Comments: ${volunteer.otherSkillComments || 'None'}

                **Volunteer Group Needs:**
                - Organization: ${group.organization || 'Not specified'}
                - Location: ${group.address?.formattedAddress || 'Not specified'}
                - Volunteer Needs:
                  ${group.volunteerNeeds ? Object.values(group.volunteerNeeds).map(need => `- Role: ${need.title || 'N/A'}, Skills: ${need.skills?.join(', ') || 'N/A'}, Comments: ${need.otherSkillComments || 'N/A'}`).join('\n') : 'None'}

                **Example Output:**
                {"score": 85, "explanation": "The volunteer's location is a close match, and their skills directly align with the group's need for a medical professional."}

                Now, analyze the volunteer and group data provided and return the JSON response.
            `;

            const result = await model.generateContent(prompt);
            const textResponse = await result.response.text();
            
            // Clean and parse the JSON response from the AI
            let aiResult;
            try {
                // Ensure the response is valid JSON
                aiResult = JSON.parse(textResponse);
            } catch (jsonError) {
                console.error('AI response was not valid JSON:', textResponse);
                throw new functions.https.HttpsError('internal', 'Invalid AI response format.');
            }

            // Validate that the AI returned the expected fields
            if (typeof aiResult.score !== 'number' || typeof aiResult.explanation !== 'string') {
                console.error('AI response is missing required fields:', aiResult);
                throw new functions.https.HttpsError('internal', 'AI response missing score or explanation.');
            }

            console.log(`AI Score for match: ${aiResult.score}`);
            return aiResult;

        } catch (error) {
            console.error('Error in getMatchScore:', error);
            // Return a default score and explanation in case of failure
            return {
                score: 0,
                explanation: 'Match score unavailable due to an internal error.'
            };
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
        const syntheticEmail = `${mobileNumber}@bayanihan.com`;
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

        return { success: true, message: 'Password reset successfully.' };

    } catch (error) {
        console.error(`Error resetting password for ${mobileNumber}:`, error);
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', 'User not found with the provided mobile number.');
        }
        throw new functions.https.HttpsError('internal', `Failed to reset password: ${error.message}`);
    }
});

// Initialize EmailJS with your public key (do this once)
emailjs.init('ULA8rmn7VM-3fZ7ik');
