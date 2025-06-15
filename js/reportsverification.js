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
    }

    function loadReportsFromFirebase() {
        database.ref("reports/submitted").on("value", snapshot => {
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
                    submittedReports.push(transformedReport);
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

    function renderReportsTable(reports, filteredReports) {
        submittedReportsContainer.innerHTML = '';
        const totalEntries = filteredReports.length; // Use filteredReports for total entries
        const totalPages = Math.ceil(totalEntries / rowsPerPage);

        if (reports.length === 0) {
            submittedReportsContainer.innerHTML = "<tr><td colspan='9'>No approved reports found on this page.</td></tr>";
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

                database.ref(`users/${userUid}`).once('value')
                    .then(snapshot => {
                        const userData = snapshot.val();
                        let volunteerGroupName = "[Unknown Org]";
                        if (userData && userData.organization) {
                            volunteerGroupName = userData.organization;
                            console.log(`Workspaceed VolunteerGroupName for user ${userUid}: ${volunteerGroupName}`);
                        } else {
                            console.warn(`No group found for user ${userUid}. Using default: [Unknown Org]`);
                        }

                        report["VolunteerGroupName"] = volunteerGroupName;
                        report["Status"] = "Approved";

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
                        console.error("Error during report approval:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Approval Failed',
                            text: `Failed to approve report: ${error.message}`,
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

                Promise.all([
                    database.ref(`reports/submitted/${report.firebaseKey}`).remove(),
                    database.ref(`users/${userUid}/reports/${report.firebaseKey}`).remove()
                ])
                    .then(() => {
                        Swal.fire({
                            icon: 'info',
                            title: 'Report Rejected',
                            text: 'The report has been rejected and removed.',
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
            });

            submittedReportsContainer.appendChild(tr);
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