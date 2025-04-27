// Retrieve the reviewed reports from localStorage
const reviewedReports = JSON.parse(localStorage.getItem("reviewedReports")) || [];
const reportsBody = document.getElementById("reportsBody");

// Function to load and display the reports
function loadReports() {
    reportsBody.innerHTML = '';

    if (reviewedReports.length === 0) {
        reportsBody.innerHTML = "<tr><td colspan='7'>No approved reports found.</td></tr>";
    } else {
        reviewedReports.forEach((report) => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${report["Location of Operation"] || "-"}</td>
                <td>${report["Time of Intervention"] || "-"}</td>
                <td>${report["Volunteer Group Name"] || "-"}</td>
                <td>${report["Submitted by"] || "-"}</td>
                <td>${report["Date of Report"] || "-"}</td>
                <td>${report["Report ID"] || "-"}</td>
                <td class="status-icon ${report.status === 'approved' ? 'approved' : 'rejected'}">
                    ${report.status === 'approved' ? '✔️' : '❌'}
                </td>
            `;
            reportsBody.appendChild(tr);
        });
    }
}

// Call the function to load reports when the page loads
loadReports();
