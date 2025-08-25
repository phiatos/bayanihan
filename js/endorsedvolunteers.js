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
const viewApprovedBtn = document.getElementById('viewApprovedBtn');

// Modals
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
let permissions = { canView: false, canArchive: false, canRetrieve: false };

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

viewApprovedBtn.addEventListener('click', () => {
    window.location.href = '../pages/approvedvolunteers.html';
});

// Permission check function
// async function checkAdminPermissions() {
//     const user = auth.currentUser;
//     if (!user) {
//         Swal.fire('Error', 'User not authenticated.', 'error');
//         return { canView: false, canArchive: false, canRetrieve: false };
//     }
//     const snapshot = await database.ref(`users/${user.uid}`).once('value');
//     const userData = snapshot.val();
//     const adminPosition = userData?.adminPosition || '';
//     return {
//         canView: ['Super Admin', 'position-one', 'position-two'].includes(adminPosition),
//         canArchive: ['Super Admin', 'position-one'].includes(adminPosition),
//         canRetrieve: ['Super Admin', 'position-one'].includes(adminPosition)
//     };
// }
async function checkAdminPermissions() {
    const user = auth.currentUser;
    if (!user) {
        Swal.fire('Error', 'User not authenticated.', 'error');
        return { canView: false, canArchive: false, canRetrieve: false };
    }
    const snapshot = await database.ref(`users/${user.uid}`).once('value');
    const userData = snapshot.val();
    const adminPosition = userData?.adminPosition || '';
    const role = userData?.role || '';
    return {
        canView: ['Super Admin', 'position-one', 'position-two'].includes(adminPosition) || role === 'ABVN',
        canArchive: ['Super Admin', 'position-one'].includes(adminPosition),
        canRetrieve: ['Super Admin', 'position-one'].includes(adminPosition)
    };
}

// Password verification function
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
        preConfirm: async (password) => {
            try {
                const user = auth.currentUser;
                const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
                await auth.signInWithCredential(credential);
                return true;
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Verification Failed',
                    text: 'Invalid admin password.',
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
        },
        allowOutsideClick: () => !Swal.isLoading(),
        customClass: {
            popup: 'custom-swal-popup',
            title: 'custom-swal-title',
            input: 'custom-swal-input',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn'
        }
    });
    if (!password) {
        return false;
    }
    return password; 
}

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
        const dateTimeAvailability = volunteer.availability?.specificDateTimeSlots && Array.isArray(volunteer.availability.specificDateTimeSlots)
            ? volunteer.availability.specificDateTimeSlots
                .map((slot) => `${slot.date || 'N/A'} at ${slot.time || 'N/A'}`)
                .join("; ")
            : "N/A";
        const skillsList = Array.isArray(volunteer.skills)
            ? volunteer.skills.join("; ")
            : "None";
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
            "Emergency Response": volunteer.emergencyResponse ? "Yes (24/7)" : "No",
            "Date and Time Availability": dateTimeAvailability,
            "Skills": skillsList,
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

// Export PDF All
function exportToPDF() {
    if (filteredVolunteers.length === 0) {
        Swal.fire("Info", "No data to export to PDF!", "info");
        return;
    }
    Swal.fire({
        title: 'Generating PDF',
        text: 'Please wait while your PDF is being generated...',
        allowOutsideClick: false,
        customClass: {
            popup: 'swal2-popup-success-clean',
            title: 'swal2-title-success-clean',
            htmlContainer: 'swal2-text-success-clean',
        },
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
            "Emergency Response", "Date and Time Availability", "Skills", "Endorsed To ABVN", "Endorsement Date"
        ]];
        const body = filteredVolunteers.map((volunteer, i) => {
            const endorsementDate = formatDate(volunteer.endorsementDate);
            if (endorsementDate === 'N/A') {
                console.warn(`Missing or invalid endorsementDate for volunteer ${volunteer.key}:`, volunteer.endorsementDate);
            }
            const dateTimeAvailability = volunteer.availability?.specificDateTimeSlots && Array.isArray(volunteer.availability.specificDateTimeSlots)
                ? volunteer.availability.specificDateTimeSlots
                    .map((slot) => `${slot.date || 'N/A'} at ${slot.time || 'N/A'}`)
                    .join("; ")
                : "N/A";
            const skillsList = Array.isArray(volunteer.skills)
                ? volunteer.skills.join("; ")
                : "None";
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
                volunteer.emergencyResponse ? "Yes (24/7)" : "No",
                dateTimeAvailability,
                skillsList,
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
                cellPadding: 2,
                overflow: 'linebreak' // Ensure text wraps within cells
            },
            columnStyles: {
                0: { cellWidth: 10 },  // No. 
                1: { cellWidth: 20 },  // Full Name
                2: { cellWidth: 20 },  // Email
                3: { cellWidth: 20 },  // Mobile Number 
                4: { cellWidth: 10 },  // Age 
                5: { cellWidth: 20 },  // Social Media 
                6: { cellWidth: 15 },  // Region 
                7: { cellWidth: 15 },  // Province 
                8: { cellWidth: 15 },  // City 
                9: { cellWidth: 15 },  // Barangay 
                10: { cellWidth: 15 }, // Additional Info 
                11: { cellWidth: 10 }, // Emergency Response 
                12: { cellWidth: 20 }, // Date and Time Availability 
                13: { cellWidth: 25 }, // Skills 
                14: { cellWidth: 25 }, // Endorsed To ABVN 
                15: { cellWidth: 20 }  // Endorsement Date
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
        Swal.fire("Error", "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'", "error");
    };
}

// Export PDF Single
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
        y = addDetail("Additional Info", volunteer.additionalInfo);
        y = addDetail("Emergency Response", volunteer.emergencyResponse ? "Yes (24/7)" : "No");
        const dateTimeAvailability = volunteer.availability?.specificDateTimeSlots && Array.isArray(volunteer.availability.specificDateTimeSlots)
            ? volunteer.availability.specificDateTimeSlots
                .map((slot) => `${slot.date || 'N/A'} at ${slot.time || 'N/A'}`)
                .join("; ")
            : "N/A";
        y = addDetail("Availability", dateTimeAvailability);
        const skillsList = Array.isArray(volunteer.skills)
            ? volunteer.skills.join("; ")
            : "None";
        y = addDetail("Skills", skillsList);
        y = addDetail("Region", volunteer.address?.region);
        y = addDetail("Province", volunteer.address?.province);
        y = addDetail("City", volunteer.address?.city);
        y = addDetail("Barangay", volunteer.address?.barangay);
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
        Swal.fire("Error", "Failed to load logo image. Please check the path: '../assets/images/AB_logo.png'", "error");
    };
}

async function fetchEndorsedVolunteers(userUid) {
    if (!userUid) {
        console.warn("No user UID provided. Cannot fetch endorsed volunteers.");
        allEndorsedVolunteers = [];
        renderVolunteersTable();
        return;
    }

    try {
        const tempEndorsedVolunteers = [];
        const userSnapshot = await database.ref(`users/${userUid}`).once('value');
        const userData = userSnapshot.val();
        const userRole = userData?.role || 'ABVN';

        if (userRole === 'ABVN') {
            // For ABVN users, find their associated volunteer group
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
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean',
                        confirmButton: 'my-error-button'
                    }
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
        } else if (permissions.canView) {
            // For admins with view permission, fetch all endorsed volunteers
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
        } else {
            Swal.fire({
                title: 'Access Denied',
                text: 'You do not have permission to view endorsed volunteers.',
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
            allEndorsedVolunteers = [];
            renderVolunteersTable();
            return;
        }

        allEndorsedVolunteers = tempEndorsedVolunteers;
        applyFiltersAndSort();
    } catch (error) {
        console.error("Error fetching endorsed volunteers:", error);
        Swal.fire({
            title: 'Error',
            text: 'Failed to fetch endorsed volunteers.',
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

async function archiveVolunteer(volunteer) {
    if (!permissions.canArchive) {
        Swal.fire('Error', 'You do not have permission to archive volunteers.', 'error');
        return;
    }

    const isVerified = await verifySuperAdminPassword();
    if (!isVerified) {
        Swal.fire({
            title: 'Error',
            text: 'Incorrect admin password.',
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
        title: 'Archive Volunteer?',
        text: `Archive ${getFullName(volunteer)}?`,
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
            let sourcePath = '';
            let abvnKeyToOperateOn = volunteer.sourceAbvnKey;

            if (!abvnKeyToOperateOn) {
                Swal.fire('Error', 'Cannot archive: Missing ABVN source key for this volunteer. Please refresh the page and try again.', 'error');
                return;
            }

            sourcePath = `volunteerGroups/${abvnKeyToOperateOn}/endorsedVolunteers/${volunteer.key}`;
            const destinationPath = `volunteerApplications/archivedEndorsedVolunteer/${volunteer.key}`;

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
    if (!permissions.canRetrieve) {
        Swal.fire('Error', 'You do not have permission to retrieve volunteers.', 'error');
        return;
    }

    Swal.fire({
        title: 'Retrieve Application?',
        text: `${getFullName(volunteer)} will move the volunteer group application from archived records back to endorsed applications.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Retrieve',
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
        },
    }).then(async (result) => {
        if (result.isConfirmed) {
            const sourcePath = `volunteerApplications/archivedEndorsedVolunteer/${volunteer.key}`;
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

                Swal.fire({
                    title: 'Retrieved!',
                    text: 'Volunteer has been retrieved to endorsed volunteers.',
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

                fetchEndorsedVolunteers(currentUserId);
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
        volunteersContainer.innerHTML = '<tr><td colspan="16" style="text-align: center;">No endorsed volunteers found.</td></tr>';
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

        // Handle the nested availability.specificDateTimeSlots structure
        const dateTimeAvailability = volunteer.availability?.specificDateTimeSlots && Array.isArray(volunteer.availability.specificDateTimeSlots)
            ? `<ol>${volunteer.availability.specificDateTimeSlots
                .map((slot) => `<li>${slot.date || 'N/A'} at ${slot.time || 'N/A'}</li>`)
                .join("")}</ol>`
            : "N/A";

        const skillsList = Array.isArray(volunteer.skills)
            ? `<ol>${volunteer.skills
                .map((skill) => `<li>${skill}</li>`)
                .join("")}</ol>`
            : "None";

        row.innerHTML = `
            <td>${rowNum}</td>
            <td>${getFullName(volunteer)}</td>
            <td>${volunteer.email || 'N/A'}</td>
            <td>${volunteer.mobileNumber || 'N/A'}</td>
            <td>${volunteer.age || 'N/A'}</td>
            <td>${getSocialMediaLink(volunteer.socialMediaLink)}</td>
            <td>${volunteer.additionalInfo || 'N/A'}</td>
            <td>${volunteer.emergencyResponse ? "Yes (24/7)" : "No"}</td>
            <td>${dateTimeAvailability}</td>
            <td>${volunteer.address?.region || 'N/A'}</td>
            <td>${volunteer.address?.province || 'N/A'}</td>
            <td>${volunteer.address?.city || 'N/A'}</td>
            <td>${volunteer.address?.barangay || 'N/A'}</td>
            <td>${skillsList}</td>
            <td>${volunteer.endorsedToABVNName ? `${volunteer.endorsedToABVNName} (${volunteer.endorsedToABVNLocation})` : 'N/A'}</td>
            <td>${formatDate(volunteer.endorsementDate)}</td>
            <td>
                <button class="viewBtn"><i class='bx bx-show-alt'></i></button>
                ${permissions.canArchive ? `<button class="archiveBtn"><i class='bx bx-x-circle'></i></button>` : ''}
                <button class="saveSinglePdfBtn"><i class='bx bxs-file-pdf'></i></button>
            </td>
        `;

        row.querySelector('.viewBtn').onclick = () => showVolunteerDetails(volunteer);
        if (permissions.canArchive) {
            row.querySelector('.archiveBtn').onclick = () => archiveVolunteer(volunteer);
        }
        row.querySelector('.saveSinglePdfBtn').onclick = () => saveSingleVolunteerPdf(volunteer);
    });

    renderPagination();
}

function applyFiltersAndSort() {
    console.log('Search Term:', searchInput.value);
    console.log('Sort Value:', sortSelect.value);
    let currentVolunteers = [...allEndorsedVolunteers];
    const searchTerm = searchInput.value.toLowerCase().trim();
    const sortValue = sortSelect.value;

    // Apply search filter
    if (searchTerm) {
        if (sortValue && sortValue !== 'All-asc' && sortValue !== 'All-desc') {
            const [sortBy] = sortValue.split('-');
            currentVolunteers = currentVolunteers.filter(volunteer => {
                let fieldValue;
                switch (sortBy) {
                    case 'Location':
                        fieldValue = `${volunteer.address?.region || ''} ${volunteer.address?.province || ''} ${volunteer.address?.city || ''} ${volunteer.address?.barangay || ''}`.toLowerCase();
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
                        fieldValue = (volunteer.additionalInfo || '').toLowerCase();
                        break;
                    case 'EndorsedToABVN':
                        fieldValue = `${volunteer.endorsedToABVNName || ''} ${volunteer.endorsedToABVNLocation || ''}`.toLowerCase();
                        break;
                    case 'EndorsementDate':
                        fieldValue = formatDate(volunteer.endorsementDate).toLowerCase();
                        break;
                    default:
                        return false;
                }
                return fieldValue.includes(searchTerm);
            });
        } else {
            currentVolunteers = currentVolunteers.filter(volunteer => {
                return (
                    getFullName(volunteer).toLowerCase().includes(searchTerm) ||
                    (volunteer.email || '').toLowerCase().includes(searchTerm) ||
                    (volunteer.mobileNumber || '').toLowerCase().includes(searchTerm) ||
                    (volunteer.address?.region || '').toLowerCase().includes(searchTerm) ||
                    (volunteer.address?.province || '').toLowerCase().includes(searchTerm) ||
                    (volunteer.address?.city || '').toLowerCase().includes(searchTerm) ||
                    (volunteer.address?.barangay || '').toLowerCase().includes(searchTerm) ||
                    (volunteer.socialMediaLink || '').toLowerCase().includes(searchTerm) ||
                    (volunteer.additionalInfo || '').toLowerCase().includes(searchTerm) ||
                    (volunteer.endorsedToABVNName || '').toLowerCase().includes(searchTerm) ||
                    (volunteer.endorsedToABVNLocation || '').toLowerCase().includes(searchTerm)
                );
            });
        }
    }

    // Apply sorting
    if (sortValue) {
        const [sortBy, order] = sortValue.split('-');
        currentVolunteers.sort((a, b) => {
            let valA, valB;
            switch (sortBy) {
                case 'Location':
                    valA = `${a.address?.region || ''} ${a.address?.province || ''} ${a.address?.city || ''} ${a.address?.barangay || ''}`.toLowerCase();
                    valB = `${b.address?.region || ''} ${b.address?.province || ''} ${b.address?.city || ''} ${b.address?.barangay || ''}`.toLowerCase();
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
                    valA = (a.additionalInfo || '').toLowerCase();
                    valB = (b.additionalInfo || '').toLowerCase();
                    break;
                case 'EndorsedToABVN':
                    valA = `${a.endorsedToABVNName || ''} ${a.endorsedToABVNLocation || ''}`.toLowerCase();
                    valB = `${b.endorsedToABVNName || ''} ${b.endorsedToABVNLocation || ''}`.toLowerCase();
                    break;
                case 'EndorsementDate':
                    valA = new Date(a.endorsementDate || 0).getTime();
                    valB = new Date(b.endorsementDate || 0).getTime();
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

    filteredVolunteers = currentVolunteers;
    console.log('Filtered and Sorted Volunteers:', filteredVolunteers);
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

    if (totalPages === 0) {
        paginationElement.innerHTML = '<span>No entries to display</span>';
        return;
    }

    const createButton = (label, page, disabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (isActive) btn.classList.add('active-page');
        btn.addEventListener('click', () => {
            currentPage = page;
            paginateVolunteers();
        });
        return btn;
    };

    paginationElement.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        paginationElement.appendChild(createButton('1', 1));
        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            paginationElement.appendChild(dots);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationElement.appendChild(createButton(i, i, false, i === currentPage));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            paginationElement.appendChild(dots);
        }
        paginationElement.appendChild(createButton(totalPages, totalPages));
    }

    paginationElement.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
}

viewArchivedButton.addEventListener('click', () => {
    if (!permissions.canRetrieve) {
        Swal.fire({
            title: 'Error',
            text: 'You do not have permission to view archived volunteers.',
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
    fetchArchivedVolunteers();
    archivedModal.style.display = 'flex';
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
    if (!permissions.canRetrieve) {
        console.warn("User does not have permission to fetch archived volunteers.");
        allArchivedVolunteerData = [];
        renderArchivedVolunteerApplications();
        return;
    }
    
    try {
        const archivedRef = database.ref('volunteerApplications/archivedEndorsedVolunteer');
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
                ${permissions.canRetrieve ? `<button class="retrieveBtn" data-key="${volunteer.key}">Retrieve</button>` : ''}
            </td>
        `;
    });

    if (permissions.canRetrieve) {
        archivedTableBody.querySelectorAll('.retrieveBtn').forEach(button => {
            button.addEventListener('click', (event) => {
                const key = event.target.dataset.key;
                const volunteerToRetrieve = allArchivedVolunteerData.find(v => v.key === key);
                if (volunteerToRetrieve) {
                    retrieveVolunteer(volunteerToRetrieve);
                }
            });
        });
    }

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

    modalContentDiv.innerHTML = `
        <div class="modal-content-inner" style="padding: 20px;">
            <h2>Endorsed Volunteer Details:</h2>
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
            <h2>Availability:</h2>
            <p><strong>Emergency Response:</strong> ${volunteer.emergencyResponse ? "Yes (24/7)" : "No"}</p>
            ${specificSlotsHtml}
            <hr>
            <h2>Skills:</h2>
            ${skillsHtml}
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

                // Check permissions
                permissions = await checkAdminPermissions();
                if (!permissions.canView) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Access Denied',
                        text: 'You do not have permission to access this page.',
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean',
                            confirmButton: 'my-error-button'
                        }
                    }).then(() => {
                        window.location.href = "../pages/login.html";
                    });
                    return;
                }

                // Show/hide view archived button based on permissions
                viewArchivedButton.style.display = permissions.canRetrieve ? 'block' : 'none';

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
                fetchEndorsedVolunteers(user.uid);
                setupInactivityListeners();
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


