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
    const auth = firebase.auth();

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

            // Fetch user data from the database to get the volunteer group name
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
            // Redirect to login page if user is not authenticated
            window.location.href = '../pages/login.html';
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

    // FIXED: Map modal button logic
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

    const submittedByInput = document.getElementById('SubmittedBy');
    if (submittedByInput) {
        const volunteerGroup = JSON.parse(localStorage.getItem("loggedInVolunteerGroup"));
        const groupName = volunteerGroup ? volunteerGroup.organization : "Unknown Volunteer";
        submittedByInput.value = groupName;
        submittedByInput.readOnly = true;
    }

    // Handle navigation
    nextBtn.addEventListener('click', () => {
        if (!formPage1.checkValidity()) {
            formPage1.reportValidity(); 
            return; 
        }

        const startDateInput = document.getElementById('StartDate');
        const endDateInput = document.getElementById('EndDate');

        // Check if date inputs exist on the page (they should, given checkValidity above)
        if (!startDateInput || !endDateInput) {
            console.error("StartDate or EndDate input not found. Cannot perform date validation.");
            // If they are missing, we still don't want to proceed
            return;
        }
        
        const startDateValue = startDateInput.value;
        const endDateValue = endDateInput.value;

        // Ensure both date fields are filled before detailed validation
        if (!startDateValue || !endDateValue) {
            alert("Please fill in both Start Date and End Date.");
            if (!startDateValue) {
                startDateInput.focus();
            } else {
                endDateInput.focus();
            }
            return; // Stop execution
        }

        // Create Date objects from input values.
        // It's best to use a consistent parsing method or ensure the date string is YYYY-MM-DD
        // to avoid timezone issues when creating a new Date object.
        const startDate = new Date(startDateValue + 'T00:00:00'); // Append T00:00:00 to force UTC midnight for consistency
        const endDate = new Date(endDateValue + 'T00:00:00');

        // Get today's date, normalized to midnight local time
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to the start of the day for accurate local date comparison

        // Set a reasonable "future" limit for EndDate (e.g., 1 year from today)
        const oneYearFromNow = new Date(today); // Start from today's normalized date
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        // No need to set to end of day if today is already normalized to start of day

        // --- Date Validation Logic ---

        // 1. Check for Invalid Dates (e.g., if input string was malformed)
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            alert("Invalid date entered. Please use the date picker to select valid dates.");
            if (isNaN(startDate.getTime())) {
                startDateInput.focus();
            } else {
                endDateInput.focus();
            }
            return;
        }

        // 2. Start Date cannot be in the future (compared to today)
        // If startDate is exactly today, it should be allowed.
        if (startDate > today) {
            alert("Start Date cannot be a future date.");
            startDateInput.focus();
            return;
        }

        // 3. Start Date cannot be after End Date
        if (startDate > endDate) {
            alert("Start Date cannot be after End Date.");
            startDateInput.focus();
            return;
        }

        // 4. End Date not excessively far in the future (e.g., more than 1 year from today)
        // This checks if endDate is beyond our defined future limit.
        if (endDate > oneYearFromNow) {
            alert("End Date cannot be more than 1 year from today. Please enter a valid date range.");
            endDateInput.focus();
            return;
        }

        // --- End Date Validation Logic ---

        // If ALL validations (formPage1.checkValidity() AND date validations) pass, then proceed to Page 2
        formPage1.style.display = "none";
        formPage2.style.display = "block";
    });

    backBtn.addEventListener('click', () => {
        formPage2.style.display = "none";
        formPage1.style.display = "block";
    });

    // Submit
    formPage2.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!userUid) {
            console.error('No user UID available. Cannot submit report.');
            alert('User not authenticated. Please log in again.');
            window.location.href = '../pages/login.html';
            return;
        }

        const startDateInput = document.querySelector('input[id="StartDate"]');
        const endDateInput = document.querySelector('input[id="EndDate"]');

        const formData = {
            VolunteerGroupName: volunteerGroupName, // e.g., "RAZEL KIM ORG"
            userUid, // Include the UID in formData but won't display in UI
            AreaOfOperation: document.querySelector('input[placeholder="e.g. Purok 2, Brgy. Maligaya, Rosario"]').value,
            TimeOfIntervention: document.querySelector('input[placeholder="Completion Time of Intervention"]')?.value || "N/A",
            DateOfReport: dateInput.value || "N/A",
            ReportID: idInput.value || "N/A",
            StartDate: startDateInput?.value || "N/A",
            EndDate: endDateInput?.value || "N/A",
            NoOfIndividualsOrFamilies: document.querySelector('input[placeholder="No. of Individuals or Families"]')?.value || "N/A",
            NoOfFoodPacks: document.querySelector('input[placeholder="No. of Food Packs"]')?.value || "N/A",
            NoOfHotMeals: document.querySelector('input[placeholder="No. of Hot Meals"]')?.value || "N/A",
            LitersOfWater: document.querySelector('input[placeholder="Liters of Water"]')?.value || "N/A",
            NoOfVolunteersMobilized: document.querySelector('input[placeholder="No. of Volunteers Mobilized"]')?.value || "N/A",
            NoOfOrganizationsActivated: document.querySelector('input[placeholder="No. of Organizations Activated"]')?.value || "N/A",
            TotalValueOfInKindDonations: document.querySelector('input[placeholder="Total Value of In-Kind Donations"]')?.value || "N/A",
            TotalMonetaryDonations: document.querySelector('input[placeholder="Total Monetary Donations"]')?.value || "N/A",
            NotesAdditionalInformation: document.querySelector('textarea')?.value || "N/A",
            Status: "Pending"
        };

        // Save to localStorage and redirect to reportsSummary.html (no modal)
        localStorage.setItem("reportData", JSON.stringify(formData));
        window.location.href = "../pages/reportsSummary.html";
    });

    // Handle returning from reportsSummary.html
const returnTo = localStorage.getItem("returnToStep");

if (returnTo === "form-container-1") {
    formPage1.style.display = "none";
    formPage2.style.display = "block";

    setTimeout(() => {
        const target = document.querySelector(".form-container-1");
        if (target) target.scrollIntoView({ behavior: "smooth" });
    }, 100);

    const savedData = JSON.parse(localStorage.getItem("reportData"));
    if (savedData) {
        document.querySelector('input[placeholder="e.g. Purok 2, Brgy. Maligaya, Rosario"]').value = savedData.AreaOfOperation || '';
        document.querySelector('input[placeholder="Time of Intervention"]').value = savedData.TimeOfIntervention || '';
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

    // Clear it so it doesn’t auto-jump next time
    localStorage.removeItem("returnToStep");
} else {
    // Default to form 1
    formPage1.style.display = "block";
    formPage2.style.display = "none";
}
});

