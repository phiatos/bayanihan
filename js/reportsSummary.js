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
            window.location.href = '../pages/reportssubmission.html';
        });
        return;
    }

    // Remove the specific report with key -OPTGsB_vPQd5MNQPtpv from Firebase
    const reportKeyToRemove = "-OPTGsB_vPQd5MNQPtpv";
    const pendingRef = database.ref(`reports/pending/${reportKeyToRemove}`);
    const approvedRef = database.ref(`reports/approved/${reportKeyToRemove}`);

    Promise.all([
        pendingRef.remove().catch(error => {
            console.error(`Error removing report from pending: ${error.message}`);
        }),
        approvedRef.remove().catch(error => {
            console.error(`Error removing report from approved: ${error.message}`);
        })
    ]).then(() => {
        console.log(`Report with key ${reportKeyToRemove} has been removed from the database.`);

        // Display the summary
        const categories = {
            "Basic Information": [
                "ReportID",
                "VolunteerGroupName", // Add VolunteerGroupName to display
                "AreaOfOperation",
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
            "Additional Updates": [
                "NotesAdditionalInformation"
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
                    let displayKey = item
                        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                        .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
                    displayKey = displayKey
                        .replace('AreaOfOperation', 'Area of Operation')
                        .replace('TimeOfIntervention', 'Time of Intervention')
                        .replace('SubmittedBy', 'Submitted by')
                        .replace('DateOfReport', 'Date of Report')
                        .replace('ReportID', 'Report ID')
                        .replace('VolunteerGroupName', 'Volunteer Group')
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

        //  Back button logic
        document.getElementById('backBtn').addEventListener('click', () => {
            localStorage.setItem("returnToStep", "form-container-2");
            // reportData is already in localStorage, so just go back
            window.location.href = "../pages/reportssubmission.html";
        });

        //  Submit button logic
        const submitBtn = document.getElementById("submitBtn");
        submitBtn.addEventListener("click", () => {
            auth.onAuthStateChanged(user => {
                if (!user) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Authentication Required',
                        text: 'Please sign in to submit a report.',
                    }).then(() => {
                        window.location.href = "../pages/login.html";
                    });
                    return;
                }

                // Add userUid to summaryData before saving to Firebase
                summaryData["userUid"] = user.uid;

                console.log("Submitting to Firebase:", summaryData);

                summaryData["Status"] = "Pending";
                summaryData["Timestamp"] = firebase.database.ServerValue.TIMESTAMP;

                database.ref("reports/submitted").push(summaryData)
                    .then(() => {
                        console.log("Report successfully saved to Firebase");

                        // 🔥 Clear localStorage data
                        localStorage.removeItem("reportData");
                        localStorage.removeItem("returnToStep");

                        Swal.fire({
                            icon: 'success',
                            title: 'Report Submitted',
                            text: 'Your report has been successfully submitted for verification!',
                        }).then(() => {
                            window.location.href = "../pages/dashboard.html";
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

    }).catch(error => {
        console.error("Error during report removal process:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to process report removal. Please try again.',
        });
    });
});
