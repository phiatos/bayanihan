// Fetch submitted reports from localStorage
let submittedReports = JSON.parse(localStorage.getItem("submittedReports")) || [];

// Sort by "No." if it exists, otherwise default to index
submittedReports.sort((a, b) => (a["No."] || 0) - (b["No."] || 0));

// Get container element
const container = document.getElementById("submittedReportsContainer");

if (!container) {
  console.error("submittedReportsContainer element not found!");
} else if (submittedReports.length === 0) {
  container.innerHTML = "<tr><td colspan='9'>No reports submitted yet.</td></tr>";
} else {
  submittedReports.forEach((report, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${report["No."] || index + 1}</td>
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

    // Approve action
    row.querySelector('.approveBtn').addEventListener('click', () => {
      const reviewedReports = JSON.parse(localStorage.getItem("reviewedReports")) || [];
      reviewedReports.push({ ...report, status: "Approved" });
      localStorage.setItem("reviewedReports", JSON.stringify(reviewedReports));

      submittedReports.splice(index, 1);
      localStorage.setItem("submittedReports", JSON.stringify(submittedReports));
      location.reload();
    });

    // Reject button logic
    row.querySelector('.rejectBtn').addEventListener('click', () => {
      submittedReports.splice(index, 1); // Just remove from submittedReports
      localStorage.setItem("submittedReports", JSON.stringify(submittedReports));
      location.reload(); // Refresh the table
    });

    // View button - human-readable format with SweetAlert2
    row.querySelector('.viewBtn').addEventListener('click', () => {
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

    container.appendChild(row);
  });
}

// Optional: handle "View Approved" button if exists
const viewApprovedBtn = document.getElementById("viewApprovedBtn");
if (viewApprovedBtn) {
  viewApprovedBtn.addEventListener("click", () => {
    window.location.href = "../pages/reportslog.html";
  });
}
