// joinasvolunteerorg.js
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

// Clear error message from input field
function clearError(inputField) {
    const errorDiv = inputField.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('error-message')) {
        errorDiv.textContent = '';
    }
    inputField.classList.remove('error');
}

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
let map, marker, autocomplete;

// Map initialization is now handled by map-loader.js, so remove the initMap function from here
// window.initMap is defined in map-loader.js and will call this function
window.initMap = function() {
    const mapOptions = {
        center: { lat: 14.5995, lng: 120.9842 },
        zoom: 10,
    };
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    autocomplete = new google.maps.places.Autocomplete(document.getElementById('location'), {
        types: ['geocode'],
        componentRestrictions: { country: 'ph' },
    });

    marker = new google.maps.Marker({
        map: map,
        draggable: true,
    });

    autocomplete.bindTo('bounds', map);

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Location',
                text: 'Please select a valid location from the suggestions.',
                confirmButtonText: 'OK',
            });
            return;
        }

        map.setCenter(place.geometry.location);
        map.setZoom(15);
        marker.setPosition(place.geometry.location);

        document.getElementById('latitude').value = place.geometry.location.lat();
        document.getElementById('longitude').value = place.geometry.location.lng();
        document.getElementById('formatted-address').value = place.formatted_address;

        clearError(document.getElementById('location'));
    });

    marker.addListener('dragend', () => {
        const position = marker.getPosition();
        document.getElementById('latitude').value = position.lat();
        document.getElementById('longitude').value = position.lng();

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: position }, (results, status) => {
            if (status === 'OK' && results[0]) {
                document.getElementById('formatted-address').value = results[0].formatted_address;
                document.getElementById('location').value = results[0].formatted_address;
                clearError(document.getElementById('location'));
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Geocoding Error',
                    text: 'Unable to retrieve address for this location.',
                    confirmButtonText: 'OK',
                });
            }
        });
    });

    map.addListener('click', (event) => {
        marker.setPosition(event.latLng);
        document.getElementById('latitude').value = event.latLng.lat();
        document.getElementById('longitude').value = event.latLng.lng();

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: event.latLng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                document.getElementById('formatted-address').value = results[0].formatted_address;
                document.getElementById('location').value = results[0].formatted_address;
                clearError(document.getElementById('location'));
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Geocoding Error',
                    text: 'Unable to retrieve address for this location.',
                    confirmButtonText: 'OK',
                });
            }
        });
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const volunteerOrgForm = document.getElementById('volunteer-org-form');
    const locationInput = document.getElementById('location');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const formattedAddressInput = document.getElementById('formatted-address');
    const submitButton = document.querySelector('.btn-primary');
    let isSubmitting = false;
    const agreeCheckbox = document.getElementById('agreeToTerms');
    const agreementMessage = document.getElementById('agreementMessage');
    const openTermsLink = document.getElementById('openTerms');
    const openPrivacyLink = document.getElementById('openPrivacy');
    const termsContentDiv = document.getElementById('termsContent');
    const privacyContentDiv = document.getElementById('privacyContent');

    // Email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validDomains = ['gmail.com'];
        const domain = email.split('@')[1]?.toLowerCase();
        return emailRegex.test(email) && validDomains.includes(domain);
    }

    // Mobile number validation
    function isValidMobile(mobile) {
        const mobileRegex = /^09\d{9}$/;
        return mobileRegex.test(mobile);
    }

    // Check if input is empty
    const isEmpty = (value) => value.trim() === "";

    // Check if input contains only letters and spaces
    const isLettersOnly = (value) => /^[a-zA-Z\s]+$/.test(value);

    // Show error message below input field
    function showError(inputField, message) {
        const errorDiv = inputField.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('error-message')) {
            const newErrorDiv = document.createElement('div');
            newErrorDiv.className = 'error-message';
            inputField.parentNode.insertBefore(newErrorDiv, inputField.nextSibling);
            newErrorDiv.textContent = message;
        } else {
            errorDiv.textContent = message;
        }
        inputField.classList.add('error');
    }

    // Real-time input restrictions for mobile number
    function restrictMobileNumberInput(input) {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9]/g, '');
            if (input.value.length > 11) {
                input.value = input.value.slice(0, 11);
            }
            if (input.value && !input.value.startsWith('09')) {
                input.value = '09' + input.value.replace(/^09/, '').slice(0, 9);
            }
        });
    }

    // Real-time validation for form inputs
    function validateInputInRealTime(input, fieldConfig, inputs) {
        clearError(input);
        if (fieldConfig.required !== false && isEmpty(input.value)) {
            showError(input, `${fieldConfig.label} is required.`);
        } else if (!isEmpty(input.value)) {
            if (fieldConfig.lettersOnly && !isLettersOnly(input.value)) {
                showError(input, `${fieldConfig.label} should only contain letters and spaces.`);
            }
            if (fieldConfig.isEmail && !isValidEmail(input.value.trim())) {
                showError(input, `Please enter a valid Gmail address (e.g., example@gmail.com).`);
            }
            if (fieldConfig.isMobile && !isValidMobile(input.value)) {
                showError(input, `Mobile number must be 11 digits starting with "09".`);
            }
            if (fieldConfig.isUrl) {
                try {
                    new URL(input.value);
                } catch (e) {
                    showError(input, `${fieldConfig.label} must be a valid URL (e.g., https://facebook.com/yourpage).`);
                }
            }
            if (fieldConfig.minLength && input.value.length < fieldConfig.minLength) {
                showError(input, `${fieldConfig.label} must be at least ${fieldConfig.minLength} characters long.`);
            }
        }
    }

    // Apply real-time validation to form inputs
    Array.from(volunteerOrgForm.querySelectorAll('input, textarea')).forEach(input => {
        const fieldConfig = {
            'organization': { label: 'Organization Name' },
            'contact-person': { label: 'Contact Person', lettersOnly: true },
            'email': { label: 'Email', isEmail: true },
            'mobileNumber': { label: 'Mobile Number', isMobile: true },
            'socialMedia': { label: 'Social Media', isUrl: true, required: false },
            'location': { label: 'Location' },
            'organizationalBackgroundMission': { label: 'Organizational Background & Mission', minLength: 20 },
            'areasOfExpertiseFocus': { label: 'Areas of Expertise/Focus', minLength: 20 },
            'legalStatusRegistration': { label: 'Legal Status/Registration' },
            'requiredDocumentsLink': { label: 'Required Documents Link', isUrl: true }
        }[input.id];
        if (fieldConfig) {
            input.addEventListener('input', () => validateInputInRealTime(input, fieldConfig, {
                organization: document.getElementById('organization'),
                'contact-person': document.getElementById('contact-person'),
                email: document.getElementById('email'),
                mobileNumber: document.getElementById('mobileNumber'),
                socialMedia: document.getElementById('socialMedia'),
                location: document.getElementById('location'),
                organizationalBackgroundMission: document.getElementById('organizationalBackgroundMission'),
                areasOfExpertiseFocus: document.getElementById('areasOfExpertiseFocus'),
                legalStatusRegistration: document.getElementById('legalStatusRegistration'),
                requiredDocumentsLink: document.getElementById('requiredDocumentsLink')
            }));
        }
    });

    // Apply input restrictions
    restrictMobileNumberInput(document.getElementById('mobileNumber'));

    // Function to manage submit button state
    const updateSubmitButtonState = () => {
        if (submitButton && agreeCheckbox) {
            submitButton.disabled = !agreeCheckbox.checked;
            if (agreementMessage) {
                agreementMessage.style.display = agreeCheckbox.checked ? 'none' : 'block';
            }
        }
    };

    // Add event listener for the terms and conditions checkbox
    if (agreeCheckbox) {
        agreeCheckbox.addEventListener('change', updateSubmitButtonState);
    }

    // Initial call to set the button state when the page loads
    updateSubmitButtonState();

    // Event listeners for opening T&C and Privacy Policy pop-ups
    if (openTermsLink && termsContentDiv) {
        openTermsLink.addEventListener('click', (e) => {
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
    }

    if (openPrivacyLink && privacyContentDiv) {
        openPrivacyLink.addEventListener('click', (e) => {
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

    // ABVN Form Submission Logic
    if (volunteerOrgForm) {
        volunteerOrgForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Prevent multiple rapid submissions
            if (isSubmitting) {
                return;
            }

            // Check if terms and conditions are agreed to BEFORE processing
            if (!agreeCheckbox || !agreeCheckbox.checked) {
                if (agreementMessage) {
                    agreementMessage.style.display = 'block';
                }
                Swal.fire('Error', 'Please agree to the Terms and Conditions and Privacy Policy to proceed.', 'error');
                agreeCheckbox.focus();
                return;
            } else {
                if (agreementMessage) {
                    agreementMessage.style.display = 'none';
                }
            }

            // Disable the button and show submitting text
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            isSubmitting = true;

            try {
                const recaptchaResponse = grecaptcha.getResponse();

                if (!recaptchaResponse) {
                    Swal.fire({
                        title: 'Error',
                        text: 'Please complete the reCAPTCHA to prove you are not a robot.',
                        icon: 'error',
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean',
                            confirmButton: 'my-error-button'
                        }
                    });
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                const inputs = {
                    organization: document.getElementById('organization'),
                    'contact-person': document.getElementById('contact-person'),
                    email: document.getElementById('email'),
                    mobileNumber: document.getElementById('mobileNumber'),
                    socialMedia: document.getElementById('socialMedia'),
                    location: document.getElementById('location'),
                    organizationalBackgroundMission: document.getElementById('organizationalBackgroundMission'),
                    areasOfExpertiseFocus: document.getElementById('areasOfExpertiseFocus'),
                    legalStatusRegistration: document.getElementById('legalStatusRegistration'),
                    requiredDocumentsLink: document.getElementById('requiredDocumentsLink'),
                    latitude: document.getElementById('latitude'),
                    longitude: document.getElementById('longitude'),
                    formattedAddress: document.getElementById('formatted-address')
                };

                // Validate all inputs before submission
                let isValid = true;
                const errors = [];

                const fieldsToCheck = [
                    { id: 'organization', label: 'Organization Name', lettersOnly: true },
                    { id: 'contact-person', label: 'Contact Person', lettersOnly: true },
                    { id: 'email', label: 'Email', isEmail: true },
                    { id: 'mobileNumber', label: 'Mobile Number', isMobile: true },
                    { id: 'socialMedia', label: 'Social Media', isUrl: true, required: false },
                    { id: 'location', label: 'Location' },
                    { id: 'organizationalBackgroundMission', label: 'Organizational Background & Mission', minLength: 20 },
                    { id: 'areasOfExpertiseFocus', label: 'Areas of Expertise/Focus', minLength: 20 },
                    { id: 'legalStatusRegistration', label: 'Legal Status/Registration' },
                    { id: 'requiredDocumentsLink', label: 'Required Documents Link', isUrl: true }
                ];

                fieldsToCheck.forEach(({ id, label, lettersOnly, isEmail, isMobile, isUrl, required, minLength }) => {
                    const input = inputs[id];
                    clearError(input);
                    if (required !== false && isEmpty(input.value)) {
                        showError(input, `${label} is required.`);
                        errors.push(`${label} is required.`);
                        isValid = false;
                    } else if (!isEmpty(input.value)) {
                        if (lettersOnly && !isLettersOnly(input.value)) {
                            showError(input, `${label} should only contain letters and spaces.`);
                            errors.push(`${label} should only contain letters and spaces.`);
                            isValid = false;
                        }
                        if (isEmail && !isValidEmail(input.value.trim())) {
                            showError(input, `Please enter a valid Gmail address (e.g., example@gmail.com).`);
                            errors.push(`Please enter a valid Gmail address (e.g., example@gmail.com).`);
                            isValid = false;
                        }
                        if (isMobile && !isValidMobile(input.value)) {
                            showError(input, `Mobile number must be 11 digits starting with "09".`);
                            errors.push(`Mobile number must be 11 digits starting with "09".`);
                            isValid = false;
                        }
                        if (isUrl) {
                            try {
                                new URL(input.value);
                            } catch (e) {
                                showError(input, `${label} must be a valid URL (e.g., https://facebook.com/yourpage).`);
                                errors.push(`${label} must be a valid URL.`);
                                isValid = false;
                            }
                        }
                        if (minLength && input.value.length < minLength) {
                            showError(input, `${label} must be at least ${minLength} characters long.`);
                            errors.push(`${label} must be at least ${minLength} characters long.`);
                            isValid = false;
                        }
                    }
                });

                // Validate location coordinates
                if (isEmpty(latitudeInput.value) || isEmpty(longitudeInput.value)) {
                    showError(locationInput, 'Please pin a location on the map.');
                    errors.push('Please pin a location on the map.');
                    isValid = false;
                }

                if (!isValid) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Input',
                        html: errors.join('<br>'),
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean',
                            confirmButton: 'my-error-button'
                        }
                    });
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // Check for duplicates
                const abvnApplicationsRef = database.ref("abvnApplications/pendingABVN");
                const allAbvnApplicationsSnapshot = await abvnApplicationsRef.once('value');

                let emailAlreadyExists = false;
                let orgNameAlreadyExists = false;

                allAbvnApplicationsSnapshot.forEach(childSnapshot => {
                    const application = childSnapshot.val();
                    if (application.email.toLowerCase() === inputs.email.value.toLowerCase()) {
                        emailAlreadyExists = true;
                    }
                    if (application.organizationName.toLowerCase() === inputs.organization.value.toLowerCase()) {
                        orgNameAlreadyExists = true;
                    }
                });

                if (emailAlreadyExists) {
                    showError(inputs.email, 'This email address is already used.');
                    errors.push('An application with this email address already exists.');
                    isValid = false;
                }
                if (orgNameAlreadyExists) {
                    showError(inputs.organization, 'This organization name is already used.');
                    errors.push('An application with this organization name already exists.');
                    isValid = false;
                }

                if (!isValid) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Duplicate Entry',
                        html: errors.join('<br>'),
                        showConfirmButton: true,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal2-popup-error-clean',
                            title: 'swal2-title-error-clean',
                            htmlContainer: 'swal2-text-error-clean',
                            confirmButton: 'my-error-button'
                        }
                    });
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // Create an object to store in Realtime Database
                const applicationData = {
                    organizationName: inputs.organization.value.trim(),
                    contactPerson: inputs['contact-person'].value.trim(),
                    email: inputs.email.value.trim(),
                    mobileNumber: inputs.mobileNumber.value.trim(),
                    socialMediaLink: inputs.socialMedia.value.trim(),
                    headquarters: {
                        latitude: parseFloat(inputs.latitude.value),
                        longitude: parseFloat(inputs.longitude.value),
                        formattedAddress: inputs.formattedAddress.value.trim()
                    },
                    applicationDateandTime: new Date().toISOString(),
                    recaptchaResponse: recaptchaResponse,
                    organizationalBackgroundMission: inputs.organizationalBackgroundMission.value.trim(),
                    areasOfExpertiseFocus: inputs.areasOfExpertiseFocus.value.trim(),
                    legalStatusRegistration: inputs.legalStatusRegistration.value.trim(),
                    requiredDocumentsLink: inputs.requiredDocumentsLink.value.trim()
                };

                const newApplicationRef = await database.ref("abvnApplications/pendingABVN").push(applicationData);

                Swal.fire({
                    title: 'Success!',
                    text: 'Application submitted successfully! Thank you for joining us.',
                    icon: 'success',
                    showConfirmButton: true,
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        htmlContainer: 'swal2-text-success-clean',
                        confirmButton: 'my-success-button'
                    }
                });

                // Reset form and map after successful submission
                volunteerOrgForm.reset();
                latitudeInput.value = '';
                longitudeInput.value = '';
                formattedAddressInput.value = '';
                locationInput.value = '';
                marker.setPosition(null);
                map.setCenter({ lat: 14.5995, lng: 120.9842 });
                map.setZoom(10);
                grecaptcha.reset();
                agreeCheckbox.checked = false;
                updateSubmitButtonState();
                Array.from(volunteerOrgForm.querySelectorAll('.error-message')).forEach(msg => msg.textContent = '');
                Array.from(volunteerOrgForm.querySelectorAll('.error')).forEach(input => input.classList.remove('error'));
            } catch (error) {
                console.error("Error adding ABVN application to Realtime Database: ", error);
                Swal.fire('Error', 'There was an error submitting your application. Please try again.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Application';
                isSubmitting = false;
                grecaptcha.reset();
                updateSubmitButtonState();
            }
        });
    }

    // Firebase Authentication State Change Listener
    auth.onAuthStateChanged(user => {
        if (user) {
        } else {
        }
    });

    // Navbar Fix
    window.addEventListener("scroll", function () {
        const navbar = document.querySelector(".navbar");
        const scrollThreshold = 600;

        if (window.scrollY > scrollThreshold) {
            navbar.style.opacity = "0";
            navbar.style.pointerEvents = "none";
            navbar.style.transition = "opacity 0.5s ease";
        } else {
            navbar.style.opacity = "1";
            navbar.style.pointerEvents = "auto";
        }
    });
});