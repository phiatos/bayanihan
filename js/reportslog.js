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

    const reportsBody = document.getElementById("reportsBody");
    const paginationContainer = document.getElementById("pagination");
    const entriesInfo = document.getElementById("entriesInfo");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    let reviewedReports = [];
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

    // Fetch approved reports from Firebase
    function loadReportsFromFirebase() {
        database.ref("reports/approved").on("value", snapshot => {
            reviewedReports = [];
            const reports = snapshot.val();
            if (reports) {
                Object.keys(reports).forEach(key => {
                    reviewedReports.push({
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
        reportsBody.innerHTML = '';

        if (reports.length === 0) {
            reportsBody.innerHTML = "<tr><td colspan='9'>No approved reports found on this page.</td></tr>";
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
                <td>${formatDate(report["DateOfReport"]) || "-"}</td>
                <td>${report["SubmittedBy"] || "-"}</td>
                <td>${report["NoOfHotMeals"] || "-"}</td>
                <td>${report["LitersOfWater"] || "-"}</td>
                <td><button class="viewBtn">View</button></td>
            `;

            // View button logic
            const viewBtn = tr.querySelector('.viewBtn');
            viewBtn.addEventListener('click', () => {
                let readableReport = "";
                for (let key in report) {
                    // Skip the firebaseKey field
                    if (key === "firebaseKey") continue;

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

                const modal = document.getElementById("reportModal");
                const modalDetails = document.getElementById("modalReportDetails");
                const closeModal = document.querySelector(".close-button");

                modalDetails.innerHTML = `
                  
                <div class="report-section">
                  <div>
                  <h2>Basic Information</h2>
                      <p><strong>Reporty ID:</strong> ${report.ReportID || "-"}</p>
                      <p><strong>Volunteer Group:</strong> ${report.volunteerGroup || "For Now ABVN"}</p>
                      <p><strong>Location of Operation:</strong> ${report.Barangay|| "-"}, ${report.CityMunicipality || "-"}</p>
                      <p><strong>Submitted By:</strong> ${report.SubmittedBy || "-"}</p>
                      <p><strong>Date of Report Submitted:</strong> ${formatDate(report.DateOfReport) || "-"}</p>
                  </div>
                  <div>
                  <h2>Relief Operations</h2>
                    <p><strong>Date of Relief Operation:</strong> ${formatDate(report.Date) || "-"}</p>
                    <p><strong>No. of Individuals or Families:</strong> ${report.NoOfIndividualsOrFamilies || "-"}</p>
                    <p><strong>No. of Food Packs:</strong> ${report.NoOfFoodPacks || "-"}</p>
                    <p><strong>No. of Hot Meals/Ready-to-eat food:</strong> ${report.NoOfHotMeals || "-"}</p>
                    <p><strong>Liters of Water:</strong> ${report.LitersOfWater || "-"}</p>
                    <p><strong>No. of Volunteers Mobilized:</strong> ${report.NoOfVolunteersMobilized || "-"}</p>
                    <p><strong>No. of Organizations Activated:</strong> ${report.NoOfOrganizationsActivated || "-"}</p>
                    <p><strong>Total Value of In-Kind Donations:</strong> ${report.TotalValueOfInKindDonations || "-"}</p>
                  </div>
                   <div>
                  <h2>Additional Updates</h2>
                    <p><strong>Notes/Additional Information:</strong> ${formatDate(report.NotesAdditionalInformation) || "-"}</p>
                  </div>
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

    // Search and sort functionality
    function applySearchAndSort() {
        let filteredReports = [...reviewedReports];
        const query = searchInput.value.trim().toLowerCase();
        const sortValue = sortSelect.value;
        
        // Search - corrected version
        if (query) {
            filteredReports = filteredReports.filter(report =>
                Object.values(report).some(val =>
                    val && typeof val === 'string' && val.toLowerCase().includes(query)
                )
            );
        }
    
        // Sort
        if (sortValue) {
            const [sortField, direction] = sortValue.split('-');
            
            filteredReports.sort((a, b) => {
                let valA = a[sortField] || "";
                let valB = b[sortField] || "";
    
                // Handle Date sorting
                if (sortField === "DateOfReport" || sortField === "Date") {
                    const dateA = new Date(valA);
                    const dateB = new Date(valB);
                    
                    if (isNaN(dateA)) return direction === "asc" ? 1 : -1;
                    if (isNaN(dateB)) return direction === "asc" ? -1 : 1;
                    
                    return direction === "asc" ? dateA - dateB : dateB - dateA;
                }
    
                // Handle numeric fields
                if (sortField.includes("NoOf") || sortField.includes("Liters")) {
                    valA = isNaN(Number(valA)) ? 0 : Number(valA);
                    valB = isNaN(Number(valB)) ? 0 : Number(valB);
                    return direction === "asc" ? valA - valB : valB - valA;
                }
    
                // Default string comparison
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
                return direction === "asc" 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            });
        }
    
        // Pagination
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
});