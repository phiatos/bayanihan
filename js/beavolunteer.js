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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth(); 

document.addEventListener('DOMContentLoaded', () => {
    const volunteerForm = document.getElementById('volunteer-org-form');
    // DOM elements for location dropdowns
    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const barangaySelect = document.getElementById('barangay');
    const streetAddressInput = document.getElementById('streetAddress');

    const regionTextInput = document.getElementById('region-text');
    const provinceTextInput = document.getElementById('province-text');
    const cityTextInput = document.querySelector('city-text'); 
    const barangayTextInput = document.getElementById('barangay-text');

    const generalAvailabilitySelect = document.getElementById('generalAvailability');
    const specificDaysGroup = document.getElementById('specificDaysGroup');

    // A flag to prevent multiple submissions
    let isSubmitting = false;
    
    if (generalAvailabilitySelect && specificDaysGroup) {
        generalAvailabilitySelect.addEventListener('change', () => {
            if (generalAvailabilitySelect.value === 'Specific days') {
                specificDaysGroup.style.display = 'block';
            } else {
                specificDaysGroup.style.display = 'none';
                // Uncheck all specific days checkboxes when not 'Specific days'
                const specificDaysCheckboxes = specificDaysGroup.querySelectorAll('input[type="checkbox"]');
                specificDaysCheckboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
            }
        });
    }

    var my_handlers = {
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
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>'; // Corrected from 'Choose Barangay'
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
                        return value.region_code === region_code; // Use strict equality
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
                        return value.province_code === province_code; // Use strict equality
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
                        return value.city_code === city_code; // Use strict equality
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

    // Handle form submission
    if (volunteerForm) {
        volunteerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitButton = document.querySelector('.btn-primary'); // Get the submit button

            // Prevent multiple rapid submissions
            if (isSubmitting) {
                console.log('Already submitting, please wait...');
                return;
            }

            // Disable the button and show submitting text
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            isSubmitting = true; // Set the flag

            try {
                // Get the reCAPTCHA response
                const recaptchaResponse = grecaptcha.getResponse();

                if (!recaptchaResponse) {
                    logActivity('RECAPTCHA_NOT_COMPLETED', { action: 'error' });
                    Swal.fire('Error', 'Please complete the reCAPTCHA to prove you are not a robot.', 'error');
                    // Re-enable the button and reset flag if reCAPTCHA is not completed
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return; // Stop the form submission
                }

                // Get form data for volunteer information
                const firstName = document.getElementById('firstName').value.trim();
                const middleInitial = document.getElementById('middleInitial').value.trim();
                const lastName = document.getElementById('lastName').value.trim();
                const nameExtension = document.getElementById('nameExtension').value.trim();
                const email = document.getElementById('email').value.trim();
                const mobileNumber = document.getElementById('mobileNumber').value.trim();
                const socialMedia = document.getElementById('socialMedia').value.trim();
                const age = document.getElementById('age').value.trim();
                const additionalInfo = document.getElementById('additionalInfo').value.trim();

                // Get selected text content from location dropdowns
                const selectedRegionText = regionSelect.options[regionSelect.selectedIndex]?.textContent || '';
                const selectedProvinceText = provinceSelect.options[provinceSelect.selectedIndex]?.textContent || '';
                const selectedCityText = citySelect.options[citySelect.selectedIndex]?.textContent || '';
                const selectedBarangayText = barangaySelect.options[barangaySelect.selectedIndex]?.textContent || '';
                const streetAddress = streetAddressInput.value.trim();

                const generalAvailability = generalAvailabilitySelect.value;
                let specificDays = [];

                if (generalAvailability === 'Specific days') {
                    const specificDaysCheckboxes = specificDaysGroup.querySelectorAll('input[type="checkbox"]:checked');
                    specificDaysCheckboxes.forEach(checkbox => {
                        specificDays.push(checkbox.value);
                    });
                }

                // --- Form Field Validation ---
                if (!firstName || !lastName || !email || !mobileNumber || !age ||
                    !selectedRegionText || !selectedProvinceText || !selectedCityText || !selectedBarangayText || !streetAddress || !generalAvailability) {
                    Swal.fire('Error', 'Please fill in all required fields (Name, Contact Information, Age, Full Address, and General Availability).', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    Swal.fire('Error', 'Please enter a valid email address (e.g., example@domain.com).', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                const mobileNumberRegex = /^09\d{9}$/;
                if (!mobileNumberRegex.test(mobileNumber)) {
                    Swal.fire('Error', 'Please enter a valid 11-digit mobile number starting with "09" (e.g., 09171234567).', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

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

                if (generalAvailability === 'Specific days' && specificDays.length === 0) {
                    Swal.fire('Error', 'Please select at least one specific day if you chose "Specific days" for availability.', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // --- Check for Duplicates ---
                const volunteersRef = database.ref("volunteerApplications/pendingVolunteer");
                const allApplicationsSnapshot = await volunteersRef.once('value');
                
                let isDuplicateName = false;
                let duplicateEmailExists = false

                allApplicationsSnapshot.forEach(childSnapshot => {
                const volunteer = childSnapshot.val();
                    if (volunteer.firstName.toLowerCase() === firstName.toLowerCase() &&
                        volunteer.lastName.toLowerCase() === lastName.toLowerCase()) {
                        isDuplicateName = true;
                        // Additionally check if the email also matches to give a more specific message
                        if (volunteer.email.toLowerCase() === email.toLowerCase()) {
                            duplicateEmailExists = true;
                        }
                        // We found a name match, we can stop iterating if we only care about name uniqueness
                        // If you want to log all matches or check other criteria, continue.
                        // For simply detecting if a name match exists, we can break.
                        return true; // Breaks forEach loop early if a match is found
                    }
                });

                if (isDuplicateName) {
                    let errorMessage = '';
                    if (duplicateEmailExists) {
                        errorMessage = 'An application with this name and email already exists. Please check your details or contact support if you believe this is an error.';
                    } else {
                        errorMessage = 'An application with this name (first name and last name) already exists. Please ensure you are not submitting a duplicate application.';
                    }
                    Swal.fire('Error', errorMessage, 'error');
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
                        general: generalAvailability,
                        specificDays: specificDays
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

            } catch (error) {
                console.error("Error adding volunteer application to Realtime Database: ", error);
                Swal.fire('Error', 'There was an error submitting your application. Please try again.', 'error');
            } finally {
                // Always re-enable the button and reset the flag after the process completes (success or failure)
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Application';
                isSubmitting = false;
                grecaptcha.reset(); // Reset reCAPTCHA in case of any error during submission
            }
        });
    }
});