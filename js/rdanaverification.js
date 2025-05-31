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

  let currentPage = 1;
  const rowsPerPage = 5;
  let allLogs = []; // Will hold your full logs array


  const submittedReportsContainer = document.getElementById("submittedReportsContainer");
  const paginationContainer = document.getElementById("pagination");
  const entriesInfo = document.getElementById("entriesInfo");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  // Check if user is authenticated
  auth.onAuthStateChanged(user => {
    if (!user) {
      Swal.fire({
        icon: 'error',
        title: 'Authentication Required',
        text: 'Please sign in to access RDANA reports.',
      }).then(() => {
        window.location.href = "../pages/login.html";
      });
      return;
    }

    console.log("User authenticated:", user.uid);
    loadSubmittedReports(user.uid);
  });

  function loadSubmittedReports(userUid) {
    console.log("Loading submitted reports for user:", userUid);
    database.ref("rdana/submitted").on("value", snapshot => {
      let rdanaLogs = [];
      const reports = snapshot.val();
      console.log("Submitted reports snapshot:", reports);
      if (reports) {
        Object.keys(reports).forEach(key => {
          const report = reports[key];
          rdanaLogs.push({
            firebaseKey: key,
            ...report
          });
        });
      } else {
        console.log("No submitted reports found in rdana/submitted");
      }
      applySearchAndSort(rdanaLogs);
    }, error => {
      console.error("Error fetching submitted RDANA reports:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load submitted RDANA reports: ' + error.message,
      });
    });
  }

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

  function applySearchAndSort(logs = allLogs) {
    let filtered = [...logs];
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
      <td>${report.rdanaGroup}</td>
      <td>${report.dateTime}</td>
      <td>${report.siteLocation || "N/A"}</td>
      <td>${report.disasterType}</td>
      <td>${report.effects?.affectedPopulation || "N/A"}</td>
      <td>${report.needs?.priority?.join(", ") || "N/A"}</td>
      <td>
        <button class="viewBtn">View</button>
        <button class="approveBtn">Approve</button>
        <button class="rejectBtn">Reject</button>
      </td>
    `;

      tr.querySelector(".viewBtn").addEventListener("click", () => showDetails(report));
      tr.querySelector(".approveBtn").addEventListener("click", () => approveReport(report));
      tr.querySelector(".rejectBtn").addEventListener("click", () => rejectReport(report));

      submittedReportsContainer.appendChild(tr);
      console.log("Verifying Report:", report);
    });

    renderPagination(reports.length, reports);
  }

function renderPagination(totalItems, filteredLogs) {
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  paginationContainer.innerHTML = '';

  if (totalPages === 0) {
    paginationContainer.innerHTML = '<span>No entries to display</span>';
    return;
  }

  const createButton = (label, page, disabled = false, isActive = false) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (disabled) btn.disabled = true;
    if (isActive) btn.classList.add('active-page');
    btn.addEventListener('click', () => {
      // Clamp page number to valid range
      currentPage = Math.min(Math.max(page, 1), totalPages);
      applySearchAndSort(filteredLogs); // Pass filtered logs here
    });
    return btn;
  };

  paginationContainer.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));

   const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
  }

  paginationContainer.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
}


  
  function formatKey(key) {
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  function showDetails(report) {
    const modal = document.getElementById("previewModal");
    const modalDetails = document.getElementById("modalContent");

    let reportIDHTML = `<h2>${report.rdanaId}`;

    // Profile Section
    let profileHTML = `<h3>Profile of the Disaster</h3><div class='table-scroll'><table class='preview-table'>`;
    profileHTML += `<tr><td id='label'>Type of Disaster</td><td>${report.disasterType || "N/A"}</td></tr>`;
    for (const [key, value] of Object.entries(report.profile || {})) {
        const label = formatKey(key);
        profileHTML += `<tr><td id='label'>${label}</td><td>${value}</td></tr>`;
    }
    profileHTML += `</table></div>`;

    // Modality Section
    let modalityHTML = `<h3>Modality of the Disaster</h3><div class='table-scroll'><table class='preview-table'>`;
    for (const [key, value] of Object.entries(report.modality || {})) {
        const label = formatKey(key);
        modalityHTML += `<tr><td id='label'>${label}</td><td>${value}</td></tr>`;
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

    // Other Needs and Response Section (with margin styling)
    let otherNeedsHTML = `
        <p><strong>Other Immediate Needs:</strong> ${report.otherNeeds || "N/A"}</p>
        <p><strong>Estimated Quantity:</strong> ${report.estQty || "N/A"}</p>
        <h3 style="margin-top: 15px; margin-bottom: 10px;">Initial Response Actions</h3>
        <p><strong>Response Groups Involved:</strong> ${report.responseGroup || "N/A"}</p>
        <p><strong>Relief Assistance Deployed:</strong> ${report.reliefDeployed || "N/A"}</p>
        <p><strong>Number of Families Served:</strong> ${report.familiesServed || "N/A"}</p>
    `;

    // Combine all sections
    modalDetails.innerHTML = reportIDHTML + profileHTML + modalityHTML + summaryHTML + affectedHTML + structureHTML + checklistHTML + otherNeedsHTML;

    // Show modal
    modal.style.display = "block";

    // Modal close actions
    const closeModal = document.getElementById("closeModal");
    closeModal.onclick = () => { modal.style.display = "none"; };
    window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };
}



  function approveReport(report) {
    auth.onAuthStateChanged(user => {
      if (!user) {
        Swal.fire({
          icon: 'error',
          title: 'Authentication Required',
          text: 'Please sign in to approve reports.',
        }).then(() => {
          window.location.href = "../pages/login.html";
        });
        return;
      }

      console.log("Attempting to approve report:", report.rdanaId);

      // Check if user is admin
      database.ref(`users/${user.uid}/role`).once('value', snapshot => {
        report.status = "Approved";
        Promise.all([
          database.ref(`rdana/approved`).push(report),
          database.ref(`users/${report.userUid}/rdanaReports/${report.firebaseKey}`).set({ ...report, status: "Approved" }),
          database.ref(`rdana/submitted/${report.firebaseKey}`).remove()
        ])
          .then(() => {
            console.log("RDANA report approved and moved to rdana/approved");
            Swal.fire({
            icon: 'success',
            title: 'Report Approved',
            text: 'The RDANA report has been approved and moved to the logs.',
            background: '#e6ffed',         
            color: '#1e4620',               
            iconColor: '#22c55e',          
            confirmButtonColor: '#16a34a',  
            timer: 2500,                   
            showConfirmButton: false,
            customClass: {
              popup: 'swal2-popup-success-clean',
              title: 'swal2-title-success-clean',
              content: 'swal2-text-success-clean'
            }
          });
          })
          .catch(error => {
            console.error("Error during RDANA report approval:", error);
          Swal.fire({
          icon: 'error',
          title: 'Approval Failed',
          text: 'Failed to approve RDANA report: ' + error.message,
          background: '#fdecea',         
          color: '#611a15',               
          iconColor: '#e02424',           
          confirmButtonColor: '#b91c1c',  
          timer: 3500,                   
          showConfirmButton: true,
          customClass: {
            popup: 'swal2-popup-error-clean',
            title: 'swal2-title-error-clean',
            content: 'swal2-text-error-clean'
          }
        });

          });
      });
    });
  }

  function rejectReport(report) {
    auth.onAuthStateChanged(user => {
      if (!user) {
        Swal.fire({
          icon: 'error',
          title: 'Authentication Required',
          text: 'Please sign in to reject reports.',
        }).then(() => {
          window.location.href = "../pages/login.html";
        });
        return;
      }

      console.log("Attempting to reject report:", report.rdanaId);

      Promise.all([
        database.ref(`rdana/submitted/${report.firebaseKey}`).remove(),
        database.ref(`users/${report.userUid}/rdanaReports/${report.firebaseKey}`).remove()
      ])
        .then(() => {
          console.log("RDANA report rejected and removed");
          Swal.fire({
          icon: 'error',
          title: 'Report Rejected',
          text: 'The RDANA report has been rejected and removed from the system.',
          background: '#f8d7da',         
          color: '#721c24',               
          iconColor: '#b02a37',         
          confirmButtonColor: '#b02a37',  
          timer: 3000,
          showConfirmButton: true,
        });
        })
        .catch(error => {
          console.error("Error during RDANA report rejection:", error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to reject RDANA report: ' + error.message,
          });
        });
    });
  }

  const viewApprovedBtn = document.getElementById("viewApprovedBtn");
  if (viewApprovedBtn) {
    viewApprovedBtn.addEventListener("click", () => {
      window.location.href = "../pages/rdanaLog.html";
    });
  }

  if (searchInput && sortSelect) {
    searchInput.addEventListener("input", () => applySearchAndSort());
    sortSelect.addEventListener("change", () => applySearchAndSort());
  }
});