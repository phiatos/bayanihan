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
    const volunteerForm = document.getElementById('volunteer-org-form');
    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const barangaySelect = document.getElementById('barangay');
    const streetAddressInput = document.getElementById('streetAddress');
    const regionTextInput = document.getElementById('region-text');
    const provinceTextInput = document.getElementById('province-text');
    const cityTextInput = document.getElementById('city-text');
    const barangayTextInput = document.getElementById('barangay-text');
    const availabilityInputsDiv = document.getElementById('availability-inputs');
    const addAvailabilityButton = document.getElementById('addAvailability');
    const volunteerAvailabilityHiddenInput = document.getElementById('volunteerAvailability');
    const submitButton = document.querySelector('.btn-primary');
    let isSubmitting = false;
    const agreeCheckbox = document.getElementById('agreeToTerms');
    const agreementMessage = document.getElementById('agreementMessage');
    const openTermsLink = document.getElementById('openTerms');
    const openPrivacyLink = document.getElementById('openPrivacy');
    const termsContentDiv = document.getElementById('termsContent');
    const privacyContentDiv = document.getElementById('privacyContent');
    const otherCheckbox = document.getElementById('otherSkillCheckbox');
    const otherComments = document.getElementById('otherSkillComments');

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

    // Real-time input restrictions for age
    function restrictAgeInput(input) {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9]/g, '');
            if (input.value.length > 2) {
                input.value = input.value.slice(0, 2);
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
            if (fieldConfig.isAge) {
                const parsedAge = parseInt(input.value, 10);
                if (isNaN(parsedAge) || parsedAge < 18) {
                    showError(input, `${fieldConfig.label} must be 18 or older.`);
                }
            }
            if (fieldConfig.isUrl) {
                try {
                    new URL(input.value);
                } catch (e) {
                    showError(input, `${fieldConfig.label} must be a valid URL (e.g., https://facebook.com/yourpage).`);
                }
            }
        }
    }

    // Apply real-time validation to form inputs
    Array.from(volunteerForm.querySelectorAll('input, textarea, select')).forEach(input => {
        const fieldConfig = {
            'firstName': { label: 'First Name', lettersOnly: true },
            'middleInitial': { label: 'Middle Initial', lettersOnly: true, required: false },
            'lastName': { label: 'Last Name', lettersOnly: true },
            'nameExtension': { label: 'Name Extension', lettersOnly: true, required: false },
            'email': { label: 'Email', isEmail: true },
            'mobileNumber': { label: 'Mobile Number', isMobile: true },
            'socialMedia': { label: 'Social Media', isUrl: true, required: false },
            'age': { label: 'Age', isAge: true },
            'streetAddress': { label: 'Street Address' },
            'otherSkillComments': { label: 'Other Skill Details', required: false },
            'region': { label: 'Region' },
            'province': { label: 'Province' },
            'city': { label: 'City' },
            'barangay': { label: 'Barangay' }
        }[input.id];
        if (fieldConfig) {
            input.addEventListener('input', () => validateInputInRealTime(input, fieldConfig, {
                firstName: document.getElementById('firstName'),
                middleInitial: document.getElementById('middleInitial'),
                lastName: document.getElementById('lastName'),
                nameExtension: document.getElementById('nameExtension'),
                email: document.getElementById('email'),
                mobileNumber: document.getElementById('mobileNumber'),
                socialMedia: document.getElementById('socialMedia'),
                age: document.getElementById('age'),
                streetAddress: document.getElementById('streetAddress'),
                otherSkillComments: document.getElementById('otherSkillComments'),
                region: document.getElementById('region'),
                province: document.getElementById('province'),
                city: document.getElementById('city'),
                barangay: document.getElementById('barangay')
            }));
        }
    });

    // Apply input restrictions
    restrictMobileNumberInput(document.getElementById('mobileNumber'));
    restrictAgeInput(document.getElementById('age'));

    // Set min date for availability inputs to tomorrow
    function setMinDateForAvailability() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        document.querySelectorAll('.availability-date').forEach(dateInput => {
            dateInput.setAttribute('min', minDate);
        });
    }

    // Validate all form inputs for submission
    async function validateFormForSubmission(inputs) {
        let isValid = true;
        const errors = [];
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
        sixMonthsFromNow.setHours(23, 59, 59, 999);
        const submittedDateTimes = new Set();

        const fieldsToCheck = [
            { id: 'firstName', label: 'First Name', lettersOnly: true },
            { id: 'middleInitial', label: 'Middle Initial', lettersOnly: true, required: false },
            { id: 'lastName', label: 'Last Name', lettersOnly: true },
            { id: 'nameExtension', label: 'Name Extension', lettersOnly: true, required: false },
            { id: 'email', label: 'Email', isEmail: true },
            { id: 'mobileNumber', label: 'Mobile Number', isMobile: true },
            { id: 'socialMedia', label: 'Social Media', isUrl: true, required: false },
            { id: 'age', label: 'Age', isAge: true },
            { id: 'streetAddress', label: 'Street Address' },
            { id: 'otherSkillComments', label: 'Other Skill Details', required: otherCheckbox.checked },
            { id: 'region', label: 'Region' },
            { id: 'province', label: 'Province' },
            { id: 'city', label: 'City' },
            { id: 'barangay', label: 'Barangay' }
        ];

        fieldsToCheck.forEach(({ id, label, lettersOnly, isEmail, isMobile, isAge, isUrl, required }) => {
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
                if (isAge) {
                    const parsedAge = parseInt(input.value, 10);
                    if (isNaN(parsedAge) || parsedAge < 18) {
                        showError(input, `${label} must be 18 or older.`);
                        errors.push(`${label} must be 18 or older.`);
                        isValid = false;
                    }
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
            }
        });

        // Check skills
        const skillCheckboxes = document.querySelectorAll('input[name="skills"]:checked');
        const selectedSkills = Array.from(skillCheckboxes).map(checkbox => checkbox.value);
        if (selectedSkills.length < 1 || selectedSkills.length > 3) {
            errors.push('Please select between 1 and 3 skills.');
            isValid = false;
        }

        // Check availability
        const availabilityItems = document.querySelectorAll('.availability-item');
        const specificDateTimeAvailability = [];
        let hasEmptySpecificDateTimeField = false;

        for (const item of availabilityItems) {
            const dateInput = item.querySelector('.availability-date');
            const timeInput = item.querySelector('.availability-time');
            if (dateInput && timeInput) {
                const date = dateInput.value.trim();
                const time24h = timeInput.value.trim();
                if (!date || !time24h) {
                    hasEmptySpecificDateTimeField = true;
                    errors.push('Please fill in all date and time fields for your specific availability.');
                    isValid = false;
                    continue;
                }
                const selectedDateTime = new Date(`${date}T${time24h}:00`);
                const formattedTime12h = convertTo12HourFormat(time24h);
                if (selectedDateTime > sixMonthsFromNow) {
                    errors.push(`Availability slot on ${date} at ${formattedTime12h} is beyond the 6-month scheduling window.`);
                    isValid = false;
                }
                const dateTimeString = `${date} ${time24h}`;
                if (submittedDateTimes.has(dateTimeString)) {
                    errors.push(`Duplicate availability slot found: ${date} at ${formattedTime12h}.`);
                    isValid = false;
                }
                submittedDateTimes.add(dateTimeString);
                specificDateTimeAvailability.push({ date: date, time: formattedTime12h });
            }
        }

        if (hasEmptySpecificDateTimeField) {
            isValid = false;
        }

        if (specificDateTimeAvailability.length === 0 && availabilityItems.length > 0) {
            errors.push('Please add at least one specific date and time for your availability.');
            isValid = false;
        }

        // Duplicate checks
        if (isValid) {
            const firstName = inputs.firstName.value.trim();
            const lastName = inputs.lastName.value.trim();
            const email = inputs.email.value.trim();
            const mobileNumber = inputs.mobileNumber.value.trim();
            const volunteersRef = database.ref("volunteerApplications/pendingVolunteer");
            const allApplicationsSnapshot = await volunteersRef.once('value');
            let emailAlreadyExists = false;
            let mobileNumberAlreadyExists = false;
            let nameAlreadyExists = false;

            allApplicationsSnapshot.forEach(childSnapshot => {
                const volunteer = childSnapshot.val();
                if (volunteer.email && volunteer.email.toLowerCase() === email.toLowerCase()) {
                    emailAlreadyExists = true;
                }
                if (volunteer.mobileNumber && volunteer.mobileNumber === mobileNumber) {
                    mobileNumberAlreadyExists = true;
                }
                if (volunteer.firstName && volunteer.lastName &&
                    volunteer.firstName.toLowerCase() === firstName.toLowerCase() &&
                    volunteer.lastName.toLowerCase() === lastName.toLowerCase()) {
                    nameAlreadyExists = true;
                }
            });

            if (emailAlreadyExists) {
                showError(inputs.email, 'This email address is already used.');
                errors.push('An application with this email address already exists.');
                isValid = false;
            }
            if (mobileNumberAlreadyExists) {
                showError(inputs.mobileNumber, 'This mobile number is already used.');
                errors.push('An application with this mobile number already exists.');
                isValid = false;
            }
            if (nameAlreadyExists) {
                showError(inputs.firstName, 'This name is already used.');
                showError(inputs.lastName, 'This name is already used.');
                errors.push('An application with this name already exists.');
                isValid = false;
            }
        }

        return { isValid, errors };
    }

    if (otherCheckbox && otherComments) {
        otherCheckbox.addEventListener('change', (event) => {
            if (event.target.checked) {
                otherComments.style.display = 'block';
                otherComments.setAttribute('required', 'required');
            } else {
                otherComments.style.display = 'none';
                otherComments.removeAttribute('required');
                clearError(otherComments);
            }
        });
    }

    const convertTo12HourFormat = (time24h) => {
        const [hours, minutes] = time24h.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hour12}:${formattedMinutes} ${ampm}`;
    };

    const updateSubmitButtonState = () => {
        if (submitButton && agreeCheckbox) {
            submitButton.disabled = !agreeCheckbox.checked;
            if (agreementMessage) {
                agreementMessage.style.display = agreeCheckbox.checked ? 'none' : 'block';
            }
        }
    };

    if (agreeCheckbox) {
        agreeCheckbox.addEventListener('change', updateSubmitButtonState);
    }

    // Initialize min date for existing availability inputs
    setMinDateForAvailability();

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

    const addAvailabilityItem = () => {
        const availabilityItemDiv = document.createElement('div');
        availabilityItemDiv.classList.add('availability-item', 'form-group');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];
        availabilityItemDiv.innerHTML = `
            <label>Date:</label>
            <input type="date" class="availability-date" min="${minDate}" required>
            <label>Time:</label>
            <input type="time" class="availability-time" required>
            <button type="button" class="remove-availability-item">Remove</button>
        `;
        availabilityInputsDiv.appendChild(availabilityItemDiv);
        updateRemoveButtons();
    };

    const updateRemoveButtons = () => {
        const removeButtons = document.querySelectorAll('.remove-availability-item');
        removeButtons.forEach(button => {
            button.removeEventListener('click', handleRemoveAvailability);
            button.addEventListener('click', handleRemoveAvailability);
        });
    };

    const handleRemoveAvailability = (e) => {
        const itemToRemove = e.target.closest('.availability-item');
        if (itemToRemove) {
            if (availabilityInputsDiv.children.length > 1) {
                itemToRemove.remove();
            } else {
                Swal.fire('Info', 'You must provide at least one specific date and time for your availability.', 'info');
            }
        }
    };

    if (addAvailabilityButton) {
        addAvailabilityButton.addEventListener('click', addAvailabilityItem);
    }

    updateRemoveButtons();

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
            console.log(`Fetching regions from: ${url}`);

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Region data loaded (Vanilla JS):", data);
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
            var region_code = regionSelect.value;

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
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';
                barangaySelect.selectedIndex = 0;
                if (provinceTextInput) provinceTextInput.value = '';
                if (cityTextInput) cityTextInput.value = '';
                if (barangayTextInput) barangayTextInput.value = '';
                return;
            }

            var region_text = regionSelect.options[regionSelect.selectedIndex].textContent;
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
            console.log(`Fetching provinces from: ${url}`);

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Province data loaded (Vanilla JS):", data);
                    if (!Array.isArray(data) || !data.every(item => item.region_code && item.province_code && item.province_name)) {
                        throw new Error("Invalid province data structure");
                    }

                    var result = data.filter(function(value) {
                        return value.region_code === region_code;
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
            var province_code = provinceSelect.value;

            if (!province_code) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select Province First',
                    text: 'Please select a province before choosing a city/municipality.',
                    confirmButtonText: 'OK'
                });
                citySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
                citySelect.selectedIndex = 0;
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';
                barangaySelect.selectedIndex = 0;
                if (cityTextInput) cityTextInput.value = '';
                if (barangayTextInput) barangayTextInput.value = '';
                return;
            }

            var province_text = provinceSelect.options[provinceSelect.selectedIndex].textContent;
            if (provinceTextInput) provinceTextInput.value = province_text;

            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';

            citySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
            citySelect.selectedIndex = 0;

            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';
            barangaySelect.selectedIndex = 0;

            const url = '../json/city.json';
            console.log(`Fetching cities from: ${url}`);

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("City data loaded (Vanilla JS):", data);
                    if (!Array.isArray(data) || !data.every(item => item.province_code && item.city_code && item.city_name)) {
                        throw new Error("Invalid city data structure");
                    }

                    var result = data.filter(function(value) {
                        return value.province_code === province_code;
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
            var city_code = citySelect.value;

            if (!city_code) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select City/Municipality First',
                    text: 'Please select a city/municipality before choosing a barangay.',
                    confirmButtonText: 'OK'
                });
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
                barangaySelect.selectedIndex = 0;
                if (barangayTextInput) barangayTextInput.value = '';
                return;
            }

            var city_text = citySelect.options[citySelect.selectedIndex].textContent;
            if (cityTextInput) cityTextInput.value = city_text;

            if (barangayTextInput) barangayTextInput.value = '';

            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
            barangaySelect.selectedIndex = 0;

            const url = '../json/barangay.json';
            console.log(`Fetching barangays from: ${url}`);

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Barangay data loaded (Vanilla JS):", data);
                    if (!Array.isArray(data) || !data.every(item => item.city_code && item.brgy_code && item.brgy_name)) {
                        throw new Error("Invalid barangay data structure");
                    }

                    var result = data.filter(function(value) {
                        return value.city_code === city_code;
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
            var barangay_text = barangaySelect.options[barangaySelect.selectedIndex].textContent;
            if (barangayTextInput) barangayTextInput.value = barangay_text;
        },
    };

    if (regionSelect) regionSelect.addEventListener('change', my_handlers.fill_provinces);
    if (provinceSelect) provinceSelect.addEventListener('change', my_handlers.fill_cities);
    if (citySelect) citySelect.addEventListener('change', my_handlers.fill_barangays);
    if (barangaySelect) barangaySelect.addEventListener('change', my_handlers.onchange_barangay);

    my_handlers.fill_regions();

    if (volunteerForm) {
        volunteerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (isSubmitting) {
                console.log('Already submitting, please wait...');
                return;
            }

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
                    firstName: document.getElementById('firstName'),
                    middleInitial: document.getElementById('middleInitial'),
                    lastName: document.getElementById('lastName'),
                    nameExtension: document.getElementById('nameExtension'),
                    email: document.getElementById('email'),
                    mobileNumber: document.getElementById('mobileNumber'),
                    socialMedia: document.getElementById('socialMedia'),
                    age: document.getElementById('age'),
                    streetAddress: document.getElementById('streetAddress'),
                    otherSkillComments: document.getElementById('otherSkillComments'),
                    region: document.getElementById('region'),
                    province: document.getElementById('province'),
                    city: document.getElementById('city'),
                    barangay: document.getElementById('barangay')
                };

                const { isValid, errors } = await validateFormForSubmission(inputs);
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

                const selectedRegionText = regionSelect.options[regionSelect.selectedIndex]?.textContent || '';
                const selectedProvinceText = provinceSelect.options[provinceSelect.selectedIndex]?.textContent || '';
                const selectedCityText = citySelect.options[citySelect.selectedIndex]?.textContent || '';
                const selectedBarangayText = barangaySelect.options[barangaySelect.selectedIndex]?.textContent || '';
                const volunteerData = {
                    firstName: inputs.firstName.value.trim(),
                    middleInitial: inputs.middleInitial.value.trim(),
                    lastName: inputs.lastName.value.trim(),
                    nameExtension: inputs.nameExtension.value.trim(),
                    email: inputs.email.value.trim(),
                    mobileNumber: inputs.mobileNumber.value.trim(),
                    socialMediaLink: inputs.socialMedia.value.trim(),
                    age: parseInt(inputs.age.value, 10),
                    skills: Array.from(document.querySelectorAll('input[name="skills"]:checked')).map(checkbox => checkbox.value),
                    otherSkillComments: inputs.otherSkillComments.value.trim() || '',
                    address: {
                        region: selectedRegionText,
                        province: selectedProvinceText,
                        city: selectedCityText,
                        barangay: selectedBarangayText,
                        streetAddress: inputs.streetAddress.value.trim()
                    },
                    availability: {
                        specificDateTimeSlots: JSON.parse(volunteerAvailabilityHiddenInput.value || '[]')
                    },
                    applicationDateandTime: new Date().toISOString(),
                    recaptchaResponse: recaptchaResponse
                };

                await database.ref("volunteerApplications/pendingVolunteer").push(volunteerData);

                console.log("Volunteer application saved to Realtime Database successfully!");
                Swal.fire('Success', 'Your volunteer application has been submitted successfully! Thank you for your interest in helping.', 'success');

                volunteerForm.reset();
                my_handlers.fill_regions();
                grecaptcha.reset();
                agreeCheckbox.checked = false;
                updateSubmitButtonState();
                while (availabilityInputsDiv.children.length > 1) {
                    availabilityInputsDiv.removeChild(availabilityInputsDiv.lastChild);
                }
                const firstAvailabilityDate = availabilityInputsDiv.querySelector('.availability-date');
                const firstAvailabilityTime = availabilityInputsDiv.querySelector('.availability-time');
                if (firstAvailabilityDate) firstAvailabilityDate.value = '';
                if (firstAvailabilityTime) firstAvailabilityTime.value = '';
                if (otherComments) {
                    otherComments.style.display = 'none';
                    otherComments.removeAttribute('required');
                }
                Array.from(volunteerForm.querySelectorAll('.error-message')).forEach(msg => msg.textContent = '');
                Array.from(volunteerForm.querySelectorAll('.error')).forEach(input => input.classList.remove('error'));

            } catch (error) {
                console.error("Error adding volunteer application to Realtime Database: ", error);
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
});

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