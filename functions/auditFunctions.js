const functions = require('firebase-functions');
const admin = require('firebase-admin');
// admin.initializeApp(); // DO NOT initialize admin here, it should be done once in index.js

const db = admin.database();
const fetch = require('node-fetch'); // Make sure node-fetch is installed in functions/package.json

async function logAudit(eventType, change, context) {
    const auditLogRef = db.ref('auditLogs/applications'); // Dedicated path for audit logs

    const auditEntry = {
        timestamp: admin.database.ServerValue.TIMESTAMP, // Server-side timestamp
        actor: {
            uid: context.auth ? context.auth.uid : 'anonymous', // User ID from auth context
            // Add email if you fetch user details, but be mindful of privacy
            type: context.authType || 'unauthenticated_client_request' // 'USER', 'ADMIN', 'SYSTEM'
        },
        eventType: eventType,
        resourceType: 'abvnApplication',
        resourceId: context.params.pushId, // The unique key of the application
        changes: {},
        metadata: {
            source: 'cloud_function_rtdb_trigger',
            clientProvidedRecaptcha: context.recaptchaResponse // From the original data
        }
    };

    if (eventType === 'APPLICATION_CREATED') {
        auditEntry.changes.newValue = change.after.val();
        // Remove sensitive reCAPTCHA response from actual application data if not needed
        if (auditEntry.changes.newValue.recaptchaResponse) {
            delete auditEntry.changes.newValue.recaptchaResponse;
        }
    } else if (eventType === 'APPLICATION_UPDATED') {
        auditEntry.changes.oldValue = change.before.val();
        auditEntry.changes.newValue = change.after.val();
        // Remove reCAPTCHA response from audit if not part of the update logic
        if (auditEntry.changes.newValue.recaptchaResponse) {
            delete auditEntry.changes.newValue.recaptchaResponse;
        }
        if (auditEntry.changes.oldValue.recaptchaResponse) {
            delete auditEntry.changes.oldValue.recaptchaResponse;
        }
    } else if (eventType === 'APPLICATION_DELETED') {
        auditEntry.changes.oldValue = change.before.val();
    }

    try {
        await auditLogRef.push(auditEntry);
        console.log(`Audit log for ${eventType} written successfully for application ${context.params.pushId}`);
    } catch (error) {
        console.error(`Error writing audit log for ${eventType} on application ${context.params.pushId}:`, error);
        // Implement error alerting here (e.g., to Sentry, PagerDuty)
    }
}

/**
 * Triggered when data is created, updated, or deleted under 'abvnApplications/pendingABVN/{pushId}'
 */
exports.auditApplicationChanges = functions.database.ref('/abvnApplications/pendingABVN/{pushId}')
    .onWrite(async (change, context) => {
        const afterData = change.after.val(); // Data after the write
        const beforeData = change.before.val(); // Data before the write

        const eventType = !change.before.exists() ? 'APPLICATION_CREATED' :
                          !change.after.exists() ? 'APPLICATION_DELETED' :
                          'APPLICATION_UPDATED';

        console.log(`Detected ${eventType} for application ${context.params.pushId}`);

        // IMPORTANT: Verify reCAPTCHA server-side for new submissions
        if (eventType === 'APPLICATION_CREATED' && afterData.recaptchaResponse) {
            const recaptchaToken = afterData.recaptchaResponse;
            const secretKey = functions.config().recaptcha.secret_key; // Set this in Firebase config
            const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;

            try {
                const response = await fetch(verifyUrl);
                const data = await response.json();

                if (!data.success) {
                    console.warn(`reCAPTCHA verification failed for application ${context.params.pushId}:`, data['error-codes']);
                    await logAudit('RECAPTCHA_VERIFICATION_FAILED', change, { ...context, authType: 'unauthenticated_client_request' });
                    return null; // Stop further processing if verification fails
                }
                console.log(`reCAPTCHA verification successful for application ${context.params.pushId}`);
            } catch (error) {
                console.error(`Error verifying reCAPTCHA for application ${context.params.pushId}:`, error);
                await logAudit('RECAPTCHA_VERIFICATION_ERROR', change, { ...context, authType: 'unauthenticated_client_request', error: error.message });
                return null; // Stop further processing on error
            }
        }

        // Now, log the audit event for the actual data change
        await logAudit(eventType, change, {
            ...context,
            authType: context.auth ? 'authenticated_user' : 'unauthenticated_client_request'
        });

        return null;
    });