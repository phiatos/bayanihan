// activationOverview.js
// Firebase configuration
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM elements
const totalActivations = document.getElementById("total-activations");
const activeMissions = document.getElementById("active-missions");
const completedMissions = document.getElementById("completed-missions");
const deactivatedMissions = document.getElementById("deactivated-missions");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const missionTypeFilter = document.getElementById("mission-type-filter");
const activationTableBody = document.getElementById("activation-table");
const groupedActivationsContainer = document.getElementById("grouped-activations");
const previewModal = document.getElementById("previewModal");
const closeModal = document.getElementById("closeModal");
const modalContent = document.getElementById("modalContent");

// Data storage
let allActivations = [];
let volunteerGroups = [];
let users = [];
const calamityTypes = ["Typhoon", "Earthquake", "Flood", "Volcanic Eruption", "Landslide", "Tsunami"];
let currentPage = 1;
const rowsPerPage = 5;

// Inactivity timer
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes

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

// Set up inactivity listeners
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

// Auth state listener
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const userSnapshot = await database.ref('users/' + user.uid).once('value');
            const userData = userSnapshot.val();
            const passwordNeedsReset = userData ? (userData.password_needs_reset || false) : false;

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
                    window.location.replace("../pages/profile.html");
                });
                return;
            }
            resetInactivityTimer();
            listenForDataUpdates();
        } catch (error) {
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
                window.location.replace("../pages/login.html");
            });
        }
    } else {
        try {
            await firebase.auth().signInAnonymously();
            resetInactivityTimer();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: `Failed to authenticate: ${error.message}. Please check your network and Firebase configuration.`,
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
});

// Populate mission type filter
function populateMissionTypeFilter() {
    missionTypeFilter.innerHTML = '<option value="">All Mission Types</option>' +
        calamityTypes.map(type => `<option value="${type}">${type}</option>`).join("");
}

// Render grouped activations (new feature)
function renderGroupedActivations() {
    const activeActivations = allActivations.filter(a => a.status === "active");
    if (activeActivations.length === 0) {
        groupedActivationsContainer.innerHTML = '<h3>Active Activations by Calamity</h3><p>No active activations to display.</p>';
        return;
    }

    const groups = new Map();
    activeActivations.forEach(activation => {
        const key = `${activation.calamityType} (${activation.calamityName})`;
        if (!groups.has(key)) {
            groups.set(key, new Set());
        }
        groups.get(key).add(activation.organization);
    });

    let html = '<h3>Active Activations by Calamity</h3>';
    groups.forEach((abvns, calamityKey) => {
        html += `
            <div class="grouped-item">
                <h4>${calamityKey}</h4>
                <ul class="abvn-list">
                    ${Array.from(abvns).map(abvn => `<li>${abvn}</li>`).join('')}
                </ul>
            </div>
        `;
    });

    groupedActivationsContainer.innerHTML = html;
}

// Fetch and listen for data updates
function listenForDataUpdates() {
    // Fetch volunteer groups
    database.ref("volunteerGroups").on("value", snapshot => {
        volunteerGroups = [];
        const fetchedGroups = snapshot.val();
        if (fetchedGroups) {
            for (let key in fetchedGroups) {
                const groupData = fetchedGroups[key];
                const addressData = groupData.address || {};
                let combinedAddress = addressData.formattedAddress || "Not specified";
                if (!addressData.formattedAddress && addressData) {
                    const addressParts = [];
                    if (addressData.region) addressParts.push(addressData.region.trim());
                    if (addressData.province) addressParts.push(addressData.province.trim());
                    if (addressData.city) addressParts.push(addressData.city.trim());
                    if (addressData.streetAddress) addressParts.push(addressData.streetAddress.trim());
                    if (addressParts.length > 0) combinedAddress = addressParts.join(', ');
                }
                volunteerGroups.push({
                    no: key,
                    organization: groupData.organization || "Unknown",
                    hq: combinedAddress,
                    contactPerson: groupData.contactPerson || "Unknown",
                    email: groupData.email || "Not specified",
                    mobileNumber: groupData.mobileNumber || "Not specified"
                });
            }
            volunteerGroups.sort((a, b) => a.no.localeCompare(b.no));
        }
        updateDashboard();
        renderGroupedActivations();
        renderTable();
    });

    // Fetch users (for ABVN names)
    database.ref("users").on("value", snapshot => {
        users = [];
        const fetchedUsers = snapshot.val();
        if (fetchedUsers) {
            for (let key in fetchedUsers) {
                const userData = fetchedUsers[key];
                if (userData.role === "ABVN") {
                    users.push({
                        uid: key,
                        organization: userData.organization || "Unknown",
                        name: userData.name || "Unknown"
                    });
                }
            }
        }
        renderGroupedActivations();
        renderTable();
    });

    // Fetch activations (active and history)
    database.ref("activations").on("value", snapshot => {
        allActivations = [];
        const fetchedActivations = snapshot.val();
        if (fetchedActivations) {
            for (let key in fetchedActivations) {
                if (key !== "activationHistory") {
                    const activation = fetchedActivations[key];
                    const volunteerGroup = volunteerGroups.find(group => group.no === String(activation.groupId));
                    const abvn = users.find(user => user.organization === activation.organization);
                    allActivations.push({
                        id: key,
                        no: activation.no || 0,
                        groupId: activation.groupId,
                        organization: activation.organization || "Unknown",
                        calamityType: activation.calamityType || "Unknown",
                        calamityName: activation.calamityName || "Unknown",
                        status: activation.status || "active",
                        activationDate: activation.activationDate,
                        areaOfOperation: activation.areaOfOperation || "N/A",
                        completedBy: activation.completedBy || "N/A"
                    });
                }
            }
        }
        // Fetch activation history
        database.ref("activations/activationHistory").on("value", historySnapshot => {
            const fetchedHistory = historySnapshot.val();
            if (fetchedHistory) {
                for (let key in fetchedHistory) {
                    const activation = fetchedHistory[key];
                    const volunteerGroup = volunteerGroups.find(group => group.no === String(activation.groupId));
                    const abvn = users.find(user => user.organization === activation.organization);
                    allActivations.push({
                        id: key,
                        no: activation.no || 0,
                        groupId: activation.groupId,
                        organization: activation.organization || "Unknown",
                        calamityType: activation.calamityType || "Unknown",
                        calamityName: activation.calamityName || "Unknown",
                        status: activation.status || "inactive",
                        activationDate: activation.activationDate,
                        areaOfOperation: activation.areaOfOperation || "N/A",
                        completedBy: activation.completedBy || "Admin"
                    });
                }
            }
            updateDashboard();
            renderGroupedActivations();
            renderTable();
        });
    });
}

// Update dashboard cards
function updateDashboard() {
    const total = allActivations.length;
    const active = allActivations.filter(a => a.status === "active").length;
    const completed = allActivations.filter(a => a.status === "inactive" && a.completedBy === "ABVN").length;
    const deactivated = allActivations.filter(a => a.status === "inactive" && a.completedBy === "Admin").length;

    totalActivations.textContent = total;
    activeMissions.textContent = active;
    completedMissions.textContent = completed;
    deactivatedMissions.textContent = deactivated;
}

// Render table with pagination
function renderTable() {
    const filteredData = filterAndSort();
    activationTableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);

    if (pageData.length === 0 && filteredData.length > 0 && currentPage > 1) {
        currentPage--;
        renderTable();
        return;
    } else if (pageData.length === 0) {
        activationTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">No activations to display.</td></tr>`;
    }

    pageData.forEach((row, index) => {
        const displayNumber = start + index + 1;
        const date = new Date(row.activationDate);
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString();
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${displayNumber}</td>
            <td>${row.calamityName}</td>
            <td>${row.organization}</td>
            <td>${row.calamityType}</td>
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td><span class="status-circle ${row.status === "active" ? "green" : "gray"}"></span> ${row.status === "active" ? "Active" : "Inactive"}</td>
            <td><button class="viewBtn" data-id="${row.id}"><i class='bx bx-show'></i></button></td>
        `;
        activationTableBody.appendChild(tr);
    });

    renderPagination(filteredData.length);
}

// Render pagination
function renderPagination(totalRows) {
    const paginationContainer = document.createElement("div");
    paginationContainer.className = "pagination";
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const maxVisible = 5;

    const createButton = (label, page = null, disabled = false, active = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add("active-page");
        if (page !== null) {
            btn.addEventListener("click", () => {
                currentPage = page;
                renderTable();
            });
        }
        return btn;
    };

    if (totalPages === 0) return;

    paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }

    paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));

    const existingPagination = document.querySelector(".pagination");
    if (existingPagination) {
        existingPagination.replaceWith(paginationContainer);
    } else {
        document.querySelector(".table-container").appendChild(paginationContainer);
    }
}

// Filter and sort data
function filterAndSort() {
    let filtered = allActivations.filter(row => {
        const query = searchInput.value.trim().toLowerCase();
        const status = statusFilter.value;
        const missionType = missionTypeFilter.value;

        const matchesQuery = query ? (
            row.calamityName.toLowerCase().includes(query) ||
            row.organization.toLowerCase().includes(query)
        ) : true;

        const matchesStatus = status ? row.status === status : true;
        const matchesMissionType = missionType ? row.calamityType === missionType : true;

        return matchesQuery && matchesStatus && matchesMissionType;
    });

    filtered.sort((a, b) => new Date(b.activationDate) - new Date(a.activationDate));
    return filtered;
}

// Open modal with activation details
function openModal(activationId) {
    const activation = allActivations.find(a => a.id === activationId);
    if (!activation) return;

    const volunteerGroup = volunteerGroups.find(g => g.no === String(activation.groupId));
    modalContent.innerHTML = `
        <h2>${activation.calamityName}</h2>
        <p><strong>Organization:</strong> ${activation.organization}</p>
        <p><strong>Mission Type:</strong> ${activation.calamityType}</p>
        <p><strong>Area of Operation:</strong> ${activation.areaOfOperation}</p>
        <p><strong>Activation Date:</strong> ${new Date(activation.activationDate).toLocaleString()}</p>
        <p><strong>Status:</strong> ${activation.status === "active" ? "Active" : "Inactive"}</p>
        <p><strong>Completed By:</strong> ${activation.completedBy}</p>
        <p><strong>HQ:</strong> ${volunteerGroup ? volunteerGroup.hq : "N/A"}</p>
        <p><strong>Contact Person:</strong> ${volunteerGroup ? volunteerGroup.contactPerson : "N/A"}</p>
        <p><strong>Email:</strong> ${volunteerGroup ? volunteerGroup.email : "N/A"}</p>
        <p><strong>Mobile Number:</strong> ${volunteerGroup ? volunteerGroup.mobileNumber : "N/A"}</p>
    `;
    previewModal.style.display = "flex";
}

// Close modal
function closeModalFn() {
    previewModal.style.display = "none";
    modalContent.innerHTML = "";
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    populateMissionTypeFilter();

    searchInput.addEventListener("input", () => {
        currentPage = 1;
        renderTable();
    });

    statusFilter.innerHTML = `
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
    `;

    statusFilter.addEventListener("change", () => {
        currentPage = 1;
        renderTable();
    });

    missionTypeFilter.addEventListener("change", () => {
        currentPage = 1;
        renderTable();
    });

    closeModal.addEventListener("click", closeModalFn);

    window.addEventListener("click", (event) => {
        if (event.target === previewModal) {
            closeModalFn();
        }
    });

    activationTableBody.addEventListener("click", (e) => {
        const btn = e.target.closest(".viewBtn");
        if (btn) {
            const activationId = btn.getAttribute("data-id");
            openModal(activationId);
        }
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    database.ref("activations").off();
    database.ref("volunteerGroups").off();
    database.ref("users").off();
    database.ref("activations/activationHistory").off();
});