const firebaseConfig = {
    apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    authDomain: "bayanihan-5ce7e.firebaseapp.com",
    databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bayanihan-5ce7e",
    storageBucket: "bayanihan-5ce7e.appspot.com",
    messagingSenderId: "593123849917",
    appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    measurementId: "G-ZTQ9VXXVV0",
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
    const needsForm = document.getElementById('abvn-needs-form');
    const otherSkillsTextarea = document.getElementById('otherNeededSkills');
    const submitButton = document.querySelector('.btn-primary');
    let isSubmitting = false;

    const isEmpty = (value) => value.trim() === "";

    function showError(inputField, message) {
        const errorDiv = inputField.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('error-message')) {
            const newErrorDiv = document.createElement('div');
            newErrorDiv.className = 'error-message';
            inputField.parentNode.insertBefore(newErrorDiv, inputField.nextSibling);
            newErrorDiv.textContent = message;
        } else {
            errorDiv.textContent = message;
        }
        inputField.classList.add('error');
    }

    function clearError(inputField) {
        const errorDiv = inputField.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error-message')) {
            errorDiv.textContent = '';
        }
        inputField.classList.remove('error');
    }

    function validateInputInRealTime(input) {
        clearError(input);
        if (!isEmpty(input.value) && input.value.length > 500) {
            showError(input, 'Other Skills description must not exceed 500 characters.');
        }
    }

    if (otherSkillsTextarea) {
        otherSkillsTextarea.addEventListener('input', () => {
            validateInputInRealTime(otherSkillsTextarea);
        });
    }

    async function validateFormForSubmission() {
        let isValid = true;
        const errors = [];

        const skillCheckboxes = document.querySelectorAll('input[name="neededSkills"]:checked');
        const selectedSkills = Array.from(skillCheckboxes).map(checkbox => checkbox.value);
        if (selectedSkills.length < 1 && isEmpty(otherSkillsTextarea.value)) {
            errors.push('Please select at least one skill or specify other skills.');
            isValid = false;
        }

        if (!isEmpty(otherSkillsTextarea.value)) {
            if (otherSkillsTextarea.value.length > 500) {
                showError(otherSkillsTextarea, 'Other Skills description must not exceed 500 characters.');
                errors.push('Other Skills description must not exceed 500 characters.');
                isValid = false;
            }
        }

        const user = auth.currentUser;
        if (user) {
            const skillRequestsRef = database.ref(`volunteerGroups/${user.uid}/volunteerNeeds`);
            const snapshot = await skillRequestsRef.once('value');
            let skillsAlreadyRequested = false;

            snapshot.forEach(childSnapshot => {
                const request = childSnapshot.val();
                const existingSkills = request.skills || [];
                const existingOtherSkills = request.otherSkillComments || '';
                const isSameSkills = selectedSkills.length === existingSkills.length &&
                    selectedSkills.every(skill => existingSkills.includes(skill)) &&
                    otherSkillsTextarea.value.trim() === existingOtherSkills;
                if (isSameSkills) {
                    skillsAlreadyRequested = true;
                }
            });

            if (skillsAlreadyRequested) {
                errors.push('This exact combination of skills has already been requested by your group.');
                isValid = false;
            }
        }

        return { isValid, errors };
    }

    if (needsForm) {
        needsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (isSubmitting) {
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            isSubmitting = true;

            try {
                const user = auth.currentUser;
                if (!user) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Authentication Required',
                        text: 'Please log in to submit volunteer needs.',
                        showConfirmButton: true,
                        confirmButtonText: 'OK'
                    });
                    submitButton.disabled = false;
                    submitButton.textContent = 'Save Needs';
                    isSubmitting = false;
                    return;
                }

                const { isValid, errors } = await validateFormForSubmission();
                if (!isValid) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Input',
                        html: errors.join('<br>'),
                        showConfirmButton: true,
                        confirmButtonText: 'OK'
                    });
                    submitButton.disabled = false;
                    submitButton.textContent = 'Save Needs';
                    isSubmitting = false;
                    return;
                }

                // Collect request data
                const taskNameInput = document.getElementById("taskName");
                const volunteersNeededInput = document.getElementById("volunteersNeeded");

                const needsData = {
                    taskName: taskNameInput.value.trim(), // <- add taskName
                    volunteersNeeded: Number(volunteersNeededInput.value), // <- add volunteersNeeded
                    skills: Array.from(document.querySelectorAll('input[name="neededSkills"]:checked')).map(cb => cb.value),
                    otherSkillComments: otherSkillsTextarea.value.trim(),
                    submittedBy: user.uid,
                    submissionDateTime: new Date().toISOString(),
                    assigned: 0, // initialize assigned volunteers
                    status: "Pending"
                };

                // Get ABVN Name from volunteerGroups
                const abvnSnapshot = await database.ref(`volunteerGroups/${user.uid}/organization`).once("value");
                const abvnName = abvnSnapshot.exists() ? abvnSnapshot.val() : "Unknown ABVN";

                // Generate a shared key for both nodes
                const newRequestRef = database.ref(`volunteerGroups/${user.uid}/volunteerNeeds`).push();
                const requestId = newRequestRef.key;

                // Save under volunteerGroups
                await newRequestRef.set(needsData);

                // Save under global volunteerRequests with same ID
                await database.ref(`volunteerRequests/${requestId}`).set({
                    abvnId: user.uid,
                    abvnName,
                    ...needsData
                });

                Swal.fire({
                    title: 'Success!',
                    text: 'Volunteer needs submitted successfully!',
                    icon: 'success',
                    confirmButtonText: 'OK'
                });

                needsForm.reset();
                Array.from(needsForm.querySelectorAll('.error-message')).forEach(msg => msg.textContent = '');
                Array.from(needsForm.querySelectorAll('.error')).forEach(input => input.classList.remove('error'));

            } catch (error) {
                console.error("Error adding volunteer needs to Realtime Database: ", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'There was an error submitting your request. Please try again.',
                    confirmButtonText: 'OK'
                });
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Save Needs';
                isSubmitting = false;
            }
        });
    }
});
