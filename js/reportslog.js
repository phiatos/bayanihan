// Retrieve the reviewed reports from localStorage
const reviewedReports = JSON.parse(localStorage.getItem("reviewedReports")) || [];
const reportsBody = document.getElementById("reportsBody");
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
  reportsBody.innerHTML = '';

  if (reports.length === 0) {
      reportsBody.innerHTML = "<tr><td colspan='10'>No approved reports found on this page.</td></tr>";
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
          <td>${formatDate(report["Date of Report"]) || "-"}</td>
          <td>${report["Submitted by"] || "-"}</td>
          <td>${report["No. of Hot Meals"] || "-"}</td>
          <td>${report["Liters of Water"] || "-"}</td>
          <td><button class="viewBtn">View</button></td>
      `;

      // SweetAlert2 View button logic (remains the same)
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
  const currentPageReports = reviewedReports.slice(startIndex, endIndex);

  renderReportsTable(currentPageReports);
  renderPagination(reviewedReports.length);
}

// Load reports when the page loads
loadReports();


// Load and display the reports without pagination
// function loadReports() {
//   reportsBody.innerHTML = '';

//   if (reviewedReports.length === 0) {
//     reportsBody.innerHTML = "<tr><td colspan='10'>No approved reports found.</td></tr>";
//   } else {
//     reviewedReports.forEach((report, index) => {
//       const tr = document.createElement('tr');

//       tr.innerHTML = `
//         <td>${report["No."] || index + 1}</td>
//         <td>${report["Report ID"] || "-"}</td>
//         <td>${report["Barangay"] || "-"}</td>
//         <td>${report["City/Municipality"] || "-"}</td>
//         <td>${formatDate(report["Date of Report"]) || "-"}</td>
//         <td>${report["Submitted by"] || "-"}</td>
//         <td>${report["No. of Hot Meals"] || "-"}</td>
//         <td>${report["Liters of Water"] || "-"}</td>
//         <td><button class="viewBtn">View</button></td>
//       `;

//       // SweetAlert2 View button logic
//       const viewBtn = tr.querySelector('.viewBtn');
//       viewBtn.addEventListener('click', () => {
//         let readableReport = "";
//         for (let key in report) {
//           const value = key === "Date of Report" ? formatDate(report[key]) : report[key];
//           readableReport += `• ${key}: ${value}\n`;
//         }

//         Swal.fire({
//           title: 'Approved Report Details',
//           icon: 'info',
//           html: `<pre style="text-align:left; white-space:pre-wrap">${readableReport}</pre>`,
//           confirmButtonText: 'Close'
//         });
//       });

//       reportsBody.appendChild(tr);
//     });
//   }
// }

// Load reports when the page loads
// loadReports();
