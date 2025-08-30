console.log = function () {};
console.error = function () {};
console.warn = function () {};

document.addEventListener('DOMContentLoaded', () => {
    // Firebase Configuration
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
        // Initialize Firebase with compat layer
        const firebaseApp = firebase.initializeApp(firebaseConfig);
        database = firebaseApp.database();
        auth = firebaseApp.auth();
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'Failed to initialize Firebase. Please try again later.',
        });
        return;
    }

    const archivedModal = document.getElementById("archivedModal");
    const archivedTableBody = document.querySelector("#archivedTable tbody");
    const archivedPaginationContainer = document.getElementById("archivedPagination");
    const archivedEntriesInfo = document.getElementById("archivedEntriesInfo");
    const viewArchivedBtn = document.getElementById("viewArchived");
    const closeArchivedModalBtn = document.getElementById("closeArchivedModalBtn");
    let archivedReports = [];
    let archivedCurrentPage = 1;
    const archivedRowsPerPage = 5;

    let reviewedReports = [];
    const reportsBody = document.getElementById("reportsBody");
    const paginationContainer = document.getElementById("pagination");
    const entriesInfo = document.getElementById("entriesInfo");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const savePdfBtn = document.getElementById('savePdfBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    let currentPage = 1;
    const rowsPerPage = 5;

    const viewApprovedBtn = document.getElementById("viewApprovedBtn");
    if (viewApprovedBtn) {
        viewApprovedBtn.addEventListener("click", () => {
            window.location.href = "../pages/reportsVerification.html";
        });
    }

    if (!reportsBody || !paginationContainer || !entriesInfo || !searchInput || !sortSelect || !savePdfBtn || !exportExcelBtn) {
        console.error("Required DOM elements not found");
        Swal.fire({
            icon: 'error',
            title: 'Page Error',
            text: 'Required elements are missing on the page. Please contact support.',
        });
        return;
    }

    if (!archivedModal || !archivedTableBody || !archivedPaginationContainer || !archivedEntriesInfo || !viewArchivedBtn || !closeArchivedModalBtn) {
        console.error("Archived modal elements not found");
        Swal.fire({
            icon: 'error',
            title: 'Page Error',
            text: 'Required archived modal elements are missing. Please contact support.',
        });
        return;
    }

    // User Role Check
    let userRole = 'User'; // Default role
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to view the reports log.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }

        try {
            const idTokenResult = await user.getIdTokenResult();
            userRole = idTokenResult.claims.role || 'User';
            console.log("Authenticated user role:", userRole);
        } catch (error) {
            console.error("Error fetching user role:", error);
            Swal.fire({
                icon: 'warning',
                title: 'Role Error',
                text: 'Could not determine user role. Functionality might be limited.',
            });
        }

        loadReportsFromFirebase(userRole);
    });

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return isNaN(date) ? dateStr || "-" : date.toLocaleDateString("en-US", {
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
        return isNaN(date) ? timeStr : date.toLocaleTimeString("en-US", {
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

    function transformReportData(report, key, activationData = {}) {
        // Fallback to report data if activationData is missing or incomplete
        const calamityName = activationData.calamityName || activationData.typhoonName || report.CalamityName || report.CalamityAreaDetails || "-";
        const calamityType = activationData.calamityType || activationData.CalamityType || report.CalamityType || 
                            (report.CalamityAreaDetails ? report.CalamityAreaDetails.split(' ')[0] : "-");

        return {
            firebaseKey: key,
            ReportID: report.reportID || report.ReportID || "-",
            VolunteerGroupName: report.organization || report.VolunteerGroupName || "[Unknown Org]",
            AreaOfOperation: report.AreaOfOperation || "-",
            TimeOfIntervention: report.timeOfIntervention || report.TimeOfIntervention || "-",
            DateOfReport: report.dateOfReport || report.DateOfReport || "-",
            Status: report.status || report.Status || "Approved",
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
            CalamityType: calamityType,
            CalamityName: calamityName,
            activationId: report.activationId || "-"
        };
    }

    function loadArchivedReports(userRole) {
        database.ref("reports/archived/reportslog").on("value", async (snapshot) => {
            archivedReports = [];
            const reports = snapshot.val();
            if (reports) {
                for (const [key, report] of Object.entries(reports)) {
                    let activationData = {};
                    if (report.activationId) {
                        try {
                            const activationSnapshot = await database.ref(`activations/${report.activationId}`).once("value");
                            activationData = activationSnapshot.val() || {};
                        } catch (error) {
                            console.warn(`Error fetching activation data for archived report ${key}:`, error);
                        }
                    }
                    if (!report.VolunteerGroupName && !report.organization) {
                        report.VolunteerGroupName = "[Unknown Org]";
                    }
                    const transformedReport = transformReportData(report, key, activationData);
                    archivedReports.push(transformedReport);
                }
            } else {
                console.log("No archived reports found in Firebase");
            }
            renderArchivedTable(userRole);
        }, (error) => {
            console.error("Error fetching archived reports:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load archived reports: ' + error.message,
            });
        });
    }

    function loadReportsFromFirebase(userRole) {
        database.ref("reports/approved").on("value", async (snapshot) => {
            reviewedReports = [];
            const reports = snapshot.val();
            if (reports) {
                for (const [key, report] of Object.entries(reports)) {
                    let activationData = {};
                    if (report.activationId) {
                        try {
                            console.log(`Fetching activation data for report ${key} with activationId: ${report.activationId}`);
                            const activationSnapshot = await database.ref(`activations/${report.activationId}`).once("value");
                            activationData = activationSnapshot.val() || {};
                            console.log(`Activation data for ${report.activationId}:`, activationData);
                        } catch (error) {
                            console.warn(`Error fetching activation data for report ${key} (activationId: ${report.activationId}):`, error);
                        }
                    } else {
                        
                    }
                    if (!report.VolunteerGroupName && !report.organization) {
                       
                        report.VolunteerGroupName = "[Unknown Org]";
                    }
                    const transformedReport = transformReportData(report, key, activationData);
                    reviewedReports.push(transformedReport);
                }
            } else {
                console.log("No approved reports found in Firebase");
            }
            applySearchAndSort(userRole);
        }, (error) => {
            console.error("Error fetching reports from Firebase:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load reports: ' + error.message,
            });
        });
    }

    // Load archived reports when user is authenticated
    loadArchivedReports(userRole);

    // Show archived modal
    viewArchivedBtn.addEventListener('click', () => {
        archivedModal.style.display = 'flex';
        renderArchivedTable(userRole);
    });

    // Close archived modal
    closeArchivedModalBtn.addEventListener('click', () => {
        archivedModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === archivedModal) {
            archivedModal.style.display = 'none';
        }
    });

    function getDisplayedReportsData() {
        const searchQuery = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;
        const [sortBy, direction] = sortValue.split("-");

        let filteredReports = reviewedReports.filter((report) => {
            return Object.entries(report).some(([key, value]) => {
                if (key.includes("Date") && value) {
                    const formattedDate = formatDate(value).toLowerCase();
                    return formattedDate.includes(searchQuery);
                }
                return value?.toString().toLowerCase().includes(searchQuery);
            });
        });

        if (sortBy) {
            filteredReports.sort((a, b) => {
                const valA = a[sortBy] || "";
                const valB = b[sortBy] || "";

                if (sortBy.includes("Date")) {
                    const dateA = new Date(valA);
                    const dateB = new Date(valB);
                    if (isNaN(dateA) || isNaN(dateB)) return 0;
                    return direction === "asc" ? dateA - dateB : dateB - dateA;
                }

                if (sortBy === "NoOfHotMeals" || sortBy === "LitersOfWater" ||
                    sortBy === "TotalValueOfInKindDonations" || sortBy === "TotalMonetaryDonations") {
                    const numA = parseFloat(valA);
                    const numB = parseFloat(valB);
                    const finalNumA = isNaN(numA) ? 0 : numA;
                    const finalNumB = isNaN(numB) ? 0 : numB;
                    return direction === "asc" ? finalNumA - finalNumB : finalNumB - finalNumA;
                }

                return direction === "asc" ?
                    valA.toString().localeCompare(valB.toString()) :
                    valB.toString().localeCompare(valA.toString());
            });
        }
        return filteredReports;
    }

    function renderReportsTable(reports, userRole, filteredReports) {
        reportsBody.innerHTML = '';
        const totalEntries = filteredReports.length;
        const totalPages = Math.ceil(totalEntries / rowsPerPage);

        if (reports.length === 0) {
            reportsBody.innerHTML = "<tr><td colspan='11'>No approved reports found on this page.</td></tr>";
            entriesInfo.textContent = "Showing 0 to 0 of 0 entries";
            renderPaginationControlsForReports(totalPages, filteredReports);
            return;
        }

        reports.forEach((report, index) => {
            const tr = document.createElement('tr');
            const displayIndex = (currentPage - 1) * rowsPerPage + index + 1;
            tr.innerHTML = `
                <td>${displayIndex}</td>
                <td>${report["ReportID"] || "-"}</td>
                <td>${report["VolunteerGroupName"] || "[Unknown Org]"}</td>
                <td>${report["AreaOfOperation"] || "-"}</td>
                <td>${formatDate(report["StartDate"]) || "-"}</td>
                <td>${formatDate(report["EndDate"]) || "-"}</td>
                <td>${formatCurrency(report["TotalValueOfInKindDonations"])}</td>
                <td>${formatCurrency(report["TotalMonetaryDonations"])}</td>
                <td>${report["CalamityType"] || "-"}</td>
                <td>${report["CalamityName"] || "-"}</td>
                <td>
                    <button title="View" class="viewBtn"><i class="bx bx-show-alt"></i></button>
                    <button title="Archive" class="deleteBtn"><i class="bx bx-x-circle"></i></button>
                    <button title="Save as PDF" class="savePDFBtn"><i class="bx bxs-file-pdf"></i></button>
                </td>
            `;

            const deleteBtn = tr.querySelector('.deleteBtn');
            if (userRole === 'ABVN' && deleteBtn) deleteBtn.style.display = 'none';

            const savePDFBtn = tr.querySelector(".savePDFBtn");
            savePDFBtn.addEventListener("click", () => saveIndividualReportToPdf(report));

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
                    <div class="modal-content-inner" style="padding: 20px;">
                        <h2>Basic Information</h2>
                        <p><strong>Report ID:</strong> ${report.ReportID || "N/A"}</p>
                        <p><strong>Volunteer Group:</strong> ${report.VolunteerGroupName || "N/A"}</p>
                        <p><strong>Location of Operation:</strong> ${report.AreaOfOperation || "N/A"}</p>
                        <p><strong>Calamity Name:</strong> ${report.CalamityName || "N/A"}</p>
                        <p><strong>Calamity Type:</strong> ${report.CalamityType || "N/A"}</p>
                        <p><strong>Date of Report Submitted:</strong> ${formatDate(report.DateOfReport) || "N/A"}</p>
                        <hr>
                        <h2>Relief Operations</h2>
                        <div style="margin-left: 10px;">
                            <p><strong>Completion Time of Intervention:</strong> ${formatTime(report.TimeOfIntervention) || "N/A"}</p>
                            <p><strong>Start Date of Operation:</strong> ${formatDate(report.StartDate) || "N/A"}</p>
                            <p><strong>End Date of Operation:</strong> ${formatDate(report.EndDate) || "N/A"}</p>
                            <p><strong>No. of Individuals or Families:</strong> ${formatWithCommas(report.NoOfIndividualsOrFamilies) || "N/A"}</p>
                            <p><strong>No. of Food Packs:</strong> ${formatCompact(report.NoOfFoodPacks) || "N/A"}</p>
                            <p><strong>No. of Hot Meals/Ready-to-eat food:</strong> ${formatCompact(report.NoOfHotMeals) || "N/A"}</p>
                            <p><strong>Liters of Water:</strong> ${formatWithCommas(report.LitersOfWater) || "N/A"}</p>
                            <p><strong>No. of Volunteers Mobilized:</strong> ${formatWithCommas(report.NoOfVolunteersMobilized) || "N/A"}</p>
                            <p><strong>No. of Organizations Activated:</strong> ${formatCompact(report.NoOfOrganizationsActivated) || "N/A"}</p>
                            <p><strong>Total Value of In-Kind Donations:</strong> ${formatCurrency(report.TotalValueOfInKindDonations) || "N/A"}</p>
                            <p><strong>Total Monetary Donations:</strong> ${formatCurrency(report.TotalMonetaryDonations) || "N/A"}</p>
                        </div>
                        <hr>
                        <h2>Additional Updates</h2>
                        <p><strong>Notes/Additional Information:</strong> ${report.NotesAdditionalInformation || "N/A"}</p>
                    </div>
                `;
                modal.classList.remove("hidden");
                closeModal.addEventListener("click", () => {
                    modal.classList.add("hidden");
                });
                window.addEventListener("click", function(event) {
                    if (event.target === modal) {
                        modal.classList.add("hidden");
                    }
                });
            });

            if (deleteBtn) {
                deleteBtn.addEventListener('click', async () => {
                    const result = await Swal.fire({
                        title: 'Are you sure to archive this report?',
                        text: `You are about to remove Report ID: ${report.ReportID}. This will move it to archive records.`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Reject',
                        cancelButtonText: 'Cancel',
                        reverseButtons: true,
                        focusCancel: true,
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'custom-swal-popup-large',
                            title: 'custom-swal-title',
                            htmlContainer: 'custom-swal-content',
                            confirmButton: 'custom-confirm-btn',
                            cancelButton: 'custom-cancel-btn',
                        },
                    });

                    if (result.isConfirmed) {
                        try {
                            const reportRef = database.ref(`reports/approved/${report.firebaseKey}`);
                            const reportSnapshot = await reportRef.once('value');
                            const reportData = reportSnapshot.val();

                            if (!reportData) {
                                throw new Error("Report not found in approved reports. It may have been already moved or deleted, or the key is incorrect. Expected key: " + report.firebaseKey);
                            }

                            await database.ref(`reports/archived/reportslog/${report.firebaseKey}`).set({
                                ...reportData,
                                deletedAt: new Date().toISOString()
                            });
                            await reportRef.remove();

                            Swal.fire({
                                title: 'Archived!',
                                text: `Report ID: ${report.ReportID} has been moved to archived records.`,
                                icon: 'success',
                                showConfirmButton: true,
                                confirmButtonText: 'OK',
                                customClass: {
                                    popup: 'swal2-popup-success-clean',
                                    title: 'swal2-title-success-clean',
                                    htmlContainer: 'swal2-text-success-clean',
                                    confirmButton: 'my-success-button'
                                }
                            });
                        } catch (error) {
                            console.error("Error deleting report:", error);
                            Swal.fire(
                                'Error!',
                                `Failed to remove report: ${error.message}. Please try again or contact support if the issue persists.`,
                                'error'
                            );
                        }
                    }
                });
            }

            reportsBody.appendChild(tr);
        });
        const firstEntry = (currentPage - 1) * rowsPerPage + 1;
        const lastEntry = Math.min(currentPage * rowsPerPage, totalEntries);
        entriesInfo.textContent = `Showing ${firstEntry} to ${lastEntry} of ${totalEntries} entries`;
        renderPaginationControlsForReports(totalPages, filteredReports);
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
                    renderReportsTable(currentPageReports, userRole, filteredReports);
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

    function renderArchivedTable(userRole) {
        archivedTableBody.innerHTML = '';
        const totalEntries = archivedReports.length;
        const totalPages = Math.ceil(totalEntries / archivedRowsPerPage);

        if (totalEntries === 0) {
            archivedTableBody.innerHTML = "<tr><td colspan='9'>No archived reports found.</td></tr>";
            archivedEntriesInfo.textContent = "Showing 0 to 0 of 0 entries";
            renderArchivedPaginationControls(totalPages);
            return;
        }

        const startIndex = (archivedCurrentPage - 1) * archivedRowsPerPage;
        const endIndex = startIndex + archivedRowsPerPage;
        const currentPageReports = archivedReports.slice(startIndex, endIndex);

        currentPageReports.forEach((report, index) => {
            const tr = document.createElement('tr');
            const displayIndex = startIndex + index + 1;
            tr.innerHTML = `
                <td>${displayIndex}</td>
                <td>${report.ReportID || "-"}</td>
                <td>${report.VolunteerGroupName || "[Unknown Org]"}</td>
                <td>${report.AreaOfOperation || "-"}</td>
                <td>${formatDate(report.StartDate) || "-"}</td>
                <td>${formatDate(report.EndDate) || "-"}</td>
                <td>${formatCurrency(report.TotalValueOfInKindDonations)}</td>
                <td>${formatCurrency(report.TotalMonetaryDonations)}</td>
                <td>
                    <button title="Restore" class="restoreBtn">Retrieve</button>
                </td>
            `;

            const restoreBtn = tr.querySelector('.restoreBtn');
            if (userRole === 'ABVN') {
                restoreBtn.style.display = 'none';
            }

            restoreBtn.addEventListener('click', async () => {
                const result = await Swal.fire({
                    title: 'Retrieve report?',
                    text: `You are about to restore Report ID: ${report.ReportID} to approved reports.`,
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
                        cancelButton: 'custom-cancel-btn',
                    },
                });

                if (result.isConfirmed) {
                    try {
                        const reportRef = database.ref(`reports/archived/reportslog/${report.firebaseKey}`);
                        const reportSnapshot = await reportRef.once('value');
                        const reportData = reportSnapshot.val();

                        if (!reportData) {
                            throw new Error("Report not found in archived records.");
                        }

                        // Remove deletedAt timestamp before restoring
                        delete reportData.deletedAt;
                        await database.ref(`reports/approved/${report.firebaseKey}`).set(reportData);
                        await reportRef.remove();

                        Swal.fire({
                            title: 'Retrieved!',
                            text: `Report ID: ${report.ReportID} has been restored to approved reports.`,
                            icon: 'success',
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                            popup: 'swal2-popup-success-clean',
                            title: 'swal2-title-success-clean',
                            htmlContainer: 'swal2-text-success-clean',
                            confirmButton: 'my-success-button'
                            }
                        });
                    } catch (error) {
                        console.error("Error restoring report:", error);
                        Swal.fire(
                            'Error!',
                            `Failed to restore report: ${error.message}.`,
                            'error'
                        );
                    }
                }
            });

            archivedTableBody.appendChild(tr);
        });

        const firstEntry = startIndex + 1;
        const lastEntry = Math.min(endIndex, totalEntries);
        archivedEntriesInfo.textContent = `Showing ${firstEntry} to ${lastEntry} of ${totalEntries} entries`;
        renderArchivedPaginationControls(totalPages);
    }

    function renderArchivedPaginationControls(totalPages) {
        archivedPaginationContainer.innerHTML = '';

        if (totalPages === 0) {
            archivedPaginationContainer.innerHTML = '<span>No entries to display</span>';
            return;
        }

        const createButton = (label, page, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (isActive) btn.classList.add('active-page');
            btn.addEventListener('click', () => {
                if (!disabled) {
                    archivedCurrentPage = page;
                    renderArchivedTable(userRole);
                }
            });
            return btn;
        };

        archivedPaginationContainer.appendChild(createButton('Prev', archivedCurrentPage - 1, archivedCurrentPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, archivedCurrentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            archivedPaginationContainer.appendChild(createButton(i, i, false, i === archivedCurrentPage));
        }

        archivedPaginationContainer.appendChild(createButton('Next', archivedCurrentPage + 1, archivedCurrentPage === totalPages));
    }

    function applySearchAndSort(userRole) {
        const filteredData = getDisplayedReportsData();
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageReports = filteredData.slice(startIndex, endIndex);
        renderReportsTable(currentPageReports, userRole, filteredData);
    }

    searchInput.addEventListener('input', () => {
        currentPage = 1;
        applySearchAndSort(userRole);
    });

    sortSelect.addEventListener('change', () => {
        currentPage = 1;
        applySearchAndSort(userRole);
    });

    window.clearDInputs = () => {
        searchInput.value = '';
        currentPage = 1;
        applySearchAndSort(userRole);
    };

    exportExcelBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Generating Excel...',
            text: 'Please wait while the Excel file is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        try {
            const dataToExport = getDisplayedReportsData();
            if (dataToExport.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'No Data to Export',
                    text: 'There are no reports matching your current search/sort criteria to export.',
                });
                return;
            }
            const headerMap = {
                "ReportID": "Report ID",
                "VolunteerGroupName": "Volunteer Group Name",
                "AreaOfOperation": "Area of Operation",
                "CalamityType": "Calamity Type",
                "CalamityName": "Calamity Name",
                "StartDate": "Operation Start Date",
                "EndDate": "Operation End Date",
                "NoOfHotMeals": "No. of Hot Meals",
                "LitersOfWater": "Liters of Water",
                "DateOfReport": "Report Submission Date",
                "TimeOfIntervention": "Completion Time of Intervention",
                "NoOfIndividualsOrFamilies": "No. of Individuals or Families",
                "NoOfFoodPacks": "No. of Food Packs",
                "NoOfVolunteersMobilized": "No. of Volunteers Mobilized",
                "NoOfOrganizationsActivated": "No. of Organizations Activated",
                "TotalValueOfInKindDonations": "Total Value of In-Kind Donations",
                "TotalMonetaryDonations": "Total Monetary Donations",
                "NotesAdditionalInformation": "Notes/Additional Information"
            };
            const wsData = dataToExport.map(report => {
                const row = {};
                for (const key in headerMap) {
                    let value = report[key];
                    if (key.includes("Date") && value) {
                        value = formatDate(value);
                    } else if (key.includes("Time") && value) {
                        value = formatTime(value);
                    }
                    row[headerMap[key]] = value || "-";
                }
                return row;
            });
            const ws = XLSX.utils.json_to_sheet(wsData);
            const wscols = [
                { wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 },
                { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
                { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 25 },
                { wch: 25 }, { wch: 25 }, { wch: 40 }
            ];
            ws['!cols'] = wscols;
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Approved Reports");
            const fileName = `Approved_Reports_Log_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
            Swal.close();
            Swal.fire({
                title: 'Success!',
                text: 'Excel file generated successfully!',
                icon: 'success',
                timer: 1600,
                showConfirmButton: false,
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean'
                }
            });
        } catch (error) {
            console.error('Error generating Excel:', error);
            Swal.close();
            Swal.fire('Error!', 'Failed to generate Excel: ' + error.message, 'error');
        }
    });

    savePdfBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while the PDF file is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        generatePdf();
    });

    function generatePdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('portrait');
        const reports = getDisplayedReportsData();
        if (reports.length === 0) {
            Swal.close();
            Swal.fire({
                icon: 'info',
                title: 'No Data to Export',
                text: 'There are no reports matching your current search/sort criteria to export to PDF.',
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
                docInstance.text("Approved Reports Log", margin, yOffset + 8);
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
                const text = `• ${label}: ${value || '-'}`;
                const splitText = docInstance.splitTextToSize(text, contentAreaWidth);
                docInstance.text(splitText, margin, currentY);
                return currentY + (splitText.length * detailLineHeight);
            };
            const addSectionTitle = (docInstance, title, currentY) => {
                docInstance.setFontSize(12);
                docInstance.setTextColor(20, 174, 187);
                docInstance.text(title, margin, currentY);
                docInstance.setTextColor(0);
                return currentY + 7;
            };
            let currentPage = 1;
            reports.forEach((report, index) => {
                if (index > 0) {
                    doc.addPage();
                    currentPage++;
                }
                let yPos = addHeaderAndFooter(doc, currentPage, reports.length);
                doc.setFontSize(14);
                doc.setTextColor(20, 174, 187);
                doc.text(`Report ID: ${report.ReportID || "-"}`, textX, yPos);
                yPos += 10;
                doc.setTextColor(0);
                yPos = addSectionTitle(doc, "Basic Information", yPos);
                doc.setFontSize(10);
                yPos = addDetailText(doc, "Volunteer Group", report.VolunteerGroupName || "[Unknown Org]", yPos, contentWidth);
                yPos = addDetailText(doc, "Location of Operation", report.AreaOfOperation || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "Calamity Name", report.CalamityName || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "Calamity Type", report.CalamityType || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "Date of Report Submitted", formatDate(report.DateOfReport), yPos, contentWidth);
                yPos += 5;
                yPos = addSectionTitle(doc, "Relief Operations", yPos);
                doc.setFontSize(10);
                yPos = addDetailText(doc, "Completion time of intervention", formatTime(report.TimeOfIntervention), yPos, contentWidth);
                yPos = addDetailText(doc, "Start Date of Operation", formatDate(report.StartDate) || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "End Date of Operation", formatDate(report.EndDate) || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "No. of Individuals or Families", report.NoOfIndividualsOrFamilies || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "No. of Food Packs", report.NoOfFoodPacks || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "No. of Hot Meals/Ready-to-eat food", report.NoOfHotMeals || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "Liters of Water", report.LitersOfWater || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "No. of Volunteers Mobilized", report.NoOfVolunteersMobilized || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "No. of Organizations Activated", report.NoOfOrganizationsActivated || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "Total Value of In-Kind Donations", report.TotalValueOfInKindDonations || "-", yPos, contentWidth);
                yPos = addDetailText(doc, "Total Monetary Donations", report.TotalMonetaryDonations || "-", yPos, contentWidth);
                yPos += 5;
                yPos = addSectionTitle(doc, "Additional Updates", yPos);
                doc.setFontSize(10);
                yPos = addDetailText(doc, "Notes/Additional Information", report.NotesAdditionalInformation || "-", yPos, contentWidth);
            });
            const date = new Date();
            const dateString = date.toISOString().slice(0, 10);
            doc.save(`Approved_Reports_Log_${dateString}.pdf`);
            Swal.close();
            Swal.fire({
                title: 'Success!',
                text: 'PDF file generated successfully!',
                icon: 'success',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean',
                    confirmButton: 'my-success-button'
                }
            });
        };
        logo.onerror = function() {
            Swal.close();
            Swal.fire("Error", "Failed to load logo image at ../assets/images/AB_logo.png. Please check the path.", "error");
        };
    }

    function saveIndividualReportToPdf(report) {
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while the PDF file is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
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
            doc.text("Report Details", margin, y + 8);
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
                    doc.text("Report Details (Cont.)", margin, y + 8);
                    y += 18;
                }
                doc.setFontSize(isTitle ? 12 : 10);
                if (isTitle) {
                    doc.setTextColor(20, 174, 187);
                    doc.text(`${label}`, margin, y);
                    doc.setTextColor(0);
                    y += 7;
                } else {
                    const text = `• ${label}: ${value || '-'}`;
                    const splitText = doc.splitTextToSize(text, pageWidth - (2 * margin));
                    doc.text(splitText, margin, y);
                    y += (splitText.length * 5);
                }
            };
            doc.setFontSize(14);
            doc.setTextColor(20, 174, 187);
            doc.text(`Report ID: ${report.ReportID || "-"}`, margin, y);
            y += 10;
            doc.setTextColor(0);
            addDetail("Basic Information", "", true);
            addDetail("Volunteer Group", report.VolunteerGroupName || "[Unknown Org]");
            addDetail("Location of Operation", report.AreaOfOperation || "-");
            addDetail("Calamity Name", report.CalamityName || "-");
            addDetail("Calamity Type", report.CalamityType || "-");
            addDetail("Date of Report Submitted", formatDate(report.DateOfReport));
            y += 5;
            addDetail("Relief Operations", "", true);
            addDetail("Completion time of intervention", formatTime(report.TimeOfIntervention));
            addDetail("Start Date of Operation", formatDate(report.StartDate) || "-");
            addDetail("End Date of Operation", formatDate(report.EndDate) || "-");
            addDetail("No. of Individuals or Families", report.NoOfIndividualsOrFamilies || "-");
            addDetail("No. of Food Packs", report.NoOfFoodPacks || "-");
            addDetail("No. of Hot Meals/Ready-to-eat food", report.NoOfHotMeals || "-");
            addDetail("Liters of Water", report.LitersOfWater || "-");
            addDetail("No. of Volunteers Mobilized", report.NoOfVolunteersMobilized || "-");
            addDetail("No. of Organizations Activated", report.NoOfOrganizationsActivated || "-");
            addDetail("Total Value of In-Kind Donations", report.TotalValueOfInKindDonations || "-");
            addDetail("Total Monetary Donations", report.TotalMonetaryDonations || "-");
            y += 5;
            addDetail("Additional Updates", "", true);
            addDetail("Notes/Additional Information", report.NotesAdditionalInformation || "-");
            y += 5;
            doc.setFontSize(8);
            const footerY = pageHeight - 10;
            const pageNumberText = `Page ${doc.internal.getNumberOfPages()}`;
            const poweredByText = "Powered by: Appvance";
            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
            doc.save(`Report_${report.ReportID || 'Details'}.pdf`);
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'PDF Generated!',
                text: `Report "${report.ReportID || 'Details'}" saved as PDF.`,
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    htmlContainer: 'swal2-text-success-clean',
                    confirmButton: 'my-success-button'
                }
            });
        };
        logo.onerror = function() {
            Swal.close();
            Swal.fire("Error", "Failed to load logo image at ../assets/images/AB_logo.png. Please check the path.", "error");
        };
    }
});