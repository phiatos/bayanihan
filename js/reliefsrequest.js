// console.log = function () {};
// console.error = function () {};
// console.warn = function () {};

// Notify admin function (defined globally within the file)
const notifyAdmin = async (message, calamityType, location, details, requestId, senderName, organization) => {
    try {
        const identifier = `request_${requestId}_${Date.now()}`;
        const key = firebase.database().ref("notifications").push().key;
        await firebase.database().ref("notifications").child(key).set({
            message,
            calamityType: calamityType || null,
            location: location || null,
            details: details || null,
            eventId: null,
            requestId,
            senderName,
            organization,
            identifier,
            timestamp: Date.now(),
            read: false,
            type: "admin"
        });
    } catch (error) {
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Firebase configuration
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

    // Initialize Firebase
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (error) {
    }
    const database = firebase.database();
    const auth = firebase.auth();

    // DOM elements
    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const itemsTable = document.getElementById('itemsTable');
    const previewContact = document.getElementById('previewContact');
    const previewItemsTable = document.getElementById('previewItemsTable');
    const contactPersonInput = document.getElementById('contactPerson');
    const contactNumberInput = document.getElementById('contactNumber');
    const emailInput = document.getElementById('email');
    const addressInput = document.getElementById('address');
    const donationCategoryInput = document.getElementById('category');
    const categorySelect = document.getElementById('category');
    const itemNameInput = document.getElementById('itemName');
    const quantityInput = document.getElementById('quantity');
    const notesInput = document.getElementById('notes');
    const addItemBtn = document.getElementById('addItemBtn');
    const itemsTableBody = document.querySelector('#itemsTable tbody');
    const noEntriesRow = document.getElementById('noEntriesRow');
    const tabButtons = document.querySelectorAll('.tab-button');
    const requestsListContainer = document.querySelector('.requests-list-container');

    // Edit modal elements (now in HTML)
    const editModal = document.getElementById('editModal');
    const closeEditBtn = editModal.querySelector('.closeEditBtn');
    const editForm = document.getElementById('editForm');
    const editItemsTableBody = editModal.querySelector('#editItemsTable tbody');
    const editAddItemBtn = document.getElementById('editAddItemBtn');
    const editCategorySelect = document.getElementById('editCategory');
    const editItemNameInput = document.getElementById('editItemName');
    const editQuantityInput = document.getElementById('editQuantity');
    const editNotesInput = document.getElementById('editNotes');

    const tabContents = {
        'requests': document.getElementById('form-main-content').querySelector('form'),
        'my-requests': document.getElementById('my-requests-tab')
    };
    
    document.getElementById('form-main-content').querySelector('form').style.display = 'block';

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            for (const key in tabContents) {
                tabContents[key].style.display = 'none';
            }
            button.classList.add('active');
            if (tabContents[tabName]) {
                tabContents[tabName].style.display = 'block';
            }
            if (tabName === 'my-requests') {
                fetchUserRequests();
            }
        });
    });

    function updateRequestCounter() {
        const counter = document.getElementById('requests-counter');
        if (!requestsListContainer || !counter) return;
        const count = requestsListContainer.querySelectorAll('.request-card').length;
        counter.textContent = `Total of ${count} Request${count !== 1 ? 's' : ''}`;
    }

    // Modified createRequestCard to add Edit/Cancel buttons for pending requests
    function createRequestCard(requestId, data) {
        const card = document.createElement('div');
        card.className = 'request-card';
        card.setAttribute('data-request-id', requestId);

        const timestamp = new Date(data.timestamp).toLocaleString();
        let itemsHtml = '';
        if (data.items && data.items.length > 0) {
            itemsHtml = data.items.map(item => `
                <li>
                    <strong>${item.name}:</strong> ${item.quantity}
                    ${item.notes && item.notes !== 'N/A' ? `<br><small>Notes: ${item.notes}</small>` : ''}
                </li>
            `).join('');
        } else {
            itemsHtml = '<li>No specific items listed.</li>';
        }

        let actionButtons = '';
        if (data.status === 'Pending') {
            actionButtons = `
                <button class="edit-btn" data-request-id="${requestId}">Edit</button>
                <button class="cancel-btn" data-request-id="${requestId}">Cancel</button>
            `;
        }

        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">Request for <span class="card-category">${data.category}</span></h3>
                <span class="card-status status-${data.status || 'Submitted'}">${data.status || 'SUBMITTED'}</span>
            </div>
            <div class="card-body">
                <div class="card-body-wrapper">
                    <div class="left-column">
                        <div class="contact-info">
                            <h4>Contact Details</h4>
                            <p><strong>Contact Person:</strong> <span class="contact-name">${data.contactPerson}</span></p>
                            <p><strong>Organization:</strong> <span class="contact-org">${data.volunteerOrganization || 'N/A'}</span></p>
                            <p><strong>Contact Number:</strong> <span class="contact-number">${data.contactNumber}</span></p>
                            <p><strong>Email:</strong> <span class="contact-email">${data.email}</span></p>
                        </div>
                        <div class="address-info">
                            <h4>Drop-off Location</h4>
                            <p><strong>Address:</strong> <span class="address-text">${data.address?.formattedAddress}</span></p>
                            <p><strong>Submitted On:</strong> <span class="timestamp-text">${timestamp}</span></p>
                        </div>
                        <div class="items-info">
                            <h4>Requested Items</h4>
                            <ul class="items-list">
                                ${itemsHtml}
                            </ul>
                        </div>
                    </div>
                    <div class="right-column">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;

        requestsListContainer.appendChild(card);
    }

    // Fetch user requests
    function fetchUserRequests() {
        const user = auth.currentUser;
        if (user) {
            const userUid = user.uid;
            const requestsRef = database.ref('requestRelief/requests');

            requestsRef.orderByChild('userUid').equalTo(userUid).once('value')
                .then((snapshot) => {
                    requestsListContainer.innerHTML = '';
                    if (snapshot.exists()) {
                        snapshot.forEach((childSnapshot) => {
                            const requestData = childSnapshot.val();
                            const requestId = childSnapshot.key;
                            createRequestCard(requestId, requestData);
                        });
                    } else {
                        requestsListContainer.innerHTML = `
                            <p style="text-align: center; color: #888; padding: 20px;">
                                No requests found. Submit a new request using the form.
                            </p>`;
                    }
                    updateRequestCounter();
                })
                .catch((error) => {
                    requestsListContainer.innerHTML = `
                        <p style="text-align: center; color: #dc3545; padding: 20px;">
                            Error loading requests. Please try again later.
                        </p>`;
                    updateRequestCounter();
                });
        } else {
            requestsListContainer.innerHTML = `
                <p style="text-align: center; color: #555; padding: 20px;">
                    Please log in to view your requests.
                </p>`;
            updateRequestCounter();
        }
    }

    document.querySelector('button[data-tab="my-requests"]').addEventListener('click', fetchUserRequests);

    // Edit functionality
    let currentEditItems = [];
    function updateEditState() {
        const isCategorySelected = editCategorySelect.value !== '';
        const isItemNameFilled = editItemNameInput.value.trim() !== '';
        const isQuantityFilled = editQuantityInput.value.trim() !== '' && Number(editQuantityInput.value) > 0;

        editItemNameInput.disabled = !isCategorySelected;
        editQuantityInput.disabled = !isCategorySelected;
        editNotesInput.disabled = !isCategorySelected;
        editAddItemBtn.disabled = !(isCategorySelected && isItemNameFilled && isQuantityFilled);
    }

    editCategorySelect.addEventListener('change', updateEditState);
    editItemNameInput.addEventListener('input', updateEditState);
    editQuantityInput.addEventListener('input', updateEditState);

    requestsListContainer.addEventListener('click', async (event) => {
        if (event.target.classList.contains('edit-btn')) {
            const requestId = event.target.dataset.requestId;
            editModal.dataset.requestId = requestId;
            const requestRef = database.ref(`requestRelief/requests/${requestId}`);
            
            try {
                const snapshot = await requestRef.once('value');
                const requestData = snapshot.val();
                
                // Populate edit form
                document.getElementById('editContactPerson').value = requestData.contactPerson;
                document.getElementById('editContactNumber').value = requestData.contactNumber;
                document.getElementById('editEmail').value = requestData.email;
                document.getElementById('editAddress').value = requestData.address.formattedAddress;
                document.getElementById('editCategory').value = requestData.category;
                
                // Populate items
                currentEditItems = [...(requestData.items || [])];
                editItemsTableBody.innerHTML = '';
                if (currentEditItems.length === 0) {
                    editItemsTableBody.innerHTML = '<tr><td colspan="4">No items added yet.</td></tr>';
                } else {
                    currentEditItems.forEach(item => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>${item.notes}</td>
                            <td><button class="delete-edit-item-btn">Delete</button></td>
                        `;
                        editItemsTableBody.appendChild(row);
                    });
                }
                
                updateEditState();
                editModal.style.display = 'flex';
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load request data.'
                });
            }
        } else if (event.target.classList.contains('cancel-btn')) {
            const requestId = event.target.dataset.requestId;
            Swal.fire({
                icon: 'warning',
                title: 'Cancel Request',
                text: 'Are you sure you want to cancel this request?',
                showCancelButton: true,
                confirmButtonText: 'Yes, Cancel',
                cancelButtonText: 'No'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await Promise.all([
                            database.ref(`requestRelief/requests/${requestId}`).update({ status: 'Cancelled' }),
                            database.ref(`users/${auth.currentUser.uid}/requests/${requestId}`).update({ status: 'Cancelled' })
                        ]);
                        await notifyAdmin(
                            `Relief request ${requestId} has been cancelled.`,
                            null, null, null, requestId, 
                            auth.currentUser.displayName || 'User',
                            volunteerOrganization || 'N/A'
                        );
                        fetchUserRequests();
                        Swal.fire({
                            icon: 'success',
                            title: 'Request Cancelled',
                            text: 'The request has been successfully cancelled.'
                        });
                    } catch (error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to cancel request.'
                        });
                    }
                }
            });
        }
    });

    // Edit form item handling
    editAddItemBtn.addEventListener('click', () => {
        if (editAddItemBtn.disabled) return;

        const newItem = {
            name: editItemNameInput.value.trim(),
            quantity: Number(editQuantityInput.value.trim()),
            notes: editNotesInput.value.trim() || 'N/A'
        };

        currentEditItems.push(newItem);
        if (editItemsTableBody.querySelector('tr td[colspan="4"]')) {
            editItemsTableBody.innerHTML = '';
        }
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${newItem.name}</td>
            <td>${newItem.quantity}</td>
            <td>${newItem.notes}</td>
            <td><button class="delete-edit-item-btn">Delete</button></td>
        `;
        editItemsTableBody.appendChild(newRow);

        editItemNameInput.value = '';
        editQuantityInput.value = '';
        editNotesInput.value = '';
        updateEditState();
    });

    editItemsTableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-edit-item-btn')) {
            const row = event.target.closest('tr');
            const itemName = row.children[0].textContent.trim();
            const quantity = Number(row.children[1].textContent.trim());
            const notes = row.children[2].textContent.trim();

            currentEditItems = currentEditItems.filter(item => 
                item.name !== itemName || 
                item.quantity !== quantity || 
                item.notes !== notes
            );
            row.remove();

            if (currentEditItems.length === 0) {
                editItemsTableBody.innerHTML = '<tr><td colspan="4">No items added yet.</td></tr>';
            }
        }
    });

    // Save edited request
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const requestId = editModal.dataset.requestId;
        if (!requestId) return;

        // Validation
        let valid = true;
        let messages = [];

        const contactPerson = document.getElementById('editContactPerson');
        if (contactPerson.value.trim() === '') {
            valid = false;
            messages.push('Organization Name is required.');
            markError(contactPerson, 'Organization Name is required.');
        }

        const contactNumber = document.getElementById('editContactNumber');
        const phoneRegex = /^[0-9]{11}$/;
        if (!phoneRegex.test(contactNumber.value.trim())) {
            valid = false;
            messages.push('Contact Number must be exactly 11 digits.');
            markError(contactNumber, 'Contact Number must be exactly 11 digits.');
        }

        const email = document.getElementById('editEmail');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value.trim())) {
            valid = false;
            messages.push('Valid email is required.');
            markError(email, 'Valid email is required.');
        }

        const address = document.getElementById('editAddress');
        if (address.value.trim() === '') {
            valid = false;
            messages.push('Drop-off Address is required.');
            markError(address, 'Drop-off Address is required.');
        }

        const category = document.getElementById('editCategory');
        if (!category.value) {
            valid = false;
            messages.push('Please select a Request Category.');
            markError(category, 'Please select a Request Category.');
        }

        if (currentEditItems.length === 0) {
            valid = false;
            messages.push('Please add at least one requested item.');
        }

        if (!valid) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                html: messages.join('<br>')
            });
            return;
        }

        const updatedRequest = {
            contactPerson: contactPerson.value.trim(),
            contactNumber: contactNumber.value.trim(),
            email: email.value.trim(),
            address: {
                formattedAddress: address.value.trim(),
                latitude: document.getElementById('latitude').value || null,
                longitude: document.getElementById('longitude').value || null
            },
            category: category.value,
            items: currentEditItems,
            status: 'Pending',
            volunteerOrganization,
            userUid: auth.currentUser.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        try {
            await Promise.all([
                database.ref(`requestRelief/requests/${requestId}`).set(updatedRequest),
                database.ref(`users/${auth.currentUser.uid}/requests/${requestId}`).set(updatedRequest)
            ]);
            await notifyAdmin(
                `Relief request ${requestId} has been updated.`,
                null, null, null, requestId, 
                updatedRequest.contactPerson,
                volunteerOrganization
            );
            editModal.style.display = 'none';
            fetchUserRequests();
            Swal.fire({
                icon: 'success',
                title: 'Request Updated',
                text: 'Your changes have been saved successfully.'
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to update request.'
            });
        }
    });

    closeEditBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
        currentEditItems = [];
        editItemsTableBody.innerHTML = '<tr><td colspan="4">No items added yet.</td></tr>';
    });

    // Existing helper functions
    function updateState() {
        const isCategorySelected = categorySelect.value !== '';
        const isItemNameFilled = itemNameInput.value.trim() !== '';
        const isQuantityFilled = quantityInput.value.trim() !== '' && Number(quantityInput.value) > 0;

        itemNameInput.disabled = !isCategorySelected;
        quantityInput.disabled = !isCategorySelected;
        notesInput.disabled = !isCategorySelected;

        addItemBtn.disabled = !(isCategorySelected && isItemNameFilled && isQuantityFilled);
    }

    updateState();

    categorySelect.addEventListener('change', updateState);
    itemNameInput.addEventListener('input', updateState);
    quantityInput.addEventListener('input', updateState);

    addItemBtn.addEventListener('click', function() {
        if (addItemBtn.disabled) return;

        if (noEntriesRow && itemsTableBody.contains(noEntriesRow)) {
            itemsTableBody.removeChild(noEntriesRow);
        }

        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${itemNameInput.value.trim()}</td>
            <td>${quantityInput.value.trim()}</td>
            <td>${notesInput.value.trim() || 'N/A'}</td>
            <td><button class="delete-btn">Delete</button></td>
        `;

        itemsTableBody.appendChild(newRow);

        addedItems.push({
            name: itemNameInput.value.trim(),
            quantity: quantityInput.value.trim(),
            notes: notesInput.value.trim() || 'N/A'
        });

        itemNameInput.value = '';
        quantityInput.value = '';
        notesInput.value = '';

        updateState();
        itemNameInput.focus();
    });

    itemsTableBody.addEventListener('click', function(event) {
        if (event.target.classList.contains('delete-btn')) {
            const rowToRemove = event.target.closest('tr');
            const itemName = rowToRemove.children[0].textContent.trim();
            const quantity = Number(rowToRemove.children[1].textContent.trim());
            const notes = rowToRemove.children[2].textContent.trim();

            const index = addedItems.findIndex(item =>
                item.name === itemName &&
                item.quantity === quantity &&
                item.notes === notes
            );
            if (index > -1) {
                addedItems.splice(index, 1);
            }

            rowToRemove.remove();

            if (itemsTableBody.querySelectorAll('tr').length === 0) {
                itemsTableBody.appendChild(noEntriesRow);
                noEntriesRow.style.display = '';
            }
        }
    });

    const elements = {
        'form-page-1': formPage1, 'form-page-2': formPage2, 'nextBtn': nextBtn, 'backBtn': backBtn,
        'itemsTable': itemsTable, 'itemsTableBody': itemsTableBody, 'previewContact': previewContact,
        'previewItemsTable': previewItemsTable, 'contactPerson': contactPersonInput, 'contactNumber': contactNumberInput,
        'email': emailInput, 'address': addressInput, 'category': donationCategoryInput, 'itemName': itemNameInput, 
        'quantity': quantityInput, 'notes': notesInput, 'addItemBtn': addItemBtn,
        'editModal': editModal, 'editForm': editForm, 'editItemsTableBody': editItemsTableBody,
        'editAddItemBtn': editAddItemBtn, 'editCategorySelect': editCategorySelect,
        'editItemNameInput': editItemNameInput, 'editQuantityInput': editQuantityInput,
        'editNotesInput': editNotesInput, 'closeEditBtn': closeEditBtn
    };

    for (const id in elements) {
        if (!elements[id]) {
            console.error(`Error: Missing DOM element with ID "${id}". Script execution stopped.`);
            return;
        }
    }

    const addedItems = [];
    let userUid = null;
    let volunteerOrganization = "[Unknown Org]";

    let inactivityTimeout;
    const INACTIVITY_TIME = 1800000;

    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    }

    function checkInactivity() {
        Swal.fire({
            title: 'Are you still there?',
            text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Stay Login',
            cancelButtonText: 'Log Out',
            allowOutsideClick: false,
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                resetInactivityTimer();
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                auth.signOut().then(() => {
                    window.location.href = "../pages/login.html";
                }).catch((error) => {
                    Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
                });
            }
        });
    }

    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });

    auth.onAuthStateChanged(async user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'Please log in to submit a relief request.',
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
            return;
        }

        resetInactivityTimer();
        userUid = user.uid;

        try {
            const userSnapshot = await database.ref(`users/${userUid}`).once('value');
            const userData = userSnapshot.val();

            if (!userData) {
                Swal.fire({
                    icon: 'error',
                    title: 'User Data Missing',
                    text: 'Your user profile is incomplete. Please contact an administrator.',
                }).then(() => {
                    window.location.href = '../pages/login.html';
                });
                return;
            }

            const passwordNeedsReset = userData.password_needs_reset || false;
            const profilePage = 'profile.html';
            if (passwordNeedsReset) {
                Swal.fire({
                    icon: 'error',
                    title: 'Password Change Required',
                    text: 'For security reasons, please change your password. You will be redirected to your profile.',
                    allowOutsideClick: false,
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                }).then(() => {
                    window.location.replace(`../pages/${profilePage}`);
                });
                return;
            }

            const currentUserRole = userData.role;
            volunteerOrganization = userData.organization || 'Admin';

            if (currentUserRole === 'AB ADMIN') {
                contactPersonInput.value = userData.firstName + " " + userData.lastName || '';
                contactNumberInput.value = userData.mobile || '';
                emailInput.value = userData.email || '';
            } else if (currentUserRole === 'ABVN') {
                if (volunteerOrganization !== 'Not Assigned') {
                    const organizationActivationsSnapshot = await database.ref("activations")
                        .orderByChild("organization")
                        .equalTo(volunteerOrganization)
                        .once('value');

                    let organizationHasActiveActivations = false;
                    organizationActivationsSnapshot.forEach(childSnapshot => {
                        if (childSnapshot.val().status === "active") {
                            organizationHasActiveActivations = true;
                            return true;
                        }
                    });

                    if (organizationHasActiveActivations) {
                        contactPersonInput.value = userData.organization || '';
                        contactNumberInput.value = userData.mobile || '';
                        emailInput.value = userData.email || '';
                    } else {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Organization Inactive',
                            text: 'Your organization has no active operations. Redirecting to dashboard.',
                            allowOutsideClick: false,
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-warning-clean',
                                title: 'swal2-title-warning-clean',
                                htmlContainer: 'swal2-text-warning-clean',
                                confirmButton: 'my-warning-button'
                            },
                            didClose: () => {
                                window.location.href = '../pages/dashboard.html';
                            }
                        });
                    }
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Organization Not Assigned',
                        text: 'Your account is not associated with an organization. Redirecting to dashboard.',
                        didClose: () => {
                            window.location.href = '../pages/dashboard.html';
                        }
                    });
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Unauthorized Access',
                    text: 'Your role does not permit access. Redirecting to dashboard.',
                    didClose: () => {
                        window.location.href = '../pages/dashboard.html';
                    }
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'Failed to verify account status. Please try logging in again.',
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
        }
    });

    function formatLargeNumber(numStr) {
        let num = BigInt(numStr || "0");
        const trillion = 1_000_000_000_000n;
        const billion = 1_000_000_000n;
        const million = 1_000_000n;
        const thousand = 1_000n;

        if (num >= trillion) {
            return (Number(num) / Number(trillion)).toFixed(2).replace(/\.?0+$/, '') + 'T';
        } else if (num >= billion) {
            return (Number(num) / Number(billion)).toFixed(2).replace(/\.?0+$/, '') + 'B';
        } else if (num >= million) {
            return (Number(num) / Number(million)).toFixed(2).replace(/\.?0+$/, '') + 'M';
        } else if (num >= thousand) {
            return (Number(num) / Number(thousand)).toFixed(2).replace(/\.?0+$/, '') + 'k';
        }
        return num.toString();
    }

    function markError(input, message) {
        input.classList.add("input-error");
        let errorMsg = input.parentElement.querySelector(".error-text");
        if (!errorMsg) {
            errorMsg = document.createElement("span");
            errorMsg.className = "error-text";
            input.insertAdjacentElement("afterend", errorMsg);
        }
        errorMsg.textContent = message;
    }

    function clearError(input) {
        input.classList.remove("input-error");
        const errorMsg = input.parentElement.querySelector(".error-text");
        if (errorMsg) errorMsg.remove();
    }

    function validateAndFormatInputs() {
        const inputs = document.querySelectorAll(".number-input");
        inputs.forEach(input => {
            input.addEventListener("input", () => {
                let value = input.value.replace(/[^0-9]/g, "");
                let num = parseInt(value || "0", 10);
                if (isNaN(num) || num < 1) {
                    num = 1;
                }
                input.value = num;
                input.title = formatLargeNumber(num.toString());
            });

            input.addEventListener("blur", () => {
                let num = parseInt(input.value || "0", 10);
                if (isNaN(num) || num < 1) {
                    num = 1;
                }
                input.value = num;
                input.title = formatLargeNumber(num.toString());
            });
        });
    }
    validateAndFormatInputs();

    ["contactPerson", "contactNumber", "email", "address", "category"].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener("input", () => clearError(input));
        if (input.tagName === "SELECT") {
            input.addEventListener("change", () => clearError(input));
        }
    });

    ["editContactPerson", "editContactNumber", "editEmail", "editAddress", "editCategory"].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener("input", () => clearError(input));
            if (input.tagName === "SELECT") {
                input.addEventListener("change", () => clearError(input));
            }
        }
    });

    nextBtn.addEventListener("click", () => {
        let valid = true;
        let messages = [];

        document.querySelectorAll(".error-text").forEach(el => el.remove());
        document.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));

        const contactPerson = document.getElementById("contactPerson");
        if (contactPerson.value.trim() === "") {
            valid = false;
            messages.push("Organization Name is required.");
            markError(contactPerson, "Organization Name is required.");
        }

        const contactNumber = document.getElementById("contactNumber");
        const phoneRegex = /^[0-9]{11}$/;
        if (!phoneRegex.test(contactNumber.value.trim())) {
            valid = false;
            messages.push("Contact Number must be exactly 11 digits.");
            markError(contactNumber, "Contact Number must be exactly 11 digits.");
        }

        const email = document.getElementById("email");
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value.trim())) {
            valid = false;
            messages.push("Valid email is required.");
            markError(email, "Valid email is required.");
        }

        const address = document.getElementById("address");
        if (address.value.trim() === "") {
            valid = false;
            messages.push("Drop-off Address is required.");
            markError(address, "Drop-off Address is required.");
        }

        const category = document.getElementById("category");
        if (!category.value) {
            valid = false;
            messages.push("Please select a Request Category.");
            markError(category, "Please select a Request Category.");
        }

        const itemsTable = document.querySelectorAll("#itemsTable tbody tr");
        if (itemsTable.length === 1 && document.getElementById("noEntriesRow")) {
            valid = false;
            messages.push("Please add at least one requested item.");
        }

        if (!valid) {
            Swal.fire({
                icon: "error",
                title: "Validation Error",
                html: messages.join("<br>"),
            });
            return;
        }

        previewContact.innerHTML = `
            <p><strong>Organization Name:</strong> ${contactPerson.value}</p>
            <p><strong>Contact Number:</strong> ${contactNumber.value}</p>
            <p><strong>Email:</strong> ${email.value}</p>
            <p><strong>Drop-off Address:</strong> ${address.value}</p>
            <p><strong>Request Category:</strong> ${category.value}</p>
        `;

        const itemsBody = document.getElementById("itemsTable").querySelector("tbody");
        previewItemsTable.innerHTML = "";
        const rows = itemsBody.querySelectorAll("tr");
        rows.forEach(row => {
            if (row.id === "noEntriesRow") return;
            const cols = row.querySelectorAll("td");
            if (cols.length >= 3) {
                const itemName = cols[0].textContent.trim();
                const qty = cols[1].textContent.trim();
                const notes = cols[2].textContent.trim();

                const previewRow = document.createElement("tr");
                previewRow.innerHTML = `
                    <td>${itemName}</td>
                    <td>${formatLargeNumber(qty)}</td>
                    <td>${notes}</td>
                `;
                previewItemsTable.appendChild(previewRow);
            }
        });

        formPage1.style.display = "none";
        formPage2.style.display = "block";
    });

    backBtn.addEventListener("click", () => {
        formPage2.style.display = "none";
        formPage1.style.display = "block";
    });

    formPage2.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!userUid) {
            Swal.fire({
                icon: "error",
                title: "Authentication Error",
                text: "User not authenticated. Please log in again.",
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }

        const submitBtn = document.getElementById("submitBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        const contactPerson = document.getElementById("contactPerson").value.trim();
        const contactNumber = document.getElementById("contactNumber").value.trim();
        const email = document.getElementById("email").value.trim();
        const formattedAddress = document.getElementById("address").value.trim();
        const category = document.getElementById("category").value;
        const latitude = document.getElementById("latitude").value || null;
        const longitude = document.getElementById("longitude").value || null;

        if (addedItems.length === 0) {
            Swal.fire({
                icon: "warning",
                title: "No Items",
                text: "Please add at least one item before submitting.",
            });
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
            return;
        }

        const newRequest = {
            contactPerson,
            contactNumber,
            email,
            category,
            volunteerOrganization,
            userUid,
            address: {
                formattedAddress,
                latitude,
                longitude,
            },
            items: addedItems.map(item => ({
                ...item,
                quantity: Number(item.quantity)
            })),
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            donationDate: new Date().toISOString(),
            status: "Pending"
        };

        const sampleRequests = [
            {
                contactPerson: `${contactPerson} (Sample 1)`,
                contactNumber: "09123456789",
                email: `sample1@${email.split('@')[1]}`,
                category: "Relief Packs",
                volunteerOrganization,
                userUid,
                address: {
                    formattedAddress: "123 Sample St, Quezon City, Metro Manila",
                    latitude: "14.6760",
                    longitude: "121.0437"
                },
                items: [
                    { name: "Bandages", quantity: 100, notes: "Sterile" },
                    { name: "Antiseptics", quantity: 50, notes: "Alcohol-based" }
                ],
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                donationDate: new Date(Date.now() - 86400000).toISOString(),
                status: "Pending"
            },
            {
                contactPerson: `${contactPerson} (Sample 2)`,
                contactNumber: "09876543210",
                email: `sample2@${email.split('@')[1]}`,
                category: "Hot Meals",
                volunteerOrganization,
                userUid,
                address: {
                    formattedAddress: "456 Relief Ave, Manila, Metro Manila",
                    latitude: "14.5995",
                    longitude: "120.9842"
                },
                items: [
                    { name: "Canned Goods", quantity: 200, notes: "Assorted" },
                    { name: "Rice", quantity: 50, notes: "50kg sacks" }
                ],
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                donationDate: new Date(Date.now() - 2 * 86400000).toISOString(),
                status: "Approved"
            },
            {
                contactPerson: `${contactPerson} (Sample 3)`,
                contactNumber: "09712345678",
                email: `sample3@${email.split('@')[1]}`,
                category: "Hygiene Kits",
                volunteerOrganization,
                userUid,
                address: {
                    formattedAddress: "789 Aid Rd, Pasig City, Metro Manila",
                    latitude: "14.5764",
                    longitude: "121.0851"
                },
                items: [
                    { name: "Blankets", quantity: 75, notes: "Warm" },
                    { name: "Jackets", quantity: 30, notes: "Adult sizes" }
                ],
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                donationDate: new Date(Date.now() - 3 * 86400000).toISOString(),
                status: "Delivered"
            }
        ];

        const requestRef = database.ref("requestRelief/requests").push();
        const userRequestRef = database.ref(`users/${userUid}/requests/${requestRef.key}`);

        try {
            await Promise.all([
                requestRef.set(newRequest),
                userRequestRef.set(newRequest)
            ]);

            const message = `New relief request submitted by ${contactPerson} from ${volunteerOrganization} for ${category}.`;
            await notifyAdmin(message, null, null, null, requestRef.key, contactPerson, volunteerOrganization);

            const samplePromises = sampleRequests.map(async (sampleRequest) => {
                const sampleRequestRef = database.ref("requestRelief/requests").push();
                const sampleUserRequestRef = database.ref(`users/${userUid}/requests/${sampleRequestRef.key}`);
                await Promise.all([
                    sampleRequestRef.set(sampleRequest),
                    sampleUserRequestRef.set(sampleRequest)
                ]);
                const sampleMessage = `Sample relief request submitted by ${sampleRequest.contactPerson} from ${volunteerOrganization} for ${sampleRequest.category}.`;
                await notifyAdmin(sampleMessage, null, null, null, sampleRequestRef.key, sampleRequest.contactPerson, volunteerOrganization);
            });

            await Promise.all(samplePromises);

            Swal.fire({
                icon: "success",
                title: "Request Submitted",
                text: "Your relief request and sample data have been successfully submitted!",
                confirmButtonText: "OK"
            }).then(() => {
                formPage1.reset();
                formPage2.reset();
                addedItems.length = 0;
                itemsTableBody.innerHTML = '';
                itemsTableBody.appendChild(noEntriesRow);
                noEntriesRow.style.display = '';
                formPage2.style.display = "none";
                formPage1.style.display = "block";
            });
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to submit request: " + error.message,
            });
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
        }
    });

    document.getElementById('contactPerson').addEventListener('input', function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
        this.value = this.value.replace(/\b\w/g, char => char.toUpperCase());
    });

    document.getElementById('contactNumber').addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
    });

    document.getElementById('editContactPerson').addEventListener('input', function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
        this.value = this.value.replace(/\b\w/g, char => char.toUpperCase());
    });

    document.getElementById('editContactNumber').addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
    });

    document.getElementById('email').addEventListener('input', function () {
        this.value = this.value.replace(/\s/g, '');
    });

    document.getElementById('editEmail').addEventListener('input', function () {
        this.value = this.value.replace(/\s/g, '');
    });
});

let map, marker;

const modal = document.getElementById('mapModal');
const pinBtn = document.getElementById('pinBtn');
const closeBtn = document.querySelector('.closeBtn');
const confirmBtn = document.getElementById('confirmLocationBtn');
const addressInput = document.getElementById('address');
const mapSearch = document.getElementById('mapSearch');
const suggestionsContainer = document.getElementById('suggestions');

pinBtn.addEventListener('click', () => {
    modal.style.display = 'flex';

    if (!map) {
        map = L.map('map').setView([14.5995, 120.9842], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        marker = L.marker([14.5995, 120.9842], { draggable: true }).addTo(map);

        mapSearch.addEventListener('input', debounce(async () => {
            const query = mapSearch.value;
            suggestionsContainer.innerHTML = '';
            if (query.length < 3) return;

            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
                );
                const results = await response.json();
                if (results.length > 0) {
                    results.forEach((result) => {
                        const suggestion = document.createElement('div');
                        suggestion.className = 'suggestion-item';
                        suggestion.textContent = result.display_name;
                        suggestion.addEventListener('click', () => {
                            map.setView([result.lat, result.lon], 13);
                            marker.setLatLng([result.lat, result.lon]);
                            document.getElementById('latitude').value = result.lat;
                            document.getElementById('longitude').value = result.lon;
                            mapSearch.value = result.display_name;
                            suggestionsContainer.innerHTML = '';
                        });
                        suggestionsContainer.appendChild(suggestion);
                    });
                }
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 500));

        document.addEventListener('click', (e) => {
            if (!suggestionsContainer.contains(e.target) && e.target !== mapSearch) {
                suggestionsContainer.innerHTML = '';
            }
        });

        map.on('click', (e) => {
            marker.setLatLng(e.latlng);
            document.getElementById('latitude').value = e.latlng.lat;
            document.getElementById('longitude').value = e.latlng.lng;
            suggestionsContainer.innerHTML = '';
        });

        marker.on('dragend', () => {
            const position = marker.getLatLng();
            document.getElementById('latitude').value = position.lat;
            document.getElementById('longitude').value = position.lng;
        });
    }
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    suggestionsContainer.innerHTML = '';
});

confirmBtn.addEventListener('click', async () => {
    if (marker) {
        const position = marker.getLatLng();
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`
            );
            const data = await response.json();
            if (data.display_name) {
                addressInput.value = data.display_name;
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
    }
    modal.style.display = 'none';
    suggestionsContainer.innerHTML = '';
});

window.addEventListener('click', (event) => {
    if (event.target == modal) {
        modal.style.display = 'none';
        suggestionsContainer.innerHTML = '';
    }
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}