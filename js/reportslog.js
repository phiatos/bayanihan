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
        console.log('Firebase initialized successfully');
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
        Swal.fire({
            icon: 'error',
            title: 'Page Error',
            text: 'Required elements are missing on the page. Check console for details and contact support.',
        });
        return;
    } else {
        console.log('All DOM elements found:', domElements);
    }

    let data = [];
    let filteredData = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    // Check authentication state
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
                    const report = reports[key];
                    console.log('Processing report:', { key, status: report.status, VolunteerGroupName: report.VolunteerGroupName, submittedBy: report.submittedBy, userUid: user.uid });
                    // Check if status is approved (default to "Approved" if undefined)
                    const isApproved = report.status === "Approved" || report.status === undefined;
                    // For ABVN users, filter by their UID or organization
                    if (userRole === "ABVN" && !isApproved) {
                        console.log('Skipping report:', key, 'Reason: Status is not Approved');
                        return;
                    }
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
                });
                console.log('Data fetched successfully:', data);
            } else {
                console.log('No data found in reports/approved');
            }
            filteredData = [...data];
            renderTable();
        }, (error) => {
            console.error('Error fetching data from Firebase:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load reports: ' + error.message,
            });
        });
    }

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
            ];
            ws['!cols'] = wscols;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Approved Reports");

            XLSX.writeFile(wb, `Approved_Reports_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);

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
            text: 'Please wait while the PDF is being created.',
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

            doc.setFontSize(8);
            const footerY = pageHeight - 10;
            const pageNumberText = `Page ${doc.internal.getNumberOfPages()}`;
            const poweredByText = "Powered by: Appvance";

            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

            doc.save(`Approved_Report_${item.id || 'Details'}.pdf`);

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