if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not loaded. Please ensure Firebase scripts are included.");
}

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

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
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
const calamityNameFilter = document.getElementById("calamity-name-filter");
const activationTableBody = document.getElementById("activation-table");
const groupedActivationsContainer = document.getElementById("grouped-activations");
const previewModal = document.getElementById("previewModal");
const closeModal = document.getElementById("closeModal");
const modalContent = document.getElementById("modalContent");
const mapModal = document.getElementById("mapModal");
const closeMapModal = document.getElementById("closeMapModal");
const activationChartCanvas = document.getElementById("activationChart");

// Data storage
let allActivations = [];
let volunteerGroups = [];
let users = [];
let allCalamities = [];
let map, markers = [];
const calamityTypes = ["Typhoon", "Earthquake", "Flood", "Volcanic Eruption", "Landslide", "Tsunami"];
let currentPage = 1;
const rowsPerPage = 5;
let activationChart = null;
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes

// Cleanup function for tab switching
function cleanup() {
    database.ref("activations").off();
    database.ref("volunteerGroups").off();
    database.ref("users").off();
    database.ref("activations/activationHistory").off();
    database.ref("activations/calamities").off();
    if (activationChart) {
        activationChart.destroy();
        activationChart = null;
    }
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    clearTimeout(inactivityTimeout);
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.removeEventListener(eventType, resetInactivityTimer);
    });
}

// Check if running in dashboard context
const isDashboardContext = !!document.getElementById("tab-content");

// Inactivity timer
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
function setupInactivityListeners() {
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });
}

// Initialize Google Map
function initMap(latitude = 14.5995, longitude = 120.9842, formattedAddress = "Manila, Philippines") {
    const location = { lat: latitude, lng: longitude };
    map = new google.maps.Map(document.getElementById("mapContainer"), {
        center: location,
        zoom: 16,
        mapTypeId: "roadmap",
        restriction: {
            latLngBounds: {
                north: 21.0,
                south: 4.0,
                east: 127.0,
                west: 116.0
            },
            strictBounds: true
        }
    });

    markers.forEach(marker => marker.setMap(null));
    markers = [];

    const marker = new google.maps.Marker({
        position: location,
        map: map,
        title: formattedAddress
    });
    markers.push(marker);

    const infowindow = new google.maps.InfoWindow({
        content: `<strong>${formattedAddress}</strong>`
    });
    marker.addListener("click", () => {
        infowindow.open(map, marker);
    });
    infowindow.open(map, marker);
}

// Populate mission type filter
function populateMissionTypeFilter() {
    if (missionTypeFilter) {
        missionTypeFilter.innerHTML = '<option value="">All Mission Types</option>' +
            calamityTypes.map(type => `<option value="${type}">${type}</option>`).join("");
    }
}

// Populate calamity name filter
function populateCalamityNameFilter() {
    if (calamityNameFilter) {
        calamityNameFilter.innerHTML = '<option value="">All Calamity Names</option>' +
            allCalamities.map(calamity => `<option value="${calamity.name}">${calamity.name} (${calamity.type})</option>`).join("");
    }
}

// Render grouped activations
function renderGroupedActivations() {
    if (!groupedActivationsContainer) return;
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

// Render activation timeline chart
function renderActivationChart() {
    if (!activationChartCanvas) return;
    const filteredData = filterAndSort();
    const activeActivations = filteredData.filter(a => a.status === "active");
    const calamityCounts = {};
    calamityTypes.forEach(type => {
        calamityCounts[type] = activeActivations.filter(a => a.calamityType === type).length;
    });

    const data = {
        labels: calamityTypes,
        datasets: [{
            label: 'Active Activations by Calamity Type',
            data: calamityTypes.map(type => calamityCounts[type]),
            backgroundColor: '#FA3B99',
            borderColor: '#FA3B99',
            borderWidth: 1
        }]
    };

    if (activationChart) {
        activationChart.destroy();
    }

    activationChart = new Chart(activationChartCanvas, {
        type: 'bar',
        data: data,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Active Activations'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Calamity Type'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
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
                    if (addressData.region && addressData.region.trim() !== '') addressParts.push(addressData.region.trim());
                    if (addressData.province && addressData.province.trim() !== '') addressParts.push(addressData.province.trim());
                    if (addressData.city && addressData.city.trim() !== '') addressParts.push(addressData.city.trim());
                    if (addressData.streetAddress && addressData.streetAddress.trim() !== '') addressParts.push(addressData.streetAddress.trim());
                    if (addressParts.length > 0) combinedAddress = addressParts.join(', ');
                }
                volunteerGroups.push({
                    no: key,
                    organization: groupData.organization || "Unknown",
                    hq: combinedAddress,
                    address: addressData,
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
        renderActivationChart();
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

    // Fetch calamities
    database.ref("activations/calamities").on("value", snapshot => {
        allCalamities = [];
        const fetchedCalamities = snapshot.val();
        if (fetchedCalamities) {
            for (let key in fetchedCalamities) {
                const calamityData = fetchedCalamities[key];
                allCalamities.push({
                    id: key,
                    name: calamityData.name || "Unknown",
                    type: calamityData.type || "Unknown",
                    createdAt: calamityData.createdAt || "N/A"
                });
            }
            allCalamities.sort((a, b) => a.name.localeCompare(b.name));
        }
        populateCalamityNameFilter();
        renderGroupedActivations();
        renderTable();
        renderActivationChart();
    });

    // Fetch activations (active and history)
    database.ref("activations").on("value", snapshot => {
        allActivations = [];
        const fetchedActivations = snapshot.val();
        if (fetchedActivations) {
            for (let key in fetchedActivations) {
                if (key === "calamities" || key === "activationHistory") continue;
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
                    areaOfOperation: activation.address?.formattedAddress || activation.areaOfOperation || "N/A",
                    latitude: activation.address?.latitude || null,
                    longitude: activation.address?.longitude || null,
                    completedBy: activation.completedBy || (activation.status === "inactive" ? "Admin" : "N/A")
                });
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
                        areaOfOperation: activation.address?.formattedAddress || activation.areaOfOperation || "N/A",
                        latitude: activation.address?.latitude || null,
                        longitude: activation.address?.longitude || null,
                        completedBy: activation.completedBy || "Admin"
                    });
                }
            }
            updateDashboard();
            renderGroupedActivations();
            renderTable();
            renderActivationChart();
        });
    });
}

// Update dashboard cards
function updateDashboard() {
    if (!totalActivations || !activeMissions || !completedMissions || !deactivatedMissions) return;
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
    if (!activationTableBody) return;
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
        const hasLocation = row.latitude && row.longitude;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${displayNumber}</td>
            <td>${row.calamityName}</td>
            <td>${row.organization}</td>
            <td>${row.calamityType}</td>
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td><span class="status-circle ${row.status === "active" ? "green" : "gray"}"></span> ${row.status === "active" ? "Active" : "Inactive"}</td>
            <td>
                <button class="viewBtn" data-id="${row.id}"><i class='bx bx-show'></i></button>
                ${hasLocation ? `<button class="mapBtn" data-id="${row.id}" data-lat="${row.latitude}" data-lng="${row.longitude}" data-address="${row.areaOfOperation}"><i class='bx bx-map'></i></button>` : ''}
            </td>
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
        document.querySelector(".table-container")?.appendChild(paginationContainer);
    }
}

// Filter and sort data
function filterAndSort() {
    let filtered = allActivations.filter(row => {
        const query = searchInput?.value.trim().toLowerCase() || '';
        const status = statusFilter?.value || '';
        const missionType = missionTypeFilter?.value || '';
        const calamityName = calamityNameFilter?.value || '';

        const matchesQuery = query ? (
            row.calamityName.toLowerCase().includes(query) ||
            row.organization.toLowerCase().includes(query) ||
            row.areaOfOperation.toLowerCase().includes(query)
        ) : true;

        const matchesStatus = status ? row.status === status : true;
        const matchesMissionType = missionType ? row.calamityType === missionType : true;
        const matchesCalamityName = calamityName ? row.calamityName === calamityName : true;

        return matchesQuery && matchesStatus && matchesMissionType && matchesCalamityName;
    });

    filtered.sort((a, b) => new Date(b.activationDate) - new Date(a.activationDate));
    return filtered;
}

// Open modal with activation details
function openModal(activationId) {
    if (!previewModal || !modalContent) return;
    const activation = allActivations.find(a => a.id === activationId);
    if (!activation) return;

    const volunteerGroup = volunteerGroups.find(g => g.no === String(activation.groupId));
    const calamity = allCalamities.find(c => c.name === activation.calamityName);
    modalContent.innerHTML = `
        <h2>${activation.calamityName}</h2>
        <p><strong>Organization:</strong> ${activation.organization}</p>
        <p><strong>Mission Type:</strong> ${activation.calamityType}</p>
        <p><strong>Area of Operation:</strong> ${activation.areaOfOperation}</p>
        <p><strong>Coordinates:</strong> ${activation.latitude ? `Lat: ${activation.latitude}, Lng: ${activation.longitude}` : "N/A"}</p>
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

// Open map modal
function openMapModal(activationId) {
    if (!mapModal) return;
    const activation = allActivations.find(a => a.id === activationId);
    if (!activation || !activation.latitude || !activation.longitude) {
        Swal.fire({
            icon: 'warning',
            title: 'No Location Available',
            text: 'This activation does not have valid location data.',
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                htmlContainer: 'swal2-text-warning-clean',
                confirmButton: 'my-warning-button'
            }
        });
        return;
    }

    mapModal.style.display = "flex";
    initMap(activation.latitude, activation.longitude, activation.areaOfOperation);
}

// Close modals
function closeModalFn() {
    if (previewModal && modalContent) {
        previewModal.style.display = "none";
        modalContent.innerHTML = "";
    }
}

function closeMapModalFn() {
    if (mapModal) {
        mapModal.style.display = "none";
        markers.forEach(marker => marker.setMap(null));
        markers = [];
    }
}

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

// Event listeners
function setupEventListeners() {
    if (!document.getElementById("tab-content")) return; // Ensure running in dashboard context

    populateMissionTypeFilter();

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            currentPage = 1;
            renderTable();
            renderActivationChart();
        });
    }

    if (statusFilter) {
        statusFilter.innerHTML = `
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
        `;
        statusFilter.addEventListener("change", () => {
            currentPage = 1;
            renderTable();
            renderActivationChart();
        });
    }

    if (missionTypeFilter) {
        missionTypeFilter.addEventListener("change", () => {
            currentPage = 1;
            renderTable();
            renderActivationChart();
        });
    }

    if (calamityNameFilter) {
        calamityNameFilter.addEventListener("change", () => {
            currentPage = 1;
            renderTable();
            renderActivationChart();
        });
    }

    if (closeModal) {
        closeModal.addEventListener("click", closeModalFn);
    }

    if (closeMapModal) {
        closeMapModal.addEventListener("click", closeMapModalFn);
    }

    if (window) {
        window.addEventListener("click", (event) => {
            if (event.target === previewModal) {
                closeModalFn();
            } else if (event.target === mapModal) {
                closeMapModalFn();
            }
        });
    }

    if (activationTableBody) {
        activationTableBody.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            const activationId = btn.getAttribute("data-id");
            if (btn.classList.contains("viewBtn")) {
                openModal(activationId);
            } else if (btn.classList.contains("mapBtn")) {
                openMapModal(activationId);
            }
        });
    }

    // Setup mutation observer to cleanup when tab content is removed
    if (isDashboardContext) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (!document.getElementById("activation-table")) {
                    cleanup();
                    observer.disconnect();
                }
            });
        });
        observer.observe(document.getElementById("tab-content"), { childList: true, subtree: true });
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    setupInactivityListeners();
    setupEventListeners();
});

// Expose cleanup for dashboard.js to call when switching tabs
window.cleanupActivationOverview = cleanup;