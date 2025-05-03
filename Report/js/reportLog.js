// Retrieve the reviewed reports from localStorage
const reviewedReports = JSON.parse(localStorage.getItem("reviewedReports")) || [];
const reportsBody = document.getElementById("reportsBody");

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

// Load and display the reports
function loadReports() {
  reportsBody.innerHTML = '';

  if (reviewedReports.length === 0) {
    reportsBody.innerHTML = "<tr><td colspan='10'>No approved reports found.</td></tr>";
  } else {
    reviewedReports.forEach((report, index) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${report["No."] || index + 1}</td>
        <td>${report["Report ID"] || "-"}</td>
        <td>${report["Barangay"] || "-"}</td>
        <td>${report["City/Municipality"] || "-"}</td>
        <td>${formatDate(report["Date of Report"]) || "-"}</td>
        <td>${report["Submitted by"] || "-"}</td>
        <td>${report["No. of Hot Meals"] || "-"}</td>
        <td>${report["Liters of Water"] || "-"}</td>
        <td><button class="viewBtn">View</button></td>
      `;

      // SweetAlert2 View button logic
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
}

// Load reports when the page loads
loadReports();