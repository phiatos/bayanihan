// reportsOverview.js
try {
    // const firebaseConfig = {
    //     apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    //     authDomain: "bayanihan-5ce7e.firebaseapp.com",
    //     databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    //     projectId: "bayanihan-5ce7e",
    //     storageBucket: "bayanihan-5ce7e.appspot.com",
    //     messagingSenderId: "593123849917",
    //     appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    //     measurementId: "G-ZTQ9VXXVV0",
    // };
    const firebaseConfig = {
        apiKey: "AIzaSyBkmXOJvnlBtzkjNyR6wyd9BgGM0BhN0L8",
        authDomain: "bayanihan-new-472410.firebaseapp.com",
        projectId: "bayanihan-new-472410",
        storageBucket: "bayanihan-new-472410.firebasestorage.app",
        messagingSenderId: "995982574131",
        appId: "1:995982574131:web:3d45e358fad330c276d946",
        measurementId: "G-CEVPTQZM9C",
        databaseURL: "https://bayanihan-new-472410-default-rtdb.asia-southeast1.firebasedatabase.app/"
    };

    let database, auth;
    try {
        const firebaseApp = firebase.initializeApp(firebaseConfig);
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

    const totalReports = document.getElementById("total-reports");
    const pendingReports = document.getElementById("pending-reports");
    const approvedReports = document.getElementById("approved-reports");
    const reportsTable = document.getElementById("reports-table");
    const reportSearchInput = document.getElementById("report-search-input");
    const statusFilter = document.getElementById("status-filter");
    const calamityTypeFilter = document.getElementById("calamity-type-filter");
    const calamityNameFilter = document.getElementById("calamity-name-filter");
    const reportPreviewModal = document.getElementById("reportPreviewModal");
    const reportModalContent = document.getElementById("reportModalContent");
    const closeReportModal = document.getElementById("closeReportModal");
    const reportsChartCanvas = document.getElementById("reportsChart");

    console.log("DOM elements check:", {
        totalReports: !!totalReports,
        pendingReports: !!pendingReports,
        approvedReports: !!approvedReports,
        reportsTable: !!reportsTable,
        reportSearchInput: !!reportSearchInput,
        statusFilter: !!statusFilter,
        calamityTypeFilter: !!calamityTypeFilter,
        calamityNameFilter: !!calamityNameFilter,
        reportPreviewModal: !!reportPreviewModal,
        reportModalContent: !!reportModalContent,
        closeReportModal: !!closeReportModal,
        reportsChartCanvas: !!reportsChartCanvas
    });

    if (!totalReports || !pendingReports || !approvedReports || !reportsTable || !reportSearchInput || 
        !statusFilter || !calamityTypeFilter || !calamityNameFilter || !reportPreviewModal || 
        !reportModalContent || !closeReportModal || !reportsChartCanvas) {
        console.error("Required DOM elements not found:", {
            totalReports: !!totalReports,
            pendingReports: !!pendingReports,
            approvedReports: !!approvedReports,
            reportsTable: !!reportsTable,
            reportSearchInput: !!reportSearchInput,
            statusFilter: !!statusFilter,
            calamityTypeFilter: !!calamityTypeFilter,
            calamityNameFilter: !!calamityNameFilter,
            reportPreviewModal: !!reportPreviewModal,
            reportModalContent: !!reportModalContent,
            closeReportModal: !!closeReportModal,
            reportsChartCanvas: !!reportsChartCanvas
        });
        Swal.fire({
            icon: 'error',
            title: 'Page Error',
            text: 'Required elements are missing on the page. Please contact support.',
        });
        return;
    }

    let allReports = [];
    let chartInstance = null;

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return isNaN(date) ? dateStr || "-" : date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
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

    function formatWithCommas(value) {
        return value != null ? Number(value).toLocaleString() : "-";
    }

    function transformReportData(report, key, activationData = {}) {
        const calamityName = activationData.calamityName || activationData.typhoonName || report.CalamityName || report.CalamityAreaDetails || "-";
        const calamityType = activationData.calamityType || activationData.CalamityType || report.CalamityType || 
                            (report.CalamityAreaDetails ? report.CalamityAreaDetails.split(' ')[0] : "-");

        return {
            firebaseKey: key,
            ReportID: report.reportID || report.ReportID || "-",
            VolunteerGroupName: report.organization || report.VolunteerGroupName || "Admin",
            AreaOfOperation: report.AreaOfOperation || "-",
            CalamityType: calamityType,
            CalamityName: calamityName,
            DateOfReport: report.dateOfReport || report.DateOfReport || "-",
            Status: report.status || report.Status || "Approved",
            TotalValueOfInKindDonations: report.inKindValue || report.TotalValueOfInKindDonations || 0,
            TotalMonetaryDonations: report.amountRaised || report.TotalMonetaryDonations || 0,
            NoOfVolunteersMobilized: report.volunteers || report.NoOfVolunteersMobilized || 0,
            activationId: report.activationId || "-"
        };
    }

    async function loadReports() {
        try {
            console.log("Loading reports from Firebase...");
            const approvedSnapshot = await database.ref("reports/approved").once("value");
            const archivedSnapshot = await database.ref("reports/archived/reportslog").once("value");
            allReports = [];

            const processReports = async (reports, source) => {
                if (reports) {
                    for (const [key, report] of Object.entries(reports)) {
                        let activationData = {};
                        if (report.activationId) {
                            try {
                                const activationSnapshot = await database.ref(`activations/${report.activationId}`).once("value");
                                activationData = activationSnapshot.val() || {};
                            } catch (error) {
                                console.warn(`Error fetching activation data for ${source} report ${key}:`, error);
                            }
                        }
                        if (!report.VolunteerGroupName && !report.organization) {
                            report.VolunteerGroupName = "Admin";
                        }
                        const transformedReport = transformReportData(report, key, activationData);
                        transformedReport.source = source; // Track whether report is approved or archived
                        allReports.push(transformedReport);
                    }
                }
            };

            await processReports(approvedSnapshot.val(), "approved");
            await processReports(archivedSnapshot.val(), "archived");
            console.log("Reports loaded successfully:", allReports.length);
            renderDashboard();
            populateFilters();
        } catch (error) {
            console.error("Error fetching reports:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load reports: ' + error.message,
            });
        }
    }

    function populateFilters() {
        const calamityTypes = [...new Set(allReports.map(report => report.CalamityType))].filter(type => type !== "-");
        const calamityNames = [...new Set(allReports.map(report => report.CalamityName))].filter(name => name !== "-");

        calamityTypeFilter.innerHTML = '<option value="">All Calamity Types</option>';
        calamityTypes.forEach(type => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type;
            calamityTypeFilter.appendChild(option);
        });

        calamityNameFilter.innerHTML = '<option value="">All Calamity Names</option>';
        calamityNames.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            calamityNameFilter.appendChild(option);
        });
    }

    function renderDashboard() {
        // Update summary cards
        const total = allReports.length;
        const approved = allReports.filter(r => r.source === "approved").length;
        const pending = 0; // Adjust if you have a pending reports path
        totalReports.textContent = formatWithCommas(total);
        pendingReports.textContent = formatWithCommas(pending);
        approvedReports.textContent = formatWithCommas(approved);

        // Render table with filters applied
        applyFiltersAndRenderTable();

        // Render chart
        renderChart();
    }

    function applyFiltersAndRenderTable() {
        const searchQuery = reportSearchInput.value.toLowerCase();
        const status = statusFilter.value;
        const calamityType = calamityTypeFilter.value;
        const calamityName = calamityNameFilter.value;

        let filteredReports = allReports.filter(report => {
            const matchesSearch = report.ReportID.toLowerCase().includes(searchQuery) || 
                                 report.VolunteerGroupName.toLowerCase().includes(searchQuery);
            const matchesStatus = !status || (status === "approved" && report.source === "approved") || 
                                 (status === "archived" && report.source === "archived");
            const matchesType = !calamityType || report.CalamityType === calamityType;
            const matchesName = !calamityName || report.CalamityName === calamityName;
            return matchesSearch && matchesStatus && matchesType && matchesName;
        });

        reportsTable.innerHTML = "";
        if (filteredReports.length === 0) {
            reportsTable.innerHTML = "<tr><td colspan='9'>No reports found.</td></tr>";
            return;
        }

        filteredReports.forEach((report, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${report.ReportID || "-"}</td>
                <td>${report.VolunteerGroupName || "Admin"}</td>
                <td>${report.AreaOfOperation || "-"}</td>
                <td>${report.CalamityType || "-"}</td>
                <td>${report.CalamityName || "-"}</td>
                <td>${formatDate(report.DateOfReport) || "-"}</td>
                <td>${report.source === "approved" ? "Approved" : "Archived"}</td>
                <td>
                    <button class="view-btn" data-report-id="${report.firebaseKey}"><i class='bx bx-show-alt'></i></button>
                </td>
            `;
            reportsTable.appendChild(tr);
        });

        // Add event listeners for view buttons
        document.querySelectorAll(".view-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const reportId = btn.dataset.reportId;
                const report = allReports.find(r => r.firebaseKey === reportId);
                showReportModal(report);
            });
        });
    }

    function renderChart() {
        if (chartInstance) {
            chartInstance.destroy();
        }

        const reportsByMonth = allReports.reduce((acc, report) => {
            const date = new Date(report.DateOfReport);
            if (isNaN(date)) return acc;
            const monthYear = date.toLocaleString("en-US", { month: "short", year: "numeric" });
            acc[monthYear] = acc[monthYear] || { approved: 0, archived: 0 };
            if (report.source === "approved") {
                acc[monthYear].approved += 1;
            } else {
                acc[monthYear].archived += 1;
            }
            return acc;
        }, {});

        const labels = Object.keys(reportsByMonth).sort((a, b) => new Date(a) - new Date(b));
        const approvedData = labels.map(label => reportsByMonth[label].approved);
        const archivedData = labels.map(label => reportsByMonth[label].archived);

        chartInstance = new Chart(reportsChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Approved Reports',
                        data: approvedData,
                        borderColor: '#14aebb',
                        backgroundColor: 'rgba(20, 174, 187, 0.2)',
                        fill: true
                    },
                    {
                        label: 'Archived Reports',
                        data: archivedData,
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255, 107, 107, 0.2)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Reports' }
                    },
                    x: {
                        title: { display: true, text: 'Month' }
                    }
                }
            }
        });
    }

    function showReportModal(report) {
        reportModalContent.innerHTML = `
            <h2>Report Details</h2>
            <p><strong>Report ID:</strong> ${report.ReportID || "-"}</p>
            <p><strong>Volunteer Group:</strong> ${report.VolunteerGroupName || "Admin"}</p>
            <p><strong>Area of Operation:</strong> ${report.AreaOfOperation || "-"}</p>
            <p><strong>Calamity Type:</strong> ${report.CalamityType || "-"}</p>
            <p><strong>Calamity Name:</strong> ${report.CalamityName || "-"}</p>
            <p><strong>Date of Report:</strong> ${formatDate(report.DateOfReport) || "-"}</p>
            <p><strong>Status:</strong> ${report.source === "approved" ? "Approved" : "Archived"}</p>
            <p><strong>In-Kind Donations:</strong> ${formatCurrency(report.TotalValueOfInKindDonations)}</p>
            <p><strong>Monetary Donations:</strong> ${formatCurrency(report.TotalMonetaryDonations)}</p>
            <p><strong>Volunteers Mobilized:</strong> ${formatWithCommas(report.NoOfVolunteersMobilized)}</p>
        `;
        reportPreviewModal.style.display = "flex";
    }

    closeReportModal.addEventListener("click", () => {
        reportPreviewModal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
        if (event.target === reportPreviewModal) {
            reportPreviewModal.style.display = "none";
        }
    });

    reportSearchInput.addEventListener("input", applyFiltersAndRenderTable);
    statusFilter.addEventListener("change", applyFiltersAndRenderTable);
    calamityTypeFilter.addEventListener("change", applyFiltersAndRenderTable);
    calamityNameFilter.addEventListener("change", applyFiltersAndRenderTable);

    auth.onAuthStateChanged(async (user) => {
        console.log("Auth state changed:", user ? { uid: user.uid, email: user.email } : 'No user');
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to view the reports overview.',
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
            const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = userSnapshot.val();
            const passwordNeedsReset = userData ? (userData.password_needs_reset || false) : false;

            if (passwordNeedsReset) {
                console.log("Password change required for user. Redirecting to profile page.");
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

            loadReports();
        } catch (error) {
            console.error("Error checking user data:", error);
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

    window.cleanupReportsOverview = () => {
        console.log("Cleaning up reports overview");
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        reportSearchInput.removeEventListener("input", applyFiltersAndRenderTable);
        statusFilter.removeEventListener("change", applyFiltersAndRenderTable);
        calamityTypeFilter.removeEventListener("change", applyFiltersAndRenderTable);
        calamityNameFilter.removeEventListener("change", applyFiltersAndRenderTable);
        closeReportModal.removeEventListener("click", () => {
            reportPreviewModal.style.display = "none";
        });
        window.removeEventListener("click", (event) => {
            if (event.target === reportPreviewModal) {
                reportPreviewModal.style.display = "none";
            }
        });
    };

} catch (error) {
    console.error("Error in reportsOverview.js:", error);
    Swal.fire({
        icon: 'error',
        title: 'Script Error',
        text: 'Failed to execute reports overview script: ' + error.message,
    });
}