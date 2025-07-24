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

    // --- Function to manage submit button state ---
    const updateSubmitButtonState = () => {
        if (submitButton && agreeCheckbox) {
            submitButton.disabled = !agreeCheckbox.checked;
            if (agreementMessage) {
                agreementMessage.style.display = agreeCheckbox.checked ? 'none' : 'block';
            }
        }
    };

    // --- Add event listener for the terms and conditions checkbox ---
    if (agreeCheckbox) {
        agreeCheckbox.addEventListener('change', updateSubmitButtonState);
    }

    // --- Initial call to set the button state when the page loads ---
    updateSubmitButtonState();

    // --- NEW: Event listeners for opening T&C and Privacy Policy pop-ups ---
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

    // --- ABVN Form Submission Logic ---
    if (volunteerOrgForm) {
        volunteerOrgForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Prevent multiple rapid submissions
            if (isSubmitting) {
                console.log('Already submitting ABVN application, please wait...');
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
                    Swal.fire('Error', 'Please complete the reCAPTCHA to prove you are not a robot.', 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                const organization = document.getElementById('organization').value.trim();
                const contactPerson = document.getElementById('contact-person').value.trim();
                const email = document.getElementById('email').value.trim();
                const mobileNumber = document.getElementById('mobileNumber').value.trim();
                const socialMedia = document.getElementById('socialMedia').value.trim();
                const streetAddress = streetAddressInput.value.trim();

                const selectedRegionText = regionSelect.options[regionSelect.selectedIndex]?.textContent || '';
                const selectedProvinceText = provinceSelect.options[provinceSelect.selectedIndex]?.textContent || '';
                const selectedCityText = citySelect.options[citySelect.selectedIndex]?.textContent || '';
                const selectedBarangayText = barangaySelect.options[barangaySelect.selectedIndex]?.textContent || '';

                const organizationalBackgroundMission = document.getElementById('organizationalBackgroundMission')?.value.trim() || '';
                const areasOfExpertiseFocus = document.getElementById('areasOfExpertiseFocus')?.value.trim() || '';
                const legalStatusRegistration = document.getElementById('legalStatusRegistration')?.value.trim() || '';
                const requiredDocumentsLink = document.getElementById('requiredDocumentsLink')?.value.trim() || '';

                if (!organization || !contactPerson || !email || !mobileNumber || !selectedRegionText || !selectedProvinceText || !selectedCityText || !selectedBarangayText || !streetAddress || !organizationalBackgroundMission || !areasOfExpertiseFocus || !legalStatusRegistration || !requiredDocumentsLink) {
                    Swal.fire('Error', 'Please fill in all required fields.', 'error');
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

                // Required Document (URL) Validation
                if (requiredDocumentsLink) {
                    try {
                        new URL(requiredDocumentsLink);
                    } catch (e) {
                        Swal.fire('Error', 'Please enter a valid URL for your supporting documents link (e.g., https://drive.google.com/drive/folders/your-folder-id).', 'error');
                        submitButton.disabled = false;
                        submitButton.textContent = 'Submit Application';
                        isSubmitting = false;
                        grecaptcha.reset();
                        return;
                    }
                }

                // Text Area Minimum Length Validation
                const MIN_TEXT_LENGTH = 20;
                if (organizationalBackgroundMission.length < MIN_TEXT_LENGTH) {
                    Swal.fire('Error', `Organizational Background & Mission must be at least ${MIN_TEXT_LENGTH} characters long.`, 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                if (areasOfExpertiseFocus.length < MIN_TEXT_LENGTH) {
                    Swal.fire('Error', `Areas of Expertise/Focus must be at least ${MIN_TEXT_LENGTH} characters long.`, 'error');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // --- Check for Duplicates ---
                const abvnApplicationsRef = database.ref("abvnApplications/pendingABVN");
                const allAbvnApplicationsSnapshot = await abvnApplicationsRef.once('value');

                let isDuplicate = false;
                let duplicateReason = '';

                allAbvnApplicationsSnapshot.forEach(childSnapshot => {
                    const application = childSnapshot.val();
                    if (application.email.toLowerCase() === email.toLowerCase()) {
                        isDuplicate = true;
                        duplicateReason = 'email';
                        return true;
                    }
                    if (application.organizationName.toLowerCase() === organization.toLowerCase()) {
                        isDuplicate = true;
                        duplicateReason = 'organization name';
                        return true;
                    }
                });

                if (isDuplicate) {
                    let errorMessage = `It looks like an application with this ${duplicateReason} has already been submitted. Please check your details or contact support if you believe this is an error.`;
                    Swal.fire('Warning', errorMessage, 'warning');
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Application';
                    isSubmitting = false;
                    grecaptcha.reset();
                    return;
                }

                // Create an object to store in Realtime Database
                const applicationData = {
                    organizationName: organization,
                    contactPerson: contactPerson,
                    email: email,
                    mobileNumber: mobileNumber,
                    socialMediaLink: socialMedia,
                    headquarters: {
                        region: selectedRegionText,
                        province: selectedProvinceText,
                        city: selectedCityText,
                        barangay: selectedBarangayText,
                        streetAddress: streetAddress
                    },
                    applicationDateandTime: new Date().toISOString(),
                    recaptchaResponse: recaptchaResponse,
                    organizationalBackgroundMission: organizationalBackgroundMission,
                    areasOfExpertiseFocus: areasOfExpertiseFocus,
                    legalStatusRegistration: legalStatusRegistration,
                    requiredDocumentsLink: requiredDocumentsLink
                };

                const newApplicationRef = await database.ref("abvnApplications/pendingABVN").push(applicationData);

                console.log("ABVN application saved to Realtime Database successfully!");
                Swal.fire('Success', 'Application submitted successfully! Thank you for joining us.', 'success');

                // Reset form and reCAPTCHA after successful submission
                volunteerOrgForm.reset();
                my_handlers.fill_regions();
                grecaptcha.reset();
                agreeCheckbox.checked = false; // Uncheck the terms checkbox after successful submission
                updateSubmitButtonState();
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
});

// --- Firebase Authentication State Change Listener ---
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`User logged in: ${user.uid}`);
    } else {
        console.log('User logged out');
    }
});