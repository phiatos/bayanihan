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
        console.log(`Admin notified of new relief request - Request ID: ${requestId}, Key: ${key}`);
    } catch (error) {
        console.error("Error notifying admin:", error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Firebase configuration
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

    // Initialize Firebase
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
    const database = firebase.database();
    const auth = firebase.auth();

    // DOM elements
    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const addItemBtn = document.getElementById('addItemBtn');
    const itemsTable = document.getElementById('itemsTable');
    const itemsTableBody = itemsTable ? itemsTable.querySelector('tbody') : null;
    const previewContact = document.getElementById('previewContact');
    const previewItemsTable = document.getElementById('previewItemsTable');

    // Page-1 inputs
    const contactPersonInput = document.getElementById('contactPerson');
    const contactNumberInput = document.getElementById('contactNumber');
    const emailInput = document.getElementById('email');
    const addressInput = document.getElementById('address');
    const cityInput = document.getElementById('city');
    const donationCategoryInput = document.getElementById('category');

    // Item inputs
    const itemNameInput = document.getElementById('itemName');
    const quantityInput = document.getElementById('quantity');
    const notesInput = document.getElementById('notes');

    // Verify DOM elements exist
    if (!formPage1 || !formPage2 || !nextBtn || !backBtn || !addItemBtn || !itemsTable || !itemsTableBody || !previewContact || !previewItemsTable || !contactPersonInput || !contactNumberInput || !emailInput || !addressInput || !cityInput || !donationCategoryInput || !itemNameInput || !quantityInput || !notesInput) {
        console.error('One or more DOM elements are missing:', {
            formPage1: !!formPage1,
            formPage2: !!formPage2,
            nextBtn: !!nextBtn,
            backBtn: !!backBtn,
            addItemBtn: !!addItemBtn,
            itemsTable: !!itemsTable,
            itemsTableBody: !!itemsTableBody,
            previewContact: !!previewContact,
            previewItemsTable: !!previewItemsTable,
            contactPersonInput: !!contactPersonInput,
            contactNumberInput: !!contactNumberInput,
            emailInput: !!emailInput,
            addressInput: !!addressInput,
            cityInput: !!cityInput,
            donationCategoryInput: !!donationCategoryInput,
            itemNameInput: !!itemNameInput,
            quantityInput: !!quantityInput,
            notesInput: !!notesInput
        });
        return;
    }

    const addedItems = [];
    let userUid = null;
    let volunteerOrganization = "[Unknown Org]";

    // Variables for inactivity detection
    let inactivityTimeout;
    const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

    // Function to reset the inactivity timer
    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
        console.log("Inactivity timer reset.");
    }

    // Function to check for inactivity and prompt the user
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
                resetInactivityTimer(); // User chose to continue, reset the timer
                console.log("User chose to continue session.");
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                // User chose to log out
                auth.signOut().then(() => {
                    console.log("User logged out due to inactivity.");
                    window.location.href = "../pages/login.html"; // Redirect to login page
                }).catch((error) => {
                    console.error("Error logging out:", error);
                    Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
                });
            }
        });
    }

    // Attach event listeners to detect user activity
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });

    // Updated auth.onAuthStateChanged with role and activation checks
    auth.onAuthStateChanged(async user => {
        if (!user) {
            console.warn('No user is logged in');
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'Please log in to submit a relief request.',
            }).then(() => {
                window.location.href = '../pages/login.html'; // Redirect to login page
            });
            return;
        }

        resetInactivityTimer();
        userUid = user.uid;
        console.log('Logged-in user UID:', userUid);

        try {
            // Fetch user data from the database
            const userSnapshot = await database.ref(`users/${userUid}`).once('value');
            const userData = userSnapshot.val();
            if (!userData) {
                console.warn('User data not found in database for UID:', userUid);
                Swal.fire({
                    icon: 'error',
                    title: 'User Data Missing',
                    text: 'Your user profile is incomplete. Please contact an administrator.',
                }).then(() => {
                    window.location.href = '../pages/login.html';
                });
                return;
            }

            // Password reset check
            const passwordNeedsReset = userData.password_needs_reset || false;
            const profilePage = 'profile.html';
            if (passwordNeedsReset) {
                console.log("Password change required. Redirecting to profile page.");
                Swal.fire({
                    icon: 'info',
                    title: 'Password Change Required',
                    text: 'For security reasons, please change your password. You will be redirected to your profile.',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                }).then(() => {
                    window.location.replace(`../pages/${profilePage}`);
                });
                return;
            }

            // Get user role and organization
            const currentUserRole = userData.role;
            volunteerOrganization = userData.organization || 'Not Assigned';
            console.log('User Role:', currentUserRole);
            console.log('Volunteer Organization:', volunteerOrganization);

            // Check if user is AB ADMIN
            if (currentUserRole === 'AB ADMIN') {
                console.log('AB ADMIN role detected. Allowing access to submit request.');
                // Pre-fill form fields
                contactPersonInput.value = userData.contactPerson || '';
                contactNumberInput.value = userData.mobile || '';
                emailInput.value = userData.email || '';
            }
            // Check if user is ABVN
            else if (currentUserRole === 'ABVN') {
                console.log('ABVN role detected. Checking organization activations.');
                if (volunteerOrganization !== 'Not Assigned') {
                    // Check for active activations
                    const organizationActivationsSnapshot = await database.ref("activations")
                        .orderByChild("organization")
                        .equalTo(volunteerOrganization)
                        .once('value');
                    
                    let organizationHasActiveActivations = false;
                    organizationActivationsSnapshot.forEach(childSnapshot => {
                        if (childSnapshot.val().status === "active") {
                            organizationHasActiveActivations = true;
                            return true; // Exit loop early
                        }
                    });

                    if (organizationHasActiveActivations) {
                        console.log(`Organization "${volunteerOrganization}" has active operations.`);
                        // Pre-fill form fields
                        contactPersonInput.value = userData.contactPerson || '';
                        contactNumberInput.value = userData.mobile || '';
                        emailInput.value = userData.email || '';
                    } else {
                        console.warn(`Organization "${volunteerOrganization}" has no active operations.`);
                        Swal.fire({
                            icon: 'warning',
                            title: 'Organization Inactive',
                            text: 'Your organization has no active operations. Redirecting to dashboard.',
                            didClose: () => {
                                window.location.href = '../pages/dashboard.html';
                            }
                        });
                    }
                } else {
                    console.warn('ABVN user has no organization assigned.');
                    Swal.fire({
                        icon: 'warning',
                        title: 'Organization Not Assigned',
                        text: 'Your account is not associated with an organization. Redirecting to dashboard.',
                        didClose: () => {
                            window.location.href = '../pages/dashboard.html';
                        }
                    });
                }
            }
            // Handle unsupported roles
            else {
                console.warn(`User ${userUid} has unsupported role: ${currentUserRole}.`);
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
            console.error('Error checking user data or activations:', error);
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'Failed to verify account status. Please try logging in again.',
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
        }
    });

    // Hide items table initially
    itemsTable.style.display = 'none';

// Event listeners for real-time validation
document.getElementById('contactPerson').addEventListener('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
    // Auto-capitalize the first letter of each word
    this.value = this.value.replace(/\b\w/g, char => char.toUpperCase());
});

document.getElementById('contactNumber').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, ''); // remove non-digits
});

function validateContactNumber() {
    const phPattern = /^09\d{9}$/;
    const value = contactNumberInput.value.trim();

    // Remove non-numeric characters while typing
    contactNumberInput.value = value.replace(/[^0-9]/g, '');

    if (value && !phPattern.test(value)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Number',
            text: 'Please enter a valid Philippine mobile number (11 digits starting with 09).'
        }).then(() => {
            contactNumberInput.focus();
        });
        return false;
    }
    return true;
}

// Validate on blur
contactNumberInput.addEventListener('blur', validateContactNumber);

// Optional: prevent invalid input early
contactNumberInput.addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
});


document.getElementById('email').addEventListener('input', function () {
    this.value = this.value.replace(/\s/g, '');
});

document.getElementById('address').addEventListener('input', function () {
    this.value = this.value.replace(/[^a-zA-Z0-9\s,.'-]/g, '');
    this.value = this.value.replace(/\b\w/g, char => char.toUpperCase());

});

document.getElementById('city').addEventListener('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\sñÑ]/g, ''); // Added ñ and Ñ
    this.value = this.value.replace(/\b\w/g, char => char.toUpperCase());

});

document.getElementById("category").addEventListener("change", function () {
    const selectedCategory = this.value;
    const itemName = document.getElementById("itemName");
    const quantity = document.getElementById("quantity");
    const notes = document.getElementById("notes");

    itemName.disabled = false;
    quantity.disabled = false;
    notes.disabled = false;

    const itemNameList = document.getElementById("itemNameList");
    while (itemNameList.firstChild) {
        itemNameList.removeChild(itemNameList.firstChild);
    }

    let items = [];
    if (selectedCategory === "Food") {
        items = ["Rice", "Canned Goods", "Water Bottles"];
    } else if (selectedCategory === "Clothing") {
        items = ["Blankets"];
    } else if (selectedCategory === "Medicine") {
        items = ["Medicine Kits"];
    } else if (selectedCategory === "Hygiene") {
        items = ["Hygiene Packs"];
    } else {
        items = ["Others"];
    }

    items.forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        itemNameList.appendChild(option);
    });
});


    // Converts Big Quantities to Readable Ones
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

// Helper to show Swal warning modals with consistent styling
function showWarning(title, text) {
    Swal.fire({
        icon: 'warning',
        title,
        text,
        timer: 2200,
        showConfirmButton: false,
        timerProgressBar: true,
        customClass: {
            popup: 'swal2-popup-warning-clean',
            title: 'swal2-title-warning-clean',
            content: 'swal2-text-warning-clean',
        }
    });
}

// Add Item button event listener
addItemBtn.addEventListener('click', () => {
    console.log('Add Item button clicked');

    const name = itemNameInput.value.trim();
    const quantityStr = quantityInput.value.trim();
    const notes = notesInput.value.trim();

    console.log('Add Item inputs:', { name, quantityStr, notes });

    if (!name) {
        console.log('Validation failed: Item name is empty');
        showWarning('Missing Item Name', 'Please enter the item name.');
        return;
    }

    const quantity = parseInt(quantityStr, 10);
    if (!quantityStr || isNaN(quantity) || quantity <= 0) {
        console.log('Validation failed: Invalid quantity', { quantityStr });
        showWarning('Invalid Quantity', 'Please enter a quantity greater than 0.');
        return;
    }

    addedItems.push({ name, quantity, notes });
    console.log('Item added:', { name, quantity, notes, index: addedItems.length - 1 });

    renderItemsTable();

    // Reset inputs
    itemNameInput.value = '';
    quantityInput.value = '';
    notesInput.value = '';
});

// Delete button event listener using event delegation
itemsTableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('deleteBtn')) {
        console.log('Delete button clicked');
        const index = Number(e.target.dataset.index);
        if (!isNaN(index)) {
            addedItems.splice(index, 1);
            renderItemsTable();
        }
    }
});

// Render items table dynamically
function renderItemsTable() {
    console.log('Rendering items table');
    itemsTableBody.innerHTML = '';
    addedItems.forEach(({ name, quantity, notes }, index) => {
        const formattedQuantity = formatLargeNumber(quantity);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${name}</td>
            <td>${formattedQuantity}</td>
            <td>${notes}</td>
            <td><button type="button" class="deleteBtn" data-index="${index}"><i class="bx bx-x-circle"></i></button></td>
        `;
        itemsTableBody.appendChild(tr);
    });

    itemsTable.style.display = addedItems.length > 0 ? 'table' : 'none';
}


    // Proceed button event listener
nextBtn.addEventListener('click', () => {
    console.log('Proceed button clicked');

    const contactPerson = contactPersonInput.value.trim();
    const contactNumber = contactNumberInput.value.trim();
    const email = emailInput.value.trim();
    const address = addressInput.value.trim();
    const city = cityInput.value.trim();
    const donationCategory = donationCategoryInput.value;

    console.log('Proceed inputs:', {
        contactPerson,
        contactNumber,
        email,
        address,
        city,
        donationCategory,
        addedItemsLength: addedItems.length,
        volunteerOrganization
    });

    // ✅ Centralized alert function
    function showValidationError(title, text) {
        Swal.fire({
            icon: 'warning',
            title,
            text,
            background: '#fefefe',
            color: '#6c584c',
            iconColor: '#d18f00',
            confirmButtonColor: '#d18f00',
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                htmlContainer: 'swal2-text-warning-clean'
            }
        });
    }

    // ✅ Check if absolutely everything is empty
    if (
        !contactPerson &&
        !contactNumber &&
        !email &&
        !address &&
        !city &&
        !donationCategory &&
        addedItems.length === 0
    ) {
        console.log('Validation failed: All fields empty');
        showValidationError(
            'No Information Provided',
            'Please fill out the form and add at least one item before proceeding.'
        );
        return;
    }

    // ✅ Individual validations
    if (!contactPerson) {
        console.log('Validation failed: Contact person is empty');
        showValidationError('Missing Contact Person', 'Please enter the contact person’s name.');
        return;
    }

    if (!contactNumber || !/^\d{10,15}$/.test(contactNumber)) {
        console.log('Validation failed: Invalid contact number', { contactNumber });
        showValidationError('Invalid Contact Number', 'Please enter a valid contact number (10–15 digits).');
        return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.log('Validation failed: Invalid email', { email });
        showValidationError('Invalid Email', 'Please enter a valid email address.');
        return;
    }

    if (!address) {
        console.log('Validation failed: Address is empty');
        showValidationError('Missing Address', 'Please enter the drop-off address.');
        return;
    }

    if (!city) {
        console.log('Validation failed: City is empty');
        showValidationError('Missing City', 'Please enter the city.');
        return;
    }

    if (!donationCategory) {
        console.log('Validation failed: Donation category not selected');
        showValidationError('Missing Category', 'Please select a donation category.');
        return;
    }

    if (addedItems.length === 0) {
        console.log('Validation failed: No items added');
        showValidationError('No Items Added', 'Please add at least one item before proceeding.');
        return;
    }

    // ✅ Passed all validations → move to next form page
    formPage1.style.display = 'none';
    formPage2.style.display = 'block';
    console.log('Switched to form-page-2');

    previewContact.innerHTML = `
        <p><strong>Contact Person:</strong> ${contactPerson}</p>
        <p><strong>Contact Number:</strong> ${contactNumber}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Address:</strong> ${address}, ${city}</p>
        <p><strong>Donation Category:</strong> ${donationCategory}</p>
        <p><strong>Volunteer Organization:</strong> ${volunteerOrganization}</p>
    `;

    previewItemsTable.innerHTML = '';
    addedItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.name}</td><td>${item.quantity}</td><td>${item.notes}</td>`;
        previewItemsTable.appendChild(tr);
    });
});


    // Back button event listener
    backBtn.addEventListener('click', () => {
        console.log('Back button clicked');
        formPage2.style.display = 'none';
        formPage1.style.display = 'block';
    });

    // Handle form submission to save data to Firebase
    formPage2.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Submit button clicked');

        if (!userUid) {
            console.error('No user UID available. Cannot submit request.');
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'User not authenticated. Please log in again.',
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
            return;
        }

        const contactPerson = contactPersonInput.value.trim();
        const contactNumber = contactNumberInput.value.trim();
        const email = emailInput.value.trim();
        const address = addressInput.value.trim();
        const city = cityInput.value.trim();
        const donationCategory = donationCategoryInput.value;

        // Create a new request object
        const newRequest = {
            contactPerson,
            contactNumber,
            email,
            address,
            city,
            category: donationCategory,
            volunteerOrganization,
            userUid,
            items: addedItems,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Save to both requestRelief/requests and users/<uid>/requests
        const requestRef = database.ref('requestRelief/requests').push();
        const userRequestRef = database.ref(`users/${userUid}/requests/${requestRef.key}`);

        try {
            await Promise.all([
                requestRef.set(newRequest),
                userRequestRef.set(newRequest)
            ]);

            console.log('Data saved to Firebase successfully');

            // Notify admin
            const message = `New relief request submitted by ${contactPerson} from ${volunteerOrganization} for ${donationCategory} on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} PST.`;
            const requestRefKey = requestRef.key;
            await notifyAdmin(message, null, null, null, requestRefKey, contactPerson, volunteerOrganization);

            Swal.fire({
                icon: 'success',
                title: 'Request Submitted',
                text: 'Your relief request has been successfully submitted!',
            }).then(() => {
                formPage1.reset();
                formPage2.reset();
                addedItems.length = 0;
                renderItemsTable();
                formPage2.style.display = 'none';
                formPage1.style.display = 'block';
            });
        } catch (error) {
            console.error('Failed to save data to Firebase:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to submit request: ' + error.message,
            });
        }
    });
});