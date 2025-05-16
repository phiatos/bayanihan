// Sample array of logs for testing (add your actual data here)
const rdanaLogs = [
  {
    rdanaId: "RDANA-001",
    dateTime: "2025-05-10T08:00:00Z",
    siteLocation: "Barangay X",
    disasterType: "Flood",
    effects: { affectedPopulation: 800 },
    needs: { priority: ["Water", "Food"] },
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
    summary: "Severe flooding caused by continuous heavy rainfall since early morning. Major roads were submerged, and households were displaced.",
    affectedCommunities: [
      {
        community: "Brgy 1",
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
      { structure: "Residential Houses", status: "Some houses are flooded and structurally damaged." },
      { structure: "Transportation and Mobility", status: "Roads are clear of debris and/or flood; passable." },
      { structure: "Electricity, Power Grid", status: "Some areas experiencing power outages." },
      { structure: "Communication Networks, Internet", status: "Communication lines are currently down." },
      { structure: "Hospitals, Rural Health Units", status: "Some health facilities are operational with limited staff." },
      { structure: "Water Supply System", status: "Clean water is available in limited quantities." },
      { structure: "Market, Business, and Commercial Establishments", status: "Major markets are open but experiencing low supply." },
      { structure: "Others", status: "Evacuation centers are functioning in nearby schools." }
    ],
    needsChecklist: [
      { item: "Relief Pack", needed: true },
      { item: "Hot Meals", needed: false },
      { item: "Hygienes Kit", needed: true },
      { item: "Drinking Water", needed: true },
      { item: "Rice Packs", needed: true }
    ],
    otherNeeds: "Wheelchairs, blankets, infant formula",
    estQty: "50 families",
    responseGroup: "Barangay DRRMO, MDRRMO",
    reliefDeployed: "Rice, canned goods, bottled water",
    familiesServed: "45"
  }
];


let filteredLogs = [...rdanaLogs];
const rowsPerPage = 5;
let currentPage = 1;

function renderTable(logs) {
  const tbody = document.querySelector("#orgTable tbody");
  tbody.innerHTML = "";

  const totalEntries = logs.length;
  const totalPages = Math.ceil(totalEntries / rowsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageLogs = logs.slice(start, end);

  pageLogs.forEach((log, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${start + index + 1}</td>
      <td>${log.rdanaId}</td>
      <td>${new Date(log.dateTime).toLocaleString()}</td>
      <td>${log.siteLocation}</td>
      <td>${log.disasterType}</td>
      <td>${log.effects?.affectedPopulation ?? "N/A"}</td>
      <td>${log.needs?.priority?.join(", ") ?? "N/A"}</td>
      <td>
        <button class="viewBtn" onclick="viewLog(${start + index})">View</button>
        <button class="deleteBtn" onclick="deleteLog(${start + index})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById("entriesInfo").textContent = 
    totalEntries > 0
      ? `Showing ${start + 1} to ${Math.min(end, totalEntries)} of ${totalEntries} entries`
      : "No entries found";

  renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = '';

  if (totalPages === 0) {
    pagination.innerHTML = '<span>No entries to display</span>';
    return;
  }

  const createButton = (label, page, disabled = false, isActive = false) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (disabled) btn.disabled = true;
    if (isActive) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentPage = page;
      renderTable(filteredLogs);
    });
    return btn;
  };

  pagination.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pagination.appendChild(createButton(i, i, false, i === currentPage));
  }

  pagination.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
}

function deleteLog(globalIndex) {
  if (confirm("Are you sure you want to delete this entry?")) {
    const rdanaIdToDelete = filteredLogs[globalIndex].rdanaId;

    // Remove from filteredLogs
    filteredLogs.splice(globalIndex, 1);

    // Remove from main array
    const mainIndex = rdanaLogs.findIndex(log => log.rdanaId === rdanaIdToDelete);
    if (mainIndex > -1) rdanaLogs.splice(mainIndex, 1);

    // Adjust current page if needed
    const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    renderTable(filteredLogs);
  }
}

function viewLog(globalIndex) {
  const log = filteredLogs[globalIndex];
  const previewDiv = document.getElementById("modalContent");
  
  // Profile Section
  let profileHTML = `<h3>Profile of the Disaster</h3><div class='table-scroll'><table class='preview-table'>`;
  for (const [key, value] of Object.entries(log.profile)) {
    const label = formatKey(key);
    profileHTML += `<tr><td id='label'>${label}</td><td>${value}</td></tr>`;
  }
  profileHTML += `</table></div>`;

    // Modality Section
  let modalityHTML = `<h3>Modality of the Disaster</h3><div class='table-scroll'><table class='preview-table'>`;
  for (const [key, value] of Object.entries(log.modality)) {
    const label = formatKey(key);
    modalityHTML += `<tr><td id='label'>${label}</td><td>${value}</td></tr>`;
  }
  modalityHTML += `</table></div>`;

  // Summary Section
  let summaryHTML = `<h3>Summary of Disaster/Incident</h3><p>${log.summary}</p>`;

  // Affected Communities Table
  let affectedHTML = `<h3>Affected Communities</h3><div class='table-scroll'><table class='preview-table' id='rdanalog-table'><tr>
    <th>Community</th><th>Total Pop.</th><th>Affected Pop.</th><th>Deaths</th><th>Injured</th><th>Missing</th><th>Children</th><th>Women</th><th>Seniors</th><th>PWD</th></tr>`;
  log.affectedCommunities.forEach(c => {
    affectedHTML += `<tr>
      <td>${c.community}</td>
      <td>${c.totalPop}</td>
      <td>${c.affected}</td>
      <td>${c.deaths}</td>
      <td>${c.injured}</td>
      <td>${c.missing}</td>
      <td>${c.children}</td>
      <td>${c.women}</td>
      <td>${c.seniors}</td>
      <td>${c.pwd}</td>
    </tr>`;
  });
  affectedHTML += `</table></div>`;

  // Structure Status Table
  let structureHTML = `<h3>Status of Structures</h3><div class='table-scroll'><table class='preview-table' id='rdanalog-table'><tr><th>Structure</th><th>Status</th></tr>`;
  log.structureStatus.forEach(s => {
    structureHTML += `<tr><td>${s.structure}</td><td>${s.status}</td></tr>`;
  });
  structureHTML += `</table></div>`;

  // Needs Checklist Table
  let checklistHTML = `<h3>Initial Needs Assessment</h3><div class='table-scroll'><table class='preview-table' id='rdanalog-table'><tr><th>Item</th><th>Needed</th></tr>`;
  log.needsChecklist.forEach(n => {
    checklistHTML += `<tr><td>${n.item}</td><td>${n.needed ? "Yes" : "No"}</td></tr>`;
  });
  checklistHTML += `</table></div>`;

  // Other Needs and Response Section
  let otherNeedsHTML = `
    <p><strong>Other Immediate Needs:</strong> ${log.otherNeeds || "N/A"}</p>
    <p><strong>Estimated Quantity:</strong> ${log.estQty || "N/A"}</p>
    <h3 style="margin-top: 15px; margin-bottom: 10px;">Initial Response Actions</h3>
    <p><strong>Response Groups Involved:</strong> ${log.responseGroup || "N/A"}</p>
    <p><strong>Relief Assistance Deployed:</strong> ${log.reliefDeployed || "N/A"}</p>
    <p><strong>Number of Families Served:</strong> ${log.familiesServed || "N/A"}</p>
  `;

  previewDiv.innerHTML = profileHTML + modalityHTML + summaryHTML + affectedHTML + structureHTML + checklistHTML + otherNeedsHTML;

  document.getElementById("previewModal").style.display = "block";
}

function formatKey(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("previewModal").style.display = "none";
});

document.getElementById("searchInput").addEventListener("input", function () {
  const value = this.value.toLowerCase();
  filteredLogs = rdanaLogs.filter(log =>
    log.rdanaId.toLowerCase().includes(value) ||
    log.siteLocation.toLowerCase().includes(value) ||
    log.disasterType.toLowerCase().includes(value) ||
    (log.needs?.priority?.join(", ").toLowerCase().includes(value) || false)
  );
  currentPage = 1;
  renderTable(filteredLogs);
});

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

document.getElementById("sortSelect").addEventListener("change", function () {
  const value = this.value;
  if (!value) {
    filteredLogs = [...rdanaLogs];
  } else {
    const [key, order] = value.split("-");
    filteredLogs.sort((a, b) => {
      let valA = getSortValue(a, key);
      let valB = getSortValue(b, key);

      if (typeof valA === 'string' && typeof valB === 'string') {
        return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
}
return order === 'asc' ? valA - valB : valB - valA;
});
}
currentPage = 1;
renderTable(filteredLogs);
});

// Initial render
renderTable(filteredLogs);