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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

document.addEventListener("DOMContentLoaded", () => {
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
                    const status = reqData.status || "Pending";
                    const volunteersNeeded = reqData.volunteersNeeded || 0;
                    const assigned = reqData.assigned || 0;
                    const taskName = reqData.taskName || "—";
                    
                    // Collect skills for filter
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
                        submissionDate: reqData.submissionDateTime || ""
                    });
                });
            }
        });

        populateSkillsFilter();
        renderTable();
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

    // Render requests in the table
    function renderTable() {
        tableBody.innerHTML = "";

        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;
        const skillValue = skillsFilter.value;

        const filtered = allRequests.filter(req => {
            const matchesSearch =
                req.abvnName.toLowerCase().includes(searchTerm) ||
                req.skills.join(", ").toLowerCase().includes(searchTerm) ||
                req.taskName.toLowerCase().includes(searchTerm);

            const matchesStatus = statusValue === "" || req.status === statusValue;
            const matchesSkill = skillValue === "" || req.skills.includes(skillValue);

            return matchesSearch && matchesStatus && matchesSkill;
        });

        filtered.forEach(req => {
            const row = document.createElement("tr");

            const remaining = Math.max(req.volunteersNeeded - req.assigned, 0); // Remaining volunteers needed

            row.innerHTML = `
                <td>${req.abvnName}</td>
                <td>${req.taskName}</td>
                <td>${req.skills.join(", ") || "—"}</td>
                <td>${remaining}</td>  <!-- Remaining volunteers needed -->
                <td>${req.assigned}</td> <!-- Already assigned -->
                <td>
                    <select class="status-dropdown" data-id="${req.abvnId}_${req.id}">
                        <option value="Pending" ${req.status === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="In Progress" ${req.status === "In Progress" ? "selected" : ""}>In Progress</option>
                        <option value="Completed" ${req.status === "Completed" ? "selected" : ""}>Completed</option>
                    </select>
                </td>
                <td>
                    <button class="view-btn" data-id="${req.abvnId}_${req.id}">View</button>
                </td>
            `;

            tableBody.appendChild(row);
        });

        attachActions();
    }

    // Attach button + dropdown actions
    function attachActions() {
        // View modal
        document.querySelectorAll(".view-btn").forEach(btn => {
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
                        <p><strong>Status:</strong> ${request.status}</p>
                        <p><strong>Submitted:</strong> ${request.submissionDate ? new Date(request.submissionDate).toLocaleString() : "—"}</p>
                    `,
                    confirmButtonText: "Close"
                });
            });
        });

        // Dropdown status change
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
    }

    // Update dashboard counters
    function updateDashboard() {
        totalRequestsEl.textContent = allRequests.length;
        totalVolunteersEl.textContent = allRequests.reduce((sum, r) => sum + (r.volunteersNeeded || 0), 0);
        requestsCompletedEl.textContent = allRequests.filter(r => r.status === "Completed").length;
        requestsPendingEl.textContent = allRequests.filter(r => r.status === "Pending").length;

        // New: Total Assigned Volunteers
        const totalAssignedEl = document.getElementById("total-assigned");
        if (totalAssignedEl) {
            totalAssignedEl.textContent = allRequests.reduce((sum, r) => sum + (r.assigned || 0), 0);
        }

        // Optional: Total Remaining Volunteers Needed
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
});
