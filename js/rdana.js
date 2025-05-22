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

  // Form data variables (declared in higher scope to persist across event listeners)
  let profileData = {};
  let affectedCommunities = [];
  let needsChecklist = [];
  let summary = "";
  let structureStatus = [];
  let otherNeeds = "";
  let estQty = "";
  let responseGroup = "";
  let reliefDeployed = "";
  let familiesServed = "";

  const submittedReportsContainer = document.getElementById("submittedReportsContainer");
  const paginationContainer = document.getElementById("pagination");
  const entriesInfo = document.getElementById("entriesInfo");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");

  // Helper function to sanitize keys for Firebase
  function sanitizeKey(key) {
    return key
      .replace(/[.#$/[\]]/g, '_') // Replace invalid characters with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .replace(/[^a-zA-Z0-9_]/g, ''); // Remove any remaining invalid characters
  }

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

    // Only load submitted reports if the table elements exist (for rdanaverification.html)
    if (submittedReportsContainer && paginationContainer && entriesInfo && searchInput && sortSelect) {
      loadSubmittedReports(user.uid);
    }
  });

 function validatePageInputs(pageSelector) {
  const inputs = document.querySelectorAll(`${pageSelector} input[required], ${pageSelector} select[required], ${pageSelector} textarea[required]`);
  let isValid = true;

  inputs.forEach(input => {
    const errorMessage = input.nextElementSibling;
    if (!input.value.trim()) {
      isValid = false;
      input.classList.add("input-error");
      if (errorMessage && errorMessage.classList.contains("error-message")) {
        errorMessage.textContent = "This field is required.";
        errorMessage.style.display = "block";
      }
    } else {
      input.classList.remove("input-error");
      if (errorMessage && errorMessage.classList.contains("error-message")) {
        errorMessage.style.display = "none";
      }
    }
  });

  return isValid;
}


  // Input validation for text fields
  document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', function () {
      // Capitalize first letter
      this.value = this.value.charAt(0).toUpperCase() + this.value.slice(1);

      // Allow only alphabets for names
      if (this.placeholder.includes('Name') || this.placeholder.includes('Organization')) {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, ''); // Only letters and spaces
      }

      // For Barangay (Letters & Numbers)
      if (this.placeholder.includes('Barangay')) {
        this.value = this.value.replace(/[^a-zA-Z0-9\s]/g, ''); // Alphanumeric and spaces only
      }

      // For numbers (prevent negative numbers)
      if (this.type === 'number') {
        if (this.value < 0) {
          this.value = '';
        }
      }
    });
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

  function applySearchAndSort(logs) {
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
      tr.querySelector(".approveBtn").addEventListener("click", () => approveReport(report));
      tr.querySelector(".rejectBtn").addEventListener("click", () => rejectReport(report));

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
        applySearchAndSort();
      });
      return btn;
    };

    paginationContainer.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(pageCount, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }

    paginationContainer.appendChild(createButton('Next', currentPage + 1, currentPage === pageCount));
  }

  function formatKey(key) {
    return key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());
  }

  function showDetails(report) {
    const modal = document.getElementById("reportModal");
    const modalDetails = document.getElementById("modalReportDetails");
    const closeModal = document.getElementById("closeModal");

    let profileHTML = `<h3>Profile of the Disaster</h3><div class='table-scroll'><table class='preview-table'>`;
    for (const [key, value] of Object.entries(report.profile || {})) {
      profileHTML += `<tr><td id='label'>${formatKey(key)}</td><td>${value}</td></tr>`;
    }
    profileHTML += `</table></div>`;

    let modalityHTML = `<h3>Modality of the Disaster</h3><div class='table-scroll'><table class='preview-table'>`;
    for (const [key, value] of Object.entries(report.modality || {})) {
      modalityHTML += `<tr><td id='label'>${formatKey(key)}</td><td>${value}</td></tr>`;
    }
    modalityHTML += `</table></div>`;

    let summaryHTML = `<h3>Summary of Disaster/Incident</h3><p>${report.summary || "N/A"}</p>`;

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

    let structureHTML = `<h3>Status of Structures</h3><div class='table-scroll'><table class='preview-table' id='rdanalog-table'><tr><th>Structure</th><th>Status</th></tr>`;
    (report.structureStatus || []).forEach(s => {
      structureHTML += `<tr><td>${s.structure || "-"}</td><td>${s.status || "-"}</td></tr>`;
    });
    structureHTML += `</table></div>`;

    let checklistHTML = `<h3>Initial Needs Assessment</h3><div class='table-scroll'><table class='preview-table' id='rdanalog-table'><tr><th>Item</th><th>Needed</th></tr>`;
    (report.needsChecklist || []).forEach(n => {
      checklistHTML += `<tr><td>${n.item || "-"}</td><td>${n.needed ? "Yes" : "No"}</td></tr>`;
    });
    checklistHTML += `</table></div>`;

    let otherNeedsHTML = `
      <p><strong>Other Immediate Needs:</strong> ${report.otherNeeds || "N/A"}</p>
      <p><strong>Estimated Quantity:</strong> ${report.estQty || "N/A"}</p>
      <h3>Initial Response Actions</h3>
      <p><strong>Response Groups Involved:</strong> ${report.responseGroup || "N/A"}</p>
      <p><strong>Relief Assistance Deployed:</strong> ${report.reliefDeployed || "N/A"}</p>
      <p><strong>Number of Families Served:</strong> ${report.familiesServed || "N/A"}</p>
    `;

    modalDetails.innerHTML = profileHTML + modalityHTML + summaryHTML + affectedHTML + structureHTML + checklistHTML + otherNeedsHTML;

    modal.style.display = "block";

    closeModal.onclick = () => modal.style.display = "none";
    window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };
  }

  // Add the submit functionality for the RDANA report
  const nextBtn4 = document.getElementById('nextBtn4');
  if (nextBtn4) {
    nextBtn4.addEventListener('click', () => {
      if (!validatePageInputs('#form-page-4')) {
        Swal.fire("Incomplete Data", "Please fill in all required fields on this page.", "warning");
        return;
      }

      const previewDiv = document.getElementById("preview-data");
      previewDiv.innerHTML = ""; // Clear previous content

      // Page 1 data
      const page1Inputs = document.querySelectorAll("#form-page-1 input, #form-page-1 select");
      let page1Table = `<h3>Profile of the Disaster</h3><div class='table-scroll'><table class='preview-table' id='page1preview'>`;
      profileData = {}; // Reset profileData
      page1Inputs.forEach(input => {
        const label = input.previousElementSibling ? input.previousElementSibling.innerText : "Field";
        const sanitizedLabel = sanitizeKey(label); // Sanitize the key for Firebase
        page1Table += `<tr><td id='page1-tdlabel'>${label}</td><td id='page1-tdinput'>${input.value}</td></tr>`;
        profileData[sanitizedLabel] = input.value; // Use sanitized key
      });
      page1Table += `</table></div>`;

      // Page 2 data
      summary = document.querySelector("#form-page-2 textarea")?.value || "";
      let page2Table = `<h3>Summary of Disaster/Incident</h3><p>${summary}</p>`;
      const tableRows = document.querySelectorAll("#disasterprofile-table tbody tr");
      page2Table += `<div class='table-scroll'><table class='preview-table' id='page2preview'><tr><th>Community</th><th>Total Pop.</th><th>Affected Pop.</th><th>Deaths</th><th>Injured</th><th>Missing</th><th>Children</th><th>Women</th><th>Seniors</th><th>PWD</th></tr>`;
      affectedCommunities = []; // Reset affectedCommunities
      tableRows.forEach(row => {
        const cells = row.querySelectorAll("input") || "0";
        page2Table += "<tr>";
        const communityData = {
          community: cells[0].value,
          totalPop: parseInt(cells[1].value) || 0,
          affected: parseInt(cells[2].value) || 0,
          deaths: parseInt(cells[3].value) || 0,
          injured: parseInt(cells[4].value) || 0,
          missing: parseInt(cells[5].value) || 0,
          children: parseInt(cells[6].value) || 0,
          women: parseInt(cells[7].value) || 0,
          seniors: parseInt(cells[8].value) || 0,
          pwd: parseInt(cells[9].value) || 0
        };
        affectedCommunities.push(communityData);
        cells.forEach(cell => {
          page2Table += `<td>${cell.value}</td>`;
        });
        page2Table += "</tr>";
      });
      page2Table += "</table></div>";

      // Page 3 data
      const statusRows = document.querySelectorAll("#status-table tbody tr");
      let page3Table = `<h3>Status of Structures</h3><div class='table-scroll'><table class='preview-table' id='page3preview'><tr><th>Structure</th><th>Status</th></tr>`;
      structureStatus = []; // Reset structureStatus
      statusRows.forEach(row => {
        const structure = row.querySelector("td")?.innerText || "";
        let status = "N/A";
        const select = row.querySelector("select");
        const input = row.querySelector("input");

        if (select) {
          const selectedOption = select.selectedOptions[0];
          status = selectedOption && selectedOption.value ? selectedOption.text : "N/A";
        } else if (input) {
          status = input.value.trim() || "N/A";
        }

        page3Table += `<tr><td>${structure}</td><td>${status}</td></tr>`;
        structureStatus.push({ structure, status });
      });
      page3Table += `</table></div>`;

      // Page 4 checklist
      const checklistItems = document.querySelectorAll("#checklist-table input[type='checkbox']");
      let page4Table = `<h3>Initial Needs Assessment</h3><div class='table-scroll'><table class='preview-table' id='page4preview'><tr><th>Item</th><th>Needed</th></tr>`;
      needsChecklist = []; // Reset needsChecklist
      checklistItems.forEach(item => {
        const label = item.closest("tr").querySelector("td")?.innerText || "";
        page4Table += `<tr><td>${label}</td><td>${item.checked ? "Yes" : "No"}</td></tr>`;
        needsChecklist.push({ item: label, needed: item.checked });
      });
      page4Table += `</table></div>`;

      // Page 4 additional needs
      otherNeeds = document.querySelector("#form-page-4 input[placeholder='Enter items']")?.value || "N/A";
      estQty = document.querySelector("#form-page-4 input[placeholder='Estimated No. of Families to Benefit']")?.value || "N/A";
      responseGroup = document.querySelector("#form-page-4 input[placeholder='Enter Name of Organization/s']")?.value || "N/A";
      reliefDeployed = document.querySelector("#form-page-4 input[placeholder='Enter Relief Assistance']")?.value || "N/A";
      familiesServed = document.querySelector("#form-page-4 input[placeholder='Enter number of families']")?.value || "N/A";

      page4Table += `
        <p><strong>Other Immediate Needs:</strong> ${otherNeeds}</p>
        <p><strong>Estimated Quantity:</strong> ${estQty}</p>
        <h3 style="margin-top: 15px; margin-bottom: 10px;">Initial Response Actions</h3>
        <p><strong>Response Groups Involved:</strong> ${responseGroup}</p>
        <p><strong>Relief Assistance Deployed:</strong> ${reliefDeployed}</p>
        <p><strong>Number of Families Served:</strong> ${familiesServed}</p>
      `;

      // Combine all sections
      previewDiv.innerHTML = page1Table + page2Table + page3Table + page4Table;

      // Navigate to page 5
      document.getElementById("form-page-4").style.display = "none";
      document.getElementById("form-page-5").style.display = "block";

      // Wire up the static submit button
      const submitBtn = document.getElementById("submitReportBtn");
      if (submitBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

        newSubmitBtn.addEventListener("click", (e) => {
          e.preventDefault(); // Prevent form submission
          newSubmitBtn.disabled = true; // Disable button
          newSubmitBtn.textContent = "Submitting..."; // Update text

          console.log("Submit button clicked at:", new Date().toISOString());

          auth.onAuthStateChanged(user => {
            console.log("Auth state checked:", user ? user.uid : "No user");
            if (!user) {
              Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to submit a report.',
              }).then(() => {
                window.location.href = "../pages/login.html";
              });
              newSubmitBtn.disabled = false;
              newSubmitBtn.textContent = "Submit Report";
              return;
            }

            console.log("User authenticated for submission:", user.uid);
            console.log("Form data before validation:", { profileData, affectedCommunities, needsChecklist });

            // Validate form data before submission
            if (!profileData || Object.keys(profileData).length === 0 || 
                !affectedCommunities || affectedCommunities.length === 0 || 
                !needsChecklist || needsChecklist.length === 0) {
              console.error("Form data is incomplete:", { profileData, affectedCommunities, needsChecklist });
              Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: 'Form data is incomplete. Please ensure all fields are filled correctly.',
              });
              newSubmitBtn.disabled = false;
              newSubmitBtn.textContent = "Submit Report";
              return;
            }

            const reportData = {
              rdanaId: `RDANA-${Math.floor(100 + Math.random() * 900)}`,
              dateTime: new Date().toISOString(),
              siteLocation: profileData[sanitizeKey("Site Location/Address (Barangay)")] || "N/A",
              disasterType: profileData[sanitizeKey("Type of Disaster")] || "N/A",
              effects: { affectedPopulation: affectedCommunities.reduce((sum, c) => sum + c.affected, 0) },
              needs: { priority: needsChecklist.filter(n => n.needed).map(n => n.item) },
              profile: profileData,
              modality: {
                "Locations_and_Areas_Affected": profileData[sanitizeKey("Locations and Areas Affected (Barangay)")] || "N/A",
                "Type_of_Disaster": profileData[sanitizeKey("Type of Disaster")] || "N/A",
                "Date_and_Time_of_Occurrence": (profileData[sanitizeKey("Date of Occurrence")] + " " + profileData[sanitizeKey("Time of Occurrence")]) || "N/A"
              },
              summary: summary,
              affectedCommunities: affectedCommunities,
              structureStatus: structureStatus,
              needsChecklist: needsChecklist,
              otherNeeds: otherNeeds,
              estQty: estQty,
              responseGroup: responseGroup,
              reliefDeployed: reliefDeployed,
              familiesServed: familiesServed,
              userUid: user.uid,
              status: "Submitted",
              timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            console.log("Attempting to save RDANA report:", reportData);

            const ref = database.ref("rdana/submitted");
            console.log("Database reference created:", ref.toString());

            ref.push(reportData)
              .then(() => {
                console.log("RDANA report saved successfully to rdana/submitted");
                Swal.fire({
                  icon: 'success',
                  title: 'Report Submitted',
                  text: 'Your RDANA report has been submitted for verification!',
                }).then(() => {
                  // Reset form data after successful submission
                  profileData = {};
                  affectedCommunities = [];
                  needsChecklist = [];
                  summary = "";
                  structureStatus = [];
                  otherNeeds = "";
                  estQty = "";
                  responseGroup = "";
                  reliefDeployed = "";
                  familiesServed = "";

                  // Reset all form fields
                  document.querySelectorAll('input, textarea, select').forEach(input => {
                    if (input.type === 'checkbox') {
                      input.checked = false;
                    } else {
                      input.value = '';
                    }
                  });

                  // Reset dynamic table to one row
                  const tableBody = document.getElementById("tableBody");
                  if (tableBody) {
                    tableBody.innerHTML = `
                      <tr>
                        <td><input type="text" placeholder="Enter Municipalities/Communities" required/></td>
                        <td><input type="number" placeholder="Enter Total Population" min="0" required/></td>
                        <td><input type="number" placeholder="Enter Affected Population" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Deaths" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Injured" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Missing" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Children" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Women" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Senior Citizens" min="0" required/></td>
                        <td><input type="number" placeholder="No. of PWD" min="0" required/></td>
                        <td><button type="reset" class="removeRowBtn">Clear</button></td>
                      </tr>
                    `;
                  }

                  // Navigate back to the first page
                  document.getElementById("form-page-5").style.display = "none";
                  document.getElementById("form-page-1").style.display = "block";

                  // Optionally redirect to verification page
                  window.location.href = "../pages/rdanaverification.html";
                });
              })
              .catch(error => {
                console.error("Error saving RDANA report to Firebase:", error);
                console.error("Error code:", error.code);
                console.error("Error message:", error.message);
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'Failed to submit RDANA report: ' + error.message,
                });
              })
              .finally(() => {
                newSubmitBtn.disabled = false;
                newSubmitBtn.textContent = "Submit Report";
              });
          });
        });
      }
    });
  }

  // Only add event listeners for search and sort if the elements exist
  if (searchInput && sortSelect) {
    searchInput.addEventListener("input", applySearchAndSort);
    sortSelect.addEventListener("change", applySearchAndSort);
  }

  const viewApprovedBtn = document.getElementById("viewApprovedBtn");
  if (viewApprovedBtn) {
    viewApprovedBtn.addEventListener("click", () => {
      window.location.href = "../pages/rdanaLog.html";
    });
  }

  // Add navigation for other pages (next/back buttons)
  const nextBtn1 = document.getElementById('nextBtn1');
  const nextBtn2 = document.getElementById('nextBtn2');
  const nextBtn3 = document.getElementById('nextBtn3');
  const backBtn2 = document.getElementById('backBtn2');
  const backBtn3 = document.getElementById('backBtn3');
  const backBtn4 = document.getElementById('backBtn4');
  const backBtn5 = document.getElementById('backBtn5');

  if (nextBtn1) {
    nextBtn1.addEventListener('click', () => {
      if (validatePageInputs('#form-page-1')) {
        document.getElementById("form-page-1").style.display = "none";
        document.getElementById("form-page-2").style.display = "block";
      } else {
        Swal.fire("Incomplete Data", "Please fill in all required fields on this page.", "warning");
      }
    });
  }

  if (nextBtn2) {
    nextBtn2.addEventListener('click', () => {
      if (validatePageInputs('#form-page-2')) {
        document.getElementById("form-page-2").style.display = "none";
        document.getElementById("form-page-3").style.display = "block";
      } else {
        Swal.fire("Incomplete Data", "Please fill in all required fields on this page.", "warning");
      }
    });
  }

  if (nextBtn3) {
    nextBtn3.addEventListener('click', () => {
      if (validatePageInputs('#form-page-3')) {
        document.getElementById("form-page-3").style.display = "none";
        document.getElementById("form-page-4").style.display = "block";
      } else {
        Swal.fire("Incomplete Data", "Please fill in all required fields on this page.", "warning");
      }
    });
  }

  if (backBtn2) {
    backBtn2.addEventListener('click', () => {
      document.getElementById("form-page-2").style.display = "none";
      document.getElementById("form-page-1").style.display = "block";
    });
  }

  if (backBtn3) {
    backBtn3.addEventListener('click', () => {
      document.getElementById("form-page-3").style.display = "none";
      document.getElementById("form-page-2").style.display = "block";
    });
  }

  if (backBtn4) {
    backBtn4.addEventListener('click', () => {
      document.getElementById("form-page-4").style.display = "none";
      document.getElementById("form-page-3").style.display = "block";
    });
  }

  if (backBtn5) {
    backBtn5.addEventListener('click', () => {
      document.getElementById("form-page-5").style.display = "none";
      document.getElementById("form-page-4").style.display = "block";
    });
  }

  // Add row functionality
  document.getElementById("addRowBtn").addEventListener('click', function() {
    const tableBody = document.getElementById("tableBody");
    const newRow = document.createElement("tr");

    newRow.innerHTML = `
      <td><input type="text" placeholder="Enter Municipalities/Communities" /></td>
      <td><input type="number" placeholder="Enter Total Population" /></td>
      <td><input type="number" placeholder="Enter Affected Population" /></td>
      <td><input type="number" placeholder="No. of Deaths" /></td>
      <td><input type="number" placeholder="No. of Injured" /></td>
      <td><input type="number" placeholder="No. of Missing" /></td>
      <td><input type="number" placeholder="No. of Children" /></td>
      <td><input type="number" placeholder="No. of Women" /></td>
      <td><input type="number" placeholder="No. of Senior Citizens" /></td>
      <td><input type="number" placeholder="No. of PWD" /></td>
      <td><button type="button" class="deleteRowBtn">Delete</button></td>
    `;
    tableBody.appendChild(newRow);

    // Add delete functionality for new rows
    const deleteBtns = document.querySelectorAll(".deleteRowBtn");
    deleteBtns.forEach(button => {
      button.addEventListener('click', function() {
        this.closest('tr').remove();
      });
    });
  });

  // Clear row functionality
  const clearBtns = document.querySelectorAll(".removeRowBtn");
  clearBtns.forEach(button => {
    button.addEventListener('click', function() {
      const row = this.closest('tr');
      row.querySelectorAll('input').forEach(input => input.value = '');
    });
});

});