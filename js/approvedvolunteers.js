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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {}

const database = firebase.database();
const auth = firebase.auth();

// Initialize EmailJS with updated public key
try {
    emailjs.init('BwfsCx-NJCb3qGxCk');
} catch (error) {}

// Variables for inactivity detection
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds
let permissions = { canView: false, canEdit: false, canArchive: false, canRetrieve: false };

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
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

// Attach event listeners to detect user activity
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

async function checkAdminPermissions() {
    const user = auth.currentUser;
    if (!user) {
        Swal.fire('Error', 'User not authenticated.', 'error');
        return { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
    }
    try {
        const snapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = snapshot.val();
        const adminPosition = userData?.adminPosition || '';
        return {
            canView: ['Super Admin', 'position-one', 'position-two'].includes(adminPosition),
            canEdit: ['Super Admin', 'position-one', 'position-two'].includes(adminPosition),
            canArchive: ['Super Admin', 'position-one'].includes(adminPosition),
            canRetrieve: ['Super Admin', 'position-one'].includes(adminPosition)
        };
    } catch (error) {
        Swal.fire('Error', `Failed to fetch user permissions: ${error.message}`, 'error');
        return { canView: false, canEdit: false, canArchive: false, canRetrieve: false };
    }
}

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
                await user.reauthenticateWithCredential(credential); // Use reauthenticateWithCredential
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
        searchInput.value = '';
        return false;
    }
    searchInput.value = ''; 
    return password; 
}

// auth.onAuthStateChanged(async user => {
//     if (!user) {
//         Swal.fire({
//             icon: 'error',
//             title: 'Authentication Required',
//             text: 'Please sign in to access approved volunteer applications.',
//         }).then(() => {
//             window.location.href = "../pages/login.html";
//         });
//         return;
//     }
//     try {
//         permissions = await checkAdminPermissions(); // Assign to global permissions
//         if (!permissions.canView) {
//             Swal.fire({
//                 icon: 'error',
//                 title: 'Access Denied',
//                 text: 'You do not have permission to access this page.',
//                 showConfirmButton: true,
//                 confirmButtonText: 'OK',
//                 customClass: {
//                     popup: 'swal2-popup-error-clean',
//                     title: 'swal2-title-error-clean',
//                     htmlContainer: 'swal2-text-error-clean',
//                     confirmButton: 'my-error-button'
//                 }
//             }).then(() => {
//                 window.location.href = "../pages/login.html";
//             });
//             return;
//         }
//         initializePageFunctions(user.uid);
//         resetInactivityTimer();
//     } catch (error) {
//         Swal.fire({
//             icon: 'error',
//             title: 'Error',
//             text: `Failed to initialize page: ${error.message}`,
//             confirmButtonText: 'OK'
//         });
//     }
// });
auth.onAuthStateChanged(async user => {
    console.log(`[${new Date().toISOString()}] Auth state changed:`, user ? { uid: user.uid, email: user.email } : 'No user');

    if (!user) {
        Swal.fire({
            icon: 'error',
            title: 'Authentication Required',
            text: 'Please sign in to access approved volunteer applications.',
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

    try {
        // Check password_needs_reset
        const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = userSnapshot.val();
        const passwordNeedsReset = userData ? (userData.password_needs_reset || false) : false;

        if (passwordNeedsReset) {
            console.log(`[${new Date().toISOString()}] Password change required for user ${user.uid}. Redirecting to profile page.`);
            Swal.fire({
                icon: 'error',
                title: 'Password Change Required',
                text: 'Please change your password. Redirecting to profile.',
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
                window.location.replace('../pages/profile.html');
            });
            return;
        }

        // Proceed with normal flow
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

        initializePageFunctions(user.uid);
        resetInactivityTimer();
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error checking user data:`, error);
        Swal.fire({
            icon: 'error',
            title: 'Authentication Error',
            text: 'Failed to verify account status. Please try logging in again.',
            showConfirmButton: true,
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal2-popup-error-clean',
                title: 'swal2-title-error-clean',
                htmlContainer: 'swal2-text-error-clean',
                confirmButton: 'my-error-button'
            }
        }).then(() => {
            window.location.href = '../pages/login.html';
        });
    }
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
                <h2>Approved Volunteer Details</h2>
                <p><strong>Scheduled Date/Time:</strong> ${formatDate(volunteer.scheduledDateTime || volunteer.timestamp)}</p>
                <p><strong>Full Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${volunteer.email || 'N/A'}</p>
                <p><strong>Mobile Number:</strong> ${volunteer.mobileNumber || 'N/A'}</p>
                <p><strong>Age:</strong> ${volunteer.age || 'N/A'}</p>
                <p><strong>Social Media:</strong> ${volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank">${volunteer.socialMediaLink}</a>` : 'N/A'}</p>
                <p><strong>Additional Info:</strong> ${volunteer.additionalInfo || '-'}</p>
                <hr>
                <h2>Address Information:</h2>
                <div style="margin-left: 15px;">
                    <p><strong>Address:</strong> ${volunteer.address?.formattedAddress || 'N/A'}</p>
                    <p><strong>Latitude:</strong> ${volunteer.address?.latitude || 'N/A'}</p>
                    <p><strong>Longitude:</strong> ${volunteer.address?.longitude || 'N/A'}</p>
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

    // Export Excel
    function exportToExcel() {
        if (filteredApprovedApplications.length === 0) {
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
        const dataForExport = filteredApprovedApplications.map((volunteer, i) => {
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
                "Emergency Response": volunteer.isEmergencyResponse ? 'Yes (24/7)' : 'No' || 'N/A',
                "Date/Time Availability": volunteer.availability?.specificDateTimeSlots?.map(slot => `${slot.date} at ${slot.time}`).join('; ') || 'N/A',
                "Address": volunteer.address?.formattedAddress || 'N/A',
                "Latitude": volunteer.address?.latitude || 'N/A',
                "Longitude": volunteer.address?.longitude || 'N/A',
                "Skills": skillsDisplay,
                "Scheduled Date/Time": formatDate(volunteer.scheduledDateTime || volunteer.applicationDateandTime)
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

    // PDF all
    function exportToPDF() {
        if (filteredApprovedApplications.length === 0) {
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
                "Additional Info", "Emergency Response", "Date/Time Availability",
                "Address", "Latitude", "Longitude", "Skills", "Scheduled Date/Time"
            ]];
            const body = filteredApprovedApplications.map((volunteer, i) => {
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
                    volunteer.otherSkillComments || 'N/A',
                    volunteer.isEmergencyResponse ? 'Yes (24/7)' : 'No',
                    volunteer.availability?.specificDateTimeSlots?.map(slot => `${slot.date} at ${slot.time}`).join('; ') || 'N/A',
                    volunteer.address?.formattedAddress || 'N/A',
                    volunteer.address?.latitude || 'N/A',
                    volunteer.address?.longitude || 'N/A',
                    skillsDisplay,
                    formatDate(volunteer.scheduledDateTime || volunteer.applicationDateandTime)
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
                columnStyles: {
                    0: { cellWidth: 20 }, // No.
                    1: { cellWidth: 20 }, // Full Name
                    2: { cellWidth: 25 }, // Email
                    3: { cellWidth: 25 }, // Mobile Number
                    4: { cellWidth: 10 }, // Age
                    5: { cellWidth: 20 }, // Social Media
                    6: { cellWidth: 30 }, // Additional Info
                    7: { cellWidth: 20 }, // Emergency Response
                    8: { cellWidth: 20 }, // Date/Time Availability
                    9: { cellWidth: 20 }, // Address
                    10: { cellWidth: 10 }, // Latitude
                    11: { cellWidth: 10 }, // Longitude
                    12: { cellWidth: 20 }, // Skills
                    13: { cellWidth: 20 }  // Scheduled Date/Time
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

    function saveSingleApplicationPdf(volunteer) {
        if (!window.jspdf) {
            Swal.fire('Error', 'jsPDF library is not loaded. Please ensure it is included.', 'error');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape'); 
        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';
        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;
            let yOffset = 20;
            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
            doc.setFontSize(18);
            doc.text("Approved Volunteer Application Details", 14, yOffset);
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
                "Additional Info", "Emergency Response", "Date/Time Availability",
                "Region", "Province", "City", "Barangay", "Skills", "Scheduled Date/Time"
            ]];
            let skillsDisplay = 'None';
            if (volunteer.skills && Array.isArray(volunteer.skills) && volunteer.skills.length > 0) {
                skillsDisplay = volunteer.skills.map(skill => 
                    skill === 'Other' && volunteer.otherSkillComments ? 
                    `${skill} (${volunteer.otherSkillComments})` : skill
                ).join('; ');
            }
            const body = [[
                1,
                getFullName(volunteer) || 'N/A',
                volunteer.email || 'N/A',
                String(volunteer.mobileNumber || 'N/A'),
                volunteer.age || 'N/A',
                volunteer.socialMediaLink || 'N/A',
                volunteer.otherSkillComments || 'N/A',
                volunteer.isEmergencyResponse ? 'Yes (24/7)' : 'No',
                volunteer.availability?.specificDateTimeSlots?.map(slot => `${slot.date} at ${slot.time}`).join('; ') || 'N/A',
                volunteer.address?.region || 'N/A',
                volunteer.address?.province || 'N/A',
                volunteer.address?.city || 'N/A',
                volunteer.address?.barangay || 'N/A',
                skillsDisplay,
                formatDate(volunteer.scheduledDateTime || volunteer.applicationDateandTime)
            ]];
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
                columnStyles: {
                    0: { cellWidth: 10 }, // No.
                    1: { cellWidth: 20 }, // Full Name
                    2: { cellWidth: 25 }, // Email
                    3: { cellWidth: 25 }, // Mobile Number
                    4: { cellWidth: 10 }, // Age
                    5: { cellWidth: 20 }, // Social Media
                    6: { cellWidth: 10 }, // Additional Info
                    7: { cellWidth: 10 }, // Emergency Response
                    8: { cellWidth: 20 }, // Date/Time Availability
                    9: { cellWidth: 20 }, // Region
                    10: { cellWidth: 20 }, // Province
                    11: { cellWidth: 20 }, // City
                    12: { cellWidth: 20 }, // Barangay
                    13: { cellWidth: 20 }, // Skills
                    14: { cellWidth: 20 }  // Scheduled Date/Time
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
            const sanitizedFullName = getFullName(volunteer).replace(/[^a-zA-Z0-9-_]/g, '_') || 'unknown';
            const nowForFilename = new Date();
            const year = nowForFilename.getFullYear();
            const month = String(nowForFilename.getMonth() + 1).padStart(2, '0');
            const day = String(nowForFilename.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            doc.save(`approved_volunteer_${sanitizedFullName}_${formattedDate}.pdf`);
            Swal.fire({
                title: 'Export Successful!',
                text: 'Approved volunteer application details have been exported to PDF.',
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
            } else {
                volunteersContainer.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center;">No approved volunteer applications found.</td></tr>`;
            }
            applySearchAndSort();
        }, (error) => {
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

        database.ref('volunteerApplications/archivedApprovedVolunteer').once('value', (snapshot) => {
            allArchivedVolunteerData = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const volunteerData = childSnapshot.val();
                    const volunteerKey = childSnapshot.key;
                    allArchivedVolunteerData.push({ key: volunteerKey, ...volunteerData });
                });
            } else {}
            renderArchivedVolunteerApplications();
        }, (error) => {
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
            
            // Define specificSlotsHtml and skillsHtml locally
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
                <td>${scheduledDateTimeDisplay}</td>
                <td>${formatDate(volunteer.archivedAt)}</td>
                <td>${permissions.canRetrieve ? `<button class="retrieveBtn" data-key="${volunteer.key}">Retrieve</button>` : ''}</td>
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
                <td>${volunteer.otherSkillComments || '-'}</td>
                <td>${volunteer.isEmergencyResponse ? 'Yes (24/7)' : 'No'}</td>
                <td>${specificSlotsHtml}</td>
                <td>${volunteer.address?.formattedAddress || 'N/A'}</td>
                <td>${skillsHtml}</td>
                <td>${scheduledDateTimeDisplay}</td>
                <td>
                    <button class="viewBtn" data-key="${volunteer.key}"><i class='bx bx-show-alt'></i></button>
                    ${permissions.canEdit ? `<button title="Reschedule" class="rescheduleBtn" data-key="${volunteer.key}"><i class='bx bx-calendar-edit'></i></button>` : ''}
                    ${permissions.canArchive ? `<button title="Archive" class="archiveBtn" data-key="${volunteer.key}"><i class='bx bx-archive'></i></button>` : ''}
                    <button title="Save as PDF" class="saveSinglePdfBtn" data-key="${volunteer.key}"><i class='bx bxs-file-pdf'></i></button>
                </td>
            `;
        });

        updateEntriesInfo(applicationsToRender.length);
        renderPagination(applicationsToRender.length);
    }

    // --- Search and Sort Logic ---
    function applySearchAndSort() {
        let currentApplications = [...allApprovedApplications];
        const searchTerm = searchInput.value.toLowerCase().trim();
        const sortValue = sortSelect.value;

        // Apply search filter
        if (searchTerm) {
            if (sortValue && sortValue !== 'All-asc' && sortValue !== 'All-desc') {
                const [sortBy] = sortValue.split('-');
                currentApplications = currentApplications.filter(volunteer => {
                    let fieldValue;
                    switch (sortBy) {
                        case 'DateTime':
                            fieldValue = formatDate(volunteer.scheduledDateTime || volunteer.timestamp || '').toLowerCase();
                            break;
                        case 'Location':
                            fieldValue = (volunteer.address?.formattedAddress || '').toLowerCase();
                            break;
                        case 'Latitude':
                            fieldValue = (volunteer.address?.latitude || '').toString().toLowerCase();
                            break;
                        case 'Longitude':
                            fieldValue = (volunteer.address?.longitude || '').toString().toLowerCase();
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
                        (volunteer.address?.formattedAddress || '').toLowerCase().includes(searchTerm) ||
                        (volunteer.address?.latitude || '').toString().toLowerCase().includes(searchTerm) ||
                        (volunteer.address?.longitude || '').toString().toLowerCase().includes(searchTerm) ||
                        (volunteer.otherSkillComments || '').toLowerCase().includes(searchTerm) ||
                        (volunteer.availability?.specificDateTimeSlots || [])
                            .map(slot => `${slot.date} at ${slot.time}`).join(' ').toLowerCase().includes(searchTerm) ||
                        (volunteer.skills || []).join(' ').toLowerCase().includes(searchTerm)
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
                    case 'DateTime':
                        valA = new Date(a.scheduledDateTime || a.timestamp || 0).getTime();
                        valB = new Date(b.scheduledDateTime || b.timestamp || 0).getTime();
                        break;
                    case 'Location':
                        valA = (a.address?.formattedAddress || '').toLowerCase();
                        valB = (b.address?.formattedAddress || '').toLowerCase();
                        break;
                    case 'Latitude':
                        valA = parseFloat(a.address?.latitude || 0);
                        valB = parseFloat(b.address?.latitude || 0);
                        break;
                    case 'Longitude':
                        valA = parseFloat(a.address?.longitude || 0);
                        valB = parseFloat(b.address?.longitude || 0);
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
                    case 'All':
                    default:
                        valA = getFullName(a).toLowerCase();
                        valB = getFullName(b).toLowerCase();
                        break;
                }
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return order === 'asc' ? valA - valB : valB - valA;
                } else {
                    return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valB);
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
            Swal.fire('Email Sent!', 'Confirmation email has been sent to the volunteer.', 'success');
        } catch (error) {
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
        } else if (target.classList.contains('retrieveBtn') || target.closest('.retrieveBtn')) {
            if (!permissions.canRetrieve) {
                Swal.fire({
                    title: 'Error',
                    text: 'You do not have permission to retrieve volunteers.',
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

            // Removed verifySuperAdminPassword check
            Swal.fire({
                title: 'Retrieve Application?',
                text: `${getFullName(volunteer)} will move the volunteer group application from archived records back to approved applications.`,
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
                    try {
                        const archivedRef = database.ref(`volunteerApplications/archivedApprovedVolunteer/${volunteerKey}`);
                        const snapshot = await archivedRef.once('value');
                        const volunteerData = snapshot.val();

                        if (volunteerData) {
                            delete volunteerData.archivedAt;
                            volunteerData.status = 'confirmedByAB';
                            await database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`).set(volunteerData);
                            await archivedRef.remove();
                            Swal.fire({
                                title: 'Retrieved!',
                                text: 'Volunteer Group has been retrieved to approved volunteers.',
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
                            fetchAndRenderArchivedVolunteerApplications();
                            fetchApprovedVolunteers();
                        } else {
                            Swal.fire('Error', 'Volunteer application not found.', 'error');
                        }
                    } catch (error) {
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
        if (!permissions.canEdit) {
            Swal.fire('Error', 'You do not have permission to reschedule volunteers.', 'error');
            return;
        }
        
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
            showCancelButton: true,
            confirmButtonText: 'Reschedule',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            focusCancel: true,
            customClass: {
                popup: 'custom-swal-popup-large',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-content',
                confirmButton: 'custom-confirm-btn',
                cancelButton: 'custom-cancel-btn'
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

                // Check if volunteer is available for 24-hour emergency response
                if (!volunteer.isEmergencyResponse) {
                    const selectedDateTime = new Date(newDateTimeString);
                    const hours = selectedDateTime.getHours();
                    // Operational hours: 8 AM (8) to 8 PM (20)
                    if (hours < 8 || hours >= 20) {
                        Swal.showValidationMessage('Non-emergency volunteers can only be scheduled between 8 AM and 8 PM.');
                        return false;
                    }
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
                    Swal.fire({
                        icon: 'success',
                        title: 'Rescheduled',
                        text: `${getFullName(volunteer)}'s schedule has been updated to ${formatDate(newTimestamp)}.`,
                        timer: 2000,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean'
                        }
                    });
                } catch (error) {
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

        const volunteerKey = button.dataset.key;
        const volunteer = allApprovedApplications.find(v => v.key === volunteerKey);

        if (!volunteer) {
            console.warn("Volunteer data not found for archiving:", volunteerKey);
            Swal.fire('Error', 'Volunteer data not found for archiving.', 'error');
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
            try {
                const approvedVolunteerRef = database.ref(`volunteerApplications/approvedVolunteer/${volunteerKey}`);
                const snapshot = await approvedVolunteerRef.once('value');
                const volunteerToArchive = snapshot.val();

                if (!volunteerToArchive) {
                Swal.fire('Error', 'Volunteer data not found in approved applications.', 'error');
                return;
                }

                volunteerToArchive.archivedAt = firebase.database.ServerValue.TIMESTAMP;
                await database.ref(`volunteerApplications/archivedApprovedVolunteer/${volunteerKey}`).set(volunteerToArchive);
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

    viewArchivedButton.addEventListener('click', () => {
        if (!permissions.canRetrieve) {
            Swal.fire({
                title: 'Error',
                text: 'You do not have permission to view archived donations.',
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
        showArchivedModal();
    });

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
        const saveSinglePdfBtn = target.closest('.saveSinglePdfBtn');

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