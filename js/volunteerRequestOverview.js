// volunteerRequestOverview.js
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

// Use global variable if set by dashboard.js
let highlightedRequestId = window.highlightedRequestId || null;

firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    const tableBody = document.getElementById("requests-table");
    const totalRequestsEl = document.getElementById("total-requests");
    const totalVolunteersEl = document.getElementById("total-volunteers");
    const requestsCompletedEl = document.getElementById("requests-completed");
    const requestsPendingEl = document.getElementById("requests-pending");

    const searchInput = document.getElementById("search-input");
    const statusFilter = document.getElementById("status-filter");
    const skillsFilter = document.getElementById("skills-filter");

    let allRequests = [];
    let allSkills = new Set();

    // Fetch all ABVN requests
    async function fetchRequests() {
        const snapshot = await database.ref("volunteerGroups").once("value");
        allRequests = [];
        allSkills.clear();

        snapshot.forEach(groupSnap => {
            const groupData = groupSnap.val();
            const abvnName = groupData.organization || "Unnamed ABVN";

            if (groupData.volunteerNeeds) {
                Object.entries(groupData.volunteerNeeds).forEach(([reqId, reqData]) => {
                    const skills = reqData.skills || [];
                    const otherSkills = reqData.otherSkillComments || "";
                    const volunteersNeeded = reqData.volunteersNeeded || 0;
                    const assigned = reqData.assigned || 0;
                    const taskName = reqData.taskName || "—";

                    // Format dates and times in human-friendly style
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

                    // Auto status
                    let status = getAutoStatus({ volunteersNeeded, assigned });

                    // Update Firebase if different
                    if (status !== reqData.status) {
                        const updates = {};
                        updates[`volunteerGroups/${groupSnap.key}/volunteerNeeds/${reqId}/status`] = status;
                        updates[`volunteerRequests/${reqId}/status`] = status;
                        database.ref().update(updates);
                    }

                    // Collect skills
                    skills.forEach(skill => allSkills.add(skill));

                    allRequests.push({
                        id: reqId,
                        abvnId: groupSnap.key,
                        abvnName,
                        skills,
                        otherSkills,
                        volunteersNeeded,
                        assigned,
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
                });
            }
        });

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

    // Determine correct status automatically
    function getAutoStatus(req) {
        const remaining = (req.volunteersNeeded || 0) - (req.assigned || 0);
        if (remaining <= 0) return "Completed";
        if (req.assigned > 0) return "In Progress";
        return "Pending";
    }

    // Render requests in the table
    async function renderTable() {
        tableBody.innerHTML = "";

        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;
        const skillValue = skillsFilter.value;

        // Define status order
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
            let color;
            switch (status) {
                case "Completed":
                    color = "green";
                    break;
                case "In Progress":
                    color = "orange";
                    break;
                case "Pending":
                default:
                    color = "red";
            }
            return `<span class="status ${status.replace(" ", "")}">${status}</span>`;
        }

        for (const [index, req] of filtered.entries()) {
            const remaining = Math.max(req.volunteersNeeded - req.assigned, 0);

            // Main request row
            const row = document.createElement("tr");
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
                    <select class="status-dropdown" data-id="${req.abvnId}_${req.id}" ${req.status === "Completed" ? "disabled" : ""}>
                        <option value="Pending" ${req.status === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="In Progress" ${req.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Completed" ${req.status === "Completed" ? "selected" : ""}>Completed</option>
                    </select>
                </td>
                <td>
                    <button class="viewBtn" data-id="${req.abvnId}_${req.id}"><i class='bx bx-show-alt'></i></button>
                    <button class="expandBtn" data-id="${req.id}">+</button>
                </td>
            `;
            tableBody.appendChild(row);

            // Assigned volunteers expandable row
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
                                <th>Full Name</th>
                                <th>Age</th>
                                <th>Email</th>
                                <th>Address</th>
                                <th>Skills</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr><td colspan="4" style="text-align:center">Loading...</td></tr>
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
                const [abvnId, reqId] = dropdown.dataset.id.split("_");
                const newStatus = e.target.value;

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

        // View buttons (for modal with request details)
        document.querySelectorAll(".viewBtn").forEach(btn => {
            btn.addEventListener("click", () => {
                const [abvnId, reqId] = btn.dataset.id.split("_");
                const request = allRequests.find(r => r.abvnId === abvnId && r.id === reqId);

                Swal.fire({
                    title: `Request from ${request.abvnName}`,
                    html: `
                        <p><strong>Task Name:</strong> ${request.taskName}</p>
                        <p><strong>Skills Needed:</strong> ${request.skills.join(", ") || "—"}</p>
                        <p><strong>Other Skills:</strong> ${request.otherSkills || "—"}</p>
                        <p><strong>Volunteers Needed:</strong> ${request.volunteersNeeded}</p>
                        <p><strong>Assigned Volunteers:</strong> ${request.assigned}</p>
                        <p><strong>Remaining:</strong> ${Math.max(request.volunteersNeeded - request.assigned, 0)}</p>
                        <p><strong>Task Dates:</strong> ${request.taskStartDate} to ${request.taskEndDate}</p>
                        <p><strong>Task Times:</strong> ${request.taskTimeStart} - ${request.taskTimeEnd}</p>
                        <p><strong>Status:</strong> ${request.status}</p>
                        <p><strong>Submitted:</strong> ${request.submissionDate ? new Date(request.submissionDate).toLocaleString() : "—"}</p>
                    `,
                    confirmButtonText: "Close"
                });
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
                    btn.textContent = "-";
                } else {
                    row.style.display = "none";
                    btn.textContent = "+";
                }
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

        // Remaining Volunteers
        const remainingEl = document.getElementById("total-remaining");
        if (remainingEl) {
            remainingEl.textContent = allRequests.reduce(
                (sum, r) => sum + Math.max((r.volunteersNeeded || 0) - (r.assigned || 0), 0),
                0
            );
        }
    }

    // Filters
    searchInput.addEventListener("input", renderTable);
    statusFilter.addEventListener("change", renderTable);
    skillsFilter.addEventListener("change", renderTable);

    // Initial load
    fetchRequests();

