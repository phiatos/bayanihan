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

const submittedByInput  = document.getElementById('SubmittedBy');
if (submittedByInput ) {
    const groupName = localStorage.getItem("VolunteerGroupName") || "Unknown Volunteer";
    submittedByInput.value = groupName;
    submittedByInput.readOnly = true; // Optional: make it non-editable
}

    // Populate dropdowns
    const citySelect = document.querySelector('select[name="city"]');
    const barangaySelect = document.querySelector('select[name="barangay"]');

    const locationData = {
        "Batangas": ["Batangas City", "Lipa", "Nasugbu", "Tanauan"],
        "Caloocan": ["Bagong Silang", "Longos", "San Agustin", "San Jose"],
        "Cavite": ["Bacoor", "Dasmariñas", "Imus", "Tagaytay"],
        "Cebu City": ["Guadalupe", "Lahug", "Mabolo", "Talamban"],
        "Davao City": ["Agdao", "Buhangin", "Poblacion", "Toril"],
        "Las Piñas": ["BF International", "CAA", "Pamplona", "Talon"],
        "Malabon": ["Hulong Duhat", "Longos", "San Agustin", "Tanza"],
        "Makati": ["Bel-Air", "Dasmariñas", "Pio del Pilar", "San Lorenzo"],
        "Mandaluyong": ["Barangka", "Hulo", "Plainview", "Wack-Wack"],
        "Manila": ["Ermita", "Malate", "Sampaloc", "Tondo"],
        "Marikina": ["Calumpang", "Concepcion Uno", "San Roque", "Santo Niño"],
        "Navotas": ["North Bay Boulevard", "San Jose", "San Roque", "Tangos"],
        "Nagas": ["Baao", "Bula", "Iriga", "Naga City"],
        "Parañaque": ["Baclaran", "BF Homes", "San Dionisio", "San Isidro"],
        "Pasay": ["Baclaran", "Malibay", "San Isidro", "San Nicolas"],
        "Pasig": ["Bambang", "Kapitolyo", "Manggahan", "Santolan"],
        "Pateros": ["San Juan Bautista", "San Mateo", "San Pedro", "San Roque"],
        "Quezon City": ["Batasan Hills", "Commonwealth", "Diliman", "Novaliches"],
        "Quezon Province": ["Candelaria", "Lucena", "Sariaya", "Tayabas"],
        "San Juan": ["Balong Bato", "Corazon de Jesus", "Little Baguio", "San Perfecto"],
        "Taguig": ["Bagumbayan", "Fort Bonifacio", "North Signal Village", "Ususan"],
        "Valenzuela": ["Bagong Silang", "Gen. T. De Leon", "Karuhatan", "Malanday"],
    };

    if (citySelect && barangaySelect) {
        Object.keys(locationData).forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });

        citySelect.addEventListener('change', () => {
            const selectedCity = citySelect.value;
            barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
            if (locationData[selectedCity]) {
                locationData[selectedCity].forEach(barangay => {
                    const option = document.createElement('option');
                    option.value = barangay;
                    option.textContent = barangay;
                    barangaySelect.appendChild(option);
                });
            }
        });
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
            "Barangay": barangaySelect.value,
            "CityMunicipality": citySelect.value,
            "TimeOfIntervention": document.querySelector('input[placeholder="Time of Intervention"]').value,
            "SubmittedBy": document.querySelector.value,
            "DateOfReport": dateInput.value,
            "ReportID": idInput.value,
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

        localStorage.setItem("reportData", JSON.stringify(formData));
        localStorage.setItem("returnToStep", "form-container-2"); // Flag to go back
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

        // Restore form data if available
        const savedData = JSON.parse(localStorage.getItem("reportData"));
        if (savedData) {
            citySelect.value = savedData.CityMunicipality;
            citySelect.dispatchEvent(new Event('change')); // To repopulate barangays

            setTimeout(() => {
                barangaySelect.value = savedData.Barangay;
            }, 100);

            document.querySelector('input[placeholder="Time of Intervention"]').value = savedData.TimeOfIntervention;
            document.querySelector('input[placeholder="Submitted by"]').value = savedData.SubmittedBy;
            document.querySelector('input[type="date"]').value = savedData.Date;
            document.querySelector('input[placeholder="No. of Individuals or Families"]').value = savedData.NoOfIndividualsOrFamilies;
            document.querySelector('input[placeholder="No. of Food Packs"]').value = savedData.NoOfFoodPacks;
            document.querySelector('input[placeholder="No. of Hot Meals"]').value = savedData.NoOfHotMeals;
            document.querySelector('input[placeholder="Liters of Water"]').value = savedData.LitersOfWater;
            document.querySelector('input[placeholder="No. of Volunteers Mobilized"]').value = savedData.NoOfVolunteersMobilized;
            document.querySelector('input[placeholder="No. of Organizations Activated"]').value = savedData.NoOfOrganizationsActivated;
            document.querySelector('input[placeholder="Total Value of In-Kind Donations"]').value = savedData.TotalValueOfInKindDonations;
            document.querySelector('textarea').value = savedData.NotesAdditionalInformation;
        }

        localStorage.removeItem("returnToStep");
    }
});
