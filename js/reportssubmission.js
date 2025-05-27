// Global variables for map and markers
let map;
let markers = [];
let autocomplete;

document.addEventListener('DOMContentLoaded', () => {
    // Firebase configuration (ideally loaded from environment variables in production)
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

    // Initialize Firebase only once
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const database = firebase.database();
    const auth = firebase.auth();

    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');

    const reportIdInput = document.getElementById('reportId');
    const dateOfReportInput = document.getElementById('dateOfReport');
    const areaOfOperationInput = document.getElementById('AreaOfOperation');
    const calamityAreaDropdown = document.getElementById('calamityAreaDropdown');
    const completionTimeInput = document.getElementById('completionTime');
    const startDateInput = document.getElementById('StartDate');
    const endDateInput = document.getElementById('EndDate');
    const numIndividualsFamiliesInput = document.getElementById('numIndividualsFamilies');
    const numFoodPacksInput = document.getElementById('numFoodPacks');
    const numHotMealsInput = document.getElementById('numHotMeals');
    const litersWaterInput = document.getElementById('litersWater');
    const numVolunteersInput = document.getElementById('numVolunteers');
    const numOrganizationsInput = document.getElementById('numOrganizations');
    const valueInKindInput = document.getElementById('valueInKind');
    const monetaryDonationsInput = document.getElementById('monetaryDonations');
    const notesInfoTextarea = document.getElementById('notesInfo');
    // const submittedByInput = document.getElementById('SubmittedBy');

    const pinBtn = document.getElementById('pinBtn');
    const mapModal = document.getElementById('mapModal');
    const closeBtn = document.querySelector('.closeBtn');

    // if (!formPage1 || !formPage2 || !nextBtn || !backBtn || !reportIdInput || !dateOfReportInput || !areaOfOperationInput || !calamityAreaDropdown || !completionTimeInput || !startDateInput || !endDateInput || !numIndividualsFamiliesInput || !numFoodPacksInput || !numHotMealsInput || !litersWaterInput || !numVolunteersInput || !numOrganizationsInput || !valueInKindInput || !monetaryDonationsInput || !notesInfoTextarea || !submittedByInput) {
    //     console.error("One or more form elements not found. Please check HTML IDs.");
    //     return;
    // }

    let userUid = null;
    let volunteerGroupName = "[Unknown Org]"; // Default to Unknown Org
    let activeActivations = []; // To store active operations for the dropdown

    function populateCalamityAreaDropdown() {
        calamityAreaDropdown.innerHTML = '<option value="">-- Select an Active Operation --</option>';
        activeActivations.forEach(activation => {
            const option = document.createElement("option");
            option.value = activation.id;

            let displayCalamity = activation.calamityType;
            if (activation.calamityType === "Typhoon" && activation.typhoonName) {
                displayCalamity += ` (${activation.typhoonName})`;
            }
            option.textContent = `${displayCalamity} (by ${activation.organization})`;
            calamityAreaDropdown.appendChild(option);
        });

        const savedData = JSON.parse(localStorage.getItem("reportData"));
        if (savedData && savedData.CalamityAreaId) {
            calamityAreaDropdown.value = savedData.CalamityAreaId;
            if (calamityAreaDropdown.value) {
                calamityAreaDropdown.dispatchEvent(new Event('change'));
            }
        }
    }

    calamityAreaDropdown.addEventListener('change', () => {
        const selectedActivationId = calamityAreaDropdown.value;

        if (selectedActivationId === "") {
            areaOfOperationInput.value = "";
            areaOfOperationInput.readOnly = false;
            pinBtn.style.display = 'inline-block';
        } else {
            const selectedActivation = activeActivations.find(
                (activation) => activation.id === selectedActivationId
            );

            if (selectedActivation) {
                // areaOfOperationInput.value = selectedActivation.areaOfOperation || "";
                areaOfOperationInput.readOnly = false;
                pinBtn.style.display = 'inline-block';
            } else {
                console.warn("Selected activation not found in activeActivations array.");
                areaOfOperationInput.value = "";
                areaOfOperationInput.readOnly = false;
                pinBtn.style.display = 'inline-block';
            }
        }
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            userUid = user.uid;
            console.log('Logged-in user UID:', userUid);

            database.ref(`users/${userUid}`).once('value', snapshot => {
                const userData = snapshot.val();
                         if (userData && userData.group) {
                    volunteerGroupName = userData.group;
                    // Removed the redundant assignment here
                    console.log('Volunteer group fetched from database for filtering:', volunteerGroupName);
                    // REMOVED: submittedByInput.value = volunteerGroupName;
                    // REMOVED: submittedByInput.readOnly = true;
                } else {
                    console.warn('User data or group not found in database for UID:', userUid);
                    // If no group is found, it will default to "[Unknown Org]"
                    // REMOVED: submittedByInput.value = volunteerGroupName;
                    // REMOVED: submittedByInput.readOnly = true;
                }

                let activationsQuery = database.ref("activations").orderByChild("status").equalTo("active");

                if (volunteerGroupName && volunteerGroupName !== "[Unknown Org]") {
                    console.log(`Filtering activations for group: ${volunteerGroupName}`);
                    activationsQuery.on("value", snapshot => {
                        activeActivations = [];
                        snapshot.forEach(childSnapshot => {
                            const activation = { id: childSnapshot.key, ...childSnapshot.val() };
                            if (activation.organization === volunteerGroupName) { // THIS IS THE FILTERING LOGIC
                                activeActivations.push(activation);
                            }
                        });
                        populateCalamityAreaDropdown();
                    }, error => {
                        console.error("Error listening for active activations with group filter:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to load active operations. Please try again.'
                        });
                    });
                } else {
                    console.log("Showing all active activations (Unknown Org or no group).");
                    activationsQuery.on("value", snapshot => {
                        activeActivations = [];
                        snapshot.forEach(childSnapshot => {
                            activeActivations.push({ id: childSnapshot.key, ...childSnapshot.val() });
                        });
                        populateCalamityAreaDropdown();
                    }, error => {
                        console.error("Error listening for all active activations:", error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to load active operations. Please try again.'
                        });
                    });
                }
            }).catch(error => {
                console.error('Error fetching user data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to fetch user group. Please try again.'
                });
            });

        } else {
            console.warn('No user is logged in');
            window.location.href = '../pages/login.html';
        }
    });

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-CA'); //YYYY-MM-DD
    dateOfReportInput.value = formattedDate;

    // Generate random report ID
    const idInput = document.getElementById('reportId');
    if (idInput) {
        const randomId = 'ABRN' + Math.floor(10000 + Math.random() * 9000000000);
        idInput.value = randomId;
    }

    if (pinBtn && mapModal && closeBtn) {
        pinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            mapModal.classList.add('show');
            // Initialize the map when the modal is opened (if not already initialized)
            if (!map) {
                initMap();
            }
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
        console.warn('Modal elements (pinBtn, mapModal, closeBtn) not found. Map functionality may be impaired.');
    }

    nextBtn.addEventListener('click', () => {
        if (!formPage1.checkValidity()) {
            formPage1.reportValidity();
            return;
        }

        const startDateValue = startDateInput.value;
        const endDateValue = endDateInput.value;

        if (!startDateValue || !endDateValue) {
            alert("Please fill in both Start Date and End Date.");
            if (!startDateValue) {
                startDateInput.focus();
            } else {
                endDateInput.focus();
            }
            return;
        }

        const startDate = new Date(startDateValue + 'T00:00:00');
        const endDate = new Date(endDateValue + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneYearFromNow = new Date(today);
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Date',
                text: 'Invalid date entered. Please use the date picker to select valid dates.'
            });
            if (isNaN(startDate.getTime())) startDateInput.focus();
            else endDateInput.focus();
            return;
        }

        if (startDate > today) {
            Swal.fire({
                icon: 'warning',
                title: 'Future Start Date',
                text: 'Start Date cannot be a future date.'
            });
            startDateInput.focus();
            return;
        }

        if (startDate > endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Date Order Error',
                text: 'Start Date cannot be after End Date.'
            });
            startDateInput.focus();
            return;
        }

        if (endDate > oneYearFromNow) {
            Swal.fire({
                icon: 'warning',
                title: 'Excessive End Date',
                text: 'End Date cannot be more than 1 year from today. Please enter a valid date range.'
            });
            endDateInput.focus();
            return;
        }

        formPage1.style.display = "none";
        formPage2.style.display = "block";
    });

    backBtn.addEventListener('click', () => {
        formPage2.style.display = "none";
        formPage1.style.display = "block";
    });

    formPage2.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!userUid) {
            console.error('No user UID available. Cannot submit report.');
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'User not authenticated. Please log in again.'
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
            return;
        }

        const formData = {
            // VolunteerGroupName: volunteerGroupName,
            userUid: userUid,
            AreaOfOperation: areaOfOperationInput.value,
            CalamityAreaId: calamityAreaDropdown.value,
            TimeOfIntervention: completionTimeInput.value,
            DateOfReport: dateOfReportInput.value,
            ReportID: reportIdInput.value,
            StartDate: startDateInput.value,
            EndDate: endDateInput.value,
            NoOfIndividualsOrFamilies: numIndividualsFamiliesInput.value,
            NoOfFoodPacks: numFoodPacksInput.value,
            NoOfHotMeals: numHotMealsInput.value,
            LitersOfWater: litersWaterInput.value,
            NoOfVolunteersMobilized: numVolunteersInput.value,
            NoOfOrganizationsActivated: numOrganizationsInput.value,
            TotalValueOfInKindDonations: valueInKindInput.value,
            TotalMonetaryDonations: monetaryDonationsInput.value,
            NotesAdditionalInformation: notesInfoTextarea.value,
            Status: "Pending"
        };

        localStorage.setItem("reportData", JSON.stringify(formData));
        window.location.href = "../pages/reportsSummary.html";
    });

    const returnTo = localStorage.getItem("returnToStep");

    if (returnTo === "form-container-1") {
        formPage1.style.display = "block";
        formPage2.style.display = "none";
        
        const savedData = JSON.parse(localStorage.getItem("reportData"));
        if (savedData) {
            areaOfOperationInput.value = savedData.AreaOfOperation || '';
            if (savedData.CalamityAreaId) {
                calamityAreaDropdown.value = savedData.CalamityAreaId;
                if (calamityAreaDropdown.value) {
                    calamityAreaDropdown.dispatchEvent(new Event('change'));
                }
            }
            completionTimeInput.value = savedData.TimeOfIntervention || '';
            dateOfReportInput.value = savedData.DateOfReport || '';
            reportIdInput.value = savedData.ReportID || '';
            startDateInput.value = savedData.StartDate || '';
            endDateInput.value = savedData.EndDate || '';
            numIndividualsFamiliesInput.value = savedData.NoOfIndividualsOrFamilies || '';
            numFoodPacksInput.value = savedData.NoOfFoodPacks || '';
            numHotMealsInput.value = savedData.NoOfHotMeals || '';
            litersWaterInput.value = savedData.LitersOfWater || '';
            numVolunteersInput.value = savedData.NoOfVolunteersMobilized || '';
            numOrganizationsInput.value = savedData.NoOfOrganizationsActivated || '';
            valueInKindInput.value = savedData.TotalValueOfInKindDonations || '';
            monetaryDonationsInput.value = savedData.TotalMonetaryDonations || '';
            notesInfoTextarea.value = savedData.NotesAdditionalInformation || '';
        }

        localStorage.removeItem("returnToStep");
    } else {
        formPage1.style.display = "block";
        formPage2.style.display = "none";
    }
});