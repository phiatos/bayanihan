console.log = function () {};
console.error = function () {};
console.warn = function () {};

let map;
let markers = [];
let autocompletes = {};
let currentPinButtonId = null;
let selectedCoordinates = { lat: null, lng: null };

const MAX_VALUATION = 1000000000; // Maximum valuation for in-kind donations (PHP 1,000,000,000)
const MAX_AMOUNT_DONATED = 1000000000; // Maximum amount for monetary donations (PHP 1,000,000,000)

function initMap() {
    const defaultLocation = { lat: 14.5995, lng: 120.9842 };
    map = new google.maps.Map(document.getElementById("mapContainer"), {
        center: defaultLocation,
        zoom: 10,
        mapTypeId: "roadmap",
    });

    const searchInput = document.getElementById("search-input");
    const autocomplete = new google.maps.places.Autocomplete(searchInput);
    autocomplete.bindTo("bounds", map);

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
        map.setCenter(place.geometry.location);
        map.setZoom(16);
        clearMarkers();
        const marker = new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name,
        });
        markers.push(marker);
        // Store coordinates
        selectedCoordinates = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
        };
        const infowindow = new google.maps.InfoWindow({
            content: `<strong>${place.name}</strong><br>${place.formatted_address}<br>Lat: ${selectedCoordinates.lat.toFixed(6)}, Lng: ${selectedCoordinates.lng.toFixed(6)}`,
        });
        marker.addListener("click", () => {
            infowindow.open(map, marker);
        });
        infowindow.open(map, marker);
        const addressInput = document.getElementById(getAddressInputId(currentPinButtonId));
        if (addressInput) {
            addressInput.value = place.formatted_address;
        }
        const mapModal = document.getElementById('mapModal');
        if (mapModal) {
            mapModal.classList.remove('show');
        }
    });

    map.addListener("click", (event) => {
        clearMarkers();
        const marker = new google.maps.Marker({
            position: event.latLng,
            map: map,
            title: "Pinned Location",
        });
        markers.push(marker);
        // Store coordinates
        selectedCoordinates = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        };
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: event.latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
                const address = results[0].formatted_address;
                const infowindow = new google.maps.InfoWindow({
                    content: `Pinned Location<br>${address}<br>Lat: ${selectedCoordinates.lat.toFixed(6)}, Lng: ${selectedCoordinates.lng.toFixed(6)}`,
                });
                marker.addListener("click", () => {
                    infowindow.open(map, marker);
                });
                infowindow.open(map, marker);
                const addressInput = document.getElementById(getAddressInputId(currentPinButtonId));
                if (addressInput) {
                    addressInput.value = address;
                }
                const mapModal = document.getElementById('mapModal');
                if (mapModal) {
                    mapModal.classList.remove('show');
                }
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Geocoding Error",
                    text: "Unable to retrieve address for the pinned location. Coordinates saved instead.",
                });
                const addressInput = document.getElementById(getAddressInputId(currentPinButtonId));
                if (addressInput) {
                    addressInput.value = `Lat: ${selectedCoordinates.lat.toFixed(6)}, Lng: ${selectedCoordinates.lng.toFixed(6)}`;
                }
                const mapModal = document.getElementById('mapModal');
                if (mapModal) {
                    mapModal.classList.remove('show');
                }
            }
        });
        map.setCenter(event.latLng);
        map.setZoom(16);
    });

    // Initialize autocomplete for in-kind address fields only
    const addressFields = [
        'individualAddress',
        'anonymousAddress',
        'corporateAddress',
        'foundationAddress'
    ];
    addressFields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            autocompletes[fieldId] = new google.maps.places.Autocomplete(input, {
                types: ['(cities)'],
                componentRestrictions: { country: 'ph' }
            });
            autocompletes[fieldId].addListener('place_changed', () => {
                const place = autocompletes[fieldId].getPlace();
                if (place.geometry && place.geometry.location) {
                    input.value = place.formatted_address;
                }
            });
        }
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setCenter(userLocation);
                map.setZoom(16);
                const marker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "You are here",
                    icon: {
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                    },
                });
                markers.push(marker);
                const infowindow = new google.maps.InfoWindow({
                    content: "You are here",
                });
                marker.addListener("click", () => {
                    infowindow.open(map, marker);
                });
                infowindow.open(map, marker);
            },
            (error) => {
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

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

function getAddressInputId(pinButtonId) {
    const addressInputMap = {
        'individualPinBtn': 'individualAddress',
        'anonymousPinBtn': 'anonymousAddress',
        'corporatePinBtn': 'corporateAddress',
        'foundationPinBtn': 'foundationAddress'
    };
    return addressInputMap[pinButtonId] || 'individualAddress';
}

function generateCashInvoice() {
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    return `CINV-${randomNumber}`;
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
const gcashDetailsBtn = document.getElementById('gcashDetails');
const bankDetailsBtn = document.getElementById('bankDetails');
const gcashDiv = document.getElementById('gcashDiv');
const bankDiv = document.getElementById('bankDiv');

let currentUserUid = null;
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUserUid = user.uid;
    } else {
        currentUserUid = null;
        // Sign in anonymously for testing
        firebase.auth().signInAnonymously().catch(error => {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: `Failed to sign in anonymously: ${error.message}`,
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean'
                }
            });
        });
    }
});

async function populateCityDropdowns() {
    try {
        const response = await fetch('../json/city.json');
        if (!response.ok) {
            throw new Error('Failed to load city.json');
        }
        const cities = await response.json();
        const dropdowns = [
            'individualAddress',
            'corporateAddress',
            'foundationAddress'
        ];
        dropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                dropdown.value = '';
                const datalistId = `${dropdownId}-datalist`;
                let datalist = document.getElementById(datalistId);
                if (!datalist) {
                    datalist = document.createElement('datalist');
                    datalist.id = datalistId;
                    dropdown.parentNode.appendChild(datalist);
                    dropdown.setAttribute('list', datalistId);
                }
                datalist.innerHTML = '';
                cities.forEach(cityObj => {
                    const option = document.createElement('option');
                    option.value = cityObj.name;
                    datalist.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Error loading cities:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load city list. Please try again later.',
            timer: 1600,
            showConfirmButton: false,
            timerProgressBar: true,
            allowOutsideClick: false
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const inKindBtn = document.getElementById('inKindBtn');
    const monetaryBtn = document.getElementById('monetaryBtn');
    const inKindDonationForm = document.getElementById('inKindDonationForm');
    const monetaryDonationForm = document.getElementById('monetaryDonationForm');
    const valuationInput = document.getElementById('valuation');
    const amountDonatedInput = document.getElementById('amountDonated');
    const cashInvoiceInput = document.getElementById('cashInvoice');
    const bankSelect = document.getElementById('bank');
    const mapModal = document.getElementById('mapModal');
    const closeBtn = document.querySelector('.closeBtn');
    const donationDateInput = document.getElementById('donationDate');
    const monetaryDonationDateInput = document.getElementById('monetaryDonationDate');
    const referenceNumberInput = document.getElementById('referenceNumber');
    const inKindDonorTypeSelect = document.getElementById('inKindDonorType');
    const monetaryDonorTypeSelect = document.getElementById('monetaryDonorType');

    // In-Kind Donor Type Fields
    const individualFields = document.getElementById('individualFields');
    const anonymousFields = document.getElementById('anonymousFields');
    const corporateFields = document.getElementById('corporateFields');
    const foundationFields = document.getElementById('foundationFields');

    // Monetary Donor Type Fields
    const monetaryIndividualFields = document.getElementById('monetaryIndividualFields');
    const monetaryAnonymousFields = document.getElementById('monetaryAnonymousFields');
    const monetaryCorporateFields = document.getElementById('monetaryCorporateFields');
    const monetaryFoundationFields = document.getElementById('monetaryFoundationFields');

    // Add the new code here
    const openTermsLinks = document.querySelectorAll('#openTerms');
    const openPrivacyLinks = document.querySelectorAll('#openPrivacy');
    const openPrivacyFromTermsLink = document.getElementById('openPrivacyFromTerms');
    const termsContentDiv = document.getElementById('termsContent');
    const privacyContentDiv = document.getElementById('privacyContent');

    // Make Terms and Conditions clickable
    if (openTermsLinks && termsContentDiv) {
        openTermsLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                Swal.fire({
                    title: 'Terms and Conditions',
                    html: termsContentDiv.innerHTML,
                    icon: 'info',
                    width: '80%',
                    showCloseButton: true,
                    focusConfirm: false,
                    confirmButtonText: 'Close',
                    customClass: {
                        container: 'swal2-container-custom',
                        popup: 'swal2-popup-custom',
                        title: 'swal2-title-custom',
                        htmlContainer: 'swal2-html-container-custom',
                    }
                });
            });
        });
    }

    // Make Privacy Policy clickable
    if (openPrivacyLinks && privacyContentDiv) {
        openPrivacyLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                Swal.fire({
                    title: 'Privacy Policy',
                    html: privacyContentDiv.innerHTML,
                    icon: 'info',
                    width: '80%',
                    showCloseButton: true,
                    focusConfirm: false,
                    confirmButtonText: 'Close',
                    customClass: {
                        container: 'swal2-container-custom',
                        popup: 'swal2-popup-custom',
                        title: 'swal2-title-custom',
                        htmlContainer: 'swal2-html-container-custom',
                    }
                });
            });
        });
    }

    // Make Privacy Policy link within Terms and Conditions clickable
    if (openPrivacyFromTermsLink && privacyContentDiv) {
        openPrivacyFromTermsLink.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Privacy Policy',
                html: privacyContentDiv.innerHTML,
                icon: 'info',
                width: '80%',
                showCloseButton: true,
                focusConfirm: false,
                confirmButtonText: 'Close',
                customClass: {
                    container: 'swal2-container-custom',
                    popup: 'swal2-popup-custom',
                    title: 'swal2-title-custom',
                    htmlContainer: 'swal2-html-container-custom',
                }
            });
        });
    }

    // Pin Location Buttons (In-Kind Only)
    const pinButtons = {
        'individualPinBtn': 'individualAddress',
        'anonymousPinBtn': 'anonymousAddress',
        'corporatePinBtn': 'corporateAddress',
        'foundationPinBtn': 'foundationAddress'
    };

    // Set default donation date to current date and disable past dates
    const today = new Date().toISOString().split('T')[0];
    if (donationDateInput) {
        donationDateInput.value = today;
        donationDateInput.min = today;
    }
    if (monetaryDonationDateInput) {
        monetaryDonationDateInput.value = today;
        monetaryDonationDateInput.min = today;
    }

    // Set initial cash invoice value
    if (cashInvoiceInput) {
        cashInvoiceInput.value = generateCashInvoice();
    }

    // Populate city dropdowns
    populateCityDropdowns();

    // Footer visibility on scroll
    document.addEventListener("scroll", () => {
        const footer = document.querySelector(".footer");
        const scrollPosition = window.scrollY + window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        if (scrollPosition >= documentHeight - 50) {
            footer.classList.add("visible");
        } else {
            footer.classList.remove("visible");
        }
    });

    if (inKindBtn && monetaryBtn && inKindDonationForm && monetaryDonationForm) {
        inKindDonationForm.style.display = 'flex';
        monetaryDonationForm.style.display = 'none';
        inKindBtn.classList.add('active');

        inKindBtn.addEventListener('click', () => {
            inKindDonationForm.style.display = 'flex';
            monetaryDonationForm.style.display = 'none';
            inKindBtn.classList.add('active');
            monetaryBtn.classList.remove('active');
        });

        monetaryBtn.addEventListener('click', () => {
            monetaryDonationForm.style.display = 'flex';
            inKindDonationForm.style.display = 'none';
            monetaryBtn.classList.add('active');
            inKindBtn.classList.remove('active');
        });
    }

    function manageRequiredAttributes(formType, selectedType) {
        const fieldSets = formType === 'inKind' ? {
            'Individual': ['individualFullName', 'individualAddress', 'individualMobileNumber', 'individualEmail'],
            'Anonymous': ['anonymousAddress', 'anonymousMobileNumber', 'anonymousEmail'],
            'Corporate': ['corporateCompanyName', 'corporateAddress', 'corporateMobileNumber', 'corporateEmail'],
            'Foundation': ['foundationName', 'foundationAddress', 'foundationMobileNumber', 'foundationEmail']
        } : {
            'Individual': ['monetaryIndividualName', 'monetaryIndividualMobileNumber', 'monetaryIndividualEmail'],
            'Anonymous': ['monetaryAnonymousMobileNumber', 'monetaryAnonymousEmail'],
            'Corporate': ['monetaryCorporateName', 'monetaryCorporateMobileNumber', 'monetaryCorporateEmail'],
            'Foundation': ['monetaryFoundationName', 'monetaryFoundationMobileNumber', 'monetaryFoundationEmail']
        };

        Object.keys(fieldSets).forEach(type => {
            const isVisible = type === selectedType;
            fieldSets[type].forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    if (isVisible) {
                        field.setAttribute('required', '');
                    } else {
                        field.removeAttribute('required');
                    }
                }
            });
        });
    }

    // In-Kind Donor Type Dropdown Logic
    if (inKindDonorTypeSelect && individualFields && anonymousFields && corporateFields && foundationFields) {
        const inKindDonorFieldContainers = {
            'Individual': document.getElementById('individualFields'),
            'Anonymous': document.getElementById('anonymousFields'),
            'Corporate': document.getElementById('corporateFields'),
            'Foundation': document.getElementById('foundationFields')
        };

        inKindDonorTypeSelect.addEventListener('change', () => {
            const selectedType = inKindDonorTypeSelect.value;
            Object.values(inKindDonorFieldContainers).forEach(container => {
                container.style.display = 'none';
            });
            if (inKindDonorFieldContainers[selectedType]) {
                inKindDonorFieldContainers[selectedType].style.display = 'block';
            }
            manageRequiredAttributes('inKind', selectedType);
        });

        // Set default to Individual
        inKindDonorTypeSelect.value = 'Individual';
        individualFields.style.display = 'block';
        manageRequiredAttributes('inKind', 'Individual');
    }

    // Monetary Donor Type Dropdown Logic
    if (monetaryDonorTypeSelect && monetaryIndividualFields && monetaryAnonymousFields && monetaryCorporateFields && monetaryFoundationFields) {
        const monetaryDonorFieldContainers = {
            'Individual': document.getElementById('monetaryIndividualFields'),
            'Anonymous': document.getElementById('monetaryAnonymousFields'),
            'Corporate': document.getElementById('monetaryCorporateFields'),
            'Foundation': document.getElementById('monetaryFoundationFields')
        };

        monetaryDonorTypeSelect.addEventListener('change', () => {
            const selectedType = monetaryDonorTypeSelect.value;
            Object.values(monetaryDonorFieldContainers).forEach(container => {
                container.style.display = 'none';
            });
            if (monetaryDonorFieldContainers[selectedType]) {
                monetaryDonorFieldContainers[selectedType].style.display = 'block';
            }
            manageRequiredAttributes('monetary', selectedType);
        });

        // Set default to Individual
        monetaryDonorTypeSelect.value = 'Individual';
        monetaryIndividualFields.style.display = 'block';
        manageRequiredAttributes('monetary', 'Individual');
    }

    // Pin Location Button Logic (In-Kind Only)
    Object.keys(pinButtons).forEach(pinBtnId => {
        const pinBtn = document.getElementById(pinBtnId);
        if (pinBtn) {
            pinBtn.addEventListener('click', (e) => {
                e.preventDefault();
                currentPinButtonId = pinBtnId;
                mapModal.classList.add('show');
                if (!map) {
                    initMap();
                } else {
                    setTimeout(() => {
                        if (map) {
                            google.maps.event.trigger(map, 'resize');
                            const addressInput = document.getElementById(pinButtons[pinBtnId]);
                            if (addressInput && addressInput.value) {
                                const geocoder = new google.maps.Geocoder();
                                geocoder.geocode({ 'address': addressInput.value }, (results, status) => {
                                    if (status === 'OK' && results[0]) {
                                        map.setCenter(results[0].geometry.location);
                                        clearMarkers();
                                        const marker = new google.maps.Marker({
                                            map: map,
                                            position: results[0].geometry.location,
                                            title: addressInput.value,
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
        }
    });

    if (mapModal && closeBtn) {
        closeBtn.addEventListener('click', () => {
            mapModal.classList.remove('show');
        });

        window.addEventListener('click', (e) => {
            if (e.target === mapModal) {
                mapModal.classList.remove('show');
            }
        });
    }

    // Phone Number Validation
    const validatePhoneNumber = (inputElement) => {
        inputElement.addEventListener('input', () => {
            let value = inputElement.value.replace(/\D/g, '');
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

        inputElement.addEventListener('blur', () => {
            const value = inputElement.value;
            if (value.length > 0 && (value.length !== 11 || !value.startsWith('09'))) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Number Format',
                    text: 'Please enter an 11-digit mobile number starting with 09 (e.g., 09171234567).',
                    confirmButtonText: 'OK',
                    timerProgressBar: true,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
            }
        });
    };

    ['individualMobileNumber', 'anonymousMobileNumber', 'corporateMobileNumber', 'foundationMobileNumber',
     'monetaryIndividualMobileNumber', 'monetaryAnonymousMobileNumber', 'monetaryCorporateMobileNumber', 'monetaryFoundationMobileNumber'].forEach(id => {
        const input = document.getElementById(id);
        if (input) validatePhoneNumber(input);
    });

    // Google Drive Link Validation
    const proofOfTransferLinkInput = document.getElementById('proofOfTransferLink');
    if (proofOfTransferLinkInput) {
        proofOfTransferLinkInput.addEventListener('blur', () => {
            const value = proofOfTransferLinkInput.value.trim();
            const urlPattern = /^https:\/\/(drive\.google\.com\/file\/d\/|docs\.google\.com\/.*\/d\/)[a-zA-Z0-9_-]+/;
            if (value && !urlPattern.test(value)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Google Drive Link',
                    text: 'Please enter a valid Google Drive shareable link (e.g., https://drive.google.com/file/d/...).',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
            }
        });
    }

    // Valuation and Amount Donated Formatting
    [valuationInput, amountDonatedInput].forEach(input => {
        if (input) {
            input.addEventListener('input', (event) => {
                let value = event.target.value.replace(/,/g, '');
                if (value === '' || isNaN(value)) {
                    event.target.value = '';
                    return;
                }
                const parsedValue = parseFloat(value);
                const maxValue = input.id === 'valuation' ? MAX_VALUATION : MAX_AMOUNT_DONATED;
                if (parsedValue > maxValue) {
                    value = maxValue.toString();
                    Swal.fire({
                        icon: 'warning',
                        title: 'Maximum Value Exceeded',
                        text: `The ${input.id === 'valuation' ? 'valuation' : 'amount donated'} cannot exceed PHP ${maxValue.toLocaleString('en-US')}.`,
                        timer: 1600,
                        showConfirmButton: false,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-popup-warning-clean',
                            title: 'swal2-title-warning-clean',
                            htmlContainer: 'swal2-text-warning-clean'
                        }
                    });
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
    });

    // Reference Number Validation
    if (referenceNumberInput) {
        referenceNumberInput.addEventListener('input', (event) => {
            let value = event.target.value.replace(/\D/g, '');
            event.target.value = value;
        });
    }

    // GCash and Bank Details Toggle
    if (gcashDiv) gcashDiv.style.display = 'none';
    if (bankDiv) bankDiv.style.display = 'none';

    if (gcashDetailsBtn && bankDetailsBtn && gcashDiv && bankDiv) {
        gcashDetailsBtn.addEventListener('click', () => {
            gcashDiv.style.display = 'block';
            bankDiv.style.display = 'none';
            gcashDetailsBtn.classList.add('active');
            bankDetailsBtn.classList.remove('active');
        });

        bankDetailsBtn.addEventListener('click', () => {
            bankDiv.style.display = 'block';
            gcashDiv.style.display = 'none';
            bankDetailsBtn.classList.add('active');
            gcashDetailsBtn.classList.remove('active');
        });
    }

    // In-Kind Donation Form Submission
    if (inKindDonationForm) {
        inKindDonationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const inKindEncoder = document.getElementById('inKindEncoder')?.value || '';
            const inKindDonorType = document.getElementById('inKindDonorType')?.value;
            const assistanceType = document.getElementById('assistanceType')?.value;
            const valuation = document.getElementById('valuation')?.value.replace(/,/g, '');
            const description = document.getElementById('description')?.value || '';
            const donationDate = document.getElementById('donationDate')?.value;
            const status = document.getElementById('status')?.value || 'pending';
            const staffIncharge = document.getElementById('staffIncharge')?.value || '';
            const urgentNeed = document.getElementById('urgentNeedInKind')?.checked || false;

            let donorName, donorAddress, donorMobileNumber, donorEmail, additionalFields = {};

            switch (inKindDonorType) {
                case 'Individual':
                    const individualFullNameInput = document.getElementById('individualFullName');
                    const individualAddressInput = document.getElementById('individualAddress');
                    const individualMobileNumberInput = document.getElementById('individualMobileNumber');
                    const individualEmailInput = document.getElementById('individualEmail');
                    if (!individualFullNameInput || !individualAddressInput || !individualMobileNumberInput || !individualEmailInput) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Form Error',
                            text: 'Individual donor fields are missing. Please contact support.',
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                        return;
                    }
                    donorName = individualFullNameInput.value;
                    donorAddress = individualAddressInput.value;
                    donorMobileNumber = individualMobileNumberInput.value;
                    donorEmail = individualEmailInput.value;
                    break;
                case 'Anonymous':
                    donorName = 'Anonymous';
                    const anonymousAddressInput = document.getElementById('anonymousAddress');
                    const anonymousMobileNumberInput = document.getElementById('anonymousMobileNumber');
                    const anonymousEmailInput = document.getElementById('anonymousEmail');
                    const anonymousNoteInput = document.getElementById('anonymousNote');
                    if (!anonymousAddressInput || !anonymousMobileNumberInput || !anonymousEmailInput) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Form Error',
                            text: 'Anonymous donor fields are missing. Please contact support.',
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                        return;
                    }
                    donorAddress = anonymousAddressInput.value;
                    donorMobileNumber = anonymousMobileNumberInput.value;
                    donorEmail = anonymousEmailInput.value;
                    additionalFields.anonymousNote = anonymousNoteInput ? anonymousNoteInput.value : '';
                    break;
                case 'Corporate':
                    const corporateCompanyNameInput = document.getElementById('corporateCompanyName');
                    const corporateAddressInput = document.getElementById('corporateAddress');
                    const corporateMobileNumberInput = document.getElementById('corporateMobileNumber');
                    const corporateEmailInput = document.getElementById('corporateEmail');
                    const corporateContactPersonInput = document.getElementById('corporateContactPerson');
                    if (!corporateCompanyNameInput || !corporateAddressInput || !corporateMobileNumberInput || !corporateEmailInput) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Form Error',
                            text: 'Corporate donor fields are missing. Please contact support.',
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                        return;
                    }
                    donorName = corporateCompanyNameInput.value;
                    donorAddress = corporateAddressInput.value;
                    donorMobileNumber = corporateMobileNumberInput.value;
                    donorEmail = corporateEmailInput.value;
                    additionalFields.corporateContactPerson = corporateContactPersonInput ? corporateContactPersonInput.value : '';
                    break;
                case 'Foundation':
                    const foundationNameInput = document.getElementById('foundationName');
                    const foundationAddressInput = document.getElementById('foundationAddress');
                    const foundationMobileNumberInput = document.getElementById('foundationMobileNumber');
                    const foundationEmailInput = document.getElementById('foundationEmail');
                    const foundationContactPersonInput = document.getElementById('foundationContactPerson');
                    if (!foundationNameInput || !foundationAddressInput || !foundationMobileNumberInput || !foundationEmailInput) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Form Error',
                            text: 'Foundation donor fields are missing. Please contact support.',
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                        return;
                    }
                    donorName = foundationNameInput.value;
                    donorAddress = foundationAddressInput.value;
                    donorMobileNumber = foundationMobileNumberInput.value;
                    donorEmail = foundationEmailInput.value;
                    additionalFields.foundationContactPerson = foundationContactPersonInput ? foundationContactPersonInput.value : '';
                    break;
                default:
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Donor Type',
                        text: 'Please select a valid donor type.',
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean'
                        }
                    });
                    return;
            }

            if (!inKindDonorType || !assistanceType || !valuation || !donationDate || 
                (inKindDonorType !== 'Anonymous' && (!donorName || !donorAddress || !donorMobileNumber || !donorEmail))) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Please fill in all required fields for In Kind Donation.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            const parsedValue = parseFloat(valuation);
            if (isNaN(parsedValue) || parsedValue <= 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Valuation',
                    text: 'Please enter a valid positive number for Valuation.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedInKindDate = new Date(donationDate);
            selectedInKindDate.setHours(0, 0, 0, 0);
            if (isNaN(selectedInKindDate.getTime()) || selectedInKindDate < today) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Date',
                    text: 'Donation Date must be today or a future date.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            if (donorMobileNumber && (donorMobileNumber.length !== 11 || !donorMobileNumber.startsWith('09'))) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Contact Number',
                    text: 'Please ensure the mobile number is an 11-digit number starting with 09.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            const newDonationRef = database.ref('donations/pending/inkind').push();
            const newDonationId = newDonationRef.key;

            const newInKindDonation = {
                id: newDonationId,
                userUid: currentUserUid || 'anonymous',
                encoder: inKindEncoder,
                name: donorName,
                type: inKindDonorType,
                address: donorAddress || '',
                latitude: selectedCoordinates.lat || null, 
                longitude: selectedCoordinates.lng || null,
                number: donorMobileNumber || '',
                email: donorEmail || '',
                assistance: assistanceType,
                valuation: parsedValue,
                description: description || '',
                status: status || 'pending',
                staffIncharge: staffIncharge,
                donationDate: donationDate,
                urgentNeed: urgentNeed,
                createdAt: new Date().toISOString(),
                ...additionalFields
            };

            try {
                await newDonationRef.set(newInKindDonation);
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Your in-kind donation has been successfully recorded. Thank you for your generosity!' + (urgentNeed ? ' It has been marked as an urgent need.' : ''),
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                        confirmButton: 'my-success-button'
                    }
                });
                inKindDonationForm.reset();
                if (donationDateInput) {
                    donationDateInput.value = today;
                }
                inKindDonorTypeSelect.value = 'Individual';
                Object.values({
                    'Individual': individualFields,
                    'Anonymous': anonymousFields,
                    'Corporate': corporateFields,
                    'Foundation': foundationFields
                }).forEach(container => {
                    container.style.display = 'none';
                });
                individualFields.style.display = 'block';
                // Reset coordinates
                selectedCoordinates = { lat: null, lng: null };
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `Failed to submit In Kind Donation. Please try again.<br>Error: ${error.message}`,
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
            }
        });
    }

    // Monetary Donation Form Submission
    if (monetaryDonationForm) {
        monetaryDonationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!currentUserUid) {
                Swal.fire({
                    icon: 'error',
                    title: 'Authentication Required',
                    text: 'Please sign in to submit a monetary donation.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            const monetaryDonorType = document.getElementById('monetaryDonorType')?.value;
            const amountDonated = document.getElementById('amountDonated')?.value.replace(/,/g, '');
            const donationDate = document.getElementById('monetaryDonationDate')?.value;
            const bank = document.getElementById('bank')?.value;
            const referenceNumber = document.getElementById('referenceNumber')?.value;
            const proofOfTransferLink = document.getElementById('proofOfTransferLink')?.value.trim();
            const cashInvoice = document.getElementById('cashInvoice')?.value;

            let donorName, donorMobileNumber, donorEmail, additionalFields = {};

            switch (monetaryDonorType) {
                case 'Individual':
                    const individualNameInput = document.getElementById('monetaryIndividualName');
                    const individualMobileNumberInput = document.getElementById('monetaryIndividualMobileNumber');
                    const individualEmailInput = document.getElementById('monetaryIndividualEmail');
                    if (!individualNameInput || !individualMobileNumberInput || !individualEmailInput) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Form Error',
                            text: 'Individual donor fields are missing. Please contact support.',
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                        return;
                    }
                    donorName = individualNameInput.value;
                    donorMobileNumber = individualMobileNumberInput.value;
                    donorEmail = individualEmailInput.value;
                    break;
                case 'Anonymous':
                    donorName = 'Anonymous';
                    const anonymousMobileNumberInput = document.getElementById('monetaryAnonymousMobileNumber');
                    const anonymousEmailInput = document.getElementById('monetaryAnonymousEmail');
                    const anonymousNoteInput = document.getElementById('monetaryAnonymousNote');
                    if (!anonymousMobileNumberInput || !anonymousEmailInput) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Form Error',
                            text: 'Anonymous donor fields are missing. Please contact support.',
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                        return;
                    }
                    donorMobileNumber = anonymousMobileNumberInput.value;
                    donorEmail = anonymousEmailInput.value;
                    additionalFields.anonymousNote = anonymousNoteInput ? anonymousNoteInput.value : '';
                    break;
                case 'Corporate':
                    const corporateNameInput = document.getElementById('monetaryCorporateName');
                    const corporateMobileNumberInput = document.getElementById('monetaryCorporateMobileNumber');
                    const corporateEmailInput = document.getElementById('monetaryCorporateEmail');
                    const corporateContactPersonInput = document.getElementById('monetaryCorporateContactPerson');
                    if (!corporateNameInput || !corporateMobileNumberInput || !corporateEmailInput) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Form Error',
                            text: 'Corporate donor fields are missing. Please contact support.',
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                        return;
                    }
                    donorName = corporateNameInput.value;
                    donorMobileNumber = corporateMobileNumberInput.value;
                    donorEmail = corporateEmailInput.value;
                    additionalFields.corporateContactPerson = corporateContactPersonInput ? corporateContactPersonInput.value : '';
                    break;
                case 'Foundation':
                    const foundationNameInput = document.getElementById('monetaryFoundationName');
                    const foundationMobileNumberInput = document.getElementById('monetaryFoundationMobileNumber');
                    const foundationEmailInput = document.getElementById('monetaryFoundationEmail');
                    const foundationContactPersonInput = document.getElementById('monetaryFoundationContactPerson');
                    if (!foundationNameInput || !foundationMobileNumberInput || !foundationEmailInput) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Form Error',
                            text: 'Foundation donor fields are missing. Please contact support.',
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-error-clean',
                                title: 'swal2-title-error-clean',
                                htmlContainer: 'swal2-text-error-clean'
                            }
                        });
                        return;
                    }
                    donorName = foundationNameInput.value;
                    donorMobileNumber = foundationMobileNumberInput.value;
                    donorEmail = foundationEmailInput.value;
                    additionalFields.foundationContactPerson = foundationContactPersonInput ? foundationContactPersonInput.value : '';
                    break;
                default:
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Donor Type',
                        text: 'Please select a valid donor type.',
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean'
                        }
                    });
                    return;
            }

            if (!monetaryDonorType || !amountDonated || !donationDate || !bank || !referenceNumber || !proofOfTransferLink || 
                (monetaryDonorType !== 'Anonymous' && (!donorName || !donorMobileNumber || !donorEmail))) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Please fill in all required fields for Monetary Donation.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            const parsedAmount = parseFloat(amountDonated);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Amount',
                    text: 'Please enter a valid positive number for Amount Donated.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedMonetaryDate = new Date(donationDate);
            selectedMonetaryDate.setHours(0, 0, 0, 0);
            if (isNaN(selectedMonetaryDate.getTime())) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Date',
                    text: 'Please select a valid donation date.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            if (donorMobileNumber && (donorMobileNumber.length !== 11 || !donorMobileNumber.startsWith('09'))) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Contact Number',
                    text: 'Please ensure the mobile number is an 11-digit number starting with 09.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            if (!['gcash', 'BDO', 'BPI', 'others'].includes(bank)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Bank Selection',
                    text: 'Please select a valid bank or e-wallet.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            if (!/^\d+$/.test(referenceNumber)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Reference Number',
                    text: 'Reference Number must contain only digits.',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            const urlPattern = /^https:\/\/(drive\.google\.com\/file\/d\/|docs\.google\.com\/.*\/d\/)[a-zA-Z0-9_-]+/;
            if (!urlPattern.test(proofOfTransferLink)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Google Drive Link',
                    text: 'Please enter a valid Google Drive shareable link (e.g., https://drive.google.com/file/d/...).',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
                return;
            }

            const newDonationRef = database.ref('donations/pending/monetary').push();
            const newDonationId = newDonationRef.key;

            try {
                const newMonetaryDonation = {
                    id: newDonationId,
                    userUid: currentUserUid,
                    name: donorName,
                    type: monetaryDonorType,
                    number: donorMobileNumber || '',
                    email: donorEmail || '',
                    amount: parsedAmount,
                    bank: bank,
                    referenceNumber: referenceNumber,
                    proofOfTransferUrl: proofOfTransferLink, // Store Google Drive link
                    cashInvoice: cashInvoice || '',
                    donationDate: donationDate,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    ...additionalFields
                };

                await newDonationRef.set(newMonetaryDonation);
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Your monetary donation has been successfully recorded. Thank you for your generosity!',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                        confirmButton: 'my-success-button'
                    }
                });
                monetaryDonationForm.reset();
                if (monetaryDonationDateInput) {
                    monetaryDonationDateInput.value = today;
                }
                if (cashInvoiceInput) {
                    cashInvoiceInput.value = generateCashInvoice();
                }
                monetaryDonorTypeSelect.value = 'Individual';
                Object.values({
                    'Individual': monetaryIndividualFields,
                    'Anonymous': monetaryAnonymousFields,
                    'Corporate': monetaryCorporateFields,
                    'Foundation': monetaryFoundationFields
                }).forEach(container => {
                    container.style.display = 'none';
                });
                monetaryIndividualFields.style.display = 'block';
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `Failed to submit Monetary Donation. Please try again.<br>Error: ${error.message}`,
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                });
            }
        });
    }

    window.initMap = initMap;
});