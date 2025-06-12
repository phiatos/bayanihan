document.addEventListener('DOMContentLoaded', () => {
<<<<<<< HEAD
    // Firebase Configuration
=======
    // Firebase configuration
>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
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
<<<<<<< HEAD
        // Initialize Firebase with compat layer
        const firebaseApp = firebase.initializeApp(firebaseConfig);
        database = firebaseApp.database();
        auth = firebaseApp.auth();
=======
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        auth = firebase.auth();
        console.log('Firebase initialized successfully');
>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'Failed to initialize Firebase. Please try again later.',
        });
        return;
    }

    // DOM element selectors
    const tableBody = document.getElementById('reportsBody');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
<<<<<<< HEAD
    let currentPage = 1;
    const rowsPerPage = 5;

    if (!reportsBody || !paginationContainer || !entriesInfo || !searchInput || !sortSelect || !savePdfBtn || !exportExcelBtn) {
        console.error("Required DOM elements not found");
=======
    const reportModal = document.getElementById('reportModal');

    // Detailed DOM validation
    const domElements = {
        tableBody: !!tableBody,
        searchInput: !!searchInput,
        sortSelect: !!sortSelect,
        entriesInfo: !!entriesInfo,
        pagination: !!pagination,
        savePdfBtn: !!savePdfBtn,
        exportExcelBtn: !!exportExcelBtn,
        reportModal: !!reportModal
    };
    if (!tableBody || !searchInput || !sortSelect || !entriesInfo || !pagination || !savePdfBtn || !exportExcelBtn || !reportModal) {
        console.error('DOM validation failed. Missing elements:', domElements);
>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
        Swal.fire({
            icon: 'error',
            title: 'Page Error',
            text: 'Required elements are missing on the page. Check console for details and contact support.',
        });
        return;
    } else {
        console.log('All DOM elements found:', domElements);
    }

<<<<<<< HEAD
    // User Role Check
    let userRole = 'User'; // Default role
    auth.onAuthStateChanged(async (user) => {
=======
    let data = [];
    let filteredData = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    // Check authentication state
    auth.onAuthStateChanged(user => {
>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
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
<<<<<<< HEAD

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

    function transformReportData(report, key) {
        return {
            firebaseKey: key, // Use the actual node key as firebaseKey
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
        };
    }

    function loadReportsFromFirebase(userRole) {
        database.ref("reports/approved").on("value", (snapshot) => {
            reviewedReports = [];
            const reports = snapshot.val();
            if (reports) {
                Object.keys(reports).forEach((key) => {
=======
        console.log('User authenticated:', { uid: user.uid, email: user.email });
        loadReportsFromFirebase(user);
    });

    // Fetch data from Firebase with filtering for ABVN users
    function loadReportsFromFirebase(user) {
        const userData = JSON.parse(localStorage.getItem("userData")) || {};
        const userRole = userData.role || localStorage.getItem("userRole") || "";
        const userOrganization = userData.organization || "";
        console.log('User data:', { userRole, userOrganization, userUid: user.uid });

        database.ref('reports/approved').on('value', (snapshot) => {
            console.log('Fetching data from Firebase');
            data = [];
            const reports = snapshot.val();
            if (reports) {
                Object.keys(reports).forEach((key, index) => {
>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
                    const report = reports[key];
                    console.log('Processing report:', { key, status: report.status, VolunteerGroupName: report.VolunteerGroupName, submittedBy: report.submittedBy, userUid: user.uid });
                    // Check if status is approved (default to "Approved" if undefined)
                    const isApproved = report.status === "Approved" || report.status === undefined;
                    // For ABVN users, filter by their UID or organization
                    if (userRole === "ABVN" && !isApproved) {
                        console.log('Skipping report:', key, 'Reason: Status is not Approved');
                        return;
                    }
<<<<<<< HEAD
                    const transformedReport = transformReportData(report, key); // Pass the key to transformReportData
                    reviewedReports.push(transformedReport);
                    console.log(`Loaded report with key: ${key}, transformed firebaseKey: ${transformedReport.firebaseKey}`);
=======
                    if (userRole === "ABVN" && isApproved && (report.submittedBy !== user.uid && report.VolunteerGroupName !== userOrganization)) {
                        console.log('Skipping report:', key, 'Reason: Does not match ABVN criteria');
                        return;
                    }
                    data.push({
                        id: `REPORTS-${String(index + 1).padStart(6, '0')}`,
                        VolunteerGroupName: report.VolunteerGroupName || "[Unknown Org]",
                        AreaOfOperation: report.areaOfOperation || "N/A",
                        StartDate: report.startDate || "N/A",
                        EndDate: report.endDate || "N/A",
                        TotalValueOfInKindDonations: report.totalValueOfInKindDonations || "0",
                        TotalMonetaryDonations: report.totalMonetaryDonations || "0",
                        userUid: report.submittedBy || "N/A",
                        details: report.details || [],
                        firebaseKey: key,
                        status: report.status || "Approved"
                    });
>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
                });
                console.log('Data fetched successfully:', data);
            } else {
                console.log('No data found in reports/approved');
            }
<<<<<<< HEAD
            applySearchAndSort(userRole);
        }, (error) => {
            console.error("Error fetching reports from Firebase:", error);
=======
            filteredData = [...data];
            renderTable();
        }, (error) => {
            console.error('Error fetching data from Firebase:', error);
>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load reports: ' + error.message,
            });
        });
    }

<<<<<<< HEAD
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

    function renderReportsTable(reports, userRole) {
        reportsBody.innerHTML = '';
        const totalEntries = reports.length;
        const totalPages = Math.ceil(totalEntries / rowsPerPage);

        if (reports.length === 0) {
            reportsBody.innerHTML = "<tr><td colspan='9'>No approved reports found on this page.</td></tr>";
            entriesInfo.textContent = "Showing 0 to 0 of 0 entries";
            renderPaginationControlsForReports(0);
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
                <td>${report["TotalValueOfInKindDonations"] || "-"}</td>
                <td>${report["TotalMonetaryDonations"] || "-"}</td>
                <td>
                    <button class="viewBtn">View</button>
                    <button class="savePDFBtn">Save PDF</button>
                    <button class="deleteBtn">Remove</button>
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
                    <div class="report-section">
                        <div class="form-1">
                            <h2>Basic Information</h2>
                            <p><strong>Report ID:</strong> ${report.ReportID || "-"}</p>
                            <p><strong>Volunteer Group:</strong> ${report.VolunteerGroupName || "[Unknown Org]"}</p>
                            <p class="cell"><strong>Location of Operation:</strong> ${report.AreaOfOperation || "-"}</p>
                            <p><strong>Date of Report Submitted:</strong> ${formatDate(report.DateOfReport)}</p>
                        </div>
                        <div class="form-2">
                            <h2>Relief Operations</h2>
                            <p><strong>Completion time of intervention:</strong> ${formatTime(report.TimeOfIntervention)}</p>
                            <p><strong>Start Date of Operation:</strong> ${formatDate(report.StartDate) || "-"}</p>
                            <p><strong>End Date of Operation:</strong> ${formatDate(report.EndDate) || "-"}</p>
                            <p><strong>No. of Individuals or Families:</strong> ${report.NoOfIndividualsOrFamilies || "-"}</p>
                            <p><strong>No. of Food Packs:</strong> ${report.NoOfFoodPacks || "-"}</p>
                            <p><strong>No. of Hot Meals/Ready-to-eat food:</strong> ${report.NoOfHotMeals || "-"}</p>
                            <p><strong>Liters of Water:</strong> ${report.LitersOfWater || "-"}</p>
                            <p><strong>No. of Volunteers Mobilized:</strong> ${report.NoOfVolunteersMobilized || "-"}</p>
                            <p><strong>No. of Organizations Activated:</strong> ${report.NoOfOrganizationsActivated || "-"}</p>
                            <p><strong>Total Value of In-Kind Donations:</strong> ${report.TotalValueOfInKindDonations || "-"}</p>
                            <p><strong>Total Monetary Donations:</strong> ${report.TotalMonetaryDonations || "-"}</p>
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
                window.addEventListener("click", function(event) {
                    if (event.target === modal) {
                        modal.classList.add("hidden");
                    }
                });
            });

            if (deleteBtn) {
                deleteBtn.addEventListener('click', async () => {
                    const result = await Swal.fire({
                        title: 'Are you sure?',
                        text: `You are about to remove Report ID: ${report.ReportID || report.firebaseKey}. This will move it to the deletedreports node.`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#3085d6',
                        confirmButtonText: 'Yes, remove it!',
                        cancelButtonText: 'Cancel'
                    });

                    if (result.isConfirmed) {
                        try {
                            const reportRef = database.ref(`reports/approved/${report.firebaseKey}`);
                            const reportSnapshot = await reportRef.once('value');
                            const reportData = reportSnapshot.val();

                            if (!reportData) {
                                throw new Error("Report not found in approved reports. It may have been already moved or deleted, or the key is incorrect. Expected key: " + report.firebaseKey);
                            }

                            await database.ref(`deletedreports/${report.firebaseKey}`).set({
                                ...reportData,
                                deletedAt: new Date().toISOString()
                            });
                            await reportRef.remove();
                            Swal.fire(
                                'Removed!',
                                `Report ID: ${report.ReportID || report.firebaseKey} has been moved to deletedreports.`,
                                'success'
                            );
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
        entriesInfo.textContent = `Showing ${(currentPage - 1) * rowsPerPage + 1} to ${Math.min(currentPage * rowsPerPage, reports.length)} of ${reviewedReports.length} entries`;
        renderPaginationControlsForReports(totalPages);
    }

    function renderPaginationControlsForReports(totalPages) {
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
                currentPage = page;
                applySearchAndSort(userRole);
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

    function applySearchAndSort(userRole) {
        const filteredData = getDisplayedReportsData();
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageReports = filteredData.slice(startIndex, endIndex);
        renderReportsTable(currentPageReports, userRole);
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
=======
    // --- PDF Export Functionality (All Data) ---
    savePdfBtn.addEventListener('click', () => {
        if (filteredData.length === 0) {
            Swal.fire("Info", "No data to export to PDF!", "info");
            return;
        }

        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while the PDF is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');

        let yOffset = 20;
        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';

        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;

            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

            doc.setFontSize(18);
            doc.text("Approved Reports Log", 14, yOffset);
            yOffset += 10;
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, yOffset);
            yOffset += 15;

            const headers = [
                'No.', 'Report ID', 'Volunteer Group Name', 'Area of Operation',
                'Start Date', 'End Date', 'In-Kind Donations', 'Monetary Donations'
            ];

            const body = filteredData.map((item, index) => [
                index + 1,
                item.id || 'N/A',
                item.VolunteerGroupName || 'N/A',
                item.AreaOfOperation || 'N/A',
                item.StartDate || 'N/A',
                item.EndDate || 'N/A',
                item.TotalValueOfInKindDonations || '0',
                item.TotalMonetaryDonations || '0'
            ]);

            doc.autoTable({
                head: [headers],
                body: body,
                startY: yOffset,
                theme: 'grid',
                headStyles: {
                    fillColor: [20, 174, 187],
                    textColor: [255, 255, 255],
                    halign: 'center',
                    fontSize: 8
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 25 },
                    5: { cellWidth: 25 },
                    6: { cellWidth: 25 },
                    7: { cellWidth: 25 }
                },
                didDrawPage: function (data) {
                    doc.setFontSize(8);
                    const pageNumberText = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                    const poweredByText = "Powered by: Appvance";
                    const pageWidth = doc.internal.pageSize.width;
                    const margin = data.settings.margin.left;
                    const footerY = doc.internal.pageSize.height - 10;

                    doc.text(pageNumberText, margin, footerY);
                    doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
                }
            });

            const filename = `Approved_Reports_Log_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: `Approved Reports Log exported to "${filename}"`,
                timer: 1500,
                showConfirmButton: false
            });
        };

        logo.onerror = function() {
            Swal.close();
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    });

    function renderTable() {
        console.log('Rendering table with data:', filteredData);
        tableBody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const currentRows = filteredData.slice(start, end);

        if (currentRows.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='9'>No approved reports found on this page.</td></tr>";
            entriesInfo.textContent = "Showing 0 to 0 of 0 entries";
            console.log('No data to render in table');
            return;
        }

        currentRows.forEach((item, index) => {
            const tr = document.createElement('tr');
            const rowIndex = start + index;
            tr.innerHTML = `
                <td data-key="No">${rowIndex + 1}</td>
                <td data-key="ReportID">${item.id}</td>
                <td data-key="VolunteerGroupName">${item.VolunteerGroupName}</td>
                <td data-key="AreaOfOperation">${item.AreaOfOperation}</td>
                <td data-key="StartDate">${item.StartDate}</td>
                <td data-key="EndDate">${item.EndDate}</td>
                <td data-key="TotalValueOfInKindDonations">${item.TotalValueOfInKindDonations}</td>
                <td data-key="TotalMonetaryDonations">${item.TotalMonetaryDonations}</td>
                <td>
                    <button class="viewBtn" data-index="${data.indexOf(item)}">View</button>
                    <button class="savePDFBtn" data-index="${data.indexOf(item)}">Save PDF</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        entriesInfo.textContent = `Showing ${filteredData.length ? start + 1 : 0} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
        renderPagination();
        attachEventListeners();
    }

    function attachEventListeners() {
        document.querySelectorAll('.viewBtn').forEach(button => {
            button.addEventListener('click', function () {
                const idx = parseInt(this.dataset.index);
                const item = data[idx];
                console.log('Opening modal for report:', item);
                const modalDetails = document.getElementById('modalReportDetails');
                modalDetails.innerHTML = `
                    <p><strong>Report ID:</strong> ${item.id || 'N/A'}</p>
                    <p><strong>Volunteer Group:</strong> ${item.VolunteerGroupName || '[Unknown Org]'}</p>
                    <p><strong>Area of Operation:</strong> ${item.AreaOfOperation || 'N/A'}</p>
                    <p><strong>Start Date:</strong> ${item.StartDate || 'N/A'}</p>
                    <p><strong>End Date:</strong> ${item.EndDate || 'N/A'}</p>
                    <p><strong>Total In-Kind Donations:</strong> ${item.TotalValueOfInKindDonations || '0'}</p>
                    <p><strong>Total Monetary Donations:</strong> ${item.TotalMonetaryDonations || '0'}</p>
                    <p><strong>Status:</strong> ${item.status || 'Approved'}</p>
                    ${item.details && item.details.length > 0 ? `
                        <h3>Details</h3>
                        <table>
                            <thead><tr><th>Name</th><th>Description</th></tr></thead>
                            <tbody>${item.details.map(d => `<tr><td>${d.name || '-'}</td><td>${d.description || 'N/A'}</td></tr>`).join('')}</tbody>
                        </table>
                    ` : '<p>No details available.</p>'}
                `;
                reportModal.classList.remove('hidden');
            });
        });

        document.querySelectorAll('.savePDFBtn').forEach(button => {
            button.addEventListener('click', function () {
                const idx = parseInt(this.dataset.index);
                const itemToExport = data[idx];
                if (itemToExport) {
                    console.log('Exporting single report to PDF:', itemToExport);
                    saveSingleReportToPdf(itemToExport);
                } else {
                    Swal.fire("Error", "Could not find the report data to export.", "error");
                }
            });
        });
    }
>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d

    document.getElementById('closeModal').addEventListener('click', () => {
        reportModal.classList.add('hidden');
    });

    window.addEventListener('click', (event) => {
        if (event.target === reportModal) {
            reportModal.classList.add('hidden');
        }
    });

    function renderPagination() {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);

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
                renderTable();
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

    sortSelect.addEventListener("change", function () {
        const selectedValue = this.value;
        if (!selectedValue) return;

        const [key, order] = selectedValue.split("-");
        console.log('Sorting by:', { key, order });
        sortTableData(key, order);
    });

    function sortTableData(key, order = "asc") {
        filteredData.sort((a, b) => {
            const map = {
                No: (item, i) => i + 1,
                ReportID: item => item.id,
                VolunteerGroupName: item => item.VolunteerGroupName,
                AreaOfOperation: item => item.AreaOfOperation,
                StartDate: item => item.StartDate,
                EndDate: item => item.EndDate,
                TotalValueOfInKindDonations: item => parseFloat(item.TotalValueOfInKindDonations) || 0,
                TotalMonetaryDonations: item => parseFloat(item.TotalMonetaryDonations) || 0
            };

            const valA = typeof map[key] === "function" ? map[key](a, data.indexOf(a)) : "";
            const valB = typeof map[key] === "function" ? map[key](b, data.indexOf(b)) : "";

            const compA = isNaN(valA) ? String(valA).toLowerCase() : valA;
            const compB = isNaN(valB) ? String(valB).toLowerCase() : valB;

            if (compA < compB) return order === "asc" ? -1 : 1;
            if (compA > compB) return order === "asc" ? 1 : -1;
            return 0;
        });

        currentPage = 1;
        renderTable();
    }

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        console.log('Searching for:', searchTerm);
        filteredData = data.filter(item => {
            return Object.entries(item).some(([key, value]) => {
                if (key === 'details' && Array.isArray(value)) {
                    return value.some(d => 
                        (d.name && String(d.name).toLowerCase().includes(searchTerm)) ||
                        (d.description && String(d.description).toLowerCase().includes(searchTerm))
                    );
                }
                return String(value).toLowerCase().includes(searchTerm);
            });
        });
        currentPage = 1;
        renderTable();
    });

    // --- Excel Export Logic ---
    exportExcelBtn.addEventListener('click', () => {
        if (filteredData.length === 0) {
            Swal.fire("Info", "No data to export to Excel!", "info");
            return;
        }

        Swal.fire({
            title: 'Generating Excel...',
            text: 'Please wait while the Excel file is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        try {
<<<<<<< HEAD
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
                { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 25 },
                { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
                { wch: 40 }
=======
            const worksheetData = [];
            const headers = [
                'No.', 'Report ID', 'Volunteer Group Name', 'Area of Operation',
                'Start Date', 'End Date', 'In-Kind Donations', 'Monetary Donations'
            ];
            worksheetData.push(headers);

            filteredData.forEach((item, index) => {
                worksheetData.push([
                    index + 1,
                    item.id,
                    item.VolunteerGroupName,
                    item.AreaOfOperation,
                    item.StartDate,
                    item.EndDate,
                    item.TotalValueOfInKindDonations,
                    item.TotalMonetaryDonations
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(worksheetData);
            const wscols = [
                {wch: 5},   // No.
                {wch: 15},  // Report ID
                {wch: 30},  // Volunteer Group Name
                {wch: 30},  // Area of Operation
                {wch: 20},  // Start Date
                {wch: 20},  // End Date
                {wch: 25},  // In-Kind Donations
                {wch: 25}   // Monetary Donations
>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
            ];
            ws['!cols'] = wscols;
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Approved Reports");
<<<<<<< HEAD
            const fileName = `Approved_Reports_Log_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
=======

            XLSX.writeFile(wb, `Approved_Reports_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);

>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
            Swal.close();
            Swal.fire({
                title: 'Success!',
                text: 'Excel file generated successfully!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error generating Excel:', error);
            Swal.close();
            Swal.fire('Error!', 'Failed to generate Excel: ' + error.message, 'error');
        }
    });

    // --- Save Single Report to PDF ---
    function saveSingleReportToPdf(item) {
        Swal.fire({
            title: 'Generating PDF...',
<<<<<<< HEAD
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

    function saveIndividualReportToPdf(report) {
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while the PDF file is being created.',
=======
            text: 'Please wait while the PDF is being created.',
>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
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
            doc.text("Approved Report Details", margin, y + 8);
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
                    doc.text("Approved Report Details (Cont.)", margin, y + 8);
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
            doc.text(`Report ID: ${item.id || "-"}`, margin, y);
            y += 10;
            doc.setTextColor(0);
            addDetail("Basic Information", "", true);
<<<<<<< HEAD
            addDetail("Volunteer Group", report.VolunteerGroupName || "[Unknown Org]");
            addDetail("Location of Operation", report.AreaOfOperation || "-");
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
=======
            addDetail("Volunteer Group Name", item.VolunteerGroupName || "[Unknown Org]");
            addDetail("Area of Operation", item.AreaOfOperation || "-");
            addDetail("Start Date", item.StartDate || "-");
            addDetail("End Date", item.EndDate || "-");
            addDetail("Total In-Kind Donations", item.TotalValueOfInKindDonations || "0");
            addDetail("Total Monetary Donations", item.TotalMonetaryDonations || "0");
            addDetail("Status", item.status || "Approved");

            if (item.details && item.details.length > 0) {
                addDetail("Report Details", "", true);
                const detailsTableData = item.details.map(d => [d.name || '-', d.description || 'N/A']);
                doc.autoTable({
                    startY: y,
                    head: [['Detail Name', 'Description']],
                    body: detailsTableData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [20, 174, 187],
                        textColor: [255, 255, 255],
                        halign: 'center',
                        fontSize: 8
                    },
                    styles: {
                        fontSize: 8,
                        cellPadding: 2,
                        overflow: 'linebreak'
                    },
                    margin: { left: margin, right: margin }
                });
                y = doc.autoTable.previous.finalY + 10;
            } else {
                addDetail("Report Details", "No details specified.");
                y += 5;
            }

>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
            doc.setFontSize(8);
            const footerY = pageHeight - 10;
            const pageNumberText = `Page ${doc.internal.getNumberOfPages()}`;
            const poweredByText = "Powered by: Appvance";
            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
<<<<<<< HEAD
            doc.save(`Report_${report.ReportID || 'Details'}.pdf`);
=======

            doc.save(`Approved_Report_${item.id || 'Details'}.pdf`);

>>>>>>> 6c3e84d7b4337b3104deed1287c54c846fe7ca9d
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'PDF Generated!',
                text: `Approved Report "${item.id || 'Details'}" saved as PDF.`,
                timer: 2000,
                showConfirmButton: false
            });
        };
        logo.onerror = function() {
            Swal.close();
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    }
});