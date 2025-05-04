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

    // Retrieve the report data from localStorage
    const summaryData = JSON.parse(localStorage.getItem("reportData"));
    const container = document.getElementById("summaryContainer");

    // Check if summaryData exists
    if (!summaryData) {
        Swal.fire({
            icon: 'error',
            title: 'No Report Data',
            text: 'No report data found. Please go back and submit the form again.',
        }).then(() => {
            window.location.href = '../pages/reportsSubmission.html';
        });
        return;
    }

    const categories = {
        "Basic Information": [
            "Barangay",
            "CityMunicipality",
            "TimeOfIntervention",
            "SubmittedBy",
            "DateOfReport"
        ],
        "Relief Operations": [
            "Date",
            "NoOfOrganizationsActivated",
            "NoOfIndividualsOrFamilies",
            "NoOfFoodPacks",
            "NoOfHotMeals",
            "LitersOfWater",
            "NoOfVolunteersMobilized",
            "TotalValueOfInKindDonations"
        ],
        "Notes/Additional Information": [
            "NotesAdditionalInformation"
        ]
    };

    // Display the summary
    for (let category in categories) {
        const section = document.createElement("div");
        section.className = "category-section";

        const title = document.createElement("div");
        title.className = "category-title";
        title.textContent = category;
        section.appendChild(title);

        categories[category].forEach(item => {
            if (summaryData[item]) {
                // Convert the sanitized key back to a readable format for display
                let displayKey = item
                    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
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

                const fieldDiv = document.createElement("div");
                fieldDiv.className = "summary-box";
                fieldDiv.innerHTML = `<strong>${displayKey}:</strong> <span>${summaryData[item]}</span>`;
                section.appendChild(fieldDiv);
            }
        });

        container.appendChild(section);
    }

    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = '../pages/reportsSubmission.html';
    });

    // Submit button
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.addEventListener("click", () => {
        // Check if user is authenticated
        auth.onAuthStateChanged(user => {
            if (!user) {
                Swal.fire({
                    icon: 'error',
                    title: 'Authentication Required',
                    text: 'Please sign in to submit a report.',
                }).then(() => {
                    window.location.href = "../pages/login.html"; // Adjust to your login page
                });
                return;
            }

            console.log("Submitting to Firebase:", summaryData);

            // Add timestamp and status
            summaryData["Status"] = "Pending";
            summaryData["Timestamp"] = firebase.database.ServerValue.TIMESTAMP;

            // Save to Firebase under reports/submitted
            database.ref("reports/submitted").push(summaryData)
                .then(() => {
                    console.log("Report successfully saved to Firebase");

                    // Clear the draft report from localStorage
                    localStorage.removeItem("reportData");

                    // Show success message
                    Swal.fire({
                        icon: 'success',
                        title: 'Report Submitted',
                        text: 'Your report has been successfully submitted for verification!',
                    }).then(() => {
                        // Redirect to Reports Verification page (admins can access it)
                        window.location.href = "../pages/reportsVerification.html";
                    });
                })
                .catch((error) => {
                    console.error("Error saving report to Firebase:", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to submit report: ' + error.message,
                    });
                });
        });
    });
});