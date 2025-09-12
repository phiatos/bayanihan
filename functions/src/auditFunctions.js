const admin = require('firebase-admin');
const { onValueWritten } = require('firebase-functions/v2/database');
const fetch = require('node-fetch');

const db = admin.database();

async function logAudit(eventType, change, context) {
    const auditLogRef = db.ref('auditLogs/applications');

    const auditEntry = {
        timestamp: admin.database.ServerValue.TIMESTAMP,
        actor: {
            uid: context.auth ? context.auth.uid : 'anonymous',
            type: context.authType || 'unauthenticated_client_request'
        },
        eventType: eventType,
        resourceType: 'abvnApplication',
        resourceId: context.params.pushId,
        changes: {},
        metadata: {
            source: 'cloud_function_rtdb_trigger',
            clientProvidedRecaptcha: context.recaptchaResponse
        }
    };

    if (eventType === 'APPLICATION_CREATED') {
        auditEntry.changes.newValue = change.after.val();
        if (auditEntry.changes.newValue.recaptchaResponse) {
            delete auditEntry.changes.newValue.recaptchaResponse;
        }
    } else if (eventType === 'APPLICATION_UPDATED') {
        auditEntry.changes.oldValue = change.before.val();
        auditEntry.changes.newValue = change.after.val();
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
    }
}

/**
 * Triggered when data is created, updated, or deleted under 'abvnApplications/pendingABVN/{pushId}'
 *
 * This is the corrected syntax for a v2 Realtime Database trigger with explicit instance and region.
 */
exports.auditApplicationChanges = onValueWritten({
    region: 'asia-southeast1',
    instance: 'bayanihan-5ce7e-default-rtdb',
    ref: '/abvnApplications/pendingABVN/{pushId}'
}, async (event) => {
    const change = event.data;
    const afterData = change.after.val();
    const beforeData = change.before.val();
    const context = event;

    const eventType = !change.before.exists() ? 'APPLICATION_CREATED' :
        !change.after.exists() ? 'APPLICATION_DELETED' :
        'APPLICATION_UPDATED';

    console.log(`Detected ${eventType} for application ${context.params.pushId}`);

    if (eventType === 'APPLICATION_CREATED' && afterData.recaptchaResponse) {
        const recaptchaToken = afterData.recaptchaResponse;
        const secretKey = functions.config().recaptcha.secret_key;
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;

        try {
            const response = await fetch(verifyUrl);
            const data = await response.json();

            if (!data.success) {
                console.warn(`reCAPTCHA verification failed for application ${context.params.pushId}:`, data['error-codes']);
                await logAudit('RECAPTCHA_VERIFICATION_FAILED', change, { ...context, authType: 'unauthenticated_client_request' });
                return;
            }
            console.log(`reCAPTCHA verification successful for application ${context.params.pushId}`);
        } catch (error) {
            console.error(`Error verifying reCAPTCHA for application ${context.params.pushId}:`, error);
            await logAudit('RECAPTCHA_VERIFICATION_ERROR', change, { ...context, authType: 'unauthenticated_client_request', error: error.message });
            return;
        }
    }

    await logAudit(eventType, change, {
        ...context,
        authType: context.auth ? 'authenticated_user' : 'unauthenticated_client_request'
    });
});