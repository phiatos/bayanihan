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

// Initialize Firebase only if it hasn't been initialized already
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully.");
} else {
    console.log("Firebase already initialized.");
}

const database = firebase.database();
const auth = firebase.auth();

// Variables for inactivity detection --------------------------------------------------------------------
let inactivityTimeout;
const INACTIVITY_TIME = 180000; // 30 minutes in milliseconds

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
            resetInactivityTimer();
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // User chose to log out
            auth.signOut().then(() => {
                console.log("User logged out due to inactivity.");
                window.location.href = "../pages/login.html";
            }).catch((error) => {
                console.error("Error logging out:", error);
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

// Attach inactivity reset to common user interaction events
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});
//-------------------------------------------------------------------------------------
// Global flag for Super Admin status
let currentUserIsSuperAdmin = false;
let excelFileInput;
let importExcelBtn;
let importStatusModal;
let closeImportStatusModalBtn;
let importProgressBar;
let importStatusText;
let importErrorList;

document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication Check ---
    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access pending applications.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }
        console.log("User authenticated:", user.uid);

        // Fetch user role to determine Super Admin status
        database.ref(`users/${user.uid}`).once('value', snapshot => {
            const userData = snapshot.val();
            if (userData && userData.isSuperAdmin === true) {
                currentUserIsSuperAdmin = true;
                console.log("Current user is a Super Admin.");
            } else {
                currentUserIsSuperAdmin = false;
                console.log("Current user is NOT a Super Admin. Limiting access.");
            }
            initializePageFunctions(user.uid);
            resetInactivityTimer(); // Start inactivity timer after user is authenticated and role checked
        }).catch(error => {
            console.error("Error fetching user role:", error);
            currentUserIsSuperAdmin = false; // Default to false on error
            initializePageFunctions(user.uid);
            resetInactivityTimer();
        });
    });
});

function initializePageFunctions(userId) {
    const volunteerOrgsContainer = document.getElementById('volunteerOrgsContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const viewApprovedBtn = document.getElementById('viewApprovedBtn');
    const viewArchivedButton = document.getElementById('viewArchived'); 
    const exportBtn = document.getElementById('exportBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');

    // Modal Elements 
    const previewModal = document.getElementById('previewModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalContentDiv = document.getElementById('modalContent');

    // Archived Modal Elements
    const archivedModal = document.getElementById('archivedModal');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
    const archivedVGTableBody = document.getElementById('archivedTableBody'); // Make sure this ID is correct in HTML
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const archivedPaginationContainer = document.getElementById('archivedPagination');

    // New element initializations for import
    excelFileInput = document.getElementById('excelFileInput');
    importExcelBtn = document.getElementById('importExcelBtn');
    importStatusModal = document.getElementById('importStatusModal');
    closeImportStatusModalBtn = document.getElementById('closeImportStatusModalBtn');
    importProgressBar = document.getElementById('importProgressBar');
    importStatusText = document.getElementById('importStatusText');
    importErrorList = document.getElementById('importErrorList');

    let allApplications = []; // For active pending applications
    let filteredApplications = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    let allArchivedVGData = []; // For archived applications
    let currentArchivedVGPage = 1;
    const archivedVGRowsPerPage = 5;

    // Event Listener for the Import Button
    if (importExcelBtn) {
        importExcelBtn.addEventListener('click', () => {
            if (!currentUserIsSuperAdmin) {
                Swal.fire('Access Denied', 'You do not have permission to import volunteer group applications.', 'error');
                return;
            }
            excelFileInput.click(); // Trigger the file input click
        });
    }

    // Event Listener for file selection
    if (excelFileInput) {
        excelFileInput.addEventListener('change', handleExcelFileSelect);
    }

    // Close import status modal listener
    if (closeImportStatusModalBtn) {
        closeImportStatusModalBtn.addEventListener('click', () => {
            importStatusModal.style.display = 'none';
        });
    }

    // Close modals when clicking outside (add for importStatusModal)
    window.addEventListener('click', (event) => {
        // ... existing modal closing logic ...
        if (event.target === importStatusModal) {
            importStatusModal.style.display = 'none';
        }
    });

    // --- NEW FUNCTIONS FOR EXCEL IMPORT ---

async function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    if (!currentUserIsSuperAdmin) {
        Swal.fire('Access Denied', 'You do not have permission to import volunteer group applications.', 'error');
        return;
    }

    // Reset UI for new import
    importProgressBar.style.width = '0%';
    importProgressBar.textContent = '0%';
    importProgressBar.style.backgroundColor = '#4CAF50'; // Green for success/progress
    importStatusText.textContent = 'Reading Excel file...';
    importErrorList.innerHTML = '';
    importStatusModal.style.display = 'flex'; // Show the modal

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Read as array of arrays, first row as header

            if (jsonData.length === 0) {
                throw new Error("The Excel file is empty or could not be read.");
            }

            // Assume the first row contains headers
            const headers = jsonData[0];
            const rows = jsonData.slice(1); // Data rows

            // Define expected headers and their corresponding Firebase keys
            // IMPORTANT: Adjust these to match your Excel column headers exactly
            // and the Firebase keys you want them mapped to.
            const columnMap = {
                'Organization Name': 'organizationName',
                'Contact Person': 'contactPerson',
                'Email': 'email',
                'Mobile Number': 'mobileNumber',
                'Landline Number': 'landlineNumber',
                'Facebook Link': 'facebookLink',
                'Instagram Link': 'instagramLink',
                'Twitter Link': 'twitterLink',
                'TikTok Link': 'tiktokLink',
                'Website Link': 'websiteLink',
                'Registration Date': 'registrationDate', // This might need special handling if not a valid date string
                'Group Description': 'groupDescription',
                'Headquarters Region': 'headquarters.region',
                'Headquarters Province': 'headquarters.province',
                'Headquarters City': 'headquarters.city',
                'Headquarters Barangay': 'headquarters.barangay',
                'Headquarters Street Address': 'headquarters.streetAddress',
                'Primary Advocacies': 'primaryAdvocacies', // Expecting comma-separated string, will convert to array
                'Application Date and Time': 'applicationDateandTime'
                // Add any other fields you expect in your Excel
            };

            const expectedHeaders = Object.keys(columnMap);
            const mappedData = [];
            const importErrors = [];
            let processedCount = 0;
            const totalRecords = rows.length;

            if (totalRecords === 0) {
                Swal.fire('No Data', 'The Excel file contains headers but no data rows.', 'info');
                importStatusModal.style.display = 'none';
                return;
            }

            importStatusText.textContent = `Validating and preparing ${totalRecords} records...`;

            for (let i = 0; i < totalRecords; i++) {
                const row = rows[i];
                const record = {};
                let isValidRecord = true;
                const rowErrors = [];

                // Map Excel columns to Firebase keys
                headers.forEach((header, index) => {
                    const firebaseKey = columnMap[header.trim()];
                    if (firebaseKey) {
                        if (firebaseKey.includes('.')) {
                            // Handle nested properties like headquarters.region
                            const [parentKey, childKey] = firebaseKey.split('.');
                            record[parentKey] = record[parentKey] || {};
                            record[parentKey][childKey] = row[index];
                        } else {
                            record[firebaseKey] = row[index];
                        }
                    }
                });

                // --- Basic Validation ---
                if (!record.organizationName || record.organizationName.trim() === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Organization Name');
                }
                if (!record.email || record.email.trim() === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
                    isValidRecord = false;
                    rowErrors.push('Invalid or Missing Email');
                }
                if (!record.contactPerson || record.contactPerson.trim() === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Contact Person');
                }
                if (!record.mobileNumber || record.mobileNumber.trim() === '') {
                    isValidRecord = false;
                    rowErrors.push('Missing Mobile Number');
                }

                // Convert advocacies string to array
                if (record.primaryAdvocacies && typeof record.primaryAdvocacies === 'string') {
                    record.primaryAdvocacies = record.primaryAdvocacies.split(',').map(s => s.trim()).filter(s => s !== '');
                } else {
                    record.primaryAdvocacies = []; // Ensure it's an array even if empty
                }

                // Add current timestamp for applicationDateandTime if not provided in Excel
                if (!record.applicationDateandTime) {
                    record.applicationDateandTime = new Date().toISOString();
                } else {
                    // Try to parse the date from Excel. Excel dates can be tricky.
                    // This assumes Excel provides a readable date string. If it's a number,
                    // you'll need a different parsing library or logic (e.g., XLSX.SSF.parse_date_code)
                    try {
                        const date = new Date(record.applicationDateandTime);
                        if (isNaN(date.getTime())) {
                             throw new Error("Invalid Date");
                        }
                        record.applicationDateandTime = date.toISOString();
                    } catch (e) {
                        isValidRecord = false;
                        rowErrors.push('Invalid Application Date and Time format');
                    }
                }


                // Set default status and other required fields if they are not in Excel
                record.status = 'Pending';
                record.appliedAt = new Date().toISOString(); // Timestamp when this import process happens
                // Add any other default fields needed for a pending application

                if (isValidRecord) {
                    mappedData.push(record);
                } else {
                    importErrors.push(`Row ${i + 2} (${record.organizationName || 'N/A'}): ${rowErrors.join(', ')}`);
                }
            }

            if (mappedData.length === 0) {
                Swal.fire('No Valid Records', 'No valid records found in the Excel file after validation. Check errors for details.', 'error');
                importErrorList.innerHTML = importErrors.map(err => `<li>${err}</li>`).join('');
                importProgressBar.style.backgroundColor = '#f44336'; // Red for errors
                return;
            }

            importStatusText.textContent = `Importing ${mappedData.length} valid records to Firebase...`;

            // --- Bulk Upload to Firebase ---
            let successCount = 0;
            let currentErrors = [];

            for (const appData of mappedData) {
                try {
                    // Generate a new unique ID for the application in Firebase
                    const newAppRef = database.ref('abvnApplications/pendingABVN').push();
                    await newAppRef.set(appData);
                    successCount++;
                } catch (error) {
                    console.error("Error importing application:", appData.organizationName, error);
                    currentErrors.push(`Failed to import "${appData.organizationName || 'N/A'}": ${error.message}`);
                }
                processedCount++;
                const progress = Math.round((processedCount / mappedData.length) * 100);
                importProgressBar.style.width = `${progress}%`;
                importProgressBar.textContent = `${progress}%`;
                importStatusText.textContent = `Importing ${successCount}/${mappedData.length} records...`;
            }

            importErrorList.innerHTML = currentErrors.map(err => `<li>${err}</li>`).join('');
            if (successCount > 0) {
                Swal.fire({
                    title: 'Import Complete!',
                    html: `Successfully imported ${successCount} applications. ${currentErrors.length > 0 ? `<br><br><strong>${currentErrors.length} errors occurred. Check the status modal for details.</strong>` : ''}`,
                    icon: 'success',
                    customClass: {
                        popup: 'custom-swal-popup-small',
                        title: 'custom-swal-title',
                        htmlContainer: 'custom-swal-text',
                        confirmButton: 'custom-confirm-btn'
                    }
                }).then(() => {
                    fetchPendingApplications(); // Refresh table after import
                    importStatusModal.style.display = 'none'; // Hide modal after user acknowledges
                });
            } else {
                Swal.fire({
                    title: 'Import Failed',
                    html: 'No applications were successfully imported. Please check for errors in the console or status modal.',
                    icon: 'error',
                    customClass: {
                        popup: 'custom-swal-popup-small',
                        title: 'custom-swal-title',
                        htmlContainer: 'custom-swal-text',
                        confirmButton: 'custom-confirm-btn'
                    }
                });
            }


        } catch (error) {
            console.error("Error processing Excel file:", error);
            Swal.fire('Error', 'Failed to process Excel file: ' + error.message, 'error');
            importProgressBar.style.backgroundColor = '#f44336'; // Red for errors
            importStatusText.textContent = `Error: ${error.message}`;
            importStatusModal.style.display = 'flex'; // Ensure modal is visible to show error
        } finally {
            event.target.value = ''; // Clear the file input to allow selecting the same file again
        }
    };

    reader.readAsArrayBuffer(file); // Read file as array buffer for XLSX
}


    // --- Data Fetching Function (Active Pending) ---
    function fetchPendingApplications() {
        volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center;">Loading applications...</td></tr>'; // Increased colspan

        database.ref('abvnApplications/pendingABVN').on('value', (snapshot) => {
            allApplications = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const appData = childSnapshot.val();
                    const appKey = childSnapshot.key;
                    allApplications.push({ key: appKey, ...appData });
                });
                console.log("Fetched pending applications:", allApplications);
            } else {
                console.log("No pending ABVN applications found.");
            }
            applySearchAndSort();
        }, (error) => {
            console.error("Error fetching pending applications: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load pending applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center; color: red;">Failed to load data.</td></tr>'; // Increased colspan
        });
    }

    // --- Rendering Function ---
    function renderApplications(applicationsToRender) {
        volunteerOrgsContainer.innerHTML = '';

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            volunteerOrgsContainer.innerHTML = '<tr><td colspan="13" style="text-align: center;">No pending applications found on this page.</td></tr>'; // Increased colspan
            updateEntriesInfo(0); 
            renderPagination(0);
            return;
        }

        let i = startIndex + 1;

        paginatedApplications.forEach(app => {
            const row = volunteerOrgsContainer.insertRow();
            row.setAttribute('data-key', app.key);

            const formattedTimestamp = app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }) : 'N/A';

            row.innerHTML = `
                <td>${i++}</td>
                <td>${app.organizationName || 'N/A'}</td>
                <td>${app.contactPerson || 'N/A'}</td>
                <td>${app.email || 'N/A'}</td>
                <td>${app.mobileNumber || 'N/A'}</td>
                <td><a href="${app.socialMediaLink}" target="_blank" rel="noopener noreferrer">${app.socialMediaLink ? 'Link' : 'N/A'}</a></td>
                <td>${app.headquarters?.region || 'N/A'}</td>
                <td>${app.headquarters?.province || 'N/A'}</td>
                <td>${app.headquarters?.city || 'N/A'}</td>
                <td>${app.headquarters?.barangay || 'N/A'}</td>
                <td>${app.headquarters?.streetAddress || 'N/A'}</td>
                <td>${formattedTimestamp || 'N/A'}</td>
                <td>
                    <button class="viewBtn" data-key="${app.key}"><i class='bx bx-show-alt'></i></button>
                    <button class="approveBtn" data-key="${app.key}"><i class="bx bx-check-circle"></i></button>
                    <button class="rejectBtn" data-key="${app.key}"><i class="bx bx-x-circle"></i></button>
                </td>
            `;
        });

        updateEntriesInfo(applicationsToRender.length);
        renderPagination(applicationsToRender.length);
    }

    // --- Search and Sort Logic ---
    function applySearchAndSort() {
        let currentApplications = [...allApplications];

        // Apply search filter
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            currentApplications = currentApplications.filter(app => {
                const orgName = (app.organizationName || '').toLowerCase();
                const contactPerson = (app.contactPerson || '').toLowerCase();
                const email = (app.email || '').toLowerCase();
                const mobileNumber = (app.mobileNumber || '').toLowerCase();
                const region = (app.headquarters?.region || '').toLowerCase();
                const province = (app.headquarters?.province || '').toLowerCase();
                const city = (app.headquarters?.city || '').toLowerCase();
                const barangay = (app.headquarters?.barangay || '').toLowerCase();
                const streetAddress = (app.headquarters?.streetAddress || '').toLowerCase();
                const applicationDateTime = app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString().toLowerCase() : '';


                return orgName.includes(searchTerm) ||
                       contactPerson.includes(searchTerm) ||
                       email.includes(searchTerm) ||
                       mobileNumber.includes(searchTerm) ||
                       region.includes(searchTerm) ||
                       province.includes(searchTerm) ||
                       city.includes(searchTerm) ||
                       barangay.includes(searchTerm) ||
                       streetAddress.includes(searchTerm) ||
                       applicationDateTime.includes(searchTerm);
            });
        }

        // Apply sort
        const sortValue = sortSelect.value;
        if (sortValue) {
            const [sortBy, order] = sortValue.split('-');
            currentApplications.sort((a, b) => {
                let valA, valB;

                switch (sortBy) {
                    case 'organizationName':
                    case 'contactPerson':
                    case 'email':
                        valA = (a[sortBy] || '').toLowerCase();
                        valB = (b[sortBy] || '').toLowerCase();
                        break;
                    case 'mobileNumber':
                        valA = parseInt(a.mobileNumber || '0');
                        valB = parseInt(b.mobileNumber || '0');
                        break;
                    case 'region':
                        valA = (a.headquarters?.region || '').toLowerCase();
                        valB = (b.headquarters?.region || '').toLowerCase();
                        break;
                    case 'province':
                        valA = (a.headquarters?.province || '').toLowerCase();
                        valB = (b.headquarters?.province || '').toLowerCase();
                        break;
                    case 'city':
                        valA = (a.headquarters?.city || '').toLowerCase();
                        valB = (b.headquarters?.city || '').toLowerCase();
                        break;
                    case 'barangay':
                        valA = (a.headquarters?.barangay || '').toLowerCase();
                        valB = (b.headquarters?.barangay || '').toLowerCase();
                        break;
                    case 'streetAddress': 
                        valA = (a.headquarters?.streetAddress || '').toLowerCase();
                        valB = (b.headquarters?.streetAddress || '').toLowerCase();
                        break;
                    case 'applicationDateandTime':
                        valA = new Date(a.applicationDateandTime || 0).getTime();
                        valB = new Date(b.applicationDateandTime || 0).getTime();
                        break;
                    default:
                        valA = (a.organizationName || '').toLowerCase();
                        valB = (b.organizationName || '').toLowerCase();
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

    // --- Excel Export Functionality ---
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            if (filteredApplications.length === 0) { 
                Swal.fire("Info", "No data to export!", "info");
                return;
            }

            const dataForExport = filteredApplications.map((app, i) => ({
                "No.": i + 1,
                "Organization Name": app.organizationName || 'N/A',
                "Contact Person": app.contactPerson || 'N/A',
                "Email": app.email || 'N/A',
                "Mobile Number": String(app.mobileNumber || 'N/A'), 
                "Social Media": app.socialMediaLink || 'N/A',
                "Region": app.headquarters?.region || 'N/A',
                "Province": app.headquarters?.province || 'N/A',
                "City": app.headquarters?.city || 'N/A',
                "Barangay": app.headquarters?.barangay || 'N/A',
                "Street Address": app.headquarters?.streetAddress || 'N/A',
                "Application Date/Time": app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString() : 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(dataForExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Pending ABVN Applications");

            // Get current date and format it for the filename
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0'); 
            const day = String(today.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            
            // Construct the filename with the date and time
            const hours = String(today.getHours()).padStart(2, '0');
            const minutes = String(today.getMinutes()).padStart(2, '0');
            const seconds = String(today.getSeconds()).padStart(2, '0');
            const formattedTime = `${hours}${minutes}${seconds}`;
            
            const filename = `pending-abvn-applications_${formattedDate}_${formattedTime}.xlsx`;
            
            XLSX.writeFile(wb, filename);
            Swal.fire("Success", `Pending ABVN Applications exported to ${filename}!`, "success");
        });
    }

    // --- PDF Export Functionality (All Data) ---
    if (savePdfBtn) {
        savePdfBtn.addEventListener("click", () => {
            if (filteredApplications.length === 0) { // Use filteredApplications for PDF export
                Swal.fire("Info", "No data to export to PDF!", "info");
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
            const doc = new jsPDF('landscape'); // 'landscape' for wider tables

            let yOffset = 20;
            const logo = new Image();
            // Ensure this path is correct relative to where pendingvg.html is located
            logo.src = '../assets/images/AB_logo.png'; 

            logo.onload = function() {
                const pageWidth = doc.internal.pageSize.width;
                const logoWidth = 30; // Adjust as needed
                const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
                const margin = 14;

                doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

                doc.setFontSize(18);
                doc.text("Pending ABVN Applications Report", 14, yOffset);
                yOffset += 10;
                doc.setFontSize(10);
                // Adjust timezone to Philippines (PHT)
                const now = new Date();
                const options = {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: true, timeZone: 'Asia/Manila' 
                };
                doc.text(`Report Generated: ${now.toLocaleString('en-US', options)} (PHT)`, 14, yOffset);
                yOffset += 15;

                const head = [[
                    "No.", "Organization Name", "Contact Person", "Email", "Mobile Number", "Social Media",
                    "Region", "Province", "City", "Barangay", "Street Address", "Application Date/Time"
                ]];

                const body = filteredApplications.map((app, i) => [
                    i + 1,
                    app.organizationName || 'N/A',
                    app.contactPerson || 'N/A',
                    app.email || 'N/A',
                    String(app.mobileNumber) || 'N/A',
                    app.socialMediaLink || 'N/A',
                    app.headquarters?.region || 'N/A',
                    app.headquarters?.province || 'N/A',
                    app.headquarters?.city || 'N/A',
                    app.headquarters?.barangay || 'N/A',
                    app.headquarters?.streetAddress || 'N/A',
                    app.applicationDateandTime ? new Date(app.applicationDateandTime).toLocaleString() : 'N/A'
                ]);

                doc.autoTable({
                    head: head,
                    body: body,
                    startY: yOffset,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [20, 174, 187], // Your desired header background color
                        textColor: [255, 255, 255], // White text
                        halign: 'center'
                    },
                    styles: {
                        fontSize: 8,
                        cellPadding: 2
                    },
                    didDrawPage: function (data) {
                        doc.setFontSize(8);
                        const pageNumberText = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                        const poweredByText = "Powered by: Appvance"; // Your desired text
                        const pageWidth = doc.internal.pageSize.width;
                        const margin = data.settings.margin.left;
                        const footerY = doc.internal.pageSize.height - 10;

                        doc.text(pageNumberText, margin, footerY);
                        doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
                    }
                });

                // Get current date and time for filename
                const nowForFilename = new Date();
                const year = nowForFilename.getFullYear();
                const month = String(nowForFilename.getMonth() + 1).padStart(2, '0');
                const day = String(nowForFilename.getDate()).padStart(2, '0');
                const hours = String(nowForFilename.getHours()).padStart(2, '0');
                const minutes = String(nowForFilename.getMinutes()).padStart(2, '0');
                const seconds = String(nowForFilename.getSeconds()).padStart(2, '0');
                const formattedDateTime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
                
                const filename = `pending-abvn-applications_${formattedDateTime}.pdf`;
                doc.save(filename);
                Swal.close();
                Swal.fire("Success", `Pending ABVN Applications exported to "${filename}"`, "success");
            };

            logo.onerror = function() {
                Swal.close();
                Swal.fire("Error", "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'", "error");
            };
        });
    }

    // --- Pagination Functions 
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
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pagination.appendChild(createButton(i, i, false, i === currentPage));
        }

        pagination.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
    }

    function updateEntriesInfo(totalItems) {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
        entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
    }

    function showPreviewModal(applicationData) {
        const formattedTimestamp = applicationData.applicationDateandTime ? new Date(applicationData.applicationDateandTime).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }) : 'N/A';

        let content = `
            <div class="modal-content-inner" style="padding: 20px;">

                <h4 style="margin-top: 0px; margin-bottom: 10px; color: #FA3B99;">Organization Details :</h4>

                <p><strong>Application Date/Time:</strong> ${formattedTimestamp}</p>
                <p><strong>Organization Name:</strong> ${applicationData.organizationName || 'N/A'}</p>
                <p><strong>Contact Person:</strong> ${applicationData.contactPerson || 'N/A'}</p>
                <p><strong>Email:</strong> ${applicationData.email || 'N/A'}</p>
                <p><strong>Mobile Number:</strong> ${applicationData.mobileNumber || 'N/A'}</p>
                <p><strong>Social Media Link:</strong> ${applicationData.socialMediaLink ? `<a href="${applicationData.socialMediaLink}" target="_blank" rel="noopener noreferrer">${applicationData.socialMediaLink}</a>` : 'N/A'}</p>

                <hr>

                <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Headquarters Address:</h4>
                <div style="margin-left: 15px;">
                    <p><strong>Region:</strong> ${applicationData.headquarters?.region || 'N/A'}</p>
                    <p><strong>Province:</strong> ${applicationData.headquarters?.province || 'N/A'}</p>
                    <p><strong>City:</strong> ${applicationData.headquarters?.city || 'N/A'}</p>
                    <p><strong>Barangay:</strong> ${applicationData.headquarters?.barangay || 'N/A'}</p>
                    <p><strong>Street Address:</strong> ${applicationData.headquarters?.streetAddress || 'N/A'}</p>
                </div>

                <hr>

                <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Organizational Background:</h4>
                <p><strong>Mission/Background:</strong> ${applicationData.organizationalBackgroundMission || 'N/A'}</p>
                <p><strong>Areas of Expertise/Focus:</strong> ${applicationData.areasOfExpertiseFocus || 'N/A'}</p>
                
                <hr>

                <h4 style="margin-top: 20px; margin-bottom: 10px; color: #FA3B99;">Legal & Documents:</h4>
                <p><strong>Legal Status/Registration:</strong> ${applicationData.legalStatusRegistration || 'N/A'}</p>
                <p><strong>Required Documents:</strong> ${applicationData.requiredDocumentsLink ? `<a href="${applicationData.requiredDocumentsLink}" target="_blank" rel="noopener noreferrer">View Document</a>` : 'N/A'}</p>
            </div>
            `;

        modalContentDiv.innerHTML = content;
        previewModal.style.display = 'flex';
    }

    function hidePreviewModal() {
        previewModal.style.display = 'none';
        modalContentDiv.innerHTML = '';
    }

    // --- Action Handlers (Approve/Reject/View) ---
    volunteerOrgsContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const appKey = target.dataset.key;

        if (!appKey) return;

        if (target.classList.contains('viewBtn')) {
            const applicationToView = allApplications.find(app => app.key === appKey);
            if (applicationToView) {
                showPreviewModal(applicationToView);
            } else {
                Swal.fire('Error', 'Application details not found.', 'error');
            }
        } else if (target.classList.contains('approveBtn')) {
            Swal.fire({
                title: 'Are you sure?',
                text: "Do you want to approve this application?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Approve', 
                    cancelButtonText: 'Cancel', 
                    customClass: {
                        popup: 'custom-swal-popup-small',
                        title: 'custom-swal-title',
                        htmlContainer: 'custom-swal-text',
                        confirmButton: 'swal2-button-confirm-clean', 
                        cancelButton: 'swal2-button-cancel-clean' 
                    }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const appRef = database.ref(`abvnApplications/pendingABVN/${appKey}`);
                        const snapshot = await appRef.once('value');
                        const applicationData = snapshot.val();

                        if (applicationData) {
                            const approvedAppsRef = database.ref('abvnApplications/approvedABVN');
                            const approvedSnapshot = await approvedAppsRef.once('value');
                            let isDuplicate = false;

                            if (approvedSnapshot.exists()) {
                                approvedSnapshot.forEach((approvedChild) => {
                                    const approvedData = approvedChild.val();
                                    const normalizedOrgName = applicationData.organizationName.trim().toLowerCase();
                                    const normalizedEmail = applicationData.email.trim().toLowerCase();
                                    if (approvedData.organizationName.trim().toLowerCase() === normalizedOrgName &&
                                        approvedData.email.trim().toLowerCase() === normalizedEmail) {
                                        isDuplicate = true;
                                        return true;
                                    }
                                });
                            }

                            if (isDuplicate) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Duplicate Found',
                                    html: 'This application already exists in the Approved Applications.<br><br>Please check the approved list before proceeding.',
                                    confirmButtonText: 'OK'
                                });
                                return;
                            }
                            applicationData.approvedApplicationDate = new Date().toISOString();
                            // Move to approvedABVN
                            await database.ref(`abvnApplications/approvedABVN/${appKey}`).set(applicationData);
                            // Remove from pendingABVN
                            await appRef.remove();
                            Swal.fire('Approved!', 'The application has been approved and moved.', 'success');
                        } else {
                            Swal.fire('Error', 'Application not found.', 'error');
                        }
                    } catch (error) {
                        console.error("Error approving application: ", error);
                        Swal.fire('Error', 'Failed to approve application. Please try again.', 'error');
                    }
                }
            });
        } else if (target.classList.contains('rejectBtn')) {
            Swal.fire({
                title: 'Are you sure?',
                text: "Do you want to reject this application? This will move it to archived records.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Reject',
                cancelButtonText: 'Cancel',
                customClass: {
                    popup: 'custom-swal-popup-small',
                    title: 'custom-swal-title',
                    htmlContainer: 'custom-swal-text', 
                    confirmButton: 'swal2-button-confirm-clean',
                    cancelButton: 'swal2-button-cancel-clean'
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const appRef = database.ref(`abvnApplications/pendingABVN/${appKey}`);
                        const snapshot = await appRef.once('value');
                        const applicationData = snapshot.val();

                        if (applicationData) {
                            // Add rejectedAt timestamp and status
                            applicationData.rejectedAt = new Date().toISOString();
                            applicationData.status = 'Rejected';

                            // Move to rejectedABVN (archived)
                            await database.ref(`abvnApplications/rejectedABVN/${appKey}`).set(applicationData);
                            // Remove from pendingABVN
                            await appRef.remove();

                            Swal.fire({
                                title: 'Rejected!',
                                text: 'The application has been rejected and archived.',
                                icon: 'success', 
                                customClass: {
                                    popup: 'custom-swal-popup-small',
                                    title: 'custom-swal-title',
                                    htmlContainer: 'custom-swal-text',
                                    confirmButton: 'custom-confirm-btn'
                                }
                            });
                        } else {
                            Swal.fire('Error', 'Application not found.', 'error');
                        }
                    } catch (error) {
                        console.error("Error rejecting application: ", error);
                        Swal.fire('Error', 'Failed to reject application. Please try again.', 'error');
                    }
                }
            });
        }
    });

    // --- Archived Pending ABVN Applications Functions ---
    async function fetchAndRenderArchivedVGs() {
        if (!currentUserIsSuperAdmin) {
            Swal.fire('Access Denied', 'You do not have permission to view archived volunteer group applications.', 'error');
            return;
        }

        // Swal.fire({
        //     title: 'Loading Archived Applications',
        //     text: 'Fetching archived volunteer group applications...',
        //     allowOutsideClick: false,
        //     didOpen: () => {
        //         Swal.showLoading();
        //     }
        // });

        try {
            // Assuming archived applications are stored under 'abvnApplications/rejectedABVN'
            const snapshot = await database.ref('abvnApplications/rejectedABVN').once('value');
            const archivedApplications = snapshot.val();
            allArchivedVGData = [];

            for (const uid in archivedApplications) {
                const app = archivedApplications[uid];
                allArchivedVGData.push({
                    uid: uid, // Store UID for actions
                    ...app
                });
            }
            Swal.close();
            renderArchivedVGTable(allArchivedVGData);
            archivedModal.style.display = 'flex'; // Show the modal after data is loaded
        } catch (error) {
            Swal.fire('Error', 'Failed to load archived applications: ' + error.message, 'error');
            console.error("Error fetching archived applications:", error);
        }
    }

    function renderArchivedVGTable(data) {
        if (!archivedVGTableBody) {
            console.error("Archived volunteer group table body not found!");
            return;
        }

        archivedVGTableBody.innerHTML = '';

        const startIndex = (currentArchivedVGPage - 1) * archivedVGRowsPerPage;
        const endIndex = startIndex + archivedVGRowsPerPage;
        const paginatedData = data.slice(startIndex, endIndex);


        if (paginatedData.length === 0) {
            archivedVGTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No archived volunteer group applications found.</td></tr>';
            updateArchivedEntriesInfo(0);
            renderArchivedPagination(0);
            return;
        }

        paginatedData.forEach(org => {
            const row = archivedVGTableBody.insertRow();
            row.dataset.uid = org.uid;

            const archivedDate = org.rejectedAt ? new Date(org.rejectedAt).toLocaleDateString() : 'N/A'; // Use rejectedAt for archived date

            row.insertCell(0).textContent = org.organizationName || 'N/A';
            row.insertCell(1).textContent = org.email || 'N/A';
            row.insertCell(2).textContent = org.status || 'N/A'; 
            row.insertCell(3).textContent = archivedDate;

            const actionsCell = row.insertCell(4);
            actionsCell.innerHTML = `
                <button class="retrieveBtn" data-uid="${org.uid}">Retrieve</button>
            `;
        });

        // Use the local pagination functions for archived table
        renderArchivedPagination(data.length);
        updateArchivedEntriesInfo(data.length);

        // Add event listeners for retrieve buttons
        document.querySelectorAll('.retrieveBtn').forEach(button => {
            button.addEventListener('click', (event) => retrieveVG(event.target.dataset.uid));
        });
    }

    function renderArchivedPagination(totalItems) {
        archivedPaginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalItems / archivedVGRowsPerPage);

        if (totalPages === 0) {
            archivedPaginationContainer.innerHTML = '<span>No entries to display</span>';
            return;
        }

        const createButton = (label, page, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (isActive) btn.classList.add('active-page');
            btn.addEventListener('click', () => {
                currentArchivedVGPage = page;
                renderArchivedVGTable(allArchivedVGData); // Re-render the current view
            });
            return btn;
        };

        archivedPaginationContainer.appendChild(createButton('Prev', currentArchivedVGPage - 1, currentArchivedVGPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentArchivedVGPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            archivedPaginationContainer.appendChild(createButton(i, i, false, i === currentArchivedVGPage));
        }

        archivedPaginationContainer.appendChild(createButton('Next', currentArchivedVGPage + 1, currentArchivedVGPage === totalPages));
    }


    function updateArchivedEntriesInfo(totalItems) {
        const startIndex = (currentArchivedVGPage - 1) * archivedVGRowsPerPage;
        const endIndex = Math.min(startIndex + archivedVGRowsPerPage, totalItems);
        archivedEntriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
    }

    async function retrieveVG(uid) {
        if (!currentUserIsSuperAdmin) {
            Swal.fire('Access Denied', 'You do not have permission to retrieve volunteer group applications.', 'error');
            return;
        }

        Swal.fire({
            title: 'Are you sure?',
            text: 'This will retrieve the volunteer group application from archived records and move it back to pending applications.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Retrieve',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'custom-swal-popup-small',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-text', 
                confirmButton: 'swal2-button-confirm-clean',
                cancelButton: 'swal2-button-cancel-clean'
            },
        }).then(async (result) => {
            if (result.isConfirmed) {

                try {
                    const snapshot = await database.ref(`abvnApplications/rejectedABVN/${uid}`).once('value');
                    const vgDataToRetrieve = snapshot.val();

                    if (!vgDataToRetrieve) {
                        Swal.fire('Error', 'Archived application data not found for retrieval.', 'error');
                        return;
                    }

                    // Check for duplicates in pendingABVN and approvedABVN
                    const pendingSnapshot = await database.ref('abvnApplications/pendingABVN').once('value');
                    const approvedSnapshot = await database.ref('abvnApplications/approvedABVN').once('value');
                    let isDuplicate = false;
                    let duplicateReason = '';

                    if (pendingSnapshot.exists()) {
                        pendingSnapshot.forEach((child) => {
                            const pendingData = child.val();
                            if (pendingData.organizationName.toLowerCase() === vgDataToRetrieve.organizationName.toLowerCase() ||
                                pendingData.email.toLowerCase() === vgDataToRetrieve.email.toLowerCase()) {
                                isDuplicate = true;
                                duplicateReason = pendingData.organizationName.toLowerCase() === vgDataToRetrieve.organizationName.toLowerCase() ? 'organization name' : 'email';
                                return true;
                            }
                        });
                    }

                    if (!isDuplicate && approvedSnapshot.exists()) {
                        approvedSnapshot.forEach((child) => {
                            const approvedData = child.val();
                            if (approvedData.organizationName.toLowerCase() === vgDataToRetrieve.organizationName.toLowerCase() &&
                                approvedData.email.toLowerCase() === vgDataToRetrieve.email.toLowerCase()) {
                                isDuplicate = true;
                                duplicateReason = 'organization name and email';
                                return true;
                            }
                        });
                    }

                    if (isDuplicate) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Duplicate Found',
                            html: `An application with this ${duplicateReason} already exists in the pending or approved applications.<br><br>Please check the respective lists before proceeding.`,
                            confirmButtonText: 'OK'
                        });
                        return;
                    }

                    // Remove the rejectedAt timestamp and reset status
                    delete vgDataToRetrieve.rejectedAt;
                    vgDataToRetrieve.status = 'Pending'; // Set status back to Pending

                    // Move data back to the 'abvnApplications/pendingABVN' node
                    await database.ref(`abvnApplications/pendingABVN/${uid}`).set(vgDataToRetrieve);

                    // Delete from 'abvnApplications/rejectedABVN' node
                    await database.ref(`abvnApplications/rejectedABVN/${uid}`).remove();

                    Swal.close();
                    // Swal.fire({
                    //     title: 'Retrieved!',
                    //     text: 'Volunteer Group has been retrieved to pending applications.',
                    //     icon: 'success',
                    //     customClass: {
                    //         popup: 'custom-swal-popup-small',
                    //         title: 'custom-swal-title',
                    //         htmlContainer: 'custom-swal-text',
                    //         confirmButton: 'custom-confirm-btn'
                    //     }
                    // });

                    fetchPendingApplications(); 
                    fetchAndRenderArchivedVGs(); 
                } catch (error) {
                    console.error("Error retrieving VG:", error);
                    Swal.fire('Error', 'Failed to retrieve application: ' + error.message, 'error');
                }
            }
        });
    }

    // --- Event Listeners for Search, Sort, and Modals ---
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('keyup', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applySearchAndSort();
            }, 300);
        });
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', applySearchAndSort);
    }

    // Close preview modal listener
    closeModalBtn.addEventListener('click', hidePreviewModal);

    // Open Archived VGs Modal
    if (viewArchivedButton) {
        viewArchivedButton.addEventListener('click', () => {
            currentArchivedVGPage = 1; // Reset to first page when opening
            fetchAndRenderArchivedVGs();
        });
    }

    // Close Archived VGs Modal
    if (closeArchivedModalBtn) {
        closeArchivedModalBtn.addEventListener('click', () => {
            archivedModal.style.display = 'none';
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === previewModal) {
            hidePreviewModal();
        }
        if (event.target === archivedModal) {
            archivedModal.style.display = 'none';
        }
    });

    // Handle "View Approved ABVN Applications" button
    if (viewApprovedBtn) {
        viewApprovedBtn.addEventListener('click', () => {
            window.location.href = '../pages/approvedvg.html';
        });
    }

    // Initial fetch of pending applications
    fetchPendingApplications();
}

// Function to clear search inputs
function clearDInputs() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        if (typeof applySearchAndSort === 'function') {
            applySearchAndSort();
        } else {
            console.warn("applySearchAndSort function not found in scope for clearDInputs.");
        }
    }
}
