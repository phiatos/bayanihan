const summaryData = JSON.parse(localStorage.getItem("reportData"));
const container = document.getElementById("summaryContainer");

const categories = {
    "Basic Information": [
        "Volunteer Group Name",
        "Location of Operation",
        "Time of Intervention",
        "Submitted by",
        "Date of Report"
    ],
    "Relief Operations": [
        "Date",
        "No. of Organizations Activated",
        "No. of Individuals or Families",
        "No. of Food Packs",
        "No. of Hot Meals",
        "Liters of Water",
        "No. of Volunteers Mobilized",
        "Total Amount Raised",
        "Total Value of In-Kind Donations"
    ],
    "Urgent Needs": [
        "Urgent Needs"
    ],
    "Remarks": [
        "Remarks"
    ]
};

for (let category in categories) {
    const section = document.createElement("div");
    section.className = "category-section";

    const title = document.createElement("div");
    title.className = "category-title";
    title.textContent = category;
    section.appendChild(title);

    categories[category].forEach(item => {
        if (summaryData[item]) {
            const fieldDiv = document.createElement("div");
            fieldDiv.className = "summary-box";
            // FIX: wrap value inside <span>
            fieldDiv.innerHTML = `<strong>${item}:</strong> <span>${summaryData[item]}</span>`;
            section.appendChild(fieldDiv);
        }
    });

    container.appendChild(section);
}
// Submit button logic
const submitBtn = document.getElementById("submitBtn");
submitBtn.addEventListener("click", () => {
let submittedReports = JSON.parse(localStorage.getItem("submittedReports")) || [];
submittedReports.push(summaryData);
localStorage.setItem("submittedReports", JSON.stringify(submittedReports));

// Optionally clear the draft report
localStorage.removeItem("reportData");

// Redirect to submitted.html
window.location.href = "reportVerification.html";
});