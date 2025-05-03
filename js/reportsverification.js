// Fetch submitted reports from localStorage
let submittedReports = JSON.parse(localStorage.getItem("submittedReports")) || [];

// Sort by "No." if it exists, otherwise default to index
submittedReports.sort((a, b) => (a["No."] || 0) - (b["No."] || 0));

const submittedReportsContainer = document.getElementById("submittedReportsContainer");
const paginationContainer = document.getElementById("pagination");
let currentPage = 1;
const rowsPerPage = 5; // Or any number you prefer

// Format date (e.g., "2025-05-02" -> "May 2, 2025")
function formatDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr; // return original if invalid
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

// Function to render the table for the current page
function renderReportsTable(reports) {
    submittedReportsContainer.innerHTML = '';

    if (reports.length === 0) {
        submittedReportsContainer.innerHTML = "<tr><td colspan='9'>No submitted reports found on this page.</td></tr>";
        return;
    }

    reports.forEach((report, index) => {
        const tr = document.createElement('tr');
        const displayIndex = (currentPage - 1) * rowsPerPage + index + 1; // Calculate index for the current page

        tr.innerHTML = `
            <td>${report["No."] || displayIndex}</td>
            <td>${report["Report ID"] || "-"}</td>
            <td>${report["Barangay"] || "-"}</td>
            <td>${report["City/Municipality"] || "-"}</td>
            <td>${report["Time of Intervention"] || "-"}</td>
            <td>${report["Date of Report"] || "-"}</td>
            <td>${report["Submitted by"] || "-"}</td>
            <td>Pending</td>
            <td>
              <button class="viewBtn">View</button>
              <button class="approveBtn">Approve</button>
              <button class="rejectBtn">Reject</button>
            </td>
        `;

        // View button logic (remains the same)
        const viewBtn = tr.querySelector('.viewBtn');
        viewBtn.addEventListener('click', () => {
            let readableReport = "";
            for (let key in report) {
                readableReport += `• ${key}: ${report[key]}\n`;
            }

            Swal.fire({
                title: 'Report Details',
                icon: 'info',
                html: `<pre style="text-align:left; white-space:pre-wrap">${readableReport}</pre>`,
                confirmButtonText: 'Close'
            });
        });

        // Approve action (remains the same)
        tr.querySelector('.approveBtn').addEventListener('click', () => {
            const reviewedReports = JSON.parse(localStorage.getItem("reviewedReports")) || [];
            reviewedReports.push({ ...report, status: "Approved" });
            localStorage.setItem("reviewedReports", JSON.stringify(reviewedReports));

            const reportIndex = submittedReports.findIndex(r => r["Report ID"] === report["Report ID"]); // Find the correct index
            if (reportIndex > -1) {
                submittedReports.splice(reportIndex, 1);
                localStorage.setItem("submittedReports", JSON.stringify(submittedReports));
                loadReports(); // Reload the paginated view
            }
        });

        // Reject button logic (remains the same)
        tr.querySelector('.rejectBtn').addEventListener('click', () => {
            const reportIndex = submittedReports.findIndex(r => r["Report ID"] === report["Report ID"]); // Find the correct index
            if (reportIndex > -1) {
                submittedReports.splice(reportIndex, 1);
                localStorage.setItem("submittedReports", JSON.stringify(submittedReports));
                loadReports(); // Reload the paginated view
            }
        });

        submittedReportsContainer.appendChild(tr);
    });
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
                loadReports(); // Re-load reports for the new page
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

// Load and display the reports for the current page
function loadReports() {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentPageReports = submittedReports.slice(startIndex, endIndex);

    renderReportsTable(currentPageReports);
    renderPagination(submittedReports.length);
}

// Load reports when the page loads
loadReports();

// Optional: handle "View Approved" button if exists
const viewApprovedBtn = document.getElementById("viewApprovedBtn");
if (viewApprovedBtn) {
    viewApprovedBtn.addEventListener("click", () => {
        window.location.href = "../pages/reportslog.html";
    });
}

// // Fetch submitted reports from localStorage
// let submittedReports = JSON.parse(localStorage.getItem("submittedReports")) || [];

// // Sort by "No." if it exists, otherwise default to index
// submittedReports.sort((a, b) => (a["No."] || 0) - (b["No."] || 0));

// // Get container element
// const container = document.getElementById("submittedReportsContainer");

// if (!container) {
//   console.error("submittedReportsContainer element not found!");
// } else if (submittedReports.length === 0) {
//   container.innerHTML = "<tr><td colspan='9'>No reports submitted yet.</td></tr>";
// } else {
//   submittedReports.forEach((report, index) => {
//     const row = document.createElement("tr");

//     row.innerHTML = `
//       <td>${report["No."] || index + 1}</td>
//       <td>${report["Report ID"] || "-"}</td>
//       <td>${report["Barangay"] || "-"}</td>
//       <td>${report["City/Municipality"] || "-"}</td>
//       <td>${report["Time of Intervention"] || "-"}</td>
//       <td>${report["Date of Report"] || "-"}</td>
//       <td>${report["Submitted by"] || "-"}</td>
//       <td>Pending</td>
//       <td>
//         <button class="viewBtn">View</button>
//         <button class="approveBtn">Approve</button>
//         <button class="rejectBtn">Reject</button>
//       </td>
//     `;

//     // Approve action
//     row.querySelector('.approveBtn').addEventListener('click', () => {
//       const reviewedReports = JSON.parse(localStorage.getItem("reviewedReports")) || [];
//       reviewedReports.push({ ...report, status: "Approved" });
//       localStorage.setItem("reviewedReports", JSON.stringify(reviewedReports));

//       submittedReports.splice(index, 1);
//       localStorage.setItem("submittedReports", JSON.stringify(submittedReports));
//       location.reload();
//     });

//     // Reject button logic
//     row.querySelector('.rejectBtn').addEventListener('click', () => {
//       submittedReports.splice(index, 1); // Just remove from submittedReports
//       localStorage.setItem("submittedReports", JSON.stringify(submittedReports));
//       location.reload(); // Refresh the table
//     });

//     // View button - human-readable format with SweetAlert2
//     row.querySelector('.viewBtn').addEventListener('click', () => {
//       let readableReport = "";
//       for (let key in report) {
//         readableReport += `• ${key}: ${report[key]}\n`;
//       }

//       Swal.fire({
//         title: 'Report Details',
//         icon: 'info',
//         html: `<pre style="text-align:left; white-space:pre-wrap">${readableReport}</pre>`,
//         confirmButtonText: 'Close'
//       });
//     });

//     container.appendChild(row);
//   });
// }

// // Optional: handle "View Approved" button if exists
// const viewApprovedBtn = document.getElementById("viewApprovedBtn");
// if (viewApprovedBtn) {
//   viewApprovedBtn.addEventListener("click", () => {
//     window.location.href = "../pages/reportslog.html";
//   });
// }
