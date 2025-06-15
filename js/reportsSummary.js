function formatDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr; // If not a valid date, return original
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeStr) {
    const [hourStr, minuteStr] = timeStr.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

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
                "AreaOfOperation",
                "DateOfReport"
            ],
            "Relief Operations": [
                "CalamityAreaDetails",
                "TimeOfIntervention",
                "StartDate",
                "EndDate",
                "NoOfOrganizationsActivated",
                "NoOfIndividualsOrFamilies",
                "NoOfFoodPacks",
                "NoOfHotMeals",
                "LitersOfWater",
                "NoOfVolunteersMobilized",
                "TotalValueOfInKindDonations",
                "TotalMonetaryDonations"
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

             // Converts Big Quantities to Readable Ones
function formatLargeNumber(numStr) {
    try {
        let num = BigInt(numStr || "0");
        const trillion = 1_000_000_000_000n;
        const billion = 1_000_000_000n;
        const million = 1_000_000n;
        const thousand = 1_000n;

        if (num >= trillion) {
            return (Number(num) / Number(trillion)).toFixed(2).replace(/\.?0+$/, '') + 'T';
        } else if (num >= billion) {
            return (Number(num) / Number(billion)).toFixed(2).replace(/\.?0+$/, '') + 'B';
        } else if (num >= million) {
            return (Number(num) / Number(million)).toFixed(2).replace(/\.?0+$/, '') + 'M';
        } else if (num >= thousand) {
            return (Number(num) / Number(thousand)).toFixed(2).replace(/\.?0+$/, '') + 'k';
        }
        return num.toString();
    } catch (error) {
        console.warn('Invalid number input:', numStr);
        return numStr;
    }
}

categories[category].forEach(item => {
    if (Object.prototype.hasOwnProperty.call(summaryData, item)) { // safer check
        let displayKey = item
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());

        displayKey = displayKey
            .replace('Area Of Operation', 'Area of Operation')
            .replace('Time Of Intervention', 'Completion of Time Intervention')
            .replace('Calamity Area Details', 'Calamity Area')
            .replace('Date Of Report', 'Date of Report')
            .replace('Report ID', 'Report ID')
            .replace('Start Date', 'Start Date')
            .replace('End Date', 'End Date')
            .replace('Volunteer Group Name', 'Volunteer Group')
            .replace('No Of Individuals Or Families', 'No. of Individuals or Families')
            .replace('No Of Food Packs', 'No. of Food Packs')
            .replace('No Of Hot Meals', 'No. of Hot Meals')
            .replace('Liters Of Water', 'Liters of Water')
            .replace('No Of Volunteers Mobilized', 'No. of Volunteers Mobilized')
            .replace('No Of Organizations Activated', 'No. of Organizations Activated')
            .replace('Total Value Of In Kind Donations', 'Total Value of In-Kind Donations')
            .replace('Total Monetary Donations', 'Total Monetary Donations')
            .replace('NotesAdditionalInformation', 'Notes/additional information'); 
        let value = summaryData[item];

        if (item === "DateOfReport" || item === "StartDate" || item === "EndDate") {
            value = formatDate(value);
        } else if (item === "TimeOfIntervention") {
            value = formatTime(value);
        } else if (/^NoOf|^Total/.test(item) && !isNaN(value)) {
            // Apply large number formatting for count/total fields
            value = formatLargeNumber(value);
        }

        const fieldDiv = document.createElement("div");
        fieldDiv.className = "summary-box";
        fieldDiv.innerHTML = `<strong>${displayKey}:</strong> <span>${value === '' ? 'N/A' : value}</span>`;
        section.appendChild(fieldDiv);
    }
});


            container.appendChild(section);
        }

        // Back button logic
        document.getElementById('backBtn').addEventListener('click', () => {
        // Save current summaryData back to localStorage to keep form data
            // localStorage.setItem("reportData", JSON.stringify(summaryData));
            window.history.back()
            localStorage.setItem("returnToStep", "form-container-2");
            
        });

        // Submit button logic
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

                summaryData["userUid"] = user.uid;
                summaryData["Status"] = "Pending";
                summaryData["Timestamp"] = firebase.database.ServerValue.TIMESTAMP;

                database.ref("reports/submitted").push(summaryData)
                    .then(() => {
                        console.log("Report successfully saved to Firebase");

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
