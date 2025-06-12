
let map;
let markers = [];
let autocomplete;

function initMap() {
    // Default to Manila, Philippines
    const defaultLocation = { lat: 14.5995, lng: 120.9842 };

    // Initialize the map
    map = new google.maps.Map(document.getElementById("mapContainer"), {
        center: defaultLocation,
        zoom: 10,
        mapTypeId: "roadmap",
    });

    // Initialize the search bar with Places Autocomplete
    const searchInput = document.getElementById("search-input");
    autocomplete = new google.maps.places.Autocomplete(searchInput);
    autocomplete.bindTo("bounds", map);

    // When a place is selected from the autocomplete dropdown
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            Swal.fire({
                icon: "error",
                title: "Location Not Found",
                text: "Please select a valid location from the dropdown.",
            });
            return;
        }

        // Center the map on the selected location
        map.setCenter(place.geometry.location);
        map.setZoom(16);

        // Clear existing markers
        clearMarkers();

        // Add a marker at the selected location
        const marker = new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name,
        });
        markers.push(marker);
        // Add an info window
        const infowindow = new google.maps.InfoWindow({
            content: `<strong>${place.name}</strong><br>${place.formatted_address}`,
        });
        marker.addListener("click", () => {
            infowindow.open(map, marker);
        });
        infowindow.open(map, marker);

        // Populate the AreaOfOperation input with the selected location
        const areaOfOperationInput = document.getElementById('inKindDonorAddress');
        if (areaOfOperationInput) {
            areaOfOperationInput.value = place.formatted_address;
        }

        // Close the modal after selecting a location
        const mapModal = document.getElementById('mapModal');
        if (mapModal) {
            mapModal.classList.remove('show');
        }
    });

    // Allow pinning a location by clicking on the map
    map.addListener("click", (event) => {
        // Clear existing markers
        clearMarkers();

        // Add a new marker at the clicked location
        const marker = new google.maps.Marker({
            position: event.latLng,
            map: map,
            title: "Pinned Location",
        });
        markers.push(marker);

        // Use Geocoder to get the address from the coordinates
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: event.latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
                const address = results[0].formatted_address;

                // Add an info window
                const infowindow = new google.maps.InfoWindow({
                    content: `Pinned Location<br>${address}`,
                });
                marker.addListener("click", () => {
                    infowindow.open(map, marker);
                });
                infowindow.open(map, marker);

                // Populate the AreaOfOperation input with the pinned location
                const areaOfOperationInput = document.getElementById('inKindDonorAddress');
                if (areaOfOperationInput) {
                    areaOfOperationInput.value = address;
                }

                // Close the modal after pinning a location
                const mapModal = document.getElementById('mapModal');
                if (mapModal) {
                    mapModal.classList.remove('show');
                }
            } else {
                console.error("Geocoder failed due to: " + status);
                Swal.fire({
                    icon: "error",
                    title: "Geocoding Error",
                    text: "Unable to retrieve address for the pinned location.",
                });

                // Fallback: Use coordinates if geocoding fails
                const areaOfOperationInput = document.getElementById('inKindDonorAddress');
                if (areaOfOperationInput) {
                    areaOfOperationInput.value = `Lat: ${event.latLng.lat()}, Lng: ${event.latLng.lng()}`;
                }

                const mapModal = document.getElementById('mapModal');
                if (mapModal) {
                    mapModal.classList.remove('show');
                }
            }
        });

        // Center the map on the pinned location
        map.setCenter(event.latLng);
        map.setZoom(16);
    });

    // Get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                // Center the map on the user's location
                map.setCenter(userLocation);
                map.setZoom(16);

                // Add a marker for the user's location
                const marker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "You are here",
                    icon: {
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png", // A more common blue dot icon
                    },
                });
                markers.push(marker);

                // Add an info window
                const infowindow = new google.maps.InfoWindow({
                    content: "You are here",
                });
                marker.addListener("click", () => {
                    infowindow.open(map, marker);
                });
                infowindow.open(map, marker);

                console.log("User location:", userLocation);
            },
            (error) => {
                console.error("Geolocation error:", error);
                let errorMessage = "Unable to retrieve your location.";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location access denied. Please allow location access in your browser settings.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable. Ensure your device has a working GPS or network connection.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out. Please try again.";
                        break;
                }
                Swal.fire({
                    icon: "error",
                    title: "Location Error",
                    text: errorMessage,
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    } else {
        Swal.fire({
            icon: "error",
            title: "Geolocation Not Supported",
            text: "Your browser does not support geolocation. Please use a modern browser.",
        });
    }
}

// Function to clear all markers from the map
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app();
}

const database = firebase.database();
const storage = firebase.storage();
const gcashDetailsBtn = document.getElementById('gcashDetails');
const bankDetailsBtn = document.getElementById('bankDetails');
const gcashDiv = document.getElementById('gcashDiv');
const bankDiv = document.getElementById('bankDiv');

let currentUserUid = null;
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUserUid = user.uid;
        console.log("Authenticated user UID:", currentUserUid);
    } else {
        currentUserUid = null;
        console.log("No user is currently authenticated.");
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const inKindBtn = document.getElementById('inKindBtn');
    const monetaryBtn = document.getElementById('monetaryBtn');
    const inKindDonationForm = document.getElementById('inKindDonationForm');
    const monetaryDonationForm = document.getElementById('monetaryDonationForm');
    const monetaryNumberInput = document.getElementById('monetaryNumber');
    const inKindContactNumberInput = document.getElementById('inKindContactNumber');
    const amountDonatedInput = document.getElementById('amountDonated');
    const cashInvoiceInput = document.getElementById('cashInvoice');
    const bankSelect = document.getElementById('bank');

      // Map modal elements (assuming these exist in your HTML)
    const pinBtn = document.getElementById('pinBtn'); // Ensure this element exists
    const mapModal = document.getElementById('mapModal'); // Ensure this element exists
    const closeBtn = document.querySelector('.closeBtn'); // Reverted to querySelector for flexibility as in first version


    if (inKindBtn && monetaryBtn && inKindDonationForm && monetaryDonationForm) {
        inKindBtn.addEventListener('click', () => {
            console.log("In Kind button clicked. Showing In Kind form.");
            inKindDonationForm.style.display = 'block';
            monetaryDonationForm.style.display = 'none';
        });

        monetaryBtn.addEventListener('click', () => {
            console.log("Monetary button clicked. Showing Monetary form.");
            monetaryDonationForm.style.display = 'block';
            inKindDonationForm.style.display = 'none';
        });
    } else {
        console.error("One or more required elements (buttons or forms) not found in the DOM. Check your HTML IDs.");
    }

    // --- Number Input Validation (11 digits, starts with 09) ---
    const validatePhoneNumber = (inputElement) => {
        // Only allow digits and handle auto-09 prefix on initial type
        inputElement.addEventListener('input', () => {
            let value = inputElement.value.replace(/\D/g, ''); // Remove non-digits
            
            // Auto-prefix with 09 if the first digit is 9 (common for mobile numbers)
            if (value.length === 1 && value.charAt(0) === '9') {
                value = '0' + value;
            } else if (value.length > 0 && !value.startsWith('09')) {
                // If it doesn't start with 09, try to correct it, but don't force if user is typing something else
                // This is a more lenient auto-correction
                if (value.length >= 2 && value.substring(0, 2) !== '09') {
                    // If they type 639..., try to fix it to 09...
                    if (value.startsWith('63')) {
                        value = '0' + value.substring(2);
                    } else {
                        // For any other non-09 start, just keep it, validation on blur will catch it
                    }
                }
            }

            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            inputElement.value = value;
        });

        // The alert will only trigger on blur if the number is invalid
        inputElement.addEventListener('blur', () => {
            const value = inputElement.value;
            if (value.length !== 11 || !value.startsWith('09')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Number Format',
                    text: 'Please enter an 11-digit mobile number starting with 09 (e.g., 09171234567).'
                });
                // Optionally, clear the field or leave it for the user to correct
                // inputElement.value = ''; 
            }
        });
    };

    if (monetaryNumberInput) {
        validatePhoneNumber(monetaryNumberInput);
    }
    if (inKindContactNumberInput) {
        validatePhoneNumber(inKindContactNumberInput);
    }

    // --- Amount Donated Formatting ---
    if (amountDonatedInput) {
        amountDonatedInput.addEventListener('input', (event) => {
            let value = event.target.value.replace(/,/g, ''); // Remove existing commas

            // Check if the value is empty or not a valid number before formatting
            if (value === '' || isNaN(value)) {
                event.target.value = ''; // Clear if not a number
                return;
            }

            // Convert to a number, then format back to string with commas
            event.target.value = Number(value).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        });
    }

    // --- Cash Invoice Random Generation ---
    if (cashInvoiceInput) {
        const generateCashInvoice = () => {
            const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
            return `CINV-${randomNumber}`;
        };
        cashInvoiceInput.value = generateCashInvoice();
        // You might want to disable the input if it's auto-generated
        cashInvoiceInput.setAttribute('readonly', true);
    }

    if (inKindDonationForm) {
        inKindDonationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const inKindEncoder = document.getElementById('inKindEncoder').value;
            const inKindDonorName = document.getElementById('inKindDonorName').value;
            const inKindDonorType = document.getElementById('inKindDonorType').value;
            const inKindDonorAddress = document.getElementById('inKindDonorAddress').value;
            const inKindContactPerson = document.getElementById('inKindContactPerson').value;
            const inKindContactNumber = document.getElementById('inKindContactNumber').value; // Validated
            const inKindDonorEmail = document.getElementById('inKindDonorEmail').value;
            const itemType = document.getElementById('itemType').value;
            const value = document.getElementById('value').value;
            const description = document.getElementById('description').value;
            const status = document.getElementById('status').value;
            const staffIncharge = document.getElementById('staffIncharge').value;
            const donationDate = document.getElementById('donationDate').value;

            if (!inKindDonorName || !itemType || !value || !donationDate) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Please fill in all required fields for In Kind Donation (Donor Name, Type of Assistance, Valuation, and Donation Date).'
                });
                return;
            }

            // Validate inKindContactNumber again for submission
            if (inKindContactNumber.length !== 11 || !inKindContactNumber.startsWith('09')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Contact Number',
                    text: 'Please ensure the In-Kind Contact Number is an 11-digit mobile number starting with 09.'
                });
                return;
            }

            const newDonationRef = database.ref('pendingInkind').push();
            const newDonationId = newDonationRef.key;

            const newInKindDonation = {
                id: newDonationId,
                userUid: currentUserUid,
                encoder: inKindEncoder,
                name: inKindDonorName,
                type: inKindDonorType,
                address: inKindDonorAddress,
                contactPerson: inKindContactPerson,
                number: inKindContactNumber,
                email: inKindDonorEmail,
                assistance: itemType,
                valuation: parseFloat(value) || 0,
                additionalnotes: description,
                status: status || 'pending',
                staffIncharge: staffIncharge,
                donationDate: donationDate,
                createdAt: new Date().toISOString()
            };

            try {
                await newDonationRef.set(newInKindDonation);
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'In Kind Donation submitted successfully.'
                });
                inKindDonationForm.reset();
            } catch (error) {
                console.error("Error submitting in-kind donation to Firebase:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `Failed to submit In Kind Donation. Please try again.<br>Error: ${error.message}`
                });
            }
        });
    }

    if (gcashDiv) gcashDiv.style.display = 'none';
    if (bankDiv) bankDiv.style.display = 'none';

    if (gcashDetailsBtn && bankDetailsBtn && gcashDiv && bankDiv) {
        gcashDetailsBtn.addEventListener('click', () => {
            gcashDiv.style.display = 'block';
            bankDiv.style.display = 'none';
        });

        bankDetailsBtn.addEventListener('click', () => {
            bankDiv.style.display = 'block';
            gcashDiv.style.display = 'none';
        });
    }

        // --- Modal Elements and Event Listeners ---
    if (pinBtn && mapModal && closeBtn) {
        pinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Pin button clicked!");
            mapModal.classList.add('show');
            console.log("mapModal classList:", mapModal.classList);
            // Initialize the map when the modal is opened (if not already initialized)
            if (!map) {
                initMap();
            } else {
                // If map already exists, just resize it to fit the modal
                setTimeout(() => {
                    if (map) {
                        google.maps.event.trigger(map, 'resize');
                        // Center map to current area of operation if available
                        const currentArea = areaOfOperationInput.value;
                        if (currentArea) {
                            const geocoder = new google.maps.Geocoder();
                            geocoder.geocode({ 'address': currentArea }, (results, status) => {
                                if (status === 'OK' && results[0]) {
                                    map.setCenter(results[0].geometry.location);
                                    // Clear existing markers and add a new one for the current area
                                    markers.forEach((marker) => marker.setMap(null));
                                    markers = [];
                                    const marker = new google.maps.Marker({
                                        map: map,
                                        position: results[0].geometry.location,
                                        title: currentArea,
                                    });
                                    markers.push(marker);
                                }
                            });
                        } else {
                            // If no area of operation, center on Philippines
                            map.setCenter({ lat: 12.8797, lng: 121.7740 });
                            map.setZoom(6);
                        }
                    }
                }, 100); // Small delay to allow modal to render
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

    if (monetaryDonationForm) {
        console.log("Monetary Donation Form element found.");
        monetaryDonationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Monetary form submitted event triggered!");

            const monetaryEncoder = document.getElementById('monetaryEncoder').value;
            const monetaryDonorName = document.getElementById('monetaryDonorName').value;
            const monetaryLocation = document.getElementById('monetaryLocation').value;
            const monetaryNumber = document.getElementById('monetaryNumber').value; // Validated
            const amountDonated = document.getElementById('amountDonated').value.replace(/,/g, ''); // Remove commas for submission
            const cashInvoice = document.getElementById('cashInvoice').value; // Auto-generated
            const monetaryDonationDate = document.getElementById('monetaryDonationDate').value;
            const monetaryEmail = document.getElementById('monetaryEmail').value;
            const bank = document.getElementById('bank').value; // Dropdown value
            const proofofTransferFile = document.getElementById('proofofTransfer').value;


            console.log("Collected values:", {
                monetaryEncoder, monetaryDonorName, monetaryLocation, monetaryNumber,
                amountDonated, cashInvoice, monetaryDonationDate, monetaryEmail, bank,
                proofofTransferFile: proofofTransferFile ? proofofTransferFile.name : 'No file selected'
            });

            if (!monetaryDonorName || !amountDonated || !monetaryDonationDate) {
                console.warn("Validation failed: Required fields are empty.");
                Swal.fire({
                    icon: 'error',
                    title: 'Missing Information',
                    text: 'Please fill in all required fields for Monetary Donation (Name/Company, Amount Donated, and Date Received).'
                });
                return;
            }

            // Validate monetaryNumber again for submission
            if (monetaryNumber.length !== 11 || !monetaryNumber.startsWith('09')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Contact Number',
                    text: 'Please ensure the Monetary Contact Number is an 11-digit mobile number starting with 09.'
                });
                return;
            }

            const proofofTransferText = document.getElementById('proofofTransfer').value;

            let proofOfTransferUrl = proofofTransferText;

            const newMonetaryDonation = {
                userUid: currentUserUid,
                encoder: monetaryEncoder,
                name: monetaryDonorName,
                address: monetaryLocation,
                number: monetaryNumber,
                amountDonated: parseFloat(amountDonated) || 0,
                invoice: cashInvoice,
                dateReceived: monetaryDonationDate,
                email: monetaryEmail,
                bank: bank,
                proof: proofOfTransferUrl,
                createdAt: new Date().toISOString()
            };

            console.log("Data to be written to Firebase:", newMonetaryDonation);
            try {
                const newDonationRef = database.ref('pendingMonetary').push();
                await newDonationRef.set(newMonetaryDonation);

                console.log("Monetary donation successfully written to Realtime Database.");
                Swal.fire({
                    icon: 'success',
                    title: 'Donation Submitted!',
                    text: 'Your monetary donation has been successfully recorded. Thank you for your generosity!'
                });

                monetaryDonationForm.reset();
                if (gcashDiv) gcashDiv.style.display = 'none';
                if (bankDiv) bankDiv.style.display = 'none';
                // Regenerate cash invoice for the next potential donation
                if (cashInvoiceInput) {
                    const generateCashInvoice = () => {
                        const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
                        return `CINV-${randomNumber}`;
                    };
                    cashInvoiceInput.value = generateCashInvoice();
                }

            } catch (error) {
                console.error("Error submitting monetary donation to Firebase Realtime Database:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Submission Failed',
                    text: `There was an error submitting your donation. Please try again.<br>Error: ${error.message}`
                });
            }
        });
    } else {
        console.error("ERROR: Monetary Donation Form element with ID 'monetaryDonationForm' not found!");
    }
});

const donationButtons = document.querySelectorAll('.donation-buttons button');

donationButtons.forEach(button => {
    button.addEventListener('click', () => {
        donationButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});


const buttons = document.querySelectorAll('.gcash-btn, .banktrans-btn');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
