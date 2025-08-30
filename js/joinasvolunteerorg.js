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

document.addEventListener('DOMContentLoaded', () => {
    const volunteerOrgForm = document.getElementById('volunteer-org-form');
    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const barangaySelect = document.getElementById('barangay');
    const streetAddressInput = document.getElementById('streetAddress');
    const regionTextInput = document.getElementById('region-text');
    const provinceTextInput = document.getElementById('province-text');
    const cityTextInput = document.getElementById('city-text');
    const barangayTextInput = document.getElementById('barangay-text');
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
        const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];
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

    // Clear error message from input field
    function clearError(inputField) {
        const errorDiv = inputField.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error-message')) {
            errorDiv.textContent = '';
        }
        inputField.classList.remove('error');
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
                showError(input, `Please enter a valid email address from an allowed domain.`);
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
    Array.from(volunteerOrgForm.querySelectorAll('input, textarea, select')).forEach(input => {
        const fieldConfig = {
            'organization': { label: 'Organization Name' },
            'contact-person': { label: 'Contact Person', lettersOnly: true },
            'email': { label: 'Email', isEmail: true },
            'mobileNumber': { label: 'Mobile Number', isMobile: true },
            'socialMedia': { label: 'Social Media', isUrl: true, required: false },
            'streetAddress': { label: 'Street Address' },
            'region': { label: 'Region' },
            'province': { label: 'Province' },
            'city': { label: 'City' },
            'barangay': { label: 'Barangay' },
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
                streetAddress: document.getElementById('streetAddress'),
                region: document.getElementById('region'),
                province: document.getElementById('province'),
                city: document.getElementById('city'),
                barangay: document.getElementById('barangay'),
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

    var my_handlers = {
        fill_regions: function() {
            if (regionTextInput) regionTextInput.value = '';
            if (provinceTextInput) provinceTextInput.value = '';
            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';

            regionSelect.innerHTML = '<option value="" selected="true" disabled>Choose Region</option>';
            regionSelect.selectedIndex = 0;

            provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Region First</option>';
            provinceSelect.selectedIndex = 0;

            citySelect.innerHTML = '<option value="" selected="true" disabled>Choose Region First</option>';
            citySelect.selectedIndex = 0;

            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Region First</option>';
            barangaySelect.selectedIndex = 0;

            const url = '../json/region.json';

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!Array.isArray(data) || !data.every(item => item.region_code && item.region_name)) {
                        throw new Error("Invalid region data structure");
                    }

                    data.sort(function(a, b) {
                        return a.region_name.localeCompare(b.region_name);
                    });

                    data.forEach(entry => {
                        const opt = document.createElement('option');
                        opt.value = entry.region_code;
                        opt.textContent = entry.region_name;
                        regionSelect.appendChild(opt);
                    });
                })
                .catch(error => {
                    console.error("Request for region.json Failed (Vanilla JS): " + error.message);
                    console.error("Fetch error object: ", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Failed to Load Regions',
                        text: `Unable to load region data: ${error.message}. Check if ${url} is accessible.`,
                        confirmButtonText: 'OK'
                    });
                });
        },
        fill_provinces: function() {
            const region_code = regionSelect.value;

            if (!region_code) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select Region First',
                    text: 'Please select a region before choosing a province.',
                    confirmButtonText: 'OK'
                });
                provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
                provinceSelect.selectedIndex = 0;
                citySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
                citySelect.selectedIndex = 0;
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
                barangaySelect.selectedIndex = 0;
                if (provinceTextInput) provinceTextInput.value = '';
                if (cityTextInput) cityTextInput.value = '';
                if (barangayTextInput) barangayTextInput.value = '';
                return;
            }

            const region_text = regionSelect.options[regionSelect.selectedIndex].textContent;
            if (regionTextInput) regionTextInput.value = region_text;

            if (provinceTextInput) provinceTextInput.value = '';
            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';

            provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
            provinceSelect.selectedIndex = 0;

            citySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
            citySelect.selectedIndex = 0;

            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
            barangaySelect.selectedIndex = 0;

            const url = '../json/province.json';

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!Array.isArray(data) || !data.every(item => item.region_code && item.province_code && item.province_name)) {
                        throw new Error("Invalid province data structure");
                    }

                    var result = data.filter(function(value) {
                        return value.region_code == region_code;
                    });

                    result.sort(function(a, b) {
                        return a.province_name.localeCompare(b.province_name);
                    });

                    result.forEach(entry => {
                        const opt = document.createElement('option');
                        opt.value = entry.province_code;
                        opt.textContent = entry.province_name;
                        provinceSelect.appendChild(opt);
                    });
                })
                .catch(error => {
                    console.error("Request for province.json Failed (Vanilla JS): " + error.message);
                    console.error("Fetch error object: ", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Failed to Load Provinces',
                        text: `Unable to load province data: ${error.message}. Check if ${url} is accessible.`,
                        confirmButtonText: 'OK'
                    });
                });
        },
        fill_cities: function() {
            const province_code = provinceSelect.value;

            if (!province_code) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select Province First',
                    text: 'Please select a province before choosing a city/municipality.',
                    confirmButtonText: 'OK'
                });
                citySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
                citySelect.selectedIndex = 0;
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
                barangaySelect.selectedIndex = 0;
                if (cityTextInput) cityTextInput.value = '';
                if (barangayTextInput) barangayTextInput.value = '';
                return;
            }

            const province_text = provinceSelect.options[provinceSelect.selectedIndex].textContent;
            if (provinceTextInput) provinceTextInput.value = province_text;

            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';

            citySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
            citySelect.selectedIndex = 0;

            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';
            barangaySelect.selectedIndex = 0;

            const url = '../json/city.json';

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!Array.isArray(data) || !data.every(item => item.province_code && item.city_code && item.city_name)) {
                        throw new Error("Invalid city data structure");
                    }

                    var result = data.filter(function(value) {
                        return value.province_code == province_code;
                    });

                    result.sort(function(a, b) {
                        return a.city_name.localeCompare(b.city_name);
                    });

                    result.forEach(entry => {
                        const opt = document.createElement('option');
                        opt.value = entry.city_code;
                        opt.textContent = entry.city_name;
                        citySelect.appendChild(opt);
                    });
                })
                .catch(error => {
                    console.error("Request for city.json Failed (Vanilla JS): " + error.message);
                    console.error("Fetch error object: ", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Failed to Load Cities',
                        text: `Unable to load city data: ${error.message}. Check if ${url} is accessible.`,
                        confirmButtonText: 'OK'
                    });
                });
        },
        fill_barangays: function() {
            const city_code = citySelect.value;

            if (!city_code) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select City/Municipality First',
                    text: 'Please select a city/municipality before choosing a barangay.',
                    confirmButtonText: 'OK'
                });
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose barangay</option>';
                barangaySelect.selectedIndex = 0;
                if (barangayTextInput) barangayTextInput.value = '';
                return;
            }

            const city_text = citySelect.options[citySelect.selectedIndex].textContent;
            if (cityTextInput) cityTextInput.value = city_text;

            if (barangayTextInput) barangayTextInput.value = '';

            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose barangay</option>';
            barangaySelect.selectedIndex = 0;

            const url = '../json/barangay.json';

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!Array.isArray(data) || !data.every(item => item.city_code && item.brgy_code && item.brgy_name)) {
                        throw new Error("Invalid barangay data structure");
                    }

                    var result = data.filter(function(value) {
                        return value.city_code == city_code;
                    });

                    result.sort(function(a, b) {
                        return a.brgy_name.localeCompare(b.brgy_name);
                    });

                    result.forEach(entry => {
                        const opt = document.createElement('option');
                        opt.value = entry.brgy_code;
                        opt.textContent = entry.brgy_name;
                        barangaySelect.appendChild(opt);
                    });
                })
                .catch(error => {
                    console.error("Request for barangay.json Failed (Vanilla JS): " + error.message);
                    console.error("Fetch error object: ", error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Failed to Load Barangays',
                        text: `Unable to load barangay data: ${error.message}. Check if ${url} is accessible.`,
                        confirmButtonText: 'OK'
                    });
                });
        },
        onchange_barangay: function() {
            const barangay_text = barangaySelect.options[barangaySelect.selectedIndex]?.textContent || '';
            if (barangayTextInput) barangayTextInput.value = barangay_text;
        },
    };

    // Attach event listeners for the location dropdowns
    if (regionSelect) regionSelect.addEventListener('change', my_handlers.fill_provinces);
    if (provinceSelect) provinceSelect.addEventListener('change', my_handlers.fill_cities);
    if (citySelect) citySelect.addEventListener('change', my_handlers.fill_barangays);
    if (barangaySelect) barangaySelect.addEventListener('change', my_handlers.onchange_barangay);

    // Call the initial fill for regions directly on page load
    my_handlers.fill_regions();

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
                    streetAddress: document.getElementById('streetAddress'),
                    region: document.getElementById('region'),
                    province: document.getElementById('province'),
                    city: document.getElementById('city'),
                    barangay: document.getElementById('barangay'),
                    organizationalBackgroundMission: document.getElementById('organizationalBackgroundMission'),
                    areasOfExpertiseFocus: document.getElementById('areasOfExpertiseFocus'),
                    legalStatusRegistration: document.getElementById('legalStatusRegistration'),
                    requiredDocumentsLink: document.getElementById('requiredDocumentsLink')
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
                    { id: 'streetAddress', label: 'Street Address' },
                    { id: 'region', label: 'Region' },
                    { id: 'province', label: 'Province' },
                    { id: 'city', label: 'City' },
                    { id: 'barangay', label: 'Barangay' },
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
                            showError(input, `Please enter a valid email address from an allowed domain.`);
                            errors.push(`Please enter a valid email address from an allowed domain.`);
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
                        region: regionSelect.options[regionSelect.selectedIndex]?.textContent || '',
                        province: provinceSelect.options[provinceSelect.selectedIndex]?.textContent || '',
                        city: citySelect.options[citySelect.selectedIndex]?.textContent || '',
                        barangay: barangaySelect.options[barangaySelect.selectedIndex]?.textContent || '',
                        streetAddress: inputs.streetAddress.value.trim()
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

                // Reset form and reCAPTCHA after successful submission
                volunteerOrgForm.reset();
                my_handlers.fill_regions();
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