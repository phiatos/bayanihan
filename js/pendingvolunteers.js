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

// Initialize EmailJS with your public key
try {
    emailjs.init('ULA8rmn7VM-3fZ7ik');
    console.log("EmailJS initialized successfully");
} catch (error) {
    console.error("EmailJS initialization failed:", error);
}

// Variables for inactivity detection
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

// Global flag for Super Admin status
let currentUserIsSuperAdmin = false;
let currentUserAdminPosition = null;

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

// Authentication Check
auth.onAuthStateChanged(user => {
    if (!user) {
        Swal.fire({
            icon: 'error',
            title: 'Authentication Required',
            text: 'Please sign in to access pending volunteer applications.',
        }).then(() => {
            window.location.href = "../pages/login.html";
        });
        return;
    }
    console.log("User authenticated:", user.uid);

    // Fetch user role to determine Super Admin status
    database.ref(`users/${user.uid}`).once('value', snapshot => {
        const userData = snapshot.val();
        if (userData && userData.adminPosition) {
            currentUserAdminPosition = userData.adminPosition;
            console.log("Current user admin position:", currentUserAdminPosition);
        } else {
            currentUserAdminPosition = null;
            console.log("No admin position found for user. Access restricted.");
        }
        // Maintain compatibility with existing Super Admin check
        currentUserIsSuperAdmin = userData && userData.isSuperAdmin === true;
        console.log("Current user isSuperAdmin:", currentUserIsSuperAdmin);
        initializePageFunctions(user.uid);
        resetInactivityTimer();
    }).catch(error => {
        console.error("Error fetching user role:", error);
        currentUserAdminPosition = null;
        currentUserIsSuperAdmin = false;
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

    viewApprovedBtn.addEventListener('click', () => {
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
        const fullName = getFullName(volunteer);
        let specificSlotsHtml = '';

        if (volunteer.availability && volunteer.availability.specificDateTimeSlots && volunteer.availability.specificDateTimeSlots.length > 0) {
            specificSlotsHtml = `<h5 style="margin-bottom: 10px; color: #14AEBB;">Specific Date & Time Slots:</h5><div style="margin-left: 15px;"><ol style="padding-left: 20px; margin-top: 5px;">`;
            volunteer.availability.specificDateTimeSlots.forEach(slot => {
                if (slot.date && slot.time) {
                    specificSlotsHtml += `<li>${slot.date} at ${slot.time}</li>`;
                }
            });
            specificSlotsHtml += `</ol></div>`;
        } else {
            specificSlotsHtml = `<p><strong>Specific Date & Time Slots:</strong> N/A</p>`;
        }

        modalContent.innerHTML = `
            <div class="modal-content-inner" style="padding: 20px;">

                <h2>Volunteer Details:</h2>

                <p><strong>Application Date/Time:</strong> ${formatDate(volunteer.timestamp)}</p>
                <p><strong>Full Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${volunteer.email || 'N/A'}</p>
                <p><strong>Mobile Number:</strong> ${volunteer.mobileNumber || 'N/A'}</p>
                <p><strong>Age:</strong> ${volunteer.age || 'N/A'}</p>
                <p><strong>Social Media:</strong> ${volunteer.socialMediaLink ? `<a href="${volunteer.socialMediaLink}" target="_blank" rel="noopener noreferrer">${volunteer.socialMediaLink}</a>` : 'N/A'}</p>
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
                ${specificSlotsHtml}
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
        scheduleModal.style.display = 'flex';
    }

    function hideScheduleModal() {
        scheduleModal.style.display = 'none';
        scheduleForm.reset();
        resetCurrentVolunteer();
    }

    function showEndorseABVNModal() {
        console.log('Opening Endorse ABVN Modal for:', currentVolunteerKey);
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
        volunteersContainer.innerHTML = '<tr><td colspan="12" style="text-align: center;">Loading volunteer applications...</td></tr>';
        database.ref('volunteerApplications/pendingVolunteer').on('value', (snapshot) => {
            allApplications = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const volunteerData = childSnapshot.val();
                    const volunteerKey = childSnapshot.key;
                    allApplications.push({ key: volunteerKey, ...volunteerData });
                });
                console.log("Fetched pending volunteers:", allApplications);
            } else {
                console.log("No pending volunteer applications found.");
            }
            applySearchAndSort();
        }, (error) => {
            console.error("Error fetching pending volunteers: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load pending volunteer applications. Please try again later.',
                confirmButtonText: 'OK'
            });
            volunteersContainer.innerHTML = '<tr><td colspan="12" style="text-align: center; color: red;">Failed to load data.</td></tr>';
        });
    }

    function fetchArchivedApplications() {
        archivedTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading archived applications...</td></tr>';
        database.ref('volunteerApplications/archivedVolunteer').on('value', (snapshot) => {
            archivedApplications = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const volunteerData = childSnapshot.val();
                    const volunteerKey = childSnapshot.key;
                    archivedApplications.push({ key: volunteerKey, ...volunteerData });
                });
                console.log("Fetched archived volunteers:", archivedApplications);
            } else {
                console.log("No archived volunteer applications found.");
            }
            renderArchivedApplications();
        }, (error) => {
            console.error("Error fetching archived volunteers:", error);
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
                console.log('ABVN Cache:', abvnCache);
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
            console.error("Error fetching ABVN groups:", error);
            abvnListContainer.innerHTML = '<p style="color: red;">Failed to load ABVN locations.</p>';
            filterResultsInfo.textContent = 'Showing 0 ABVN groups';
            Swal.fire('Error', 'Failed to load ABVN groups. Please try again.', 'error');
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
        if (filteredApplications.length === 0) {
            Swal.fire("Info", "No data to export!", "info");
            return;
        }
        const dataForExport = filteredApplications.map((volunteer, i) => {
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
                "Date/Time Availability": volunteer.availability?.specificDateTimeSlots?.map(slot => `${slot.date} at ${slot.time}`).join('; ') || 'N/A',
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

    // PDF all
    function exportToPDF() {
        if (filteredApplications.length === 0) {
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
                "Date/Time Availability", "Application Date/Time", "Status Notes"
            ]];
            const body = filteredApplications.map((volunteer, i) => {
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

    // PDF Single
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
            y = addDetail("Additional Info", volunteer.additionalInfo);
            y = addDetail("Date/Time Availability", volunteer.availability?.specificDateTimeSlots?.map(slot => `${slot.date} at ${slot.time}`).join('; '));
            const applicationDateTime = formatDate(volunteer.applicationDateandTime);
            if (applicationDateTime === 'N/A') {
                console.warn(`Missing or invalid applicationDateandTime for volunteer ${volunteer.key}:`, volunteer.applicationDateandTime);
            }
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

    // --- Rendering Functions ---
    function renderApplications(applicationsToRender) {
        volunteersContainer.innerHTML = '';
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedApplications = applicationsToRender.slice(startIndex, endIndex);
        if (paginatedApplications.length === 0) {
            volunteersContainer.innerHTML = '<tr><td colspan="12" style="text-align: center;">No pending volunteer applications found on this page.</td></tr>';
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
            row.innerHTML = `
                <td>${i++}</td>
                <td>${fullName}</td>
                <td>${volunteer.email || 'N/A'}</td>
                <td>${volunteer.mobileNumber || 'N/A'}</td>
                <td>${volunteer.age || 'N/A'}</td>
                <td>${socialMediaDisplay}</td>
                <td>${volunteer.additionalInfo || 'N/A'}</td>
                <td>${specificSlotsHtml}</td>
                <td>${volunteer.address?.region || 'N/A'}</td>
                <td>${volunteer.address?.province || 'N/A'}</td>
                <td>${volunteer.address?.city || 'N/A'}</td>
                <td>${volunteer.address?.barangay || 'N/A'}</td>
                <td>${displayStatusNotes}</td>
                <td>
                    <button class="actionBtn" data-key="${volunteer.key}"><i class='bx bx-dots-vertical-rounded'></i></button>
                    <button class="viewBtn" data-key="${volunteer.key}"><i class='bx bx-show-alt'></i></button>
                    <button class="saveSinglePdfBtn" data-key="${volunteer.key}"><i class='bx bxs-file-pdf'></i></button>
                </td>
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
        paginatedApplications.forEach(volunteer => {
            const row = archivedTableBody.insertRow();
            row.setAttribute('data-key', volunteer.key);
            row.innerHTML = `
                <td>${i++}</td>
                <td>${getFullName(volunteer)}</td>
                <td>${volunteer.email || 'N/A'}</td>
                <td>${volunteer.status || 'N/A'}</td>
                <td>${formatDate(volunteer.archivedDate)}</td>
                <td>
                    <button class="retrieveBtn" data-key="${volunteer.key}">Retrieve</button>
                </td>
            `;
        });
        updateArchivedEntriesInfo();
        renderArchivedPagination();
    }

    // --- Search and Sort Logic ---
    function applySearchAndSort() {
        console.log('Search Term:', searchInput.value);
        console.log('Sort Value:', sortSelect.value);
        let currentApplications = [...allApplications];
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
                const statusNotes = (volunteer.statusNotes || '').toLowerCase();
                return fullName.includes(searchTerm) ||
                    email.includes(searchTerm) ||
                    mobileNumber.includes(searchTerm) ||
                    region.includes(searchTerm) ||
                    province.includes(searchTerm) ||
                    city.includes(searchTerm) ||
                    barangay.includes(searchTerm) ||
                    additionalInfo.includes(searchTerm) ||
                    statusNotes.includes(searchTerm);
            });
        }
        const sortValue = sortSelect.value;
        if (sortValue) {
            console.log('Sorting by:', sortValue, 'Applications:', currentApplications);
            const [sortBy, order] = sortValue.split('-');
            currentApplications.sort((a, b) => {
                let valA, valB;
                switch (sortBy) {
                    case 'DateTime':
                        valA = new Date(a.timestamp || 0).getTime();
                        valB = new Date(b.timestamp || 0).getTime();
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
        filteredApplications = currentApplications;
        console.log('Filtered Applications:', filteredApplications);
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
            console.warn("Volunteer data not found for key:", volunteerKey);
            Swal.fire('Error', 'Volunteer data not found.', 'error');
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
            dropdown.innerHTML = `
                <button id="dropdownConfirmByAB"><i class='bx bxs-check-circle'></i>Confirm by AB</button>
                <button id="dropdownDirectedToABVN"><i class='bx bxs-group'></i>Directed to ABVN</button>
                <button id="dropdownSetStalled"><i class='bx bxs-hand'></i>Status Notes</button>
                <button id="dropdownArchive"><i class='bx bx-archive'></i>Archive</button>
            `;
            document.body.appendChild(dropdown);
            currentDropdown = dropdown;
            dropdown.querySelector('#dropdownConfirmByAB').addEventListener('click', () => {
                showScheduleModal();
            });
            dropdown.querySelector('#dropdownDirectedToABVN').addEventListener('click', () => {
                if (!currentVolunteerKey || !currentVolunteerData) {
                    Swal.fire('Error', 'No volunteer selected for endorsement.', 'error');
                    resetCurrentVolunteer();
                    return;
                }
                handleEndorsementProcess();
            });
            dropdown.querySelector('#dropdownSetStalled').addEventListener('click', async () => {
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
                    customClass: {
                        popup: 'custom-swal-popup-small',
                        title: 'custom-swal-title',
                        inputLabel: 'custom-swal-text',
                        confirmButton: 'swal2-button-confirm-clean',
                        cancelButton: 'swal2-button-cancel-clean'
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
                            customClass: {
                                popup: 'custom-swal-popup-small',
                                title: 'custom-swal-title',
                                htmlContainer: 'custom-swal-text',
                                confirmButton: 'custom-confirm-btn'
                            }
                        });
                        fetchPendingVolunteers();
                    } catch (error) {
                        console.error("Error setting volunteer to stalled:", error);
                        Swal.fire({
                            title: 'Error',
                            text: 'Failed to update volunteer status. Please try again.',
                            icon: 'error',
                            customClass: {
                                popup: 'custom-swal-popup-small',
                                title: 'custom-swal-title',
                                htmlContainer: 'custom-swal-text',
                                confirmButton: 'custom-confirm-btn',
                            }
                        });
                    }
                } else {
                    Swal.fire({
                        title: 'Cancelled',
                        text: 'No notes entered. Status remains unchanged.',
                        icon: 'info',
                        customClass: {
                            popup: 'custom-swal-popup-small',
                            title: 'custom-swal-title',
                            htmlContainer: 'custom-swal-text',
                            confirmButton: 'custom-confirm-btn',
                        }
                    });
                }
                resetCurrentVolunteer();
            });
            dropdown.querySelector('#dropdownArchive').addEventListener('click', async () => {
                Swal.fire({
                    title: 'Archive Volunteer?',
                    text: `Archive ${getFullName(currentVolunteerData)}?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Archive',
                    cancelButtonText: 'Cancel',
                    customClass: {
                        popup: 'custom-swal-popup-small',
                        title: 'custom-swal-title',
                        inputLabel: 'custom-swal-text',
                        confirmButton: 'swal2-button-confirm-clean',
                        cancelButton: 'swal2-button-cancel-clean'
                    }, 
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            await database.ref(`volunteerApplications/archivedVolunteer/${currentVolunteerKey}`).set({
                                ...currentVolunteerData,
                                status: 'archived',
                                archivedDate: firebase.database.ServerValue.TIMESTAMP
                            });
                            await database.ref(`volunteerApplications/pendingVolunteer/${currentVolunteerKey}`).remove();
                            Swal.fire({
                                title: 'Archived!',
                                text: 'Volunteer application has been archived.',
                                icon: 'success',
                                customClass: {
                                    popup: 'custom-swal-popup-small', 
                                    title: 'custom-swal-title',
                                    htmlContainer: 'custom-swal-text', 
                                    confirmButton: 'custom-confirm-btn' 
                                }
                            });
                            fetchPendingVolunteers();
                        } catch (error) {
                            console.error('Error archiving volunteer:', error);
                            Swal.fire({
                                title: 'Error',
                                text: 'Failed to archive volunteer. Please try again.',
                                icon: 'error',
                                customClass: {
                                    popup: 'custom-swal-popup-small',
                                    title: 'custom-swal-title',
                                    htmlContainer: 'custom-swal-text',   
                                    confirmButton: 'custom-confirm-btn'  
                                }
                            });
                        }
                        resetCurrentVolunteer();
                    }
                });
            });
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
            Swal.fire('Error', 'Volunteer data not found.', 'error');
            return;
        }
        if (target.classList.contains('retrieveBtn')) {
            // Check if user has the required adminPosition
            if (currentUserAdminPosition !== 'Super Admin' && currentUserAdminPosition !== 'position-one') {
                Swal.fire({
                    title: 'Access Denied',
                    text: 'Only users with Super Admin or position-one roles can retrieve archived applications.',
                    icon: 'error',
                    customClass: {
                        popup: 'custom-swal-popup-small',
                        title: 'custom-swal-title',
                        htmlContainer: 'custom-swal-text',
                        confirmButton: 'custom-confirm-btn'
                    }
                });
                return;
            }
            Swal.fire({
                title: 'Retrieve Volunteer?',
                text: `Retrieve ${getFullName(volunteer)} to pending applications?`,
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
                        await database.ref(`volunteerApplications/pendingVolunteer/${volunteerKey}`).set({
                            ...volunteer,
                            status: 'pending',
                            archivedDate: null
                        });
                        await database.ref(`volunteerApplications/archivedVolunteer/${volunteerKey}`).remove();
                        Swal.fire({
                            title: 'Retrieved!',
                            text: 'Volunteer has been retrieved to pending applications.',
                            icon: 'success',
                            customClass: {
                                popup: 'custom-swal-popup-small',
                                title: 'custom-swal-title',
                                htmlContainer: 'custom-swal-text',
                                confirmButton: 'custom-confirm-btn'
                            }
                        });
                        fetchArchivedApplications();
                    } catch (error) {
                        console.error('Error restoring volunteer:', error);
                        Swal.fire({
                            title: 'Error',
                            text: 'Failed to retrieve volunteer. Please try again.',
                            icon: 'error',
                            customClass: {
                                popup: 'custom-swal-popup-small',
                                title: 'custom-swal-title',
                                htmlContainer: 'custom-swal-text',
                                confirmButton: 'custom-confirm-btn'
                            }
                        });
                    }
                }
            });
        } 
    });

    document.getElementById('viewArchived').addEventListener('click', () => {
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
        const scheduledDateTime = scheduleDateTimeInput.value;
        if (!currentVolunteerKey || !currentVolunteerData) {
            Swal.fire('Error', 'No volunteer selected for scheduling.', 'error');
            hideScheduleModal();
            return;
        }
        if (!scheduledDateTime) {
            Swal.fire('Error', 'Please fill in all scheduling details.', 'error');
            return;
        }
        const selectedDate = new Date(scheduledDateTime);
        selectedDate.setSeconds(0);
        selectedDate.setMilliseconds(0);
        const selectedDateISO = selectedDate.toISOString().split('T')[0];
        const selectedTime24Hr = formatTimeTo24Hr(selectedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
        const now = new Date();
        now.setSeconds(0);
        now.setMilliseconds(0);
        if (selectedDate <= now) {
            Swal.fire({
                title: 'Invalid Date',
                text: 'You cannot schedule a volunteer for a date and time that has already passed. Please select a future date and time.',
                icon: 'error',
                confirmButtonText: 'Understood',
                customClass: {
                    popup: 'swal-invalid-date-popup',
                    title: 'swal-invalid-date-title',
                    htmlContainer: 'swal-invalid-date-text',
                    icon: 'swal-invalid-date-icon',
                    confirmButton: 'swal-invalid-date-confirm-button'
                }
            });
            return;
        }
        const MINIMUM_FUTURE_TIME = 60 * 60 * 1000;
        if (selectedDate.getTime() < now.getTime() + MINIMUM_FUTURE_TIME) {
            Swal.fire({
                title: 'Invalid Date',
                text: 'Scheduled date and time must be at least 1 hour in the future.',
                icon: 'error',
                confirmButtonText: 'Understood',
                customClass: {
                    popup: 'swal-invalid-date-popup',
                    title: 'swal-invalid-date-title',
                    htmlContainer: 'swal-invalid-date-text',
                    icon: 'swal-invalid-date-icon',
                    confirmButton: 'swal-invalid-date-confirm-button'
                }
            });
            return;
        }
        const MAXIMUM_FUTURE_TIME = 6 * 30 * 24 * 60 * 60 * 1000;
        if (selectedDate.getTime() > now.getTime() + MAXIMUM_FUTURE_TIME) {
            Swal.fire({
                title: 'Invalid Date',
                text: 'Scheduled date and time cannot be more than 6 months in the future.',
                icon: 'error',
                confirmButtonText: 'Understood',
                customClass: {
                    popup: 'swal-invalid-date-popup',
                    title: 'swal-invalid-date-title',
                    htmlContainer: 'swal-invalid-date-text',
                    icon: 'swal-invalid-date-icon',
                    confirmButton: 'swal-invalid-date-confirm-button'
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
                    icon: 'info',
                    confirmButtonText: 'Understood'
                });
                return;
            }
        }
        const volunteerEmail = currentVolunteerData.email;
        const volunteerMobile = currentVolunteerData.mobileNumber;
        const volunteerFullName = getFullName(currentVolunteerData).toLowerCase();
        if (!volunteerEmail && !volunteerMobile) {
            Swal.fire('Error', 'Volunteer data is missing email and mobile number. Cannot perform duplicate check.', 'error');
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
                    title: 'Possible Duplicate Volunteer Detected!',
                    html: `This volunteer might already exist in the approved list based on the following:<br><br>${duplicateMessages.join('<br>')}<br><br>Please verify if this is a new application or a duplicate entry.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway (Manual Override)',
                    cancelButtonText: 'Cancel & Review',
                    reverseButtons: true
                }).then((duplicateResult) => {
                    if (duplicateResult.isConfirmed) {
                        Swal.fire('Proceeding', 'Proceeding with scheduling despite potential duplicate warning.', 'info');
                        handleScheduleConfirmation(scheduledDateTime, currentVolunteerKey, currentVolunteerData);
                    } else {
                        Swal.fire('Cancelled', 'Scheduling cancelled for review.', 'info');
                        hideScheduleModal();
                    }
                });
                return;
            }
            handleScheduleConfirmation(scheduledDateTime, currentVolunteerKey, currentVolunteerData);
        } catch (error) {
            console.error("Error during duplicate check for approved volunteer:", error);
            Swal.fire('Error', 'Failed to perform duplicate check. Please try again.', 'error');
            hideScheduleModal();
        }
    });

    async function handleScheduleConfirmation(scheduledDateTime, volunteerKey, volunteerData) {
        Swal.fire({
            title: 'Confirm Schedule?',
            text: `Schedule volunteer for ${formatDate(new Date(scheduledDateTime).toISOString())}? An email will be sent.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Confirm!',
            customClass: {
                popup: 'custom-swal-popup-small',
                title: 'custom-swal-title',
                inputLabel: 'custom-swal-text',
                confirmButton: 'swal2-button-confirm-clean',
                cancelButton: 'swal2-button-cancel-clean'
            },
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
                    hideScheduleModal();
                    fetchPendingVolunteers();
                } catch (error) {
                    console.error("Error confirming schedule and approving volunteer: ", error);
                    Swal.fire('Error', 'Failed to schedule and approve volunteer. Please try again.', 'error');
                    hideScheduleModal();
                }
            } else {
                hideScheduleModal();
            }
        });
    }

    endorseABVNForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const selectedABVNR = document.querySelector('input[name="selectedABVN"]:checked');
        if (!selectedABVNR) {
            Swal.fire('Error', 'Please select an ABVN to endorse to.', 'error');
            return;
        }
        if (!currentVolunteerKey || !currentVolunteerData) {
            Swal.fire('Error', 'No volunteer selected for endorsement.', 'error');
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
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Endorse!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const abvnSnapshot = await database.ref(`volunteerGroups/${abvnKey}`).once('value');
                    const abvnGroupData = abvnSnapshot.val();
                    if (!abvnGroupData) {
                        Swal.fire('Error', 'Selected ABVN group details not found.', 'error');
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
                    Swal.fire('Endorsed!', 'Volunteer has been endorsed to the selected ABVN group, and an endorsement email sent.', 'success');
                    hideEndorseABVNModal();
                } catch (error) {
                    console.error("Error endorsing volunteer to ABVN: ", error);
                    Swal.fire('Error', 'Failed to endorse volunteer. Please try again.', 'error');
                    hideEndorseABVNModal();
                }
            } else {
                hideEndorseABVNModal();
            }
        });
    });

    async function handleEndorsementProcess() {
        const volunteerEmail = currentVolunteerData.email;
        const volunteerMobile = currentVolunteerData.mobileNumber;
        const volunteerFullName = getFullName(currentVolunteerData).toLowerCase();
        if (!volunteerEmail && !volunteerMobile && !volunteerFullName) {
            Swal.fire('Error', 'Volunteer data is missing crucial information (email, mobile, full name). Cannot perform duplicate check for endorsement.', 'error');
            resetCurrentVolunteer();
            return;
        }
        try {
            const abvnGroupsRef = database.ref('volunteerGroups');
            let duplicateMessages = [];
            let isAlreadyEndorsedToAnABVN = false;
            const allAbvnSnapshot = await abvnGroupsRef.once('value');
            let allEndorsedVolunteersData = [];
            if (allAbvnSnapshot.exists()) {
                allAbvnSnapshot.forEach(abvnGroupChild => {
                    const groupData = abvnGroupChild.val();
                    const groupName = groupData.organization || abvnGroupChild.key;
                    const endorsedVolunteers = abvnGroupChild.child('endorsedVolunteers').val();
                    if (endorsedVolunteers) {
                        for (const volKey in endorsedVolunteers) {
                            if (volKey !== currentVolunteerKey) {
                                allEndorsedVolunteersData.push({
                                    key: volKey,
                                    endorsedGroupName: groupName,
                                    ...endorsedVolunteers[volKey]
                                });
                            } else {
                                isAlreadyEndorsedToAnABVN = true;
                                duplicateMessages.push(`• This exact volunteer application (key: ${currentVolunteerKey}) is already endorsed to: <strong>${groupName}</strong>`);
                            }
                        }
                    }
                });
            }
            console.log('Duplicate Messages:', duplicateMessages);
            console.log('All Endorsed Volunteers:', allEndorsedVolunteersData);
            if (isAlreadyEndorsedToAnABVN) {
                Swal.fire({
                    title: 'Volunteer Already Endorsed!',
                    html: `This volunteer application appears to be already endorsed.<br><br>${duplicateMessages.join('<br>')}<br><br>Are you sure you want to proceed? This will re-endorse them.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway (Manual Override)',
                    cancelButtonText: 'Cancel & Review',
                    reverseButtons: true
                }).then((duplicateResult) => {
                    if (duplicateResult.isConfirmed) {
                        Swal.fire('Proceeding', 'Proceeding with endorsement despite previous record.', 'info');
                        showEndorseABVNModal();
                    } else {
                        Swal.fire('Cancelled', 'Endorsement cancelled for review.', 'info');
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
                    isAlreadyEndorsedToAnABVN = true;
                    duplicateMessages.push(`• Email Address (found in ABVN Group: ${emailDuplicate.endorsedGroupName})`);
                }
            }
            if (volunteerMobile) {
                const mobileDuplicate = allEndorsedVolunteersData.find(ev =>
                    (ev.mobileNumber || '') === volunteerMobile
                );
                if (mobileDuplicate) {
                    isAlreadyEndorsedToAnABVN = true;
                    duplicateMessages.push(`• Mobile Number (found in ABVN Group: ${mobileDuplicate.endorsedGroupName})`);
                }
            }
            if (volunteerFullName) {
                const nameDuplicate = allEndorsedVolunteersData.find(ev =>
                    getFullName(ev).toLowerCase() === volunteerFullName
                );
                if (nameDuplicate) {
                    isAlreadyEndorsedToAnABVN = true;
                    duplicateMessages.push(`• Full Name (found in ABVN Group: ${nameDuplicate.endorsedGroupName})`);
                }
            }
            if (isAlreadyEndorsedToAnABVN) {
                Swal.fire({
                    title: 'Possible Duplicate Volunteer Detected in Endorsed ABVN Groups!',
                    html: `This volunteer might already exist in an endorsed ABVN group based on the following:<br><br>${duplicateMessages.join('<br>')}<br><br>Please verify if this is a new endorsement or a duplicate entry.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Proceed Anyway (Manual Override)',
                    cancelButtonText: 'Cancel & Review',
                    reverseButtons: true
                }).then((duplicateResult) => {
                    if (duplicateResult.isConfirmed) {
                        Swal.fire('Proceeding', 'Proceeding with endorsement despite potential duplicate warning.', 'info');
                        showEndorseABVNModal();
                    } else {
                        Swal.fire('Cancelled', 'Endorsement cancelled for review.', 'info');
                        hideEndorseABVNModal();
                    }
                });
                return;
            }
            showEndorseABVNModal();
        } catch (endorseCheckError) {
            console.error("Error during duplicate check for endorsed volunteer:", endorseCheckError);
            Swal.fire('Error', 'Failed to perform endorsement duplicate check. Please try again.', 'error');
            hideEndorseABVNModal();
        }
    }

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
            Swal.fire('Email Error', 'Failed to send confirmation email. Please try again.', 'error');
        }
    }

    async function sendEndorsementEmail(volunteer, abvnGroup) {
        if (!volunteer || !volunteer.email || !abvnGroup || !abvnGroup.email) {
            console.error("Cannot send endorsement email: Missing volunteer or ABVN group email.");
            Swal.fire('Error', 'Missing volunteer or ABVN group email. Cannot send endorsement.', 'error');
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
            volunteer_additional_info: volunteer.additionalInfo || 'N/A',
        };
        try {
            const response = await emailjs.send('service_gupgjog', 'template_5ndnhco', templateParams);
            console.log('Endorsement email successfully sent!', response.status, response.text);
            Swal.fire('Endorsement Sent!', 'Endorsement email has been sent to the ABVN group.', 'success');
        } catch (error) {
            console.error('Failed to send endorsement email:', error);
            Swal.fire('Email Error', 'Failed to send endorsement email. Please try again.', 'error');
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