document.addEventListener('DOMContentLoaded', () => {
  const rdanaLogs = [
  {
    rdanaId: "RDANA-001",
    dateTime: "2025-05-10T08:00:00Z",
    siteLocation: "Barangay X",
    disasterType: "Flood",
    effects: { affectedPopulation: 800 },
    needs: { priority: ["Water", "Food", "Medical Assistance"] },
    profile: {
      "Site Location/Address": "Barangay X",
      "Local authorities/persons contacted for information": "Barangay Captain Juan Dela Cruz",
      "Date and time of information gathered": "2025-05-10 08:00 AM",
      "Name of Organization/s Involved": "Barangay DRRMO, Local Health Unit"
    },
    modality: {
      "Locations and Areas Affected": "Barangay X, Purok 1-5",
      "Type of Disaster": "Flood",
      "Date and Time of Occurrence": "2025-05-10 06:00 AM"
    },
    summary: "Severe flooding due to continuous rainfall since dawn submerged low-lying areas. Over 150 households were displaced and are temporarily sheltered in local schools.",
    affectedCommunities: [
      {
        community: "Purok 2",
        totalPop: 1000,
        affected: 800,
        deaths: 2,
        injured: 5,
        missing: 1,
        children: 200,
        women: 250,
        seniors: 100,
        pwd: 50
      }
    ],
    structureStatus: [
      { structure: "Residential Houses", status: "Submerged up to window-level; many homes damaged." },
      { structure: "Transportation and Mobility", status: "Major access roads are impassable due to flooding." },
      { structure: "Electricity, Power Grid", status: "Power outages reported in half the barangay." },
      { structure: "Communication Networks, Internet", status: "No signal coverage in most areas." },
      { structure: "Hospitals, Rural Health Units", status: "Health unit is operational but overwhelmed." },
      { structure: "Water Supply System", status: "Contaminated sources; residents depend on rationed water." },
      { structure: "Market, Business, and Commercial Establishments", status: "Closed due to water damage and supply shortage." },
      { structure: "Others", status: "Temporary shelters set up in Barangay Hall and Elementary School." }
    ],
    needsChecklist: [
      { item: "Relief Pack", needed: true },
      { item: "Hot Meals", needed: true },
      { item: "Hygiene Kit", needed: true },
      { item: "Drinking Water", needed: true },
      { item: "Rice Packs", needed: true }
    ],
    otherNeeds: "Medicines, baby formula, mosquito nets",
    estQty: "80 families",
    responseGroup: "Barangay DRRMO, MDRRMO",
    reliefDeployed: "Rice, canned goods, water, basic medicine",
    familiesServed: "45"
  },
  {
    rdanaId: "RDANA-002",
    dateTime: "2025-04-28T14:30:00Z",
    siteLocation: "Barangay San Isidro",
    disasterType: "Earthquake",
    effects: { affectedPopulation: 350 },
    needs: { priority: ["Temporary Shelter", "Medical Support", "Rescue Equipment"] },
    profile: {
      "Site Location/Address": "Barangay San Isidro",
      "Local authorities/persons contacted for information": "Kagawad Maria Lopez",
      "Date and time of information gathered": "2025-04-28 02:30 PM",
      "Name of Organization/s Involved": "Municipal DRRMO, Bureau of Fire Protection"
    },
    modality: {
      "Locations and Areas Affected": "Barangay San Isidro Central Zone",
      "Type of Disaster": "Earthquake",
      "Date and Time of Occurrence": "2025-04-28 01:15 PM"
    },
    summary: "A magnitude 6.3 earthquake struck the area, causing structural damage to several homes and minor injuries. Residents evacuated to open fields and plazas.",
    affectedCommunities: [
      {
        community: "Zone 3",
        totalPop: 500,
        affected: 350,
        deaths: 0,
        injured: 12,
        missing: 0,
        children: 100,
        women: 150,
        seniors: 60,
        pwd: 40
      }
    ],
    structureStatus: [
      { structure: "Residential Houses", status: "Cracks on walls; some partially collapsed." },
      { structure: "Transportation and Mobility", status: "Clear and passable." },
      { structure: "Electricity, Power Grid", status: "Operational with minor interruptions." },
      { structure: "Communication Networks, Internet", status: "Fully functional." },
      { structure: "Hospitals, Rural Health Units", status: "Handling minor injuries; on standby for serious cases." },
      { structure: "Water Supply System", status: "Intact but under monitoring for damage." },
      { structure: "Market, Business, and Commercial Establishments", status: "Operational with minor damage." },
      { structure: "Others", status: "Tents set up by local government for displaced families." }
    ],
    needsChecklist: [
      { item: "Relief Pack", needed: true },
      { item: "Hot Meals", needed: true },
      { item: "Hygiene Kit", needed: true },
      { item: "Drinking Water", needed: false },
      { item: "Rice Packs", needed: true }
    ],
    otherNeeds: "Sleeping mats, trauma kits, flashlights",
    estQty: "30 families",
    responseGroup: "MDRRMO, Fire Rescue",
    reliefDeployed: "Basic first aid kits, blankets, rice",
    familiesServed: "28"
  },
  {
    rdanaId: "RDANA-003",
    dateTime: "2025-03-15T10:45:00Z",
    siteLocation: "Barangay Mabini",
    disasterType: "Landslide",
    effects: { affectedPopulation: 120 },
    needs: { priority: ["Rescue Operations", "Evacuation", "Earth-moving Equipment"] },
    profile: {
      "Site Location/Address": "Sitio Alta, Barangay Mabini",
      "Local authorities/persons contacted for information": "Brgy. Chairperson Ana Robles",
      "Date and time of information gathered": "2025-03-15 10:45 AM",
      "Name of Organization/s Involved": "Municipal Engineering Office, PNP, BFP"
    },
    modality: {
      "Locations and Areas Affected": "Sitio Alta, Hillside settlements",
      "Type of Disaster": "Landslide",
      "Date and Time of Occurrence": "2025-03-15 03:00 AM"
    },
    summary: "A landslide triggered by overnight rainfall buried several houses. Emergency response teams are currently conducting search and rescue operations.",
    affectedCommunities: [
      {
        community: "Sitio Alta",
        totalPop: 150,
        affected: 120,
        deaths: 4,
        injured: 6,
        missing: 3,
        children: 30,
        women: 40,
        seniors: 25,
        pwd: 10
      }
    ],
    structureStatus: [
      { structure: "Residential Houses", status: "Several homes buried or severely damaged." },
      { structure: "Transportation and Mobility", status: "Roads blocked by debris." },
      { structure: "Electricity, Power Grid", status: "Completely cut off." },
      { structure: "Communication Networks, Internet", status: "Weak to no signal in affected areas." },
      { structure: "Hospitals, Rural Health Units", status: "Nearest hospital 8 km away; limited transport." },
      { structure: "Water Supply System", status: "Pipes destroyed in affected zone." },
      { structure: "Market, Business, and Commercial Establishments", status: "Not present in the affected zone." },
      { structure: "Others", status: "Landslide perimeter cordoned off by authorities." }
    ],
    needsChecklist: [
      { item: "Relief Pack", needed: true },
      { item: "Hot Meals", needed: true },
      { item: "Hygiene Kit", needed: false },
      { item: "Drinking Water", needed: true },
      { item: "Rice Packs", needed: true }
    ],
    otherNeeds: "Backhoes, body bags, trauma counselors",
    estQty: "20 families",
    responseGroup: "PNP, MDRRMO, Red Cross Volunteers",
    reliefDeployed: "Water, rice, canned meat, mobile health team",
    familiesServed: "19"
  }
];


  let currentPage = 1;
  const rowsPerPage = 5;

  const submittedReportsContainer = document.getElementById("submittedReportsContainer");
  const paginationContainer = document.getElementById("pagination");
  const entriesInfo = document.getElementById("entriesInfo");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }
  

  function getSortValue(log, key) {
  switch (key) {
    case 'DateTime':
      return new Date(log.dateTime).getTime();
    case 'RDANAID':
      return parseInt(log.rdanaId.split('-')[1], 10);
    case 'Location':
      return log.siteLocation.toLowerCase();
    case 'DisasterType':
      return log.disasterType.toLowerCase();
    case 'AffectedPopulation':
      return log.effects?.affectedPopulation ?? 0;
    case 'Needs':
      return (log.needs?.priority?.join(", ") ?? "").toLowerCase();
    default:
      return '';
  }
}

function applySearchAndSort() {
  let filtered = [...rdanaLogs];
  const searchTerm = searchInput.value.toLowerCase();

  if (searchTerm) {
    filtered = filtered.filter(log =>
      log.rdanaId.toLowerCase().includes(searchTerm) ||
      log.siteLocation.toLowerCase().includes(searchTerm) ||
      log.disasterType.toLowerCase().includes(searchTerm) ||
      (log.needs?.priority?.join(", ").toLowerCase().includes(searchTerm) || false)
    );
  }

  const sortBy = sortSelect.value;
  if (sortBy) {
    const [key, order] = sortBy.split("-");
    filtered.sort((a, b) => {
      const valA = getSortValue(a, key);
      const valB = getSortValue(b, key);

      if (typeof valA === 'string' && typeof valB === 'string') {
        return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return order === 'asc' ? valA - valB : valB - valA;
    });
  }

  renderReportsTable(filtered);
}


  function renderReportsTable(reports) {
    submittedReportsContainer.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const paginated = reports.slice(start, start + rowsPerPage);

    entriesInfo.textContent = `Showing ${start + 1} to ${start + paginated.length} of ${reports.length} entries`;

    paginated.forEach((report, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${start + index + 1}</td>
        <td>${report.rdanaId}</td>
        <td>${formatDate(report.dateTime)}</td>
        <td>${report.siteLocation}</td>
        <td>${report.disasterType}</td>
        <td>${report.effects?.affectedPopulation}</td>
        <td>${report.needs?.priority?.join(", ")}</td>
        <td>
        <button class="viewBtn">View</button>
        <button class="approveBtn">Approve</button>
        <button class="rejectBtn">Reject</button>
        </td>
    `;

    tr.querySelector(".viewBtn").addEventListener("click", () => showDetails(report));
    tr.querySelector(".approveBtn").addEventListener("click", () => alert(`Approved ${report.rdanaId}`));
    tr.querySelector(".rejectBtn").addEventListener("click", () => alert(`Rejected ${report.rdanaId}`));

    submittedReportsContainer.appendChild(tr);
    });

    renderPagination(reports.length);
  }

  function renderPagination(totalItems) {
  const pageCount = Math.ceil(totalItems / rowsPerPage);
  paginationContainer.innerHTML = '';

  if (pageCount === 0) {
    paginationContainer.innerHTML = '<span>No entries to display</span>';
    return;
  }

  const createButton = (label, page, disabled = false, isActive = false) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (disabled) btn.disabled = true;
    if (isActive) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentPage = page;
      applySearchAndSort(); // <- maintain your current logic
    });
    return btn;
  };

  // Prev button
  paginationContainer.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));

  // Numbered page buttons (max 5 visible)
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(pageCount, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
  }

  // Next button
  paginationContainer.appendChild(createButton('Next', currentPage + 1, currentPage === pageCount));
}


  function formatKey(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());
}

function showDetails(report) {
  const modal = document.getElementById("reportModal");
  const modalDetails = document.getElementById("modalReportDetails");
  const closeModal = document.getElementById("closeModal");

  // Profile Section
  let profileHTML = `<h3>Profile of the Disaster</h3><div class='table-scroll'><table class='preview-table'>`;
  for (const [key, value] of Object.entries(report.profile || {})) {
    profileHTML += `<tr><td id='label'>${formatKey(key)}</td><td>${value}</td></tr>`;
  }
  profileHTML += `</table></div>`;

  // Modality Section
  let modalityHTML = `<h3>Modality of the Disaster</h3><div class='table-scroll'><table class='preview-table'>`;
  for (const [key, value] of Object.entries(report.modality || {})) {
    modalityHTML += `<tr><td id='label'>${formatKey(key)}</td><td>${value}</td></tr>`;
  }
  modalityHTML += `</table></div>`;

  // Summary Section
  let summaryHTML = `<h3>Summary of Disaster/Incident</h3><p>${report.summary || "N/A"}</p>`;

  // Affected Communities Table
  let affectedHTML = `<h3>Affected Communities</h3><div class='table-scroll'><table class='preview-table' id='rdanalog-table'><tr>
    <th>Community</th><th>Total Pop.</th><th>Affected Pop.</th><th>Deaths</th><th>Injured</th><th>Missing</th><th>Children</th><th>Women</th><th>Seniors</th><th>PWD</th></tr>`;
  (report.affectedCommunities || []).forEach(c => {
    affectedHTML += `<tr>
      <td>${c.community || "-"}</td>
      <td>${c.totalPop || 0}</td>
      <td>${c.affected || 0}</td>
      <td>${c.deaths || 0}</td>
      <td>${c.injured || 0}</td>
      <td>${c.missing || 0}</td>
      <td>${c.children || 0}</td>
      <td>${c.women || 0}</td>
      <td>${c.seniors || 0}</td>
      <td>${c.pwd || 0}</td>
    </tr>`;
  });
  affectedHTML += `</table></div>`;

  // Structure Status Table
  let structureHTML = `<h3>Status of Structures</h3><div class='table-scroll'><table class='preview-table' id='rdanalog-table'><tr><th>Structure</th><th>Status</th></tr>`;
  (report.structureStatus || []).forEach(s => {
    structureHTML += `<tr><td>${s.structure || "-"}</td><td>${s.status || "-"}</td></tr>`;
  });
  structureHTML += `</table></div>`;

  // Needs Checklist Table
  let checklistHTML = `<h3>Initial Needs Assessment</h3><div class='table-scroll'><table class='preview-table' id='rdanalog-table'><tr><th>Item</th><th>Needed</th></tr>`;
  (report.needsChecklist || []).forEach(n => {
    checklistHTML += `<tr><td>${n.item || "-"}</td><td>${n.needed ? "Yes" : "No"}</td></tr>`;
  });
  checklistHTML += `</table></div>`;

  // Other Needs and Response Section
  let otherNeedsHTML = `
    <p><strong>Other Immediate Needs:</strong> ${report.otherNeeds || "N/A"}</p>
    <p><strong>Estimated Quantity:</strong> ${report.estQty || "N/A"}</p>
    <h3>Initial Response Actions</h3>
    <p><strong>Response Groups Involved:</strong> ${report.responseGroup || "N/A"}</p>
    <p><strong>Relief Assistance Deployed:</strong> ${report.reliefDeployed || "N/A"}</p>
    <p><strong>Number of Families Served:</strong> ${report.familiesServed || "N/A"}</p>
  `;

  // Inject all combined HTML into modal content container
  modalDetails.innerHTML = profileHTML + modalityHTML + summaryHTML + affectedHTML + structureHTML + checklistHTML + otherNeedsHTML;

  // Show modal
  modal.style.display = "block";

  // Close modal handlers — preferably add these once outside this function
  closeModal.onclick = () => modal.style.display = "none";
  window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };
}

const viewApprovedBtn = document.getElementById("viewApprovedBtn");
    if (viewApprovedBtn) {
        viewApprovedBtn.addEventListener("click", () => {
            window.location.href = "../pages/rdanaLog.html";
        });
    }

  searchInput.addEventListener("input", applySearchAndSort);
  sortSelect.addEventListener("change", applySearchAndSort);

  applySearchAndSort(); // Initial load
});
