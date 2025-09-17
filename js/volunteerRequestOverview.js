// volunteerRequestOverview.js
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

// Use global variable if set by dashboard.js
let highlightedRequestId = window.highlightedRequestId || null;

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const tableBody = document.getElementById("requests-table");
const totalRequestsEl = document.getElementById("total-requests");
const totalVolunteersEl = document.getElementById("total-volunteers");
const requestsCompletedEl = document.getElementById("requests-completed");
const requestsPendingEl = document.getElementById("requests-pending");
const totalConfirmedEl = document.getElementById("total-confirmed");

const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const skillsFilter = document.getElementById("skills-filter");

let allRequests = [];
let allSkills = new Set();

async function fetchVolunteerRequestsOverview() {
    const overviewContainer = document.getElementById('overview-table');
    overviewContainer.innerHTML = '';

    const snapshot = await database.ref('volunteerRequests').once('value');
    snapshot.forEach(child => {
        const req = child.val();
        const remaining = (req.volunteersNeeded || 0) - (req.confirmed || 0);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${req.taskName}</td>
            <td>${req.volunteersNeeded}</td>
            <td>${req.assigned || 0}</td>
            <td>${remaining}</td>
            <td>${req.status || 'Pending'}</td>
        `;
        overviewContainer.appendChild(row);
    });
}

async function fetchRequests() {
    const snapshot = await database.ref("volunteerGroups").once("value");
    allRequests = [];
    allSkills.clear();

    const promises = []; // collect async operations

    snapshot.forEach(groupSnap => {
        const groupData = groupSnap.val();
        const abvnName = groupData.organization || "Admin";

        if (groupData.volunteerNeeds) {
            Object.entries(groupData.volunteerNeeds).forEach(([reqId, reqData]) => {
                promises.push((async () => {
                    const skills = reqData.skills || [];
                    const otherSkills = reqData.otherSkillComments || "";
                    let volunteersNeeded = reqData.volunteersNeeded || 0;
                    let assigned = reqData.assigned || 0;
                    let confirmed = reqData.confirmed || 0;
                    const taskName = reqData.taskName || "—";

                    if (confirmed > volunteersNeeded) confirmed = volunteersNeeded;
                    if (assigned > volunteersNeeded) assigned = volunteersNeeded;

                    let status = getAutoStatus({
                        status: reqData.status,
                        volunteersNeeded,
                        assigned,
                        taskEndDate: reqData.taskEndDate ? new Date(reqData.taskEndDate) : null
                    });

                    const updates = {};
                    if (status !== reqData.status) {
                        updates[`volunteerGroups/${groupSnap.key}/volunteerNeeds/${reqId}/status`] = status;
                        updates[`volunteerRequests/${reqId}/status`] = status;
                    }
                    if (assigned !== reqData.assigned) {
                        updates[`volunteerGroups/${groupSnap.key}/volunteerNeeds/${reqId}/assigned`] = assigned;
                        updates[`volunteerRequests/${reqId}/assigned`] = assigned;
                    }
                    if (Object.keys(updates).length > 0) await database.ref().update(updates);

                    const reqSnapshot = await database.ref(`volunteerRequests/${reqId}`).once('value');
                    const reqDataFromRequests = reqSnapshot.val();
                    const confirmedFromRequests = reqDataFromRequests?.confirmed || 0;
                    if (confirmed !== confirmedFromRequests) {
                        const syncUpdates = {};
                        syncUpdates[`volunteerRequests/${reqId}/confirmed`] = confirmed;
                        syncUpdates[`volunteerGroups/${groupSnap.key}/volunteerNeeds/${reqId}/confirmed`] = confirmed;
                        await database.ref().update(syncUpdates);
                    }

                    skills.forEach(skill => allSkills.add(skill));

                    const taskStartDate = reqData.taskStartDate 
                        ? new Date(reqData.taskStartDate).toLocaleDateString() 
                        : "—";
                    const taskEndDate = reqData.taskEndDate 
                        ? new Date(reqData.taskEndDate).toLocaleDateString() 
                        : "—";
                    const taskTimeStart = reqData.taskTimeStart 
                        ? new Date(`1970-01-01T${reqData.taskTimeStart}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : "—";
                    const taskTimeEnd = reqData.taskTimeEnd 
                        ? new Date(`1970-01-01T${reqData.taskTimeEnd}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : "—";

                    allRequests.push({
                        id: reqId,
                        abvnId: groupSnap.key,
                        abvnName,
                        skills,
                        otherSkills,
                        volunteersNeeded,
                        assigned,
                        confirmed,
                        status,
                        taskName,
                        taskStartDate,
                        taskEndDate,
                        taskTimeStart,
                        taskTimeEnd,
                        submissionDate: reqData.submissionDateTime 
                            ? new Date(reqData.submissionDateTime).toLocaleString() 
                            : "—"
                    });
                })());
            });
        }
    });

    await Promise.all(promises); 
    populateSkillsFilter();
    await renderTable();
    updateDashboard();
}

// Populate skills dropdown
function populateSkillsFilter() {
    skillsFilter.innerHTML = `<option value="">All Skills</option>`;
    Array.from(allSkills).sort().forEach(skill => {
        const opt = document.createElement("option");
        opt.value = skill;
        opt.textContent = skill;
        skillsFilter.appendChild(opt);
    });
}

function getAutoStatus(req) {
    const today = new Date();
    const taskEnd = req.taskEndDate ? new Date(req.taskEndDate) : null;

    const volunteersNeeded = Number(req.volunteersNeeded || 0);
    const assigned = Number(req.assigned || 0);
    const confirmed = Number(req.confirmed || 0);
    const status = req.status || "Pending";

    if (status === "Rejected") return "Rejected";
    if (status === "Completed") return "Completed";

    if (confirmed >= volunteersNeeded && volunteersNeeded > 0) return "Completed";

    if (status === "Pending") {
        if (assigned > 0) return "In Progress";
        if (taskEnd && taskEnd < today && assigned < volunteersNeeded) return "Incomplete";
        return "Pending";
    }

    if (status === "In Progress") {
        if (taskEnd && taskEnd < today && confirmed < volunteersNeeded) return "Incomplete";
        return "In Progress";
    }

    if (status === "Incomplete") {
        if (confirmed >= volunteersNeeded) return "Completed";
        return "Incomplete";
    }

    return "Pending";
}

// Render requests in the table
async function renderTable() {
    tableBody.innerHTML = "";

    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    const skillValue = skillsFilter.value;

    const statusOrder = { "Pending": 1, "In Progress": 2, "Completed": 3 };

    const filtered = allRequests
        .filter(req => {
            const matchesSearch =
                req.abvnName.toLowerCase().includes(searchTerm) ||
                req.skills.join(", ").toLowerCase().includes(searchTerm) ||
                req.taskName.toLowerCase().includes(searchTerm);

            const matchesStatus = statusValue === "" || req.status === statusValue;
            const matchesSkill = skillValue === "" || req.skills.includes(skillValue);

            return matchesSearch && matchesStatus && matchesSkill;
        })
        .sort((a, b) => {
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            if (statusDiff !== 0) return statusDiff;
            return new Date(b.submissionDate) - new Date(a.submissionDate);
        });

    function getStatusBadge(status) {
        return `<span class="status ${status.replace(" ", "")}">${status}</span>`;
    }

    for (const [index, req] of filtered.entries()) {
        const remaining = req.status === "Completed" ? 0 : Math.max(req.volunteersNeeded - (req.confirmed || 0), 0);

        // Main request row
        const row = document.createElement("tr");

        // Highlight if this row is the one from notification
        if (req.id === highlightedRequestId) {
            row.classList.add("highlighted-request");
            row.scrollIntoView({ behavior: "smooth", block: "center" });
            highlightedRequestId = null;
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${req.abvnName}</td>
            <td>${req.taskName}</td>
            <td>${req.skills.join(", ") || "—"}${req.otherSkills ? " (Other: " + req.otherSkills + ")" : ""}</td>
            <td>${req.volunteersNeeded}</td>
            <td>${req.assigned}</td>
            <td>${req.taskStartDate} to ${req.taskEndDate}</td>
            <td>${req.taskTimeStart} - ${req.taskTimeEnd}</td>
            <td class="status-cell">
                ${getStatusBadge(req.status)}
                <select class="status-dropdown" data-id="${req.abvnId}||${req.id}" 
                    ${req.status === "Completed" || req.status === "Rejected" ? "disabled" : ""}
                    ${req.status === "In Progress" ? "data-no-reject" : ""} >
                    <option value="Pending" ${req.status === "Pending" ? "selected" : ""}>Pending</option>
                    <option value="In Progress" ${req.status === "In Progress" ? "selected" : ""}>In Progress</option>
                    <option value="Completed" ${req.status === "Completed" ? "selected" : ""}>Completed</option>
                    <option value="Incomplete" ${req.status === "Incomplete" ? "selected" : ""}>Incomplete</option>
                    <option value="Rejected" ${req.status === "Rejected" ? "selected" : ""}>Rejected</option>
                </select>
            </td>
            <td>
                <button title="View Requests" class="viewBtn" data-id="${req.abvnId}||${req.id}"><i class='bx bx-show-alt'></i></button>
                <button title="See Volunteers" class="expandBtn" data-id="${req.id}"><i class='bx bx-expand-alt'></i></button>
                <button title="Endorse Now" class="endorseNowBtn" data-id="${req.id}"><i class='bx bx-plus-circle'></i></button>
            </td>
        `;

        tableBody.appendChild(row);

        // Expandable assigned volunteers row
        const expandRow = document.createElement("tr");
        expandRow.classList.add("assigned-volunteers");
        expandRow.style.display = "none";
        expandRow.id = `assigned-${req.id}`;
        expandRow.innerHTML = `
            <td colspan="10">
                <table class="nested-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Volunteer Name</th>
                            <th>Age</th>
                            <th>Email</th>
                            <th>Address</th>
                            <th>Skills</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="7" style="text-align:center">Loading...</td></tr>
                    </tbody>
                </table>
            </td>
        `;
        tableBody.appendChild(expandRow);
    }

    attachActions();
}

// Fetch assigned volunteers for a specific request
async function fetchAssignedVolunteers(reqId) {
    const snapshot = await database.ref("volunteerEndorsements").once("value");
    const volunteers = [];

    snapshot.forEach(abvnSnap => {
        const abvnVols = abvnSnap.child("endorsedVolunteers");
        abvnVols.forEach(volSnap => {
            const data = volSnap.val();
            if (data.requestId === reqId) {
                volunteers.push({
                    fullName: `${data.firstName || ""} ${data.middleInitial || ""} ${data.lastName || ""} ${data.nameExtension || ""}`.replace(/\s+/g, ' ').trim(),
                    age: data.age || "—",
                    email: data.email || "—",
                    address: data.address?.formattedAddress || "—",
                    skills: data.skills || [],
                    status: data.endorsedDetails?.status || "Assigned"
                });
            }
        });
    });

    return volunteers;
}

function attachActions() {
    // Status dropdowns
    document.querySelectorAll(".status-dropdown").forEach(dropdown => {
        dropdown.addEventListener("change", async (e) => {
            const [abvnId, reqId] = dropdown.dataset.id.split("||");
            const newStatus = e.target.value;
            const request = allRequests.find(r => r.abvnId === abvnId && r.id === reqId);

            // Prevent rejecting anything except Pending
            if (newStatus === "Rejected" && request.status !== "Pending") {
                Swal.fire({
                    icon: "warning",
                    title: "Cannot Reject",
                    text: "Only Pending requests can be rejected."
                });
                dropdown.value = request.status;
                return;
            }

            // Confirm status change for Rejected or Incomplete
            if (newStatus === "Rejected" || newStatus === "Incomplete") {
                const confirmChange = await Swal.fire({
                    title: `Mark as ${newStatus}?`,
                    text: `Are you sure you want to mark this request as ${newStatus}?`,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Yes",
                    cancelButtonText: "No"
                });
                if (!confirmChange.isConfirmed) {
                    dropdown.value = request.status;
                    return;
                }
            }

            // Update Firebase
            const updates = {};
            updates[`volunteerGroups/${abvnId}/volunteerNeeds/${reqId}/status`] = newStatus;
            updates[`volunteerRequests/${reqId}/status`] = newStatus;
            await database.ref().update(updates);

            Swal.fire({
                icon: "success",
                title: "Status Updated",
                text: `Request marked as "${newStatus}".`
            });

            fetchRequests();
        });
    });

    // Expand/collapse assigned volunteers
    document.querySelectorAll(".expandBtn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const reqId = btn.dataset.id;
            const row = document.getElementById(`assigned-${reqId}`);
            const tbody = row.querySelector("tbody");

            if (row.style.display === "none") {
                const volunteers = await fetchAssignedVolunteers(reqId);
                if (volunteers.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">No volunteers assigned yet</td></tr>`;
                } else {
                    tbody.innerHTML = volunteers.map((v, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${v.fullName}</td>
                            <td>${v.age}</td>
                            <td>${v.email}</td>
                            <td>${v.address}</td>
                            <td>${v.skills.join(", ")}</td>
                            <td>${v.status}</td>
                        </tr>
                    `).join("");
                }
                row.style.display = "table-row";
                row.style.opacity = 0;
                setTimeout(() => row.style.transition = "opacity 0.3s ease");
                setTimeout(() => row.style.opacity = 1, 10);
                btn.innerHTML = "<i class='bx bx-collapse-alt'></i>";
            } else {
                row.style.opacity = 0;
                setTimeout(() => { row.style.display = "none";
                btn.innerHTML = "<i class='bx bx-expand-alt'></i>";
                }, 300);
            }
        });
    });

    document.querySelectorAll(".viewBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const [abvnId, reqId] = btn.dataset.id.split("||"); // safe split
            const request = allRequests.find(r => r.abvnId === abvnId && r.id === reqId);

            if (!request) {
                console.error("Request not found for:", abvnId, reqId);
                Swal.fire({
                    icon: "error",
                    title: "Request Not Found",
                    text: "The request data could not be loaded. Please refresh the page and try again."
                });
                return;
            }

            showRequestModal(request);
        });
    });

    // Endorse Now buttons
    document.querySelectorAll(".endorseNowBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const reqId = btn.dataset.id;

            // Navigate to pending volunteers page with request ID
            window.location.href = `../pages/pendingvolunteers.html?requestId=${reqId}`;
        });
    });
}

// Update dashboard counters
function updateDashboard() {
    totalRequestsEl.textContent = allRequests.length;
    totalVolunteersEl.textContent = allRequests.reduce((sum, r) => sum + (r.volunteersNeeded || 0), 0);
    requestsCompletedEl.textContent = allRequests.filter(r => r.status === "Completed").length;
    requestsPendingEl.textContent = allRequests.filter(r => r.status === "Pending").length;

    // In Progress count
    const requestsInProgressEl = document.getElementById("requests-inprogress");
    if (requestsInProgressEl) {
        requestsInProgressEl.textContent = allRequests.filter(r => r.status === "In Progress").length;
    }

    // Assigned Volunteers
    const totalAssignedEl = document.getElementById("total-assigned");
    if (totalAssignedEl) {
        totalAssignedEl.textContent = allRequests.reduce((sum, r) => sum + (r.assigned || 0), 0);
    }

        if (totalConfirmedEl) {
        totalConfirmedEl.textContent = allRequests.reduce((sum, r) => sum + (r.confirmed || 0), 0);
    }

    // Remaining Volunteers
    const remainingEl = document.getElementById("total-remaining");
    if (remainingEl) {
        remainingEl.textContent = allRequests.reduce(
            (sum, r) => sum + (r.status === "Completed" ? 0 : Math.max((r.volunteersNeeded || 0) - (r.confirmed || 0), 0)),
            0
        );
    }
}

function showRequestModal(request) {
    const modalContent = document.getElementById('modalContent');
    const previewModal = document.getElementById('previewModal');

    modalContent.innerHTML = `
        <h2>Request Details</h2>
        <p><strong>ABVN Name:</strong> ${request.abvnName}</p>
        <p><strong>Task Name:</strong> ${request.taskName}</p>
        <p><strong>Skills Needed:</strong> ${request.skills.join(", ") || "—"}</p>
        <p><strong>Other Skills:</strong> ${request.otherSkills || "—"}</p>
        <p><strong>Volunteers Needed:</strong> ${request.volunteersNeeded}</p>
        <p><strong>Assigned Volunteers:</strong> ${request.assigned}</p>
        <p><strong>Confirmed Volunteers:</strong> ${request.confirmed || 0}</p>
        <p><strong>Remaining:</strong> ${request.status === "Completed" ? 0 : Math.max(request.volunteersNeeded - (request.confirmed || 0), 0)}</p>
        <p><strong>Task Dates:</strong> ${request.taskStartDate} to ${request.taskEndDate}</p>
        <p><strong>Task Times:</strong> ${request.taskTimeStart} - ${request.taskTimeEnd}</p>
        <p><strong>Status:</strong> ${request.status}</p>
        <p><strong>Submitted:</strong> ${request.submissionDate || "—"}</p>
    `;

    previewModal.style.display = 'flex';
}

// Close modal
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('previewModal').style.display = 'none';
});


// Filters
searchInput.addEventListener("input", renderTable);
statusFilter.addEventListener("change", renderTable);
skillsFilter.addEventListener("change", renderTable);

// Initial load
fetchRequests();

