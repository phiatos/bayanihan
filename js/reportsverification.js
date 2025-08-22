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

    let database, auth;
    try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        auth = firebase.auth();
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'Failed to initialize Firebase. Please try again later.',
        });
        return;
    }

    let submittedReports = [];
    let archivedReports = [];
    const submittedReportsContainer = document.getElementById("submittedReportsContainer");
    const paginationContainer = document.getElementById("pagination");
    const entriesInfo = document.getElementById("entriesInfo");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    let currentPage = 1;
    const rowsPerPage = 5;

    // Archived reports elements
    const archivedModal = document.getElementById("archivedModal");
    const archivedTableBody = document.querySelector("#archivedTable tbody");
    const archivedPagination = document.getElementById("archivedPagination");
    const archivedEntriesInfo = document.getElementById("archivedEntriesInfo");
    const closeArchivedModalBtn = document.getElementById("closeArchivedModalBtn");
    const viewArchivedBtn = document.getElementById("viewArchived");
    let currentArchivedPage = 1;
    const archivedRowsPerPage = 5;

    if (!submittedReportsContainer || !paginationContainer || !entriesInfo || !searchInput || !sortSelect || !archivedTableBody || !archivedPagination || !archivedEntriesInfo || !closeArchivedModalBtn || !viewArchivedBtn) {
        console.error("Required DOM elements not found");
        Swal.fire({
            icon: 'error',
            title: 'Page Error',
            text: 'Required elements are missing on the page. Please contact support.',
        });
        return;
    }

    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access report verification.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }

        loadReportsFromFirebase();
        loadArchivedReportsFromFirebase();
    });

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date)) return dateStr || "-";
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    function formatTime(timeStr) {
        if (!timeStr) return "-";
        let date;
        if (timeStr.includes('T')) {
            date = new Date(timeStr);
        } else {
            date = new Date(`1970-01-01T${timeStr}`);
        }
        if (isNaN(date)) return timeStr;
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    }

    function formatWithCommas(value) {
        return value != null ? Number(value).toLocaleString() : "-";
    }

    function formatCompact(value) {
        return value != null
            ? new Intl.NumberFormat('en', {
                notation: 'compact',
                compactDisplay: 'short',
            }).format(value)
            : "-";
    }

    function formatCurrency(value) {
        return value != null
            ? new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP',
                minimumFractionDigits: 0,
            }).format(value)
            : "-";
    }

    function isValidReport(report) {
        // Check if critical fields are present and not just placeholders
        return report.firebaseKey &&
               (report.ReportID && report.ReportID !== "-") &&
               (report.VolunteerGroupName && report.VolunteerGroupName !== "[Unknown Org]") &&
               (report.AreaOfOperation && report.AreaOfOperation !== "-");
    }

    function transformReportData(report) {
        const transformed = {
            firebaseKey: report.firebaseKey,
            ReportID: report.reportID || report.ReportID || "-",
            VolunteerGroupName: report.organization || report.VolunteerGroupName || "[Unknown Org]",
            AreaOfOperation: report.AreaOfOperation || "-",
            TimeOfIntervention: report.timeOfIntervention || report.TimeOfIntervention || "-",
            DateOfReport: report.dateOfReport || report.DateOfReport || "-",
            Status: report.status || report.Status || "Pending",
            StartDate: report.operationDate || report.StartDate || "-",
            EndDate: report.operationDate || report.EndDate || "-",
            NoOfIndividualsOrFamilies: report.families || report.NoOfIndividualsOrFamilies || "-",
            NoOfFoodPacks: report.foodPacks || report.NoOfFoodPacks || "-",
            NoOfHotMeals: report.hotMeals || report.NoOfHotMeals || "-",
            LitersOfWater: report.water || report.LitersOfWater || "-",
            NoOfVolunteersMobilized: report.volunteers || report.NoOfVolunteersMobilized || "-",
            NoOfOrganizationsActivated: report.NoOfOrganizationsActivated || "-",
            TotalValueOfInKindDonations: report.inKindValue || report.TotalValueOfInKindDonations || "-",
            TotalMonetaryDonations: report.amountRaised || report.TotalMonetaryDonations || "-",
            NotesAdditionalInformation: report.remarks || report.urgentNeeds || report.NotesAdditionalInformation || "-",
            userUid: report.userUid || "-",
            submittedBy: report.submittedBy || "-",
        };
        if (!isValidReport(transformed)) {
            console.warn(`Invalid report data for key ${report.firebaseKey}:`, transformed);
        }
        return transformed;
    }

    function loadReportsFromFirebase() {
        database.ref("reports/pending").on("value", snapshot => {
            submittedReports = [];
            const reports = snapshot.val();
            if (reports) {
                Object.keys(reports).forEach(key => {
                    const report = reports[key];
                    if (!report.VolunteerGroupName && !report.organization) {
                        console.warn(`Report ${key} is missing VolunteerGroupName/organization field. Will fetch dynamically on approval.`);
                    }
                    const transformedReport = transformReportData({
                        firebaseKey: key,
                        ...report
                    });
                    if (isValidReport(transformedReport)) {
                        submittedReports.push(transformedReport);
                    } else {
                        console.warn(`Skipping invalid report ${key} from submittedReports`);
                    }
                });
            } else {
                console.log("No submitted reports found in Firebase");
            }
            console.log("Submitted Reports:", submittedReports);
            applySearchAndSort();
        }, error => {
            console.error("Error fetching reports from Firebase:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load reports: ' + error.message,
            });
        });
    }

    function loadArchivedReportsFromFirebase() {
        database.ref("reports/pending/ArchivedReports").on("value", snapshot => {
            archivedReports = [];
            const reports = snapshot.val();
            if (reports) {
                Object.keys(reports).forEach(key => {
                    if (archivedReports.some(r => r.firebaseKey === key)) {
                        console.warn(`Duplicate report key ${key} detected in archivedReports, skipping`);
                        return;
                    }
                    const report = reports[key];
                    const transformedReport = transformReportData({
                        firebaseKey: key,
                        ...report,
                        Status: "Rejected"
                    });
                    archivedReports.push(transformedReport);
                });
            } else {
                console.log("No archived reports found in Firebase");
            }
            console.log("Archived Reports:", archivedReports);
            renderArchivedReportsTable();
        }, error => {
            console.error("Error fetching archived reports from Firebase:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load archived reports: ' + error.message,
            });
        });
    }

    function renderReportsTable(reports, filteredReports) {
        submittedReportsContainer.innerHTML = '';
        const totalEntries = filteredReports.length;
        const totalPages = Math.ceil(totalEntries / rowsPerPage);

        if (reports.length === 0) {
            submittedReportsContainer.innerHTML = "<tr><td colspan='8'>No reports found on this page.</td></tr>";
            entriesInfo.textContent = "Showing 0 to 0 of 0 entries";
            renderPaginationControlsForReports(totalPages, filteredReports);
            return;
        }

        reports.forEach((report, index) => {
            if (!isValidReport(report)) {
                console.warn(`Skipping rendering invalid report ${report.firebaseKey}`);
                return;
            }
            const tr = document.createElement('tr');
            const displayIndex = (currentPage - 1) * rowsPerPage + index + 1;

            tr.innerHTML = `
                <td>${displayIndex}</td>
                <td>${report["ReportID"] || "-"}</td>
                <td>${report["VolunteerGroupName"] || "[Unknown Org]"}</td>
                <td>${report["AreaOfOperation"] || "-"}</td>
                <td>${formatTime(report["TimeOfIntervention"])}</td>
                <td>${formatDate(report["DateOfReport"])}</td>
                <td>${report["Status"] || "Pending"}</td>
                <td>
                    <button class="viewBtn"><i class="bx bx-show-alt"></i></button>
                    <button class="approveBtn"><i class="bx bx-check-circle"></i></button>
                    <button class="rejectBtn"><i class="bx bx-x-circle"></i></button>
                </td>
            `;

            const viewBtn = tr.querySelector('.viewBtn');
            viewBtn.addEventListener('click', () => {
                const modal = document.getElementById("reportModal");
                const modalDetails = document.getElementById("modalReportDetails");
                const closeModal = document.getElementById("closeModal");

                if (!modal || !modalDetails || !closeModal) {
                    console.error("Modal elements not found");
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Modal elements are missing. Please contact support.',
                    });
                    return;
                }

                modalDetails.innerHTML = `
                    <div class="report-section">
                        <div class="form-1">
                            <h2>Basic Information</h2>
                            <p><strong>Report ID:</strong> ${report.ReportID || "-"}</p>
                            <p><strong>Volunteer Group:</strong> ${report.VolunteerGroupName || "[Unknown Org]"}</p> 
                            <p><strong>Date of Report Submitted:</strong> ${formatDate(report.DateOfReport)}</p>
                            <p class="cell"><strong>Location of Operation:</strong> ${report.AreaOfOperation || "-"}</p>
                        </div>
                        <div class="form-2">
                            <h2>Relief Operations</h2>
                            <p class="cell"><strong>Completion Time of Intervention:</strong> ${formatTime(report.TimeOfIntervention)}</p>
                            <p><strong>Start Date of Operation:</strong> ${formatDate(report.StartDate) || "-"}</p>
                            <p><strong>End Date of Operation:</strong> ${formatDate(report.EndDate) || "-"}</p>
                            <p><strong>No. of Individuals or Families:</strong> ${formatWithCommas(report.NoOfIndividualsOrFamilies)}</p>
                            <p><strong>No. of Food Packs:</strong> ${formatCompact(report.NoOfFoodPacks)}</p>
                            <p><strong>No. of Hot Meals/Ready-to-eat food:</strong> ${formatCompact(report.NoOfHotMeals)}</p>
                            <p><strong>Liters of Water:</strong> ${formatWithCommas(report.LitersOfWater)}</p>
                            <p><strong>No. of Volunteers Mobilized:</strong> ${formatWithCommas(report.NoOfVolunteersMobilized)}</p>
                            <p><strong>No. of Organizations Activated:</strong> ${formatCompact(report.NoOfOrganizationsActivated)}</p>
                            <p><strong>Total Value of In-Kind Donations:</strong> ${formatCurrency(report.TotalValueOfInKindDonations)}</p>
                            <p><strong>Total Monetary Donations:</strong> ${formatCurrency(report.TotalMonetaryDonations)}</p>
                        </div>
                    </div>
                    <div class="form-3">
                        <h2>Additional Updates</h2>
                        <p><strong>Notes/Additional Information:</strong> ${report.NotesAdditionalInformation || "-"}</p>
                    </div>
                `;

                modal.classList.remove("hidden");

                closeModal.addEventListener("click", () => {
                    modal.classList.add("hidden");
                });

                window.addEventListener("click", function (event) {
                    if (event.target === modal) {
                        modal.classList.add("hidden");
                    }
                });
            });

            tr.querySelector('.approveBtn').addEventListener('click', () => {
                const userUid = report.userUid;
                if (!userUid) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'User UID not found in report. Cannot approve.',
                    });
                    return;
                }

                database.ref(`users/${userUid}`).once('value')
                    .then(snapshot => {
                        const userData = snapshot.val();
                        let volunteerGroupName = "[Unknown Org]";
                        if (userData && userData.organization) {
                            volunteerGroupName = userData.organization;
                            console.log(`Fetched VolunteerGroupName for user ${userUid}: ${volunteerGroupName}`);
                        } else {
                            console.warn(`No group found for user ${userUid}. Using default: [Unknown Org]`);
                        }

                        report["VolunteerGroupName"] = volunteerGroupName;
                        report["Status"] = "Approved";

                        // Prepare notification for the report sender
                        const notification = {
                            message: `Your report (ID: ${report.ReportID || report.firebaseKey}) has been approved.`,
                            timestamp: new Date().toISOString(),
                            type: "report_approved",
                            userUid: userUid,
                            read: false
                        };

                        // Perform all database operations (approve report and send notification)
                        return Promise.all([
                            database.ref(`reports/approved/${report.firebaseKey}`).set(report),
                            database.ref(`users/${userUid}/reports/${report.firebaseKey}`).set({ ...report, Status: "Approved" }),
                            database.ref(`reports/submitted/${report.firebaseKey}`).remove(),
                            database.ref(`notifications`).push(notification)
                        ]);
                    })
                    .then(() => {
                        submittedReports = submittedReports.filter(r => r.firebaseKey !== report.firebaseKey);
                        applySearchAndSort();
                        Swal.fire({
                            icon: 'success',
                            title: 'Report Approved',
                            text: 'The report has been approved and the sender has been notified.',
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
                        console.error("Error during report approval or notification:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Approval Failed',
                            text: `Failed to approve report or send notification: ${error.message}`,
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

            tr.querySelector('.rejectBtn').addEventListener('click', () => {
                const userUid = report.userUid;
                if (!userUid) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'User UID not found in report. Cannot reject.',
                    });
                    return;
                }

                Swal.fire({
                    icon: 'warning',
                    title: 'Confirm Rejection',
                    text: 'Are you sure you want to reject this report? It will be moved to archived reports.',
                    showCancelButton: true,
                    confirmButtonColor: '#b91c1c',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, reject it',
                    cancelButtonText: 'Cancel',
                    background: '#fef2f2',
                    color: '#7f1d1d',
                    iconColor: '#dc2626',
                    customClass: {
                        popup: 'swal2-popup-rejected-clean',
                        title: 'swal2-title-rejected-clean',
                        content: 'swal2-text-rejected-clean'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        report["Status"] = "Rejected";

                        Promise.all([
                            database.ref(`reports/pending/ArchivedReports/${report.firebaseKey}`).set(report),
                            database.ref(`users/${userUid}/reports/${report.firebaseKey}`).set({ ...report, Status: "Rejected" }),
                            database.ref(`reports/submitted/${report.firebaseKey}`).remove()
                        ])
                            .then(() => {
                                console.log(`Report ${report.firebaseKey} rejected and moved to archived`);
                                // Update local arrays
                                submittedReports = submittedReports.filter(r => r.firebaseKey !== report.firebaseKey);
                                if (!archivedReports.some(r => r.firebaseKey === report.firebaseKey)) {
                                    archivedReports.push(report);
                                } else {
                                    console.warn(`Report ${report.firebaseKey} already exists in archivedReports, skipping push`);
                                }
                                // Refresh tables with delay to ensure Firebase sync
                                setTimeout(() => {
                                    applySearchAndSort();
                                    renderArchivedReportsTable();
                                    console.log("After rejection - Submitted Reports:", submittedReports);
                                    console.log("After rejection - Archived Reports:", archivedReports);
                                }, 100);
                                Swal.fire({
                                    icon: 'info',
                                    title: 'Report Rejected',
                                    text: 'The report has been rejected and moved to archived reports.',
                                    background: '#fef2f2',
                                    color: '#7f1d1d',
                                    iconColor: '#dc2626',
                                    confirmButtonColor: '#b91c1c',
                                    customClass: {
                                        popup: 'swal2-popup-rejected-clean',
                                        title: 'swal2-title-rejected-clean',
                                        content: 'swal2-text-rejected-clean'
                                    }
                                });
                            })
                            .catch(error => {
                                console.error("Error during report rejection:", error);
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'Failed to reject report: ' + error.message,
                                });
                            });
                    }
                });
            });

            submittedReportsContainer.appendChild(tr);
        });

        const firstEntry = (currentPage - 1) * rowsPerPage + 1;
        const lastEntry = Math.min(currentPage * rowsPerPage, totalEntries);
        entriesInfo.textContent = `Showing ${firstEntry} to ${lastEntry} of ${totalEntries} entries`;
        renderPaginationControlsForReports(totalPages, filteredReports);
    }

    function renderArchivedReportsTable() {
        archivedTableBody.innerHTML = '';
        const totalEntries = archivedReports.length;
        const totalPages = Math.ceil(totalEntries / archivedRowsPerPage);

        if (archivedReports.length === 0) {
            archivedTableBody.innerHTML = "<tr><td colspan='9'>No archived reports found.</td></tr>";
            archivedEntriesInfo.textContent = "Showing 0 to 0 of 0 entries";
            renderPaginationControlsForArchived(totalPages);
            return;
        }

        const startIndex = (currentArchivedPage - 1) * archivedRowsPerPage;
        const endIndex = startIndex + archivedRowsPerPage;
        const currentPageReports = archivedReports.slice(startIndex, endIndex);

        currentPageReports.forEach((report, index) => {
            const tr = document.createElement('tr');
            const displayIndex = (currentArchivedPage - 1) * archivedRowsPerPage + index + 1;

            tr.innerHTML = `
                <td>${displayIndex}</td>
                <td>${report["ReportID"] || "-"}</td>
                <td>${report["VolunteerGroupName"] || "[Unknown Org]"}</td>
                <td>${report["AreaOfOperation"] || "-"}</td>
                <td>${formatDate(report["StartDate"])}</td>
                <td>${formatDate(report["EndDate"])}</td>
                <td>${formatCurrency(report["TotalValueOfInKindDonations"])}</td>
                <td>${formatCurrency(report["TotalMonetaryDonations"])}</td>
                <td>
                    <button class="restoreBtn"><i class="bx bx-undo"></i></button>
                </td>
            `;

            tr.querySelector('.restoreBtn').addEventListener('click', () => {
                const userUid = report.userUid;
                if (!userUid) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'User UID not found in report. Cannot restore.',
                    });
                    return;
                }

                Swal.fire({
                    icon: 'warning',
                    title: 'Confirm Restoration',
                    text: 'Are you sure you want to restore this report? It will be moved back to submitted reports.',
                    showCancelButton: true,
                    confirmButtonColor: '#059669',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, restore it',
                    cancelButtonText: 'Cancel',
                    background: '#f0fdf4',
                    color: '#065f46',
                    iconColor: '#059669',
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        content: 'swal2-text-success-clean'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        report["Status"] = "Pending";

                        Promise.all([
                            database.ref(`reports/submitted/${report.firebaseKey}`).set(report),
                            database.ref(`users/${userUid}/reports/${report.firebaseKey}`).set({ ...report, Status: "Pending" }),
                            database.ref(`reports/pending/ArchivedReports/${report.firebaseKey}`).remove()
                        ])
                            .then(() => {
                                console.log(`Report ${report.firebaseKey} restored to submitted reports`);
                                // Update local arrays
                                archivedReports = archivedReports.filter(r => r.firebaseKey !== report.firebaseKey);
                                if (!submittedReports.some(r => r.firebaseKey === report.firebaseKey)) {
                                    submittedReports.push(report);
                                } else {
                                    console.warn(`Report ${report.firebaseKey} already exists in submittedReports, skipping push`);
                                }
                                // Refresh tables with delay to ensure Firebase sync
                                setTimeout(() => {
                                    currentPage = 1; // Reset to first page to show restored report
                                    applySearchAndSort();
                                    renderArchivedReportsTable();
                                    console.log("After restoration - Submitted Reports:", submittedReports);
                                    console.log("After restoration - Archived Reports:", archivedReports);
                                }, 100);
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Report Restored',
                                    text: 'The report has been restored to submitted reports.',
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
                                archivedModal.style.display = 'none';
                            })
                            .catch(error => {
                                console.error("Error during report restoration:", error);
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'Failed to restore report: ' + error.message,
                                });
                            });
                    }
                });
            });

            archivedTableBody.appendChild(tr);
        });

        const firstEntry = (currentArchivedPage - 1) * archivedRowsPerPage + 1;
        const lastEntry = Math.min(currentArchivedPage * archivedRowsPerPage, totalEntries);
        archivedEntriesInfo.textContent = `Showing ${firstEntry} to ${lastEntry} of ${totalEntries} entries`;
        renderPaginationControlsForArchived(totalPages);
    }

    function renderPaginationControlsForReports(totalPages, filteredReports) {
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
                if (!disabled) {
                    currentPage = page;
                    const startIndex = (currentPage - 1) * rowsPerPage;
                    const endIndex = startIndex + rowsPerPage;
                    const currentPageReports = filteredReports.slice(startIndex, endIndex);
                    renderReportsTable(currentPageReports, filteredReports);
                }
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

    function renderPaginationControlsForArchived(totalPages) {
        archivedPagination.innerHTML = '';

        if (totalPages === 0) {
            archivedPagination.innerHTML = '<span>No entries to display</span>';
            return;
        }

        const createButton = (label, page, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (isActive) btn.classList.add('active-page');
            btn.addEventListener('click', () => {
                if (!disabled) {
                    currentArchivedPage = page;
                    renderArchivedReportsTable();
                }
            });
            return btn;
        };

        archivedPagination.appendChild(createButton('Prev', currentArchivedPage - 1, currentArchivedPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentArchivedPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            archivedPagination.appendChild(createButton(i, i, false, i === currentArchivedPage));
        }

        archivedPagination.appendChild(createButton('Next', currentArchivedPage + 1, currentArchivedPage === totalPages));
    }

    function applySearchAndSort() {
        const searchQuery = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;
        const [sortBy, direction] = sortValue.split("-");

        let filteredReports = submittedReports.filter(report => {
            return isValidReport(report) && Object.entries(report).some(([key, value]) => {
                if (key === "DateOfReport") {
                    const formattedDate = formatDate(value).toLowerCase();
                    return formattedDate.includes(searchQuery);
                }
                if (key === "TimeOfIntervention") {
                    const formattedTime = formatTime(value).toLowerCase();
                    return formattedTime.includes(searchQuery);
                }
                return value?.toString().toLowerCase().includes(searchQuery);
            });
        });

        if (sortBy) {
            filteredReports.sort((a, b) => {
                const valA = a[sortBy] || "";
                const valB = b[sortBy] || "";

                if (sortBy === "DateOfReport") {
                    const dateA = new Date(valA);
                    const dateB = new Date(valB);
                    if (isNaN(dateA) || isNaN(dateB)) return 0;
                    return direction === "asc" ? dateA - dateB : dateB - dateA;
                } else if (sortBy === "TimeOfIntervention") {
                    const timeA = new Date(valA.includes('T') ? valA : `1970-01-01T${valA}`).getTime();
                    const timeB = new Date(valB.includes('T') ? valB : `1970-01-01T${valB}`).getTime();
                    if (isNaN(timeA) || isNaN(timeB)) return 0;
                    return direction === "asc" ? timeA - timeB : timeB - timeA;
                }
                return direction === "asc"
                    ? valA.toString().localeCompare(valB.toString())
                    : valB.toString().localeCompare(valA.toString());
            });
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageReports = filteredReports.slice(startIndex, endIndex);

        renderReportsTable(currentPageReports, filteredReports);
    }

    searchInput.addEventListener('input', () => {
        currentPage = 1;
        applySearchAndSort();
    });

    sortSelect.addEventListener('change', () => {
        currentPage = 1;
        applySearchAndSort();
    });

    viewArchivedBtn.addEventListener('click', () => {
        archivedModal.style.display = 'block';
        renderArchivedReportsTable();
    });

    closeArchivedModalBtn.addEventListener('click', () => {
        archivedModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === archivedModal) {
            archivedModal.style.display = 'none';
        }
    });

    window.clearDInputs = () => {
        searchInput.value = '';
        currentPage = 1;
        applySearchAndSort();
    };

    const viewApprovedBtn = document.getElementById("viewApprovedBtn");
    if (viewApprovedBtn) {
        viewApprovedBtn.addEventListener("click", () => {
            window.location.href = "../pages/reportsLog.html";
        });
    }
});
