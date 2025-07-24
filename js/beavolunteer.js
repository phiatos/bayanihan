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

// Initialize Firebase using the compatibility layer
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth(); // Although 'auth' is initialized, it's not used in the provided logic.

document.addEventListener('DOMContentLoaded', () => {
    const volunteerForm = document.getElementById('volunteer-org-form');

    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const barangaySelect = document.getElementById('barangay');
    const streetAddressInput = document.getElementById('streetAddress');

    // Hidden inputs to store the text values of selected location options
    const regionTextInput = document.getElementById('region-text');
    const provinceTextInput = document.getElementById('province-text');
    const cityTextInput = document.getElementById('city-text');
    const barangayTextInput = document.getElementById('barangay-text');

    const availabilityInputsDiv = document.getElementById('availability-inputs');
    const addAvailabilityButton = document.getElementById('addAvailability');
    // Hidden input to store the JSON string of collected date/time array
    const volunteerAvailabilityHiddenInput = document.getElementById('volunteerAvailability'); 

    const submitButton = document.querySelector('.btn-primary');
    let isSubmitting = false; // Flag to prevent multiple submissions

    const agreeCheckbox = document.getElementById('agreeToTerms');
    const agreementMessage = document.getElementById('agreementMessage');
    const openTermsLink = document.getElementById('openTerms'); 
    const openPrivacyLink = document.getElementById('openPrivacy'); 
    const termsContentDiv = document.getElementById('termsContent'); 
    const privacyContentDiv = document.getElementById('privacyContent'); 

    const convertTo12HourFormat = (time24h) => {
        const [hours, minutes] = time24h.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hour12}:${formattedMinutes} ${ampm}`;
    };

    /**
     * Updates the state of the submit button based on the agreement checkbox.
     * Also toggles the visibility of the agreement message.
     */
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

    // Event listeners for opening T&C and Privacy Policy pop-ups using SweetAlert2
    if (openTermsLink && termsContentDiv) {
        openTermsLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent navigating to a new page
            Swal.fire({
                title: 'Terms and Conditions',
                html: termsContentDiv.innerHTML, // Get content from the hidden div
                icon: 'info',
                width: '80%', // Make the modal wider
                showCloseButton: true,
                focusConfirm: false,
                confirmButtonText: 'Close',
                customClass: {
                    container: 'swal2-container-custom', // Custom class for additional styling if needed
                    popup: 'swal2-popup-custom',
                    title: 'swal2-title-custom',
                    htmlContainer: 'swal2-html-container-custom',
                }
            });
        });
    }

    if (openPrivacyLink && privacyContentDiv) {
        openPrivacyLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent navigating to a new page
            Swal.fire({
                title: 'Privacy Policy',
                html: privacyContentDiv.innerHTML, // Get content from the hidden div
                icon: 'info',
                width: '80%', // Make the modal wider
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

    /**
     * Adds a new date/time availability input group to the form.
     */
    const addAvailabilityItem = () => {
        const availabilityItemDiv = document.createElement('div');
        availabilityItemDiv.classList.add('availability-item', 'form-group'); // Maintain form-group for styling
        availabilityItemDiv.innerHTML = `
            <label>Date:</label>
            <input type="date" class="availability-date" required>
            <label>Time:</label>
            <input type="time" class="availability-time" required>
            <button type="button" class="remove-availability-item">Remove</button>
        `;
        availabilityInputsDiv.appendChild(availabilityItemDiv);
        updateRemoveButtons(); // Ensure new remove button is functional
    };

    /**
     * Attaches or re-attaches event listeners to all "Remove" buttons for availability items.
     */
    const updateRemoveButtons = () => {
        const removeButtons = document.querySelectorAll('.remove-availability-item');
        removeButtons.forEach(button => {
            // Remove existing listener to prevent duplicates before adding
            button.removeEventListener('click', handleRemoveAvailability);
            button.addEventListener('click', handleRemoveAvailability);
        });
    };

    /**
     * Handles the removal of an availability item from the form.
     * Prevents removal if it's the last item.
     * @param {Event} e - The click event.
     */
    const handleRemoveAvailability = (e) => {
        const itemToRemove = e.target.closest('.availability-item');
        if (itemToRemove) {
            // Ensure there's always at least one availability item
            // The first item is present by default in HTML, so we only allow removal if there's more than one.
            if (availabilityInputsDiv.children.length > 1) {
                itemToRemove.remove();
            } else {
                Swal.fire('Info', 'You must provide at least one specific date and time for your availability.', 'info');
            }
        }
    };

    // Add event listener for "Add Another Date/Time" button
    if (addAvailabilityButton) {
        addAvailabilityButton.addEventListener('click', addAvailabilityItem);
    }

    // Initial call to set up remove button for the first availability item on page load
    updateRemoveButtons();

    // Handlers for populating location dropdowns (Regions, Provinces, Cities, Barangays)
    var my_handlers = {
        /**
         * Fills the region dropdown by fetching data from region.json.
         * Resets dependent dropdowns and hidden text inputs.
         */
        fill_regions: function() {
            // Clear current selections in hidden text inputs when re-filling regions
            if (regionTextInput) regionTextInput.value = '';
            if (provinceTextInput) provinceTextInput.value = '';
            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';

            // Reset dropdowns to their default "Choose" states
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
                    // Validate data structure
                    if (!Array.isArray(data) || !data.every(item => item.region_code && item.region_name)) {
                        throw new Error("Invalid region data structure");
                    }

                    // Sort regions alphabetically
                    data.sort(function(a, b) {
                        return a.region_name.localeCompare(b.region_name);
                    });

                    // Populate the region dropdown
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
        /**
         * Fills the province dropdown based on the selected region.
         * Resets dependent dropdowns and hidden text inputs.
         */
        fill_provinces: function() {
            var region_code = regionSelect.value;

            // Warn if no region is selected
            if (!region_code) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select Region First',
                    text: 'Please select a region before choosing a province.',
                    confirmButtonText: 'OK'
                });
                // Reset dependent dropdowns and hidden inputs
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

            // Update hidden text input for region
            var region_text = regionSelect.options[regionSelect.selectedIndex].textContent;
            if (regionTextInput) regionTextInput.value = region_text;

            // Clear dependent hidden text inputs
            if (provinceTextInput) provinceTextInput.value = '';
            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';

            // Reset dependent dropdowns
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
                    // Validate data structure
                    if (!Array.isArray(data) || !data.every(item => item.region_code && item.province_code && item.province_name)) {
                        throw new Error("Invalid province data structure");
                    }

                    // Filter provinces by selected region code
                    var result = data.filter(function(value) {
                        return value.region_code === region_code;
                    });

                    // Sort provinces alphabetically
                    result.sort(function(a, b) {
                        return a.province_name.localeCompare(b.province_name);
                    });

                    // Populate the province dropdown
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
        /**
         * Fills the city dropdown based on the selected province.
         * Resets dependent dropdowns and hidden text inputs.
         */
        fill_cities: function() {
            var province_code = provinceSelect.value;

            // Warn if no province is selected
            if (!province_code) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select Province First',
                    text: 'Please select a province before choosing a city/municipality.',
                    confirmButtonText: 'OK'
                });
                // Reset dependent dropdowns and hidden inputs
                citySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
                citySelect.selectedIndex = 0;
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';
                barangaySelect.selectedIndex = 0;
                if (cityTextInput) cityTextInput.value = '';
                if (barangayTextInput) barangayTextInput.value = '';
                return;
            }

            // Update hidden text input for province
            var province_text = provinceSelect.options[provinceSelect.selectedIndex].textContent;
            if (provinceTextInput) provinceTextInput.value = province_text;

            // Clear dependent hidden text inputs
            if (cityTextInput) cityTextInput.value = '';
            if (barangayTextInput) barangayTextInput.value = '';

            // Reset dependent dropdowns
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
                    // Validate data structure
                    if (!Array.isArray(data) || !data.every(item => item.province_code && item.city_code && item.city_name)) {
                        throw new Error("Invalid city data structure");
                    }

                    // Filter cities by selected province code
                    var result = data.filter(function(value) {
                        return value.province_code === province_code;
                    });

                    // Sort cities alphabetically
                    result.sort(function(a, b) {
                        return a.city_name.localeCompare(b.city_name);
                    });

                    // Populate the city dropdown
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
        /**
         * Fills the barangay dropdown based on the selected city.
         * Resets dependent dropdown and hidden text input.
         */
        fill_barangays: function() {
            var city_code = citySelect.value;

            // Warn if no city is selected
            if (!city_code) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Select City/Municipality First',
                    text: 'Please select a city/municipality before choosing a barangay.',
                    confirmButtonText: 'OK'
                });
                // Reset dependent dropdown and hidden input
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
                barangaySelect.selectedIndex = 0;
                if (barangayTextInput) barangayTextInput.value = '';
                return;
            }

            // Update hidden text input for city
            var city_text = citySelect.options[citySelect.selectedIndex].textContent;
            if (cityTextInput) cityTextInput.value = city_text;

            // Clear dependent hidden text input
            if (barangayTextInput) barangayTextInput.value = '';

            // Reset dependent dropdown
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
                    // Validate data structure
                    if (!Array.isArray(data) || !data.every(item => item.city_code && item.brgy_code && item.brgy_name)) {
                        throw new Error("Invalid barangay data structure");
                    }

                    // Filter barangays by selected city code
                    var result = data.filter(function(value) {
                        return value.city_code === city_code;
                    });

                    // Sort barangays alphabetically
                    result.sort(function(a, b) {
                        return a.brgy_name.localeCompare(b.brgy_name);
                    });

                    // Populate the barangay dropdown
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
        /**
         * Updates the hidden text input for the selected barangay.
         */
        onchange_barangay: function() {
            // Update hidden text input for barangay
            var barangay_text = barangaySelect.options[barangaySelect.selectedIndex].textContent;
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

    // Form submission handling
    if (volunteerForm) {
        volunteerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Prevent multiple rapid submissions
            if (isSubmitting) {
                console.log('Already submitting, please wait...');
                return;
            }

            // Check if terms and conditions are agreed upon
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
                    Swal.fire('Error', 'Please complete the reCAPTCHA to prove you are not a robot.', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // Collect form data
                const firstName = document.getElementById('firstName').value.trim();
                const middleInitial = document.getElementById('middleInitial').value.trim();
                const lastName = document.getElementById('lastName').value.trim();
                const nameExtension = document.getElementById('nameExtension').value.trim();
                const email = document.getElementById('email').value.trim();
                const mobileNumber = document.getElementById('mobileNumber').value.trim();
                const socialMedia = document.getElementById('socialMedia').value.trim();
                const age = document.getElementById('age').value.trim();
                const additionalInfo = document.getElementById('additionalInfo').value.trim();

                const selectedRegionText = regionSelect.options[regionSelect.selectedIndex]?.textContent || '';
                const selectedProvinceText = provinceSelect.options[provinceSelect.selectedIndex]?.textContent || '';
                const selectedCityText = citySelect.options[citySelect.selectedIndex]?.textContent || '';
                const selectedBarangayText = barangaySelect.options[barangaySelect.selectedIndex]?.textContent || '';
                const streetAddress = streetAddressInput.value.trim();

                // --- Collect dynamic specific date/time availabilities with validations ---
                const availabilityItems = document.querySelectorAll('.availability-item');
                const specificDateTimeAvailability = [];
                let hasEmptySpecificDateTimeField = false;

                // For date/time validations
                const now = new Date();
                // Set `now` to the start of the current day for date comparisons
                now.setHours(0, 0, 0, 0); 
                
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0); // Start of tomorrow
                
                const sixMonthsFromNow = new Date();
                sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
                sixMonthsFromNow.setHours(23, 59, 59, 999); // End of 6 months

                const submittedDateTimes = new Set(); // To check for duplicates

                for (const item of availabilityItems) { // Use for...of for easier return on validation failure
                    const dateInput = item.querySelector('.availability-date');
                    const timeInput = item.querySelector('.availability-time');

                    if (dateInput && timeInput) {
                        const date = dateInput.value.trim();
                        const time24h = timeInput.value.trim();

                        if (!date || !time24h) {
                            hasEmptySpecificDateTimeField = true;
                            continue; 
                        }

                        // Parse as local time. Adding ':00' for seconds as time input is HH:MM.
                        const selectedDateTime = new Date(`${date}T${time24h}:00`); 
                        const formattedTime12h = convertTo12HourFormat(time24h);

                        // Validation 1: Prevents past date and time
                        const currentMoment = new Date(); // Get current moment for real-time comparison
                        if (selectedDateTime <= currentMoment) {
                            Swal.fire('Error', `Availability slot on ${date} at ${formattedTime12h} is in the past or exactly the current time. Please select a future date and time.`, 'error');
                            submitButton.disabled = false;
                            submitButton.textContent = 'Submit Application';
                            isSubmitting = false;
                            grecaptcha.reset();
                            return; 
                        }

                        // Validation 2: Minimum time buffer (1 day from current date)
                        if (selectedDateTime < tomorrow) { // Compare against tomorrow's start
                            Swal.fire('Error', `Availability slot on ${date} at ${formattedTime12h} must be at least 1 day from the current date.`, 'error');
                            submitButton.disabled = false;
                            submitButton.textContent = 'Submit Application';
                            isSubmitting = false;
                            grecaptcha.reset();
                            return; 
                        }

                        // Validation 3: Maximum schedule window (6 months from current date)
                        if (selectedDateTime > sixMonthsFromNow) {
                            Swal.fire('Error', `Availability slot on ${date} at ${formattedTime12h} is beyond the 6-month scheduling window. Please select a date within the next 6 months.`, 'error');
                            submitButton.disabled = false;
                            submitButton.textContent = 'Submit Application';
                            isSubmitting = false;
                            grecaptcha.reset();
                            return; 
                        }

                        // Validation 4: Prevents same date and time as previous/other entries (duplicate check across all entries)
                        const dateTimeString = `${date} ${time24h}`; // Create a unique string for the set
                        if (submittedDateTimes.has(dateTimeString)) {
                            Swal.fire('Error', `Duplicate availability slot found: ${date} at ${formattedTime12h}. Please ensure each entry is unique.`, 'error');
                            submitButton.disabled = false;
                            submitButton.textContent = 'Submit Application';
                            isSubmitting = false;
                            grecaptcha.reset();
                            return; 
                        }
                        submittedDateTimes.add(dateTimeString);

                        specificDateTimeAvailability.push({ date: date, time: formattedTime12h });
                    }
                }

                if (hasEmptySpecificDateTimeField) {
                    Swal.fire('Error', 'Please fill in all date and time fields for your specific availability, or remove incomplete entries.', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // Ensure at least one specific date/time is provided if the section exists
                if (specificDateTimeAvailability.length === 0 && availabilityInputsDiv.children.length > 0) {
                    Swal.fire('Error', 'Please add at least one specific date and time for your availability.', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }
                
                // Store the collected specific date/time availability data as a JSON string in the hidden input
                volunteerAvailabilityHiddenInput.value = JSON.stringify(specificDateTimeAvailability);

                // Form Field Validation (general required fields)
                if (!firstName || !lastName || !email || !mobileNumber || !age ||
                    !selectedRegionText || !selectedProvinceText || !selectedCityText || !selectedBarangayText || !streetAddress) { // Removed generalAvailability from this check
                    Swal.fire('Error', 'Please fill in all required fields (Name, Contact Information, Age, Full Address, and Availability).', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // Email Format Validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    Swal.fire('Error', 'Please enter a valid email address (e.g., example@domain.com).', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // Mobile Number Format Validation (11 digits)
                const mobileNumberRegex = /^09\d{9}$/;
                if (!mobileNumberRegex.test(mobileNumber)) {
                    Swal.fire('Error', 'Please enter a valid 11-digit mobile number starting with "09" (e.g., 09171234567).', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // Social Media Link (URL) Validation
                if (socialMedia) {
                    try {
                        new URL(socialMedia);
                    } catch (e) {
                        Swal.fire('Error', 'Please enter a valid URL for your social media link (e.g., https://facebook.com/yourpage).', 'error');
                        submitButton.disabled = false;
                        submitButton.textContent = 'Submit Application';
                        isSubmitting = false;
                        grecaptcha.reset();
                        return;
                    }
                }

                const parsedAge = parseInt(age, 10);
                if (isNaN(parsedAge) || parsedAge < 18) {
                    Swal.fire('Error', 'Volunteers must be 18 years or older. Please enter a valid age.', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // Removed generalAvailability and specificDays validation as per HTML structure

                // --- Check for Duplicates ---
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

                // --- Apply Blocking Logic with Priority ---
                if (emailAlreadyExists) {
                    Swal.fire('Error', 'An application with this email address already exists. Please use a different email or contact support if you believe this is an error.', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                if (mobileNumberAlreadyExists) {
                    Swal.fire('Error', 'An application with this mobile number already exists. Please use a different mobile number or contact support if you believe this is an error.', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                if (nameAlreadyExists) {
                    Swal.fire('Error', 'An application with this name (first name and last name) already exists. Please ensure you are not submitting a duplicate application.', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // Create an object to store in Realtime Database
                const volunteerData = {
                    firstName: firstName,
                    middleInitial: middleInitial,
                    lastName: lastName,
                    nameExtension: nameExtension,
                    email: email,
                    mobileNumber: mobileNumber,
                    socialMediaLink: socialMedia,
                    age: parsedAge,
                    additionalInfo: additionalInfo,
                    address: {
                        region: selectedRegionText,
                        province: selectedProvinceText,
                        city: selectedCityText,
                        barangay: selectedBarangayText,
                        streetAddress: streetAddress
                    },
                    availability: {
                        // Removed generalAvailability and specificDaysSelected as they are not in HTML
                        // Removed generalTimeAvailability as it's not in HTML
                        specificDateTimeSlots: JSON.parse(volunteerAvailabilityHiddenInput.value) // Dynamic date/time slots
                    },
                    applicationDateandTime: new Date().toISOString(),
                    recaptchaResponse: recaptchaResponse
                };

                // Push data to Firebase
                await database.ref("volunteerApplications/pendingVolunteer").push(volunteerData);

                console.log("Volunteer application saved to Realtime Database successfully!");
                Swal.fire('Success', 'Your volunteer application has been submitted successfully! Thank you for your interest in helping.', 'success');

                // Reset form and reCAPTCHA after successful submission
                volunteerForm.reset();
                my_handlers.fill_regions();
                grecaptcha.reset();
                // Removed toggleSpecificAvailability() as it's not needed with simplified availability
                agreeCheckbox.checked = false;
                updateSubmitButtonState();
                // After form reset, ensure dynamic availability section is also reset
                // Remove all but the first availability item
                while (availabilityInputsDiv.children.length > 1) {
                    availabilityInputsDiv.removeChild(availabilityInputsDiv.lastChild);
                }
                // Clear the first item's inputs
                const firstAvailabilityDate = availabilityInputsDiv.querySelector('.availability-date');
                const firstAvailabilityTime = availabilityInputsDiv.querySelector('.availability-time');
                if (firstAvailabilityDate) firstAvailabilityDate.value = '';
                if (firstAvailabilityTime) firstAvailabilityTime.value = '';

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
