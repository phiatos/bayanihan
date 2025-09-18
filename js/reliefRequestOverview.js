// reliefRequestOverview.js
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
const totalRequestsEl = document.getElementById("total-requests");
const totalVolunteersEl = document.getElementById("total-volunteers");
const requestsCompletedEl = document.getElementById("requests-completed");
const requestsPendingEl = document.getElementById("requests-pending");
const requestsInProgressEl = document.getElementById("requests-inprogress");
const totalRemainingEl = document.getElementById("total-remaining");
const totalAssignedEl = document.getElementById("total-assigned");

const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const skillsFilter = document.getElementById("skills-filter");

let allSkills = new Set();

// ----- Real-time Listeners -----

// Listen to all Relief Requests
database.ref("requestRelief/requests").on("value", async (reqSnap) => {
    allReliefRequests = [];
    allSkills.clear();

    reqSnap.forEach(snap => {
        const req = snap.val();
        const totalNeeded = req.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
        const matchedDonations = req.matchedDonations || 0;
        const status = req.status || getReliefStatus(totalNeeded, matchedDonations, req.donationDate);

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
    populateSkillsFilter();
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
        database.ref("donations/savedDonations/inkind")
    ];

    donationRefs.forEach(ref => {
        let debounceTimeout;
        ref.on("value", snap => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                allDonations = allDonations.filter(d => d.type !== (ref.key.includes("savedDonations") ? "admin" : "public"));
                snap.forEach(s => {
                    const d = s.val();
                    allDonations.push({
                        id: s.key,
                        type: ref.key.includes("savedDonations") ? "admin" : "public",
                        donorType: d.type?.toLowerCase() || "individual",
                        category: d.assistance || d.category || "N/A",
                        address: d.address?.formattedAddress || d.address || "N/A",
                        quantity: d.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0,
                        matched: d.matched || 0,
                        donationDate: d.donationDate || d.createdAt || "N/A",
                        status: d.status || "Pending",
                        assignment: d.assignment || null,
                        raw: {
                            encoder: d.encoder || "N/A",
                            name: d.name || "N/A",
                            type: d.type || "N/A",
                            contactPerson: d.contactPerson || "N/A",
                            number: d.number || "N/A",
                            email: d.email || "N/A",
                            valuation: d.valuation || 0,
                            description: d.additionalnotes || d.description || "N/A",
                            staffIncharge: d.staffIncharge || "N/A",
                            urgentNeed: d.urgentNeed || false,
                            items: d.items || [],
                            createdAt: d.createdAt || "N/A"
                        }
                    });
                });
                console.log(`Updated allDonations from ${ref.key}:`, allDonations.map(d => ({ id: d.id, type: d.type, status: d.status, assignment: d.assignment })));
                matchDonationsToRequests();
            }, 300);
        }, error => {
            console.error(`Error in ${ref.key} listener:`, error);
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
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll(".viewBtn").forEach(btn => {
        btn.addEventListener("click", () => openPreviewModal(btn.dataset.id));
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
        let matched = req.matchedDonations || 0;
        let matchedIds = req.matchedDonationIds || [];

        // Automatic matching for non-Completed requests
        if (req.status !== "Completed") {
            const totalNeeded = req.totalNeeded;
            const matchingDonations = allDonations.filter(d =>
                d.type === "public" &&
                d.status === "Pending" &&
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
                if (!matchedIds.includes(d.id)) {
                    matchedIds.push(d.id);
                }
            }

            if (matched !== req.matchedDonations || matchedIds.length !== req.matchedDonationIds?.length) {
                updates[`requestRelief/requests/${req.id}/matchedDonations`] = matched;
                updates[`requestRelief/requests/${req.id}/matchedDonationIds`] = matchedIds;
                updates[`requestRelief/requests/${req.id}/status`] = getReliefStatus(totalNeeded, matched, req.submissionDate);
            }
        }

        // Process manually matched (saved) donations
        const manualMatches = allDonations.filter(d =>
            d.type === "admin" &&
            d.status === "Approved" &&
            d.assignment?.id === req.id
        );
        for (let d of manualMatches) {
            if (!matchedIds.includes(d.id)) {
                matched += d.quantity;
                matchedIds.push(d.id);
                updates[`requestRelief/requests/${req.id}/matchedDonations`] = matched;
                updates[`requestRelief/requests/${req.id}/matchedDonationIds`] = matchedIds;
                if (req.status !== "Completed") {
                    updates[`requestRelief/requests/${req.id}/status`] = "Completed";
                }
            }
        }
    });

    if (Object.keys(updates).length > 0) {
        try {
            await database.ref().update(updates);
            console.log("Relief Requests updated with matched donations:", updates);
        } catch (error) {
            console.error("Error updating matched donations:", error);
        }
    }
}

// ----- Update Dashboard -----
function updateReliefDashboard() {
    const formatNumber = (n) => n.toLocaleString();

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

    animateValue(totalRequestsEl, 0, allReliefRequests.length);

    const totalDonationsNeeded = allReliefRequests.reduce((sum, r) => sum + r.totalNeeded, 0);
    document.getElementById("total-donations-needed").textContent = formatNumber(totalDonationsNeeded);

    const completedCount = allReliefRequests.filter(r => r.status === "Completed").length;
    requestsCompletedEl.innerHTML = `<span>${completedCount}</span>`;

    const pendingCount = allReliefRequests.filter(r => r.status === "Pending").length;
    requestsPendingEl.innerHTML = `<span>${pendingCount}</span>`;

    const inProgressCount = allReliefRequests.filter(r => r.status === "In Progress").length;
    requestsInProgressEl.innerHTML = `<span>${inProgressCount}</span>`;

    const totalRemaining = allReliefRequests.reduce((sum, r) => sum + r.remaining, 0);
    document.getElementById("total-remaining").textContent = formatNumber(totalRemaining);

    const totalAssigned = allReliefRequests.reduce((sum, r) => sum + (r.assignedVolunteers?.length || 0), 0);
    document.getElementById("total-assigned").textContent = formatNumber(totalAssigned);
}

// ----- Modal Functionality -----
async function openPreviewModal(reqId) {
    const request = allReliefRequests.find(r => r.id === reqId);
    if (!request) {
        console.error(`Relief request ${reqId} not found`);
        return;
    }

    console.log(`Opening modal for request ${reqId}:`, {
        status: request.status,
        matchedDonationIds: request.matchedDonationIds,
        matchedDonations: request.matchedDonations
    });

    const addressStr = typeof request.address === "string"
        ? request.address
        : request.address?.formattedAddress || request.address?.street || "—";

    // Fetch missing donations
    const donationDetails = [];
    const missingIds = [];
    for (const id of request.matchedDonationIds || []) {
        let donation = allDonations.find(d => d.id === id);
        if (!donation) {
            console.warn(`Donation ${id} not found in allDonations, fetching from Firebase`);
            try {
                let snapshot = await database.ref(`donations/savedDonations/inkind/${id}`).once("value");
                let d = snapshot.val();
                let source = "savedDonations";
                if (!d) {
                    snapshot = await database.ref(`donations/pending/inkind/${id}`).once("value");
                    d = snapshot.val();
                    source = "pending";
                }
                if (d) {
                    donation = {
                        id,
                        type: source === "savedDonations" ? "admin" : "public",
                        donorType: d.type?.toLowerCase() || "individual",
                        category: d.assistance || d.category || "N/A",
                        address: d.address?.formattedAddress || d.address || "N/A",
                        quantity: d.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0,
                        matched: d.matched || 0,
                        donationDate: d.donationDate || d.createdAt || "N/A",
                        status: d.status || "Pending",
                        assignment: d.assignment || null,
                        raw: {
                            encoder: d.encoder || "N/A",
                            name: d.name || "N/A",
                            type: d.type || "N/A",
                            contactPerson: d.contactPerson || "N/A",
                            number: d.number || "N/A",
                            email: d.email || "N/A",
                            valuation: d.valuation || 0,
                            description: d.additionalnotes || d.description || "N/A",
                            staffIncharge: d.staffIncharge || "N/A",
                            urgentNeed: d.urgentNeed || false,
                            items: d.items || [],
                            createdAt: d.createdAt || "N/A"
                        }
                    };
                    allDonations.push(donation);
                    console.log(`Fetched donation ${id} from ${source}:`, {
                        id: donation.id,
                        type: donation.type,
                        status: donation.status,
                        assignment: donation.assignment
                    });
                } else {
                    console.error(`Donation ${id} not found in Firebase`);
                    missingIds.push(id);
                }
            } catch (error) {
                console.error(`Error fetching donation ${id}:`, error);
                missingIds.push(id);
            }
        }
        donationDetails.push(donation);
    }

    modalContent.innerHTML = `
        <h3>Request Details</h3>
        <p><strong>ABVN Location:</strong> ${addressStr}</p>
        <p><strong>Category:</strong> ${request.category}</p>
        <p><strong>Contact Person:</strong> ${request.contactPerson}</p>
        <p><strong>Total Needed:</strong> ${request.totalNeeded}</p>
        <p><strong>Quantity Donated:</strong> ${request.matchedDonations}</p>
        <p><strong>Remaining:</strong> ${request.remaining}</p>
        <p><strong>Status:</strong> ${request.status}</p>
        <p><strong>Assigned Volunteers:</strong> ${request.assignedVolunteers}</p>
        <p><strong>Submission Date:</strong> ${request.submissionDate}</p>
        <hr>
        <h4>Matched Donations:</h4>
        <ul style="list-style: none; padding: 0; max-height: 300px; overflow-y: auto;">
            ${
                donationDetails.length > 0
                    ? donationDetails.map((donation, index) => {
                          if (!donation) {
                              const id = (request.matchedDonationIds || [])[index] || "unknown";
                              return `<li style="padding: 10px; border-bottom: 1px solid #eee; color: red;">
                                  Donation ID ${id} (Not found in Firebase)
                              </li>`;
                          }
                          const donationDate = donation.donationDate !== "N/A"
                              ? new Date(donation.donationDate).toLocaleDateString('en-PH')
                              : "N/A";
                          const donorInfo = donation.raw.name !== "N/A" ? donation.raw.name : donation.raw.email || "Unknown Donor";
                          const valuation = donation.raw.valuation ? `₱${donation.raw.valuation.toLocaleString()}` : "N/A";
                          const description = donation.raw.description || "No description provided";
                          const number = donation.raw.number || "N/A";
                          const staffIncharge = donation.raw.staffIncharge || "N/A";
                          const urgentNeed = donation.raw.urgentNeed ? "Yes" : "No";
                          const itemsList = donation.raw.items?.length > 0
                              ? donation.raw.items.map(item => `
                                  <li style="margin-left: 20px; font-size: 0.9em;">
                                      ${item.name}: ${item.quantity} units${item.notes ? ` (${item.notes})` : ""}
                                  </li>
                              `).join("")
                              : "<li>No items specified</li>";
                          return `
                              <li style="padding: 10px; border-bottom: 1px solid #eee;">
                                  <div>
                                      <strong>Donation ID:</strong> ${donation.id}<br>
                                      <strong>Donor Type:</strong> ${donation.raw.type}<br>
                                      <strong>Status:</strong> ${donation.status}<br>
                                      <strong>Category:</strong> ${donation.category}<br>
                                      <strong>Quantity:</strong> ${donation.quantity} units<br>
                                      <strong>Valuation:</strong> ${valuation}<br>
                                      <strong>Description:</strong> ${description}<br>
                                      <strong>Address:</strong> ${donation.address}<br>
                                      <strong>Contact Number:</strong> ${number}<br>
                                      <strong>Staff In-Charge:</strong> ${staffIncharge}<br>
                                      <strong>Urgent Need:</strong> ${urgentNeed}<br>
                                      <strong>Donation Date:</strong> ${donationDate}<br>
                                      <strong>Donor Info:</strong> ${donorInfo}<br>
                                      <strong>Items:</strong>
                                      <ul style="list-style: none; padding: 0;">
                                          ${itemsList}
                                      </ul>
                                  </div>
                              </li>
                          `;
                      }).join("")
                    : `<li>No donations matched yet. Request Status: ${request.status}, Matched IDs: ${JSON.stringify(request.matchedDonationIds || [])}</li>`
            }
            ${
                missingIds.length > 0
                    ? `<li style="padding: 10px; color: orange;">Warning: ${missingIds.length} donation(s) could not be found: ${missingIds.join(", ")}</li>`
                    : ""
            }
        </ul>
    `;
    previewModal.style.display = "flex";
}

// ----- Modal Functionality -----
tableBody.addEventListener("click", (e) => {
    if (e.target.classList.contains("viewBtn") || e.target.parentElement.classList.contains("viewBtn")) {
        const reqId = e.target.dataset.id || e.target.parentElement.dataset.id;
        openPreviewModal(reqId);
    }
});

closeModal.addEventListener("click", () => {
    previewModal.style.display = "none";
});

window.addEventListener("click", (e) => {
    if (e.target === previewModal) {
        previewModal.style.display = "none";
    }
});

searchInput.addEventListener("input", applyFilters);
statusFilter.addEventListener("change", applyFilters);
skillsFilter.addEventListener("change", applyFilters);

// Initial fetch (if needed)
function fetchReliefRequestsOverview() {
    // Already handled by real-time listeners
}