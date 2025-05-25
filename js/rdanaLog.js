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

  const exportExcelBtn = document.getElementById('exportExcelBtn'); 

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
          <button class="deleteBtn">Remove</button>
          <button class="savePDFBtn">Save PDF</button>
        </td>
      `;
      // Attach event listeners programmatically
      const viewBtn = row.querySelector(".viewBtn");
      const deleteBtn = row.querySelector(".deleteBtn");
      const savePDFBtn = row.querySelector(".savePDFBtn");
      viewBtn.addEventListener("click", () => viewLog(start + index));
      deleteBtn.addEventListener("click", () => deleteLog(log.firebaseKey, start + index));
      savePDFBtn.addEventListener("click", () => savePdf(log));
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

  function formatLargeNumber(numStr) {
      let num = BigInt(numStr || "0");
      const trillion = 1_000_000_000_000n;
      const billion = 1_000_000_000n;
      const million = 1_000_000n;
      const thousand = 1_000n;

      if (num >= trillion) {
        return (Number(num) / Number(trillion)).toFixed(2).replace(/\.?0+$/, '') + 'T';
      } else if (num >= billion) {
        return (Number(num) / Number(billion)).toFixed(2).replace(/\.?0+$/, '') + 'B';
      } else if (num >= million) {
        return (Number(num) / Number(million)).toFixed(2).replace(/\.?0+$/, '') + 'M';
      } else if (num >= thousand) {
        return (Number(num) / Number(thousand)).toFixed(2).replace(/\.?0+$/, '') + 'k';
      }
      return num.toString();
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
      <td>${formatLargeNumber(c.totalPop)}</td>
      <td>${formatLargeNumber(c.affected)}</td>
      <td>${formatLargeNumber(c.deaths)}</td>
      <td>${formatLargeNumber(c.injured)}</td>
      <td>${formatLargeNumber(c.missing)}</td>
      <td>${formatLargeNumber(c.children)}</td>
      <td>${formatLargeNumber(c.women)}</td>
      <td>${formatLargeNumber(c.seniors)}</td>
      <td>${formatLargeNumber(c.pwd)}</td>
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
        "Firebase Key": log.firebaseKey || "N/A", // Added firebaseKey for reference
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
        "Disaster Type (Top Level)": log.disasterType || "N/A", // Keep this if sometimes it's also a top-level field

        // Modality Information (These are directly under 'modality' with different keys than expected before)
        "Modality - Date and Time of Occurrence": log.modality?.Date_and_Time_of_Occurrence || "N/A",
        "Modality - Locations and Areas Affected": log.modality?.Locations_and_Areas_Affected || "N/A",
        "Modality - Type of Disaster (Modality)": log.modality?.Type_of_Disaster || "N/A",
        // The previous modality fields (areaSafeAccess, mainAccessRoute, etc.) were not present in your structure.

        // Summary
        "Summary of Disaster/Incident": log.summary || "N/A",

        // Effects (Based on your snippet, 'effects' is an empty object or just "0" for the first entry)
        // If 'effects' has more specific sub-fields (like 'affectedPopulation' from your old viewLog code)
        // they need to be listed here. For now, just 'affectedPopulation' is kept if it eventually exists.
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

        // Structure Status (this is an array of objects)
        // Combining structure and status into a single cell for simplicity
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

  // --- PDF Export Functionality ---
function savePdf(log) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const addSectionTitle = (title, y, doc) => {
        doc.setFontSize(14);
        doc.text(title, 14, y);
        return y + 10;
    };

    let yOffset = 20;

    doc.setFontSize(18);
    doc.text(`RDANA Report: ${log.rdanaId || 'N/A'}`, 14, yOffset);
    yOffset += 10;
    doc.setFontSize(10);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, yOffset);
    yOffset += 10;
    doc.text(`Date & Time of Assessment: ${log.dateTime ? new Date(log.dateTime).toLocaleString() : 'N/A'}`, 14, yOffset);
    yOffset += 10;
    doc.text(`Status: ${log.status || 'N/A'}`, 14, yOffset);
    yOffset += 15; // Space after header info

    // Profile Section
    yOffset = addSectionTitle('1. Profile of the Disaster', yOffset, doc);
    const profileData = Object.entries(log.profile || {}).map(([key, value]) => [formatKey(key), value || 'N/A']);
    profileData.unshift(['Type of Disaster', log.disasterType || 'N/A']); // Add top-level disaster type
    doc.autoTable({
        startY: yOffset,
        head: [['Field', 'Value']],
        body: profileData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
        didDrawPage: function (data) {
            // Footer
            doc.setFontSize(8);
            doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });
    yOffset = doc.autoTable.previous.finalY + 10; // Update yOffset

    // Modality Section
    yOffset = addSectionTitle('2. Modality of the Disaster', yOffset, doc);
    const modalityData = Object.entries(log.modality || {}).map(([key, value]) => [formatKey(key), value || 'N/A']);
    if (modalityData.length > 0) {
        doc.autoTable({
            startY: yOffset,
            head: [['Field', 'Value']],
            body: modalityData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
            didDrawPage: function (data) {
                doc.setFontSize(8);
                doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        yOffset = doc.autoTable.previous.finalY + 10;
    } else {
        doc.text('No modality data available.', 14, yOffset);
        yOffset += 10;
    }

    // Summary
    yOffset = addSectionTitle('3. Summary of Disaster/Incident', yOffset, doc);
    doc.setFontSize(10);
    doc.text(log.summary || 'N/A', 14, yOffset, { maxWidth: doc.internal.pageSize.width - 28 });
    yOffset += (doc.getTextDimensions(log.summary || 'N/A', { maxWidth: doc.internal.pageSize.width - 28 }).h) + 10;
    
    // Affected Communities
    yOffset = addSectionTitle('4. Affected Communities', yOffset, doc);
    const affectedHeaders = ['Community', 'Total Pop.', 'Affected Pop.', 'Deaths', 'Injured', 'Missing', 'Children', 'Women', 'Seniors', 'PWD'];
    const affectedBody = (Array.isArray(log.affectedCommunities) ? log.affectedCommunities : []).map(c => [
        c.community || '-',
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
    if (affectedBody.length > 0) {
        doc.autoTable({
            startY: yOffset,
            head: [affectedHeaders],
            body: affectedBody,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
            didDrawPage: function (data) {
                doc.setFontSize(8);
                doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        yOffset = doc.autoTable.previous.finalY + 10;
    } else {
        doc.text('No affected communities data available.', 14, yOffset);
        yOffset += 10;
    }

    // Structure Status
    yOffset = addSectionTitle('5. Status of Structures', yOffset, doc);
    const structureHeaders = ['Structure', 'Status'];
    const structureBody = (Array.isArray(log.structureStatus) ? log.structureStatus : []).map(s => [
        s.structure || '-',
        s.status || '-'
    ]);
    if (structureBody.length > 0) {
        doc.autoTable({
            startY: yOffset,
            head: [structureHeaders],
            body: structureBody,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
            didDrawPage: function (data) {
                doc.setFontSize(8);
                doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        yOffset = doc.autoTable.previous.finalY + 10;
    } else {
        doc.text('No structure status data available.', 14, yOffset);
        yOffset += 10;
    }

    // Needs Checklist
    yOffset = addSectionTitle('6. Initial Needs Assessment', yOffset, doc);
    const needsChecklistHeaders = ['Item', 'Needed'];
    const needsChecklistBody = (Array.isArray(log.needsChecklist) ? log.needsChecklist : []).map(n => [
        n.item || '-',
        n.needed ? "Yes" : "No"
    ]);
    if (needsChecklistBody.length > 0) {
        doc.autoTable({
            startY: yOffset,
            head: [needsChecklistHeaders],
            body: needsChecklistBody,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
            didDrawPage: function (data) {
                doc.setFontSize(8);
                doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        yOffset = doc.autoTable.previous.finalY + 10;
    } else {
        doc.text('No needs checklist data available.', 14, yOffset);
        yOffset += 10;
    }

    // Needs Priority
    yOffset = addSectionTitle('7. Priority Needs', yOffset, doc);
    doc.setFontSize(10);
    doc.text(log.needs?.priority?.join(", ") || 'N/A', 14, yOffset, { maxWidth: doc.internal.pageSize.width - 28 });
    yOffset += (doc.getTextDimensions(log.needs?.priority?.join(", ") || 'N/A', { maxWidth: doc.internal.pageSize.width - 28 }).h) + 10;


    // Other Needs and Response
    yOffset = addSectionTitle('8. Other Needs and Response', yOffset, doc);
    doc.setFontSize(10);
    doc.text(`Other Immediate Needs: ${log.otherNeeds || 'N/A'}`, 14, yOffset);
    yOffset += 7;
    doc.text(`Estimated Quantity: ${log.estQty || 'N/A'}`, 14, yOffset);
    yOffset += 7;
    doc.text(`Response Groups Involved: ${log.responseGroup || 'N/A'}`, 14, yOffset);
    yOffset += 7;
    doc.text(`Relief Assistance Deployed: ${log.reliefDeployed || 'N/A'}`, 14, yOffset);
    yOffset += 7;
    doc.text(`Number of Families Served: ${log.familiesServed || 'N/A'}`, 14, yOffset);
    yOffset += 10;

    const filename = `RDANA_Report_${log.rdanaId || 'N/A'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);

    Swal.fire({
        icon: 'success',
        title: 'PDF Saved!',
        text: `RDANA Report "${filename}" has been generated.`,
    });
}
  
});