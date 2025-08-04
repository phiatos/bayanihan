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
    console.log("Firebase initialized successfully.");
} else {
    console.log("Firebase already initialized.");
}

const database = firebase.database();
const auth = firebase.auth();

// Initialize EmailJS with updated public key
try {
    emailjs.init('BwfsCx-NJCb3qGxCk');
    console.log("EmailJS initialized successfully");
} catch (error) {
    console.error("EmailJS initialization failed:", error);
}

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
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
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

// Attach event listeners to detect user activity
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

document.addEventListener('DOMContentLoaded', () => {
    // Authentication Check
    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access approved volunteer applications.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }
        console.log("User authenticated:", user.uid);
        initializePageFunctions(user.uid);
        resetInactivityTimer();
    });
});

function initializePageFunctions(userId) {
    const volunteersContainer = document.getElementById('volunteersContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const toggleViewBtn = document.getElementById('toggleViewBtn');
    const tableView = document.getElementById('tableView');
    const calendarView = document.getElementById('calendarView');
    const previewModal = document.getElementById('previewModal');
    const closeModal = document.getElementById('closeModal');
    const modalContent = document.getElementById('modalContent');
    const viewPendingBtn = document.getElementById('viewPendingBtn');
    const viewArchivedButton = document.getElementById('viewArchived');
    const archivedModal = document.getElementById('archivedModal');
    const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
    const archivedTableBody = document.getElementById('archivedTableBody');
    const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
    const archivedPaginationContainer = document.getElementById('archivedPagination');
    const exportBtn = document.getElementById('exportBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');

    let allApprovedApplications = [];
    let filteredApprovedApplications = [];
    let currentPage = 1;
    const rowsPerPage = 5;
    let currentView = 'table';
    let calendar;
    let allArchivedVolunteerData = [];
    let currentArchivedVolunteerPage = 1;
    const archivedVolunteerRowsPerPage = 5;

    // Utility Functions
    function formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true
        });
    }

    function formatToDatetimeLocal(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
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

    // Apply modal close listeners
    setupModalClose(previewModal, closeModal);
    setupModalClose(archivedModal, closeArchivedModalBtn);

    function showPreviewModal(volunteer) {
        const fullName = getFullName(volunteer);
        modalContent.innerHTML = `
            <div class="modal-content-inner" style="padding: 20px;">
                <h2>Approved Volunteer Details</h2>

                <p><strong>Scheduled Date/Time:</strong> ${formatDate(volunteer.scheduledDateTime || volunteer.timestamp)}</p>
                <p><strong>Full Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${volunteer.email || 'N/A'}</p>
                <p><strong>Mobile Number:</strong> ${volunteer.mobileNumber || 'N/A'}</p>
                <p><strong>Age:</strong> ${volunteer.age || 'N/A'}</p>
                <p><strong>Social Media:</strong> ${volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank">${volunteer.socialMediaLink}</a>` : 'N/A'}</p>
                <p><strong>Additional Info:</strong> ${volunteer.additionalInfo || 'N/A'}</p>
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
                <p><strong>General Availability:</strong> ${volunteer.availability?.general || 'N/A'}</p>
                <p><strong>Available Days:</strong> ${volunteer.availability?.specificDays ? volunteer.availability.specificDays.join(', ') : 'N/A'}</p>
                <p><strong>Time Availability:</strong> ${volunteer.availability?.timeAvailability || 'N/A'}</p>
            </div>
        `;
        previewModal.style.display = 'flex';
    }

    // Export Functions
    function exportToExcel() {
        if (filteredApprovedApplications.length === 0) {
            Swal.fire("Info", "No data to export!", "info");
            return;
        }
        const dataForExport = filteredApprovedApplications.map((volunteer, i) => {
            const applicationDateTime = formatDate(volunteer.applicationDateandTime);
            if (applicationDateTime === 'N/A') {
                console.warn(`Missing or invalid applicationDateandTime for volunteer ${volunteer.key}:`, volunteer.applicationDateandTime);
            }
            return {
                "No.": i + 1,
                "Full Name": getFullName(volunteer) || 'N/A',
                "Email": volunteer.email || 'N/A',
                "Mobile Number": String(volunteer.mobileNumber || 'N/A'),
                "Age": volunteer.age || 'N/A',
                "Social Media": volunteer.socialMediaLink || 'N/A',
                "Region": volunteer.address?.region || 'N/A',
                "Province": volunteer.address?.province || 'N/A',
                "City": volunteer.address?.city || 'N/A',
                "Barangay": volunteer.address?.barangay || 'N/A',
                "Additional Info": volunteer.additionalInfo || 'N/A',
                "General Availability": volunteer.availability?.general || 'N/A',
                "Available Days": volunteer.availability?.specificDays ? volunteer.availability.specificDays.join(', ') : 'N/A',
                "Time Availability": volunteer.availability?.timeAvailability || 'N/A',
                "Scheduled Date/Time": formatDate(volunteer.scheduledDateTime || volunteer.applicationDateandTime),
                "Application Date/Time": applicationDateTime
            };
        });
        const ws = XLSX.utils.json_to_sheet(dataForExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Approved Volunteer Applications");
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        const seconds = String(today.getSeconds()).padStart(2, '0');
        const formattedDateTime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
        const filename = `approved-volunteer-applications_${formattedDateTime}.xlsx`;
        XLSX.writeFile(wb, filename);
        Swal.fire({
            title: 'Export Successful!',
            text: `Approved volunteer application details have been exported to Excel "${filename}".`,
            icon: 'success',
            timer: 2500,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'swal2-popup-success-clean',
                title: 'swal2-title-success-clean',
                htmlContainer: 'swal2-text-success-clean'
            }
        });
    }

    function exportToPDF() {
        if (filteredApprovedApplications.length === 0) {
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
            doc.text("Approved Volunteer Applications Report", 14, yOffset);
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
                "General Availability", "Available Days", "Time Availability",
                "Scheduled Date/Time", "Application Date/Time"
            ]];
            const body = filteredApprovedApplications.map((volunteer, i) => {
                const applicationDateTime = formatDate(volunteer.applicationDateandTime);
                if (applicationDateTime === 'N/A') {
                    console.warn(`Missing or invalid applicationDateandTime for volunteer ${volunteer.key}:`, volunteer.applicationDateandTime);
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
                    volunteer.additionalInfo || 'N/A',
                    volunteer.availability?.general || 'N/A',
                    volunteer.availability?.specificDays ? volunteer.availability.specificDays.join(', ') : 'N/A',
                    volunteer.availability?.timeAvailability || 'N/A',
                    formatDate(volunteer.scheduledDateTime || volunteer.applicationDateandTime),
                    applicationDateTime
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
            const filename = `approved-volunteer-applications_${formattedDateTime}.pdf`;
            doc.save(filename);
            Swal.close();
            Swal.fire({
                title: 'Export Successful!',
                text: `Approved volunteer application details have been exported to PDF "${filename}".`,
                icon: 'success',
                timer: 2500,
                showConfirmButton: false,
                timerProgressBar: true,
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean'
                }
            });
        };
        logo.onerror = function() {
            Swal.close();
            Swal.fire("Error", "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'", "error");
        };
    }

    function saveSingleApplicationPdf(volunteer) {
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
            doc.text("Approved Volunteer Application Details", 14, 22);
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
                        doc.text("Approved Volunteer Application Details (Continued)", 14, 22);
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
            y = addDetail("Additional Info", volunteer.additionalInfo);
            y = addDetail("General Availability", volunteer.availability?.general);
            y = addDetail("Available Days", volunteer.availability?.specificDays ? volunteer.availability.specificDays.join(', ') : 'N/A');
            y = addDetail("Time Availability", volunteer.availability?.timeAvailability);
            y = addDetail("Scheduled Date/Time", formatDate(volunteer.scheduledDateTime || volunteer.applicationDateandTime));
            const applicationDateTime = formatDate(volunteer.applicationDateandTime);
            if (applicationDateTime === 'N/A') {
                console.warn(`Missing or invalid applicationDateandTime for volunteer ${volunteer.key}:`, volunteer.applicationDateandTime);
            }
            y = addDetail("Application Date/Time", applicationDateTime);
            doc.setFontSize(8);
            const footerY = doc.internal.pageSize.height - 10;
            const pageNumberText = `Page ${doc.internal.getNumberOfPages()} of ${doc.internal.getNumberOfPages()}`;
            const poweredByText = "Powered by: Appvance";
            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
            const sanitizedFullName = getFullName(volunteer).replace(/[^a-zA-Z0-9-_]/g, '_') || 'unknown';
            doc.save(`approved_volunteer_${sanitizedFullName}_${new Date().toISOString().slice(0, 10)}.pdf`);
            Swal.fire({
                title: 'Export Successful!',
                text: 'Approved volunteer application details have been exported to PDF.',
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
        };
        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'", "error");
        };
    }

    // Data Fetching Function (Approved Volunteers)
    function fetchApprovedVolunteers() {
        const colCount = document.getElementById('volunteersTable').querySelectorAll('thead tr th').length;
        volunteersContainer.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">Loading approved volunteer applications...</td></tr>`;

        database.ref('volunteerApplications/approvedVolunteer').on('value', (snapshot) => {
            allApprovedApplications = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const volunteerData = childSnapshot.val();
                    const volunteerKey = childSnapshot.key;
                    allApprovedApplications.push({ key: volunteerKey, ...volunteerData });
                });
                console.log("Fetched approved volunteers:", allApprovedApplications);
            } else {
                console.log("No approved volunteer applications found.");
            }
            applySearchAndSort();
        }, (error) => {
            console.error("Error fetching approved volunteers: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load approved volunteer applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            volunteersContainer.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; color: red;">Failed to load data.</td></tr>`;
        });
    }

    // Archived Volunteer Applications Functions
    function fetchAndRenderArchivedVolunteerApplications() {
        const colCount = archivedTableBody.parentElement.querySelectorAll('thead tr th').length;
        archivedTableBody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">Loading archived volunteer applications...</td></tr>`;

        database.ref('deletedApprovedVolunteerApplications').once('value', (snapshot) => {
            allArchivedVolunteerData = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const volunteerData = childSnapshot.val();
                    const volunteerKey = childSnapshot.key;
                    allArchivedVolunteerData.push({ key: volunteerKey, ...volunteerData });
                });
                console.log("Fetched archived approved volunteers:", allArchivedVolunteerData);
            } else {
                console.log("No archived approved volunteer applications found.");
            }
            renderArchivedVolunteerApplications();
        }, (error) => {
            console.error("Error fetching archived approved volunteers: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load archived volunteer applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            archivedTableBody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; color: red;">Failed to load data.</td></tr>`;
        });
    }

    function renderArchivedVolunteerApplications() {
        const colCount = archivedTableBody.parentElement.querySelectorAll('thead tr th').length;
        archivedTableBody.innerHTML = '';

        const startIndex = (currentArchivedVolunteerPage - 1) * archivedVolunteerRowsPerPage;
        const endIndex = startIndex + archivedVolunteerRowsPerPage;
        const paginatedApplications = allArchivedVolunteerData.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            archivedTableBody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">No archived volunteer applications found.</td></tr>`;
            archivedEntriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            renderArchivedPagination();
            return;
        }

        let i = startIndex + 1;

        paginatedApplications.forEach(volunteer => {
            const row = archivedTableBody.insertRow();
            row.setAttribute('data-key', volunteer.key);
            const fullName = getFullName(volunteer);
            const socialMediaDisplay = volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank" rel="noopener noreferrer">Link</a>` : 'N/A';
            const scheduledDateTimeDisplay = volunteer.scheduledDateTime ? formatDate(volunteer.scheduledDateTime) : 'N/A';
            row.innerHTML = `
                <td>${i++}</td>
                <td>${fullName}</td>
                <td>${volunteer.email || 'N/A'}</td>
                <td>${volunteer.mobileNumber || 'N/A'}</td>
                <td>${volunteer.age || 'N/A'}</td>
                <td>${socialMediaDisplay}</td>
                <td>${volunteer.additionalInfo || 'N/A'}</td>
                <td>${
                    volunteer.availability && volunteer.availability.general === 'Specific days'
                    ? `Specific Days: ${volunteer.availability.specificDays ? volunteer.availability.specificDays.join(', ') : 'N/A'}`
                    : (volunteer.availability?.general || 'N/A')
                }</td>
                <td>${volunteer.availability?.timeAvailability || 'N/A'}</td>
                <td>${volunteer.address?.region || 'N/A'}</td>
                <td>${volunteer.address?.province || 'N/A'}</td>
                <td>${volunteer.address?.city || 'N/A'}</td>
                <td>${volunteer.address?.barangay || 'N/A'}</td>
                <td>${scheduledDateTimeDisplay}</td>
                <td>${formatDate(volunteer.archivedAt)}</td>
                <td>
                    <button class="actionBtn" data-key="${volunteer.key}">Retrieve</button>
                </td>
            `;
        });

        updateArchivedEntriesInfo();
        renderArchivedPagination();
    }

    function updateArchivedEntriesInfo() {
        const startIndex = (currentArchivedVolunteerPage - 1) * archivedVolunteerRowsPerPage;
        const endIndex = Math.min(startIndex + archivedVolunteerRowsPerPage, allArchivedVolunteerData.length);
        archivedEntriesInfo.textContent = `Showing ${allArchivedVolunteerData.length ? startIndex + 1 : 0} to ${endIndex} of ${allArchivedVolunteerData.length} entries`;
    }

    function renderArchivedPagination() {
        archivedPaginationContainer.innerHTML = '';
        const totalPages = Math.ceil(allArchivedVolunteerData.length / archivedVolunteerRowsPerPage);

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
                currentArchivedVolunteerPage = page;
                renderArchivedVolunteerApplications();
            });
            return btn;
        };

        archivedPaginationContainer.appendChild(createButton('Prev', currentArchivedVolunteerPage - 1, currentArchivedVolunteerPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentArchivedVolunteerPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            archivedPaginationContainer.appendChild(createButton('1', 1));
            if (startPage > 2) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                archivedPaginationContainer.appendChild(dots);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            archivedPaginationContainer.appendChild(createButton(i, i, false, i === currentArchivedVolunteerPage));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dots = document.createElement('span');
                dots.textContent = '...';
                archivedPaginationContainer.appendChild(dots);
            }
            archivedPaginationContainer.appendChild(createButton(totalPages, totalPages));
        }

        archivedPaginationContainer.appendChild(createButton('Next', currentArchivedVolunteerPage + 1, currentArchivedVolunteerPage === totalPages));
    }

    function showArchivedModal() {
        archivedModal.style.display = 'flex';
        fetchAndRenderArchivedVolunteerApplications();
    }

    function hideArchivedModal() {
        archivedModal.style.display = 'none';
        archivedTableBody.innerHTML = '';
        archivedEntriesInfo.textContent = '';
        archivedPaginationContainer.innerHTML = '';
    }

    // View Rendering Logic
    function renderCurrentView() {
        if (currentView === 'table') {
            tableView.style.display = 'block';
            calendarView.style.display = 'none';
            toggleViewBtn.innerHTML = "<i class='bx bx-calendar'></i> Calendar View";
            renderApplications(filteredApprovedApplications);
            searchInput.style.display = 'block';
            sortSelect.style.display = 'block';
        } else {
            tableView.style.display = 'none';
            calendarView.style.display = 'block';
            toggleViewBtn.innerHTML = "<i class='bx bx-list-ul'></i> Switch to Table View";
            renderVolunteerCalendar();
            searchInput.style.display = 'none';
            sortSelect.style.display = 'none';
        }
    }

    // Table Rendering Function
    function renderApplications(applicationsToRender) {
        const colCount = document.getElementById('volunteersTable').querySelectorAll('thead tr th').length;
        volunteersContainer.innerHTML = '';

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);

        if (paginatedApplications.length === 0) {
            volunteersContainer.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">No approved volunteer applications found on this page.</td></tr>`;
            entriesInfo.textContent = 'Showing 0 to 0 of 0 entries';
            renderPagination();
            return;
        }

        let i = startIndex + 1;

        paginatedApplications.forEach(volunteer => {
            const row = volunteersContainer.insertRow();
            row.setAttribute('data-key', volunteer.key);

            const fullName = getFullName(volunteer);
            const socialMediaDisplay = volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank" rel="noopener noreferrer">Link</a>` : 'N/A';
            const scheduledDateTimeDisplay = volunteer.scheduledDateTime ? formatDate(volunteer.scheduledDateTime) : 'N/A';

            row.innerHTML = `
                <td>${i++}</td>
                <td>${fullName}</td>
                <td>${volunteer.email || 'N/A'}</td>
                <td>${volunteer.mobileNumber || 'N/A'}</td>
                <td>${volunteer.age || 'N/A'}</td>
                <td>${socialMediaDisplay}</td>
                <td>${volunteer.additionalInfo || 'N/A'}</td>
                <td>${
                    volunteer.availability && volunteer.availability.general === 'Specific days'
                    ? `Specific Days: ${volunteer.availability.specificDays ? volunteer.availability.specificDays.join(', ') : 'N/A'}`
                    : (volunteer.availability?.general || 'N/A')
                }</td>
                <td>${volunteer.availability?.timeAvailability || 'N/A'}</td>
                <td>${volunteer.address?.region || 'N/A'}</td>
                <td>${volunteer.address?.province || 'N/A'}</td>
                <td>${volunteer.address?.city || 'N/A'}</td>
                <td>${volunteer.address?.barangay || 'N/A'}</td>
                <td>${scheduledDateTimeDisplay}</td>
                <td>
                    <button class="viewBtn" data-key="${volunteer.key}"><i class='bx bx-show-alt'></i></button>
                    <button class="rescheduleBtn" data-key="${volunteer.key}"><i class='bx bx-calendar-edit'></i></button>
                    <button class="archiveBtn" data-key="${volunteer.key}"><i class="bx bx-x-circle"></i></button>
                    <button class="saveSinglePdfBtn" data-key="${volunteer.key}"><i class='bx bxs-file-pdf'></i></button>
                </td>
            `;
        });

        updateEntriesInfo(applicationsToRender.length);
        renderPagination(applicationsToRender.length);
    }

    // Search and Sort Logic
    function applySearchAndSort() {
        let currentApplications = [...allApprovedApplications];

        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            currentApplications = currentApplications.filter(volunteer => {
                const fullName = getFullName(volunteer).toLowerCase();
                const email = (volunteer.email || '').toLowerCase();
                const mobileNumber = (volunteer.mobileNumber || '').toLowerCase();
                const region = (volunteer.address?.region || '').toLowerCase();
                const province = (volunteer.address?.province || '').toLowerCase();
                const city = (volunteer.address?.city || '').toLowerCase();
                const barangay = (volunteer.address?.barangay || '').toLowerCase();
                const additionalInfo = (volunteer.additionalInfo || '').toLowerCase();
                const generalAvailability = (volunteer.availability?.general || '').toLowerCase();
                const specificDays = (volunteer.availability?.specificDays ? volunteer.availability.specificDays.join(', ') : '').toLowerCase();
                const timeAvailability = (volunteer.availability?.timeAvailability || '').toLowerCase();
                const scheduledDateTime = (volunteer.scheduledDateTime ? formatDate(volunteer.scheduledDateTime) : '').toLowerCase();

                return fullName.includes(searchTerm) ||
                    email.includes(searchTerm) ||
                    mobileNumber.includes(searchTerm) ||
                    region.includes(searchTerm) ||
                    province.includes(searchTerm) ||
                    city.includes(searchTerm) ||
                    barangay.includes(searchTerm) ||
                    additionalInfo.includes(searchTerm) ||
                    generalAvailability.includes(searchTerm) ||
                    specificDays.includes(searchTerm) ||
                    timeAvailability.includes(searchTerm) ||
                    scheduledDateTime.includes(searchTerm);
            });
        }

        const sortValue = sortSelect.value;
        if (sortValue) {
            const [sortBy, order] = sortValue.split('-');
            currentApplications.sort((a, b) => {
                let valA, valB;

                switch (sortBy) {
                    case 'DateTime':
                        valA = new Date(a.scheduledDateTime || a.timestamp || 0).getTime();
                        valB = new Date(b.scheduledDateTime || b.timestamp || 0).getTime();
                        break;
                    case 'Location':
                        valA = `${a.address?.region || ''} ${a.address?.province || ''} ${a.address?.city || ''} ${a.address?.barangay || ''}`.toLowerCase();
                        valB = `${b.address?.region || ''} ${b.address?.province || ''} ${b.address?.city || ''} ${b.address?.barangay || ''}`.toLowerCase();
                        break;
                    case 'Name':
                        valA = getFullName(a).toLowerCase();
                        valB = getFullName(b).toLowerCase();
                        break;
                    case 'Age':
                        valA = parseInt(a.age) || 0;
                        valB = parseInt(b.age) || 0;
                        break;
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

        filteredApprovedApplications = currentApplications;
        currentPage = 1;
        renderCurrentView();
    }

    // Pagination Functions
    function renderPagination() {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(filteredApprovedApplications.length / rowsPerPage);

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
                renderApplications(filteredApprovedApplications);
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

    // FullCalendar Initialization and Rendering
    function renderVolunteerCalendar() {
        if (!window.FullCalendar) {
            console.error("FullCalendar library is not loaded.");
            Swal.fire('Error', 'Calendar functionality is unavailable. Please ensure FullCalendar library is included.', 'error');
            return;
        }

        const calendarEl = document.getElementById('volunteerCalendar');
        if (calendar) {
            calendar.destroy();
        }

        const events = filteredApprovedApplications
            .filter(v => v.scheduledDateTime)
            .map(volunteer => {
                const scheduledDate = new Date(volunteer.scheduledDateTime);
                let startTime = '09:00:00';
                let endTime = '17:00:00';

                if (volunteer.availability?.timeAvailability) {
                    const timeParts = volunteer.availability.timeAvailability.split(' - ');
                    if (timeParts.length === 2) {
                        startTime = formatTimeTo24Hr(timeParts[0]);
                        endTime = formatTimeTo24Hr(timeParts[1]);
                    }
                }

                const startISO = `${scheduledDate.getFullYear()}-${(scheduledDate.getMonth() + 1).toString().padStart(2, '0')}-${scheduledDate.getDate().toString().padStart(2, '0')}T${startTime}`;
                const endISO = `${scheduledDate.getFullYear()}-${(scheduledDate.getMonth() + 1).toString().padStart(2, '0')}-${scheduledDate.getDate().toString().padStart(2, '0')}T${endTime}`;

                return {
                    title: getFullName(volunteer),
                    start: startISO,
                    end: endISO,
                    id: volunteer.key,
                    extendedProps: volunteer
                };
            });

        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: events,
            eventClick: function(info) {
                showPreviewModal(info.event.extendedProps);
            },
            noEventsContent: {
                html: '<p style="text-align: center; color: #777;">No approved volunteer schedules for this period.</p>'
            }
        });
        calendar.render();
    }

    function formatTimeTo24Hr(timeStr) {
        if (!timeStr) return "00:00:00";
        let [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours);
        if (period && period.toLowerCase() === 'pm' && hours < 12) {
            hours += 12;
        } else if (period && period.toLowerCase() === 'am' && hours === 12) {
            hours = 0;
        }
        return `${String(hours).padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
    }

    // Email Sending Function
    async function sendApprovalEmail(volunteer, scheduledDate) {
        if (!volunteer || !volunteer.email) {
            console.error("Cannot send email: Volunteer or email missing.");
            Swal.fire('Error', 'Missing volunteer email. Cannot send confirmation.', 'error');
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
            console.log('Email successfully sent!', response.status, response.text);
            Swal.fire('Email Sent!', 'Confirmation email has been sent to the volunteer.', 'success');
        } catch (error) {
            console.error('Failed to send email:', error);
            let errorMessage = 'Failed to send confirmation email. Please try again.';
            if (error.status === 422) {
                errorMessage = 'Failed to send email. Please check EmailJS template parameters and IDs. (Error 422)';
            } else if (error.text) {
                errorMessage = `Failed to send email: ${error.text}. Please check EmailJS setup.`;
            }
            Swal.fire('Email Error', errorMessage, 'error');
        }
    }

    // Archived Action Handlers
    archivedTableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const rowWithKey = target.closest('tr[data-key]');

        if (!rowWithKey) return;

        const volunteerKey = rowWithKey.dataset.key;
        const volunteer = allArchivedVolunteerData.find(v => v.key === volunteerKey);

        if (!volunteer) {
            console.warn("Archived volunteer data not found for key:", volunteerKey);
            Swal.fire('Error', 'Archived volunteer data not found.', 'error');
            return;
        }

        if (target.classList.contains('viewBtn') || target.closest('.viewBtn')) {
            showPreviewModal(volunteer);
        } else if (target.classList.contains('actionBtn') || target.closest('.actionBtn')) {
            Swal.fire({
                title: 'Retrieve Volunteer Application?',
                text: `Do you want to retrieve the application for ${getFullName(volunteer)}? This will move it back to approved applications.`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, Retrieve!',
                cancelButtonText: 'Cancel'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const archivedRef = database.ref(`deletedApprovedVolunteerApplications/${volunteerKey}`);
                        const snapshot = await archivedRef.once('value');
                        const volunteerData = snapshot.val();

                        if (volunteerData) {
                            delete volunteerData.archivedAt;
                            volunteerData.status = 'confirmedByAB';
                            await database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`).set(volunteerData);
                            await archivedRef.remove();
                            Swal.fire('Retrieved!', 'The volunteer application has been moved back to approved.', 'success');
                            fetchAndRenderArchivedVolunteerApplications();
                            fetchApprovedVolunteers();
                        } else {
                            Swal.fire('Error', 'Volunteer application not found.', 'error');
                        }
                    } catch (error) {
                        console.error("Error retrieving volunteer application: ", error);
                        Swal.fire('Error', 'Failed to retrieve volunteer application. Please try again.', 'error');
                    }
                }
            });
        }
    });

    function handleViewClick(button) {
        const volunteerKey = button.dataset.key;
        const volunteer = allApprovedApplications.find(v => v.key === volunteerKey);
        if (volunteer) {
            showPreviewModal(volunteer);
        } else {
            console.warn("Volunteer data not found for key:", volunteerKey);
            Swal.fire('Error', 'Volunteer data not found.', 'error');
        }
    }

    async function handleRescheduleClick(button) {
        const volunteerKey = button.dataset.key;
        const volunteer = allApprovedApplications.find(v => v.key === volunteerKey);

        if (!volunteer) {
            console.warn("Volunteer data not found for rescheduling:", volunteerKey);
            Swal.fire('Error', 'Volunteer data not found for rescheduling.', 'error');
            return;
        }

        const currentScheduledDateTime = volunteer.scheduledDateTime ? formatToDatetimeLocal(volunteer.scheduledDateTime) : '';

        Swal.fire({
            title: `Reschedule ${getFullName(volunteer)}`,
            html: `
                <label for="swal-input-datetime" style="display:block; margin-bottom: 5px; font-weight: bold;">New Scheduled Date & Time:</label>
                <input type="datetime-local" id="swal-input-datetime" class="swal2-input" value="${currentScheduledDateTime}">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Save Reschedule',
            cancelButtonText: 'Cancel',
            customClass: {
                confirmButton: 'swal2-confirm-large',
                cancelButton: 'swal2-cancel-large'
            },
            preConfirm: () => {
                const newDateTimeString = document.getElementById('swal-input-datetime').value;
                if (!newDateTimeString) {
                    Swal.showValidationMessage('Please select a date and time.');
                    return false;
                }

                // Validate input format
                const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
                if (!datetimeRegex.test(newDateTimeString)) {
                    Swal.showValidationMessage('Invalid date and time format. Please use the datetime picker.');
                    return false;
                }

                const newTimestamp = new Date(newDateTimeString).getTime();
                if (isNaN(newTimestamp)) {
                    Swal.showValidationMessage('Invalid date and time format.');
                    return false;
                }

                const currentDateTime = Date.now();
                // Prevent past date/time and current time
                if (newTimestamp <= currentDateTime) {
                    Swal.showValidationMessage('Scheduled date and time cannot be in the past or the current time.');
                    return false;
                }

                // Prevent scheduling the same time as the original
                if (volunteer.scheduledDateTime && newTimestamp === volunteer.scheduledDateTime) {
                    Swal.showValidationMessage('The new schedule is the same as the current schedule.');
                    return false;
                }

                // Minimum future time buffer
                const MINIMUM_FUTURE_TIME = 60 * 60 * 1000; // 1 hour
                if (newTimestamp < currentDateTime + MINIMUM_FUTURE_TIME) {
                    Swal.showValidationMessage('Scheduled date and time must be at least 1 hour in the future.');
                    return false;
                }

                // Maximum scheduling window
                const MAXIMUM_FUTURE_TIME = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months
                if (newTimestamp > currentDateTime + MAXIMUM_FUTURE_TIME) {
                    Swal.showValidationMessage('Scheduled date and time cannot be more than 6 months in the future.');
                    return false;
                }

                // Prevent same as original schedule
                if (volunteer.scheduledDateTime && newTimestamp === volunteer.scheduledDateTime) {
                    Swal.showValidationMessage('The new schedule is the same as the current schedule.');
                    return false;
                }

                // Check volunteer availability
                const newDate = new Date(newDateTimeString);
                const dayOfWeek = newDate.toLocaleString('en-US', { weekday: 'long' });
                if (volunteer.availability?.specificDays && !volunteer.availability.specificDays.includes(dayOfWeek)) {
                    Swal.showValidationMessage(`The selected day (${dayOfWeek}) is not in the volunteer's availability.`);
                    return false;
                }
                if (volunteer.availability?.timeAvailability) {
                    const timeParts = volunteer.availability.timeAvailability.split(' - ');
                    if (timeParts.length === 2) {
                        const startTime = formatTimeTo24Hr(timeParts[0]);
                        const endTime = formatTimeTo24Hr(timeParts[1]);
                        const selectedTime = `${newDate.getHours().toString().padStart(2, '0')}:${newDate.getMinutes().toString().padStart(2, '0')}:00`;
                        if (selectedTime < startTime || selectedTime > endTime) {
                            Swal.showValidationMessage(`The selected time is outside the volunteer's availability (${timeParts[0]} - ${timeParts[1]}).`);
                            return false;
                        }
                    }
                }

                // Check for duplicate schedule conflicts
                const conflictingVolunteer = allApprovedApplications.find(v => 
                    v.key !== volunteerKey && v.scheduledDateTime === newTimestamp
                );
                if (conflictingVolunteer) {
                    Swal.showValidationMessage(`Another volunteer (${getFullName(conflictingVolunteer)}) is already scheduled at this time.`);
                    return false;
                }

                return newTimestamp;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const newTimestamp = result.value;
                try {
                    const volunteerRef = database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`);
                    await volunteerRef.update({ scheduledDateTime: newTimestamp });
                    await sendApprovalEmail(volunteer, formatDate(newTimestamp));
                    Swal.fire(
                        'Rescheduled!',
                        `${getFullName(volunteer)}'s schedule has been updated to ${formatDate(newTimestamp)}.`,
                        'success'
                    );
                } catch (error) {
                    console.error("Error rescheduling volunteer or sending email: ", error);
                    let errorMessage = `Failed to reschedule volunteer: ${error.message}`;
                    if (error.status === 422) {
                        errorMessage = 'Failed to send reschedule email. Please check EmailJS template parameters and IDs. (Error 422)';
                    } else if (error.text) {
                        errorMessage = `Failed to send reschedule email: ${error.text}. Please check EmailJS setup.`;
                    }
                    Swal.fire('Error', errorMessage, 'error');
                }
            }
        });
    }

    async function handleArchiveClick(button) {
        const volunteerKey = button.dataset.key;
        const volunteer = allApprovedApplications.find(v => v.key === volunteerKey);

        if (!volunteer) {
            console.warn("Volunteer data not found for archiving:", volunteerKey);
            Swal.fire('Error', 'Volunteer data not found for archiving.', 'error');
            return;
        }

        Swal.fire({
            title: 'Are you sure to archive this application?',
            text: "This will move it to archived records.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Reject',
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
                    const approvedVolunteerRef = database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`);
                    const snapshot = await approvedVolunteerRef.once('value');
                    const volunteerToArchive = snapshot.val();

                    if (!volunteerToArchive) {
                        Swal.fire('Error', 'Volunteer data not found in approved applications.', 'error');
                        return;
                    }

                    volunteerToArchive.archivedAt = firebase.database.ServerValue.TIMESTAMP;
                    await database.ref(`deletedApprovedVolunteerApplications/${volunteerKey}`).set(volunteerToArchive);
                    await approvedVolunteerRef.remove();
                    Swal.fire({
                        title: 'Archived!',
                        text: `${getFullName(volunteer)}'s application has been archived.`,
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
                    fetchApprovedVolunteers();
                } catch (error) {
                    console.error("Error archiving volunteer application: ", error);
                    Swal.fire(
                        'Error',
                        `Failed to archive application: ${error.message}`,
                        'error'
                    );
                }
            }
        });
    }

    // Event Listeners
    viewPendingBtn.innerHTML = "<i class='bx bx-show'></i> View Pending Volunteer Applications";
    viewPendingBtn.addEventListener('click', () => {
        window.location.href = '../pages/pendingvolunteers.html';
    });

    if (viewArchivedButton) {
        viewArchivedButton.addEventListener('click', () => {
            showArchivedModal();
        });
    } else {
        console.warn("View Archived button not found in the DOM.");
    }

    searchInput.addEventListener('keyup', applySearchAndSort);
    sortSelect.addEventListener('change', applySearchAndSort);

    toggleViewBtn.addEventListener('click', () => {
        currentView = currentView === 'table' ? 'calendar' : 'table';
        applySearchAndSort();
    });

    // Add event listeners for export buttons
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    } else {
        console.warn("Export Excel button (exportBtn) not found in the DOM.");
    }

    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', exportToPDF);
    } else {
        console.warn("Export PDF button (savePdfBtn) not found in the DOM.");
    }

    // Add event listeners for approved table buttons
    volunteersContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const viewButton = target.closest('.viewBtn');
        const rescheduleButton = target.closest('.rescheduleBtn');
        const archiveButton = target.closest('.archiveBtn');

         if (viewButton) {
            handleViewClick(viewButton);
        } else if (rescheduleButton) {
            handleRescheduleClick(rescheduleButton);
        } else if (archiveButton) {
            handleArchiveClick(archiveButton);
        } else if (saveSinglePdfBtn) {
            const volunteerKey = saveSinglePdfBtn.dataset.key;
            const volunteer = allApprovedApplications.find(v => v.key === volunteerKey);
            if (volunteer) {
                saveSingleApplicationPdf(volunteer);
            } else {
                console.warn("Volunteer data not found for PDF export:", volunteerKey);
                Swal.fire('Error', 'Volunteer data not found for PDF export.', 'error');
            }
        }
    });

    fetchApprovedVolunteers();
}