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
    const submittedReportsContainer = document.getElementById("submittedReportsContainer");
    const paginationContainer = document.getElementById("pagination");
    const entriesInfo = document.getElementById("entriesInfo");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    let currentPage = 1;
    const rowsPerPage = 5;

    if (!submittedReportsContainer || !paginationContainer || !entriesInfo || !searchInput || !sortSelect) {
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
        database.ref("reports/submitted").on("value", snapshot => {
            submittedReports = [];
            const reports = snapshot.val();
            if (reports) {
                Object.keys(reports).forEach(key => {
                    const report = reports[key];
                    if (!report.VolunteerGroupName) {
                        console.warn(`Report ${key} is missing VolunteerGroupName field. Will fetch dynamically on approval.`);
                    }
                    submittedReports.push({
                        firebaseKey: key,
                        ...report
                    });
                });
            } else {
                console.log("No submitted reports found in Firebase");
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

    function renderReportsTable(reports) {
        submittedReportsContainer.innerHTML = '';

        if (reports.length === 0) {
            submittedReportsContainer.innerHTML = "<tr><td colspan='9'>No submitted reports found on this page.</td></tr>";
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
                <td>${formatTime(report["TimeOfIntervention"])}</td>
                <td>${formatDate(report["DateOfReport"])}</td>
                
                <td>${report["Status"] || "Pending"}</td>
                <td>
                    <button class="viewBtn">View</button>
                    <button class="approveBtn">Approve</button>
                    <button class="rejectBtn">Reject</button>
                </td>
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
                        .replace('SubmittedByInput', 'Submitted by')
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
                        .replace('TotalMonetaryDonations', 'Total Monetary Donations')
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
                            <p><strong>Submitted By:</strong> ${report.SubmittedBy || "-"}</p>
                            <p><strong>Date of Report Submitted:</strong> ${formatDate(report.DateOfReport)}</p>
                            <p class="cell"><strong>Location of Operation:</strong> ${report.AreaOfOperation || "-"}</p>
                            <p class="cell"><strong>Completion Time of Intervention:</strong> ${report.TimeOfIntervention || "-"}</p>
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

                // Fetch VolunteerGroupName from users/${userUid}/group
                database.ref(`users/${userUid}`).once('value')
                    .then(snapshot => {
                        const userData = snapshot.val();
                        let volunteerGroupName = "[Unknown Org]";
                        if (userData && userData.group) {
                            volunteerGroupName = userData.group;
                            console.log(`Fetched VolunteerGroupName for user ${userUid}: ${volunteerGroupName}`);
                        } else {
                            console.warn(`No group found for user ${userUid}. Using default: [Unknown Org]`);
                        }

                        // Update the report with the correct VolunteerGroupName
                        report["VolunteerGroupName"] = volunteerGroupName;
                        report["Status"] = "Approved";

                        // Save to approved reports and user's reports, then remove from submitted
                        return Promise.all([
                            database.ref(`reports/approved`).push(report),
                            database.ref(`users/${userUid}/reports/${report.firebaseKey}`).set({ ...report, Status: "Approved" }),
                            database.ref(`reports/submitted/${report.firebaseKey}`).remove()
                        ]);
                    })
                    .then(() => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Report Approved',
                            text: 'The report has been approved and moved to the approved logs.',
                        });
                    })
                    .catch(error => {
                        console.error("Error during report approval:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to approve report: ' + error.message,
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

                Promise.all([
                    database.ref(`reports/submitted/${report.firebaseKey}`).remove(),
                    database.ref(`users/${userUid}/reports/${report.firebaseKey}`).remove()
                ])
                    .then(() => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Report Rejected',
                            text: 'The report has been rejected and removed.',
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

    function applySearchAndSort() {
        const searchQuery = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;
        const [sortBy, direction] = sortValue.split("-");

        let filteredReports = submittedReports.filter(report => {
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

    const viewApprovedBtn = document.getElementById("viewApprovedBtn");
    if (viewApprovedBtn) {
        viewApprovedBtn.addEventListener("click", () => {
            window.location.href = "../pages/reportslog.html";
        });
    }
});
