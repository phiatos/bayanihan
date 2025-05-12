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

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');

    if (!formPage1 || !formPage2 || !nextBtn || !backBtn) {
        console.error("Form elements not found");
        return;
    }

    // Auto-set today's date
    const dateInput = document.getElementById('dateOfReport');
    if (dateInput) {
        const today = new Date();
        const formatted = today.toLocaleDateString('en-CA');
        dateInput.value = formatted;
    }

    // Generate random report ID
    const idInput = document.getElementById('reportId');
    if (idInput) {
        const randomId = 'ABRN' + Math.floor(10000 + Math.random() * 9000000000);
        idInput.value = randomId;
    }

    // 🔧 FIXED: Map modal button logic
    const pinBtn = document.getElementById('pinBtn');
    const mapModal = document.getElementById('mapModal');
    const closeBtn = document.querySelector('.closeBtn');

    if (pinBtn && mapModal && closeBtn) {
        pinBtn.addEventListener('click', (e) => {
            e.preventDefault(); // prevent form submit
            mapModal.classList.add('show');
        });

        closeBtn.addEventListener('click', () => {
            mapModal.classList.remove('show');
        });

        window.addEventListener('click', (e) => {
            if (e.target === mapModal) {
                mapModal.classList.remove('show');
            }
        });
    } else {
        console.warn('Modal elements not found');
    }

    function formatTo12Hour(timeStr) {
        const [hour, minute] = timeStr.split(':');
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHour = h % 12 || 12;
        return `${formattedHour}:${minute} ${ampm}`;
    }

    const submittedByInput = document.getElementById('SubmittedBy');
    if (submittedByInput) {
        const volunteerGroup = JSON.parse(localStorage.getItem("loggedInVolunteerGroup"));
        const groupName = volunteerGroup ? volunteerGroup.organization : "Unknown Volunteer";
        submittedByInput.value = groupName;
        submittedByInput.readOnly = true;
    }

    // Handle navigation
    nextBtn.addEventListener('click', () => {
        if (formPage1.checkValidity()) {
            formPage1.style.display = "none";
            formPage2.style.display = "block";
        } else {
            formPage1.reportValidity();
        }
    });

    backBtn.addEventListener('click', () => {
        formPage2.style.display = "none";
        formPage1.style.display = "block";
    });

    // Submit
    formPage2.addEventListener("submit", function (e) {
        e.preventDefault();

        const formData = {
            "ReportID": idInput.value,
            "AreaOfOperation": document.querySelector('input[placeholder="e.g. Purok 2, Brgy. Maligaya, Rosario"]').value,
            "TimeOfIntervention": formatTo12Hour(document.querySelector('input[placeholder="Time of Intervention"]').value),
            "SubmittedBy": submittedByInput ? submittedByInput.value : "Unknown Group",
            "DateOfReport": dateInput.value,
            "Date": document.querySelector('input[type="date"]').value,
            "NoOfIndividualsOrFamilies": document.querySelector('input[placeholder="No. of Individuals or Families"]').value,
            "NoOfFoodPacks": document.querySelector('input[placeholder="No. of Food Packs"]').value,
            "NoOfHotMeals": document.querySelector('input[placeholder="No. of Hot Meals"]').value,
            "LitersOfWater": document.querySelector('input[placeholder="Liters of Water"]').value,
            "NoOfVolunteersMobilized": document.querySelector('input[placeholder="No. of Volunteers Mobilized"]').value,
            "NoOfOrganizationsActivated": document.querySelector('input[placeholder="No. of Organizations Activated"]').value,
            "TotalValueOfInKindDonations": document.querySelector('input[placeholder="Total Value of In-Kind Donations"]').value,
            "NotesAdditionalInformation": document.querySelector('textarea').value,
            "Status": "Pending"
        };

        console.log("Redirecting to reportsSummary.html");
        localStorage.setItem("returnToStep", "form-container-2");
        localStorage.setItem("reportData", JSON.stringify(formData));
        window.location.href = "../pages/reportsSummary.html";
    });

    // Handle returning from reportsSummary.html
    const returnTo = localStorage.getItem("returnToStep");

    if (returnTo === "form-container-2") {
        formPage1.style.display = "none";
        formPage2.style.display = "block";

        setTimeout(() => {
            const target = document.querySelector(".form-container-2");
            if (target) target.scrollIntoView({ behavior: "smooth" });
        }, 100);

        const savedData = JSON.parse(localStorage.getItem("reportData"));
        if (savedData) {
            document.querySelector('input[placeholder="e.g. Purok 2, Brgy. Maligaya, Rosario"]').value = savedData.AreaOfOperation || '';
            document.querySelector('input[placeholder="Time of Intervention"]').value = savedData.TimeOfIntervention || '';
            document.querySelector('input[placeholder="Submitted by"]').value = savedData.SubmittedBy || '';
            document.querySelector('input[type="date"]').value = savedData.Date || '';
            document.querySelector('input[placeholder="No. of Individuals or Families"]').value = savedData.NoOfIndividualsOrFamilies || '';
            document.querySelector('input[placeholder="No. of Food Packs"]').value = savedData.NoOfFoodPacks || '';
            document.querySelector('input[placeholder="No. of Hot Meals"]').value = savedData.NoOfHotMeals || '';
            document.querySelector('input[placeholder="Liters of Water"]').value = savedData.LitersOfWater || '';
            document.querySelector('input[placeholder="No. of Volunteers Mobilized"]').value = savedData.NoOfVolunteersMobilized || '';
            document.querySelector('input[placeholder="No. of Organizations Activated"]').value = savedData.NoOfOrganizationsActivated || '';
            document.querySelector('input[placeholder="Total Value of In-Kind Donations"]').value = savedData.TotalValueOfInKindDonations || '';
            document.querySelector('textarea').value = savedData.NotesAdditionalInformation || '';
        }

        localStorage.removeItem("returnToStep");
    }
});
