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

// Global variables
let allReliefRequests = [];
let allDonations = [];

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const tableBody = document.getElementById("requests-table");

// Dashboard elements
const totalRequestsEl = document.getElementById("total-requests");        // Total Donations
const totalVolunteersEl = document.getElementById("total-volunteers");    // Donations Needed
const requestsCompletedEl = document.getElementById("requests-completed");
const requestsPendingEl = document.getElementById("requests-pending");
const requestsInProgressEl = document.getElementById("requests-inprogress");
const totalRemainingEl = document.getElementById("total-remaining");
const totalAssignedEl = document.getElementById("total-assigned");        // Assigned Volunteers

const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const skillsFilter = document.getElementById("skills-filter");

let allSkills = new Set(); // to collect unique categories

// ----- Real-time Listeners -----

// Listen to all Relief Requests
database.ref("requestRelief/requests").on("value", async (reqSnap) => {
    allReliefRequests = [];
    allSkills.clear(); // reset categories each fetch

    reqSnap.forEach(snap => {
        const req = snap.val();
        const totalNeeded = req.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
        const matchedDonations = req.matchedDonations || 0;
        let status = getReliefStatus(totalNeeded, matchedDonations, req.donationDate);

        // Collect unique categories for skills dropdown
        if (req.category) allSkills.add(req.category);

        allReliefRequests.push({
            id: snap.key,
            contactPerson: req.contactPerson || "—",
            category: req.category || "—",
            address: req.address || "—",
            totalNeeded,
            matchedDonations,
            remaining: Math.max(totalNeeded - matchedDonations, 0),
            status,
            assignedVolunteers: req.assignedVolunteers?.length || 0,
            submissionDate: req.donationDate || req.timestamp || "—",
            matchedDonationIds: req.matchedDonationIds || []
        });
    });

    await matchDonationsToRequests();
    renderReliefTable();
    updateReliefDashboard();
    populateSkillsFilter(); // <-- call here to update dropdown
});

// Populate skills dropdown
function populateSkillsFilter() {
    skillsFilter.innerHTML = `<option value="">All Categories</option>`;
    Array.from(allSkills).sort().forEach(skill => {
        const opt = document.createElement("option");
        opt.value = skill;
        opt.textContent = skill;
        skillsFilter.appendChild(opt);
    });
}


// Listen to Donations (Public & Admin)
async function listenDonations() {
    const donationRefs = [
        database.ref("donations/pending/inkind"),
        database.ref("donations/pending/savedDonations/inkind")
    ];

    donationRefs.forEach(ref => {
        ref.on("value", snap => {
            allDonations = allDonations.filter(d => d.type !== (ref.key.includes("savedDonations") ? "admin" : "public"));
            snap.forEach(s => {
                const d = s.val();
                allDonations.push({
                    id: s.key,
                    type: ref.key.includes("savedDonations") ? "admin" : "public",
                    category: d.assistance || d.category,
                    address: d.address?.formattedAddress || d.address || "",
                    quantity: d.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0,
                    matched: 0,
                    donationDate: d.donationDate || d.createdAt,
                    raw: d
                });
            });
            matchDonationsToRequests();
        });
    });
}
listenDonations();

// ----- Relief Request Status -----
function getReliefStatus(totalNeeded, matched, donationDate) {
    const today = new Date();
    const requestDate = donationDate ? new Date(donationDate) : null;

    if (matched >= totalNeeded && totalNeeded > 0) return "Completed";
    if (matched > 0 && matched < totalNeeded) return "In Progress";
    if (requestDate && requestDate < today && matched < totalNeeded) return "Pending";
    return "Pending";
}

// ----- Render Table -----
function renderReliefTable(filteredRequests = allReliefRequests) {
    tableBody.innerHTML = "";

    filteredRequests.forEach((req, index) => {
        const addressStr = typeof req.address === "string"
            ? req.address
            : req.address?.formattedAddress || req.address?.street || "—";

        const assignedVolunteers = req.assignedVolunteers || 0;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${req.contactPerson}</td>
            <td>${req.category}</td>
            <td>${addressStr}</td>
            <td>${req.totalNeeded}</td>
            <td>${req.matchedDonations}</td>
            <td>${req.remaining}</td>
            <td>
                <span class="status-badge status-badge-${req.status.replace(/\s+/g, '-').toLowerCase()}">
                    ${req.status}
                </span>
            </td>
            <td>${assignedVolunteers}</td>
            <td>
                <button title="View Requests" class="viewBtn" data-id="${req.id}"><i class='bx bx-show-alt'></i></button>
                <button class="match-btn" data-id="${req.id}">Match Donations</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Attach click events
    document.querySelectorAll(".viewBtn").forEach(btn => {
        btn.addEventListener("click", () => openPreviewModal(btn.dataset.id));
    });

    document.querySelectorAll(".match-btn").forEach(btn => {
        btn.addEventListener("click", () => matchDonationsToRequests(btn.dataset.id));
    });
}

// ----- Filter Function -----
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusTerm = statusFilter.value;
    const skillTerm = skillsFilter.value;

    const filtered = allReliefRequests.filter(req => {
        const addressStr = typeof req.address === "string"
            ? req.address
            : req.address?.formattedAddress || req.address?.street || "";

        const matchesSearch =
            addressStr.toLowerCase().includes(searchTerm) ||
            (req.category?.toLowerCase() || "").includes(searchTerm);

        const matchesStatus = statusTerm ? req.status === statusTerm : true;
        const matchesSkill = skillTerm ? req.category === skillTerm : true;

        return matchesSearch && matchesStatus && matchesSkill;
    });

    renderReliefTable(filtered);
}


// ----- Match Donations -----
async function matchDonationsToRequests() {
    const updates = {};

    allReliefRequests.forEach(req => {
        const totalNeeded = req.totalNeeded;
        let matched = 0;

        const matchingDonations = allDonations.filter(d =>
            d.category === req.category &&
            d.address === req.address &&
            d.matched < d.quantity
        );

        for (let d of matchingDonations) {
            if (matched >= totalNeeded) break;
            const remainingNeeded = totalNeeded - matched;
            const availableDonation = d.quantity - d.matched;
            const allocation = Math.min(remainingNeeded, availableDonation);

            matched += allocation;
            d.matched += allocation;

            if (!updates[`requestRelief/requests/${req.id}/matchedDonationIds`]) {
                updates[`requestRelief/requests/${req.id}/matchedDonationIds`] = [];
            }
            updates[`requestRelief/requests/${req.id}/matchedDonationIds`].push(d.id);
        }

        updates[`requestRelief/requests/${req.id}/matchedDonations`] = matched;
        updates[`requestRelief/requests/${req.id}/status`] = getReliefStatus(totalNeeded, matched, req.submissionDate);
    });

    if (Object.keys(updates).length > 0) {
        await database.ref().update(updates);
        console.log("Relief Requests updated with matched donations.");
    }
}

// ----- Update Dashboard -----
// Update Dashboard
function updateReliefDashboard() {
    // Helper function to format numbers
    const formatNumber = (n) => n.toLocaleString();

    // Helper function to animate numbers
    function animateValue(element, start, end, duration = 800) {
        let startTime = null;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            element.textContent = Math.floor(progress * (end - start) + start);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // Total Relief Requests
    animateValue(totalRequestsEl, 0, allReliefRequests.length);

    // Total Donations Needed
    const totalDonationsNeeded = allReliefRequests.reduce((sum, r) => sum + r.totalNeeded, 0);
    document.getElementById("total-donations-needed").textContent = formatNumber(totalDonationsNeeded);

    // Requests Completed
    const completedCount = allReliefRequests.filter(r => r.status === "Completed").length;
    requestsCompletedEl.innerHTML = `
        <span>${completedCount}</span>
    `;

    // Requests Pending
    const pendingCount = allReliefRequests.filter(r => r.status === "Pending").length;
    requestsPendingEl.innerHTML = `<span>${pendingCount}</span>`;

    // Requests In Progress
    const inProgressCount = allReliefRequests.filter(r => r.status === "In Progress").length;
    requestsInProgressEl.innerHTML = `<span>${inProgressCount}</span>`;

    // Total Remaining Donations
    const totalRemaining = allReliefRequests.reduce((sum, r) => sum + r.remaining, 0);
    document.getElementById("total-remaining").textContent = formatNumber(totalRemaining);

    // Assigned Volunteers
    const totalAssigned = allReliefRequests.reduce((sum, r) => sum + (r.assignedVolunteers?.length || 0), 0);
    document.getElementById("total-assigned").textContent = formatNumber(totalAssigned);
}


// ----- Modal Functionality -----
const previewModal = document.getElementById("previewModal");
const modalContent = document.getElementById("modalContent");
const closeModal = document.getElementById("closeModal");

// Open modal and populate details
tableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("viewBtn")) {
        const reqId = e.target.dataset.id;
        const request = allReliefRequests.find(r => r.id === reqId);

        if (request) {
            modalContent.innerHTML = `
                <h3>Request Details</h3>
                <p><strong>ABVN Location:</strong> ${request.address?.formattedAddress}</p>
                <p><strong>Category:</strong> ${request.category}</p>
                <p><strong>Total Needed:</strong> ${request.totalNeeded}</p>
                <p><strong>Quantity Donated:</strong> ${request.matchedDonations}</p>
                <p><strong>Remaining:</strong> ${request.remaining}</p>
                <p><strong>Status:</strong> ${request.status}</p>
                <p><strong>Assigned Volunteers:</strong> ${request.assignedVolunteers}</p>
                <p><strong>Submission Date:</strong> ${request.submissionDate}</p>
                <hr>
                <h4>Matched Donations:</h4>
                <ul>
                    ${
                        request.matchedDonationIds?.map(id => {
                            const donation = allDonations.find(d => d.id === id);
                            return donation ? `<li>${donation.category} (${donation.quantity} units) - ${donation.address}</li>` : '';
                        }).join('') || "<li>No donations matched yet.</li>"
                    }
                </ul>
            `;
            previewModal.style.display = "flex";
        }
    }
});

// Close modal
closeModal.addEventListener("click", () => {
    previewModal.style.display = "none";
});

// Close modal when clicking outside content
window.addEventListener("click", (e) => {
    if (e.target === previewModal) {
        previewModal.style.display = "none";
    }
});

searchInput.addEventListener("input", applyFilters);
statusFilter.addEventListener("change", applyFilters);
skillsFilter.addEventListener("change", applyFilters);



// Initial fetch
fetchReliefRequestsOverview();
