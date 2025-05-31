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

    function transformReportData(report) {
        return {
            firebaseKey: report.firebaseKey,
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

    function loadReportsFromFirebase() {
        database.ref("reports/approved").on("value", snapshot => {
            reviewedReports = [];
            const reports = snapshot.val();
            if (reports) {
                Object.keys(reports).forEach(key => {
                    const report = reports[key];
                    if (!report.VolunteerGroupName && !report.organization) {
                        console.warn(`Approved report ${key} is missing VolunteerGroupName/organization. Report data:`, report);
                        report.VolunteerGroupName = "[Unknown Org]";
                    }
                    const transformedReport = transformReportData({
                        firebaseKey: key,
                        ...report
                    });
                    reviewedReports.push(transformedReport);
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

    function getDisplayedReportsData() {
        const searchQuery = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;
        const [sortBy, direction] = sortValue.split("-");

        let filteredReports = reviewedReports.filter(report => {
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

                return direction === "asc"
                    ? valA.toString().localeCompare(valB.toString())
                    : valB.toString().localeCompare(valA.toString());
            });
        }
        return filteredReports;
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
                <td>${report["TotalValueOfInKindDonations"] || "-"}</td>
                <td>${report["TotalMonetaryDonations"] || "-"}</td>
                <td>
                    <button class="viewBtn">View</button>
                    <button class="savePDFBtn">Save PDF</button>
                </td>
            `;

            const savePDFBtn = tr.querySelector(".savePDFBtn");
            savePDFBtn.addEventListener("click", () => saveIndividualReportToPdf(report));

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
                        .replace('DateOfReport', 'Date of Report')
                        .replace('ReportID', 'Report ID')
                        .replace('StartDate', 'Start Date') 
                        .replace('EndDate', 'End Date')    
                        .replace('NoOfIndividualsOrFamilies', 'No. of Individuals or Families')
                        .replace('NoOfFoodPacks', 'No. of Food Packs')
                        .replace('NoOfHotMeals', 'No. of Hot Meals')
                        .replace('LitersOfWater', 'Liters of Water')
                        .replace('NoOfVolunteersMobilized', 'No. of Volunteers Mobilized')
                        .replace('NoOfOrganizationsActivated', 'No. of Organizations Activated')
                        .replace('TotalValueOfInKindDonations', 'Total Value of In-Kind Donations')
                        .replace('NotesAdditionalInformation', 'Notes/additional information')
                        .replace('VolunteerGroupName', 'Volunteer Group');

                    const value = key.includes("Date") ? formatDate(report[key]) : report[key];
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
                {wch: 15},
                {wch: 30},
                {wch: 25},
                {wch: 20},
                {wch: 20},
                {wch: 18},
                {wch: 18},
                {wch: 20},
                {wch: 25},
                {wch: 25},
                {wch: 20},
                {wch: 25},
                {wch: 25},
                {wch: 25},
                {wch: 25},
                {wch: 40}
            ];
            ws['!cols'] = wscols;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Approved Reports");

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
                timer: 2000,
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
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    }
});