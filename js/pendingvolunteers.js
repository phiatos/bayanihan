console.log = function () {};
console.error = function () {};
console.warn = function () {};

// Firebase Configuration
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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const auth = firebase.auth();

// EmailJS with your public key
try {
    emailjs.init('BwfsCx-NJCb3qGxCk');
} catch (error) {}

// Variables for inactivity detection
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

// Global variables for user permissions
let currentUserIsSuperAdmin = false;
let currentUserAdminPosition = null;

// Permissions configuration from Version 2
const permissions = {
    'Super Admin': ['view', 'confirmByAB', 'endorseToABVN', 'setStalled', 'import', 'archive', 'retrieve'],
    'position-one': ['view', 'confirmByAB', 'endorseToABVN', 'setStalled', 'import', 'archive', 'retrieve'],
    'position-two': ['view', 'confirmByAB', 'endorseToABVN', 'setStalled', 'import']
};

async function verifySuperAdminPassword() {
    const { value: password } = await Swal.fire({
        title: 'Enter Admin Password',
        input: 'password',
        inputPlaceholder: 'Enter password here',
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
                return 'Password is required!';
            }
        }
    });
    if (!password) return false;
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user found.');
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

// Function to check if user has permission for an action
function restrictAction(action) {
    if (!currentUserAdminPosition) {
        Swal.fire({
            title: 'Access Denied',
            text: 'No admin position assigned. Contact system administrator.',
            icon: 'error',
            timer: 2000,
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
    const allowedActions = permissions[currentUserAdminPosition] || [];
    if (!allowedActions.includes(action)) {
        Swal.fire({
            title: 'Access Denied',
            text: `You do not have permission to ${action.replace(/([A-Z])/g, ' $1').toLowerCase()}.`,
            icon: 'error',
            timer: 2000,
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
    return true;
}

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
}

// Function to check for inactivity and prompt the user
function checkInactivity() {
    Swal.fire({
        title: 'Are you still there?',
        text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Stay Login',
        cancelButtonText: 'Log Out',
        reverseButtons: true,
        focusCancel: true,
        allowOutsideClick: false,
        customClass: {
            popup: 'custom-swal-popup-small',
            title: 'custom-swal-title',
            htmlContainer: 'custom-swal-content',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn'
        },
    }).then((result) => {
        if (result.isConfirmed) {
            resetInactivityTimer();
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            auth.signOut().then(() => {
                window.location.href = "../pages/login.html";
            }).catch((error) => {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to log out. Please try again.',
                    icon: 'error',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                    }
                });
            });
        }
    });
}

// Attach event listeners to detect user activity
function setupInactivityListeners() {
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });
}

// Authentication Check
auth.onAuthStateChanged(user => {
    if (!user) {
        Swal.fire({
            icon: 'error',
            title: 'Authentication Required',
            text: 'Please sign in to access pending volunteer applications.',
            timer: 2000,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean'
            }
        }).then(() => {
            window.location.href = "../pages/login.html";
        });
        return;
    }

    // Fetch user role to determine Super Admin status and permissions
    database.ref(`users/${user.uid}`).once('value', snapshot => {
        const userData = snapshot.val();
        if (userData && userData.adminPosition) {
            currentUserAdminPosition = userData.adminPosition;
        } else {
            currentUserAdminPosition = null;
        }
        currentUserIsSuperAdmin = userData && userData.isSuperAdmin === true;
        initializePageFunctions(user.uid);
        setupInactivityListeners();
        resetInactivityTimer();
    }).catch(error => {
        currentUserAdminPosition = null;
        currentUserIsSuperAdmin = false;
        initializePageFunctions(user.uid);
        setupInactivityListeners();
        resetInactivityTimer();
    });
});

function initializePageFunctions(userId) {
    const volunteersContainer = document.getElementById('volunteersContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewApprovedBtn = document.getElementById('viewApprovedBtn');
    const archivedModal = document.getElementById('archivedModal');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
    const archivedTableBody = document.getElementById('archivedTableBody');
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const archivedPagination = document.getElementById('archivedPagination');
    const exportBtn = document.getElementById('exportBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');

    // Modals
    const previewModal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');
    const modalContent = document.getElementById('modalContent');
    const scheduleModal = document.getElementById('scheduleModal');
    const closeScheduleModal = document.getElementById('closeScheduleModal');
    const scheduleForm = document.getElementById('scheduleForm');
    const scheduleDateTimeInput = document.getElementById('scheduleDateTime');
    const endorseABVNModal = document.getElementById('endorseABVNModal');
    const closeEndorseABVNModal = document.getElementById('closeEndorseABVNModal');
    const endorseABVNForm = document.getElementById('endorseABVNForm');
    const abvnListContainer = document.getElementById('abvnListContainer');
    const endorseABVNSubmitBtn = document.getElementById('endorseABVNSubmitBtn');

    // Import
    const importExcelBtn = document.getElementById("importExcelBtn");
    const excelFileInput = document.getElementById("excelFileInput");
    const importStatusModal = document.getElementById("importStatusModal");
    const closeImportStatusModalBtn = document.getElementById("closeImportStatusModalBtn");
    const importProgressBar = document.getElementById("importProgressBar");
    const importStatusText = document.getElementById("importStatusText");
    const importErrorList = document.getElementById("importErrorList");

    let allApplications = [];
    let filteredApplications = [];
    let archivedApplications = [];
    let currentPage = 1;
    let archivedCurrentPage = 1;
    const rowsPerPage = 5;
    const archivedRowsPerPage = 5;
    let currentVolunteerKey = null;
    let currentVolunteerData = null;
    let currentDropdown = null;

    // Event listeners for search and sort
    searchInput.addEventListener('input', applySearchAndSort);
    sortSelect.addEventListener('change', applySearchAndSort);

    // Event listeners for export buttons
    exportBtn.addEventListener('click', exportToExcel);
    savePdfBtn.addEventListener('click', exportToPDF);

    function showError(input, message) {}

    async function validateVolunteerForm(inputs) {
        let isValid = true;
        if (!inputs.name.value || inputs.name.value.trim() === '') {
            showError(inputs.name, 'Full Name is required.');
            isValid = false;
        }
        if (inputs.email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputs.email.value)) {
            showError(inputs.email, 'Invalid email format.');
            isValid = false;
        }
        if (inputs.mobileNumber.value && !/^09\d{9}$/.test(inputs.mobileNumber.value)) {
            showError(inputs.mobileNumber, 'Mobile Number must be 11 digits starting with 09.');
            isValid = false;
        }
        if (inputs.age.value && (isNaN(inputs.age.value) || inputs.age.value < 18)) {
            showError(inputs.age, 'Age must be a number >= 18.');
            isValid = false;
        }
        if (!inputs.region.value) {
            showError(inputs.region, 'Region is required.');
            isValid = false;
        }
        if (!inputs.province.value) {
            showError(inputs.province, 'Province is required.');
            isValid = false;
        }
        if (!inputs.city.value) {
            showError(inputs.city, 'City is required.');
            isValid = false;
        }
        if (!inputs.barangay.value) {
            showError(inputs.barangay, 'Barangay is required.');
            isValid = false;
        }
        if (inputs.specificDateTimeSlots.value) {
            const slots = inputs.specificDateTimeSlots.value.split(',').map(slot => slot.trim());
            for (const slot of slots) {
                const [date, time] = slot.split(' at ');
                if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}\s(AM|PM)$/.test(time)) {
                    showError(inputs.specificDateTimeSlots, 'Date/Time Availability must be in format YYYY-MM-DD at HH:MM AM/PM');
                    isValid = false;
                }
            }
        }
        return isValid;
    }

async function checkForDuplicate(mobileNumber, email, name) {
    const duplicates = { all: false, email: false, number: false, name: false };
    try {
        const snapshot = await database.ref('pendingVolunteer').once('value');
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const volunteer = childSnapshot.val();
                if (volunteer.email && email && volunteer.email.toLowerCase() === email.toLowerCase()) {
                    duplicates.email = true;
                }
                if (volunteer.mobileNumber && mobileNumber && volunteer.mobileNumber === mobileNumber) {
                    duplicates.number = true;
                }
                if (volunteer.name && name && volunteer.name.toLowerCase() === name.toLowerCase()) {
                    duplicates.name = true;
                }
                if (duplicates.email && duplicates.number && duplicates.name) {
                    duplicates.all = true;
                }
            });
        }
    } catch (error) {
    }
    return duplicates;
}

    // Event listener for import button
    importExcelBtn.addEventListener("click", () => {
        if (!restrictAction('import')) {
            Swal.fire('Error', 'You do not have permission to import volunteers.', 'error');
            return;
        }
        excelFileInput.click();
    });

    // Add event listener for closing import status modal
    closeImportStatusModalBtn.addEventListener("click", () => {
        importStatusModal.style.display = "none";
    });

    // Function to close import status modal
    function closeImportStatusModal() {
        importStatusModal.style.display = "none";
    }

    // Function to show import status modal
    function showImportStatusModal(message) {
        importStatusModal.style.display = "flex";
        importProgressBar.style.width = "0%";
        importProgressBar.textContent = "0%";
        importStatusText.textContent = message || "Processing file...";
        importErrorList.innerHTML = "";
    }

    // Function to update import progress
    function updateImportStatus(progress, message) {
        const percentage = Math.round(progress);
        importProgressBar.style.width = `${percentage}%`;
        importProgressBar.textContent = `${percentage}%`;
        importStatusText.textContent = message;
    }

    function downloadExcelTemplate() {
    const headers = [
        "Full Name",
        "Middle Initial",
        "Name Extension",
        "Email",
        "Mobile Number",
        "Age",
        "Social Media",
        "Other Skills",
        "Emergency Response",
        "Date/Time Availability",
        "Street Address",
        "Region",
        "Province",
        "City",
        "Barangay",
        "Skills",
        "Status Notes"
    ];
    const sampleData = [{
        "Full Name": "Jane Doe",
        "Middle Initial": "",
        "Name Extension": "",
        "Email": "jane.doe@gmail.com",
        "Mobile Number": "09123456789",
        "Age": 25,
        "Social Media": "Facebook: JaneDoe",
        "Other Skills": "First Aid Training",
        "Emergency Response": "Yes (24/7)",
        "Date/Time Availability": "2025-08-20 at 10:00 AM, 2025-08-21 at 02:00 PM",
        "Street Address": "123 Main St",
        "Region": "NCR",
        "Province": "Metro Manila",
        "City": "Quezon City",
        "Barangay": "Bagong Pag-asa",
        "Skills": "Medical, Logistics",
        "Status Notes": "Pending"
    }];
    const instructions = [{
        Instructions: "1. Ensure Mobile Number is 11 digits starting with '09' (e.g., 09123456789). Format the Mobile Number column as 'Text' in Excel to preserve leading zeros.\n2. Duplicate volunteers (same name, mobile number, and email) are allowed but will prompt for confirmation during import.\n3. Emergency Response should be 'Yes (24/7)' or 'No'.\n4. Date/Time Availability should be in the format 'YYYY-MM-DD at HH:MM AM/PM' (comma-separated for multiple slots, e.g., '2025-08-20 at 10:00 AM, 2025-08-21 at 02:00 PM').\n5. Skills can include 'Medical', 'Logistics', 'General' (comma-separated).\n6. Status Notes can be 'Pending', 'Approved', 'Rejected', or other valid statuses."
    }];

    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Volunteer Template");
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    const filename = `volunteer_template_${formattedDate}.xlsx`;
    XLSX.writeFile(wb, filename);
    Swal.fire({
        title: 'Template Downloaded!',
        text: `Excel template saved as "${filename}"`,
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
}

    // Add Excel import handling
    excelFileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;

        showImportStatusModal("Reading file...");

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                const headers = json[0];
                const requiredHeaders = ["Full Name", "Email", "Mobile Number", "Age", "Region", "Province", "City", "Barangay"];
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    importErrorList.innerHTML = `<li>Missing required columns: ${missingHeaders.join(', ')}</li>`;
                    updateImportStatus(0, "Import failed due to missing columns.");
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: `Missing required columns: ${missingHeaders.join(', ')}`,
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean',
                            confirmButton: 'my-error-button'
                        }
                    });
                    importStatusModal.style.display = 'flex';
                    return;
                }

                const rows = json.slice(1);
                const volunteersToImport = [];
                const potentialDuplicates = [];
                const importErrors = [];
                const totalRows = rows.length;
                let processedRows = 0;

                for (let i = 0; i < totalRows; i++) {
                    const row = rows[i];
                    if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
                        importErrors.push(`Row ${i + 2}: Empty row skipped.`);
                        continue;
                    }
                    processedRows++;
                    const progress = (processedRows / totalRows) * 100;
                    updateImportStatus(progress, `Processing row ${processedRows} of ${totalRows}...`);

                    // Inside the excelFileInput event listener, replace the mockInputs creation with this:
                    const fullName = String(row[headers.indexOf("Full Name")] || '').trim();
                    if (!fullName) {
                        importErrors.push(`Row ${i + 2}: Full Name is missing or invalid.`);
                        continue;
                    }

                    const volunteer = {
                        firstName: fullName.split(' ')[0] || 'Unknown',
                        lastName: fullName.split(' ').slice(-1)[0] || 'Unknown',
                        middleInitial: String(row[headers.indexOf("Middle Initial")] || '').trim(),
                        nameExtension: String(row[headers.indexOf("Name Extension")] || '').trim(),
                        email: String(row[headers.indexOf("Email")] || '').trim(),
                        mobileNumber: String(row[headers.indexOf("Mobile Number")] || '').trim().replace(/\D/g, ''),
                        age: parseInt(row[headers.indexOf("Age")] || 0),
                        socialMediaLink: String(row[headers.indexOf("Social Media")] || '').trim(),
                        otherSkillComments: String(row[headers.indexOf("Other Skills")] || '').trim(),
                        isEmergencyResponse: String(row[headers.indexOf("Emergency Response")] || '').trim() === 'Yes (24/7)',
                        availability: String(row[headers.indexOf("Date/Time Availability")] || '').trim()
                            ? {
                                specificDateTimeSlots: String(row[headers.indexOf("Date/Time Availability")] || '')
                                    .trim()
                                    .split(',')
                                    .map(slot => {
                                        const [date, time] = slot.trim().split(' at ');
                                        return { date: date || '', time: time || '' };
                                    })
                                    .filter(slot => slot.date && slot.time)
                            }
                            : null,
                        address: {
                            streetAddress: String(row[headers.indexOf("Street Address")] || '').trim(),
                            region: String(row[headers.indexOf("Region")] || '').trim(),
                            province: String(row[headers.indexOf("Province")] || '').trim(),
                            city: String(row[headers.indexOf("City")] || '').trim(),
                            barangay: String(row[headers.indexOf("Barangay")] || '').trim()
                        },
                        skills: String(row[headers.indexOf("Skills")] || '').trim().split(',').map(skill => skill.trim()).filter(skill => skill),
                        status: String(row[headers.indexOf("Status Notes")] || 'Pending').trim(),
                        statusNotes: String(row[headers.indexOf("Status Notes")] || '').trim(),
                        applicationDateandTime: new Date().toISOString(),
                        lastStatusUpdate: Date.now(),
                        recaptchaResponse: null
                    };

                    // Normalize mobile number
                    if (volunteer.mobileNumber && volunteer.mobileNumber.length === 10 && volunteer.mobileNumber.startsWith('9')) {
                        volunteer.mobileNumber = '0' + volunteer.mobileNumber;
                    }

                    // Create mock inputs, adding the `name` field
                    const mockInputs = {
                        name: { value: fullName, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null }, // Add name field
                        firstName: { value: volunteer.firstName, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        lastName: { value: volunteer.lastName, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        middleInitial: { value: volunteer.middleInitial, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        nameExtension: { value: volunteer.nameExtension, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        email: { value: volunteer.email, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        mobileNumber: { value: volunteer.mobileNumber, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        age: { value: volunteer.age.toString(), classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        socialMediaLink: { value: volunteer.socialMediaLink, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        otherSkillComments: { value: volunteer.otherSkillComments, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        isEmergencyResponse: { value: volunteer.isEmergencyResponse ? 'Yes (24/7)' : 'No', classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        specificDateTimeSlots: { value: volunteer.availability ? volunteer.availability.specificDateTimeSlots.map(slot => `${slot.date} at ${slot.time}`).join(',') : '', classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        streetAddress: { value: volunteer.address.streetAddress, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        region: { value: volunteer.address.region, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        province: { value: volunteer.address.province, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        city: { value: volunteer.address.city, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        barangay: { value: volunteer.address.barangay, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        skills: { value: volunteer.skills.join(','), classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        status: { value: volunteer.status, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null },
                        statusNotes: { value: volunteer.statusNotes, classList: { add: () => {}, remove: () => {} }, nextElementSibling: null }
                    };

                    // Override showError to collect errors
                    const originalShowError = showError;
                    const rowErrors = [];
                    showError = (input, message) => {
                        rowErrors.push(`Row ${i + 2}: ${message}`);
                    };

                    // Validate with try-catch to catch the error
                    let isValidRow = false;
                    try {
                        isValidRow = await validateVolunteerForm(mockInputs);
                    } catch (error) {
                        importErrors.push(`Row ${i + 2}: Validation error - ${error.message}`);
                    }

                    // Restore original showError
                    showError = originalShowError;

                    if (!isValidRow) {
                        if (rowErrors.length > 0) {
                            importErrors.push(...rowErrors);
                        }
                        continue;
                    }

                    // Check for duplicates
                    const duplicates = await checkForDuplicate(volunteer.mobileNumber, volunteer.email, volunteer.firstName + ' ' + volunteer.lastName);
                    if (duplicates.all || duplicates.email || duplicates.number || duplicates.name) {
                        const duplicateMessages = [];
                        if (duplicates.all) {
                            duplicateMessages.push(`Row ${i + 2}: Same name, mobile number, and email already exist.`);
                        } else {
                            if (duplicates.email) duplicateMessages.push(`Row ${i + 2}: Email already used.`);
                            if (duplicates.number) duplicateMessages.push(`Row ${i + 2}: Mobile number already used.`);
                            if (duplicates.name) duplicateMessages.push(`Row ${i + 2}: Name already used.`);
                        }
                        potentialDuplicates.push({
                            rowIndex: i + 2,
                            volunteer,
                            duplicateMessages
                        });
                    } else {
                        volunteersToImport.push(volunteer);
                    }

                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                // Handle potential duplicates with confirmation
                if (potentialDuplicates.length > 0) {
                    const duplicateMessages = potentialDuplicates.map(d => d.duplicateMessages.join('<br>')).join('<br>');
                    const result = await Swal.fire({
                        title: 'Potential Duplicate Volunteers Detected',
                        html: `${duplicateMessages}<br><br>Do you want to proceed with importing these records?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Proceed Anyway',
                        cancelButtonText: 'Skip Duplicates',
                        reverseButtons: true,
                        customClass: {
                            popup: 'custom-swal-popup-large',
                            title: 'custom-swal-title',
                            htmlContainer: 'custom-swal-content',
                            confirmButton: 'custom-confirm-btn',
                            cancelButton: 'custom-cancel-btn'
                        }
                    });

                    if (result.isConfirmed) {
                        potentialDuplicates.forEach(d => volunteersToImport.push(d.volunteer));
                    } else {
                        potentialDuplicates.forEach(d => {
                            importErrors.push(d.duplicateMessages.join(''));
                        });
                    }
                }

                if (volunteersToImport.length > 0) {
                    updateImportStatus(100, `Importing ${volunteersToImport.length} records to Firebase...`);
                    const updates = {};
                    volunteersToImport.forEach(volunteer => {
                        const newKey = database.ref().child('volunteerApplications/pendingVolunteer').push().key;
                        updates[`volunteerApplications/pendingVolunteer/${newKey}`] = volunteer;
                    });

                    await database.ref().update(updates);
                    updateImportStatus(100, `Import complete! ${volunteersToImport.length} records added.`);
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: `${volunteersToImport.length} volunteer records imported successfully.`,
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean',
                            confirmButton: 'my-success-button'
                        }
                    }).then(() => {
                        if (importErrors.length === 0) {
                            closeImportStatusModal();
                        }
                    });
                } else {
                    updateImportStatus(100, "Import failed. No valid records found.");
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No valid records found in the Excel file. Please check the data format.',
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean',
                            confirmButton: 'my-error-button'
                        }
                    });
                    importStatusModal.style.display = 'flex';
                }

                if (importErrors.length > 0) {
                    importErrorList.innerHTML = '<li>Errors:</li>' + importErrors.map(err => `<li>${err}</li>`).join('');
                    Swal.fire({
                        icon: 'warning',
                        title: 'Warning',
                        text: 'Some records were not imported due to errors. Check the status modal for details.',
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-warning-clean',
                            title: 'swal2-title-warning-clean',
                            htmlContainer: 'swal2-text-warning-clean',
                            confirmButton: 'my-warning-button'
                        }
                    });
                    importStatusModal.style.display = 'flex';
                }
            } catch (error) {
                importErrorList.innerHTML = `<li>Error: ${error.message}</li>`;
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred while importing the Excel file: ' + error.message,
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                        }
                    });
                    importStatusModal.style.display = 'flex';
                }
            };
        reader.readAsArrayBuffer(file);
    });


    // Add event listener for download template button
    document.getElementById("downloadTemplateBtn").addEventListener("click", downloadExcelTemplate);

    viewApprovedBtn.addEventListener('click', () => {
        if (!restrictAction('view')) return;
        window.location.href = '../pages/approvedvolunteers.html';
    });

    // --- Utility Functions ---
    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true
        });
    }

    function getFullName(volunteer) {
        const parts = [
            volunteer.firstName,
            volunteer.middleInitial ? volunteer.middleInitial + '.' : '',
            volunteer.lastName,
            volunteer.nameExtension
        ].filter(Boolean);
        return parts.join(' ').trim();
    }

    function setupModalClose(modalElement, closeButtonElement) {
        closeButtonElement.addEventListener('click', () => modalElement.style.display = 'none');
        modalElement.addEventListener('click', (event) => {
            if (event.target === modalElement) {
                modalElement.style.display = 'none';
            }
        });
    }

    setupModalClose(previewModal, closeModal);
    setupModalClose(scheduleModal, closeScheduleModal);
    setupModalClose(endorseABVNModal, closeEndorseABVNModal);
    setupModalClose(archivedModal, closeArchivedModalBtn);

    function showPreviewModal(volunteer) {
        if (!restrictAction('view')) return;
        const fullName = getFullName(volunteer);
        let specificSlotsHtml = '';

        if (volunteer.availability && volunteer.availability.specificDateTimeSlots && volunteer.availability.specificDateTimeSlots.length > 0) {
            specificSlotsHtml = `<h5 style="margin-bottom: 10px; color: #14AEBB;">Date/Time Availability:</h5><div style="margin-left: 15px;"><ol style="padding-left: 20px; margin-top: 5px;">`;
            volunteer.availability.specificDateTimeSlots.forEach(slot => {
                if (slot.date && slot.time) {
                    specificSlotsHtml += `<li>${slot.date} at ${slot.time}</li>`;
                }
            });
            specificSlotsHtml += `</ol></div>`;
        } else {
            specificSlotsHtml = `<p><strong>Date/Time Availability:</strong> N/A</p>`;
        }

        let skillsHtml = '';
        if (volunteer.skills && Array.isArray(volunteer.skills) && volunteer.skills.length > 0) {
            skillsHtml = `<h5 style="margin-bottom: 10px; color: #14AEBB;">Selected Skills:</h5><div style="margin-left: 15px;"><ol style="padding-left: 20px; margin-top: 5px;">`;
            volunteer.skills.forEach(skill => {
                if (skill === 'Other' && volunteer.otherSkillComments && volunteer.otherSkillComments.trim()) {
                    skillsHtml += `<li>${skill} (${volunteer.otherSkillComments})</li>`;
                } else {
                    skillsHtml += `<li>${skill}</li>`;
                }
            });
            skillsHtml += `</ol></div>`;
        } else {
            skillsHtml = `<p><strong>Skills:</strong> None selected</p>`;
        }

        modalContent.innerHTML = `
            <div class="modal-content-inner" style="padding: 20px;">
                <h2>Volunteer Details:</h2>
                <p><strong>Application Date/Time:</strong> ${formatDate(volunteer.applicationDateandTime)}</p>
                <p><strong>Full Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${volunteer.email || 'N/A'}</p>
                <p><strong>Mobile Number:</strong> ${volunteer.mobileNumber || 'N/A'}</p>
                <p><strong>Age:</strong> ${volunteer.age || 'N/A'}</p>
                <p><strong>Social Media:</strong> ${volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank" rel="noopener noreferrer">${volunteer.socialMediaLink}</a>` : 'N/A'}</p>
                <p><strong>Additional Info:</strong> ${volunteer.otherSkillComments || 'N/A'}</p>
                <hr>
                <h2>Address Information:</h2>
                <div style="margin-left: 15px;">
                    <p><strong>Region:</strong> ${volunteer.address?.region || 'N/A'}</p>
                    <p><strong>Province:</strong> ${volunteer.address?.province || 'N/A'}</p>
                    <p><strong>City:</strong> ${volunteer.address?.city || 'N/A'}</p>
                    <p><strong>Barangay:</strong> ${volunteer.address?.barangay || 'N/A'}</p>
                    <p><strong>Street Address:</strong> ${volunteer.address?.streetAddress || 'N/A'}</p>
                </div>
                <hr>
                <h2>Availability:</h2>
                <p><strong>Emergency Response:</strong> ${volunteer.isEmergencyResponse ? 'Yes (24/7)' : 'No'}</p>
                ${specificSlotsHtml}
                <hr>
                <h2>Skills:</h2>
                ${skillsHtml}
            </div>
        `;
        previewModal.style.display = 'flex';
    }

    function resetCurrentVolunteer() {
        currentVolunteerKey = null;
        currentVolunteerData = null;
        if (currentDropdown) {
            currentDropdown.remove();
            currentDropdown = null;
        }
        const previouslyActiveButton = document.querySelector('.actionBtn.active');
        if (previouslyActiveButton) {
            previouslyActiveButton.classList.remove('active');
        }
    }

    function showScheduleModal() {
        if (!restrictAction('confirmByAB')) return;

        if (currentVolunteerData?.availability?.specificDateTimeSlots?.length > 0) {
            const firstSlot = currentVolunteerData.availability.specificDateTimeSlots[0];
            if (firstSlot.date && firstSlot.time) {
                const date = firstSlot.date; // Expected format: YYYY-MM-DD
                const time = firstSlot.time.replace(' AM', ':00 AM').replace(' PM', ':00 PM'); // Convert to 24-hour for input
                const dateTimeValue = `${date}T${formatTimeTo24Hr(time)}`;
                scheduleDateTimeInput.value = dateTimeValue;
            } else {
                scheduleDateTimeInput.value = ''; // Clear if no valid slot
            }
        } else {
            scheduleDateTimeInput.value = ''; // Clear if no availability
        }

        scheduleModal.style.display = 'flex';
    }

    function hideScheduleModal() {
        scheduleModal.style.display = 'none';
        scheduleForm.reset();
        resetCurrentVolunteer();
    }

    function showEndorseABVNModal() {
        if (!restrictAction('endorseToABVN')) return;
        endorseABVNModal.style.display = 'flex';
        fetchABVNs();
    }

    function hideEndorseABVNModal() {
        endorseABVNModal.style.display = 'none';
        abvnListContainer.innerHTML = '<p>Loading ABVN locations...</p>';
        endorseABVNSubmitBtn.disabled = true;
        resetCurrentVolunteer();
    }

    // --- Data Fetching Functions ---
    function fetchPendingVolunteers() {
        volunteersContainer.innerHTML = '<tr><td colspan="15" style="text-align: center;">Loading volunteer applications...</td></tr>';
        database.ref('volunteerApplications/pendingVolunteer').on('value', (snapshot) => {
            allApplications = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const volunteerData = childSnapshot.val();
                    const volunteerKey = childSnapshot.key;
                    allApplications.push({ key: volunteerKey, ...volunteerData });
                });
            }
            applySearchAndSort();
        }, (error) => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load pending volunteer applications. Please try again later.',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            volunteersContainer.innerHTML = '<tr><td colspan="15" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        });
    }

    function fetchArchivedApplications() {
        archivedTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading archived applications...</td></tr>';
        database.ref('volunteerApplications/archivedPendingVolunteer').once('value', (snapshot) => {
            archivedApplications = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const volunteerData = childSnapshot.val();
                    const volunteerKey = childSnapshot.key;
                    archivedApplications.push({ key: volunteerKey, ...volunteerData });
                });
            }
            renderArchivedApplications();
        }, (error) => {
            archivedTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        });
    }

    // Cache for ABVN data
    let abvnCache = null;

    function calculateLocationScore(volunteerLocation, groupAddress) {
        if (!volunteerLocation || !groupAddress) return 0;
        const scores = {
            barangay: 50,
            city: 30,
            province: 20,
            region: 10
        };
        let score = 0;
        if (volunteerLocation.barangay?.toLowerCase() && groupAddress.barangay?.toLowerCase() &&
            volunteerLocation.barangay.toLowerCase() === groupAddress.barangay.toLowerCase()) {
            score += scores.barangay;
        }
        if (volunteerLocation.city?.toLowerCase() && groupAddress.city?.toLowerCase() &&
            volunteerLocation.city.toLowerCase() === groupAddress.city.toLowerCase()) {
            score += scores.city;
        }
        if (volunteerLocation.province?.toLowerCase() && groupAddress.province?.toLowerCase() &&
            volunteerLocation.province.toLowerCase() === groupAddress.province.toLowerCase()) {
            score += scores.province;
        }
        if (volunteerLocation.region?.toLowerCase() && groupAddress.region?.toLowerCase() &&
            volunteerLocation.region.toLowerCase() === groupAddress.region.toLowerCase()) {
            score += scores.region;
        }
        return score;
    }

    function populateFilterDropdowns(groups) {
        const regionFilter = document.getElementById('regionFilter');
        const provinceFilter = document.getElementById('provinceFilter');
        const cityFilter = document.getElementById('cityFilter');
        const regions = [...new Set(groups.map(g => g.address?.region).filter(Boolean))].sort();
        const provinces = [...new Set(groups.map(g => g.address?.province).filter(Boolean))].sort();
        const cities = [...new Set(groups.map(g => g.address?.city).filter(Boolean))].sort();
        regionFilter.innerHTML = '<option value="">All Regions</option>' +
            regions.map(region => `<option value="${region}">${region}</option>`).join('');
        provinceFilter.innerHTML = '<option value="">All Provinces</option>' +
            provinces.map(province => `<option value="${province}">${province}</option>`).join('');
        cityFilter.innerHTML = '<option value="">All Cities</option>' +
            cities.map(city => `<option value="${city}">${city}</option>`).join('');
    }

    function renderABVNOptions(groups, volunteerLocation) {
        const abvnListContainer = document.getElementById('abvnListContainer');
        const filterResultsInfo = document.getElementById('filterResultsInfo');
        const endorseABVNSubmitBtn = document.getElementById('endorseABVNSubmitBtn');
        abvnListContainer.innerHTML = '';
        if (groups.length === 0) {
            abvnListContainer.innerHTML = '<p>No ABVN groups match the filters.</p>';
            filterResultsInfo.textContent = 'Showing 0 ABVN groups';
            endorseABVNSubmitBtn.disabled = true;
            return;
        }
        groups.forEach((group, index) => {
            const radioDiv = document.createElement('div');
            radioDiv.classList.add('abvn-option');
            const radioInput = document.createElement('input');
            radioInput.type = 'radio';
            radioInput.name = 'selectedABVN';
            radioInput.value = group.key;
            radioInput.id = `group-${group.key}`;
            radioInput.dataset.name = group.organization || 'Unknown Organization';
            const locationParts = [group.address?.barangay, group.address?.city, group.address?.province].filter(Boolean);
            radioInput.dataset.location = locationParts.join(', ');
            if (groups.length === 1 && group.score >= 50) {
                radioInput.checked = true;
                endorseABVNSubmitBtn.disabled = false;
            }
            const label = document.createElement('label');
            label.htmlFor = `group-${group.key}`;
            label.innerHTML = `<strong>${group.organization || 'N/A'}</strong> <br> (${radioInput.dataset.location || 'N/A'}${group.score > 0 ? ` - Match Score: ${group.score}%` : ''})`;
            radioDiv.appendChild(radioInput);
            radioDiv.appendChild(label);
            abvnListContainer.appendChild(radioDiv);
        });
        filterResultsInfo.textContent = `Showing ${groups.length} ABVN group${groups.length !== 1 ? 's' : ''}`;
        endorseABVNSubmitBtn.disabled = groups.length === 0 || !document.querySelector('input[name="selectedABVN"]:checked');
    }

    async function fetchABVNs() {
        const abvnListContainer = document.getElementById('abvnListContainer');
        const endorseABVNSubmitBtn = document.getElementById('endorseABVNSubmitBtn');
        const filterResultsInfo = document.getElementById('filterResultsInfo');
        abvnListContainer.innerHTML = '<div class="spinner">Loading...</div>';
        endorseABVNSubmitBtn.disabled = true;
        try {
            if (!abvnCache) {
                const snapshot = await database.ref('volunteerGroups').once('value');
                abvnCache = [];
                if (snapshot.exists()) {
                    snapshot.forEach(childSnapshot => {
                        abvnCache.push({ key: childSnapshot.key, ...childSnapshot.val() });
                    });
                }
            }
            if (abvnCache.length === 0) {
                abvnListContainer.innerHTML = '<p>No volunteer groups found.</p>';
                filterResultsInfo.textContent = 'Showing 0 ABVN groups';
                return;
            }
            const volunteerLocation = currentVolunteerData?.address;
            let matchedGroups = abvnCache.map(group => ({
                ...group,
                score: calculateLocationScore(volunteerLocation, group.address || {})
            }));
            matchedGroups.sort((a, b) => {
                if (b.score === a.score) {
                    return (a.organization || '').localeCompare(b.organization || '');
                }
                return b.score - a.score;
            });
            matchedGroups = matchedGroups.slice(0, 10);
            populateFilterDropdowns(abvnCache);
            renderABVNOptions(matchedGroups, volunteerLocation);
            abvnListContainer.addEventListener('change', (event) => {
                if (event.target.name === 'selectedABVN') {
                    endorseABVNSubmitBtn.disabled = false;
                }
            });
            setupFilterListeners(volunteerLocation);
        } catch (error) {
            abvnListContainer.innerHTML = '<p style="color: red;">Failed to load ABVN locations.</p>';
            filterResultsInfo.textContent = 'Showing 0 ABVN groups';
            Swal.fire({
                title: 'Error',
                text: 'Failed to load ABVN groups. Please try again.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
        }
    }

    function setupFilterListeners(volunteerLocation) {
        const abvnSearchInput = document.getElementById('abvnSearchInput');
        const regionFilter = document.getElementById('regionFilter');
        const provinceFilter = document.getElementById('provinceFilter');
        const cityFilter = document.getElementById('cityFilter');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');

        function applyFilters() {
            const searchTerm = abvnSearchInput.value.toLowerCase().trim();
            const selectedRegion = regionFilter.value;
            const selectedProvince = provinceFilter.value;
            const selectedCity = cityFilter.value;
            let filteredGroups = abvnCache.map(group => ({
                ...group,
                score: calculateLocationScore(volunteerLocation, group.address || {})
            }));
            if (searchTerm) {
                filteredGroups = filteredGroups.filter(group => {
                    const orgName = (group.organization || '').toLowerCase();
                    const location = `${group.address?.barangay || ''} ${group.address?.city || ''} ${group.address?.province || ''} ${group.address?.region || ''}`.toLowerCase();
                    return orgName.includes(searchTerm) || location.includes(searchTerm);
                });
            }
            if (selectedRegion) {
                filteredGroups = filteredGroups.filter(group => group.address?.region === selectedRegion);
            }
            if (selectedProvince) {
                filteredGroups = filteredGroups.filter(group => group.address?.province === selectedProvince);
            }
            if (selectedCity) {
                filteredGroups = filteredGroups.filter(group => group.address?.city === selectedCity);
            }
            filteredGroups.sort((a, b) => {
                if (b.score === a.score) {
                    return (a.organization || '').localeCompare(b.organization || '');
                }
                return b.score - a.score;
            });
            filteredGroups = filteredGroups.slice(0, 10);
            renderABVNOptions(filteredGroups, volunteerLocation);
        }

        abvnSearchInput.addEventListener('input', applyFilters);
        regionFilter.addEventListener('change', applyFilters);
        provinceFilter.addEventListener('change', applyFilters);
        cityFilter.addEventListener('change', applyFilters);
        clearFiltersBtn.addEventListener('click', () => {
            abvnSearchInput.value = '';
            regionFilter.value = '';
            provinceFilter.value = '';
            cityFilter.value = '';
            applyFilters();
        });
    }

    // Export Excel 
    function exportToExcel() {
        if (!restrictAction('view')) return;
            if (filteredApplications.length === 0) {
                Swal.fire({
                    title: 'Error',
                    text: 'No data to export!',
                    icon: 'error',
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
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
            const dataForExport = filteredApplications.map((volunteer, i) => {
                const applicationDateTime = formatDate(volunteer.applicationDateandTime);
                if (applicationDateTime === 'N/A') {}
                let skillsDisplay = 'None';
                if (volunteer.skills && Array.isArray(volunteer.skills) && volunteer.skills.length > 0) {
                    skillsDisplay = volunteer.skills.map(skill => 
                        skill === 'Other' && volunteer.otherSkillComments ? 
                        `${skill} (${volunteer.otherSkillComments})` : skill
                    ).join('; ');
                }
                return {
                    "No.": i + 1,
                    "Full Name": getFullName(volunteer) || 'N/A',
                    "Email": volunteer.email || 'N/A',
                    "Mobile Number": String(volunteer.mobileNumber || 'N/A'),
                    "Age": volunteer.age || 'N/A',
                    "Social Media": volunteer.socialMediaLink || 'N/A',
                    "Additional Info": volunteer.otherSkillComments || 'N/A',
                    "Emergency Response": volunteer.isEmergencyResponse ? 'Yes (24/7)' : 'No',
                    "Date/Time Availability": volunteer.availability?.specificDateTimeSlots?.map(slot => `${slot.date} at ${slot.time}`).join('; ') || 'N/A',
                    "Region": volunteer.address?.region || 'N/A',
                    "Province": volunteer.address?.province || 'N/A',
                    "City": volunteer.address?.city || 'N/A',
                    "Barangay": volunteer.address?.barangay || 'N/A',
                    "Skills": skillsDisplay,
                    "Application Date/Time": applicationDateTime,
                    "Status Notes": typeof volunteer.statusNotes === 'string' ? volunteer.statusNotes : (Array.isArray(volunteer.statusNotes) && volunteer.statusNotes.length > 0 ? volunteer.statusNotes[volunteer.statusNotes.length - 1].note : '-')
                };
            });
            const ws = XLSX.utils.json_to_sheet(dataForExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Pending Volunteer Applications");
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const hours = String(today.getHours()).padStart(2, '0');
            const minutes = String(today.getMinutes()).padStart(2, '0');
            const seconds = String(today.getSeconds()).padStart(2, '0');
            const formattedDateTime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
            const filename = `pending-volunteer-applications_${formattedDateTime}.xlsx`;
            XLSX.writeFile(wb, filename);
            Swal.fire({
                title: 'Export Successful!',
                text: `Volunteer application details have been exported to Excel "${filename}".`,
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
    }

    // Export PDF all
    function exportToPDF() {
        if (!restrictAction('view')) return;
        if (filteredApplications.length === 0) {
             Swal.fire({
                title: 'Error',
                text: 'No data to PDF!',
                icon: 'error',
                timer: 1600,
                showConfirmButton: false,
                timerProgressBar: true,
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
        Swal.fire({
            title: 'Generating PDF',
            text: 'Please wait while your PDF is being generated...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        let yOffset = 20;
        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';
        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;
            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
            doc.setFontSize(18);
            doc.text("Pending Volunteer Applications Report", 14, yOffset);
            yOffset += 10;
            doc.setFontSize(10);
            const now = new Date();
            const options = {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: true, timeZone: 'Asia/Manila'
            };
            doc.text(`Report Generated: ${now.toLocaleString('en-US', options)} (PHT)`, 14, yOffset);
            yOffset += 15;
            const head = [[
                "No.", "Full Name", "Email", "Mobile Number", "Age", "Social Media",
                "Region", "Province", "City", "Barangay", "Additional Info",
                "Skills", "Date/Time Availability", "Application Date/Time", "Status Notes"
            ]];
            const body = filteredApplications.map((volunteer, i) => {
                const applicationDateTime = formatDate(volunteer.applicationDateandTime);
                if (applicationDateTime === 'N/A') {}
                let skillsDisplay = 'None';
                if (volunteer.skills && Array.isArray(volunteer.skills) && volunteer.skills.length > 0) {
                    skillsDisplay = volunteer.skills.map(skill => 
                        skill === 'Other' && volunteer.otherSkillComments ? 
                        `${skill} (${volunteer.otherSkillComments})` : skill
                    ).join('; ');
                }
                return [
                    i + 1,
                    getFullName(volunteer) || 'N/A',
                    volunteer.email || 'N/A',
                    String(volunteer.mobileNumber || 'N/A'),
                    volunteer.age || 'N/A',
                    volunteer.socialMediaLink || 'N/A',
                    volunteer.address?.region || 'N/A',
                    volunteer.address?.province || 'N/A',
                    volunteer.address?.city || 'N/A',
                    volunteer.address?.barangay || 'N/A',
                    volunteer.otherSkillComments || 'N/A',
                    skillsDisplay,
                    volunteer.isEmergencyResponse ? 'Yes (24/7)' : 'No',
                    volunteer.availability?.specificDateTimeSlots?.map(slot => `${slot.date} at ${slot.time}`).join('; ') || 'N/A',
                    applicationDateTime,
                    typeof volunteer.statusNotes === 'string' ? volunteer.statusNotes : (Array.isArray(volunteer.statusNotes) && volunteer.statusNotes.length > 0 ? volunteer.statusNotes[volunteer.statusNotes.length - 1].note : '-')
                ];
            });
            doc.autoTable({
                head: head,
                body: body,
                startY: yOffset,
                theme: 'grid',
                headStyles: {
                    fillColor: [20, 174, 187],
                    textColor: [255, 255, 255],
                    halign: 'center'
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                didDrawPage: function(data) {
                    doc.setFontSize(8);
                    const pageNumberText = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                    const poweredByText = "Powered by: Appvance";
                    const pageWidth = doc.internal.pageSize.width;
                    const margin = data.settings.margin.left;
                    const footerY = doc.internal.pageSize.height - 10;
                    doc.text(pageNumberText, margin, footerY);
                    doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
                }
            });
            const nowForFilename = new Date();
            const year = nowForFilename.getFullYear();
            const month = String(nowForFilename.getMonth() + 1).padStart(2, '0');
            const day = String(nowForFilename.getDate()).padStart(2, '0');
            const hours = String(nowForFilename.getHours()).padStart(2, '0');
            const minutes = String(nowForFilename.getMinutes()).padStart(2, '0');
            const seconds = String(nowForFilename.getSeconds()).padStart(2, '0');
            const formattedDateTime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
            const filename = `pending-volunteer-applications_${formattedDateTime}.pdf`;
            doc.save(filename);
            Swal.close();
            Swal.fire({
                title: 'Export Successful!',
                text: `Volunteer application details have been exported to PDF "${filename}".`,
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
        };
        logo.onerror = function() {
            Swal.close();
            Swal.fire({
                title: 'Error',
                text: 'Failed to load logo image. Please check the path: ../assets/images/AB_logo.png',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
        };
    }

    // Export PDF Single
    function saveSingleApplicationPdf(volunteer) {
        if (!restrictAction('view')) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';
        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;
            const maxTextWidth = pageWidth - 2 * margin;
            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
            doc.setFontSize(18);
            doc.text("Volunteer Application Details", 14, 22);
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })}`, 14, 30);
            let y = 45;
            const addDetail = (label, value) => {
                const text = `${label}: ${value || 'N/A'}`;
                const textLines = doc.splitTextToSize(text, maxTextWidth);
                textLines.forEach(line => {
                    if (y + 7 > pageHeight - 20) {
                        doc.addPage();
                        y = 20;
                        doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
                        doc.setFontSize(18);
                        doc.text("Volunteer Application Details (Continued)", 14, 22);
                        doc.setFontSize(10);
                    }
                    doc.text(line, 14, y);
                    y += 7;
                });
                return y;
            };
            y = addDetail("Full Name", getFullName(volunteer));
            y = addDetail("Email", volunteer.email);
            y = addDetail("Mobile Number", String(volunteer.mobileNumber));
            y = addDetail("Age", volunteer.age);
            y = addDetail("Social Media Link", volunteer.socialMediaLink);
            y = addDetail("Region", volunteer.address?.region);
            y = addDetail("Province", volunteer.address?.province);
            y = addDetail("City", volunteer.address?.city);
            y = addDetail("Barangay", volunteer.address?.barangay);
            y = addDetail("Street Address", volunteer.address?.streetAddress);
            y = addDetail("Additional Info", volunteer.otherSkillComments);
            let skillsDisplay = 'None';
            if (volunteer.skills && Array.isArray(volunteer.skills) && volunteer.skills.length > 0) {
                skillsDisplay = volunteer.skills.map(skill => 
                    skill === 'Other' && volunteer.otherSkillComments ? 
                    `${skill} (${volunteer.otherSkillComments})` : skill
                ).join('; ');
            }
            y = addDetail("Skills", skillsDisplay);
            y = addDetail("Date/Time Availability", volunteer.availability?.specificDateTimeSlots?.map(slot => `${slot.date} at ${slot.time}`).join('; '));
            const applicationDateTime = formatDate(volunteer.applicationDateandTime);
            if (applicationDateTime === 'N/A') {}
            y = addDetail("Application Date/Time", applicationDateTime);
            y = addDetail("Status Notes", typeof volunteer.statusNotes === 'string' ? volunteer.statusNotes : (Array.isArray(volunteer.statusNotes) && volunteer.statusNotes.length > 0 ? volunteer.statusNotes[volunteer.statusNotes.length - 1].note : '-'));
            doc.setFontSize(8);
            const footerY = doc.internal.pageSize.height - 10;
            const pageNumberText = `Page ${doc.internal.getNumberOfPages()} of ${doc.internal.getNumberOfPages()}`;
            const poweredByText = "Powered by: Appvance";
            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
            const sanitizedFullName = getFullName(volunteer).replace(/[^a-zA-Z0-9-_]/g, '_') || 'unknown';
            doc.save(`volunteer_${sanitizedFullName}_${new Date().toISOString().slice(0, 10)}.pdf`);
            Swal.fire({
                title: 'Export Successful!',
                text: 'Volunteer application details have been exported to PDF.',
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
        };
        logo.onerror = function() {
            Swal.fire({
                title: 'Error',
                text: 'Failed to load logo image. Please check the path: ../assets/images/AB_logo.png',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
        };
    }

    // --- Rendering Functions ---
    function renderApplications(applicationsToRender) {
        volunteersContainer.innerHTML = '';
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);
        
        if (paginatedApplications.length === 0) {
            volunteersContainer.innerHTML = '<tr><td colspan="15" style="text-align: center;">No pending volunteer applications found on this page.</td></tr>';
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            renderPagination();
            return;
        }

        let i = startIndex + 1;
        const allowedActions = permissions[currentUserAdminPosition] || [];
        const hasActionPermissions = allowedActions.some(action => ['confirmByAB', 'endorseToABVN', 'setStalled', 'archive'].includes(action));
        
        paginatedApplications.forEach(volunteer => {
            const row = volunteersContainer.insertRow();
            row.setAttribute('data-key', volunteer.key);

            const fullName = getFullName(volunteer);
            const socialMediaDisplay = volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank" rel="noopener noreferrer">Link</a>` : 'N/A';
            
            let displayStatusNotes = '-';
            if (typeof volunteer.statusNotes === 'string' && volunteer.statusNotes.trim() !== '') {
                displayStatusNotes = volunteer.statusNotes;
            } else if (Array.isArray(volunteer.statusNotes) && volunteer.statusNotes.length > 0) {
                displayStatusNotes = volunteer.statusNotes[volunteer.statusNotes.length - 1].note;
            }
            let specificSlotsHtml = 'N/A';
            if (volunteer.availability && volunteer.availability.specificDateTimeSlots && volunteer.availability.specificDateTimeSlots.length > 0) {
                specificSlotsHtml = '<ol>';
                volunteer.availability.specificDateTimeSlots.forEach(slot => {
                    if (slot.date && slot.time) {
                        specificSlotsHtml += `<li>${slot.date} at ${slot.time}</li>`;
                    }
                });
                specificSlotsHtml += '</ol>';
            }
            let skillsHtml = 'None';
            if (volunteer.skills && Array.isArray(volunteer.skills) && volunteer.skills.length > 0) {
                skillsHtml = '<ol>';
                volunteer.skills.forEach(skill => {
                    if (skill === 'Other' && volunteer.otherSkillComments && volunteer.otherSkillComments.trim()) {
                        skillsHtml += `<li>${skill} (${volunteer.otherSkillComments})</li>`;
                    } else {
                        skillsHtml += `<li>${skill}</li>`;
                    }
                });
                skillsHtml += '</ol>';
            }
            row.innerHTML = `
                <td>${i++}</td>
                <td>${fullName}</td>
                <td>${volunteer.email || 'N/A'}</td>
                <td>${volunteer.mobileNumber || 'N/A'}</td>
                <td>${volunteer.age || 'N/A'}</td>
                <td>${socialMediaDisplay}</td>
                <td>${volunteer.otherSkillComments || 'N/A'}</td>
                <td>${volunteer.isEmergencyResponse ? 'Yes (24/7)' : 'No'}</td>
                <td>${specificSlotsHtml}</td>
                <td>${volunteer.address?.region || 'N/A'}</td>
                <td>${volunteer.address?.province || 'N/A'}</td>
                <td>${volunteer.address?.city || 'N/A'}</td>
                <td>${volunteer.address?.barangay || 'N/A'}</td>
                <td>${skillsHtml}</td>
                <td>${displayStatusNotes}</td>
                ${hasActionPermissions ? `
                    <td>
                        <button title="Actions" class="actionBtn" data-key="${volunteer.key}"><i class='bx bx-dots-vertical-rounded'></i></button>
                        <button title="View" class="viewBtn" data-key="${volunteer.key}"><i class='bx bx-show-alt'></i></button>
                        <button title="Save as PDF" class="saveSinglePdfBtn" data-key="${volunteer.key}"><i class='bx bxs-file-pdf'></i></button>
                    </td>
                ` : '<td></td>'}
            `;
        });
        updateEntriesInfo(applicationsToRender.length);
        renderPagination(applicationsToRender.length);
    }

    function renderArchivedApplications() {
        archivedTableBody.innerHTML = '';
        const startIndex = (archivedCurrentPage - 1) * archivedRowsPerPage;
        const endIndex = startIndex + archivedRowsPerPage;
        const paginatedApplications = archivedApplications.slice(startIndex, endIndex);
        if (paginatedApplications.length === 0) {
            archivedTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No archived volunteer applications found.</td></tr>';
            archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            renderArchivedPagination();
            return;
        }
        let i = startIndex + 1;
        const allowedActions = permissions[currentUserAdminPosition] || [];
        const hasRetrievePermission = allowedActions.includes('retrieve');
        paginatedApplications.forEach(volunteer => {
            const row = archivedTableBody.insertRow();
            row.setAttribute('data-key', volunteer.key);
            row.innerHTML = `
                <td>${i++}</td>
                <td>${getFullName(volunteer)}</td>
                <td>${volunteer.email || 'N/A'}</td>
                <td>${volunteer.status || 'N/A'}</td>
                <td>${volunteer.isEmergencyResponse ? 'Yes (24/7)' : 'No'}</td>
                <td>${formatDate(volunteer.archivedDate)}</td>
                ${hasRetrievePermission ? `
                    <td>
                        <button class="retrieveBtn" data-key="${volunteer.key}">Retrieve</button>
                    </td>
                ` : '<td></td>'}
            `;
        });
        updateArchivedEntriesInfo();
        renderArchivedPagination();
    }

    // --- Search and Sort Logic ---
    function applySearchAndSort() {
        let currentApplications = [...allApplications];
        const searchTerm = searchInput.value.toLowerCase().trim();
        const sortValue = sortSelect.value;

        // Apply search filter
        if (searchTerm) {
            if (sortValue && sortValue !== 'All-asc' && sortValue !== 'All-desc') {
                const [sortBy] = sortValue.split('-');
                currentApplications = currentApplications.filter(volunteer => {
                    let fieldValue;
                    switch (sortBy) {
                        case 'ApplicationDateTime':
                            fieldValue = formatDate(volunteer.applicationDateandTime || '').toLowerCase();
                            break;
                        case 'Region':
                            fieldValue = (volunteer.address?.region || '').toLowerCase();
                            break;
                        case 'Province':
                            fieldValue = (volunteer.address?.province || '').toLowerCase();
                            break;
                        case 'City':
                            fieldValue = (volunteer.address?.city || '').toLowerCase();
                            break;
                        case 'Barangay':
                            fieldValue = (volunteer.address?.barangay || '').toLowerCase();
                            break;
                        case 'Name':
                            fieldValue = getFullName(volunteer).toLowerCase();
                            break;
                        case 'Email':
                            fieldValue = (volunteer.email || '').toLowerCase();
                            break;
                        case 'MobileNumber':
                            fieldValue = (volunteer.mobileNumber || '').toLowerCase();
                            break;
                        case 'Age':
                            fieldValue = (volunteer.age || '').toString().toLowerCase();
                            break;
                        case 'SocialMedia':
                            fieldValue = (volunteer.socialMediaLink || '').toLowerCase();
                            break;
                        case 'AdditionalInfo':
                            fieldValue = (volunteer.otherSkillComments || '').toLowerCase();
                            break;
                        case 'DateTimeAvailability':
                            fieldValue = (volunteer.availability?.specificDateTimeSlots || [])
                                .map(slot => `${slot.date} ${slot.time}`).join(' ').toLowerCase();
                            break;
                        case 'Skills':
                            fieldValue = (volunteer.skills || []).join(' ').toLowerCase();
                            break;
                        case 'StatusNotes':
                            fieldValue = (typeof volunteer.statusNotes === 'string' 
                                ? volunteer.statusNotes 
                                : (Array.isArray(volunteer.statusNotes) && volunteer.statusNotes.length > 0 
                                    ? volunteer.statusNotes[volunteer.statusNotes.length - 1].note 
                                    : '')).toLowerCase();
                            break;
                        default:
                            return false;
                    }
                    return fieldValue.includes(searchTerm);
                });
            } else {
                currentApplications = currentApplications.filter(volunteer => {
                    return (
                        getFullName(volunteer).toLowerCase().includes(searchTerm) ||
                        (volunteer.email || '').toLowerCase().includes(searchTerm) ||
                        (volunteer.mobileNumber || '').toLowerCase().includes(searchTerm) ||
                        (volunteer.address?.region || '').toLowerCase().includes(searchTerm) ||
                        (volunteer.address?.province || '').toLowerCase().includes(searchTerm) ||
                        (volunteer.address?.city || '').toLowerCase().includes(searchTerm) ||
                        (volunteer.address?.barangay || '').toLowerCase().includes(searchTerm) ||
                        (volunteer.otherSkillComments || '').toLowerCase().includes(searchTerm) ||
                        (typeof volunteer.statusNotes === 'string' 
                            ? volunteer.statusNotes.toLowerCase() 
                            : (Array.isArray(volunteer.statusNotes) && volunteer.statusNotes.length > 0 
                                ? volunteer.statusNotes[volunteer.statusNotes.length - 1].note.toLowerCase() 
                                : '')).includes(searchTerm) ||
                        (volunteer.skills || []).join(' ').toLowerCase().includes(searchTerm) ||
                        (volunteer.availability?.specificDateTimeSlots || [])
                            .map(slot => `${slot.date} at ${slot.time}`).join(' ').toLowerCase().includes(searchTerm)
                    );
                });
            }
        }

        // Apply sorting
        if (sortValue) {
            const [sortBy, order] = sortValue.split('-');
            currentApplications.sort((a, b) => {
                let valA, valB;
                switch (sortBy) {
                    case 'ApplicationDateTime':
                        valA = a.applicationDateandTime || 0;
                        valB = b.applicationDateandTime || 0;
                        break;
                    case 'Region':
                        valA = (a.address?.region || '').toLowerCase();
                        valB = (b.address?.region || '').toLowerCase();
                        break;
                    case 'Province':
                        valA = (a.address?.province || '').toLowerCase();
                        valB = (b.address?.province || '').toLowerCase();
                        break;
                    case 'City':
                        valA = (a.address?.city || '').toLowerCase();
                        valB = (b.address?.city || '').toLowerCase();
                        break;
                    case 'Barangay':
                        valA = (a.address?.barangay || '').toLowerCase();
                        valB = (b.address?.barangay || '').toLowerCase();
                        break;
                    case 'Name':
                        valA = getFullName(a).toLowerCase();
                        valB = getFullName(b).toLowerCase();
                        break;
                    case 'Email':
                        valA = (a.email || '').toLowerCase();
                        valB = (b.email || '').toLowerCase();
                        break;
                    case 'MobileNumber':
                        valA = (a.mobileNumber || '').toLowerCase();
                        valB = (b.mobileNumber || '').toLowerCase();
                        break;
                    case 'Age':
                        valA = parseInt(a.age) || 0;
                        valB = parseInt(b.age) || 0;
                        break;
                    case 'SocialMedia':
                        valA = (a.socialMediaLink || '').toLowerCase();
                        valB = (b.socialMediaLink || '').toLowerCase();
                        break;
                    case 'AdditionalInfo':
                        valA = (a.otherSkillComments || '').toLowerCase();
                        valB = (b.otherSkillComments || '').toLowerCase();
                        break;
                    case 'DateTimeAvailability':
                        const slotsA = a.availability?.specificDateTimeSlots || [];
                        const slotsB = b.availability?.specificDateTimeSlots || [];
                        const earliestA = slotsA[0] ? new Date(`${slotsA[0].date} ${slotsA[0].time.replace(' AM', ':00 AM').replace(' PM', ':00 PM')}`) : new Date(0);
                        const earliestB = slotsB[0] ? new Date(`${slotsB[0].date} ${slotsB[0].time.replace(' AM', ':00 AM').replace(' PM', ':00 PM')}`) : new Date(0);
                        valA = earliestA.getTime();
                        valB = earliestB.getTime();
                        break;
                    case 'Skills':
                        valA = (a.skills || []).join(' ').toLowerCase();
                        valB = (b.skills || []).join(' ').toLowerCase();
                        break;
                    case 'StatusNotes':
                        valA = (typeof a.statusNotes === 'string' 
                            ? a.statusNotes 
                            : (Array.isArray(a.statusNotes) && a.statusNotes.length > 0 
                                ? a.statusNotes[a.statusNotes.length - 1].note 
                                : '')).toLowerCase();
                        valB = (typeof b.statusNotes === 'string' 
                            ? b.statusNotes 
                            : (Array.isArray(b.statusNotes) && b.statusNotes.length > 0 
                                ? b.statusNotes[b.statusNotes.length - 1].note 
                                : '')).toLowerCase();
                        break;
                    case 'All':
                    default:
                        valA = getFullName(a).toLowerCase();
                        valB = getFullName(b).toLowerCase();
                        break;
                }
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return order === 'asc' ? valA - valB : valB - valA;
                } else {
                    return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
            });
        }

        filteredApplications = currentApplications;
        currentPage = 1;
        renderApplications(filteredApplications);
    }

    // --- Pagination Functions ---
    function renderPagination(totalItems) {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(totalItems / rowsPerPage);
        if (totalPages === 0) {
            pagination.innerHTML = '<span>No entries to display</span>';
            return;
        }
        const createButton = (label, page, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (isActive) btn.classList.add('active-page');
            btn.addEventListener('click', () => {
                currentPage = page;
                renderApplications(filteredApplications);
            });
            return btn;
        };
        pagination.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, totalPages - maxVisible + 1);
        }
        if (startPage > 1) {
            pagination.appendChild(createButton('1', 1));
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                pagination.appendChild(dots);
            }
        }
        for (let i = startPage; i <= endPage; i++) {
            pagination.appendChild(createButton(i, i, false, i === currentPage));
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                pagination.appendChild(dots);
            }
            pagination.appendChild(createButton(totalPages, totalPages));
        }
        pagination.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
    }

    function updateEntriesInfo(totalItems) {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
        entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
    }

    function renderArchivedPagination() {
        archivedPagination.innerHTML = '';
        const totalPages = Math.ceil(archivedApplications.length / archivedRowsPerPage);
        if (totalPages === 0) {
            archivedPagination.innerHTML = '<span>No entries to display</span>';
            return;
        }
        const createButton = (label, page, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (isActive) btn.classList.add('active-page');
            btn.addEventListener('click', () => {
                archivedCurrentPage = page;
                renderArchivedApplications();
            });
            return btn;
        };
        archivedPagination.appendChild(createButton('Prev', archivedCurrentPage - 1, archivedCurrentPage === 1));
        const maxVisible = 5;
        let startPage = Math.max(1, archivedCurrentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, totalPages - maxVisible + 1);
        }
        if (startPage > 1) {
            archivedPagination.appendChild(createButton('1', 1));
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                archivedPagination.appendChild(dots);
            }
        }
        for (let i = startPage; i <= endPage; i++) {
            archivedPagination.appendChild(createButton(i, i, false, i === archivedCurrentPage));
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                archivedPagination.appendChild(dots);
            }
            archivedPagination.appendChild(createButton(totalPages, totalPages));
        }
        archivedPagination.appendChild(createButton('Next', archivedCurrentPage + 1, archivedCurrentPage === totalPages));
    }

    function updateArchivedEntriesInfo() {
        const startIndex = (archivedCurrentPage - 1) * archivedRowsPerPage;
        const endIndex = Math.min(startIndex + archivedRowsPerPage, archivedApplications.length);
        archivedEntriesInfo.textContent = `Showing ${archivedApplications.length ? startIndex + 1 : 0} to ${endIndex} of ${archivedApplications.length} entries`;
    }

    // --- Action Handlers ---
    volunteersContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const rowWithKey = target.closest('tr[data-key]');
        const clickedActionButton = target.closest('.actionBtn');
        const clickedViewButton = target.closest('.viewBtn');
        const clickedSaveSinglePdfButton = target.closest('.saveSinglePdfBtn');

        if (!rowWithKey) {
            if (currentDropdown && !currentDropdown.contains(target)) {
                currentDropdown.remove();
                currentDropdown = null;
                const previouslyActiveButton = document.querySelector('.actionBtn.active');
                if (previouslyActiveButton) {
                    previouslyActiveButton.classList.remove('active');
                }
            }
            return;
        }
        const volunteerKey = rowWithKey.dataset.key;
        const volunteer = allApplications.find(v => v.key === volunteerKey);
        if (!volunteer) {
            Swal.fire({
                title: 'Error',
                text: 'Volunteer data not found.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            resetCurrentVolunteer();
            return;
        }
        if (clickedActionButton) {
            const actionButton = clickedActionButton;
            if (currentDropdown) {
                if (currentDropdown.previousElementSibling === actionButton) {
                    currentDropdown.remove();
                    currentDropdown = null;
                    actionButton.classList.remove('active');
                    return;
                } else {
                    currentDropdown.remove();
                    currentDropdown = null;
                    const previouslyActiveButton = document.querySelector('.actionBtn.active');
                    if (previouslyActiveButton) {
                        previouslyActiveButton.classList.remove('active');
                    }
                }
            }
            actionButton.classList.add('active');
            currentVolunteerKey = volunteerKey;
            currentVolunteerData = volunteer;
            const rect = actionButton.getBoundingClientRect();
            const dropdown = document.createElement('div');
            dropdown.classList.add('action-dropdown-menu');
            dropdown.style.top = `${rect.bottom + window.scrollY}px`;
            dropdown.style.left = `${rect.left + window.scrollX}px`;
            const allowedActions = permissions[currentUserAdminPosition] || [];
            let dropdownHTML = '';
            if (allowedActions.includes('confirmByAB')) {
                dropdownHTML += `<button id="dropdownConfirmByAB"><i class='bx bxs-check-circle'></i>Confirm by AB</button>`;
            }
            if (allowedActions.includes('endorseToABVN')) {
                dropdownHTML += `<button id="dropdownEndorsedToABVN"><i class='bx bxs-group'></i>Endorsed to ABVN</button>`;
            }
            if (allowedActions.includes('setStalled')) {
                dropdownHTML += `<button id="dropdownSetStalled"><i class='bx bxs-hand'></i>Status Notes</button>`;
            }
            if (allowedActions.includes('archive')) {
                dropdownHTML += `<button id="dropdownArchive"><i class='bx bx-archive'></i>Reject</button>`;
            }
            dropdown.innerHTML = dropdownHTML;
            if (dropdownHTML === '') {
                dropdown.innerHTML = '<p>No actions available</p>';
            }
            document.body.appendChild(dropdown);
            currentDropdown = dropdown;
            if (allowedActions.includes('confirmByAB')) {
                dropdown.querySelector('#dropdownConfirmByAB')?.addEventListener('click', () => {
                    showScheduleModal();
                });
            }
            if (allowedActions.includes('endorseToABVN')) {
                dropdown.querySelector('#dropdownEndorsedToABVN')?.addEventListener('click', () => {
                    if (!currentVolunteerKey || !currentVolunteerData) {
                        Swal.fire({
                            title: 'Error',
                            text: 'No volunteer selected for endorsement.',
                            icon: 'error',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean',
                                confirmButton: 'my-error-button'
                            }
                        });
                        resetCurrentVolunteer();
                        return;
                    }
                    handleEndorsementProcess();
                });
            }
            if (allowedActions.includes('setStalled')) {
                dropdown.querySelector('#dropdownSetStalled')?.addEventListener('click', async () => {
                    const { value: notes } = await Swal.fire({
                        title: 'Set Volunteer to Stalled',
                        input: 'textarea',
                        inputLabel: 'Reason for stalling (e.g., Cannot be reached, Awaiting documents, etc.)',
                        inputPlaceholder: 'Enter notes here...',
                        inputAttributes: {
                            'aria-label': 'Enter notes here'
                        },
                        showCancelButton: true,
                        confirmButtonText: 'Confirm',
                        cancelButtonText: 'Cancel',
                        reverseButtons: true,
                        customClass: {
                            popup: 'custom-swal-popup-large',
                            title: 'custom-swal-title',
                            inputLabel: 'custom-swal-content',
                            confirmButton: 'custom-confirm-btn',
                            cancelButton: 'custom-cancel-btn'
                        },
                        inputValidator: (value) => {
                            if (!value) {
                                return 'Notes are required!';
                            }
                        }
                    });
                    if (notes) {
                        const updates = {};
                        updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/status`] = 'Stalled';
                        updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/statusNotes`] = notes;
                        updates[`volunteerApplications/pendingVolunteer/${currentVolunteerKey}/lastStatusUpdate`] = firebase.database.ServerValue.TIMESTAMP;
                        try {
                            await database.ref().update(updates);
                            Swal.fire({
                                title: 'Success!',
                                text: 'Volunteer status updated to Stalled with notes.',
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false,
                                timerProgressBar: true,
                                customClass: {
                                    popup: 'swal2-popup-success-clean',
                                    title: 'swal2-title-success-clean',
                                    htmlContainer: 'swal2-text-success-clean'
                                }
                            });
                            fetchPendingVolunteers();
                        } catch (error) {
                            Swal.fire({
                                title: 'Error',
                                text: 'Failed to update volunteer status. Please try again.',
                                icon: 'error',
                                customClass: {
                                    popup: 'swal2-popup-error-clean',
                                    title: 'swal2-title-error-clean',
                                    htmlContainer: 'swal2-text-error-clean',
                                    confirmButton: 'my-error-button'
                                }
                            });
                        }
                    } else {
                        Swal.fire({
                            title: 'Cancelled',
                            text: 'No notes entered. Status remains unchanged.',
                            icon: 'info',
                            customClass: {
                                popup: 'swal2-popup-info-clean',
                                title: 'swal2-title-info-clean',
                                htmlContainer: 'swal2-text-info-clean',
                                confirmButton: 'my-info-button'
                            }
                        });
                    }
                    resetCurrentVolunteer();
                });
            }
            if (allowedActions.includes('archive')) {
                dropdown.querySelector('#dropdownArchive')?.addEventListener('click', async () => {
                if (!restrictAction('archive')) return;
                    const isVerified = await verifySuperAdminPassword();
                    if (!isVerified) return;
                    Swal.fire({
                        title: 'Archive Volunteer?',
                        text: `Archive ${getFullName(currentVolunteerData)}?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Archive',
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
                            try {
                                await database.ref(`volunteerApplications/archivedPendingVolunteer/${currentVolunteerKey}`).set({
                                    ...currentVolunteerData,
                                    status: 'archived',
                                    archivedDate: firebase.database.ServerValue.TIMESTAMP
                                });
                                await database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`).remove();
                                Swal.fire({
                                    title: 'Archived!',
                                    text: 'Volunteer application has been archived.',
                                    icon: 'success',
                                    timer: 1600,
                                    showConfirmButton: false,
                                    timerProgressBar: true,
                                    allowOutsideClick: false,
                                    customClass: {
                                        popup: 'swal2-popup-success-clean',
                                        title: 'swal2-title-success-clean',
                                        htmlContainer: 'swal2-text-success-clean'
                                    }
                                });
                                fetchPendingVolunteers();
                            } catch (error) {
                                Swal.fire({
                                    title: 'Error',
                                    text: 'Failed to archive volunteer. Please try again.',
                                    icon: 'error',
                                    customClass: {
                                        popup: 'swal2-popup-error-clean',
                                        title: 'swal2-title-error-clean',
                                        htmlContainer: 'swal2-text-error-clean',
                                        confirmButton: 'my-error-button'
                                    }
                                });
                            }
                            resetCurrentVolunteer();
                        }
                    });
                });
            }
        } else if (clickedViewButton) {
            if (currentDropdown) {
                currentDropdown.remove();
                currentDropdown = null;
                const previouslyActiveButton = document.querySelector('.actionBtn.active');
                if (previouslyActiveButton) {
                    previouslyActiveButton.classList.remove('active');
                }
            }
            showPreviewModal(volunteer);
            resetCurrentVolunteer();
        } else if (clickedSaveSinglePdfButton) {
            saveSingleApplicationPdf(volunteer);
            resetCurrentVolunteer();
        }
    });

    // Archived table actions
    archivedTableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const volunteerKey = target.closest('tr[data-key]')?.dataset.key;
        if (!volunteerKey) return;
        const volunteer = archivedApplications.find(v => v.key === volunteerKey);
        if (!volunteer) {
            Swal.fire({
                title: 'Error',
                text: 'Volunteer data not found.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        if (target.classList.contains('retrieveBtn')) {
            if (!restrictAction('retrieve')) return;
            Swal.fire({
                title: 'Retrieve Volunteer?',
                text: `Retrieve ${getFullName(volunteer)} to pending applications?`,
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
                },
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await database.ref(`volunteerApplications/pendingVolunteer/${volunteerKey}`).set({
                            ...volunteer,
                            status: 'pending',
                            archivedDate: null
                        });
                        await database.ref(`volunteerApplications/archivedPendingVolunteer/${volunteerKey}`).remove();
                        Swal.fire({
                            title: 'Retrieved!',
                            text: 'Volunteer has been retrieved to pending applications.',
                            icon: 'success',
                            timer: 1600,
                            showConfirmButton: false,
                            timerProgressBar: true,
                            allowOutsideClick: false,
                            customClass: {
                                popup: 'swal2-popup-success-clean',
                                title: 'swal2-title-success-clean',
                                htmlContainer: 'swal2-text-success-clean',
                            }
                        });
                        fetchArchivedApplications();
                    } catch (error) {
                        Swal.fire({
                            title: 'Error',
                            text: 'Failed to retrieve volunteer. Please try again.',
                            icon: 'error',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean',
                                confirmButton: 'my-error-button'
                            }
                        });
                    }
                }
            });
        } 
    });

    document.getElementById('viewArchived').addEventListener('click', () => {
        if (!restrictAction('retrieve')) return; 
        archivedModal.style.display = 'flex';
        fetchArchivedApplications();
    });

    function formatTimeTo24Hr(timeStr) {
        if (!timeStr) return null;
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    scheduleForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!restrictAction('confirmByAB')) return;
        const scheduledDateTime = scheduleDateTimeInput.value;
        if (!currentVolunteerKey || !currentVolunteerData) {
            Swal.fire({
                title: 'Error',
                text: 'No volunteer selected for scheduling.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            hideScheduleModal();
            return;
        }
        if (!scheduledDateTime) {
            Swal.fire({
                title: 'Error',
                text: 'Please fill in all scheduling details.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        const selectedDate = new Date(scheduledDateTime);
        selectedDate.setSeconds(0);
        selectedDate.setMilliseconds(0);
        const selectedDateISO = selectedDate.toISOString().split('T')[0];
        // const selectedTime24Hr = formatTimeTo24Hr(selectedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
        const now = new Date();
        now.setSeconds(0);
        now.setMilliseconds(0);
        if (selectedDate <= now) {
            Swal.fire({
                title: 'Invalid Date',
                text: 'Scheduled date and time cannot be in the past or the current time',
                icon: 'error',
                showConfirmButton: true,
                confirmButtonText: 'Ok',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        const MINIMUM_FUTURE_TIME = 60 * 60 * 1000;
        if (selectedDate.getTime() < now.getTime() + MINIMUM_FUTURE_TIME) {
            Swal.fire({
                title: 'Invalid Date',
                text: 'Scheduled time must be at least 1 hour in the future.',
                icon: 'error',
                confirmButtonText: 'Ok',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        const MAXIMUM_FUTURE_TIME = 6 * 30 * 24 * 60 * 60 * 1000;
        if (selectedDate.getTime() > now.getTime() + MAXIMUM_FUTURE_TIME) {
            Swal.fire({
                title: 'Invalid Date',
                text: 'Scheduled date cannot be more than 6 months in the future.',
                icon: 'error',
                confirmButtonText: 'Ok',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        const originalScheduledDateTime = currentVolunteerData.scheduledDateTime;
        if (originalScheduledDateTime) {
            const originalDate = new Date(originalScheduledDateTime);
            originalDate.setSeconds(0);
            originalDate.setMilliseconds(0);
            if (selectedDate.getTime() === originalDate.getTime()) {
                Swal.fire({
                    title: 'No Change in Schedule',
                    text: 'The selected date and time is the same as the current scheduled time. Please choose a different time if you wish to reschedule.',
                    icon: 'error',
                    confirmButtonText: 'Ok',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                    }
                });
                return;
            }
        }
        const operationalStartHour = 8; // 8 AM
        const operationalEndHour = 17; // 5 PM
        const selectedHour = new Date(scheduledDateTime).getHours();
        if (selectedHour < operationalStartHour || selectedHour >= operationalEndHour) {
            if (!currentVolunteerData.isEmergencyResponse) {
                Swal.fire({
                    title: 'Invalid Schedule',
                    text: 'Selected time is outside operational hours (8 AM - 5 PM). This volunteer is not available for 24/7 emergency response.',
                    icon: 'error',
                    confirmButtonText: 'Ok',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                    }
                });
                return;
            }
        }
        const volunteerEmail = currentVolunteerData.email;
        const volunteerMobile = currentVolunteerData.mobileNumber;
        const volunteerFullName = getFullName(currentVolunteerData).toLowerCase();
        if (!volunteerEmail && !volunteerMobile) {
            Swal.fire({
                title: 'Error',
                text: 'Volunteer data is missing email and mobile number. Cannot perform duplicate check.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            hideScheduleModal();
            return;
        }
        try {
            const approvedVolunteersRef = database.ref('volunteerApplications/approvedVolunteer');
            let duplicateMessages = [];
            if (volunteerEmail) {
                const emailSnapshot = await approvedVolunteersRef.orderByChild('email').equalTo(volunteerEmail).once('value');
                if (emailSnapshot.exists()) {
                    let foundDuplicate = false;
                    emailSnapshot.forEach(childSnapshot => {
                        if (childSnapshot.key !== currentVolunteerKey) {
                            foundDuplicate = true;
                            return true;
                        }
                    });
                    if (foundDuplicate) {
                        duplicateMessages.push('• Email Address');
                    }
                }
            }
            if (volunteerMobile) {
                const mobileSnapshot = await approvedVolunteersRef.orderByChild('mobileNumber').equalTo(volunteerMobile).once('value');
                if (mobileSnapshot.exists()) {
                    let foundDuplicate = false;
                    mobileSnapshot.forEach(childSnapshot => {
                        if (childSnapshot.key !== currentVolunteerKey) {
                            foundDuplicate = true;
                            return true;
                        }
                    });
                    if (foundDuplicate) {
                        duplicateMessages.push('• Mobile Number');
                    }
                }
            }
            if (volunteerFullName) {
                const nameSnapshot = await approvedVolunteersRef.once('value');
                let nameExists = false;
                if (nameSnapshot.exists()) {
                    nameSnapshot.forEach(childSnapshot => {
                        const approvedVolunteer = childSnapshot.val();
                        if (childSnapshot.key !== currentVolunteerKey) {
                            const approvedFullName = getFullName(approvedVolunteer).toLowerCase();
                            if (approvedFullName === volunteerFullName) {
                                nameExists = true;
                                return true;
                            }
                        }
                    });
                }
                if (nameExists) {
                    duplicateMessages.push('• Full Name');
                }
            }
            if (duplicateMessages.length > 0) {
                Swal.fire({
                    title: 'Potential Duplicate Volunteer Detected',
                    html: `${duplicateMessages.join('<br>')}<br><br>Do you want to proceed with importing these records?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway',
                    cancelButtonText: 'Cancel & Review',
                    reverseButtons: true,
                    customClass: {
                        popup: 'custom-swal-popup-large',
                        title: 'custom-swal-title',
                        htmlContainer: 'custom-swal-content',
                        confirmButton: 'custom-confirm-btn',
                        cancelButton: 'custom-cancel-btn'
                    }
                }).then((duplicateResult) => {
                    if (duplicateResult.isConfirmed) {
                        Swal.fire({
                            title: 'Proceeding',
                            text: 'Proceeding with scheduling despite potential duplicate warning.',
                            icon: 'success',
                            customClass: {
                                popup: 'swal2-popup-success-clean',
                                title: 'swal2-title-success-clean',
                                htmlContainer: 'swal2-text-success-clean',
                                confirmButton: 'my-success-button'
                            }
                        });
                        handleScheduleConfirmation(scheduledDateTime, currentVolunteerKey, currentVolunteerData);
                    } else {
                        Swal.fire({
                            title: 'Cancelled',
                            text: 'Scheduling cancelled for review.',
                            icon: 'error',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean',
                                confirmButton: 'my-error-button'
                            }
                        });
                        hideScheduleModal();
                    }
                });
                return;
            }
            // let isMatchingAvailability = false;
            // if (currentVolunteerData?.availability?.specificDateTimeSlots?.length > 0) {
            //     const selectedDateTime = new Date(scheduledDateTime);
            //     const selectedDateStr = selectedDateTime.toISOString().split('T')[0];
            //     const selectedTime24Hr = formatTimeTo24Hr(selectedDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
                
            //     isMatchingAvailability = currentVolunteerData.availability.specificDateTimeSlots.some(slot => {
            //         if (!slot.date || !slot.time) return false;
            //         const slotDate = slot.date;
            //         const slotTime = slot.time;
            //         return slotDate === selectedDateStr && slotTime === selectedDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            //     });
            // }
            let isMatchingAvailability = false;
            if (currentVolunteerData?.availability?.specificDateTimeSlots?.length > 0) {
                const selectedDateTime = new Date(scheduledDateTime);
                const selectedDateStr = selectedDateTime.toISOString().split('T')[0];
                // Ensure the time format matches the volunteer's slot.time (e.g., "2:00 PM" instead of "02:00 PM")
                const selectedTime12Hr = selectedDateTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', // Use 'numeric' to avoid leading zero (e.g., "2" instead of "02")
                    minute: '2-digit', 
                    hour12: true 
                }).replace(/^0/, ''); // Remove leading zero if present (e.g., "02:00 PM" -> "2:00 PM")

                isMatchingAvailability = currentVolunteerData.availability.specificDateTimeSlots.some(slot => {
                    if (!slot.date || !slot.time) return false;
                    return slot.date === selectedDateStr && slot.time === selectedTime12Hr;
                });
            }
            if (!isMatchingAvailability && !currentVolunteerData.isEmergencyResponse) {
                const result = await Swal.fire({
                    title: 'Schedule Mismatch',
                    html: `The selected schedule (${formatDate(new Date(scheduledDateTime).toISOString())}) does not match the volunteer's availability. Proceed anyway?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed',
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
                });
                
                if (!result.isConfirmed) {
                    Swal.fire({
                        title: 'Cancelled',
                        text: 'Scheduling cancelled due to mismatched availability.',
                        icon: 'error',
                        timer: 2000,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean'
                        }

                    });
                    return;
                }
            }
            handleScheduleConfirmation(scheduledDateTime, currentVolunteerKey, currentVolunteerData);
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to perform duplicate check. Please try again.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            hideScheduleModal();
        }
    });

    async function handleScheduleConfirmation(scheduledDateTime, volunteerKey, volunteerData) {
        if (!restrictAction('confirmByAB')) {
            hideScheduleModal();
            return;
        }
        Swal.fire({
            title: 'Confirm Schedule?',
            text: `Schedule volunteer for ${formatDate(new Date(scheduledDateTime).toISOString())}? An email will be sent.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Confirm',
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
                try {
                    await database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`).set({
                        ...volunteerData,
                        status: 'confirmedByAB',
                        scheduledDateTime: new Date(scheduledDateTime).toISOString()
                    });
                    await database.ref(`volunteerApplications/pendingVolunteer/${volunteerKey}`).remove();
                    await sendApprovalEmail(volunteerData, formatDate(new Date(scheduledDateTime).toISOString()));
                    Swal.fire({
                        title: 'Success!',
                        text: 'Volunteer scheduled and approved successfully.',
                        icon: 'success',
                        timer: 1600,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean',
                        }
                    });
                    hideScheduleModal();
                    fetchPendingVolunteers();
                } catch (error) {
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to schedule and approve volunteer. Please try again.',
                        icon: 'error',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean',
                            confirmButton: 'my-error-button'
                        }
                    });
                    hideScheduleModal();
                }
            } else {
                hideScheduleModal();
            }
        });
    }

    endorseABVNForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!restrictAction('endorseToABVN')) {
            hideEndorseABVNModal();
            return;
        }
        const selectedABVNR = document.querySelector('input[name="selectedABVN"]:checked');
        if (!selectedABVNR) {
            Swal.fire({
                title: 'Error',
                text: 'Please select an ABVN to endorse to.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        if (!currentVolunteerKey || !currentVolunteerData) {
            Swal.fire({
                title: 'Error',
                text: 'No volunteer selected for endorsement.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            hideEndorseABVNModal();
            return;
        }
        const abvnKey = selectedABVNR.value;
        const abvnName = selectedABVNR.dataset.name;
        const abvnLocation = selectedABVNR.dataset.location;
        Swal.fire({
            title: 'Confirm Endorsement?',
            html: `Endorse <strong>${getFullName(currentVolunteerData)}</strong> to <strong>${abvnName}</strong> in ${abvnLocation}? An endorsement email will be sent to the ABVN group.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Endorse',
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
                try {
                    const abvnSnapshot = await database.ref(`volunteerGroups/${abvnKey}`).once('value');
                    const abvnGroupData = abvnSnapshot.val();
                    if (!abvnGroupData) {
                        Swal.fire({
                            title: 'Error',
                            text: 'Selected ABVN group details not found.',
                            icon: 'error',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean',
                                confirmButton: 'my-error-button'
                            }
                        });
                        return;
                    }
                    await database.ref(`volunteerGroups/${abvnKey}/endorsedVolunteers/${currentVolunteerKey}`).set({
                        ...currentVolunteerData,
                        status: 'directedToABVN',
                        endorsedToABVNKey: abvnKey,
                        endorsedToABVNName: abvnName,
                        endorsedToABVNLocation: abvnLocation,
                        endorsementDate: new Date().toISOString()
                    });
                    await database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`).remove();
                    await sendEndorsementEmail(currentVolunteerData, abvnGroupData);
                    Swal.fire({
                        title: 'Endorsed!',
                        text: 'Volunteer has been endorsed to the selected ABVN group, and an endorsement email sent.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean'
                        }
                    });
                    hideEndorseABVNModal();
                } catch (error) {
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to endorse volunteer. Please try again.',
                        icon: 'error',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean',
                            confirmButton: 'my-error-button'
                        }
                    });
                    hideEndorseABVNModal();
                }
            } else {
                hideEndorseABVNModal();
            }
        });
    });

    async function handleEndorsementProcess() {
        if (!restrictAction('endorseToABVN')) return;
        const volunteerEmail = currentVolunteerData.email;
        const volunteerMobile = currentVolunteerData.mobileNumber;
        const volunteerFullName = getFullName(currentVolunteerData).toLowerCase();
        if (!volunteerEmail && !volunteerMobile && !volunteerFullName) {
            Swal.fire({
                title: 'Error',
                text: 'Volunteer data is missing crucial information (email, mobile, full name). Cannot perform duplicate check for endorsement.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            resetCurrentVolunteer();
            return;
        }
        try {
            const abvnGroupsRef = database.ref('volunteerGroups');
            let duplicateMessages = [];
            let isSameApplicationEndorsed = false; // Check for exact application
            let isPotentialDuplicate = false; // Check for duplicate email/mobile/name
            const allAbvnSnapshot = await abvnGroupsRef.once('value');
            let allEndorsedVolunteersData = [];
            if (allAbvnSnapshot.exists()) {
                allAbvnSnapshot.forEach(abvnGroupChild => {
                    const groupData = abvnGroupChild.val();
                    const groupName = groupData.organization || abvnGroupChild.key;
                    const endorsedVolunteers = abvnGroupChild.child('endorsedVolunteers').val();
                    if (endorsedVolunteers) {
                        for (const volKey in endorsedVolunteers) {
                            if (volKey === currentVolunteerKey) {
                                isSameApplicationEndorsed = true;
                                duplicateMessages.push(`• This exact volunteer application (key: ${currentVolunteerKey}) is already endorsed to: <strong>${groupName}</strong>`);
                            } else {
                                allEndorsedVolunteersData.push({
                                    key: volKey,
                                    endorsedGroupName: groupName,
                                    ...endorsedVolunteers[volKey]
                                });
                            }
                        }
                    }
                });
            }
            if (isSameApplicationEndorsed) {
                Swal.fire({
                    title: 'Volunteer Already Endorsed',
                    html: `${duplicateMessages.join('<br>')}<br><br>Please verify first.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway',
                    cancelButtonText: 'Cancel & Review',
                    reverseButtons: true,
                    customClass: {
                        popup: 'custom-swal-popup-large',
                        title: 'custom-swal-title',
                        htmlContainer: 'swal2-text-content',
                        confirmButton: 'custom-confirm-btn',
                        cancelButton: 'custom-cancel-btn'
                    }
                }).then((duplicateResult) => {
                    if (duplicateResult.isConfirmed) {
                        showEndorseABVNModal();
                    } else {
                        Swal.fire({
                            title: 'Cancelled',
                            text: 'Endorsement cancelled for review.',
                            icon: 'error',
                            timer: 2000,
                            showConfirmButton: false,
                            timerProgressBar: true,
                            allowOutsideClick: false,
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                        hideEndorseABVNModal();
                    }
                });
                return;
            }
            if (volunteerEmail) {
                const emailDuplicate = allEndorsedVolunteersData.find(ev =>
                    (ev.email || '').toLowerCase() === volunteerEmail.toLowerCase()
                );
                if (emailDuplicate) {
                    isPotentialDuplicate = true;
                    duplicateMessages.push(`• Email Address (found in ABVN Group: ${emailDuplicate.endorsedGroupName})`);
                }
            }
            if (volunteerMobile) {
                const mobileDuplicate = allEndorsedVolunteersData.find(ev =>
                    (ev.mobileNumber || '') === volunteerMobile
                );
                if (mobileDuplicate) {
                    isPotentialDuplicate = true;
                    duplicateMessages.push(`• Mobile Number (found in ABVN Group: ${mobileDuplicate.endorsedGroupName})`);
                }
            }
            if (volunteerFullName) {
                const nameDuplicate = allEndorsedVolunteersData.find(ev =>
                    getFullName(ev).toLowerCase() === volunteerFullName
                );
                if (nameDuplicate) {
                    isPotentialDuplicate = true;
                    duplicateMessages.push(`• Full Name (found in ABVN Group: ${nameDuplicate.endorsedGroupName})`);
                }
            }
            if (isPotentialDuplicate) {
                Swal.fire({
                    title: 'Potential Duplicate Volunteer Detected',
                    html: `${duplicateMessages.join('<br>')}<br><br>Please verify first.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway',
                    cancelButtonText: 'Cancel & Review',
                    reverseButtons: true,
                    customClass: {
                        popup: 'custom-swal-popup-large',
                        title: 'custom-swal-title',
                        htmlContainer: 'swal2-text-content',
                        confirmButton: 'custom-confirm-btn',
                        cancelButton: 'custom-cancel-btn'
                    }
                }).then((duplicateResult) => {
                    if (duplicateResult.isConfirmed) {
                        showEndorseABVNModal();
                    } else {
                        Swal.fire({
                            title: 'Cancelled',
                            text: 'Endorsement cancelled for review.',
                            icon: 'error',
                            timer: 2000,
                            showConfirmButton: false,
                            timerProgressBar: true,
                            allowOutsideClick: false,
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                        hideEndorseABVNModal();
                    }
                });
                return;
            }
            showEndorseABVNModal();
        } catch (endorseCheckError) {
            Swal.fire({
                title: 'Error',
                text: 'Failed to perform endorsement duplicate check. Please try again.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            hideEndorseABVNModal();
        }
    }

    async function sendApprovalEmail(volunteer, scheduledDate) {
        if (!restrictAction('confirmByAB')) return;
        if (!volunteer || !volunteer.email) {
            Swal.fire({
                title: 'Error',
                text: 'Missing volunteer email. Cannot send confirmation.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        const fullName = getFullName(volunteer);
        const templateParams = {
            to_name: fullName,
            to_email: volunteer.email,
            scheduled_date: scheduledDate,
        };
        try {
            const response = await emailjs.send('service_gupgjog', 'template_udpyecq', templateParams);
            Swal.fire({
                title: 'Email Sent!',
                text: 'Confirmation email has been sent to the volunteer.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                timerProgressBar: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean'
                }
            });
        } catch (error) {
            Swal.fire({
                title: 'Email Error',
                text: 'Failed to send confirmation email. Please try again.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
        }
    }

    async function sendEndorsementEmail(volunteer, abvnGroup) {
        if (!restrictAction('endorseToABVN')) return;
        if (!volunteer || !volunteer.email || !abvnGroup || !abvnGroup.email) {
            Swal.fire({
                title: 'Error',
                text: 'Missing volunteer or ABVN group email. Cannot send endorsement.',
                icon: 'error',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            });
            return;
        }
        const volunteerFullName = getFullName(volunteer);
        const abvnOrganization = abvnGroup.organization || 'Unknown ABVN Group';
        const abvnContactPerson = abvnGroup.contactPerson || 'ABVN Admin';
        const abvnContactEmail = abvnGroup.email;
        const abvnContactNumber = abvnGroup.mobileNumber || 'N/A';
        const templateParams = {
            volunteer_name: volunteerFullName,
            volunteer_email: volunteer.email,
            abvn_name: abvnOrganization,
            abvn_contact_person: abvnContactPerson,
            abvn_contact_email: abvnContactEmail,
            abvn_contact_number: abvnContactNumber,
            volunteer_mobile: volunteer.mobileNumber || 'N/A',
            volunteer_address: `${volunteer.address?.barangay || ''}, ${volunteer.address?.city || ''}, ${volunteer.address?.province || ''}, ${volunteer.address?.region || ''}`.trim().replace(/^,?\s*|,?\s*$/g, '').replace(/,,\s*/g, ', '),
            volunteer_additional_info: volunteer.otherSkillComments || 'N/A',
        };
        try {
            const response = await emailjs.send('service_gupgjog', 'template_5ndnhco', templateParams);
            Swal.fire({
                title: 'Endorsement Sent!',
                text: 'Endorsement email has been sent to the ABVN group.',
                icon: 'success',
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean',
                    confirmButton: 'my-success-button'
                }
            });
        } catch (error) {
            Swal.fire({
                title: 'Email Error',
                text: 'Failed to send endorsement email. Please try again.',
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
        }
    }

    document.addEventListener('click', (event) => {
        if (currentDropdown && !currentDropdown.contains(event.target) && !event.target.closest('.actionBtn')) {
            currentDropdown.remove();
            currentDropdown = null;
            const previouslyActiveButton = document.querySelector('.actionBtn.active');
            if (previouslyActiveButton) {
                previouslyActiveButton.classList.remove('active');
            }
        }
    });

    fetchPendingVolunteers();
}