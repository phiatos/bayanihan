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
    const auth = firebase.auth();

    // Get elements
    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');

    if (!formPage1 || !formPage2 || !nextBtn || !backBtn) {
        console.error("Form elements not found");
        return;
    }

    let userUid = null;
    let volunteerGroupName = "[Unknown Org]";

    // Check if user is logged in and fetch their UID and group name
    auth.onAuthStateChanged(user => {
        if (user) {
            userUid = user.uid;
            console.log('Logged-in user UID:', userUid);

            // Fetch user data from the database
            database.ref(`users/${userUid}`).once('value', snapshot => {
                const userData = snapshot.val();
                if (userData && userData.group) {
                    volunteerGroupName = userData.group; // e.g., "RAZEL KIM ORG"
                    console.log('Volunteer group fetched from database:', volunteerGroupName);
                } else {
                    console.warn('User data or group not found in database for UID:', userUid);
                }
            }).catch(error => {
                console.error('Error fetching user data:', error);
            });
        } else {
            console.warn('No user is logged in');
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'Please log in to submit a report.',
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
        }
    });

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

    // Populate city and barangay dropdowns
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

    // Go to next form only if valid
    nextBtn.addEventListener('click', function () {
        if (formPage1.checkValidity()) {
            formPage1.style.display = "none";
            formPage2.style.display = "block";
        } else {
            formPage1.reportValidity();
        }
    });

    // Back to first form
    backBtn.addEventListener('click', function () {
        formPage2.style.display = "none";
        formPage1.style.display = "block";
    });

    // Submit final form
    formPage2.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!userUid) {
            console.error('No user UID available. Cannot submit report.');
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'User not authenticated. Please log in again.',
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
            return;
        }

        const formData = {
            VolunteerGroupName: volunteerGroupName, // e.g., "RAZEL KIM ORG"
            userUid, // Include the UID
            Barangay: barangaySelect.value,
            CityMunicipality: citySelect.value,
            TimeOfIntervention: document.querySelector('input[placeholder="Time of Intervention"]').value,
            SubmittedBy: document.querySelector('input[placeholder="Submitted by"]').value,
            DateOfReport: dateInput.value,
            ReportID: idInput.value,
            Date: document.querySelector('input[type="date"]').value,
            NoOfIndividualsOrFamilies: document.querySelector('input[placeholder="No. of Individuals or Families"]').value,
            NoOfFoodPacks: document.querySelector('input[placeholder="No. of Food Packs"]').value,
            NoOfHotMeals: document.querySelector('input[placeholder="No. of Hot Meals"]').value,
            LitersOfWater: document.querySelector('input[placeholder="Liters of Water"]').value,
            NoOfVolunteersMobilized: document.querySelector('input[placeholder="No. of Volunteers Mobilized"]').value,
            NoOfOrganizationsActivated: document.querySelector('input[placeholder="No. of Organizations Activated"]').value,
            TotalValueOfInKindDonations: document.querySelector('input[placeholder="Total Value of In-Kind Donations"]').value,
            NotesAdditionalInformation: document.querySelector('textarea').value,
            Status: "Pending",
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Save to both reports/submitted and users/<uid>/reports
        const reportRef = database.ref('reports/submitted').push();
        const userReportRef = database.ref(`users/${userUid}/reports/${reportRef.key}`);

        Promise.all([
            reportRef.set(formData),
            userReportRef.set(formData)
        ])
            .then(() => {
                console.log('Report saved to Firebase successfully');
                Swal.fire({
                    icon: 'success',
                    title: 'Report Submitted',
                    text: 'Your report has been successfully submitted for verification!',
                }).then(() => {
                    formPage1.reset();
                    formPage2.reset();
                    formPage2.style.display = 'none';
                    formPage1.style.display = 'block';
                    if (idInput) {
                        const randomId = 'ABRN' + Math.floor(10000 + Math.random() * 9000000000);
                        idInput.value = randomId;
                    }
                    if (dateInput) {
                        const today = new Date();
                        const formatted = today.toLocaleDateString('en-CA');
                        dateInput.value = formatted;
                    }
                });
            })
            .catch((error) => {
                console.error('Failed to save report to Firebase:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to submit report: ' + error.message,
                });
            });
    });
});