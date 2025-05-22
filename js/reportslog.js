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

    let reviewedReports = [];
    const reportsBody = document.getElementById("reportsBody");
    const paginationContainer = document.getElementById("pagination");
    const entriesInfo = document.getElementById("entriesInfo");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const exportExcelBtn = document.getElementById("exportExcelBtn");
    let currentPage = 1;
    const rowsPerPage = 5;

    if (!reportsBody || !paginationContainer || !entriesInfo || !searchInput || !sortSelect || !exportExcelBtn) {
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
                text: 'Please sign in to view the reports log.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }

        loadReportsFromFirebase();
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
        const date = new Date(`1970-01-01T${timeStr}`);
        if (isNaN(date)) return timeStr;
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    }

    function loadReportsFromFirebase() {
        database.ref("reports/approved").on("value", snapshot => {
            reviewedReports = [];
            const reports = snapshot.val();
            if (reports) {
                Object.keys(reports).forEach(key => {
                    const report = reports[key];
                    // Log if VolunteerGroupName is missing
                    if (!report.VolunteerGroupName) {
                        console.warn(`Approved report ${key} is missing VolunteerGroupName. Report data:`, report);
                        report.VolunteerGroupName = "[Unknown Org]";
                    }
                    reviewedReports.push({
                        firebaseKey: key,
                        ...report
                    });
                });
            } else {
                console.log("No approved reports found in Firebase");
            }
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

    // This function will get the currently displayed data
    function getDisplayedReportsData() {
        const searchQuery = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;
        const [sortBy, direction] = sortValue.split("-");

        let filteredReports = reviewedReports.filter(report => {
            return Object.entries(report).some(([key, value]) => {
                if (key === "DateOfReport") {
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

                if (sortBy.includes("Date")) { // Handle all date fields like StartDate, EndDate, DateOfReport
                    const dateA = new Date(valA);
                    const dateB = new Date(valB);
                    if (isNaN(dateA) || isNaN(dateB)) return 0;
                    return direction === "asc" ? dateA - dateB : dateB - dateA;
                }
                
                // Handle numeric sorting for 'NoOfHotMeals' and 'LitersOfWater'
                if (sortBy === "NoOfHotMeals" || sortBy === "LitersOfWater") {
                    const numA = parseFloat(valA);
                    const numB = parseFloat(valB);
                    if (isNaN(numA) || isNaN(numB)) return 0; // Treat non-numeric as equal for sorting
                    return direction === "asc" ? numA - numB : numB - numA;
                }

                return direction === "asc"
                    ? valA.toString().localeCompare(valB.toString())
                    : valB.toString().localeCompare(valA.toString());
            });
        }
        return filteredReports;
    }

    // Function to handle Excel export
    function exportReportsToExcel() {
        const dataToExport = getDisplayedReportsData(); // Get all filtered and sorted data
        
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
            "SubmittedBy": "Submitted by",
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

        // Prepare data for export
        const wsData = dataToExport.map(report => {
            const row = {};
            for (const key in headerMap) {
                let value = report[key];
                if (key.includes("Date") && value) {
                    value = formatDate(value); // Format dates for Excel
                } else if (key.includes("Time") && value) {
                    value = formatTime(value); // Format times for Excel
                }
                row[headerMap[key]] = value || "-"; // Use mapped header and fallback to "-"
            }
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reports Log");

        const fileName = `Reports_Log_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, fileName);

        Swal.fire({
            icon: 'success',
            title: 'Export Successful',
            text: `Reports exported to ${fileName}`,
        });
    }
    
    function renderReportsTable(reports) {
        reportsBody.innerHTML = '';

        if (reports.length === 0) {
            reportsBody.innerHTML = "<tr><td colspan='9'>No approved reports found on this page.</td></tr>";
            entriesInfo.textContent = "Showing 0 to 0 of 0 entries";
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
                <td>${report["NoOfHotMeals"] || "-"}</td>
                <td>${report["LitersOfWater"] || "-"}</td>
                <td><button class="viewBtn">View</button></td>
            `;

            const viewBtn = tr.querySelector('.viewBtn');
            viewBtn.addEventListener('click', () => {
                let readableReport = "";
                for (let key in report) {
                    if (key === "firebaseKey" || key === "userUid") continue;

                    let displayKey = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase());
                    displayKey = displayKey
                        .replace('AreaOfOperation', 'Area of Operation')
                        .replace('TimeOfIntervention', 'Time of Intervention')
                        .replace('SubmittedBy', 'Submitted by')
                        .replace('DateOfReport', 'Date of Report')
                        .replace('ReportID', 'Report ID')
                        .replace('StartDate', 'StartDate')
                        .replace('EndDate', 'EndDate')
                        .replace('NoOfIndividualsOrFamilies', 'No. of Individuals or Families')
                        .replace('NoOfFoodPacks', 'No. of Food Packs')
                        .replace('NoOfHotMeals', 'No. of Hot Meals')
                        .replace('LitersOfWater', 'Liters of Water')
                        .replace('NoOfVolunteersMobilized', 'No. of Volunteers Mobilized')
                        .replace('NoOfOrganizationsActivated', 'No. of Organizations Activated')
                        .replace('TotalValueOfInKindDonations', 'Total Value of In-Kind Donations')
                        .replace('NotesAdditionalInformation', 'Notes/additional information')
                        .replace('VolunteerGroupName', 'Volunteer Group');

                    const value = key === "DateOfReport" ? formatDate(report[key]) : report[key];
                    readableReport += `• ${displayKey}: ${value}\n`;
                }

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
                            <p><strong>Submitted By:</strong> ${report.SubmittedBy || "-"}</p>
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

                window.addEventListener("click", function (event) {
                    if (event.target === modal) {
                        modal.classList.add("hidden");
                    }
                });
            });

            reportsBody.appendChild(tr);
        });

        entriesInfo.textContent = `Showing ${(currentPage - 1) * rowsPerPage + 1} to ${Math.min(currentPage * rowsPerPage, reports.length)} of ${reviewedReports.length} entries`;
    }

    function renderPagination(totalRows) {
        paginationContainer.innerHTML = "";
        const totalPages = Math.ceil(totalRows / rowsPerPage);

        const createButton = (label, page = null, disabled = false, active = false) => {
            const btn = document.createElement("button");
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (active) btn.classList.add("active-page");
            if (page !== null) {
                btn.addEventListener("click", () => {
                    currentPage = page;
                    applySearchAndSort();
                });
            }
            return btn;
        };

        paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

        for (let i = 1; i <= totalPages; i++) {
            paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
        }

        paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
    }

    function applySearchAndSort() {
        const searchQuery = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;
        const [sortBy, direction] = sortValue.split("-");

        let filteredReports = reviewedReports.filter(report => {
            return Object.entries(report).some(([key, value]) => {
                if (key === "DateOfReport") {
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

                if (sortBy === "DateOfReport") {
                    const dateA = new Date(valA);
                    const dateB = new Date(valB);
                    if (isNaN(dateA) || isNaN(dateB)) return 0;
                    return direction === "asc" ? dateA - dateB : dateB - dateA;
                }

                return direction === "asc"
                    ? valA.toString().localeCompare(valB.toString())
                    : valB.toString().localeCompare(valA.toString());
            });
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageReports = filteredReports.slice(startIndex, endIndex);

        renderReportsTable(currentPageReports);
        renderPagination(filteredReports.length);
    }

    searchInput.addEventListener('input', applySearchAndSort);
    sortSelect.addEventListener('change', applySearchAndSort);

    window.clearDInputs = () => {
        searchInput.value = '';
        applySearchAndSort();
    };
});