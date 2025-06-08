// Initialize Firebase
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
const auth = firebase.auth(); // Assuming you'll use Firebase Auth elsewhere

// --- Logging Utility (Client-Side) ---
// This is a simple client-side logger. For production, consider integrating
// a dedicated analytics/error tracking service (e.g., Google Analytics, Sentry, LogRocket).
function logActivity(eventType, details = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        eventType: eventType,
        userId: auth.currentUser ? auth.currentUser.uid : 'anonymous', // If user is logged in
        sessionId: getSessionId(), // Implement a way to get/set a session ID
        details: details,
        location: window.location.href, // Current page
        userAgent: navigator.userAgent,
        // clientIp: This cannot be reliably obtained client-side. Best done server-side.
    };
    console.log('[ACTIVITY_LOG]', logEntry);
    // In a real app, you might send this to a service like:
    // fetch('/api/log', { method: 'POST', body: JSON.stringify(logEntry) });
    // Or integrate with a client-side analytics library.
}

function logError(errorType, error, context = {}) {
    const errorEntry = {
        timestamp: new Date().toISOString(),
        errorType: errorType,
        message: error.message || 'Unknown error',
        stack: error.stack || 'No stack trace',
        userId: auth.currentUser ? auth.currentUser.uid : 'anonymous',
        sessionId: getSessionId(),
        context: context,
        location: window.location.href,
        userAgent: navigator.userAgent,
    };
    console.error('[ERROR_LOG]', errorEntry);
    // In a real app, send this to an error monitoring service:
    // Sentry.captureException(error);
    // Or:
    // fetch('/api/error-log', { method: 'POST', body: JSON.stringify(errorEntry) });
}

// Simple session ID generator (for illustrative purposes)
function getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
    logError('UNHANDLED_JS_ERROR', event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    logError('UNHANDLED_PROMISE_REJECTION', event.reason || new Error('Unknown promise rejection'), {
        promise: event.promise
    });
});

// --- End Logging Utility ---

document.addEventListener('DOMContentLoaded', () => {
    logActivity('PAGE_LOAD', { page: 'volunteer-organization-form' });

    const volunteerOrgForm = document.getElementById('volunteer-org-form');

    // DOM elements for location dropdowns
    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const barangaySelect = document.getElementById('barangay');
    const streetAddressInput = document.getElementById('streetAddress');

    // Input fields to display selected text (from the original code, assuming they exist in your HTML)
    const regionTextInput = document.getElementById('region-text');
    const provinceTextInput = document.getElementById('province-text');
    const cityTextInput = document.getElementById('city-text');
    const barangayTextInput = document.getElementById('barangay-text');

    var my_handlers = {
        fill_regions: function() {
            logActivity('FILL_REGIONS_INIT');
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
            console.log(`Fetching regions from: ${url}`); // Existing console log is fine

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        logError('REGION_FETCH_FAILED', new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`), { url: url, status: response.status });
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Region data loaded (Vanilla JS):", data); // Existing console log is fine
                    if (!Array.isArray(data) || !data.every(item => item.region_code && item.region_name)) {
                        logError('REGION_DATA_STRUCTURE_INVALID', new Error("Invalid region data structure"), { dataPreview: data.slice(0, 5) });
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
                    logActivity('FILL_REGIONS_SUCCESS', { count: data.length });
                })
                .catch(error => {
                    console.error("Request for region.json Failed (Vanilla JS): " + error.message); // Existing console log is fine
                    console.error("Fetch error object: ", error); // Existing console log is fine
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
            logActivity('FILL_PROVINCES_INIT', { regionCode: region_code });

            if (!region_code) {
                logActivity('PROVINCE_SELECT_NO_REGION', { action: 'warn' });
                Swal.fire({
                    icon: 'warning',
                    title: 'Select Region First',
                    text: 'Please select a region before choosing a province.',
                    confirmButtonText: 'OK'
                });
                provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
                provinceSelect.selectedIndex = 0;
                citySelect.innerHTML = '<option value="" selected="true" disabled>Choose State First</option>'; // Typo: Should be Province First
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
                        logError('PROVINCE_FETCH_FAILED', new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`), { url: url, status: response.status, regionCode: region_code });
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Province data loaded (Vanilla JS):", data);
                    if (!Array.isArray(data) || !data.every(item => item.region_code && item.province_code && item.province_name)) {
                        logError('PROVINCE_DATA_STRUCTURE_INVALID', new Error("Invalid province data structure"), { dataPreview: data.slice(0, 5), regionCode: region_code });
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
                    logActivity('FILL_PROVINCES_SUCCESS', { regionCode: region_code, count: result.length });
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
            logActivity('FILL_CITIES_INIT', { provinceCode: province_code });

            if (!province_code) {
                logActivity('CITY_SELECT_NO_PROVINCE', { action: 'warn' });
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
                        logError('CITY_FETCH_FAILED', new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`), { url: url, status: response.status, provinceCode: province_code });
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("City data loaded (Vanilla JS):", data);
                    if (!Array.isArray(data) || !data.every(item => item.province_code && item.city_code && item.city_name)) {
                        logError('CITY_DATA_STRUCTURE_INVALID', new Error("Invalid city data structure"), { dataPreview: data.slice(0, 5), provinceCode: province_code });
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
                    logActivity('FILL_CITIES_SUCCESS', { provinceCode: province_code, count: result.length });
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
            logActivity('FILL_BARANGAYS_INIT', { cityCode: city_code });

            if (!city_code) {
                logActivity('BARANGAY_SELECT_NO_CITY', { action: 'warn' });
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
                        logError('BARANGAY_FETCH_FAILED', new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`), { url: url, status: response.status, cityCode: city_code });
                        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Barangay data loaded (Vanilla JS):", data);
                    if (!Array.isArray(data) || !data.every(item => item.city_code && item.brgy_code && item.brgy_name)) {
                        logError('BARANGAY_DATA_STRUCTURE_INVALID', new Error("Invalid barangay data structure"), { dataPreview: data.slice(0, 5), cityCode: city_code });
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
                    logActivity('FILL_BARANGAYS_SUCCESS', { cityCode: city_code, count: result.length });
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
            logActivity('BARANGAY_SELECTED', { barangayText: barangay_text, barangayCode: barangaySelect.value });
        },
    };

    // Attach event listeners for the location dropdowns
    if (regionSelect) regionSelect.addEventListener('change', my_handlers.fill_provinces);
    if (provinceSelect) provinceSelect.addEventListener('change', my_handlers.fill_cities);
    if (citySelect) citySelect.addEventListener('change', my_handlers.fill_barangays);
    if (barangaySelect) barangaySelect.addEventListener('change', my_handlers.onchange_barangay);

    // Call the initial fill for regions directly on page load
    my_handlers.fill_regions();

    if (volunteerOrgForm) {
        volunteerOrgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            logActivity('FORM_SUBMIT_ATTEMPT');

            // Get the reCAPTCHA response
            const recaptchaResponse = grecaptcha.getResponse();

            if (!recaptchaResponse) {
                logActivity('RECAPTCHA_NOT_COMPLETED', { action: 'error' });
                Swal.fire('Error', 'Please complete the reCAPTCHA to prove you are not a robot.', 'error');
                return;
            }

            // Get form data
            const organization = document.getElementById('organization').value.trim();
            const contactPerson = document.getElementById('contact-person').value.trim();
            const email = document.getElementById('email').value.trim();
            const mobileNumber = document.getElementById('mobileNumber').value.trim();
            const socialMedia = document.getElementById('socialMedia').value.trim();
            const streetAddress = streetAddressInput.value.trim();

            // Get selected text content from location dropdowns, not the value code
            const selectedRegionText = regionSelect.options[regionSelect.selectedIndex]?.textContent || '';
            const selectedProvinceText = provinceSelect.options[provinceSelect.selectedIndex]?.textContent || '';
            const selectedCityText = citySelect.options[citySelect.selectedIndex]?.textContent || '';
            const selectedBarangayText = barangaySelect.options[barangaySelect.selectedIndex]?.textContent || '';

            // Basic validation: Check if all required fields are filled, including location and street address
            // Note: organizationalBackgroundMission, areasOfExpertiseFocus, legalStatusRegistration, requiredDocuments
            // are not present in your document.getElementById calls for value retrieval.
            // Assuming they are input fields and have values, but they are not validated here.
            // You need to ensure these elements exist and their values are retrieved correctly.
            const organizationalBackgroundMission = document.getElementById('organizationalBackgroundMission')?.value.trim() || '';
            const areasOfExpertiseFocus = document.getElementById('areasOfExpertiseFocus')?.value.trim() || '';
            const legalStatusRegistration = document.getElementById('legalStatusRegistration')?.value.trim() || '';
            const requiredDocuments = document.getElementById('requiredDocuments')?.value.trim() || '';


            if (!organization || !contactPerson || !email || !mobileNumber || !selectedRegionText || !selectedProvinceText || !selectedCityText || !selectedBarangayText || !streetAddress) {
                logActivity('FORM_VALIDATION_FAILED', { fieldsMissing: true });
                Swal.fire('Error', 'Please fill in all required fields, including the full headquarters address (Region, Province, City, Barangay, and Street Address).', 'error');
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
                recaptchaResponse: recaptchaResponse, // This response should ideally be verified server-side
                organizationalBackgroundMission: organizationalBackgroundMission,
                areasOfExpertiseFocus: areasOfExpertiseFocus,
                legalStatusRegistration: legalStatusRegistration,
                requiredDocuments: requiredDocuments
            };

            try {
                // Push data to a new unique key under the 'abvnApplications' path
                // await database.ref("abvnApplications").push(applicationData);
                const newApplicationRef = await database.ref("abvnApplications/pendingABVN").push(applicationData);

                logActivity('APPLICATION_SUBMISSION_SUCCESS', {
                    applicationId: newApplicationRef.key,
                    organizationName: applicationData.organizationName,
                    email: applicationData.email
                });
                console.log("Application saved to Realtime Database successfully!");
                Swal.fire('Success', 'Application submitted successfully! Thank you for joining us.', 'success');
                volunteerOrgForm.reset();
                my_handlers.fill_regions(); // Re-initialize dropdowns
                grecaptcha.reset(); // Reset reCAPTCHA
            } catch (error) {
                logError('FIREBASE_SUBMISSION_ERROR', error, {
                    organizationName: organization,
                    email: email
                });
                console.error("Error adding application to Realtime Database: ", error);
                Swal.fire('Error', 'There was an error submitting your application. Please try again.', 'error');
                grecaptcha.reset(); // Reset reCAPTCHA
            }
        });
    }
});

// --- Firebase Authentication State Change Listener (Example for logging logins/logouts) ---
// You would need to ensure users actually log in/out using Firebase Auth for this to be useful.
// This log is still client-side, but it gives you a starting point.
auth.onAuthStateChanged(user => {
    if (user) {
        logActivity('USER_LOGIN', { uid: user.uid, email: user.email, provider: user.providerId });
        console.log(`User logged in: ${user.uid}`);
    } else {
        logActivity('USER_LOGOUT');
        console.log('User logged out');
    }
});