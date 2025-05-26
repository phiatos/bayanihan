// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    authDomain: "bayanihan-5ce7e.firebaseapp.com",
    databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bayanihan-5ce7e",
    storageBucket: "bayanihan-5ce7e.appspot.com",
    messagingSenderId: "593123849917",
    appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    measurementId: "G-ZTQ9VXXVV0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Data array to store fetched volunteer groups (for modal dropdown)
let allVolunteerGroups = [];
// Data array to store CURRENTLY ACTIVE activation records for table display
let currentActiveActivations = [];

const calamityOptions = [
    "Select Calamity", "Typhoon", "Earthquake", "Flood", "Volcanic Eruption", "Landslide", "Tsunami"
];

let currentPage = 1;
const rowsPerPage = 5;

const tableBody = document.querySelector("#orgTable tbody");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const entriesInfo = document.querySelector("#entriesInfo");
const paginationContainer = document.querySelector("#pagination");
const clearBtn = document.querySelector('.clear-btn');
const addActivationBtn = document.getElementById("addActivationBtn");

// Modals and their elements
const activationModal = document.getElementById("activationModal");
const closeActivationModalBtn = document.getElementById("closeActivationModal"); // Specific close button for activation modal
const modalTitle = document.getElementById("modalTitle");

const endorseModal = document.getElementById("endorseModal"); // NEW: Endorse Modal element
const closeEndorseModalBtn = document.getElementById("closeEndorseModal"); // NEW: Close button for endorse modal


// Step 1 Elements
const modalStep1 = document.getElementById("modalStep1");
const selectGroupDropdown = document.getElementById("selectGroupDropdown");
const modalNextStepBtn = document.getElementById("modalNextStepBtn");

// Step 2 Elements
const modalStep2 = document.getElementById("modalStep2");
const selectedOrgName = document.getElementById("selectedOrgName");
const modalAreaInput = document.getElementById("modalAreaInput");
const modalCalamitySelect = document.getElementById("modalCalamitySelect");
const modalTyphoonNameInput = document.getElementById("modalTyphoonNameInput");
const modalActivateSubmitBtn = document.getElementById("modalActivateSubmitBtn");
const modalPrevStepBtn = document.getElementById("modalPrevStepBtn");

// NEW: Pin Location button element
const pinLocationBtn = document.getElementById("pinLocationBtn");


let selectedGroupForActivation = null; // Stores the group object selected in Step 1

// Monitor authentication state and fetch data only when authenticated
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        console.log("User is authenticated:", user.uid);
        listenForDataUpdates(); // Listen for both volunteerGroups and activations
    } else {
        console.log("No user is authenticated. Attempting anonymous sign-in...");
        firebase.auth().signInAnonymously()
            .then(() => {
                console.log("Signed in anonymously");
            })
            .catch(error => {
                console.error("Anonymous auth failed:", error.code, error.message);
                Swal.fire({
                    icon: 'error',
                    title: 'Authentication Error',
                    text: `Failed to authenticate: ${error.message}. Please check your network and Firebase configuration.`
                });
            });
    }
});

// Listen for real-time updates from Firebase
function listenForDataUpdates() {
    console.log("Setting up real-time listener for volunteerGroups...");
    database.ref("volunteerGroups").on("value", snapshot => {
        const fetchedGroups = snapshot.val();
        console.log("Volunteer groups data received:", fetchedGroups);

        allVolunteerGroups = [];
        if (fetchedGroups) {
            for (let key in fetchedGroups) {
                allVolunteerGroups.push({
                    no: parseInt(key),
                    organization: fetchedGroups[key].organization || "Unknown",
                    hq: fetchedGroups[key].hq || "Not specified",
                    contactPerson: fetchedGroups[key].contactPerson || "Unknown",
                    email: fetchedGroups[key].email || "Not specified",
                    mobileNumber: fetchedGroups[key].mobileNumber || "Not specified",
                });
            }
            allVolunteerGroups.sort((a, b) => a.no - b.no);
        }
        populateGroupDropdown(); // Populate dropdown with all groups
    }, error => {
        console.error("Error listening for volunteerGroups:", error.code, error.message);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to load volunteer groups: ${error.message}`
        });
    });

    console.log("Setting up real-time listener for activations...");
    database.ref("activations").orderByChild("activationDate").on("value", snapshot => {
        const fetchedActivations = snapshot.val();
        console.log("Activations data received:", fetchedActivations);

        currentActiveActivations = [];
        if (fetchedActivations) {
            for (let key in fetchedActivations) {
                const activation = fetchedActivations[key];
                // Only display active activations in the main table
                if (activation.status === 'active') {
                    // Find the corresponding volunteer group for additional details
                    const volunteerGroup = allVolunteerGroups.find(group => group.no === activation.groupId);

                    currentActiveActivations.push({
                        id: key,
                        groupId: activation.groupId,
                        organization: activation.organization || "Unknown",
                        hq: activation.hq || "Not specified",
                        areaOfOperation: activation.areaOfOperation || "Not specified",
                        calamity: activation.calamityType || "Typhoon",
                        typhoonName: activation.typhoonName || "",
                        status: activation.status,
                        activationDate: activation.activationDate,
                        // ADD THESE FIELDS by looking up in allVolunteerGroups
                        contactPerson: volunteerGroup ? volunteerGroup.contactPerson : "N/A",
                        email: volunteerGroup ? volunteerGroup.email : "N/A",
                        mobileNumber: volunteerGroup ? volunteerGroup.mobileNumber : "N/A",
                        // NEW: Add latitude and longitude if available from activation data
                        latitude: activation.latitude || null,
                        longitude: activation.longitude || null
                    });
                }
            }
            // Sort by activationDate (most recent first, or as desired)
            currentActiveActivations.sort((a, b) => new Date(b.activationDate) - new Date(a.activationDate));
        }
        renderTable();
    }, error => {
        console.error("Error listening for activations:", error.code, error.message);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to load activations: ${error.message}`
        });
    });
}

// Function to populate the group selection dropdown in the modal
function populateGroupDropdown() {
    selectGroupDropdown.innerHTML = '<option value="">-- Select an Organization --</option>';
    allVolunteerGroups.forEach(group => {
        const option = document.createElement("option");
        option.value = group.no;
        option.textContent = `${group.organization} (${group.hq})`;
        selectGroupDropdown.appendChild(option);
    });
}

// Render Table (MODIFIED to include Endorse button and new columns)
function renderTable(filteredData = currentActiveActivations) { // Default to currentActiveActivations
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);

    if (pageData.length === 0 && filteredData.length > 0 && currentPage > 1) {
        currentPage--;
        renderTable(filteredData); // Re-render if current page becomes empty
        return;
    } else if (pageData.length === 0 && filteredData.length === 0) {
        const noDataRow = document.createElement("tr");
        noDataRow.innerHTML = `<td colspan="9" style="text-align: center;">No active group activations to display.</td>`; // Adjusted colspan
        tableBody.appendChild(noDataRow);
    }

    pageData.forEach((row, index) => { // Use original index for 'No.' display
        const tr = document.createElement("tr");

        let calamityDisplay = row.calamity;
        if (row.calamity === "Typhoon" && row.typhoonName) {
            calamityDisplay += ` (${row.typhoonName})`;
        }

        tr.innerHTML = `
            <td>${start + index + 1}</td>
            <td>${row.organization}</td>
            <td>${row.hq}</td>
            <td>${row.areaOfOperation || 'N/A'}</td>
            <td>${row.contactPerson || 'N/A'}</td>
            <td>${row.email || 'N/A'}</td>
            <td>${row.mobileNumber || 'N/A'}</td>
            <td>${calamityDisplay || 'N/A'}</td>
            <td><span class="status-circle ${row.status === "active" ? "green" : "red"}"></span> ${row.status}</td>
            <td>
                <button class="action-button-endorse-button" data-activation-id="${row.id}" data-group-id="${row.groupId}">Send Relief Assistance</button>
                <button class="action-button" data-activation-id="${row.id}" data-group-id="${row.groupId}">Deactivate</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;

    renderPagination(filteredData.length);
}

// Search Functionality (now searches currentActiveActivations)
function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    clearBtn.style.display = query ? 'flex' : 'none';

    currentPage = 1; // Reset to first page on search
    renderTable(filterAndSort());
}

// Clear search input and reset table
function clearDInputs() {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    currentPage = 1;
    renderTable(filterAndSort());
    searchInput.focus();
}

// Initialize clear button visibility
clearBtn.style.display = 'none';

// Attach search input event listener
searchInput.addEventListener('input', handleSearch);

// MODAL FUNCTIONS - ACTIVATION MODAL
function openAddActivationModal() {
    modalTitle.textContent = "Add New Activation";
    modalStep1.classList.add('active');
    modalStep2.classList.remove('active');
    selectGroupDropdown.value = ""; // Reset dropdown
    modalNextStepBtn.disabled = true; // Disable next button initially
    selectedGroupForActivation = null; // Clear selected group
    resetModalStep2Fields(); // Clear fields in step 2
    populateGroupDropdown(); // Ensure dropdown is fresh
    activationModal.style.display = "flex"; // Show the modal
}

function resetModalStep2Fields() {
    selectedOrgName.textContent = "";
    modalAreaInput.value = ""; // Reset input field
    modalCalamitySelect.innerHTML = calamityOptions
        .map((opt, index) => {
            if (index === 0) {
                return `<option value="" disabled selected>-- Select Calamity Type --</option>`;
            }
            return `<option value="${opt}">${opt}</option>`;
        })
        .join("");
    modalTyphoonNameInput.style.display = "none";
    modalTyphoonNameInput.value = "";
    // Clear any previously set coordinates (if you were storing them in the input)
    // For example: modalAreaInput.dataset.latitude = '';
    // For example: modalAreaInput.dataset.longitude = '';
}

function showStep1() {
    modalTitle.textContent = "Add New Activation";
    modalStep1.classList.add('active');
    modalStep2.classList.remove('active');
    selectedGroupForActivation = null;
    modalNextStepBtn.disabled = true;
    selectGroupDropdown.value = ""; // Reset dropdown selection
    resetModalStep2Fields();
    populateGroupDropdown(); // Re-populate dropdown just in case
}

function showStep2() {
    if (!selectedGroupForActivation) {
        Swal.fire({
            icon: 'warning',
            title: 'No Group Selected',
            text: 'Please select an organization before proceeding.'
        });
        return;
    }
    modalStep1.classList.remove('active');
    modalStep2.classList.add('active');

    // Populate Calamity Select (always fresh)
    modalCalamitySelect.innerHTML = calamityOptions
        .map((opt, index) => {
            if (index === 0) {
                return `<option value="" disabled selected>-- Select Calamity Type --</option>`;
            }
            return `<option value="${opt}">${opt}</option>`;
        })
        .join("");
    modalTyphoonNameInput.style.display = "none";
    modalTyphoonNameInput.value = "";

    // Reset area input
    modalAreaInput.value = "";
}

// Renamed for clarity to avoid conflict with a new closeModal for endorseModal
function closeActivationModal() {
    activationModal.style.display = "none";
    selectedGroupForActivation = null; // Clear selected group
    showStep1(); // Always reset to step 1 when closing
}

// Event Listeners for Activation Modal Flow (updated close button)
addActivationBtn.addEventListener("click", openAddActivationModal); // Opens step 1
closeActivationModalBtn.addEventListener("click", closeActivationModal); // Use specific close button

// Close modal when clicking outside of it
window.addEventListener("click", (event) => {
    if (event.target === activationModal) {
        closeActivationModal();
    }
});

selectGroupDropdown.addEventListener("change", (e) => {
    const selectedId = parseInt(e.target.value);
    selectedGroupForActivation = allVolunteerGroups.find(group => group.no === selectedId) || null;
    modalNextStepBtn.disabled = !selectedGroupForActivation;
});

modalNextStepBtn.addEventListener("click", showStep2);
modalPrevStepBtn.addEventListener("click", showStep1);

// Handle Calamity Type Change in Modal (Step 2)
modalCalamitySelect.addEventListener("change", () => {
    if (modalCalamitySelect.value === "Typhoon") {
        modalTyphoonNameInput.style.display = "inline-block";
    } else {
        modalTyphoonNameInput.style.display = "none";
        modalTyphoonNameInput.value = "";
    }
});

// NEW: Event Listener for Pin Location Button
pinLocationBtn.addEventListener("click", () => {
    // This is where you would integrate your mapping API logic.
    // For now, it's just a placeholder alert.

    const currentArea = modalAreaInput.value.trim();
    Swal.fire({
        title: 'Pin Location',
        html: `You clicked Pin Location for: <strong>${currentArea || 'No area entered yet'}</strong>.<br><br>
               (Here, you would typically open a map interface, allow the user to select a point,
               and then populate hidden latitude/longitude fields or directly update the activation record.)`,
        icon: 'info',
        confirmButtonText: 'Got It!'
    });

    // Example of how you might get coords (requires user permission, async)
    // navigator.geolocation.getCurrentPosition(position => {
    //     const lat = position.coords.latitude;
    //     const lng = position.coords.longitude;
    //     console.log("Current Lat:", lat, "Lng:", lng);
    //     // You might want to store these in hidden inputs or data attributes
    //     // modalAreaInput.dataset.latitude = lat;
    //     // modalAreaInput.dataset.longitude = lng;
    // }, error => {
    //     console.error("Geolocation error:", error);
    //     Swal.fire({
    //         icon: 'error',
    //         title: 'Geolocation Failed',
    //         text: 'Could not get your current location.'
    //     });
    // });
});


// Submit Activation in Modal (Step 2)
modalActivateSubmitBtn.addEventListener("click", async () => {
    if (!selectedGroupForActivation) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No organization selected for activation.' });
        return;
    }

    // Get area from the text input and trim whitespace
    const areaOfOperation = modalAreaInput.value.trim();
    const calamityType = modalCalamitySelect.value;
    const typhoonName = (calamityType === "Typhoon") ? modalTyphoonNameInput.value.trim() : "";

    // NEW: Get latitude and longitude if you implemented it via the pin location button
    // const latitude = modalAreaInput.dataset.latitude || null;
    // const longitude = modalAreaInput.dataset.longitude || null;


    if (!areaOfOperation) { // Validate that the area input is not empty
        Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter an Area of Operations.' });
        return;
    }
    if (!calamityType || calamityType === "Select Calamity") {
        Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please select a Calamity Type.' });
        return;
    }
    if (calamityType === "Typhoon" && !typhoonName) {
        Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter the Typhoon Name.' });
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) {
        Swal.fire({ icon: 'error', title: 'Authentication Error', text: 'User not authenticated. Please refresh the page and try again.' });
        return;
    }

    // --- UPDATED VALIDATION LOGIC FOR FREE-TEXT AREA ---
    // Query for existing active activations for the selected group
    const existingActiveQuery = database.ref("activations")
        .orderByChild("groupId")
        .equalTo(selectedGroupForActivation.no);

    try {
        const snapshot = await existingActiveQuery.once("value");
        let alreadyActiveInAreaForCalamity = false;

        snapshot.forEach(childSnapshot => {
            const activation = childSnapshot.val();
            // Compare the input area of operation (case-insensitive and trimmed)
            // and calamity type with existing active operations for the same group.
            if (activation.status === "active" &&
                activation.areaOfOperation.toLowerCase() === areaOfOperation.toLowerCase() &&
                activation.calamityType.toLowerCase() === calamityType.toLowerCase()) {
                alreadyActiveInAreaForCalamity = true;
                return true; // Break out of forEach
            }
        });

        if (alreadyActiveInAreaForCalamity) {
            Swal.fire({
                icon: 'warning',
                title: 'Activation Conflict',
                text: `${selectedGroupForActivation.organization} is already active for "${calamityType}" in "${areaOfOperation}". 
                Please deactivate the existing operation for this calamity in this area first, or select a different area or calamity type.`
            });
            return; // Stop the function here
        }
    } catch (error) {
        console.error("Error checking for existing activations:", error);
        Swal.fire({
            icon: 'error',
            title: 'Database Error',
            text: 'Could not check for existing activations. Please try again.'
        });
        return; // Stop the function here
    }
    // --- END UPDATED VALIDATION LOGIC ---


    const newActivationRecord = {
        groupId: selectedGroupForActivation.no,
        organization: selectedGroupForActivation.organization, // Denormalize
        hq: selectedGroupForActivation.hq, // Denormalize
        areaOfOperation: areaOfOperation, // This is now free-text
        calamityType: calamityType,
        typhoonName: typhoonName,
        status: "active",
        activationDate: new Date().toISOString(), // Store ISO string for easy sorting/comparison
        // NEW: Add latitude and longitude to the activation record if you're collecting them
        // latitude: latitude,
        // longitude: longitude
    };

    console.log("Adding new activation record:", newActivationRecord);
    database.ref("activations").push(newActivationRecord)
        .then(() => {
            console.log("New activation record successfully added.");
            Swal.fire({
                icon: 'success',
                title: 'Activated!',
                text: `${selectedGroupForActivation.organization} has been activated for ${calamityType} in ${areaOfOperation}.`
            });
            closeActivationModal();
        })
        .catch(error => {
            console.error("Error adding new activation record to Firebase:", error.code, error.message);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Failed to activate group: ${error.message}`
            });
        });
});

// NEW: Endorse Modal Functions
function openEndorseModal() {
    endorseModal.style.display = "flex";
}

function closeEndorseModal() {
    endorseModal.style.display = "none";
}

// NEW: Event Listener for Endorse Modal Close Button
closeEndorseModalBtn.addEventListener("click", closeEndorseModal);

// NEW: Event Listener for clicking outside the Endorse Modal
window.addEventListener("click", (event) => {
    if (event.target === endorseModal) {
        closeEndorseModal();
    }
});

// Deactivate Group (from table) - MODIFIED to handle two button types
tableBody.addEventListener("click", e => {
    const btn = e.target;
    const activationId = btn.getAttribute('data-activation-id');
    const groupId = btn.getAttribute('data-group-id'); // Get these attributes once

    // **PRIORITIZE the more specific class first**
    if (btn.classList.contains("action-button-endorse-button")) {
        console.log(`Endorse button clicked for activation ID: ${activationId}, Group ID: ${groupId}`);
        openEndorseModal(); // Open the new endorse modal
    } else if (btn.classList.contains("action-button")) { // This will only be true for 'Deactivate' now
        // Handle Deactivate button click (existing logic)
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to deactivate this specific operation for group ID ${groupId}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes'
        }).then((result) => {
            if (result.isConfirmed) {
                const user = firebase.auth().currentUser;
                if (!user) {
                    Swal.fire({ icon: 'error', title: 'Authentication Error', text: 'User not authenticated. Please refresh the page and try again.' });
                    return;
                }

                const updates = {
                    status: "inactive",
                    deactivationDate: new Date().toISOString()
                };

                database.ref(`activations/${activationId}`).update(updates)
                    .then(() => {
                        Swal.fire(
                            'Deactivated!',
                            `The activation has been marked inactive.`,
                            'success'
                        );
                    })
                    .catch(error => {
                        console.error("Error deactivating activation record:", error.code, error.message);
                        Swal.fire({ icon: 'error', title: 'Error', text: `Failed to deactivate: ${error.message}` });
                    });
            }
        });
    }
});


function renderPagination(totalRows) {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const maxVisible = 5;

    const createButton = (label, page = null, disabled = false, active = false) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add("active-page");
        if (page !== null) {
            btn.addEventListener("click", () => {
                currentPage = page;
                renderTable(filterAndSort());
            });
        }
        return btn;
    };

    if (totalPages === 0) {
        return;
    }

    paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }

    paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
}


function filterAndSort() {
    let filtered = currentActiveActivations.filter(row => {
        const query = searchInput.value.trim().toLowerCase();
        return Object.values(row).some(val => {
            if (typeof val === 'string' || typeof val === 'number') {
                return val.toString().toLowerCase().includes(query);
            }
            return false;
        });
    });

    if (sortSelect.value) {
        filtered.sort((a, b) => {
            if (sortSelect.value === 'organization') {
                return a.organization.localeCompare(b.organization);
            } else if (sortSelect.value === 'hq') {
                return a.hq.localeCompare(b.hq);
            } else if (sortSelect.value === 'status') {
                const statusOrder = { 'active': 1, 'inactive': 2 };
                return statusOrder[a.status] - statusOrder[b.status];
            } else if (sortSelect.value === 'calamity') {
                return a.calamity.localeCompare(b.calamity);
            }
            return 0;
        });
    }

    return filtered;
}


sortSelect.addEventListener("change", () => {
    currentPage = 1;
    renderTable(filterAndSort());
});