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

const volunteersContainer = document.getElementById('volunteersContainer');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const paginationElement = document.getElementById('pagination');
const entriesInfoSpan = document.getElementById('entriesInfo');

const previewModal = document.getElementById('previewModal');
const closeModalBtn = document.getElementById('closeModal');
const modalContentDiv = document.getElementById('modalContent');

// Archived Modal Elements
const viewArchivedButton = document.getElementById('viewArchived');
const archivedModal = document.getElementById('archivedModal');
const closeArchivedModalBtn = document.getElementById('closeArchivedModalBtn');
const archivedTableBody = document.getElementById('archivedTableBody');
const archivedPaginationContainer = document.getElementById('archivedPagination'); 
const archivedEntriesInfo = document.getElementById('archivedEntriesInfo'); 
const exportBtn = document.getElementById('exportBtn');
const savePdfBtn = document.getElementById('savePdfBtn');

let allEndorsedVolunteers = []; 
let filteredVolunteers = []; 		
let paginatedVolunteers = []; 	
let currentPage = 1;
const rowsPerPage = 10; 
let allArchivedVolunteerData = [];
let filteredArchivedVolunteers = [];
let currentArchivedVolunteerPage = 1; 
const archivedVolunteerRowsPerPage = 10; 

let currentUserRole = 'ABVN';
let currentUserId = null;

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

function getFullName(volunteer) {
    return `${volunteer.firstName} ${volunteer.lastName}`;
}

function formatDate(isoString) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch (error) {
        console.error('Error formatting date:', isoString, error);
        return 'Invalid Date';
    }
}

function getSocialMediaLink(socialMediaLink) {
    if (!socialMediaLink || socialMediaLink === 'N/A') return 'N/A';
    try {
        new URL(socialMediaLink);
        return `<a href="${socialMediaLink}" target="_blank" rel="noopener noreferrer">${socialMediaLink}</a>`;
    } catch (e) {
        return socialMediaLink;
    }
}

// Export to Excel
function exportToExcel() {
    if (filteredVolunteers.length === 0) {
        Swal.fire("Info", "No data to export!", "info");
        return;
    }
    const dataForExport = filteredVolunteers.map((volunteer, i) => {
        const endorsementDate = formatDate(volunteer.endorsementDate);
        if (endorsementDate === 'N/A') {
            console.warn(`Missing or invalid endorsementDate for volunteer ${volunteer.key}:`, volunteer.endorsementDate);
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
            "Endorsed To ABVN": volunteer.endorsedToABVNName ? `${volunteer.endorsedToABVNName} (${volunteer.endorsedToABVNLocation})` : 'N/A',
            "Endorsement Date": endorsementDate
        };
    });
    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Endorsed Volunteers");
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const seconds = String(today.getSeconds()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
    const filename = `endorsed-volunteers_${formattedDateTime}.xlsx`;
    XLSX.writeFile(wb, filename);
    Swal.fire({
        title: 'Export Successful!',
        text: `Endorsed volunteer details have been exported to Excel "${filename}".`,
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

// Export All to PDF
function exportToPDF() {
    if (filteredVolunteers.length === 0) {
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
        doc.text("Endorsed Volunteers Report", 14, yOffset);
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
            "Endorsed To ABVN", "Endorsement Date"
        ]];
        const body = filteredVolunteers.map((volunteer, i) => {
            const endorsementDate = formatDate(volunteer.endorsementDate);
            if (endorsementDate === 'N/A') {
                console.warn(`Missing or invalid endorsementDate for volunteer ${volunteer.key}:`, volunteer.endorsementDate);
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
                volunteer.endorsedToABVNName ? `${volunteer.endorsedToABVNName} (${volunteer.endorsedToABVNLocation})` : 'N/A',
                endorsementDate
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
        const filename = `endorsed-volunteers_${formattedDateTime}.pdf`;
        doc.save(filename);
        Swal.close();
        Swal.fire({
            title: 'Export Successful!',
            text: `Endorsed volunteer details have been exported to PDF "${filename}".`,
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

// Export Single to PDF
function saveSingleVolunteerPdf(volunteer) {
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
        doc.text("Endorsed Volunteer Details", 14, 22);
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
                    doc.text("Endorsed Volunteer Details (Continued)", 14, 22);
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
        y = addDetail("Additional Info", volunteer.additionalInfo);
        y = addDetail("Endorsed To ABVN", volunteer.endorsedToABVNName ? `${volunteer.endorsedToABVNName} (${volunteer.endorsedToABVNLocation})` : 'N/A');
        const endorsementDate = formatDate(volunteer.endorsementDate);
        if (endorsementDate === 'N/A') {
            console.warn(`Missing or invalid endorsementDate for volunteer ${volunteer.key}:`, volunteer.endorsementDate);
        }
        y = addDetail("Endorsement Date", endorsementDate);
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
            text: 'Endorsed volunteer details have been exported to PDF.',
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

async function fetchEndorsedVolunteers(userUid, userRole) { 
    if (!userUid) {
        console.warn("No user UID provided. Cannot fetch endorsed volunteers.");
        allEndorsedVolunteers = [];
        renderVolunteersTable();
        return;
    }

    try {
        const tempEndorsedVolunteers = [];

        if (userRole === 'AB ADMIN') { 
            const volunteerGroupsRef = database.ref('volunteerGroups');
            const groupsSnapshot = await volunteerGroupsRef.once('value');
            const groupsData = groupsSnapshot.val();

            if (groupsData) {
                for (const abvnKey in groupsData) {
                    const group = groupsData[abvnKey];
                    const endorsedData = group.endorsedVolunteers;

                    if (endorsedData) {
                        for (const volunteerKey in endorsedData) {
                            const volunteerData = endorsedData[volunteerKey];
                            tempEndorsedVolunteers.push({
                                key: volunteerKey,
                                sourceAbvnKey: abvnKey,
                                ...volunteerData
                            });
                        }
                    }
                }
            }
            allEndorsedVolunteers = tempEndorsedVolunteers;
            applyFiltersAndSort();
        } else { 
            const volunteerGroupsRef = database.ref('volunteerGroups');
            const querySnapshot = await volunteerGroupsRef.orderByChild('userId').equalTo(userUid).once('value');

            let foundAbvnKey = null;
            querySnapshot.forEach(childSnapshot => {
                foundAbvnKey = childSnapshot.key;
                return true;
            });

            if (!foundAbvnKey) {
                Swal.fire({
                    title: 'Access Denied',
                    text: 'Your account is not associated with an ABVN group to view endorsements, or the association is missing. Please contact support.',
                    icon: 'error',
                    showCancelButton: false,
                    confirmButtonText: 'OK'
                });
                allEndorsedVolunteers = []; 
                renderVolunteersTable();
                return;
            }

            const endorsedVolunteersRef = database.ref(`volunteerGroups/${foundAbvnKey}/endorsedVolunteers`);
            const snapshot = await endorsedVolunteersRef.once('value');
            const endorsedData = snapshot.val();

            if (endorsedData) {
                for (const volunteerKey in endorsedData) {
                    const volunteerData = endorsedData[volunteerKey];
                    tempEndorsedVolunteers.push({
                        key: volunteerKey,
                        sourceAbvnKey: foundAbvnKey,
                        ...volunteerData
                    });
                }
            }
            allEndorsedVolunteers = tempEndorsedVolunteers;
            applyFiltersAndSort();
        }
    } catch (error) {
        console.error("Error fetching endorsed volunteers:", error);
        Swal.fire('Error', 'Failed to fetch endorsed volunteers.', 'error');
    }
}

async function archiveVolunteer(volunteer) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to archive this volunteer application. It will be moved to the deleted applications.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, archive it!',
        customClass: {
            confirmButton: 'my-confirm-button-class',
            cancelButton: 'my-cancel-button-class'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            let sourcePath = '';
            let abvnKeyToOperateOn = volunteer.sourceAbvnKey;

            if (!abvnKeyToOperateOn) {
                Swal.fire('Error', 'Cannot archive: Missing ABVN source key for this volunteer. Please refresh the page and try again.', 'error');
                return;
            }

            sourcePath = `volunteerGroups/${abvnKeyToOperateOn}/endorsedVolunteers/${volunteer.key}`;
            const destinationPath = `deletedEndorsedVolunteerApplications/${volunteer.key}`;

            try {
                const volunteerRef = database.ref(sourcePath);
                const deletedRef = database.ref(destinationPath);

                const snapshot = await volunteerRef.once('value');
                const dataToArchive = snapshot.val();

                if (!dataToArchive) {
                    Swal.fire('Not Found', 'Volunteer application not found for archiving.', 'error');
                    return;
                }

                dataToArchive.sourceAbvnKey = abvnKeyToOperateOn; 
                dataToArchive.archivedAt = new Date().toISOString();
                dataToArchive.archivedBy = currentUserId; 
                dataToArchive.archivedByRole = currentUserRole;

                await deletedRef.set(dataToArchive); 
                await volunteerRef.remove(); 

                Swal.fire('Archived!', 'Volunteer application has been archived.', 'success');

                allEndorsedVolunteers = allEndorsedVolunteers.filter(v => v.key !== volunteer.key);
                applyFiltersAndSort();

            } catch (error) {
                console.error("Error archiving volunteer:", error);
                Swal.fire('Error', 'Failed to archive volunteer application. Please try again.', 'error');
            }
        }
    });
}

async function retrieveVolunteer(volunteer) {
    if (currentUserRole !== 'AB ADMIN') {
        Swal.fire('Access Denied', 'Only Super Admins can retrieve archived volunteers.', 'error');
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to retrieve this archived volunteer application. It will be moved back to active applications.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6', 
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, retrieve it!',
        customClass: {
            confirmButton: 'my-confirm-button-class',
            cancelButton: 'my-cancel-button-class'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const sourcePath = `deletedEndorsedVolunteerApplications/${volunteer.key}`;
            const destinationPath = `volunteerGroups/${volunteer.sourceAbvnKey}/endorsedVolunteers/${volunteer.key}`;

            if (!volunteer.sourceAbvnKey) {
                Swal.fire('Error', 'Cannot retrieve: Original ABVN group information is missing.', 'error');
                return;
            }

            try {
                const archivedRef = database.ref(sourcePath);
                const activeRef = database.ref(destinationPath);

                const snapshot = await archivedRef.once('value');
                const dataToRetrieve = snapshot.val();

                if (!dataToRetrieve) {
                    Swal.fire('Not Found', 'Archived volunteer application not found for retrieval.', 'error');
                    return;
                }

                delete dataToRetrieve.archivedAt;
                delete dataToRetrieve.archivedBy;
                delete dataToRetrieve.archivedByRole;

                await activeRef.set(dataToRetrieve); 
                await archivedRef.remove(); 		

                Swal.fire('Retrieved!', 'Volunteer application has been retrieved.', 'success');

                fetchEndorsedVolunteers(currentUserId, currentUserRole);
                fetchArchivedVolunteers();
                archivedModal.style.display = 'none';
            } catch (error) {
                console.error("Error retrieving volunteer:", error);
                Swal.fire('Error', 'Failed to retrieve volunteer application. Please try again.', 'error');
            }
        }
    });
}

function renderVolunteersTable() {
    volunteersContainer.innerHTML = '';

    if (paginatedVolunteers.length === 0) {
        volunteersContainer.innerHTML = '<tr><td colspan="14" style="text-align: center;">No endorsed volunteers found.</td></tr>';
        entriesInfoSpan.textContent = 'Showing 0 to 0 of 0 entries';
        paginationElement.innerHTML = '';
        return;
    }

    const startEntry = (currentPage - 1) * rowsPerPage + 1;
    const endEntry = Math.min(currentPage * rowsPerPage, filteredVolunteers.length);
    entriesInfoSpan.textContent = `Showing ${startEntry} to ${endEntry} of ${filteredVolunteers.length} entries`;

    paginatedVolunteers.forEach((volunteer, index) => {
        const row = volunteersContainer.insertRow();
        const rowNum = startEntry + index;

        row.insertCell().textContent = rowNum;
        row.insertCell().textContent = getFullName(volunteer);
        row.insertCell().textContent = volunteer.email || 'N/A';
        row.insertCell().textContent = volunteer.mobileNumber || 'N/A';
        row.insertCell().textContent = volunteer.age || 'N/A';
        row.insertCell().innerHTML = getSocialMediaLink(volunteer.socialMediaLink);
        row.insertCell().textContent = volunteer.additionalInfo || 'N/A';
        row.insertCell().textContent = volunteer.address?.region || 'N/A';
        row.insertCell().textContent = volunteer.address?.province || 'N/A';
        row.insertCell().textContent = volunteer.address?.city || 'N/A';
        row.insertCell().textContent = volunteer.address?.barangay || 'N/A';
        row.insertCell().textContent = volunteer.endorsedToABVNName ? `${volunteer.endorsedToABVNName} (${volunteer.endorsedToABVNLocation})` : 'N/A';
        row.insertCell().textContent = formatDate(volunteer.endorsementDate);

        const actionsCell = row.insertCell();
        const viewButton = document.createElement('button');
        viewButton.innerHTML = "<i class='bx bx-show-alt'></i>";
        viewButton.classList.add('viewBtn');
        viewButton.onclick = () => showVolunteerDetails(volunteer);
        actionsCell.appendChild(viewButton);

        const saveSinglePdfButton = document.createElement('button');
        saveSinglePdfButton.innerHTML = "<i class='bx bxs-file-pdf'></i>";
        saveSinglePdfButton.classList.add('saveSinglePdfBtn');
        saveSinglePdfButton.onclick = () => saveSingleVolunteerPdf(volunteer);
        actionsCell.appendChild(saveSinglePdfButton);

        const archiveButton = document.createElement('button');
        archiveButton.innerHTML = "<i class='bx bx-x-circle'></i>";
        archiveButton.classList.add('archiveBtn');
        archiveButton.onclick = () => archiveVolunteer(volunteer);
        actionsCell.appendChild(archiveButton);
    });

    renderPagination();
}

function applyFiltersAndSort() {
    let tempVolunteers = [...allEndorsedVolunteers];

    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        tempVolunteers = tempVolunteers.filter(volunteer =>
            getFullName(volunteer).toLowerCase().includes(searchTerm) ||
            (volunteer.email && volunteer.email.toLowerCase().includes(searchTerm)) ||
            (volunteer.mobileNumber && volunteer.mobileNumber.includes(searchTerm)) ||
            (volunteer.address?.region && volunteer.address.region.toLowerCase().includes(searchTerm)) ||
            (volunteer.address?.province && volunteer.address.province.toLowerCase().includes(searchTerm)) ||
            (volunteer.address?.city && volunteer.address.city.toLowerCase().includes(searchTerm)) ||
            (volunteer.address?.barangay && volunteer.address.barangay.toLowerCase().includes(searchTerm)) ||
            (volunteer.endorsedToABVNName && volunteer.endorsedToABVNName.toLowerCase().includes(searchTerm)) ||
            (volunteer.endorsedToABVNLocation && volunteer.endorsedToABVNLocation.toLowerCase().includes(searchTerm)) ||
            (volunteer.socialMediaLink && volunteer.socialMediaLink.toLowerCase().includes(searchTerm))
        );
    }

    const sortValue = sortSelect.value;
    if (sortValue) {
        const [sortBy, sortOrder] = sortValue.split('-');
        tempVolunteers.sort((a, b) => {
            let valA, valB;
            if (sortBy === 'Location') {
                valA = `${a.endorsedToABVNName || ''} ${a.endorsedToABVNLocation || ''}`.toLowerCase();
                valB = `${b.endorsedToABVNName || ''} ${b.endorsedToABVNLocation || ''}`.toLowerCase();
            } else if (sortBy === 'region') {
                valA = (a.address?.region || '').toLowerCase();
                valB = (b.address?.region || '').toLowerCase();
            } else {
                valA = (a[sortBy] || '').toLowerCase();
                valB = (b[sortBy] || '').toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    filteredVolunteers = tempVolunteers;
    currentPage = 1;
    paginateVolunteers();
}

function paginateVolunteers() {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    paginatedVolunteers = filteredVolunteers.slice(startIndex, endIndex);
    renderVolunteersTable();
}

function renderPagination() {
    paginationElement.innerHTML = '';
    const totalPages = Math.ceil(filteredVolunteers.length / rowsPerPage);

    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; paginateVolunteers(); };
    paginationElement.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.classList.toggle('active', i === currentPage);
        pageBtn.onclick = () => { currentPage = i; paginateVolunteers(); };
        paginationElement.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; paginateVolunteers(); };
    paginationElement.appendChild(nextBtn);
}

viewArchivedButton.addEventListener('click', () => {
    if (currentUserRole === 'AB ADMIN') {
        fetchArchivedVolunteers();
        archivedModal.style.display = 'flex';
    } else {
        Swal.fire('Access Denied', 'Only Super Admins can view archived applications.', 'error');
    }
});

closeArchivedModalBtn.addEventListener('click', () => {
    hideArchivedModal();
});

window.addEventListener('click', (event) => {
    if (event.target === archivedModal) {
        hideArchivedModal();
    }
});

async function fetchArchivedVolunteers() {
    if (currentUserRole !== 'AB ADMIN') {
        console.warn("Non-admin user attempted to fetch archived volunteers.");
        allArchivedVolunteerData = [];
        renderArchivedVolunteerApplications();
        return;
    }
    
    try {
        const archivedRef = database.ref('deletedEndorsedVolunteerApplications');
        const snapshot = await archivedRef.once('value');
        const archivedData = snapshot.val();
        
        const tempArchived = [];
        if (archivedData) {
            for (const key in archivedData) {
                tempArchived.push({ key, ...archivedData[key] });
            }
        }
        allArchivedVolunteerData = tempArchived;
        renderArchivedVolunteerApplications();
    } catch (error) {
        console.error("Error fetching archived volunteers:", error);
        Swal.fire('Error', 'Failed to fetch archived volunteers.', 'error');
    }
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
        row.innerHTML = `
            <td>${i++}</td>
            <td>${fullName}</td>
            <td>${volunteer.email || 'N/A'}</td>
            <td>${volunteer.mobileNumber || 'N/A'}</td>
            <td>${volunteer.age || 'N/A'}</td>
            <td>${socialMediaDisplay}</td>
            <td>${volunteer.additionalInfo || 'N/A'}</td>
            <td>${volunteer.address?.region || 'N/A'}</td>
            <td>${volunteer.address?.province || 'N/A'}</td>
            <td>${volunteer.address?.city || 'N/A'}</td>
            <td>${volunteer.address?.barangay || 'N/A'}</td>
            <td>${volunteer.endorsedToABVNName ? `${volunteer.endorsedToABVNName} (${volunteer.endorsedToABVNLocation})` : 'N/A'}</td>
            <td>${formatDate(volunteer.endorsementDate)}</td>
            <td>${formatDate(volunteer.archivedAt)}</td>
            <td>
                <button class="retrieveBtn" data-key="${volunteer.key}">Retrieve</button>
            </td>
        `;
    });

    archivedTableBody.querySelectorAll('.retrieveBtn').forEach(button => {
        button.addEventListener('click', (event) => {
            const key = event.target.dataset.key;
            const volunteerToRetrieve = allArchivedVolunteerData.find(v => v.key === key);
            if (volunteerToRetrieve) {
                retrieveVolunteer(volunteerToRetrieve);
            }
        });
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
    fetchArchivedVolunteers();
}

function hideArchivedModal() {
    archivedModal.style.display = 'none';
    archivedTableBody.innerHTML = '';
    archivedEntriesInfo.textContent = '';
    archivedPaginationContainer.innerHTML = '';
    currentArchivedVolunteerPage = 1;
    allArchivedVolunteerData = [];
}

function showVolunteerDetails(volunteer) {
    let socialMediaHtml = getSocialMediaLink(volunteer.socialMediaLink);

    modalContentDiv.innerHTML = `
        <div class="modal-content-inner" style="padding: 20px;">
            <h2>Volunteer Details:</h2>
            <p><strong>Full Name:</strong> ${getFullName(volunteer)}</p>
            <p><strong>Email:</strong> ${volunteer.email || 'N/A'}</p>
            <p><strong>Mobile Number:</strong> ${volunteer.mobileNumber || 'N/A'}</p>
            <p><strong>Age:</strong> ${volunteer.age || 'N/A'}</p>
            <p><strong>Social Media:</strong><br>${socialMediaHtml}</p>
            <p><strong>Additional Info:</strong> ${volunteer.additionalInfo || 'N/A'}</p>
            <hr>
            <h2>Address Information:</h2>
            <div style="margin-left: 15px;">
                <p><strong>Region:</strong> ${volunteer.address?.region || 'N/A'}</p>
                <p><strong>Province:</strong> ${volunteer.address?.province || 'N/A'}</p>
                <p><strong>City:</strong> ${volunteer.address?.city || 'N/A'}</p>
                <p><strong>Barangay:</strong> ${volunteer.address?.barangay || 'N/A'}</p>
            </div>
            <hr>
            <h2>Endorsement Details:</h2>
            <p><strong>Endorsed To ABVN:</strong> ${volunteer.endorsedToABVNName ? `${volunteer.endorsedToABVNName} (${volunteer.endorsedToABVNLocation})` : 'N/A'}</p>
            <p><strong>Endorsement Date:</strong> ${formatDate(volunteer.endorsementDate)}</p>
        </div>
    `;
    previewModal.style.display = 'flex';
}

closeModalBtn.addEventListener('click', () => {
    previewModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === previewModal) {
        previewModal.style.display = 'none';
    }
});

searchInput.addEventListener('keyup', applyFiltersAndSort);
sortSelect.addEventListener('change', applyFiltersAndSort);
exportBtn.addEventListener('click', exportToExcel);
savePdfBtn.addEventListener('click', exportToPDF);

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const profilePage = 'profile.html'; 

            try {
                const userSnapshot = await database.ref(`users/${user.uid}`).once("value");
                const userDataFromDb = userSnapshot.val();
                const passwordNeedsReset = userDataFromDb ? (userDataFromDb.password_needs_reset || false) : false;
                currentUserId = user.uid;
                currentUserRole = userDataFromDb ? (userDataFromDb.role || 'ABVN') : 'ABVN'; 

                if (currentUserRole === 'AB ADMIN') {
                    viewArchivedButton.style.display = 'block';
                } else {
                    viewArchivedButton.style.display = 'none';
                }

                if (passwordNeedsReset) {
                    console.log(`Password change required for user ${user.uid}. Redirecting to profile page.`);
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
                fetchEndorsedVolunteers(user.uid, currentUserRole);
                resetInactivityTimer();

            } catch (error) {
                console.error("Error checking password reset status or fetching user data:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Authentication Error',
                    text: 'Failed to verify account status. Please try logging in again.',
                }).then(() => {
                    window.location.replace('../pages/login.html');
                });
                return;
            }
        } else {
            Swal.fire({
                title: 'Not Logged In',
                text: 'Please log in to view endorsed volunteers.',
                icon: 'warning',
                showCancelButton: false,
                confirmButtonText: 'Go to Login'
            }).then(() => {
                window.location.replace('../pages/login.html');
            });
            allEndorsedVolunteers = [];
            renderVolunteersTable();
        }
    });
});