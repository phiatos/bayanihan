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

        // Populate the inKindDonorAddress input with the selected location
        const inKindDonorAddressInput = document.getElementById('inKindDonorAddress');
        if (inKindDonorAddressInput) {
            inKindDonorAddressInput.value = place.formatted_address;
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

                // Populate the inKindDonorAddress input with the pinned location
                const inKindDonorAddressInput = document.getElementById('inKindDonorAddress');
                if (inKindDonorAddressInput) {
                    inKindDonorAddressInput.value = address;
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
                const inKindDonorAddressInput = document.getElementById('inKindDonorAddress');
                if (inKindDonorAddressInput) {
                    inKindDonorAddressInput.value = `Lat: ${event.latLng.lat()}, Lng: ${event.latLng.lng()}`;
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
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
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
    const inKindValuationInput = document.getElementById('valuation');
    const pinBtn = document.getElementById('pinBtn');
    const mapModal = document.getElementById('mapModal');
    const closeBtn = document.querySelector('.closeBtn');
    const inKindDonationDateInput = document.getElementById('donationDate');
    const monetaryDonationDateInput = document.getElementById('monetaryDonationDate');
    const referenceNumberInput = document.getElementById('referenceNumber');

    // Set default donation date to current date
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    if (inKindDonationDateInput) {
        inKindDonationDateInput.value = today;
    }
    if (monetaryDonationDateInput) {
        monetaryDonationDateInput.value = today;
    }

    // Footer visibility on scroll
    document.addEventListener("scroll", () => {
        const footer = document.querySelector(".footer");
        const scrollPosition = window.scrollY + window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        // Show footer when within 50px of the bottom
        if (scrollPosition >= documentHeight - 50) {
            footer.classList.add("visible");
        } else {
            footer.classList.remove("visible");
        }
    });

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

    // Phone Number Validation
    const validatePhoneNumber = (inputElement) => {
        inputElement.addEventListener('input', () => {
            let value = inputElement.value.replace(/\D/g, ''); 

            // Auto-prefix with 09 if the first digit is 9
            if (value.length === 1 && value.charAt(0) === '9') {
                value = '0' + value;
            } else if (value.length > 0 && !value.startsWith('09')) {
                if (value.startsWith('63')) {
                    value = '0' + value.substring(2);
                }
            }

            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            inputElement.value = value;
        });

        // Validate on blur only if field has at least one digit
        inputElement.addEventListener('blur', () => {
            const value = inputElement.value;
            if (value.length > 0 && (value.length !== 11 || !value.startsWith('09'))) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Number Format',
                    text: 'Please enter an 11-digit mobile number starting with 09 (e.g., 09171234567).'
                });
            }
        });
    };

    if (monetaryNumberInput) {
        validatePhoneNumber(monetaryNumberInput);
    }
    if (inKindContactNumberInput) {
        validatePhoneNumber(inKindContactNumberInput);
    }

    // Amount Donated Formatting (Monetary Form)
    if (amountDonatedInput) {
        amountDonatedInput.addEventListener('input', (event) => {
            let value = event.target.value.replace(/,/g, '');
            if (value === '' || isNaN(value)) {
                event.target.value = '';
                return;
            }
            const cursorPosition = event.target.selectionStart;
            const originalLength = event.target.value.length;
            event.target.value = Number(value).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
            const newLength = event.target.value.length;
            const cursorOffset = newLength - originalLength;
            event.target.setSelectionRange(cursorPosition + cursorOffset, cursorPosition + cursorOffset);
        });
    }

    // In-Kind Valuation Formatting
    if (inKindValuationInput) {
        inKindValuationInput.addEventListener('input', (event) => {
            let value = event.target.value.replace(/,/g, '');
            if (value === '' || isNaN(value)) {
                event.target.value = '';
                return;
            }
            const cursorPosition = event.target.selectionStart;
            const originalLength = event.target.value.length;
            event.target.value = Number(value).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
            const newLength = event.target.value.length;
            const cursorOffset = newLength - originalLength;
            event.target.setSelectionRange(cursorPosition + cursorOffset, cursorPosition + cursorOffset);
        });
    }

    // Cash Invoice Random Generation
    if (cashInvoiceInput) {
        const generateCashInvoice = () => {
            const randomNumber = Math.floor(100000 + Math.random() * 900000);
            return `CINV-${randomNumber}`;
        };
        cashInvoiceInput.value = generateCashInvoice();
        // Removed readonly attribute to make cashInvoice editable
    }

    // In-Kind Donation Form Submission
    if (inKindDonationForm) {
        inKindDonationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const inKindEncoder = document.getElementById('inKindEncoder').value;
            const inKindDonorName = document.getElementById('inKindDonorName').value;
            const inKindDonorType = document.getElementById('inKindDonorType').value;
            const inKindDonorAddress = document.getElementById('inKindDonorAddress').value;
            const inKindContactPerson = document.getElementById('inKindContactPerson').value;
            const inKindContactNumber = document.getElementById('inKindContactNumber').value;
            const inKindDonorEmail = document.getElementById('inKindDonorEmail').value;
            const itemType = document.getElementById('itemType').value;
            const value = document.getElementById('valuation').value.replace(/,/g, ''); // Remove commas for submission
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

            // Value Input Validation
            const parsedValue = parseFloat(value);
            if (isNaN(parsedValue) || parsedValue <= 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Valuation',
                    text: 'Please enter a valid positive number for Valuation.'
                });
                return;
            }

            // Date Validation: Donation Date cannot be a past date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedInKindDate = new Date(donationDate);
            selectedInKindDate.setHours(0, 0, 0, 0);
            if (selectedInKindDate < today) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Date',
                    text: 'Donation Date cannot be a past date. It must be today or a future date.'
                });
                return;
            }

            // Phone Number Validation (optional)
            if (inKindContactNumber.length > 0 && (inKindContactNumber.length !== 11 || !inKindContactNumber.startsWith('09'))) {
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
                number: inKindContactNumber || '',
                email: inKindDonorEmail,
                assistance: itemType,
                valuation: parsedValue,
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
                // Reset donation date to current date after form reset
                if (inKindDonationDateInput) {
                    inKindDonationDateInput.value = today;
                }
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

    // GCash and Bank Details Toggle
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

    // Map Modal Event Listeners
    if (pinBtn && mapModal && closeBtn) {
        pinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Pin button clicked!");
            mapModal.classList.add('show');
            if (!map) {
                initMap();
            } else {
                setTimeout(() => {
                    if (map) {
                        google.maps.event.trigger(map, 'resize');
                        const inKindDonorAddressInput = document.getElementById('inKindDonorAddress').value;
                        if (inKindDonorAddressInput) {
                            const geocoder = new google.maps.Geocoder();
                            geocoder.geocode({ 'address': inKindDonorAddressInput }, (results, status) => {
                                if (status === 'OK' && results[0]) {
                                    map.setCenter(results[0].geometry.location);
                                    clearMarkers();
                                    const marker = new google.maps.Marker({
                                        map: map,
                                        position: results[0].geometry.location,
                                        title: inKindDonorAddressInput,
                                    });
                                    markers.push(marker);
                                }
                            });
                        } else {
                            map.setCenter({ lat: 12.8797, lng: 121.7740 });
                            map.setZoom(6);
                        }
                    }
                }, 100);
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

    // Monetary Donation Form Submission
    if (monetaryDonationForm) {
        console.log("Monetary Donation Form element found.");
        monetaryDonationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Monetary form submitted event triggered!");

            const monetaryEncoder = document.getElementById('monetaryEncoder').value;
            const monetaryDonorName = document.getElementById('monetaryDonorName').value;
            const monetaryLocation = document.getElementById('monetaryLocation').value;
            const monetaryNumber = document.getElementById('monetaryNumber').value;
            const amountDonated = document.getElementById('amountDonated').value.replace(/,/g, '');
            const cashInvoice = document.getElementById('cashInvoice').value;
            const monetaryDonationDate = document.getElementById('monetaryDonationDate').value;
            const monetaryEmail = document.getElementById('monetaryEmail').value;
            const bank = document.getElementById('bank').value;
            const proofofTransferFile = document.getElementById('proofofTransfer').value;
            const referenceNumber = document.getElementById('referenceNumber').value;

            console.log("Collected values:", {
                monetaryEncoder, monetaryDonorName, monetaryLocation, monetaryNumber,
                amountDonated, cashInvoice, monetaryDonationDate, monetaryEmail, bank,
                proofofTransferFile, referenceNumber
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

            // Amount Donated Validation
            const parsedAmount = parseFloat(amountDonated);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Amount Donated',
                    text: 'Please enter a valid positive number for Amount Donated.'
                });
                return;
            }

            // Date Validation: Date Received cannot be a past date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedMonetaryDate = new Date(monetaryDonationDate);
            selectedMonetaryDate.setHours(0, 0, 0, 0);
            if (selectedMonetaryDate < today) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Date',
                    text: 'Date Received cannot be a past date. It must be today or a future date.'
                });
                return;
            }

            // Phone Number Validation (optional)
            if (monetaryNumber.length > 0 && (monetaryNumber.length !== 11 || !monetaryNumber.startsWith('09'))) {
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
                number: monetaryNumber || '',
                amountDonated: parsedAmount,
                invoice: cashInvoice,
                dateReceived: monetaryDonationDate,
                email: monetaryEmail,
                bank: bank,
                proof: proofOfTransferUrl,
                referenceNumber: referenceNumber || '', // Save reference number
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
                if (cashInvoiceInput) {
                    const generateCashInvoice = () => {
                        const randomNumber = Math.floor(100000 + Math.random() * 900000);
                        return `CINV-${randomNumber}`;
                    };
                    cashInvoiceInput.value = generateCashInvoice();
                }
                // Reset donation date to current date after form reset
                if (monetaryDonationDateInput) {
                    monetaryDonationDateInput.value = today;
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

    // Button Active State for Donation Buttons
    const donationButtons = document.querySelectorAll('.donation-buttons button');
    donationButtons.forEach(button => {
        button.addEventListener('click', () => {
            donationButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Button Active State for GCash/Bank Buttons
    const buttons = document.querySelectorAll('.gcash-btn, .banktrans-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
});

//Navbar Fix
  window.addEventListener("scroll", function () {
    const navbar = document.querySelector(".navbar");
    const scrollThreshold = 600; // Adjust where you want it to disappear

    if (window.scrollY > scrollThreshold) {
      navbar.style.opacity = "0";
      navbar.style.pointerEvents = "none"; // Prevent interaction when hidden
      navbar.style.transition = "opacity 0.5s ease";
    } else {
      navbar.style.opacity = "1";
      navbar.style.pointerEvents = "auto";
    }
  });