document.addEventListener('DOMContentLoaded', () => {
  // Firebase configuration
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

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  const auth = firebase.auth();

  let rdanaLogs = [];
  let filteredLogs = [];
  const rowsPerPage = 5;
  let currentPage = 1;

  // Check if user is authenticated
  auth.onAuthStateChanged(user => {
    if (!user) {
      Swal.fire({
        icon: 'error',
        title: 'Authentication Required',
        text: 'Please sign in to access RDANA logs.',
      }).then(() => {
        window.location.href = "../pages/login.html";
      });
      return;
    }

    console.log("User authenticated:", user.uid);
    loadApprovedReports(user.uid);
  });

  function loadApprovedReports(userUid) {
    console.log("Loading approved reports for user:", userUid);
    database.ref("rdana/approved").on("value", snapshot => {
      rdanaLogs = [];
      const reports = snapshot.val();
      console.log("Approved reports snapshot:", reports);
      if (reports) {
        Object.keys(reports).forEach(key => {
          const report = reports[key];
          rdanaLogs.push({
            firebaseKey: key,
            ...report
          });
        });
      } else {
        console.log("No approved reports found in rdana/approved");
      }
      filteredLogs = [...rdanaLogs];
      renderTable(filteredLogs);
    }, error => {
      console.error("Error fetching approved RDANA reports:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load approved RDANA reports: ' + error.message,
      });
    });
  }

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
        <td>${log.profile?.Site_Location_Address_Barangay || log.siteLocation || "N/A"}</td>
        <td>${log.disasterType}</td>
        <td>${log.effects?.affectedPopulation ?? "N/A"}</td>
        <td>${log.needs?.priority?.join(", ") ?? "N/A"}</td>
        <td>
          <button class="viewBtn">View</button>
          <button class="deleteBtn">Delete</button>
        </td>
      `;
      // Attach event listeners programmatically
      const viewBtn = row.querySelector(".viewBtn");
      const deleteBtn = row.querySelector(".deleteBtn");
      viewBtn.addEventListener("click", () => viewLog(start + index));
      deleteBtn.addEventListener("click", () => deleteLog(log.firebaseKey, start + index));
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

  function deleteLog(firebaseKey, globalIndex) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        // Delete from Firebase
        Promise.all([
          database.ref(`rdana/approved/${firebaseKey}`).remove(),
          database.ref(`users/${filteredLogs[globalIndex].userUid}/rdanaReports/${firebaseKey}`).remove()
        ])
          .then(() => {
            // Remove from local arrays
            const rdanaIdToDelete = filteredLogs[globalIndex].rdanaId;
            filteredLogs.splice(globalIndex, 1);
            const mainIndex = rdanaLogs.findIndex(log => log.rdanaId === rdanaIdToDelete);
            if (mainIndex > -1) rdanaLogs.splice(mainIndex, 1);

            // Adjust current page if needed
            const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
            if (currentPage > totalPages) currentPage = totalPages || 1;

            renderTable(filteredLogs);
            Swal.fire(
              'Deleted!',
              'The RDANA log has been deleted.',
              'success'
            );
          })
          .catch(error => {
            console.error("Error deleting RDANA log:", error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to delete RDANA log: ' + error.message,
            });
          });
      }
    });
  }

  function viewLog(globalIndex) {
    const log = filteredLogs[globalIndex];
    const previewDiv = document.getElementById("modalContent");
  
    // Profile Section
    let profileHTML = `<h3>Profile of the Disaster</h3><div class='table-scroll'><table class='preview-table'>`;
    profileHTML += `<tr><td id='label'>Type of Disaster</td><td>${log.disasterType || "N/A"}</td></tr>`;
    for (const [key, value] of Object.entries(log.profile || {})) {
      const label = formatKey(key);
      profileHTML += `<tr><td id='label'>${label}</td><td>${value}</td></tr>`;
    }
    profileHTML += `</table></div>`;

    // Modality Section
    let modalityHTML = `<h3>Modality of the Disaster</h3><div class='table-scroll'><table class='preview-table'>`;
    for (const [key, value] of Object.entries(log.modality || {})) {
      const label = formatKey(key);
      modalityHTML += `<tr><td id='label'>${label}</td><td>${value}</td></tr>`;
    }
    modalityHTML += `</table></div>`;

    // Summary Section
    let summaryHTML = `<h3>Summary of Disaster/Incident</h3><p>${log.summary || "N/A"}</p>`;

    // Affected Communities Table
    let affectedHTML = `<h3>Affected Communities</h3><div class='table-scroll'><table class='preview-table' id='rdanalog-table'><tr>
      <th>Community</th><th>Total Pop.</th><th>Affected Pop.</th><th>Deaths</th><th>Injured</th><th>Missing</th><th>Children</th><th>Women</th><th>Seniors</th><th>PWD</th></tr>`;
    (log.affectedCommunities || []).forEach(c => {
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
    (log.structureStatus || []).forEach(s => {
      structureHTML += `<tr><td>${s.structure || "-"}</td><td>${s.status || "-"}</td></tr>`;
    });
    structureHTML += `</table></div>`;

    // Needs Checklist Table
    let checklistHTML = `<h3>Initial Needs Assessment</h3><div class='table-scroll'><table class='preview-table' id='rdanalog-table'><tr><th>Item</th><th>Needed</th></tr>`;
    (log.needsChecklist || []).forEach(n => {
      checklistHTML += `<tr><td>${n.item || "-"}</td><td>${n.needed ? "Yes" : "No"}</td></tr>`;
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
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("previewModal").style.display = "none";
  });

  document.getElementById("searchInput").addEventListener("input", function () {
    const value = this.value.toLowerCase();
    filteredLogs = rdanaLogs.filter(log =>
      log.rdanaId.toLowerCase().includes(value) ||
      (log.profile?.Site_Location_Address_Barangay || log.siteLocation || "").toLowerCase().includes(value) ||
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
        return (log.profile?.Site_Location_Address_Barangay || log.siteLocation || "").toLowerCase();
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
});