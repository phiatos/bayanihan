let reviewedReports = JSON.parse(localStorage.getItem("reviewedReports")) || [];
const reportsBody = document.getElementById("reportsBody");
const paginationContainer = document.getElementById("pagination");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

let currentPage = 1;
const rowsPerPage = 5;

// Format date (e.g., "2025-05-02" -> "May 2, 2025")
function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// Filter and sort reports
function getFilteredAndSortedReports() {
  const keyword = searchInput.value.trim().toLowerCase();
  const sortValue = sortSelect.value;

  let [sortBy, sortDirection] = sortValue.split("-");

  let filtered = reviewedReports.filter(report => {
    return Object.values(report).some(val =>
      (val + "").toLowerCase().includes(keyword)
    );
  });

  if (sortBy) {
    filtered.sort((a, b) => {
      const valA = a[sortBy] ?? "";
      const valB = b[sortBy] ?? "";

      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      const isNumeric = !isNaN(numA) && !isNaN(numB);

      if (isNumeric) {
        return sortDirection === "asc" ? numA - numB : numB - numA;
      } else {
        const strA = valA.toString().toLowerCase();
        const strB = valB.toString().toLowerCase();
        if (strA < strB) return sortDirection === "asc" ? -1 : 1;
        if (strA > strB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      }
    });
  }

  return filtered;
}

// Render table
function renderReportsTable(reports) {
  reportsBody.innerHTML = '';

  if (reports.length === 0) {
    reportsBody.innerHTML = "<tr><td colspan='10'>No approved reports found on this page.</td></tr>";
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
      <td>${formatDate(report["Date of Report"]) || "-"}</td>
      <td>${report["Submitted by"] || "-"}</td>
      <td>${report["No. of Hot Meals"] || "-"}</td>
      <td>${report["Liters of Water"] || "-"}</td>
      <td><button class="viewBtn">View</button></td>
    `;

    const viewBtn = tr.querySelector('.viewBtn');
    viewBtn.addEventListener('click', () => {
      let readableReport = "";
      for (let key in report) {
        const value = key === "Date of Report" ? formatDate(report[key]) : report[key];
        readableReport += `• ${key}: ${value}\n`;
      }

      Swal.fire({
        title: 'Approved Report Details',
        icon: 'info',
        html: `<pre style="text-align:left; white-space:pre-wrap">${readableReport}</pre>`,
        confirmButtonText: 'Close'
      });
    });

    reportsBody.appendChild(tr);
  });
}

// Pagination
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

// Load and display
function loadReports() {
  const filtered = getFilteredAndSortedReports();
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentPageReports = filtered.slice(startIndex, endIndex);

  renderReportsTable(currentPageReports);
  renderPagination(filtered.length);

  // Update entries info
  const entriesInfo = document.getElementById("entriesInfo");
  const showingStart = filtered.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(endIndex, filtered.length);
  entriesInfo.textContent = `Showing ${showingStart} to ${showingEnd} of ${filtered.length} entries`;
}

// Event Listeners
searchInput.addEventListener("input", () => {
  currentPage = 1;
  loadReports();
});

sortSelect.addEventListener("change", () => {
  currentPage = 1;
  loadReports();
});

// Clear search input
window.clearDInputs = function () {
  searchInput.value = "";
  currentPage = 1;
  loadReports();
};

// Initial load
document.addEventListener("DOMContentLoaded", () => {
  loadReports();
});
