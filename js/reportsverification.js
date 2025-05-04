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
    const auth = firebase.auth();
    const database = firebase.database();

    let submittedReports = [];
    const submittedReportsContainer = document.getElementById("submittedReportsContainer");
    const paginationContainer = document.getElementById("pagination");
    const entriesInfo = document.getElementById("entriesInfo");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    let currentPage = 1;
    const rowsPerPage = 5;

    // Check user authentication and role
    auth.onAuthStateChanged(user => {
        if (!user) {
            // Redirect to login if not authenticated
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access this page.',
            }).then(() => {
                window.location.href = "../pages/login.html"; // Adjust to your login page
            });
            return;
        }

        // Check user role
        database.ref(`users/${user.uid}/role`).once('value', snapshot => {
            const role = snapshot.val();
            if (role !== "AB ADMIN") {
                // Deny access if not AB ADMIN
                Swal.fire({
                    icon: 'error',
                    title: 'Access Denied',
                    text: 'You do not have permission to access this page.',
                }).then(() => {
                    window.location.href = "../pages/dashboard.html"; // Redirect to a safe page
                });
                return;
            }

            // If AB ADMIN, load reports
            loadReportsFromFirebase();
        });
    });

    // Format date
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date)) return dateStr;
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    // Fetch reports from Firebase
    function loadReportsFromFirebase() {
        database.ref("reports/submitted").on("value", snapshot => {
            submittedReports = [];
            const reports = snapshot.val();
            if (reports) {
                Object.keys(reports).forEach(key => {
                    submittedReports.push({
                        firebaseKey: key,
                        ...reports[key]
                    });
                });
            }
            applySearchAndSort();
        });
    }

    // Render the table for the current page
    function renderReportsTable(reports) {
        submittedReportsContainer.innerHTML = '';

        if (reports.length === 0) {
            submittedReportsContainer.innerHTML = "<tr><td colspan='9'>No submitted reports found on this page.</td></tr>";
            return;
        }

        reports.forEach((report, index) => {
            const tr = document.createElement('tr');
            const displayIndex = (currentPage - 1) * rowsPerPage + index + 1;

            tr.innerHTML = `
                <td>${displayIndex}</td>
                <td>${report["ReportID"] || "-"}</td>
                <td>${report["Barangay"] || "-"}</td>
                <td>${report["CityMunicipality"] || "-"}</td>
                <td>${report["TimeOfIntervention"] || "-"}</td>
                <td>${formatDate(report["DateOfReport"]) || "-"}</td>
                <td>${report["SubmittedBy"] || "-"}</td>
                <td>${report["Status"] || "Pending"}</td>
                <td>
                    <button class="viewBtn">View</button>
                    <button class="approveBtn">Approve</button>
                    <button class="rejectBtn">Reject</button>
                </td>
            `;

            // View button
            const viewBtn = tr.querySelector('.viewBtn');
            viewBtn.addEventListener('click', () => {
                let readableReport = "";
                for (let key in report) {
                    // Convert sanitized keys to readable format for display
                    let displayKey = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase());
                    displayKey = displayKey
                        .replace('CityMunicipality', 'City/Municipality')
                        .replace('TimeOfIntervention', 'Time of Intervention')
                        .replace('SubmittedBy', 'Submitted by')
                        .replace('DateOfReport', 'Date of Report')
                        .replace('ReportID', 'Report ID')
                        .replace('NoOfIndividualsOrFamilies', 'No. of Individuals or Families')
                        .replace('NoOfFoodPacks', 'No. of Food Packs')
                        .replace('NoOfHotMeals', 'No. of Hot Meals')
                        .replace('LitersOfWater', 'Liters of Water')
                        .replace('NoOfVolunteersMobilized', 'No. of Volunteers Mobilized')
                        .replace('NoOfOrganizationsActivated', 'No. of Organizations Activated')
                        .replace('TotalValueOfInKindDonations', 'Total Value of In-Kind Donations')
                        .replace('NotesAdditionalInformation', 'Notes/additional information');

                    const value = key === "DateOfReport" ? formatDate(report[key]) : report[key];
                    readableReport += `• ${displayKey}: ${value}\n`;
                }

                Swal.fire({
                    title: 'Report Details',
                    icon: 'info',
                    html: `<pre style="text-align:left; white-space:pre-wrap">${readableReport}</pre>`,
                    confirmButtonText: 'Close'
                });
            });

            // Approve action
            tr.querySelector('.approveBtn').addEventListener('click', () => {
                // Move report to approved node
                report["Status"] = "Approved";
                database.ref(`reports/approved`).push(report)
                    .then(() => {
                        // Remove from submitted node
                        database.ref(`reports/submitted/${report.firebaseKey}`).remove()
                            .then(() => {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Report Approved',
                                    text: 'The report has been approved and moved to the approved logs.',
                                });
                            });
                    })
                    .catch(error => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to approve report: ' + error.message,
                        });
                    });
            });

            // Reject action
            tr.querySelector('.rejectBtn').addEventListener('click', () => {
                // Remove from submitted node
                database.ref(`reports/submitted/${report.firebaseKey}`).remove()
                    .then(() => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Report Rejected',
                            text: 'The report has been rejected and removed.',
                        });
                    })
                    .catch(error => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to reject report: ' + error.message,
                        });
                    });
            });

            submittedReportsContainer.appendChild(tr);
        });

        entriesInfo.textContent = `Showing ${(currentPage - 1) * rowsPerPage + 1} to ${Math.min(currentPage * rowsPerPage, reports.length)} of ${submittedReports.length} entries`;
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

    // Search and sort functionality
    function applySearchAndSort() {
        let filteredReports = [...submittedReports];
        const query = searchInput.value.trim().toLowerCase();
        const sortBy = sortSelect.value;

        // Search
        if (query) {
            filteredReports = filteredReports.filter(report =>
                Object.values(report).some(val =>
                    typeof val === 'string' && val.toLowerCase().includes(query)
                )
            );
        }

        // Sort
        if (sortBy) {
            filteredReports.sort((a, b) => {
                const valA = a[sortBy] || "";
                const valB = b[sortBy] || "";
                return valA.toString().localeCompare(valB.toString());
            });
        }

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageReports = filteredReports.slice(startIndex, endIndex);

        renderReportsTable(currentPageReports);
        renderPagination(filteredReports.length);
    }

    // Event listeners for search and sort
    searchInput.addEventListener('input', applySearchAndSort);
    sortSelect.addEventListener('change', applySearchAndSort);

    // Clear search input
    window.clearDInputs = () => {
        searchInput.value = '';
        applySearchAndSort();
    };

    // View Approved Reports button
    const viewApprovedBtn = document.getElementById("viewApprovedBtn");
    if (viewApprovedBtn) {
        viewApprovedBtn.addEventListener("click", () => {
            window.location.href = "../pages/reportslog.html";
        });
    }
});