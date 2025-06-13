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
    console.log(`[${new Date().toISOString()}] Firebase initialized successfully`);
} catch (error) {
    console.error(`[${new Date().toISOString()}] Firebase initialization failed:`, error);
    Swal.fire('Error', 'Failed to initialize Firebase. Please check your configuration.', 'error');
}

const GEMINI_API_KEY = "AIzaSyDWv5Yh1VjKzP4pVIhyyr6hu54nlPvx61Y";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

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
            if (!userData || userData.role !== "AB ADMIN") {
                Swal.fire({
                    icon: "error",
                    title: "Access Denied",
                    text: "Only AB ADMIN can access this page.",
                    timer: 2000,
                    showConfirmButton: false,
                }).then(() => (window.location.href = "../pages/dashboard.html"));
                return;
            }
            userRole = userData.role;
            fetchAndRenderTable();
            setupFilters();
            setupUserDataToggle();
            startContinuousAnalysis();
        });
    });
}

// Toggle User Data Section
function setupUserDataToggle() {
    userDataToggle.addEventListener("click", () => {
        document.querySelector(".user-data-analysis").classList.toggle("expanded");
    });
}

// Analyze User Data
async function debugUserData(user) {
    try {
        const snapshot = await database.ref(`users/${user.uid}`).once("value");
        const userData = snapshot.val();
        const prompt = `
            You are Lenlen, a disaster tracking assistant. Analyze this user data and confirm if the user is set up correctly as an AB ADMIN:
            - UID: ${user.uid}
            - Data: ${JSON.stringify(userData)}
            Check for:
            - Role is "AB ADMIN"
            - Presence of name, email, and organization
            - Any missing or incorrect fields
            Provide the analysis in a structured format with <p><strong>Key:</strong> Value</p> tags for the summary, and include a detailed section with <p><strong>Detailed Analysis:</strong> [detailed text]</p>.
        `;
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();
        userDataContent.innerHTML = result.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("User data analysis failed:", error);
        userDataContent.innerHTML = `<p><strong>Status:</strong> Error - Failed to analyze user data: ${error.message}</p>`;
    }
}

// Summarize and Analyze Activities
async function analyzeActivities(logs) {
    try {
        const prompt = `
            You are Lenlen, a disaster tracking assistant. Analyze the following recent activity logs aggregated from all system nodes and provide a concise summary of all activities performed by AB ADMIN and ABVN users. Include:
            - Total number of logs: ${logs.length}
            - Number of logs by AB ADMIN: ${logs.filter(log => log.role === "AB ADMIN").length}
            - Number of logs by ABVN: ${logs.filter(log => log.role === "ABVN").length}
            - Most common action: ${getMostCommonAction(logs)}
            - Most recent activity timestamp: ${new Date(Math.max(...logs.map(log => log.timestamp))).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}
            - Current date and time: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour12: true })}
            Logs: ${logs.map(log => `- ${log.action} by ${log.userName} (${log.role}) at ${new Date(log.timestamp).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} with details: ${log.details} from ${log.source}`).join('\n')}
            Provide the analysis in a structured format with <p><strong>Key:</strong> Value</p> tags and a detailed section with <p><strong>Detailed Analysis:</strong> [detailed text]</p>. Highlight any unusual activity patterns or potential issues.
        `;
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();
        dbSummaryContent.innerHTML = result.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Activity analysis failed:", error);
        dbSummaryContent.innerHTML = `<p><strong>Status:</strong> Error - Failed to analyze activities: ${error.message}</p>`;
    }
}

// Start Continuous Analysis
function startContinuousAnalysis() {
    const logsRef = database.ref("activity_logs");
    logsRef.on("value", async (snapshot) => {
        const logs = snapshot.val() || {};
        const logArray = Object.entries(logs).map(([key, log]) => ({ key, ...log, source: "activity_logs" }));
        logArray.sort((a, b) => b.timestamp - a.timestamp);

        const logsToAnalyze = logArray.slice(0, Math.min(10, logArray.length));
        if (logsToAnalyze.length > 0) {
            await analyzeActivities(logsToAnalyze);
        }
    }, (error) => {
        console.error("Failed to fetch logs for analysis:", error);
        dbSummaryContent.innerHTML = `<p><strong>Status:</strong> Error - Failed to analyze logs: ${error.message}</p>`;
    });
}

// Fetch and Render Table Data from All Nodes
function fetchAndRenderTable() {
    const nodesToMonitor = [
        "activity_logs",
        "posts",
        "comments",
        "approvedVolunteerApplications",
        "deletedEndorsedVolunteerApplications",
        "deletedVolunteerGroups",
        "notifications",
        "deletedDonations",
        "donationreports",
        "pendingInkind",
        "rdana",
        "reliefRequests",
        "requestRelief",
        "users",
    ];

    data = [];
    nodesToMonitor.forEach(node => {
        database.ref(node).on("value", async snapshot => {
            const nodeData = snapshot.val() || {};
            const logEntries = Object.entries(nodeData).map(async ([key, entry]) => {
                let action, details, userName, role, userUid, timestamp;
                try {
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
                            userName = (await database.ref(`users/${entry.userId}`).once("value")).val()?.contactPerson || "Unknown";
                            userUid = entry.userId || "";
                            role = (await database.ref(`users/${userUid}`).once("value")).val()?.role || "N/A";
                            timestamp = entry.timestamp || 0;
                            break;
                        case "deletedEndorsedVolunteerApplications":
                        case "deletedVolunteerGroups":
                        case "deletedDonations":
                            action = "Delete";
                            details = `Deleted ${node.split("deleted")[1].toLowerCase()} for ${entry.contactPerson || 'Unknown'}`;
                            userName = (await database.ref(`users/${entry.userId}`).once("value")).val()?.contactPerson || "Unknown";
                            userUid = entry.userId || "";
                            role = (await database.ref(`users/${userUid}`).once("value")).val()?.role || "N/A";
                            timestamp = entry.timestamp || 0;
                            break;
                        case "notifications":
                            action = "Notification";
                            details = entry.message || "No message";
                            userName = (await database.ref(`users/${entry.userId}`).once("value")).val()?.contactPerson || "Unknown";
                            userUid = entry.userId || "";
                            role = (await database.ref(`users/${userUid}`).once("value")).val()?.role || "N/A";
                            timestamp = entry.timestamp || 0;
                            break;
                        case "donationreports":
                            action = "Donation Report";
                            details = `Report by ${entry.contactPerson || 'Unknown'}`;
                            userName = entry.contactPerson || "Unknown";
                            userUid = entry.userId || "";
                            role = (await database.ref(`users/${userUid}`).once("value")).val()?.role || "N/A";
                            timestamp = entry.timestamp || 0;
                            break;
                        case "pendingInkind":
                            action = "Pending In-kind";
                            details = `Pending in-kind by ${entry.contactPerson || 'Unknown'}`;
                            userName = entry.contactPerson || "Unknown";
                            userUid = entry.userId || "";
                            role = (await database.ref(`users/${userUid}`).once("value")).val()?.role || "N/A";
                            timestamp = entry.timestamp || 0;
                            break;
                        case "rdana":
                            action = "RDANA Update";
                            details = `Update by ${entry.contactPerson || 'Unknown'}`;
                            userName = entry.contactPerson || "Unknown";
                            userUid = entry.userId || "";
                            role = (await database.ref(`users/${userUid}`).once("value")).val()?.role || "N/A";
                            timestamp = entry.timestamp || 0;
                            break;
                        case "reliefRequests":
                        case "requestRelief":
                            action = "Relief Request";
                            details = `Request by ${entry.contactPerson || 'Unknown'}`;
                            userName = entry.contactPerson || "Unknown";
                            userUid = entry.userId || "";
                            role = (await database.ref(`users/${userUid}`).once("value")).val()?.role || "N/A";
                            timestamp = entry.timestamp || 0;
                            break;
                        case "users":
                            action = entry.lastLogin ? "Login" : entry.lastLogout ? "Logout" : "User Update";
                            details = `${action === "Login" ? "Last login" : action === "Logout" ? "Last logout" : "Profile update"} at ${new Date(entry.lastLogin || entry.lastLogout || Date.now()).toLocaleString()}`;
                            userName = entry.contactPerson || "Unknown";
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
                    console.error(`Error processing entry from ${node}:`, error);
                    return null;
                }
            });
            try {
                const resolvedEntries = await Promise.all(logEntries);
                data = [...data, ...resolvedEntries.filter(e => e !== null)];
                data.sort((a, b) => b.timestamp - a.timestamp);
                applySearchAndSort();
            } catch (error) {
                console.error(`Failed to process entries from ${node}:`, error);
            }
        }, error => {
            console.error(`Failed to fetch data from ${node}:`, error);
        });
    });
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
                .some(field => field.toLocaleLowerCase().includes(searchTerm))
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
async function showLogDetails(log) {
    try {
        const prompt = `
            You are Lenlen, a disaster tracking assistant. Provide a concise description of the following activity log entry.
            - Action: ${log.action}
            - User: ${log.userName} (${log.role})
            - Timestamp: ${new Date(log.timestamp).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}
            - Details: ${log.details}
            - Source: ${log.source}
        `;
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();
        const description = result.candidates[0].content.parts[0].text;

        logDetailsContent.innerHTML = `
            <p><strong>Action:</strong> ${log.action}</p>
            <p><strong>User:</strong> ${log.userName} (${log.role})</p>
            <p><strong>Timestamp:</strong> ${new Date(log.timestamp).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</p>
            <p><strong>Details:</strong> ${log.details}</p>
            <p><strong>Source:</strong> ${log.source}</p>
            <p><strong>Summary:</strong> ${description}</p>
        `;
    } catch (error) {
        console.error("Log details generation failed:", error);
        logDetailsContent.innerHTML = `
            <p><strong>Action:</strong> ${log.action}</p>
            <p><strong>User:</strong> ${log.userName} (${log.role})</p>
            <p><strong>Timestamp:</strong> ${new Date(log.timestamp).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</p>
            <p><strong>Details:</strong> ${log.details}</p>
            <p><strong>Source:</strong> ${log.source}</p>
        `;
    }
    logDetailsModal.style.display = "flex";
}

// Start Application
document.addEventListener("DOMContentLoaded", initActivityLogs);