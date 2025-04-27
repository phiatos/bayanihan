const submittedReports = JSON.parse(localStorage.getItem("submittedReports")) || [];
const reviewedReports = JSON.parse(localStorage.getItem("reviewedReports")) || [];
const container = document.getElementById("submittedReportsContainer");
const viewApprovedBtn = document.getElementById("viewApprovedBtn");

if (submittedReports.length === 0) {
    container.innerHTML = "<tr><td colspan='3'>No reports submitted yet.</td></tr>";
} else {
    submittedReports.forEach((report, index) => {
        const reportRow = document.createElement("tr");

        const reportNumberCell = document.createElement("td");
        reportNumberCell.textContent = `Report #${index + 1}`;
        reportRow.appendChild(reportNumberCell);

        const detailsCell = document.createElement("td");
        let reportDetails = "<ul>";
        for (let key in report) {
            reportDetails += `<li><strong>${key}:</strong> ${report[key]}</li>`;
        }
        reportDetails += "</ul>";
        detailsCell.innerHTML = reportDetails;
        reportRow.appendChild(detailsCell);

        const actionsCell = document.createElement("td");
        const approveBtn = document.createElement("button");
        approveBtn.textContent = "Approve ✅";
        approveBtn.style.marginRight = "10px";
        approveBtn.addEventListener("click", () => {
            // Move the report to reviewedReports
            reviewedReports.push(report);
            localStorage.setItem("reviewedReports", JSON.stringify(reviewedReports));
        
            // Remove from submittedReports
            submittedReports.splice(index, 1);
            localStorage.setItem("submittedReports", JSON.stringify(submittedReports));
        
            // Create a new row for the approved report in the reportLog page
            const newRow = document.createElement("tr");
        
            // You can customize the columns and data you want to display for each report
            newRow.innerHTML = `
                <td>${report["Location of Operation"] || "-"}</td>
                <td>${report["Time of Intervention"] || "-"}</td>
                <td>${report["Volunteer Group Name"] || "-"}</td>
                <td>${report["Submitted by"] || "-"}</td>
                <td>${report["Date of Report"] || "-"}</td>
                <td>${report["Report ID"] || "-"}</td>
                <td class="status-icon approved">✔️</td>
            `;
        
            const reportsBody = document.getElementById("reportsBody");
            if (reportsBody) {
                reportsBody.appendChild(newRow); // Add the new row to the report log
            }
        
            // Redirect to the reportLog.html page after adding the row
            window.location.href = "reportLog.html"; // Redirect to the log page
        });

        actionsCell.appendChild(approveBtn);
        reportRow.appendChild(actionsCell);

        container.appendChild(reportRow);
    });
}