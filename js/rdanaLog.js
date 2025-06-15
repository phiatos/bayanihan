document.addEventListener('DOMContentLoaded', () => {
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
  const auth = firebase.auth();

  // Variables for inactivity detection
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    console.log("Inactivity timer reset.");
}

// Function to check for inactivity and prompt the user
function checkInactivity() {
    Swal.fire({
        title: 'Are you still there?',
        text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Stay Login',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false,
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            resetInactivityTimer(); // User chose to continue, reset the timer
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // User chose to log out
            auth.signOut().then(() => {
                console.log("User logged out due to inactivity.");
                window.location.href = "../pages/login.html"; // Redirect to login page
            }).catch((error) => {
                console.error("Error logging out:", error);
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

// Attach event listeners to detect user activity
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});

  const exportExcelBtn = document.getElementById('exportExcelBtn'); 
  const savePdfBtn = document.getElementById('savePdfBtn');
  const entriesInfo = document.querySelector("#entriesInfo");
  const paginationContainer = document.querySelector("#pagination");

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

    resetInactivityTimer(); // Start timer

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

    // Handle case when there are no logs to display on this page
    if (pageLogs.length === 0) {
      tbody.innerHTML = "<tr><td colspan='9'>No logs found on this page.</td></tr>";
      const entriesInfo = document.getElementById("entriesInfo");
      if (entriesInfo) {
        entriesInfo.textContent = "Showing 0 to 0 of 0 entries";
      }
      return;
    }

    // Update entries info
    const entriesInfo = document.getElementById("entriesInfo");
    if (entriesInfo) {
      entriesInfo.textContent = `Showing ${start + 1} to ${start + pageLogs.length} of ${totalEntries} entries`;
    }
    
    pageLogs.forEach((log, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${start + index + 1}</td>
        <td>${log.rdanaId}</td>
        <td>${log.rdanaGroup}</td>
        <td>${new Date(log.dateTime).toLocaleString()}</td>
        <td>${log.profile?.Site_Location_Address_Barangay || log.siteLocation || "N/A"}</td>
        <td>${log.disasterType}</td>
        <td>${log.effects?.affectedPopulation ?? "N/A"}</td>
        <td>${log.needs?.priority?.join(", ") ?? "N/A"}</td>
        <td>
          <button class="viewBtn">View</button>
          <button class="deleteBtn">Archive</button>
          <button class="savePDFBtn">Save PDF</button>
        </td>
      `;
      // Attach event listeners programmatically
      const viewBtn = row.querySelector(".viewBtn");
      const deleteBtn = row.querySelector(".deleteBtn");
      const savePDFBtn = row.querySelector(".savePDFBtn");
      viewBtn.addEventListener("click", () => viewLog(start + index));
      deleteBtn.addEventListener("click", () => deleteLog(log.firebaseKey, start + index));
      savePDFBtn.addEventListener("click", () => saveIndividualLogToPdf(log));
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
      if (isActive) btn.classList.add('active-page');
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
    text: 'This will remove the RDANA log from the active list but keep it in the database for future access.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d9534f',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel',
    background: '#fff',
    color: '#212529',
    iconColor: '#d9534f',
    position: 'center',
    customClass: {
      popup: 'custom-swal-popup',
      title: 'custom-swal-title',
      content: 'custom-swal-text',
      confirmButton: 'custom-confirm-btn',
      cancelButton: 'custom-cancel-btn'
    },
    buttonsStyling: false,
  }).then((result) => {
    if (result.isConfirmed) {
      const userUid = filteredLogs[globalIndex]?.userUid;
      const rdanaId = filteredLogs[globalIndex]?.rdanaId;
      if (!userUid || !rdanaId) {
        console.error("Invalid userUid or rdanaId:", { userUid, rdanaId, log: filteredLogs[globalIndex] });
        Swal.fire({
          icon: 'error',
          title: 'Delete Error',
          text: 'Invalid user or RDANA ID. Cannot delete.',
        });
        return;
      }

      // Find the correct key by matching rdanaId
      database.ref('rdana/approved').orderByChild('rdanaId').equalTo(rdanaId).once('value')
        .then(snapshot => {
          const reports = snapshot.val();
          if (!reports) {
            console.warn(`RDANA log with rdanaId ${rdanaId} not found in rdana/approved. Proceeding with UI update.`);
            return Promise.resolve();
          }

          // Get the actual key (there should only be one match since rdanaId is unique)
          const actualKey = Object.keys(reports)[0];
          const logData = reports[actualKey];
          if (!actualKey || !logData) {
            console.warn(`RDANA log with rdanaId ${rdanaId} not found in rdana/approved. Proceeding with UI update.`);
            return Promise.resolve();
          }

          // Move to deletedrdana with the actual key
          return database.ref(`deletedrdana/${actualKey}`).set({
            ...logData,
            deletedAt: new Date().toISOString()
          }).then(() => ({ actualKey }));
        })
        .then(result => {
          if (!result) {
            // If the log wasn't found, proceed with UI update
            return Promise.resolve();
          }
          const { actualKey } = result;
          // Remove from rdana/approved and users/${userUid}/rdanaReports using the actual key
          return Promise.all([
            database.ref(`rdana/approved/${actualKey}`).remove(),
            database.ref(`users/${userUid}/rdanaReports/${actualKey}`).remove()
          ]);
        })
        .then(() => {
          // Update local arrays
          filteredLogs.splice(globalIndex, 1);
          const mainIndex = rdanaLogs.findIndex(log => log.rdanaId === rdanaId);
          if (mainIndex > -1) rdanaLogs.splice(mainIndex, 1);

          // Adjust current page
          const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
          if (currentPage > totalPages) currentPage = totalPages || 1;

          renderTable(filteredLogs);
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: 'RDANA log has been moved to the deleted list or was already removed.',
            timer: 2500,
            showConfirmButton: false,
            background: '#fff5f5',
            color: '#b71c1c',
            iconColor: '#d32f2f',
            customClass: {
              popup: 'swal2-popup-delete',
              title: 'swal2-title-delete',
              content: 'swal2-text-delete'
            }
          });
        })
        .catch(error => {
          console.error("Delete error:", error);
          Swal.fire({
            icon: 'error',
            title: 'Delete Error',
            text: error.message,
          });
        });
    }
  });
}

  function viewLog(globalIndex) {
    const log = filteredLogs[globalIndex];
    const previewDiv = document.getElementById("modalContent");

    let reportIDHTML = `<h2>${log.rdanaId}`;
  
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

    previewDiv.innerHTML = reportIDHTML + profileHTML + modalityHTML + summaryHTML + affectedHTML + structureHTML + checklistHTML + otherNeedsHTML;

    document.getElementById("previewModal").style.display = "block";
  }

  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("previewModal").style.display = "none";
  });

  function formatKey(key) {
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
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

  // --- Excel Export Functionality (UPDATED for COMPLETE Firebase structure) ---
  exportExcelBtn.addEventListener('click', exportToExcel);

  function exportToExcel() {
    if (rdanaLogs.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Data to Export',
        text: 'There are no RDANA logs to save to Excel.',
      });
      return;
    }

    const dataForExcel = rdanaLogs.map(log => {
      const flattenedLog = {
        "RDANA ID": log.rdanaId || "N/A",
        "Record Date/Time": log.dateTime ? new Date(log.dateTime).toLocaleString() : "N/A", // From log.dateTime
        "User UID": log.userUid || "N/A",
        "Status": log.status || "N/A",

        // Profile Information
        "Profile - Date of Information Gathered": log.profile?.Date_of_Information_Gathered || "N/A",
        "Profile - Date of Occurrence": log.profile?.Date_of_Occurrence || "N/A",
        "Profile - Local Authorities Persons Contacted": log.profile?.Local_Authorities_Persons_Contacted_for_Information || "N/A",
        "Profile - Locations & Areas Affected (Barangay)": log.profile?.Locations_and_Areas_Affected_Barangay || "N/A",
        "Profile - Locations & Areas Affected (City/Municipality)": log.profile?.Locations_and_Areas_Affected_City_Municipality || "N/A",
        "Profile - Locations & Areas Affected (Province)": log.profile?.Locations_and_Areas_Affected_Province || "N/A",
        "Profile - Name of Organizations Involved": log.profile?.Name_of_the_Organizations_Involved || "N/A",
        "Profile - Site Location Address (Barangay)": log.profile?.Site_Location_Address_Barangay || "N/A",
        "Profile - Site Location Address (City/Municipality)": log.profile?.Site_Location_Address_City_Municipality || "N/A",
        "Profile - Site Location Address (Province)": log.profile?.Site_Location_Address_Province || "N/A",
        "Profile - Time of Information Gathered": log.profile?.Time_of_Information_Gathered || "N/A",
        "Profile - Time of Occurrence": log.profile?.Time_of_Occurrence || "N/A",
        "Profile - Type of Disaster": log.profile?.Type_of_Disaster || "N/A",
        "Disaster Type": log.disasterType || "N/A",

        // Modality Information (These are directly under 'modality' with different keys than expected before)
        "Modality - Date and Time of Occurrence": log.modality?.Date_and_Time_of_Occurrence || "N/A",
        "Modality - Locations and Areas Affected": log.modality?.Locations_and_Areas_Affected || "N/A",
        "Modality - Type of Disaster (Modality)": log.modality?.Type_of_Disaster || "N/A",

        // Summary
        "Summary of Disaster/Incident": log.summary || "N/A",
        "Effects - Affected Population": log.effects?.affectedPopulation ?? "N/A",

        // Affected Communities (this is an array of objects)
        "Affected Communities - Community": Array.isArray(log.affectedCommunities) ? log.affectedCommunities.map(c => c.community).filter(Boolean).join(", ") : "N/A",
        "Affected Communities - Total Pop.": Array.isArray(log.affectedCommunities) ? log.affectedCommunities.map(c => c.totalPop).filter(val => val !== undefined && val !== null).join(", ") : "N/A",
        "Affected Communities - Affected Pop.": Array.isArray(log.affectedCommunities) ? log.affectedCommunities.map(c => c.affected).filter(val => val !== undefined && val !== null).join(", ") : "N/A",
        "Affected Communities - Deaths": Array.isArray(log.affectedCommunities) ? log.affectedCommunities.map(c => c.deaths).filter(val => val !== undefined && val !== null).join(", ") : "N/A",
        "Affected Communities - Injured": Array.isArray(log.affectedCommunities) ? log.affectedCommunities.map(c => c.injured).filter(val => val !== undefined && val !== null).join(", ") : "N/A",
        "Affected Communities - Missing": Array.isArray(log.affectedCommunities) ? log.affectedCommunities.map(c => c.missing).filter(val => val !== undefined && val !== null).join(", ") : "N/A",
        "Affected Communities - Children": Array.isArray(log.affectedCommunities) ? log.affectedCommunities.map(c => c.children).filter(val => val !== undefined && val !== null).join(", ") : "N/A",
        "Affected Communities - Women": Array.isArray(log.affectedCommunities) ? log.affectedCommunities.map(c => c.women).filter(val => val !== undefined && val !== null).join(", ") : "N/A",
        "Affected Communities - Seniors": Array.isArray(log.affectedCommunities) ? log.affectedCommunities.map(c => c.seniors).filter(val => val !== undefined && val !== null).join(", ") : "N/A",
        "Affected Communities - PWD": Array.isArray(log.affectedCommunities) ? log.affectedCommunities.map(c => c.pwd).filter(val => val !== undefined && val !== null).join(", ") : "N/A",

        "Structure Status Details": Array.isArray(log.structureStatus) ?
          log.structureStatus.map(s => `${s.structure || "N/A"}: ${s.status || "N/A"}`).filter(Boolean).join("; ") : "N/A",

        // Needs Priority
        "Needs - Priority List": log.needs?.priority?.join(", ") || "N/A",

        // Needs Checklist (this is an array of objects)
        "Needs Checklist - Items & Needed Status": Array.isArray(log.needsChecklist) ?
          log.needsChecklist.map(n => `${n.item || "N/A"}: ${n.needed ? "Yes" : "No"}`).filter(Boolean).join("; ") : "N/A",


        // Other Needs and Response (these were also directly present on the log)
        "Other Immediate Needs": log.otherNeeds || "N/A",
        "Estimated Quantity": log.estQty || "N/A",
        "Response Groups Involved": log.responseGroup || "N/A",
        "Relief Assistance Deployed": log.reliefDeployed || "N/A",
        "Number of Families Served": log.familiesServed || "N/A",

        // Keep the top-level 'siteLocation' if it's sometimes used instead of the nested 'profile' one
        "Site Location (Top Level)": log.siteLocation || "N/A",
      };
    return flattenedLog;
  });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RDANA Logs");

    const date = new Date();
    const dateString = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `RDANA_Logs_${dateString}.xlsx`;

    XLSX.writeFile(workbook, filename);

    Swal.fire({
      icon: 'success',
      title: 'Export Successful!',
      text: `All RDANA logs have been saved to "${filename}".`,
    });
  }

  // --- PDF Export Functionality (All Data) ---
  savePdfBtn.addEventListener('click', () => {
    Swal.fire({
      title: 'Generating PDF...',
      text: 'Please wait while the PDF file is being created.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    exportAllRdanaLogsToPdf();
  });

  async function exportAllRdanaLogsToPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait');

    const logsToExport = filteredLogs;

    if (logsToExport.length === 0) {
      Swal.close();
      Swal.fire({
        icon: 'info',
        title: 'No Data to Export',
        text: 'There are no RDANA logs matching your current search/sort criteria to export to PDF.',
      });
      return;
    }

    const logo = new Image();
    logo.src = '../assets/images/AB_logo.png';

    logo.onload = function() {
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const logoWidth = 30;
      const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
      const margin = 14;
      const textX = margin;
      const contentWidth = pageWidth - (2 * margin);

      const addHeaderAndFooter = (docInstance, pageNum, totalPages) => {
        let yOffset = margin;
        docInstance.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

        docInstance.setFontSize(18);
        docInstance.text("RDANA Logs Report", margin, yOffset + 8);
        yOffset += 18;

        docInstance.setFontSize(10);
        docInstance.text(`Report Generated: ${new Date().toLocaleString()}`, margin, yOffset);
        yOffset += 15;

        docInstance.setFontSize(8);
        const footerY = pageHeight - 10;
        docInstance.text(`Page ${pageNum} of ${totalPages}`, margin, footerY);
        docInstance.text("Powered by: Appvance", pageWidth - margin, footerY, { align: 'right' });

        return yOffset;
      };

      const addDetailText = (docInstance, label, value, currentY, contentAreaWidth, detailLineHeight = 5) => {
        const text = `${label}: ${value || 'N/A'}`;
        const splitText = docInstance.splitTextToSize(text, contentAreaWidth);
        docInstance.text(splitText, margin, currentY);
        return currentY + (splitText.length * detailLineHeight) + 2;
      };

      const addSectionTitle = (docInstance, title, currentY) => {
        docInstance.setFontSize(12);
        docInstance.setTextColor(20, 174, 187);
        docInstance.text(title, margin, currentY);
        docInstance.setTextColor(0);
        return currentY + 7;
      };

      let currentPage = 1;

      logsToExport.forEach((log, index) => {
        if (index > 0) {
          doc.addPage();
          currentPage++;
        }

        let yPos = addHeaderAndFooter(doc, currentPage, logsToExport.length);

        doc.setFontSize(14);
        doc.setTextColor(20, 174, 187);
        doc.text(`RDANA ID: ${log.rdanaId || "N/A"}`, textX, yPos);
        yPos += 10;
        doc.setTextColor(0);

        doc.setFontSize(10);
        yPos = addDetailText(doc, "Record Date/Time", log.dateTime ? new Date(log.dateTime).toLocaleString() : "N/A", yPos, contentWidth);
        yPos = addDetailText(doc, "Disaster Type", log.disasterType || "N/A", yPos, contentWidth);
        yPos = addDetailText(doc, "User UID", log.userUid || "N/A", yPos, contentWidth);
        yPos = addDetailText(doc, "Status", log.status || "N/A", yPos, contentWidth);

        yPos += 5;

        yPos = addSectionTitle(doc, "Profile of the Disaster", yPos);
        doc.setFontSize(10);
        for (const [key, value] of Object.entries(log.profile || {})) {
          yPos = addDetailText(doc, formatKey(key), value, yPos, contentWidth);
        }
        yPos += 5;

        yPos = addSectionTitle(doc, "Modality of the Disaster", yPos);
        doc.setFontSize(10);
        for (const [key, value] of Object.entries(log.modality || {})) {
          yPos = addDetailText(doc, formatKey(key), value, yPos, contentWidth);
        }
        yPos += 5;

        yPos = addSectionTitle(doc, "Summary of Disaster/Incident", yPos);
        doc.setFontSize(10);
        yPos = addDetailText(doc, "Summary", log.summary || "N/A", yPos, contentWidth);
        yPos += 5;

        yPos = addSectionTitle(doc, "Affected Communities", yPos);
        doc.setFontSize(8);
        const headers_affected = ["Community", "Total Pop.", "Affected Pop.", "Deaths", "Injured", "Missing", "Children", "Women", "Seniors", "PWD"];
        const data_affected = (log.affectedCommunities || []).map(c => [
          c.community || "-",
          c.totalPop || 0,
          c.affected || 0,
          c.deaths || 0,
          c.injured || 0,
          c.missing || 0,
          c.children || 0,
          c.women || 0,
          c.seniors || 0,
          c.pwd || 0
        ]);

        doc.autoTable({
          startY: yPos,
          head: [headers_affected],
          body: data_affected,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
          headStyles: { fillColor: [20, 174, 187] },
          margin: { left: margin, right: margin },
          didDrawPage: function (data) {
            yPos = data.cursor.y + 5;
          },
          didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 0) {
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
        if (doc.autoTable.previous.finalY) {
          yPos = doc.autoTable.previous.finalY + 5;
        }

        yPos = addSectionTitle(doc, "Status of Structures", yPos);
        doc.setFontSize(8);
        const headers_structure = ["Structure", "Status"];
        const data_structure = (log.structureStatus || []).map(s => [
          s.structure || "-",
          s.status || "-"
        ]);
        doc.autoTable({
          startY: yPos,
          head: [headers_structure],
          body: data_structure,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
          headStyles: { fillColor: [20, 174, 187] },
          margin: { left: margin, right: margin },
          didDrawPage: function (data) {
            yPos = data.cursor.y + 5;
          }
        });
        if (doc.autoTable.previous.finalY) {
          yPos = doc.autoTable.previous.finalY + 5;
        }

        yPos = addSectionTitle(doc, "Initial Needs Assessment", yPos);
        doc.setFontSize(8);
        const headers_needs = ["Item", "Needed"];
        const data_needs = (log.needsChecklist || []).map(n => [
          n.item || "-",
          n.needed ? "Yes" : "No"
        ]);
        doc.autoTable({
          startY: yPos,
          head: [headers_needs],
          body: data_needs,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
          headStyles: { fillColor: [20, 174, 187] },
          margin: { left: margin, right: margin },
          didDrawPage: function (data) {
            yPos = data.cursor.y + 5;
          }
        });
        if (doc.autoTable.previous.finalY) {
          yPos = doc.autoTable.previous.finalY + 5;
        }

        yPos = addSectionTitle(doc, "Other Needs and Response", yPos);
        doc.setFontSize(10);
        yPos = addDetailText(doc, "Other Immediate Needs", log.otherNeeds || "N/A", yPos, contentWidth);
        yPos = addDetailText(doc, "Estimated Quantity", log.estQty || "N/A", yPos, contentWidth);
        yPos = addDetailText(doc, "Response Groups Involved", log.responseGroup || "N/A", yPos, contentWidth);
        yPos = addDetailText(doc, "Relief Assistance Deployed", log.reliefDeployed || "N/A", yPos, contentWidth);
        yPos = addDetailText(doc, "Number of Families Served", log.familiesServed || "N/A", yPos, contentWidth);
      });

      const date = new Date();
      const dateString = date.toISOString().slice(0, 10);
      doc.save(`Approved_RDANA_Logs_${dateString}.pdf`);
      Swal.close();
      Swal.fire({
        title: 'Success!',
        text: 'PDF file generated successfully!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        color: '#1b5e20',
        iconColor: '#43a047',
        confirmButtonColor: '#388e3c',
        confirmButtonText: 'Great!',
        customClass: {
          popup: 'swal2-popup-success-export',
          title: 'swal2-title-success-export',
          content: 'swal2-text-success-export',
          confirmButton: 'swal2-button-success-export'
        }
      });
    };

    logo.onerror = function() {
      Swal.close();
      Swal.fire("Error", "Failed to load logo image at ../assets/images/AB_logo.png. Please check the path.", "error");
    };
  }

  // --- Save Single Donation to PDF ---
  function saveIndividualLogToPdf(log) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait');

    const logo = new Image();
    logo.src = '../assets/images/AB_logo.png';

    logo.onload = function() {
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const logoWidth = 30;
      const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
      const margin = 14;
      let y = margin;

      doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

      doc.setFontSize(18);
      doc.text("RDANA Log Details", margin, y + 8);
      y += 18;

      doc.setFontSize(10);
      doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 15;

      const addDetail = (label, value, isTitle = false) => {
        if (y > pageHeight - margin - 20) {
          doc.addPage();
          y = margin;
          doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
          doc.setFontSize(14);
          doc.text("RDANA Log Details (Cont.)", margin, y + 8);
          y += 18;
        }

        doc.setFontSize(isTitle ? 12 : 10);
        if (isTitle) {
          doc.setTextColor(20, 174, 187);
          doc.text(`${label}`, margin, y);
          doc.setTextColor(0);
          y += 7;
        } else {
          const text = `${label}: ${value || 'N/A'}`;
          const splitText = doc.splitTextToSize(text, pageWidth - (2 * margin));
          doc.text(splitText, margin, y);
          y += (splitText.length * 5) + 2;
        }
      };

      addDetail("RDANA ID", log.rdanaId || "N/A");
      addDetail("Record Date/Time", log.dateTime ? new Date(log.dateTime).toLocaleString() : "N/A");
      addDetail("Disaster Type", log.disasterType || "N/A");
      addDetail("User UID", log.userUid || "N/A");
      addDetail("Status", log.status || "N/A");

      y += 5;
      addDetail("Profile of the Disaster", "", true);
      for (const [key, value] of Object.entries(log.profile || {})) {
        addDetail(formatKey(key), value);
      }

      y += 5;
      addDetail("Modality of the Disaster", "", true);
      for (const [key, value] of Object.entries(log.modality || {})) {
        addDetail(formatKey(key), value);
      }

      y += 5;
      addDetail("Summary of Disaster/Incident", "", true);
      addDetail("Summary", log.summary || "N/A");

      y += 5;
      addDetail("Affected Communities", "", true);
      doc.setFontSize(8);
      const headers_affected = ["Community", "Total Pop.", "Affected Pop.", "Deaths", "Injured", "Missing", "Children", "Women", "Seniors", "PWD"];
      const data_affected = (log.affectedCommunities || []).map(c => [
        c.community || "-",
        c.totalPop || 0,
        c.affected || 0,
        c.deaths || 0,
        c.injured || 0,
        c.missing || 0,
        c.children || 0,
        c.women || 0,
        c.seniors || 0,
        c.pwd || 0
      ]);

      doc.autoTable({
        startY: y,
        head: [headers_affected],
        body: data_affected,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
        headStyles: { fillColor: [20, 174, 187] },
        margin: { left: margin, right: margin },
        didDrawPage: function (data) {
          y = data.cursor.y + 5;
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 0) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      if (doc.autoTable.previous.finalY) {
        y = doc.autoTable.previous.finalY + 5;
      }

      y += 5;
      addDetail("Status of Structures", "", true);
      doc.setFontSize(8);
      const headers_structure = ["Structure", "Status"];
      const data_structure = (log.structureStatus || []).map(s => [
        s.structure || "-",
        s.status || "-"
      ]);
      doc.autoTable({
        startY: y,
        head: [headers_structure],
        body: data_structure,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
        headStyles: { fillColor: [20, 174, 187] },
        margin: { left: margin, right: margin },
        didDrawPage: function (data) {
          y = data.cursor.y + 5;
        }
      });
      if (doc.autoTable.previous.finalY) {
        y = doc.autoTable.previous.finalY + 5;
      }

      y += 5;
      addDetail("Initial Needs Assessment", "", true);
      doc.setFontSize(8);
      const headers_needs = ["Item", "Needed"];
      const data_needs = (log.needsChecklist || []).map(n => [
        n.item || "-",
        n.needed ? "Yes" : "No"
      ]);
      doc.autoTable({
        startY: y,
        head: [headers_needs],
        body: data_needs,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
        headStyles: { fillColor: [20, 174, 187] },
        margin: { left: margin, right: margin },
        didDrawPage: function (data) {
          y = data.cursor.y + 5;
        }
      });
      if (doc.autoTable.previous.finalY) {
        y = doc.autoTable.previous.finalY + 5;
      }

      y += 5;
      addDetail("Other Needs and Response", "", true);
      addDetail("Other Immediate Needs", log.otherNeeds || "N/A");
      addDetail("Estimated Quantity", log.estQty || "N/A");
      addDetail("Response Groups Involved", log.responseGroup || "N/A");
      addDetail("Relief Assistance Deployed", log.reliefDeployed || "N/A");
      addDetail("Number of Families Served", log.familiesServed || "N/A");

      doc.setFontSize(8);
      const footerY = pageHeight - 10;
      const pageNumberText = `Page ${doc.internal.getNumberOfPages()}`;
      const poweredByText = "Powered by: Appvance";

      doc.text(pageNumberText, margin, footerY);
      doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

      doc.save(`RDANA_Log_${log.rdanaId}.pdf`);

      Swal.fire({
        icon: 'success',
        title: 'PDF Generated!',
        text: `RDANA Log "${log.rdanaId}" saved as PDF.`,
        timer: 2000,
        showConfirmButton: false,
        color: '#1b5e20',
        iconColor: '#43a047',
        confirmButtonColor: '#388e3c',
        confirmButtonText: 'Great!',
        customClass: {
          popup: 'swal2-popup-success-export',
          title: 'swal2-title-success-export',
          content: 'swal2-text-success-export',
          confirmButton: 'swal2-button-success-export'
        }
      });
    };

    logo.onerror = function() {
      Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
    };
  }

});