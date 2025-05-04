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
    const database = firebase.database();

    // Get elements
    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');

    // Debug: Check if elements are found
    if (!formPage1 || !formPage2 || !nextBtn || !backBtn) {
        console.error("One or more form elements not found:", { formPage1, formPage2, nextBtn, backBtn });
        return;
    }

    // Set date today as default value
    const dateInput = document.getElementById('dateOfReport');
    if (dateInput) {
        const today = new Date();
        const formatted = today.toLocaleDateString('en-CA'); // YYYY-MM-DD
        dateInput.value = formatted;
    } else {
        console.error("dateOfReport input not found");
    }

    // Generate a random report ID
    const idInput = document.getElementById('reportId');
    if (idInput) {
        const randomId = 'ABRN' + Math.floor(10000 + Math.random() * 9000000000);
        idInput.value = randomId;
    } else {
        console.error("reportId input not found");
    }

    // Go to next form only if valid
    nextBtn.addEventListener('click', function () {
        if (formPage1.checkValidity()) {
            formPage1.style.display = "none";
            formPage2.style.display = "block";
        } else {
            formPage1.reportValidity();
        }
    });

    // Go back to first form
    backBtn.addEventListener('click', function () {
        formPage2.style.display = "none";
        formPage1.style.display = "block";
    });

    // Submit second form
    formPage2.addEventListener("submit", function (e) {
        e.preventDefault();

        console.log("Form submission triggered");

        // Collect form data with sanitized keys
        const formData = {
            "Barangay": document.querySelector('input[placeholder="Barangay"]').value,
            "CityMunicipality": document.querySelector('input[placeholder="City/Municipality"]').value,
            "TimeOfIntervention": document.querySelector('input[placeholder="Time of Intervention"]').value,
            "SubmittedBy": document.querySelector('input[placeholder="Submitted by"]').value,
            "DateOfReport": document.getElementById('dateOfReport').value,
            "ReportID": document.getElementById('reportId').value,
            "Date": document.querySelector('input[placeholder="Date"]').value,
            "NoOfIndividualsOrFamilies": document.querySelector('input[placeholder="No. of Individuals or Families"]').value,
            "NoOfFoodPacks": document.querySelector('input[placeholder="No. of Food Packs"]').value,
            "NoOfHotMeals": document.querySelector('input[placeholder="No. of Hot Meals"]').value,
            "LitersOfWater": document.querySelector('input[placeholder="Liters of Water"]').value,
            "NoOfVolunteersMobilized": document.querySelector('input[placeholder="No. of Volunteers Mobilized"]').value,
            "NoOfOrganizationsActivated": document.querySelector('input[placeholder="No. of Organizations Activated"]').value,
            "TotalValueOfInKindDonations": document.querySelector('input[placeholder="Total Value of In-Kind Donations"]').value,
            "NotesAdditionalInformation": document.querySelector('textarea[placeholder="Notes/additional information"]').value,
            "Status": "Pending"
        };

        console.log("Form Data Collected:", formData);

        // Save to localStorage for the summary page
        localStorage.setItem("reportData", JSON.stringify(formData));

        // Verify localStorage
        const savedData = localStorage.getItem("reportData");
        console.log("Data saved to localStorage:", JSON.parse(savedData));

        // Redirect to summary page
        window.location.href = "../pages/reportsSummary.html";
    });
});