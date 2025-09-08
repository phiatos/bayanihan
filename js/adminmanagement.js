import { renderPagination, updateEntriesInfo, getPaginatedData } from '../js/pagination.js';

const firebaseConfig = {
    apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    authDomain: "bayanihan-5ce7e.firebaseapp.com",
    databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bayanihan-5ce7e",
    storageBucket: "bayanihan-5ce7e.appspot.com",
    messagingSenderId: "593123849917",
    appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    measurementId: "G-ZTQ9VXXVV0"
};

try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    Swal.fire({
        icon: "error",
        title: "Initialization Error",
        text: "Failed to initialize Firebase. Check configuration."
    });
}
const auth = firebase.auth();
const database = firebase.database();

try {
    firebase.initializeApp(firebaseConfig, "SecondaryApp");
} catch (error) {}
const secondaryAuth = firebase.auth(firebase.app("SecondaryApp"));

try {
    emailjs.init('ULA8rmn7VM-3fZ7ik');
} catch (error) {}

let currentUserIsSuperAdmin = false;
let allAdminData = [];
let filteredAdminData = [];
let currentPage = 1;
const rowsPerPage = 5; 
// Global variables for archived admins
let allArchivedAdminData = [];
let currentArchivedPage = 1;
const archivedRowsPerPage = 5;

// DOM elements
const adminTableBody = document.querySelector('#adminTable tbody');
const entriesInfo = document.querySelector("#entriesInfo");
const paginationContainer = document.querySelector("#pagination");
const addNewAdminButton = document.getElementById('addNew'); 
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');

// Register Admin Modal elements
const addAdminModal = document.getElementById('addAdminModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const addAdminForm = document.getElementById('addAdminForm');
const firstNameInput = document.getElementById('firstName');
const middleInitialInput = document.getElementById('middleInitial');
const lastNameInput = document.getElementById('lastName');
const nameExtensionInput = document.getElementById('nameExtension');
const emailInput = document.getElementById('email');
const mobileNumberInput = document.getElementById('mobile');
const socialMediaInput = document.getElementById('socialMedia');
const adminPositionSelect = document.getElementById('adminPosition');
const confirmModal = document.getElementById('confirmModal');
const confirmDetailsDiv = document.getElementById('confirmDetails');
const editDetailsBtn = document.getElementById('editDetailsBtn'); 
const confirmSaveBtn = document.getElementById('confirmSaveBtn');
const closeSuccessBtn = document.getElementById('closeSuccessBtn');

// Edit Modal elements
const editAdminModal = document.getElementById('editAdminModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const editAdminForm = document.getElementById('editAdminForm');
const editFirstNameInput = document.getElementById('editFirstName');
const editMiddleInitialInput = document.getElementById('editMiddleInitial');
const editLastNameInput = document.getElementById('editLastName');
const editNameExtensionInput = document.getElementById('editNameExtension');
const editEmailInput = document.getElementById('editEmail');
const editMobileInput = document.getElementById('editMobile');
const editSocialMediaInput = document.getElementById('editSocialMedia');
const editAdminPositionSelect = document.getElementById('editAdminPosition');

// Archived Admins Modal
const viewArchivedButton = document.getElementById('viewArchived');
const archivedModal = document.getElementById('archivedModal');
const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
const archivedTableBody = document.querySelector('#archivedTable tbody');
const archivedEntriesInfo = document.querySelector("#archivedEntriesInfo");
const archivedPaginationContainer = document.querySelector("#archivedPagination");

function generateTempPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Function to validate email format 
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validDomains = ['gmail.com'];
    // const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return emailRegex.test(email) && validDomains.includes(domain);
}

// Function to validate mobile number format
function isValidMobile(mobile) {
    const mobileRegex = /^09[0-9]{9}$/;
    return mobileRegex.test(mobile);
}

// Function to validate URL format
function isValidURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Function to check if mobile number is already in use by another user
async function isMobileNumberInUse(mobile, excludeUid) {
    try {
        const snapshot = await database.ref('users').once('value');
        const users = snapshot.val();
        for (const uid in users) {
            if (uid !== excludeUid && users[uid].mobile === mobile) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error("Error checking mobile number in use:", error);
        return false;
    }
}

// Function to check if email is already in use by another user
async function isEmailInUse(email, excludeUid) {
    try {
        const snapshot = await database.ref('users').once('value');
        const users = snapshot.val();
        for (const uid in users) {
            if (uid !== excludeUid && users[uid].email === email) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error("Error checking email in use:", error);
        return false;
    }
}

// Function to check if data is unchanged
async function isDataUnchanged(uid, updatedData) {
    try {
        const snapshot = await database.ref(`users/${uid}`).once('value');
        const adminData = snapshot.val();
        if (!adminData) return false;

        return (
            adminData.firstName === updatedData.firstName &&
            adminData.middleInitial === updatedData.middleInitial &&
            adminData.lastName === updatedData.lastName &&
            adminData.nameExtension === updatedData.nameExtension &&
            adminData.email === updatedData.email &&
            adminData.mobile === updatedData.mobile &&
            adminData.socialMedia === updatedData.socialMedia &&
            adminData.adminPosition === updatedData.adminPosition
        );
    } catch (error) {
        console.error("Error checking unchanged data:", error);
        return false;
    }
}

// Function to verify Super Admin password
async function verifySuperAdminPassword() {
    const { value: password } = await Swal.fire({
        title: 'Enter Admin Password',
        input: 'password',
        inputPlaceholder: 'Enter your password',
        inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off',
            autocomplete: 'new-password'
        },
        showCancelButton: true,
        confirmButtonText: 'Verify',
        showLoaderOnConfirm: true,
        reverseButtons: true,
        focusCancel: true,
        allowOutsideClick: false,
        customClass: {
            popup: 'custom-swal-popup',
            title: 'custom-swal-title',
            input: 'custom-swal-input',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn'
        },
        inputValidator: (value) => {
            if (!value) {
                return 'You need to enter your password!';
            }
        }
    });

    if (!password) {
        return false; 
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No user is currently signed in.');
        }
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
        return true;
    } catch (error) {
        Swal.fire({
            title: 'Verification Failed',
            text: 'Invalid admin password.',
            icon: 'error',
            timer: 1600,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean'
            }
        });
        return false;
    }
}

// Function to clear AB Admin registration form
function clearAddAdminInputs() {
    addAdminForm.reset();
}

auth.onAuthStateChanged(user => {
    if (user) {
        // Fetch user data from database to check isSuperAdmin flag
        database.ref(`users/${user.uid}`).once('value', snapshot => {
            const userData = snapshot.val();
            if (userData && userData.adminPosition === "Super Admin") {
                currentUserIsSuperAdmin = true;
                if (addNewAdminButton) {
                    addNewAdminButton.style.display = 'block'; 
                }
                fetchAndRenderAdmins();
            } else {
                currentUserIsSuperAdmin = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: 'Only Super Admins can access this page.',
                    showConfirmButton: false,
                    timer: 2000,
                    allowOutsideClick: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                }).then(() => {
                    window.location.href = '../pages/login.html'; 
                });
            }
        }).catch(error => {
            console.error("Error fetching user role:", error);
            currentUserIsSuperAdmin = false;
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to verify user role. Redirecting...',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
        });
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Session Expired',
            text: 'Please log in again.',
            showConfirmButton: false,
            timer: 2000
        }).then(() => {
            window.location.href = '../pages/login.html'; 
        });
    }
});

// Fetch and render table data
async function fetchAndRenderAdmins() {
    Swal.fire({
        title: 'Loading Admins',
        text: 'Fetching data from Firebase...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const snapshot = await database.ref('users').once('value');
        const users = snapshot.val();
        allAdminData = [];

        for (const uid in users) {
            const user = users[uid];
            // Only include users with 'AB ADMIN' role in this table
            if (user.role === 'AB ADMIN') {
                allAdminData.push({
                    uid: uid, // Store UID for actions
                    ...user
                });
            }
        }
        Swal.close();
        applySearchAndSortAdmins(); // Apply initial search/sort and render
    } catch (error) {
        Swal.fire('Error', 'Failed to load admin data: ' + error.message, 'error');
        console.error("Error fetching admin data:", error);
    }
}

// function renderAdminTable(data) {
//     if (!adminTableBody) {
//         console.error("Admin table body not found!");
//         return;
//     }

//     adminTableBody.innerHTML = ''; 

//     const paginatedData = getPaginatedData(data, currentPage, rowsPerPage);

//     if (paginatedData.length === 0) {
//         adminTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No admin accounts found.</td></tr>';
//     }

//     paginatedData.forEach((admin, index) => {
//         const row = adminTableBody.insertRow();
//         row.dataset.uid = admin.uid; 

//         // Calculate row number
//         const rowNumber = (currentPage - 1) * rowsPerPage + index + 1;

//         // Add numbering column
//         row.insertCell(0).textContent = rowNumber;

//         const fullName = `${admin.firstName || ''} ${admin.middleInitial ? admin.middleInitial + '.' : ''} ${admin.lastName || ''} ${admin.nameExtension || ''}`.trim();

//         row.insertCell(1).textContent = fullName || 'N/A';
//         row.insertCell(2).textContent = admin.email || 'N/A';
//         row.insertCell(3).textContent = admin.mobile || 'N/A';
        
//         // Social Media column with clickable link
//         const socialMediaCell = row.insertCell(4);
//         const socialMediaValue = admin.socialMedia || 'N/A';
//         socialMediaCell.innerHTML = isValidURL(socialMediaValue) 
//             ? `<a href="${socialMediaValue}" target="_blank" rel="noopener noreferrer">${socialMediaValue}</a>`
//             : socialMediaValue;

//         row.insertCell(5).textContent = `${admin.adminPosition || 'N/A'} (${admin.role || 'N/A'})`;
        
//         const actionsCell = row.insertCell(6);
//         actionsCell.innerHTML = `
//             <button class="editBtn" data-uid="${admin.uid}"><i class='bx bx-edit'></i></button>
//             <button class="deleteBtn" data-uid="${admin.uid}"><i class="bx bx-x-circle"></i></button>
//         `;
//     });

//     // Use the global pagination functions
//     renderPagination(data, currentPage, rowsPerPage, paginationContainer, (newPage) => {
//         currentPage = newPage;
//         renderAdminTable(data); 
//     });
//     updateEntriesInfo(data, currentPage, rowsPerPage, entriesInfo);

//     // Add event listeners for edit/delete buttons
//     document.querySelectorAll('.editBtn').forEach(button => {
//         button.addEventListener('click', (event) => editAdmin(event.target.dataset.uid));
//     });
//     document.querySelectorAll('.deleteBtn').forEach(button => {
//         button.addEventListener('click', (event) => deleteAdmin(event.target.dataset.uid));
//     });
// }

function renderAdminTable(data) {
    if (!adminTableBody) {
        console.error("Admin table body not found!");
        return;
    }

    adminTableBody.innerHTML = ''; 

    const paginatedData = getPaginatedData(data, currentPage, rowsPerPage);

    if (paginatedData.length === 0) {
        adminTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No admin accounts found.</td></tr>';
    }

    paginatedData.forEach((admin, index) => {
        const row = adminTableBody.insertRow();
        row.dataset.uid = admin.uid; 

        const rowNumber = (currentPage - 1) * rowsPerPage + index + 1;
        row.insertCell(0).textContent = rowNumber;

        const fullName = `${admin.firstName || ''} ${admin.middleInitial ? admin.middleInitial + '.' : ''} ${admin.lastName || ''} ${admin.nameExtension || ''}`.trim();

        row.insertCell(1).textContent = fullName || 'N/A';
        row.insertCell(2).textContent = admin.email || 'N/A';
        row.insertCell(3).textContent = admin.mobile || 'N/A';
        
        const socialMediaCell = row.insertCell(4);
        const socialMediaValue = admin.socialMedia || 'N/A';
        socialMediaCell.innerHTML = isValidURL(socialMediaValue) 
            ? `<a href="${socialMediaValue}" target="_blank" rel="noopener noreferrer">${socialMediaValue}</a>`
            : socialMediaValue;

        row.insertCell(5).textContent = `${admin.adminPosition || 'N/A'} (${admin.role || 'N/A'})`;
        
        const actionsCell = row.insertCell(6);
        // Disable buttons for specific email
        const protectedEmails = [
            'sophiakirstentorrenueva@gmail.com',
            'kimrazel4@gmail.com'
        ];
        const isProtectedEmail = protectedEmails.includes(admin.email);
        actionsCell.innerHTML = `
            <button class="editBtn" data-uid="${admin.uid}" ${isProtectedEmail ? 'disabled' : ''}><i class='bx bx-edit'></i></button>
            <button class="deleteBtn" data-uid="${admin.uid}" ${isProtectedEmail ? 'disabled' : ''}><i class="bx bx-x-circle"></i></button>
        `;
    });

    renderPagination(data, currentPage, rowsPerPage, paginationContainer, (newPage) => {
        currentPage = newPage;
        renderAdminTable(data); 
    });
    updateEntriesInfo(data, currentPage, rowsPerPage, entriesInfo);

    // Add event listeners for edit/delete buttons
    document.querySelectorAll('.editBtn:not([disabled])').forEach(button => {
        button.addEventListener('click', (event) => editAdmin(event.target.dataset.uid));
    });
    document.querySelectorAll('.deleteBtn:not([disabled])').forEach(button => {
        button.addEventListener('click', (event) => deleteAdmin(event.target.dataset.uid));
    });
}

function applySearchAndSortAdmins() {
    let currentData = [...allAdminData];

    // Apply Search
    const searchTerm = (searchInput.value || '').toLowerCase().trim();
    if (searchTerm) {
        currentData = currentData.filter(admin =>
            (admin.firstName || '').toLowerCase().includes(searchTerm) ||
            (admin.lastName || '').toLowerCase().includes(searchTerm) ||
            (admin.email || '').toLowerCase().includes(searchTerm) ||
            (admin.mobile || '').toLowerCase().includes(searchTerm) ||
            (admin.adminPosition || '').toLowerCase().includes(searchTerm)
        );
    }

    // Apply Sort
    const sortValue = sortSelect.value;
    if (sortValue) {
        currentData.sort((a, b) => {
            let valA, valB;
            const [field, order] = sortValue.split('-');

            switch (field) {
                case 'firstName':
                    valA = (a.firstName || '').toLowerCase();
                    valB = (b.firstName || '').toLowerCase();
                    break;
                case 'lastName':
                    valA = (a.lastName || '').toLowerCase();
                    valB = (b.lastName || '').toLowerCase();
                    break;
                case 'email':
                    valA = (a.email || '').toLowerCase();
                    valB = (b.email || '').toLowerCase();
                    break;
                case 'mobileNumber':
                    valA = parseInt(a.mobile || '0');
                    valB = parseInt(b.mobile || '0');
                    break;
                case 'adminPosition':
                    valA = (a.adminPosition || '').toLowerCase();
                    valB = (b.adminPosition || '').toLowerCase();
                    break;
                default:
                    valA = (a.lastName || '').toLowerCase(); 
                    valB = (b.lastName || '').toLowerCase();
                    break;
            }

            if (typeof valA === 'number') {
                return order === 'asc' ? valA - valB : valB - valA;
            } else {
                return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
        });
    }

    filteredAdminData = currentData; 
    currentPage = 1; 
    renderAdminTable(filteredAdminData);
}

// --- Modal & Form Event Listeners (Add Admin) ---
if (addNewAdminButton) {
    addNewAdminButton.addEventListener('click', () => {
        if (!currentUserIsSuperAdmin) {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to add AB Admin accounts.',
                icon: 'error',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        clearAddAdminInputs(); 
        addAdminModal.style.display = 'flex';
        document.getElementById('modalTitle').textContent = 'Add Admin';
    });
}

// Close Add Admin Modal
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        addAdminModal.style.display = 'none';
        clearAddAdminInputs();
    });
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === addAdminModal) {
        addAdminModal.style.display = 'none';
        clearAddAdminInputs();
    }
    if (event.target === confirmModal) {
        confirmModal.style.display = 'none';
    }
});

// Handle "Next" button in Add Admin form
if (addAdminForm) {
    addAdminForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Super Admin Role Check (redundant but good for client-side defense)
        if (!currentUserIsSuperAdmin) {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to add AB Admin accounts.',
                icon: 'error',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }

        // Get form values
        const firstName = firstNameInput.value.trim();
        const middleInitial = middleInitialInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const nameExtension = nameExtensionInput.value.trim();
        const email = emailInput.value.trim();
        const mobile = mobileNumberInput.value.trim();
        const socialMedia = socialMediaInput.value.trim();
        const adminPosition = adminPositionSelect.value;

        // 2. Client-side Validation
        if (!firstName || !lastName || !email || !mobile || !adminPosition) {
            Swal.fire('Error', 'Please fill in all required fields.', 'error');
            return;
        }
        if (!isValidEmail(email)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Email',
                text: 'Please enter a valid Gmail address (e.g., example@gmail.com).',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        if (!isValidMobile(mobile)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Mobile Number',
                text: 'Mobile number must be 11 digits starting with "09"',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }

        // Display confirmation details
        const confirmContent = `
            <p><strong>Name:</strong> ${firstName} ${middleInitial ? middleInitial + '.' : ''} ${lastName} ${nameExtension ? nameExtension : ''}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Mobile:</strong> ${mobile}</p>
            <p><strong>Social Media:</strong> ${socialMedia || 'N/A'}</p>
            <p><strong>Position:</strong> ${adminPosition}</p>
        `;
        confirmDetailsDiv.innerHTML = confirmContent;

        // Store current form data in a temporary object/global variable for access by confirmSaveBtn
        // Make sure this is cleared after save/cancel
        window.tempAdminFormData = {
            firstName, middleInitial, lastName, nameExtension, email, mobile, socialMedia, adminPosition
        };

        addAdminModal.style.display = 'none'; // Hide registration modal
        confirmModal.style.display = 'flex'; // Show confirmation modal
    });
}

// Handle "Return" button in Confirmation Modal
if (editDetailsBtn) { // Renamed from editDetailsBtn to "Return"
    editDetailsBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none'; // Hide confirmation modal
        addAdminModal.style.display = 'flex'; // Show registration modal again
    });
}

// Handle "Confirm" button in Confirmation Modal
if (confirmSaveBtn) {
    confirmSaveBtn.addEventListener('click', async () => {
        // Retrieve data from temporary storage
        const adminData = window.tempAdminFormData;
        if (!adminData) {
            Swal.fire('Error', 'Form data not found. Please try again.', 'error');
            return;
        }

        // Show loading spinner
        Swal.fire({
            title: 'Creating Admin Account...',
            text: 'Please wait...',
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-success-clean',
                title: 'swal2-title-success-clean',
                htmlContainer: 'swal2-text-success-clean'
            },
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            // Generate a temporary password (Firebase Auth requires one for new users)
            const tempPassword = generateTempPassword();

            // Create User in Firebase Authentication using secondaryAuth
            const newUserCredential = await secondaryAuth.createUserWithEmailAndPassword(adminData.email, tempPassword);
            const newUser = newUserCredential.user;

            // Save User Data to Firebase Realtime Database
            await database.ref(`users/${newUser.uid}`).set({
                role: "AB ADMIN", // Assign the AB ADMIN role
                firstName: adminData.firstName,
                middleInitial: adminData.middleInitial || '',
                lastName: adminData.lastName,
                nameExtension: adminData.nameExtension || '',
                email: adminData.email,
                mobile: adminData.mobile,
                socialMedia: adminData.socialMedia || '',
                adminPosition: adminData.adminPosition,
                createdAt: new Date().toISOString(),
                isFirstLogin: true, 
                emailVerified: false, 
                password_needs_reset: true 
            });

            // Send EmailJS Confirmation
            emailjs.send('service_g5f0erj', 'template_0yk865p', {
                email: adminData.email,
                userName: `${adminData.firstName} ${adminData.lastName}`, 
                tempPassword: tempPassword,
                message: `Your AB Admin account for Bayanihan has been successfully created. Please use the credentials below to log in. You will be prompted to verify your email and reset your password upon your first login.`,
                verification_message: `Please log in using the provided email and temporary password. You will be prompted to verify your email and reset your password upon your first login.`
            });

            // Success Feedback
            Swal.fire({
                icon: 'success',
                title: 'AB Admin Account Added!',
                text: 'Login credentials have been sent via email. They will be prompted to reset their password on first login.',
                timer: 4000,
                timerProgressBar: true,
                showConfirmButton: false
            });

            // Clean up and refresh
            confirmModal.style.display = 'none';
            clearAddAdminInputs();
            delete window.tempAdminFormData; 
            await secondaryAuth.signOut(); 
            fetchAndRenderAdmins(); 

        } catch (error) {
            Swal.hideLoading(); // Hide loading on error
            let errorMessage = error.message;
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'The email address is already in use by another account.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'The email address is not valid.';
            }

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Failed to add AB Admin: ${errorMessage}`,
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
        }
    });
}

// --- Search and Sort Event Listeners ---
if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('keyup', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applySearchAndSortAdmins();
        }, 300);
    });
}

if (sortSelect) {
    sortSelect.addEventListener("change", applySearchAndSortAdmins);
}

// Function to populate the edit modal with admin data
async function populateEditModal(uid) {
    try {
        const snapshot = await database.ref(`users/${uid}`).once('value');
        const adminData = snapshot.val();

        if (adminData) {
            editFirstNameInput.value = adminData.firstName || '';
            editMiddleInitialInput.value = adminData.middleInitial || '';
            editLastNameInput.value = adminData.lastName || '';
            editNameExtensionInput.value = adminData.nameExtension || '';
            editEmailInput.value = adminData.email || '';
            editMobileInput.value = adminData.mobile || '';
            editSocialMediaInput.value = adminData.socialMedia || '';
            editAdminPositionSelect.value = adminData.adminPosition || '';

            // Store the UID for saving changes
            editAdminModal.dataset.uid = uid;

            Swal.close();
            editAdminModal.style.display = 'flex'; // Show the modal
        } else {
            Swal.fire('Error', 'Admin data not found.', 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Failed to load admin data: ' + error.message, 'error');
    }
}

// --- Edit Admin ---
function editAdmin(uid) {
    if (!currentUserIsSuperAdmin) {
        Swal.fire({
            title: 'Access Denied',
            text: 'You do not have permission to edit admin accounts.',
            icon: 'error',
            showConfirmButton: true,
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean',
                confirmButton: 'my-error-button'
            }
        });
        return;
    }
    populateEditModal(uid);
}

// Save Changes in Edit Modal
if (editAdminForm) {
    editAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUserIsSuperAdmin) {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to edit admin accounts.',
                icon: 'error',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }

        const uid = editAdminModal.dataset.uid;
        if (!uid) {
            Swal.fire('Error', 'Admin UID not found.', 'error');
            return;
        }

        // Get form values
        const updatedData = {
            firstName: editFirstNameInput.value.trim(),
            middleInitial: editMiddleInitialInput.value.trim(),
            lastName: editLastNameInput.value.trim(),
            nameExtension: editNameExtensionInput.value.trim(),
            email: editEmailInput.value.trim(),
            mobile: editMobileInput.value.trim(),
            socialMedia: editSocialMediaInput.value.trim(),
            adminPosition: editAdminPositionSelect.value
        };

        // Client-side Validation
        if (!updatedData.firstName || !updatedData.lastName || !updatedData.email || !updatedData.mobile || !updatedData.adminPosition) {
            Swal.fire('Error', 'Please fill in all required fields.', 'error');
            return;
        }
        if (!isValidEmail(updatedData.email)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Email',
                text: 'Please enter a valid Gmail address (e.g., example@gmail.com).',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        if (!isValidMobile(updatedData.mobile)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Mobile Number',
                text: 'Please enter a valid mobile number.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }

        // Check if mobile number is already in use by another user
        const mobileInUse = await isMobileNumberInUse(updatedData.mobile, uid);
        if (mobileInUse) {
            Swal.fire({
                icon: 'error',
                title: 'Mobile Number In Use',
                text: 'The mobile number is already in use by another account.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }

        // Check if email is already in use by another user
        const emailInUse = await isEmailInUse(updatedData.email, uid);
        if (emailInUse) {
            Swal.fire({
                icon: 'error',
                title: 'Email In Use',
                text: 'The email address is already in use by another account.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }

        // Check if data is unchanged
        const unchanged = await isDataUnchanged(uid, updatedData);
        if (unchanged) {
            Swal.fire({
                icon: 'info',
                title: 'No Changes Detected',
                text: 'No changes were made to the admin details.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean',
                    confirmButton: 'my-success-button'
                }
            });
            editAdminModal.style.display = 'none';
            return;
        }

        // Verify Super Admin password
        const passwordVerified = await verifySuperAdminPassword();
        if (!passwordVerified) {
            return; // Stop if password verification fails or is canceled
        }

        Swal.fire({
            title: 'Saving Changes...',
            text: 'Updating admin data in Firebase...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            await database.ref(`users/${uid}`).update(updatedData);
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Admin details updated successfully!',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                timer: 3000,
                timerProgressBar: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean',
                    confirmButton: 'my-success-button'
                }
            }).then(() => {
                editAdminModal.style.display = 'none';
                fetchAndRenderAdmins(); 
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to update admin: ' + error.message,
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
        }
    });
}

// Close Edit Admin Modal
if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener('click', () => {
        editAdminModal.style.display = 'none';
    });
}

// --- Delete Admin ---
function deleteAdmin(uid) {
    if (!currentUserIsSuperAdmin) {
        Swal.fire({
            title: 'Access Denied',
            text: 'You do not have permission to delete admin accounts.',
            icon: 'error',
            showConfirmButton: true,
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean',
                confirmButton: 'my-error-button'
            }
        });
        return;
    }

    // Verify Super Admin password before proceeding
    verifySuperAdminPassword().then((passwordVerified) => {
        if (!passwordVerified) {
            return; // Stop if password verification fails or is canceled
        }

        Swal.fire({
            title: 'Are you sure to archive this admin?',
            text: "This will move it to archived records.",        
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Archive',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            focusCancel: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'custom-swal-popup-large',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-content',
                confirmButton: 'custom-confirm-btn',
                cancelButton: 'custom-cancel-btn'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Archiving Admin...',
                    text: 'Moving admin data to deleted records...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const snapshot = await database.ref(`users/${uid}`).once('value');
                    const adminDataToMove = snapshot.val();

                    if (!adminDataToMove) {
                        Swal.fire('Error', 'Admin data not found for deletion/archiving.', 'error');
                        return;
                    }
                    adminDataToMove.deletedAt = new Date().toISOString();

                    await database.ref(`deletedAdmins/${uid}`).set(adminDataToMove);
                    await database.ref(`users/${uid}`).remove();

                    Swal.close();
                    Swal.fire({
                        icon: 'success',
                        title: 'Archived!',
                        text: 'The admin account has been moved to archived records.',
                        timer: 3000,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean'
                        }
                    }).then(() => {
                        fetchAndRenderAdmins(); 
                    });
                } catch (error) {
                    Swal.close(); 
                    Swal.fire('Error', 'Failed to archive admin: ' + error.message, 'error');
                }
            }
        });
    });
}

// --- Archived Admins ---
async function fetchAndRenderArchivedAdmins() {
    Swal.fire({
        title: 'Loading Archived Admins',
        text: 'Fetching archived data from Firebase...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const snapshot = await database.ref('deletedAdmins').once('value');
        const archivedUsers = snapshot.val();
        allArchivedAdminData = [];

        for (const uid in archivedUsers) {
            const user = archivedUsers[uid];
            allArchivedAdminData.push({
                uid: uid, // Store UID for actions
                ...user
            });
        }
        Swal.close();
        renderArchivedTable(allArchivedAdminData);
        archivedModal.style.display = 'flex'; // Show the modal after data is loaded
    } catch (error) {
        Swal.fire('Error', 'Failed to load archived admin data: ' + error.message, 'error');
    }
}

function renderArchivedTable(data) {
    if (!archivedTableBody) {
        return;
    }

    archivedTableBody.innerHTML = '';

    const paginatedData = getPaginatedData(data, currentArchivedPage, archivedRowsPerPage);

    if (paginatedData.length === 0) {
        archivedTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No archived admin accounts found.</td></tr>';
    }

    paginatedData.forEach(admin => {
        const row = archivedTableBody.insertRow();
        row.dataset.uid = admin.uid;

        const fullName = `${admin.firstName || ''} ${admin.middleInitial ? admin.middleInitial + '.' : ''} ${admin.lastName || ''} ${admin.nameExtension || ''}`.trim();
        const archivedDate = admin.deletedAt ? new Date(admin.deletedAt).toLocaleDateString() : 'N/A';

        row.insertCell(0).textContent = fullName || 'N/A';
        row.insertCell(1).textContent = admin.email || 'N/A';
        row.insertCell(2).textContent = `${admin.adminPosition || 'N/A'} (${admin.role || 'N/A'})`;
        row.insertCell(3).textContent = archivedDate;

        const actionsCell = row.insertCell(4);
        actionsCell.innerHTML = `
            <button class="retrieveBtn" data-uid="${admin.uid}">Retrieve</button>
        `;
    });

    // Use the global pagination functions for archived table
    renderPagination(data, currentArchivedPage, archivedRowsPerPage, archivedPaginationContainer, (newPage) => {
        currentArchivedPage = newPage;
        renderArchivedTable(data); 
    });
    updateEntriesInfo(data, currentArchivedPage, archivedRowsPerPage, archivedEntriesInfo);

    // Add event listeners for retrieve buttons
    document.querySelectorAll('.retrieveBtn').forEach(button => {
        button.addEventListener('click', (event) => retrieveAdmin(event.target.dataset.uid));
    });
}

async function retrieveAdmin(uid) {
    if (!currentUserIsSuperAdmin) {
        Swal.fire({
            title: 'Access Denied',
            text: 'You do not have permission to delete admin accounts.',
            icon: 'error',
            showConfirmButton: true,
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean',
                confirmButton: 'my-error-button'
            }
        });
        return;
    }

    Swal.fire({
        title: 'Retrieve Application?',
        text: 'This will retrieve the admin account from archived records and make it active again.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Retrieve',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        focusCancel: true,
        allowOutsideClick: false,
        customClass: {
            popup: 'custom-swal-popup-small',
            title: 'custom-swal-title',
            htmlContainer: 'custom-swal-content',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Retrieving Admin...',
                text: 'Moving admin data back to active records...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                const snapshot = await database.ref(`deletedAdmins/${uid}`).once('value');
                const adminDataToRetrieve = snapshot.val();

                if (!adminDataToRetrieve) {
                    Swal.fire('Error', 'Archived admin data not found for retrieval.', 'error');
                    return;
                }

                // Remove the deletedAt timestamp as it's being reactivated
                delete adminDataToRetrieve.deletedAt;

                // Move data back to the 'users' node
                await database.ref(`users/${uid}`).set(adminDataToRetrieve);

                // Delete from 'deletedAdmins' node
                await database.ref(`deletedAdmins/${uid}`).remove();

                Swal.close();
                Swal.fire({
                    icon: 'success',
                    title: 'Retrieved!',
                    text: 'The admin account has been retrieved and is now active.',
                    timer: 3000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                    }
                }).then(() => {
                    fetchAndRenderAdmins();
                    fetchAndRenderArchivedAdmins();
                });
            } catch (error) {
                Swal.close();
                Swal.fire('Error', 'Failed to retrieve admin: ' + error.message, 'error');
            }
        }
    });
}

// Open Archived Admins Modal
if (viewArchivedButton) {
    viewArchivedButton.addEventListener('click', () => {
        if (!currentUserIsSuperAdmin) {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to view archived admin accounts.',
                icon: 'error',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        currentArchivedPage = 1; // Reset to first page when opening
        fetchAndRenderArchivedAdmins();
    });
}

// Close Archived Admins Modal
if (closeArchivedModalBtn) {
    closeArchivedModalBtn.addEventListener('click', () => {
        archivedModal.style.display = 'none';
    });
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === addAdminModal) {
        addAdminModal.style.display = 'none';
        clearAddAdminInputs();
    }
    if (event.target === confirmModal) {
        confirmModal.style.display = 'none';
    }
    if (event.target === archivedModal) { 
        archivedModal.style.display = 'none';
    }
    if (event.target === editAdminModal) {
        editAdminModal.style.display = 'none';
    }
});

// --- Initialize (on DOMContentLoaded) ---
document.addEventListener("DOMContentLoaded", () => {
    // No explicit call needed here as auth.onAuthStateChanged handles initial fetch
});