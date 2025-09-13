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
    let isSubmitting = false;

    // =================== TAB SWITCHING ===================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContent = document.getElementById('tab-content');

    function attachSubmitListener() {
        const needsForm = document.getElementById('abvn-needs-form');
        if (!needsForm) return;

        const submitButton = needsForm.querySelector('.btn-primary');
        const otherSkillsTextarea = document.getElementById('otherNeededSkills');
        const taskStartDateInput = document.getElementById("taskStartDate");
        const taskEndDateInput = document.getElementById("taskEndDate");
        const taskTimeStartInput = document.getElementById("taskTimeStart");
        const taskTimeEndInput = document.getElementById("taskTimeEnd");

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

        function validateDatesAndTimes() {
            let isValid = true;
            const today = new Date();
            today.setHours(0,0,0,0);

            const startDate = new Date(taskStartDateInput.value);
            const endDate = new Date(taskEndDateInput.value);

            clearError(taskStartDateInput);
            clearError(taskEndDateInput);
            clearError(taskTimeStartInput);
            clearError(taskTimeEndInput);

            if (startDate < today) {
                showError(taskStartDateInput, "Start date cannot be in the past.");
                isValid = false;
            }

            if (endDate < startDate) {
                showError(taskEndDateInput, "End date cannot be before start date.");
                isValid = false;
            }

            if (taskStartDateInput.value === taskEndDateInput.value && taskTimeEndInput.value <= taskTimeStartInput.value) {
                showError(taskTimeEndInput, "End time must be after start time for same-day tasks.");
                isValid = false;
            }

            return isValid;
        }

        [taskStartDateInput, taskEndDateInput, taskTimeStartInput, taskTimeEndInput].forEach(input => {
            input.addEventListener("input", validateDatesAndTimes);
        });

        async function validateFormForSubmission() {
            let isValid = true;
            const errors = [];

            const skillCheckboxes = document.querySelectorAll('input[name="neededSkills"]:checked');
            const selectedSkills = Array.from(skillCheckboxes).map(cb => cb.value);
            if (selectedSkills.length < 1 && isEmpty(otherSkillsTextarea.value)) {
                errors.push('Please select at least one skill or specify other skills.');
                isValid = false;
            }

            if (!isEmpty(otherSkillsTextarea.value) && otherSkillsTextarea.value.length > 500) {
                showError(otherSkillsTextarea, 'Other Skills description must not exceed 500 characters.');
                errors.push('Other Skills description must not exceed 500 characters.');
                isValid = false;
            }

            if (!validateDatesAndTimes()) {
                errors.push('Please fix the date/time errors.');
                isValid = false;
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
                    if (isSameSkills) skillsAlreadyRequested = true;
                });

                if (skillsAlreadyRequested) {
                    errors.push('This exact combination of skills has already been requested by your group.');
                    isValid = false;
                }
            }

            return { isValid, errors };
        }

        function isVolunteerAvailableForTask(volunteerAvailability, taskStartDate, taskEndDate, taskTimeStart, taskTimeEnd) {
            let currentDate = new Date(taskStartDate);
            const endDate = new Date(taskEndDate);

            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const availableToday = volunteerAvailability.some(slot =>
                    slot.date === dateStr &&
                    slot.startTime <= taskTimeStart &&
                    slot.endTime >= taskTimeEnd
                );

                if (!availableToday) return false;
                currentDate.setDate(currentDate.getDate() + 1);
            }

            return true;
        }

        async function findMatchingVolunteers(needsData) {
            const volunteersRef = database.ref('volunteers'); 
            const snapshot = await volunteersRef.once('value');
            const matchingVolunteers = [];

            snapshot.forEach(childSnapshot => {
                const volunteer = childSnapshot.val();
                const volunteerSkills = volunteer.skills || [];
                const volunteerAvailability = volunteer.availability || []; 

                const skillMatch = needsData.skills.some(skill => volunteerSkills.includes(skill)) ||
                                   (needsData.otherSkillComments && volunteerSkills.includes(needsData.otherSkillComments));

                if (!skillMatch) return;

                const isAvailable = isVolunteerAvailableForTask(
                    volunteerAvailability,
                    needsData.taskStartDate,
                    needsData.taskEndDate,
                    needsData.taskTimeStart,
                    needsData.taskTimeEnd
                );

                if (isAvailable) matchingVolunteers.push({ id: childSnapshot.key, ...volunteer });
            });

            return matchingVolunteers;
        }

        needsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            isSubmitting = true;

            try {
                const user = auth.currentUser;
                if (!user) {
                    Swal.fire({ icon: 'error', title: 'Authentication Required', text: 'Please log in to submit volunteer needs.' });
                    submitButton.disabled = false;
                    submitButton.textContent = 'Save Needs';
                    isSubmitting = false;
                    return;
                }

                const { isValid, errors } = await validateFormForSubmission();
                if (!isValid) {
                    Swal.fire({ icon: 'error', title: 'Invalid Input', html: errors.join('<br>') });
                    submitButton.disabled = false;
                    submitButton.textContent = 'Save Needs';
                    isSubmitting = false;
                    return;
                }

                const taskNameInput = document.getElementById("taskName");
                const volunteersNeededInput = document.getElementById("volunteersNeeded");

                const needsData = {
                    taskName: taskNameInput.value.trim(),
                    volunteersNeeded: Number(volunteersNeededInput.value),
                    skills: Array.from(document.querySelectorAll('input[name="neededSkills"]:checked')).map(cb => cb.value),
                    otherSkillComments: otherSkillsTextarea.value.trim(),
                    taskStartDate: taskStartDateInput.value,
                    taskEndDate: taskEndDateInput.value,
                    taskTimeStart: taskTimeStartInput.value,
                    taskTimeEnd: taskTimeEndInput.value,
                    submittedBy: user.uid,
                    submissionDateTime: new Date().toISOString(),
                    assigned: 0,
                    status: "Pending"
                };

                const abvnSnapshot = await database.ref(`volunteerGroups/${user.uid}/organization`).once("value");
                const abvnName = abvnSnapshot.exists() ? abvnSnapshot.val() : "Unknown ABVN";

                const newRequestRef = database.ref(`volunteerGroups/${user.uid}/volunteerNeeds`).push();
                const requestId = newRequestRef.key;

                await newRequestRef.set(needsData);
                await database.ref(`volunteerRequests/${requestId}`).set({ abvnId: user.uid, abvnName, ...needsData });

                const matchingVolunteers = await findMatchingVolunteers(needsData);
                console.log("Matching Volunteers:", matchingVolunteers);

                Swal.fire({
                    title: 'Success!',
                    text: 'Volunteer needs submitted successfully!',
                    icon: 'success',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                        confirmButton: 'my-success-button'
                    }
                });

                needsForm.reset();
                Array.from(needsForm.querySelectorAll('.error-message')).forEach(msg => msg.textContent = '');
                Array.from(needsForm.querySelectorAll('.error')).forEach(input => input.classList.remove('error'));

            } catch (error) {
                console.error("Error adding volunteer needs: ", error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'There was an error submitting your request.' });
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Save Needs';
                isSubmitting = false;
            }
        });
    }

    function loadTabContent(tab) {
        tabContent.innerHTML = '';

        if (tab === 'submit-request') {
            tabContent.innerHTML = document.getElementById('submit-request-template').innerHTML;
            attachSubmitListener(); // Attach listener after DOM injection
        } else if (tab === 'my-requests') {
            tabContent.innerHTML = document.getElementById('my-requests-template').innerHTML;

            const user = auth.currentUser;
            if (!user) return;

            const requestsList = document.getElementById('abvn-requests-list');
            database.ref(`volunteerGroups/${user.uid}/volunteerNeeds`).once('value').then(snapshot => {
                requestsList.innerHTML = '';
                snapshot.forEach(childSnapshot => {
                    const req = childSnapshot.val();
                    const reqId = childSnapshot.key;

                    const div = document.createElement('div');
                    div.className = 'request-item';
                    div.innerHTML = `
                        <h4>${req.taskName}</h4>
                        <p>Volunteers Needed: ${req.volunteersNeeded}</p>
                        <p>Dates: ${req.taskStartDate} to ${req.taskEndDate}</p>
                        <p>Skills: ${req.skills.join(', ')} ${req.otherSkillComments ? ', ' + req.otherSkillComments : ''}</p>
                        <p>Status: ${req.status}</p>
                        <button class="cancel-request-btn" data-id="${reqId}">Cancel Request</button>
                        <hr>
                    `;
                    requestsList.appendChild(div);
                });

                // Cancel button listeners
                const cancelButtons = document.querySelectorAll('.cancel-request-btn');
                cancelButtons.forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const requestId = btn.dataset.id;
                        const confirmResult = await Swal.fire({
                            title: 'Are you sure?',
                            text: "This will cancel your volunteer request.",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#d33',
                            confirmButtonText: 'Yes, cancel it!'
                        });

                        if (confirmResult.isConfirmed) {
                            try {
                                await database.ref(`volunteerGroups/${user.uid}/volunteerNeeds/${requestId}`).remove();
                                await database.ref(`volunteerRequests/${requestId}`).remove();
                                Swal.fire('Cancelled!', 'Your volunteer request has been cancelled.', 'success');
                                loadTabContent('my-requests'); // Refresh list
                            } catch (error) {
                                console.error(error);
                                Swal.fire('Error', 'Failed to cancel request.', 'error');
                            }
                        }
                    });
                });
            });
        }
    }

    // Initial load
    loadTabContent('submit-request');

    // Tab buttons
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadTabContent(btn.dataset.tab);
        });
    });
});
