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

let auth, database;
try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
} catch (error) {
    Swal.fire('Error', 'Failed to initialize Firebase. Please check your configuration.', 'error');
}

let data = [];
let filteredData = [];
const ROWS_PER_PAGE = 5;
let currentPage = 1;
let userRole, userUid;

// DOM Elements
const tableBody = document.querySelector("#logTable tbody");
const entriesInfo = document.querySelector("#entriesInfo");
const paginationContainer = document.querySelector("#pagination");
const searchInput = document.querySelector("#searchInput");
const clearSearchBtn = document.querySelector("#clearSearchBtn");
const roleFilter = document.querySelector("#roleFilter");
const actionFilter = document.querySelector("#actionFilter");
const logDetailsModal = document.querySelector("#logDetailsModal");
const closeLogModalBtn = document.querySelector("#closeLogModalBtn");
const logDetailsContent = document.querySelector("#logDetailsContent");
const userDataToggle = document.querySelector("#userDataToggle");
const userDataContent = document.querySelector("#userDataContent");
const dbSummaryContent = document.querySelector("#dbSummaryContent");

// Utility Function to Get Most Common Action
function getMostCommonAction(logs) {
    const actionCount = {};
    logs.forEach(log => {
        actionCount[log.action] = (actionCount[log.action] || 0) + 1;
    });
    return Object.keys(actionCount).reduce((a, b) => actionCount[a] > actionCount[b] ? a : b, "");
}

// Initialize Application
function initActivityLogs() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: "error",
                title: "Authentication Required",
                text: "Please sign in to access activity logs.",
                timer: 2000,
                showConfirmButton: false,
            }).then(() => (window.location.href = "../pages/login.html"));
            return;
        }

        userUid = user.uid;
        database.ref(`users/${userUid}`).once("value", snapshot => {
            const userData = snapshot.val();
            if (!userData || userData.adminPosition !== "Super Admin") {
                Swal.fire({
                    icon: "error",
                    title: "Access Denied",
                    text: "Only Super Admin can access this page.",
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                }).then(() => (window.location.href = "../pages/dashboard.html"));
                return;
            }
            userRole = userData.role;
            setupRealtimeListeners();
            setupFilters();
            setupUserDataToggle();
        });
    });
}

// Toggle User Data Section
function setupUserDataToggle() {
    userDataToggle.addEventListener("click", () => {
        document.querySelector(".user-data-analysis").classList.toggle("expanded");
    });
}

// Setup Realtime Listeners for All Nodes
function setupRealtimeListeners() {
    const nodesToMonitor = [
        "activity_logs",
        "posts",
        "comments",
        "approvedVolunteerApplications",
        "deletedEndorsedVolunteerApplications",
        "deletedVolunteerGroups",
        "deletedDonations",
        "notifications",
        "donationreports",
        "pendingInkind",
        "rdana",
        "reliefRequests",
        "requestRelief",
        "users",
    ];

    nodesToMonitor.forEach(node => {
        const ref = database.ref(node);

        // Handle new entries
        ref.on("child_added", async (snapshot) => {
            const entry = snapshot.val();
            const key = snapshot.key;
            const log = await processLogEntry(node, key, entry);
            if (log && !data.some(d => d.id === key && d.source === node)) {
                data.push(log);
                data.sort((a, b) => b.timestamp - a.timestamp);
                applySearchAndSort();
            }
        });

        // Handle updated entries
        ref.on("child_changed", async (snapshot) => {
            const entry = snapshot.val();
            const key = snapshot.key;
            const log = await processLogEntry(node, key, entry);
            if (log) {
                const index = data.findIndex(d => d.id === key && d.source === node);
                if (index !== -1) {
                    data[index] = log;
                } else {
                    data.push(log);
                }
                data.sort((a, b) => b.timestamp - a.timestamp);
                applySearchAndSort();
            }
        });

        // Handle deleted entries
        ref.on("child_removed", (snapshot) => {
            const key = snapshot.key;
            data = data.filter(d => !(d.id === key && d.source === node));
            applySearchAndSort();
        });
    });
}

// Process Log Entry
async function processLogEntry(node, key, entry) {
    try {
        let action, details, userName, role, userUid, timestamp;
        switch (node) {
            case "activity_logs":
                action = entry.action || "N/A";
                details = entry.details || "None";
                userName = entry.userName || "Unknown";
                role = entry.role || "N/A";
                userUid = entry.userUid || "";
                timestamp = entry.timestamp || 0;
                break;
            case "posts":
                action = entry.isShared ? "Share Post" : "Create Post";
                details = `${entry.title || ''} in ${entry.category || 'Uncategorized'}`;
                userName = entry.userName || "Unknown";
                userUid = entry.userId || "";
                role = (await database.ref(`users/${userUid}`).once("value")).val()?.role || "N/A";
                timestamp = entry.timestamp || 0;
                break;
            case "comments":
                action = "Comment";
                details = entry.text || "No content";
                userName = entry.userName || "Unknown";
                userUid = entry.userId || "";
                role = (await database.ref(`users/${userUid}`).once("value")).val()?.role || "N/A";
                timestamp = entry.timestamp || 0;
                break;
            case "approvedVolunteerApplications":
                action = "Approval";
                details = `Approved volunteer application for ${entry.contactPerson || 'Unknown'}`;
                const userSnap = await database.ref(`users/${entry.userId}`).once("value");
                const userData = userSnap.val() || {};
                userName = userData.contactPerson || `${userData.firstName || ''} ${userData.lastName || ''} ${userData.middleInitial || ''}`.trim() || "Unknown";
                userUid = entry.userId || "";
                role = userData.role || "N/A";
                timestamp = entry.timestamp || 0;
                break;
            case "deletedEndorsedVolunteerApplications":
            case "deletedVolunteerGroups":
            case "deletedDonations":
                action = "Delete";
                details = `Deleted ${node.split("deleted")[1].toLowerCase()} for ${entry.contactPerson || 'Unknown'}`;
                const delUserSnap = await database.ref(`users/${entry.userId}`).once("value");
                const delUserData = delUserSnap.val() || {};
                userName = delUserData.contactPerson || `${delUserData.firstName || ''} ${delUserData.lastName || ''} ${delUserData.middleInitial || ''}`.trim() || "Unknown";
                userUid = entry.userId || "";
                role = delUserData.role || "N/A";
                timestamp = entry.timestamp || 0;
                break;
            case "notifications":
                action = "Notification";
                details = entry.message || "No message";
                const notifUserSnap = await database.ref(`users/${entry.userId}`).once("value");
                const notifUserData = notifUserSnap.val() || {};
                userName = notifUserData.contactPerson || `${notifUserData.firstName || ''} ${notifUserData.lastName || ''} ${notifUserData.middleInitial || ''}`.trim() || "Unknown";
                userUid = entry.userId || "";
                role = notifUserData.role || "N/A";
                timestamp = entry.timestamp || 0;
                break;
            case "donationreports":
                action = "Donation Report";
                details = `Report by ${entry.contactPerson || 'Unknown'}`;
                const donUserSnap = await database.ref(`users/${entry.userId}`).once("value");
                const donUserData = donUserSnap.val() || {};
                userName = donUserData.contactPerson || `${donUserData.firstName || ''} ${donUserData.lastName || ''} ${donUserData.middleInitial || ''}`.trim() || "Unknown";
                userUid = entry.userId || "";
                role = donUserData.role || "N/A";
                timestamp = entry.timestamp || 0;
                break;
            case "pendingInkind":
                action = "Pending In-kind";
                details = `Pending in-kind by ${entry.contactPerson || 'Unknown'}`;
                const pendUserSnap = await database.ref(`users/${entry.userId}`).once("value");
                const pendUserData = pendUserSnap.val() || {};
                userName = pendUserData.contactPerson || `${pendUserData.firstName || ''} ${pendUserData.lastName || ''} ${pendUserData.middleInitial || ''}`.trim() || "Unknown";
                userUid = entry.userId || "";
                role = pendUserData.role || "N/A";
                timestamp = entry.timestamp || 0;
                break;
            case "rdana":
                action = "RDANA Update";
                details = `Update by ${entry.contactPerson || 'Unknown'}`;
                const rdanaUserSnap = await database.ref(`users/${entry.userId}`).once("value");
                const rdanaUserData = rdanaUserSnap.val() || {};
                userName = rdanaUserData.contactPerson || `${rdanaUserData.firstName || ''} ${rdanaUserData.lastName || ''} ${rdanaUserData.middleInitial || ''}`.trim() || "Unknown";
                userUid = entry.userId || "";
                role = rdanaUserData.role || "N/A";
                timestamp = entry.timestamp || 0;
                break;
            case "reliefRequests":
            case "requestRelief":
                action = "Relief Request";
                details = `Request by ${entry.contactPerson || 'Unknown'}`;
                const relUserSnap = await database.ref(`users/${entry.userId}`).once("value");
                const relUserData = relUserSnap.val() || {};
                userName = relUserData.contactPerson || `${relUserData.firstName || ''} ${relUserData.lastName || ''} ${relUserData.middleInitial || ''}`.trim() || "Unknown";
                userUid = entry.userId || "";
                role = relUserData.role || "N/A";
                timestamp = entry.timestamp || 0;
                break;
            case "users":
                action = entry.lastLogin ? "Login" : entry.lastLogout ? "Logout" : "User Update";
                details = `${action === "Login" ? "Last login" : action === "Logout" ? "Last logout" : "Profile update"} at ${new Date(entry.lastLogin || entry.lastLogout || Date.now()).toLocaleString()}`;
                userName = entry.contactPerson || `${entry.firstName || ''} ${entry.lastName || ''} ${entry.middleInitial || ''}`.trim() || "Unknown";
                role = entry.role || "N/A";
                userUid = key;
                timestamp = entry.lastLogin || entry.lastLogout || Date.now();
                break;
            default:
                action = "Unknown Action";
                details = "No details available";
                userName = "Unknown";
                role = "N/A";
                userUid = "";
                timestamp = Date.now();
        }
        return { id: key, action, userName, role, timestamp, details, userUid, source: node };
    } catch (error) {
        return null;
    }
}

// Render Table
function renderTable(dataToRender = filteredData) {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageData = dataToRender.slice(start, end);

    if (pageData.length === 0 && searchInput.value.trim()) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No results found for your search.</td></tr>';
    } else if (pageData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No activity logs to display.</td></tr>';
    }

    pageData.forEach((log, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${start + index + 1}</td>
            <td>${log.action}</td>
            <td>${log.userName}</td>
            <td>${log.role}</td>
            <td>${new Date(log.timestamp).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</td>
            <td>${log.details}</td>
        `;
        tr.addEventListener("click", () => showLogDetails(log));
        tableBody.appendChild(tr);
    });

    updateEntriesInfo(dataToRender.length);
    renderPagination(dataToRender.length);
}

// Update Pagination Info
function updateEntriesInfo(totalItems) {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = Math.min(startIndex + ROWS_PER_PAGE, totalItems);
    entriesInfo.textContent = `Showing ${totalItems ? startIndex + 1 : 0} to ${endIndex} of ${totalItems} entries`;
}

// Render Pagination Controls
function renderPagination(totalRows) {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE);
    if (totalPages === 0) return;

    const createButton = (label, page, disabled = false, active = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add("active-page");
        btn.addEventListener("click", () => {
            currentPage = page;
            renderTable();
        });
        return btn;
    };

    paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    if (endPage - startPage < maxPages - 1) startPage = Math.max(1, endPage - maxPages + 1);

    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }
    paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
}

// Apply Filters and Search
function applySearchAndSort() {
    let currentData = [...data];

    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        currentData = currentData.filter(log =>
            [log.action, log.userName, log.role, new Date(log.timestamp).toLocaleString(), log.details]
                .some(field => field.toString().toLowerCase().includes(searchTerm))
        );
    }

    const roleValue = roleFilter.value;
    if (roleValue !== "all") currentData = currentData.filter(log => log.role === roleValue);

    const actionValue = actionFilter.value;
    if (actionValue !== "all") currentData = currentData.filter(log => log.action.toLowerCase().includes(actionValue.toLowerCase()));

    filteredData = currentData;
    currentPage = 1;
    renderTable();
}

// Setup Event Listeners
function setupFilters() {
    let debounceTimer;
    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            applySearchAndSort();
            clearSearchBtn.style.display = searchInput.value.trim() ? "flex" : "none";
        }, 300);
    });

    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        roleFilter.value = "all";
        actionFilter.value = "all";
        applySearchAndSort();
    });

    [roleFilter, actionFilter].forEach(filter => filter.addEventListener("change", applySearchAndSort));
    closeLogModalBtn.addEventListener("click", () => (logDetailsModal.style.display = "none"));
    window.addEventListener("click", e => e.target === logDetailsModal && (logDetailsModal.style.display = "none"));
}

// Display Log Details
function showLogDetails(log) {
    logDetailsContent.innerHTML = `
        <p><strong>Action:</strong> ${log.action}</p>
        <p><strong>User:</strong> ${log.userName} (${log.role})</p>
        <p><strong>Timestamp:</strong> ${new Date(log.timestamp).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</p>
        <p><strong>Details:</strong> ${log.details}</p>
        <p><strong>Source:</strong> ${log.source}</p>
    `;
    logDetailsModal.style.display = "flex";
}

// Start Application
document.addEventListener("DOMContentLoaded", initActivityLogs);