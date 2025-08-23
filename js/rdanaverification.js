
// Notify sender function for RDANA report approval
const notifySender = async (message, userUid, rdanaId) => {
    try {
        const identifier = `rdana_approved_${rdanaId}_${Date.now()}`;
        const key = firebase.database().ref("notifications").push().key;
        await firebase.database().ref("notifications").child(key).set({
            message,
            userUid,
            rdanaId,
            identifier,
            timestamp: Date.now(),
            read: false,
            type: "rdana_approved"
        });
        console.log(`Sender notified of RDANA report approval - RDANA ID: ${rdanaId}, Key: ${key}`);
    } catch (error) {
        console.error("Error notifying sender:", error);
    }
};

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

        resetInactivityTimer(); // Start timer

        console.log("User authenticated:", user.uid);
        loadSubmittedReports(user.uid);
    });

// Load reports from Firebase
function loadSubmittedReports(userUid) {
    console.log("Loading submitted reports for user:", userUid);
    database.ref("rdana/submitted").on("value", snapshot => {
        let rdanaLogs = [];
        const reports = snapshot.val();
        console.log("Submitted reports snapshot:", reports);

        if (reports) {
            Object.keys(reports).forEach(key => {
                rdanaLogs.push({
                    firebaseKey: key,
                    ...reports[key]
                });
            });
        }

        // save original logs globally
        allLogs = rdanaLogs;

        // render unfiltered reports initially
        renderReportsTable(allLogs);

    }, error => {
        console.error("Error fetching submitted RDANA reports:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load submitted RDANA reports: ' + error.message,
        });
    });
}

// Search + Sort
function applySearchAndSort() {
    let filtered = [...allLogs]; // always start from original

    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(log =>
            log.rdanaId.toLowerCase().includes(searchTerm) ||
            (log.siteLocation || "").toLowerCase().includes(searchTerm) ||
            (log.disasterType || "").toLowerCase().includes(searchTerm) ||
            (log.needs?.priority?.join(", ")?.toLowerCase().includes(searchTerm) || false)
        );
    }

    const sortBy = sortSelect.value;
if (sortBy) {
    const [key, order] = sortBy.split("-");

    filtered.sort((a, b) => {
        let valA, valB;

        switch (key) {
            case "DateTime":
                valA = new Date(a.dateTime).getTime();
                valB = new Date(b.dateTime).getTime();
                break;
            case "RDANAID":
                valA = parseInt(a.rdanaId.split("-")[1], 10);
                valB = parseInt(b.rdanaId.split("-")[1], 10);
                break;
            case "Location":
                valA = (a.siteLocation || "").toLowerCase();
                valB = (b.siteLocation || "").toLowerCase();
                break;
            case "DisasterType":
                valA = (a.disasterType || "").toLowerCase();
                valB = (b.disasterType || "").toLowerCase();
                break;
            case "AffectedPopulation":
                valA = a.effects?.affectedPopulation || 0;
                valB = b.effects?.affectedPopulation || 0;
                break;
            case "Needs":
                valA = (a.needs?.priority?.join(", ") || "").toLowerCase();
                valB = (b.needs?.priority?.join(", ") || "").toLowerCase();
                break;
            default:
                valA = "";
                valB = "";
        }

        if (typeof valA === "string" && typeof valB === "string") {
            return order === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return order === "asc" ? valA - valB : valB - valA;
    });
}


    // Reset to first page when applying new filters
    currentPage = 1;

    renderReportsTable(filtered);
}

// Hook up events
searchInput.addEventListener("input", applySearchAndSort);
sortSelect.addEventListener("change", applySearchAndSort);


    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
        });
    }
    
    function renderReportsTable(reports) {
        submittedReportsContainer.innerHTML = "";
        const start = (currentPage - 1) * rowsPerPage;
        const paginated = reports.slice(start, start + rowsPerPage);

        // Handle case when there are no reports to display
        if (paginated.length === 0) {
            submittedReportsContainer.innerHTML = "<tr><td colspan='9'>No submitted rdana report found on this page.</td></tr>";
            entriesInfo.textContent = "Showing 0 to 0 of 0 entries";
            return;
        }

        // Update entry info normally
        entriesInfo.textContent = `Showing ${start + 1} to ${start + paginated.length} of ${reports.length} entries`;

        paginated.forEach((report, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${start + index + 1}</td>
                <td>${report.rdanaId}</td>
                <td>${report.rdanaGroup}</td>
                <td>${formatDate(report?.dateTime)}</td>
                <td>${report.siteLocation || "N/A"}</td>
                <td>${report.disasterType}</td>
                <td>${report.effects?.affectedPopulation || "N/A"}</td>
                <td>${report.needs?.priority?.join(", ") || "N/A"}</td>
                <td>
                    <button class="viewBtn"><i class='bx bx-show-alt'></i></button>
                    <button class="approveBtn"><i class="bx bx-check-circle"></i></button>
                    <button class="rejectBtn"><i class="bx bx-x-circle"></i></button>
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

        let reportIDHTML = `<h2>${report.rdanaId}</h2>`;

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

        // Other Needs and Response Section
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

    // Open archived modal
document.getElementById("viewArchived").addEventListener("click", () => {
  document.getElementById("archivedModal").style.display = "flex";
  loadArchivedReports(); // fetch & render
});

// Close archived modal
document.getElementById("closeArchivedModalBtn").addEventListener("click", () => {
  document.getElementById("archivedModal").style.display = "none";
});


function loadArchivedReports() {
  const archivedTableBody = document.getElementById("archivedTableBody");
  const entriesInfo = document.getElementById("archivedEntriesInfo");
  const paginationContainer = document.getElementById("archivedPagination");

  archivedTableBody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

  database.ref("rdana/rejected").once("value").then(snapshot => {
    const data = snapshot.val();
    archivedTableBody.innerHTML = "";
    paginationContainer.innerHTML = "";

    if (!data) {
      archivedTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; color:gray; font-style:italic; padding:20px;">
            No rejected reports found.
          </td>
        </tr>`;
      entriesInfo.textContent = "Showing 0 to 0 of 0 entries";
      return;
    }

    const reports = Object.keys(data).map(key => ({
      key,
      ...data[key]
    }));

    // Pagination settings
    let currentPage = 1;
    const rowsPerPage = 5;

    function renderPage(page) {
      archivedTableBody.innerHTML = "";
      const start = (page - 1) * rowsPerPage;
      const paginated = reports.slice(start, start + rowsPerPage);

      paginated.forEach(report => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${report.rdanaId || "N/A"}</td>
          <td>${report.rdanaGroup || "N/A"}</td>
          <td>${formatDate(report?.dateTime)}</td>
          <td>${report.siteLocation || "N/A"}</td>
          <td>${report.rejectedAt ? new Date(report.rejectedAt).toLocaleString() : "N/A"}</td>
          <td><button class="restore-btn" data-key="${report.key}">Restore</button></td>
        `;
        archivedTableBody.appendChild(row);
      });

      // Update entries info
      entriesInfo.textContent = `Showing ${start + 1} to ${start + paginated.length} of ${reports.length} entries`;

      // Render pagination
      paginationContainer.innerHTML = "";
      const totalPages = Math.ceil(reports.length / rowsPerPage);

      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = i === page ? "active-page" : "";
        btn.addEventListener("click", () => {
          currentPage = i;
          renderPage(currentPage);
        });
        paginationContainer.appendChild(btn);
      }
    }

    renderPage(currentPage);
  });
}

document.addEventListener("click", function(e) {
  if (e.target.classList.contains("restore-btn")) {
    const key = e.target.dataset.key;

    database.ref(`rdana/rejected/${key}`).once("value").then(snapshot => {
      const report = snapshot.val();
      if (!report) return;

      // Move back to submitted
      return database.ref(`rdana/submitted/${key}`).set(report).then(() => {
        return database.ref(`rdana/rejected/${key}`).remove();
      });
    }).then(() => {
      Swal.fire({
        icon: "success",
        title: "Report Restored",
        text: "The report has been moved back to submitted.",
        timer: 2000,
        showConfirmButton: false
      });
      loadArchivedReports(); // refresh list
    }).catch(err => {
      console.error("Restore failed:", err);
    });
  }
});


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
                if (snapshot.val() !== "AB ADMIN") {
                    Swal.fire({
                        icon: 'error',
                        title: 'Unauthorized',
                        text: 'Only admins can approve reports.',
                    });
                    return;
                }

                if (!report.userUid) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'User UID not found in report. Cannot approve.',
                    });
                    return;
                }

                report.status = "Approved";

                // Prepare notification for the report sender
                const notificationMessage = `Your RDANA report (ID: ${report.rdanaId || report.firebaseKey}) has been approved.`;

                // Perform Firebase updates and notification in a single transaction
                Promise.all([
                    database.ref(`rdana/approved`).push(report),
                    database.ref(`users/${report.userUid}/rdana/${report.firebaseKey}`).set({ ...report, status: "Approved" }),
                    database.ref(`rdana/submitted/${report.firebaseKey}`).remove(),
                    notifySender(notificationMessage, report.userUid, report.rdanaId || report.firebaseKey)
                ])
                    .then(() => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Report Approved',
                            text: 'The RDANA report has been approved and the sender has been notified.',
                            background: '#f0fdf4',
                            color: '#065f46',
                            iconColor: '#059669',
                            confirmButtonColor: '#059669',
                            customClass: {
                                popup: 'swal2-popup-success-clean',
                                title: 'swal2-title-success-clean',
                                content: 'swal2-text-success-clean'
                            }
                        });
                    })
                    .catch(error => {
                        console.error("Error approving report or sending notification:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Approval Failed',
                            text: `Failed to approve RDANA report or send notification: ${error.message}`,
                            background: '#fef2f2',
                            color: '#7f1d1d',
                            iconColor: '#dc2626',
                            confirmButtonColor: '#b91c1c',
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
    Swal.fire({
        title: 'Are you sure?',
        text: `You are about to reject the report: ${report.rdanaId}. This action will archive the report.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, reject it!',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            report.status = "Rejected";
            report.rejectedAt = Date.now(); // ✅ add rejected date

            database.ref(`rdana/rejected`).push(report)
                .then(() => {
                    return database.ref(`rdana/submitted/${report.firebaseKey}`).remove();
                })
                .then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Report Rejected',
                        text: `The report ${report.rdanaId} has been rejected and archived.`,
                        background: '#f0fdf4',
                        color: '#065f46',
                        iconColor: '#059669',
                        confirmButtonColor: '#059669',
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            content: 'swal2-text-success-clean'
                        }
                    });
                })
                .catch(error => {
                    console.error("Error rejecting report:", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Rejection Failed',
                        text: `Failed to reject RDANA report: ${error.message}`,
                        background: '#fef2f2',
                        color: '#7f1d1d',
                        iconColor: '#dc2626',
                        confirmButtonColor: '#b91c1c',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            content: 'swal2-text-error-clean'
                        }
                    });
                });
        }
    });
}


    // Event listeners for search and sort
    searchInput.addEventListener("input", () => applySearchAndSort());
    sortSelect.addEventListener("change", () => applySearchAndSort());
});




