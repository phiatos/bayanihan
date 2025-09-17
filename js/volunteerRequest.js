// volunteerRequest.js
// const firebaseConfig = {
//     apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
//     authDomain: "bayanihan-5ce7e.firebaseapp.com",
//     databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "bayanihan-5ce7e",
//     storageBucket: "bayanihan-5ce7e.appspot.com",
//     messagingSenderId: "593123849917",
//     appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
//     measurementId: "G-ZTQ9VXXVV0",
// };
const firebaseConfig = {
  apiKey: "AIzaSyBkmXOJvnlBtzkjNyR6wyd9BgGM0BhN0L8",
  authDomain: "bayanihan-new-472410.firebaseapp.com",
  projectId: "bayanihan-new-472410",
  storageBucket: "bayanihan-new-472410.firebasestorage.app",
  messagingSenderId: "995982574131",
  appId: "1:995982574131:web:3d45e358fad330c276d946",
  measurementId: "G-CEVPTQZM9C",
  databaseURL: "https://bayanihan-new-472410-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// ==== SweetAlert2 Templates ====
// Error popup
function showError(message = 'Please correct the errors in the form and try again.') {
    Swal.fire({ 
        icon: 'error',
        title: 'Validation Failed',
        text: message,
        confirmButtonText: 'OK',
        customClass: {
            popup: 'swal2-popup-error-clean',
            title: 'swal2-title-error-clean',
            htmlContainer: 'swal2-text-error-clean',
            confirmButton: 'my-error-button'
        }
    });
}

// Warning popup
function showWarning(message = 'Something went wrong.') {
    Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: message,
        confirmButtonText: 'OK',
        customClass: {
            popup: 'swal2-popup-warning-clean',
            title: 'swal2-title-warning-clean',
            htmlContainer: 'swal2-text-warning-clean',
            confirmButton: 'my-warning-button'
        }
    });
}

// Success popup
function showSuccess(title = 'Success!', message = 'Action completed successfully!') {
    Swal.fire({
        icon: 'success',
        title,
        text: message,
        confirmButtonText: 'OK',
        customClass: {
            popup: 'swal2-popup-success-clean',
            title: 'swal2-title-success-clean',
            htmlContainer: 'swal2-text-success-clean',
            confirmButton: 'my-success-button'
        }
    });
}


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
        const sortDropdown = document.getElementById('sortStatus');

        const isEmpty = (value) => value.trim() === "";

        // Real-time skill selection validation
        const skillCheckboxes = document.querySelectorAll('input[name="neededSkills"]');
        skillCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const selectedSkills = Array.from(skillCheckboxes).filter(c => c.checked).length;
                if (selectedSkills > 5) {
                    cb.checked = false;
                    showWarning('You can only request up to 5 skills.');
                }
            });
        });

        // If editing, change button text to indicate update
        if (needsForm.dataset.requestId) {
            submitButton.textContent = 'Update Request';
        } else {
            submitButton.textContent = 'Save Needs';
        }

        // Disable past dates
        const today = new Date().toISOString().split("T")[0];
        taskStartDateInput.setAttribute("min", today);
        taskEndDateInput.setAttribute("min", today);

        // Optional: make sure End Date >= Start Date
        taskStartDateInput.addEventListener("change", (e) => {
            taskEndDateInput.setAttribute("min", e.target.value);
        });

        // === Field Error Helpers (renamed to avoid clash) ===
        function showFieldError(inputField, message) {
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
                showFieldError(input, 'Other Skills description must not exceed 500 characters.');
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
                showFieldError(taskStartDateInput, "Start date cannot be in the past.");
                isValid = false;
            }

            if (endDate < startDate) {
                showFieldError(taskEndDateInput, "End date cannot be before start date.");
                isValid = false;
            }

            if (taskStartDateInput.value === taskEndDateInput.value) {
                const startTime = new Date(`1970-01-01T${taskTimeStartInput.value}`);
                const endTime = new Date(`1970-01-01T${taskTimeEndInput.value}`);

                const diffMs = endTime - startTime;
                const diffHrs = diffMs / (1000 * 60 * 60); // convert ms to hours

                if (diffHrs < 1) {
                    showFieldError(taskTimeEndInput, "End time must be at least 1 hour after start time for same-day tasks.");
                    isValid = false;
                }
            }

            return isValid;
        }

        [taskStartDateInput, taskEndDateInput, taskTimeStartInput, taskTimeEndInput].forEach(input => {
            input.addEventListener("input", validateDatesAndTimes);
        });

        async function validateFormForSubmission(currentRequestId = null) {
            let isValid = true;
            const errors = [];

            const skillCheckboxes = document.querySelectorAll('input[name="neededSkills"]:checked');
            const selectedSkills = Array.from(skillCheckboxes).map(cb => cb.value);

            if (selectedSkills.length < 1 && isEmpty(otherSkillsTextarea.value.trim())) {
                errors.push('Please select at least 1 skill or specify other skills.');
                isValid = false;
            }

            if (selectedSkills.length > 5) {
                errors.push('You can only request up to 5 skills.');
                isValid = false;
            }

            if (otherSkillsTextarea.value.trim().length > 500) {
                showFieldError(otherSkillsTextarea, 'Other Skills description must not exceed 500 characters.');
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

                snapshot.forEach(childSnapshot => {
                    const requestId = childSnapshot.key;
                    if (currentRequestId && requestId === currentRequestId) return; // ignore self when editing

                    const request = childSnapshot.val();
                    const existingSkills = request.skills || [];
                    const existingOtherSkills = request.otherSkillComments || '';
                    const isSameSkills = selectedSkills.length === existingSkills.length &&
                        selectedSkills.every(skill => existingSkills.includes(skill)) &&
                        otherSkillsTextarea.value.trim() === existingOtherSkills;

                    if (isSameSkills) {
                        errors.push('This exact combination of skills has already been requested by your group.');
                        isValid = false;
                    }
                });
            }

            return { isValid, errors };
        }

        // === Submit Listener ===
        needsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            isSubmitting = true;

            try {
                const user = auth.currentUser;
                if (!user) {
                    showError('Please log in to submit volunteer needs.');
                    return;
                }

                const requestId = needsForm.dataset.requestId || null;
                const { isValid, errors } = await validateFormForSubmission(requestId);
                if (!isValid) {
                    showError(errors.join('\n'));
                    return;
                }

                const needsData = {
                    taskName: document.getElementById("taskName").value.trim(),
                    volunteersNeeded: Number(document.getElementById("volunteersNeeded").value),
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

                if (requestId) {
                    // Update existing request
                    await database.ref(`volunteerGroups/${user.uid}/volunteerNeeds/${requestId}`).update(needsData);
                    await database.ref(`volunteerRequests/${requestId}`).update({ abvnId: user.uid, abvnName, ...needsData });
                    showSuccess("Updated!", "Your volunteer request has been updated successfully!");

                    // Add notif for admin
                    const notificationRef = database.ref('notifications').push();
                    await notificationRef.set({
                        type: "admin",
                        abvnId: user.uid,
                        abvnName,
                        requestId,
                        taskName: needsData.taskName,
                        message: `${abvnName} updated their volunteer request: ${needsData.taskName}`,
                        status: "unread",
                        timestamp: new Date().toISOString()
                    });
                } else {
                    // New request
                    const newRequestRef = database.ref(`volunteerGroups/${user.uid}/volunteerNeeds`).push();
                    const newRequestId = newRequestRef.key;
                    await newRequestRef.set(needsData);
                    await database.ref(`volunteerRequests/${newRequestId}`).set({ abvnId: user.uid, abvnName, ...needsData });
                    showSuccess("Success!", "Volunteer needs submitted successfully!");

                    // Add notif for admin
                    const notificationRef = database.ref('notifications').push();
                    await notificationRef.set({
                        type: "admin",
                        abvnId: user.uid,
                        abvnName,
                        requestId: newRequestId,
                        taskName: needsData.taskName,
                        message: `${abvnName} submitted a new volunteer request: ${needsData.taskName}`,
                        status: "unread",
                        timestamp: new Date().toISOString()
                    });
                }

                needsForm.reset();
                submitButton.textContent = 'Save Needs';
                delete needsForm.dataset.requestId;

                Array.from(needsForm.querySelectorAll('.error-message')).forEach(msg => msg.textContent = '');
                Array.from(needsForm.querySelectorAll('.error')).forEach(input => input.classList.remove('error'));

                loadTabContent('my-requests'); // refresh list

            } catch (error) {
                console.error("Error adding volunteer needs: ", error);
                showError('There was an error submitting your request.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Save Needs';
                isSubmitting = false;
            }
        });
    }

    // ========== Tab Loading ==========
    function loadTabContent(tab) {
        tabContent.innerHTML = '';

            if (tab === 'submit-request') {
                tabContent.innerHTML = document.getElementById('submit-request-template').innerHTML;
                attachSubmitListener();
            } else if (tab === 'my-requests') {
            tabContent.innerHTML = document.getElementById('my-requests-template').innerHTML;

            // Container for request cards
            const requestsListContainer = document.createElement('div');
            requestsListContainer.className = 'requests-list-container';
            tabContent.appendChild(requestsListContainer);

            // Counter
            const counter = document.createElement('p');
            counter.id = 'requests-counter';
            tabContent.insertBefore(counter, requestsListContainer);

            const user = auth.currentUser;
            if (!user) return;

            const sortDropdown = document.getElementById('sortStatus'); // if exists in template

            database.ref(`volunteerGroups/${user.uid}/volunteerNeeds`).once('value').then(snapshot => {
                const statusOrder = ["Pending", "In Progress", "Completed", "Incomplete", "Rejected"];
                const requestsArray = [];

                snapshot.forEach(childSnapshot => {
                    const req = childSnapshot.val();
                    const reqId = childSnapshot.key;
                    requestsArray.push({ reqId, ...req });
                });

                function renderRequests(sortedBy = null) {
                    requestsListContainer.innerHTML = '';

                    let sortedArray = [...requestsArray];

                    // Sort by selected status on top
                    if (sortedBy) {
                        sortedArray.sort((a, b) => {
                            if (a.status === sortedBy && b.status !== sortedBy) return -1;
                            if (b.status === sortedBy && a.status !== sortedBy) return 1;
                            return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
                        });
                    } else {
                        sortedArray.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
                    }

                    // Render cards
                    sortedArray.forEach(req => {
                        const card = document.createElement('div');
                        card.className = 'request-card';
                        card.setAttribute('data-request-id', req.reqId);

                        const timestamp = new Date(req.submissionDateTime).toLocaleString();
                        const skillsStr = req.skills.join(', ') + (req.otherSkillComments ? ', ' + req.otherSkillComments : '');
                        const cssStatusClass = req.status.replace(/\s+/g, '');

                        card.innerHTML = `
                            <div class="card-header">
                                <h3 class="card-title">${req.taskName}</h3>
                                <span class="card-status status-${cssStatusClass}">${req.status}</span>
                            </div>
                            <div class="card-body">
                                <div class="card-body-wrapper">
                                    <div class="left-column">
                                        <p><strong>Volunteers Needed:</strong> ${req.volunteersNeeded}</p>
                                        <p><strong>Dates:</strong> ${req.taskStartDate} to ${req.taskEndDate}</p>
                                        <p><strong>Skills:</strong> ${skillsStr}</p>
                                        <p><strong>Submitted On:</strong> ${timestamp}</p>
                                    </div>
                                    <div class="right-column">
                                        <div class="request-actions">
                                            <button class="edit-request-btn"><i class='bx bx-edit'></i></button>
                                            <button class="cancel-request-btn"><i class='bx bx-trash-alt'></i></button> 
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        requestsListContainer.appendChild(card);

                        // Cancel button logic
                        const cancelBtn = card.querySelector('.cancel-request-btn');
                        if (req.status === "In Progress" || req.assigned > 0 || req.status === "Rejected" || req.status === "Completed") {
                            cancelBtn.disabled = true;
                            cancelBtn.style.backgroundColor = '#ccc';
                            cancelBtn.style.color = '#666';
                            cancelBtn.innerHTML = "<i class='bx bx-trash-alt'></i>";
                        } else {
                            cancelBtn.disabled = false;
                            cancelBtn.style.backgroundColor = '';
                            cancelBtn.style.color = '';
                            cancelBtn.innerHTML = "<i class='bx bx-trash-alt'></i>";
                        }

                        cancelBtn.addEventListener('click', async () => {
                            if (cancelBtn.disabled) {
                                showWarning("This request cannot be cancelled because it is already in progress or volunteers have been assigned.");
                                return;
                            }

                            const confirmResult = await Swal.fire({
                                title: 'Are you sure?',
                                text: "This will cancel your volunteer request.",
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: "Yes",
                                cancelButtonText: "No",
                                reverseButtons: true,
                                customClass: {
                                    popup: 'swal2-popup-warning-clean',
                                    title: 'swal2-title-warning-clean',
                                    htmlContainer: 'swal2-text-warning-clean',
                                    confirmButton: 'my-warning-button',
                                    cancelButton: 'custom-cancel-btn'
                                },
                            });

                            if (confirmResult.isConfirmed) {
                                try {
                                    await database.ref(`volunteerGroups/${user.uid}/volunteerNeeds/${req.reqId}`).remove();
                                    await database.ref(`volunteerRequests/${req.reqId}`).remove();
                                    showSuccess('Cancelled!', 'Your volunteer request has been cancelled.');
                                    renderRequests(sortDropdown?.value || null);
                                } catch (error) {
                                    console.error(error);
                                    showError('Failed to cancel request.');
                                }
                            }
                        });

                        // Edit button logic
                        const editBtn = card.querySelector('.edit-request-btn');
                        if (req.status === "In Progress" || req.assigned > 0 || req.status === "Rejected" || req.status === "Completed") {
                            editBtn.disabled = true;
                            editBtn.style.backgroundColor = '#ccc';
                            editBtn.style.color = '#666';
                            editBtn.innerHTML = "<i class='bx bx-edit'></i>";
                        } else {
                            editBtn.disabled = false;
                            editBtn.style.backgroundColor = '';
                            editBtn.style.color = '';
                            editBtn.innerHTML = "<i class='bx bx-edit'></i>";
                        }

                        editBtn.addEventListener('click', () => {
                            if (editBtn.disabled) {
                                showWarning("This request cannot be edited because it is already in progress or volunteers have been assigned.");
                                return;
                            }

                            document.querySelector('.tab-btn[data-tab="submit-request"]').click();
                            setTimeout(() => {
                                const needsForm = document.getElementById('abvn-needs-form');
                                if (!needsForm) return;

                                needsForm.querySelector('#taskName').value = req.taskName;
                                needsForm.querySelector('#volunteersNeeded').value = req.volunteersNeeded;
                                needsForm.querySelector('#taskStartDate').value = req.taskStartDate;
                                needsForm.querySelector('#taskEndDate').value = req.taskEndDate;
                                needsForm.querySelector('#taskTimeStart').value = req.taskTimeStart;
                                needsForm.querySelector('#taskTimeEnd').value = req.taskTimeEnd;
                                needsForm.querySelector('#otherNeededSkills').value = req.otherSkillComments || '';
                                needsForm.querySelectorAll('input[name="neededSkills"]').forEach(cb => {
                                    cb.checked = req.skills.includes(cb.value);
                                });
                                needsForm.dataset.requestId = req.reqId;
                            }, 100);
                        });
                    });

                    // Update counter after all cards rendered
                    counter.textContent = `Total of ${sortedArray.length} Request${sortedArray.length !== 1 ? 's' : ''}`;
                }

                // Initial render
                renderRequests();

                // Sort dropdown listener
                if (sortDropdown) {
                    sortDropdown.addEventListener('change', () => {
                        renderRequests(sortDropdown.value);
                    });
                }
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
