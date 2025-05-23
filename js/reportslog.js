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
    const savePdfBtn = document.getElementById('savePdfBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn'); 

    let currentPage = 1;
    const rowsPerPage = 5;

    if (!reportsBody || !paginationContainer || !entriesInfo || !searchInput || !sortSelect || !savePdfBtn || !exportExcelBtn) {
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

    // --- PDF Generation ---
    savePdfBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while the PDF is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const doc = new window.jspdf.jsPDF('l', 'mm', 'a4');

        const headers = [
            'No.', 'Report ID', 'Volunteer Group Name', 'Area of Operation',
            'Operation Start Date', 'Operation End Date', 'No. of Hot Meals',
            'Liters of Water', 'Submitted by', 'Report Submission Date',
            'Completion Time of Intervention', 'No. of Individuals/Families',
            'No. of Food Packs', 'No. of Volunteers Mobilized',
            'No. of Organizations Activated', 'Total In-Kind Donations',
            'Total Monetary Donations', 'Notes/Additional Info'
        ];

        const dataToExport = getDisplayedReportsData(); 

        if (dataToExport.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'No Data to Export',
                text: 'There are no reports matching your current search/sort criteria to export to PDF.',
            });
            return;
        }

        const body = dataToExport.map((item, index) => {
            return [
                index + 1,
                item.ReportID || '-',
                item.VolunteerGroupName || '[Unknown Org]',
                item.AreaOfOperation || '-',
                formatDate(item.StartDate) || '-',
                formatDate(item.EndDate) || '-',
                item.NoOfHotMeals || '-',
                item.LitersOfWater || '-',
                item.SubmittedBy || '-',
                formatDate(item.DateOfReport) || '-',
                formatTime(item.TimeOfIntervention) || '-',
                item.NoOfIndividualsOrFamilies || '-',
                item.NoOfFoodPacks || '-',
                item.NoOfVolunteersMobilized || '-',
                item.NoOfOrganizationsActivated || '-',
                item.TotalValueOfInKindDonations || '-',
                item.TotalMonetaryDonations || '-',
                item.NotesAdditionalInformation || '-'
            ];
        });

        // Add the main header ONLY ONCE before autoTable
        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.text('Approved Reports Log', 14, 15); 

        doc.autoTable({
            head: [headers],
            body: body,
            startY: 20,
            theme: 'striped',
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 8
            },
            styles: {
                fontSize: 7,
                cellPadding: 1,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 10 },  
                1: { cellWidth: 18 }, 
                2: { cellWidth: 28 },  
                3: { cellWidth: 25 },
                4: { cellWidth: 20 },
                5: { cellWidth: 20 },
                6: { cellWidth: 15 },
                7: { cellWidth: 15 },
                8: { cellWidth: 25 },
                9: { cellWidth: 20 },
                10: { cellWidth: 20 },
                11: { cellWidth: 20 },
                12: { cellWidth: 15 },
                13: { cellWidth: 20 },
                14: { cellWidth: 20 },
                15: { cellWidth: 20 },
                16: { cellWidth: 20 },
                17: { cellWidth: 25 }
            },
            didDrawPage: function (data) {
                // Footer
                var str = "Page " + doc.internal.getNumberOfPages();
                doc.setFontSize(10);
                doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });

        doc.save(`Approved_Reports_Log_${new Date().toISOString().slice(0,10)}.pdf`);
        Swal.close(); 

        Swal.fire({
            title: 'Success!',
            text: 'PDF generated successfully!',
            icon: 'success',
            timer: 1500, 
            showConfirmButton: false
        });
    });

    // --- Excel Export Logic ---
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
                "NoOfHotMeals": "No. of Hot Meals",
                "LitersOfWater": "Liters of Water",
                "SubmittedBy": "Submitted by",
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

            // Prepare data for export, mapping keys to friendly headers
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

            // Create a worksheet
            const ws = XLSX.utils.json_to_sheet(wsData);

            // Optional: Set column widths for better display in Excel
            const wscols = [
                {wch: 15},  // Report ID
                {wch: 30},  // Volunteer Group Name
                {wch: 25},  // Area of Operation
                {wch: 20},  // Operation Start Date
                {wch: 20},  // Operation End Date
                {wch: 18},  // No. of Hot Meals
                {wch: 18},  // Liters of Water
                {wch: 25},  // Submitted by
                {wch: 20},  // Report Submission Date
                {wch: 25},  // Completion Time of Intervention
                {wch: 25},  // No. of Individuals or Families
                {wch: 20},  // No. of Food Packs
                {wch: 25},  // No. of Volunteers Mobilized
                {wch: 25},  // No. of Organizations Activated
                {wch: 25},  // Total Value of In-Kind Donations
                {wch: 25},  // Total Monetary Donations
                {wch: 40}   // Notes/Additional Information
            ];
            ws['!cols'] = wscols;

            // Create a workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Approved Reports");

            // Write and download the file
            const fileName = `Approved_Reports_Log_${new Date().toISOString().slice(0,10)}.xlsx`;
            XLSX.writeFile(wb, fileName);

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
                            <p><strong>Completion time of intervention:</strong> ${formatDate(report.TimeOfIntervention)}</p>
                        </div>
                        <div class="form-2">
                            <h2>Relief Operations</h2>
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