// Fetch submitted reports from localStorage
let submittedReports = JSON.parse(localStorage.getItem("submittedReports")) || [];

// Sort initially by "No." if available
submittedReports.sort((a, b) => (a["No."] || 0) - (b["No."] || 0));

const submittedReportsContainer = document.getElementById("submittedReportsContainer");
const paginationContainer = document.getElementById("pagination");
let currentPage = 1;
const rowsPerPage = 5;

// Format date to readable string
function formatDate(dateStr) {
    const date = new Date(dateStr);
    console.log("Parsing date:", dateStr, "→", date);
    if (isNaN(date)) return dateStr; // return raw string if invalid
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

// Render current page of reports
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
            <td>${report["No."] || displayIndex}</td>
            <td>${report["Report ID"] || "-"}</td>
            <td>${report["Barangay"] || "-"}</td>
            <td>${report["City/Municipality"] || "-"}</td>
            <td>${report["Time of Intervention"] || "-"}</td>
            <td>${report["Date of Report"] ? formatDate(report["Date of Report"]) : "-"}</td>
            <td>${report["Submitted by"] || "-"}</td>
            <td>Pending</td>
            <td>
              <button class="viewBtn">View</button>
              <button class="approveBtn">Approve</button>
              <button class="rejectBtn">Reject</button>
            </td>
        `;

        // View details
        tr.querySelector('.viewBtn').addEventListener('click', () => {
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

        // Approve report
        tr.querySelector('.approveBtn').addEventListener('click', () => {
            const reviewedReports = JSON.parse(localStorage.getItem("reviewedReports")) || [];
            reviewedReports.push({ ...report, status: "Approved" });
            localStorage.setItem("reviewedReports", JSON.stringify(reviewedReports));

            const reportIndex = submittedReports.findIndex(r => r["Report ID"] === report["Report ID"]);
            if (reportIndex > -1) {
                submittedReports.splice(reportIndex, 1);
                localStorage.setItem("submittedReports", JSON.stringify(submittedReports));
                loadReports();
            }
        });

        // Reject report
        tr.querySelector('.rejectBtn').addEventListener('click', () => {
            const reportIndex = submittedReports.findIndex(r => r["Report ID"] === report["Report ID"]);
            if (reportIndex > -1) {
                submittedReports.splice(reportIndex, 1);
                localStorage.setItem("submittedReports", JSON.stringify(submittedReports));
                loadReports();
            }
        });

        submittedReportsContainer.appendChild(tr);
    });
}

// Create pagination buttons
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
                loadReports();
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

// Load reports with filtering and sorting
function loadReports() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const sortValue = document.getElementById('sortSelect').value;
    const [sortBy, direction] = sortValue.split("-");

    let filteredReports = submittedReports.filter(report => {
        return Object.values(report).some(value =>
            value.toString().toLowerCase().includes(searchQuery)
        );
    });

    if (sortBy) {
        filteredReports.sort((a, b) => {
            const valA = a[sortBy] || "";
            const valB = b[sortBy] || "";

            // Handle Date sorting specifically
            if (sortBy === "Date of Report") {
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

// Attach listeners for search and sort
document.getElementById('searchInput').addEventListener('input', () => {
    currentPage = 1;
    loadReports();
});

document.getElementById('sortSelect').addEventListener('change', () => {
    currentPage = 1;
    loadReports();
});

// Initialize table
loadReports();

// Optional button to view approved reports
const viewApprovedBtn = document.getElementById("viewApprovedBtn");
if (viewApprovedBtn) {
    viewApprovedBtn.addEventListener("click", () => {
        window.location.href = "../pages/reportslog.html";
    });
}
