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
    let database, auth;
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        auth = firebase.auth();
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'Failed to initialize Firebase. Please try again later.',
        });
        return;
    }

    // Variables for inactivity detection
    let inactivityTimeout;
    const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

    // Function to reset the inactivity timer
    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
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
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                // User chose to log out
                auth.signOut().then(() => {
                    window.location.href = "../pages/login.html"; // Redirect to login page
                }).catch((error) => {
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

    // Check if required DOM elements exist
    if (!submittedReportsContainer || !paginationContainer || !entriesInfo || !searchInput || !sortSelect) {
        Swal.fire({
            icon: 'error',
            title: 'Page Error',
            text: 'Required elements are missing on the page. Please contact support.',
        });
        return;
    }

    // Check if user is authenticated
    auth.onAuthStateChanged(async user => {
        console.log(`[${new Date().toISOString()}] Auth state changed:`, user ? { uid: user.uid, email: user.email } : 'No user');

        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access RDANA reports.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }

        try {
            // Check password_needs_reset
            const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = userSnapshot.val();
            const passwordNeedsReset = userData ? (userData.password_needs_reset || false) : false;

            if (passwordNeedsReset) {
                console.log(`[${new Date().toISOString()}] Password change required for user ${user.uid}. Redirecting to profile page.`);
                Swal.fire({
                    icon: 'error',
                    title: 'Password Change Required',
                    text: 'Please change your password. Redirecting to profile.',
                    allowOutsideClick: false,
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                }).then(() => {
                    window.location.replace('../pages/profile.html');
                });
                return;
            }

            // Proceed with normal flow
            resetInactivityTimer();
            loadSubmittedReports(user.uid);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error checking user data:`, error);
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'Failed to verify account status. Please try logging in again.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
        }
    });

    // Highlight RDANA report from URL
    function highlightReportFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const reportId = urlParams.get('reportId');

        if (!reportId) {
            return;
        }

        const attemptHighlight = () => {
            const reportRow = document.querySelector(`tr[data-id="${reportId}"]`);
            if (reportRow) {
                reportRow.style.backgroundColor = "#e0f7fa"; // Light cyan highlight
                reportRow.scrollIntoView({ behavior: "smooth", block: "center" });

                // Add "New" badge if not already present
                const badgeCell = reportRow.querySelector("td:first-child") || reportRow;
                if (!badgeCell.querySelector(".new-badge")) {
                    const badge = document.createElement("span");
                    badge.className = "new-badge";
                    badge.textContent = "New";
                    badge.style.cssText = `
                        background-color: #ff4444;
                        color: white;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 12px;
                        margin-left: 5px;
                    `;
                    badgeCell.prepend(badge);
                }

                // Remove highlight after 5 seconds
                setTimeout(() => {
                    reportRow.style.backgroundColor = "";
                }, 5000);
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Report Not Found",
                    text: `The RDANA report with ID ${reportId} was not found on the page.`,
                });
            }
        };

        // Try immediately
        attemptHighlight();

        // Use MutationObserver to detect table updates
        const observer = new MutationObserver(() => {
            const reportRow = document.querySelector(`tr[data-id="${reportId}"]`);
            if (reportRow) {
                attemptHighlight();
                observer.disconnect();
            }
        });

        observer.observe(submittedReportsContainer, {
            childList: true,
            subtree: true
        });

        // Fallback: Retry after 2 seconds
        setTimeout(() => {
            const reportRow = document.querySelector(`tr[data-id="${reportId}"]`);
            if (reportRow) {
                attemptHighlight();
            } else {
            }
            observer.disconnect();
        }, 2000);
    }

    // Load reports from Firebase
    function loadSubmittedReports(userUid) {
        database.ref("rdana/submitted").on("value", snapshot => {
            let rdanaLogs = [];
            const reports = snapshot.val();

            if (reports) {
                Object.keys(reports).forEach(key => {
                    rdanaLogs.push({
                        firebaseKey: key,
                        ...reports[key]
                    });
                });
            }

            // Save original logs globally
            allLogs = rdanaLogs;

            // Render unfiltered reports initially
            applySearchAndSort();
        }, error => {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load submitted RDANA reports: ' + error.message,
            });
        });
    }

    // Search + Sort
    function applySearchAndSort() {
        let filtered = [...allLogs]; // Always start from original

        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(log =>
                log.rdanaId?.toLowerCase().includes(searchTerm) ||
                (log.rdanaGroup || "").toLowerCase().includes(searchTerm) ||
                (log.dateTime ? new Date(log.dateTime).toLocaleString().toLowerCase().includes(searchTerm) : false) ||
                (log.siteLocation || "").toLowerCase().includes(searchTerm) ||
                (log.rejectedAt ? new Date(log.rejectedAt).toLocaleDateString().toLowerCase().includes(searchTerm) : false)
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

        // Check for reportId in URL and navigate to the correct page
        const urlParams = new URLSearchParams(window.location.search);
        const reportId = urlParams.get('reportId');
        if (reportId) {
            const reportIndex = filtered.findIndex(report => report.rdanaId === reportId);
            if (reportIndex !== -1) {
                currentPage = Math.ceil((reportIndex + 1) / rowsPerPage);
            } else {
            }
        }

        // Reset to first page when applying new filters, unless set by reportId
        currentPage = Math.min(currentPage, Math.ceil(filtered.length / rowsPerPage)) || 1;

        renderReportsTable(filtered);
    }

    // Hook up events
    searchInput.addEventListener("input", applySearchAndSort);
    sortSelect.addEventListener("change", applySearchAndSort);

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatLargeNumber(value) {
        if (value === null || value === undefined || value === "") return "0";

        // Convert to number safely
        let num = Number(value.toString().replace(/^0+/, "")); // Remove leading zeros
        if (isNaN(num)) return "0";

        // Handle large numbers
        if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
        if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
        if (num >= 1_000)         return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";

        return num.toString();
        }

    function renderReportsTable(reports) {
        submittedReportsContainer.innerHTML = "";
        const start = (currentPage - 1) * rowsPerPage;
        const paginated = reports.slice(start, start + rowsPerPage);

        // Handle case when there are no reports to display
        if (paginated.length === 0) {
            submittedReportsContainer.innerHTML = "<tr><td colspan='9'>No submitted RDANA report found on this page.</td></tr>";
            entriesInfo.textContent = "Showing 0 to 0 of 0 entries";
            renderPagination(reports.length, reports);
            highlightReportFromURL();
            return;
        }

        // Update entry info normally
        entriesInfo.textContent = `Showing ${start + 1} to ${start + paginated.length} of ${reports.length} entries`;

        paginated.forEach((report, index) => {
            const tr = document.createElement("tr");
            tr.setAttribute('data-id', report.rdanaId); // Set data-id to rdanaId for highlighting
            const displayIndex = start + index + 1;
            tr.innerHTML = `
                <td>${displayIndex}</td>
                <td>${report.rdanaId}</td>
                <td>${report.rdanaGroup}</td>
                <td>${formatDate(report?.dateTime)}</td>
                <td>${report.siteLocation || "N/A"}</td>
                <td>${report.disasterType}</td>
                <td>${formatLargeNumber(report.effects?.affectedPopulation || "N/A")}</td>
                <td>${report.needs?.priority?.join(", ") || "N/A"}</td>
                <td>
                    <button title="View" class="viewBtn"><i class='bx bx-show-alt'></i></button>
                    <button title="Approve" class="approveBtn"><i class="bx bx-check-circle"></i></button>
                    <button title="Reject" class="rejectBtn"><i class="bx bx-x-circle"></i></button>
                </td>
            `;

            tr.querySelector(".viewBtn").addEventListener("click", () => showDetails(report));
            tr.querySelector(".approveBtn").addEventListener("click", () => approveReport(report));
            tr.querySelector(".rejectBtn").addEventListener("click", () => rejectReport(report));

            submittedReportsContainer.appendChild(tr);
        });

        renderPagination(reports.length, reports);
        highlightReportFromURL(); // Call to highlight the report from URL
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
                applySearchAndSort(); // Re-render with updated page
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
        modal.style.display = "flex";

        // Modal close actions
        const closeModal = document.getElementById("closeModal");
        closeModal.onclick = () => { modal.style.display = "none"; };
        window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };
    }

    // Open archived modal
    document.getElementById("viewArchived").addEventListener("click", () => {
        document.getElementById("archivedModal").style.display = "flex";
        loadArchivedReports();
    });

    // Close archived modal
    document.getElementById("closeArchivedModalBtn").addEventListener("click", () => {
        document.getElementById("archivedModal").style.display = "none";
    });

    // Navigate to rdanaLog.html when View Approved RDANA is clicked
    document.getElementById("viewApprovedBtn").addEventListener("click", () => {
        try {
            window.location.href = "../pages/rdanaLog.html";
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Navigation Error",
                text: "Could not navigate to RDANA log page. Please check if the page exists.",
            });
        }
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

        // Step 1: Ask for confirmation
        Swal.fire({
            title: 'Retrieve Report?',
            text: 'This will move the rdana report from rejected rdana reports back to rdana verification page.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Retrieve',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            focusCancel: true,
            allowOutsideClick: false,
            customClass: {
                popup: 'custom-swal-popup-small',
                title: 'custom-swal-title',
                htmlContainer: 'custom-swal-content',
                confirmButton: 'custom-confirm-btn',
                cancelButton: 'custom-cancel-btn'
            }
        }).then((result) => {
            if (!result.isConfirmed) return;

            // Step 2: Move report from rejected → submitted
            database.ref(`rdana/rejected/${key}`).once("value")
                .then(snapshot => {
                    const report = snapshot.val();
                    if (!report) throw new Error("Report not found in rejected.");

                    return database.ref(`rdana/submitted/${key}`).set(report)
                        .then(() => database.ref(`rdana/rejected/${key}`).remove());
                })
                .then(() => {
                    // Step 3: Show success alert
                    Swal.fire({
                        title: 'Retrieved!',
                        text: 'RDANA Report has been retrieved to RDANA Verification.',
                        icon: 'success',
                        timer: 1600,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean'
                        }
                    });

                    // Step 4: Refresh archived list
                    loadArchivedReports();
                })
                .catch(err => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Restore Failed',
                        text: err.message || 'Failed to retrieve the application.',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            content: 'swal2-text-error-clean'
                        }
                    });
                });
        });
    }
});


// NEED HELP HERE RAZEL
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

        // Check role
        database.ref(`users/${user.uid}/role`).once('value')
            .then(snapshot => {
                const role = snapshot.val();

                if (role !== "AB ADMIN") {
                    Swal.fire({
                        icon: 'error',
                        title: 'Unauthorized',
                        text: `Only admins can approve reports. (Your role: ${role || "none"})`,
                    });
                    return Promise.reject("Unauthorized");
                }

                if (!report.firebaseKey || !report.userUid) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Report is missing firebaseKey or userUid. Cannot approve.',
                    });
                    return Promise.reject("Missing firebaseKey or userUid");
                }

                // Debug: Log report object to verify rdanaId
                console.log("Report object:", report);

                // Update report object
                report.status = "Approved";
                report.approvedAt = Date.now();

                // ✅ Explicitly prioritize rdanaId
                const displayId = report.rdanaId || report.ReportID || report.firebaseKey;
                if (!report.rdanaId) {
                    console.warn("rdanaId is missing in report. Using fallback ID:", displayId);
                }

                // Prepare notification with explicit rdanaId
                const notification = {
                    message: `✅ RDANA Report Approved: Your report (ID: ${displayId}) has been approved.`,
                    timestamp: Date.now(),
                    type: "rdana_approved",
                    userUid: report.userUid,
                    read: false,
                    identifier: `rdana_approved_${report.userUid}_${displayId}_${Date.now()}`, // Unique identifier
                    rdanaId: displayId, // Store displayId for navigation
                    ReportID: report.ReportID || report.firebaseKey // Fallback for ReportID
                };

                // Debug: Log notification object
                console.log("Notification object:", notification);

                // Move report + push notification
                return Promise.all([
                    database.ref(`rdana/approved/${report.firebaseKey}`).set(report),
                    database.ref(`users/${report.userUid}/rdana/${report.firebaseKey}`).set(report),
                    database.ref(`rdana/submitted/${report.firebaseKey}`).remove(),
                    database.ref('notifications').push(notification)
                ]);
            })
            .then(() => {
                // Update local data and UI
                allLogs = allLogs.filter(r => r.firebaseKey !== report.firebaseKey);
                applySearchAndSort();

                if (typeof updateNotificationBadge === 'function') {
                    updateNotificationBadge();
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Report Approved',
                    text: 'The RDANA report has been approved.',
                    background: '#f0fdf4',
                    color: '#065f46',
                    iconColor: '#059669',
                    confirmButtonColor: '#059669'
                });
            })
            .catch(error => {
                if (error !== "Unauthorized" && error !== "Missing firebaseKey or userUid") {
                    Swal.fire({
                        icon: 'error',
                        title: 'Approval Failed',
                        text: `Failed to approve RDANA report: ${error.message || error}`
                    });
                }
            });
    });
}



function rejectReport(report) {
    Swal.fire({
        title: 'Are you sure to reject this RDANA Report?',
        text: 'This will move the report to Rejected RDANA Reports.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Reject',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        focusCancel: true,
        allowOutsideClick: false,
        customClass: {
            popup: 'custom-swal-popup-small',
            title: 'custom-swal-title',
            htmlContainer: 'custom-swal-content',
            confirmButton: 'custom-confirm-btn',
            cancelButton: 'custom-cancel-btn'
        }
    }).then((result) => {
        if (!result.isConfirmed) return;

        if (!report.rdanaId || !report.userUid) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Report is missing RDANA ID or User UID. Cannot reject.',
            });
            return;
        }

        let movedKey = null; // FIX: track the actual key we moved so we can remove locally by key

        database.ref('rdana/submitted')
            .orderByChild('rdanaId')
            .equalTo(report.rdanaId)
            .once('value')
            .then(snapshot => {
                const data = snapshot.val();
                if (!data) throw new Error("Report not found in submitted.");

                const actualKey = Object.keys(data)[0];
                movedKey = actualKey; // FIX: remember the key
                const reportData = { ...data[actualKey], status: "Rejected", rejectedAt: Date.now() };

                return database.ref(`rdana/rejected/${actualKey}`).set(reportData)
                    .then(() => actualKey);
            })
            .then(actualKey => database.ref(`rdana/submitted/${actualKey}`).remove())
            .then(() => database.ref(`users/${report.userUid}/rdana/${report.firebaseKey || report.rdanaId}`).set({ ...report, status: "Rejected" }))
            .then(() => {
                // FIX: Remove from the main global array using the key we actually moved
                if (movedKey) {
                    allLogs = allLogs.filter(r => r.firebaseKey !== movedKey);
                } else {
                    // fallback by rdanaId if key wasn't captured
                    allLogs = allLogs.filter(r => r.rdanaId !== report.rdanaId);
                }

                // FIX: Re-apply current filters/sort/pagination and re-render
                applySearchAndSort();

                Swal.fire({
                    title: 'Rejected!',
                    text: 'The RDANA report has been rejected and archived.',
                    icon: 'success',
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean'
                    }
                });
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Rejection Failed',
                    text: error.message || "Failed to reject RDANA report."
                });
            });
    });
}




});
