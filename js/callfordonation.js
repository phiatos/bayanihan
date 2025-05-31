document.addEventListener('DOMContentLoaded', () => {
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

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    const userRole = localStorage.getItem('userRole'); // Assuming user role is stored in localStorage

    // DOM elements
    const form = document.getElementById('form-container-1');
    const tableBody = document.querySelector('#donationTable tbody');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const exportBtn = document.getElementById("exportBtn");
    const savePdfBtn = document.getElementById("savePdfBtn");
    const exportCsvButton = document.getElementById("exportCsvButton"); // Assuming this exists for the toggle function
    const entriesInfo = document.getElementById('entriesInfo');
    const paginationContainer = document.getElementById("pagination");
    const clearFormBtn = document.getElementById("clearFormBtn");
    const submitButton = document.getElementById('nextBtn');

    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const barangaySelect = document.getElementById('barangay');

    // Input fields to display selected text
    const regionTextInput = document.getElementById('region-text');
    const provinceTextInput = document.getElementById('province-text');
    const cityTextInput = document.getElementById('city-text');
    const barangayTextInput = document.getElementById('barangay-text');

    const rowsPerPage = 10;
    let currentPage = 1;
    let allDonations = [];
    let filteredAndSortedDonations = [];

    // Variable to track if the form has changes
    let formHasChanges = false;

    // Add event listeners to the form inputs to track changes
    if (form) {
        form.addEventListener('input', () => {
            formHasChanges = true;
        });
        form.addEventListener('change', () => {
            formHasChanges = true;
        });
    }

    // Base path for JSON files
    const baseJsonPath = '../json/';

    // Load donations from Firebase
    const dbRef = firebase.database().ref('callfordonation');
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        allDonations = [];
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                allDonations.push({ ...value, firebaseKey: key });
            });
        }
        applyChange();
    }, (error) => {
        console.error("Error fetching donations from Firebase:", error);
        Swal.fire('Error', 'Failed to load donations from the database.', 'error');
    });

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

            const url = `${baseJsonPath}region.json`;
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
                citySelect.innerHTML = '<option value="" selected="true" disabled>Choose State First</option>';
                citySelect.selectedIndex = 0;
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
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

            const url = `${baseJsonPath}province.json`;
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
                barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';
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

            const url = `${baseJsonPath}city.json`;
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
            var city_code = citySelect.value;

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

            var city_text = citySelect.options[citySelect.selectedIndex].textContent;
            if (cityTextInput) cityTextInput.value = city_text;

            if (barangayTextInput) barangayTextInput.value = '';

            barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose barangay</option>';
            barangaySelect.selectedIndex = 0;

            const url = `${baseJsonPath}barangay.json`;
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
            var barangay_text = barangaySelect.options[barangaySelect.selectedIndex].textContent;
            if (barangayTextInput) barangayTextInput.value = barangay_text;
        },
    };

    // Function to control the visibility of the Export CSV button
    function toggleExportCsvButton() {
        if (exportCsvButton) {
            if (userRole === 'ABVN') {
                exportCsvButton.style.display = 'none';
            } else {
                exportCsvButton.style.display = 'block';
            }
        }
    }

    // Function to enable/disable form elements
    function toggleFormElements(enable) {
        const formContainer = document.getElementById('form-container-1');
        if (formContainer) {
            Array.from(formContainer.elements).forEach(element => {
                if (element.id !== 'region' && element.id !== 'province' && element.id !== 'city' && element.id !== 'barangay') {
                    element.disabled = !enable;
                }
            });
        }
        const donationDrive = document.getElementById('donationDrive');
        const contactPerson = document.getElementById('contactPerson');
        const contactNumber = document.getElementById('contactNumber');
        const accountNumber = document.getElementById('accountNumber');
        const accountName = document.getElementById('accountName');
        const donationImage = document.getElementById('donationImage');
        const address = document.getElementById('address');
        const facebookLink = document.getElementById('facebookLink');

        if (submitButton) {
            submitButton.disabled = !enable;
        }

        if (donationDrive) donationDrive.disabled = !enable;
        if (contactPerson) contactPerson.disabled = !enable;
        if (contactNumber) contactNumber.disabled = !enable;
        if (accountNumber) accountNumber.disabled = !enable;
        if (accountName) accountName.disabled = !enable;
        if (donationImage) donationImage.disabled = !enable;
        if (address) address.disabled = !enable;
        if (facebookLink) facebookLink.disabled = !enable;
    }

    // Function to handle the visibility of the "Remove" button only
    function updateRemoveButtonVisibility() {
        const deleteButtons = document.querySelectorAll('.deleteBtn');
        if (userRole === 'ABVN') {
            deleteButtons.forEach(button => {
                button.style.display = 'none';
            });
        } else {
            deleteButtons.forEach(button => {
                button.style.display = 'inline-block';
            });
        }
    }

    // Attach event listeners for the location dropdowns
    if (regionSelect) regionSelect.addEventListener('change', my_handlers.fill_provinces);
    if (provinceSelect) provinceSelect.addEventListener('change', my_handlers.fill_cities);
    if (citySelect) citySelect.addEventListener('change', my_handlers.fill_barangays);
    if (barangaySelect) barangaySelect.addEventListener('change', my_handlers.onchange_barangay);

    // Call the initial fill for regions directly on page load
    my_handlers.fill_regions();

    // Event listeners for search and sort
    searchInput?.addEventListener('input', applyFilters);
    sortSelect?.addEventListener('change', () => {
        const selectedSortOption = sortSelect.value;
        if (selectedSortOption === "") {
            Swal.fire({
                icon: 'warning',
                title: 'No Sort Option Selected',
                text: 'Please select a specific sort option from the dropdown.',
                confirmButtonText: 'OK'
            });
            return;
        }
        applyFilters();
    });

    function applyChange() {
        filteredAndSortedDonations = [...allDonations];
        currentPage = 1;
        renderTable();
    }

    function applyFilters() {
        let data = [...allDonations];

        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm) {
            data = data.filter(d =>
                (d.donationDrive || '').toLowerCase().includes(searchTerm) ||
                (d.contact?.person || '').toLowerCase().includes(searchTerm) ||
                (d.contact?.number || '').toLowerCase().includes(searchTerm) ||
                (d.account?.number || '').toLowerCase().includes(searchTerm) ||
                (d.account?.name || '').toLowerCase().includes(searchTerm) ||
                (d.address?.fullAddress || d.dropOff || '').toLowerCase().includes(searchTerm) ||
                (d.facebookLink || '').toLowerCase().includes(searchTerm)
            );
        }

        const sortValue = sortSelect.value;
        if (sortValue) {
            const [field, direction] = sortValue.split('-');
            data.sort((a, b) => {
                let valA, valB;
                if (field === 'dropOff') {
                    valA = (a.address?.fullAddress || a.dropOff || '').toLowerCase();
                    valB = (b.address?.fullAddress || b.dropOff || '').toLowerCase();
                } else if (field === 'contactPerson') {
                    valA = (a.contact?.person || a[field] || '').toString().toLowerCase();
                    valB = (b.contact?.person || b[field] || '').toString().toLowerCase();
                } else if (field === 'accountName') {
                    valA = (a.account?.name || a[field] || '').toString().toLowerCase();
                    valB = (b.account?.name || b[field] || '').toString().toLowerCase();
                } else {
                    valA = (a[field] || '').toString().toLowerCase();
                    valB = (b[field] || '').toString().toLowerCase();
                }
                return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });
        }

        filteredAndSortedDonations = data;
        currentPage = 1;
        renderTable();
    }

    // Clear form button event listener
    clearFormBtn.addEventListener("click", () => {
        if (formHasChanges) {
            Swal.fire({
            title: 'Discard Changes?',
            text: 'You have unsaved changes. Are you sure you want to clear the form?',
            icon: 'warning',                                
            iconColor: '#f57c00',               
            showCancelButton: true,
            confirmButtonColor: '#c62828',      
            cancelButtonColor: '#546e7a',        
            confirmButtonText: 'Yes, clear it!',
            cancelButtonText: 'No, keep editing',
            reverseButtons: true,               
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                content: 'swal2-text-warning-clean',
                confirmButton: 'swal2-button-confirm-clean',
                cancelButton: 'swal2-button-cancel-clean'
            }
            }).then((result) => {
                if (result.isConfirmed) {
                    if (form) {
                        Array.from(form.querySelectorAll('input, select, textarea')).forEach(element => {
                            if (element.type === 'file') {
                                element.value = '';
                            } else if (element.tagName === 'SELECT') {
                                element.selectedIndex = 0;
                            } else {
                                element.value = '';
                            }
                        });
                        my_handlers.fill_regions();
                    }
                    formHasChanges = false;
                    const errorMessages = form ? form.querySelectorAll('.error-message') : [];
                    errorMessages.forEach(msg => msg.textContent = '');
                    const errorInputs = form ? form.querySelectorAll('.error') : [];
                    errorInputs.forEach(input => input.classList.remove('error'));
                }
            });
        } else {
            if (form) {
                Array.from(form.querySelectorAll('input, select, textarea')).forEach(element => {
                    if (element.type === 'file') {
                        element.value = '';
                    } else if (element.tagName === 'SELECT') {
                        element.selectedIndex = 0;
                    } else {
                        element.value = '';
                    }
                });
                my_handlers.fill_regions();
            }
            const errorMessages = form ? form.querySelectorAll('.error-message') : [];
            errorMessages.forEach(msg => msg.textContent = '');
            const errorInputs = form ? form.querySelectorAll('.error') : [];
            errorInputs.forEach(input => input.classList.remove('error'));
        }
    });

    function renderTable() {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageRows = filteredAndSortedDonations.slice(startIndex, endIndex);

        tableBody.innerHTML = "";
        if (currentPageRows.length === 0) {
            const noDataRow = document.createElement("tr");
            noDataRow.innerHTML = `<td colspan="9" style="text-align: center;">No donations found.</td>`;
            tableBody.appendChild(noDataRow);
        } else {
            currentPageRows.forEach((r, i) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${startIndex + i + 1}</td>
                    <td>${r.donationDrive || 'N/A'}</td>
                    <td>${r.contact?.person || 'N/A'}</td>
                    <td>${String(r.contact?.number || 'N/A')}</td>
                    <td>${String(r.account?.number || 'N/A')}</td>
                    <td>${r.account?.name || 'N/A'}</td>
                    <td>${r.address?.fullAddress || r.dropOff || 'N/A'}</td>
                    <td><a href="${r.facebookLink || '#'}" target="_blank" rel="noopener noreferrer">${r.facebookLink && r.facebookLink !== 'N/A' ? 'Visit The Page' : 'N/A'}</a></td>
                    <td>
                        <button class="viewBtn">View Image</button>
                        <button class="deleteBtn">Remove</button>
                        <button class="savePDFBtn">Save PDF</button>
                    </td>
                `;
                tr.querySelector(".viewBtn").addEventListener("click", () => {
                    Swal.fire({
                        html: r?.image ? `<img src="${r.image}" alt="Donation Image" style="max-width: 100%; margin-top: 10px;" />` : 'No image available.',
                        icon: 'info',
                        confirmButtonText: 'Close'
                    });
                });
                tr.querySelector(".deleteBtn").addEventListener("click", () => {
                    Swal.fire({
                        title: 'Are you sure?',
                        text: "This donation will be deleted.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, delete it!'
                    }).then(result => {
                        if (result.isConfirmed) {
                            firebase.database().ref(`callfordonation/${r.firebaseKey}`).remove()
                                .then(() => {
                                    Swal.fire('Deleted!', 'The donation has been removed.', 'success');
                                })
                                .catch(error => {
                                    console.error("Error deleting donation:", error);
                                    Swal.fire('Error', 'Failed to delete the donation.', 'error');
                                });
                        }
                    });
                });
                tr.querySelector(".savePDFBtn").addEventListener("click", () => saveSingleCfdDonationPdf(r));

                tableBody.appendChild(tr);
            });
        }

        updatePaginationInfo();
        renderPagination();
        updateRemoveButtonVisibility(); // Ensure remove button visibility is updated after rendering table
    }

    function updatePaginationInfo() {
        const totalEntries = filteredAndSortedDonations.length;
        const startEntry = (currentPage - 1) * rowsPerPage + 1;
        const endEntry = Math.min(currentPage * rowsPerPage, totalEntries);
        entriesInfo.textContent = `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`;
        if (totalEntries === 0) {
            entriesInfo.textContent = `Showing 0 to 0 of 0 entries`;
        }
    }

    const createPaginationButton = (label, page, disabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (isActive) btn.classList.add('active-page');
        btn.addEventListener('click', () => {
            if (!disabled) {
                currentPage = page;
                renderTable();
            }
        });
        return btn;
    };

    function renderPagination() {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredAndSortedDonations.length / rowsPerPage);

        if (totalPages === 0) {
            paginationContainer.innerHTML = '<span>No entries to display</span>';
            return;
        }

        paginationContainer.appendChild(createPaginationButton('Prev', Math.max(1, currentPage - 1), currentPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPaginationButton(i, i, false, i === currentPage));
        }

        paginationContainer.appendChild(createPaginationButton('Next', Math.min(totalPages, currentPage + 1), currentPage === totalPages));
    }

    if (submitButton) {
        submitButton.addEventListener('click', (e) => {
            e.preventDefault();

            const donationDrive = document.getElementById('donationDrive')?.value.trim();
            const contactPerson = document.getElementById('contactPerson')?.value.trim();
            const contactNumber = document.getElementById('contactNumber')?.value.trim();
            const accountNumber = document.getElementById('accountNumber')?.value.trim();
            const accountName = document.getElementById('accountName')?.value.trim();
            const region = regionSelect?.options[regionSelect.selectedIndex]?.textContent || '';
            const province = provinceSelect?.options[provinceSelect.selectedIndex]?.textContent || '';
            const city = citySelect?.options[citySelect.selectedIndex]?.textContent || '';
            const barangay = barangaySelect?.options[barangaySelect.selectedIndex]?.textContent || '';
            const address = document.getElementById('address')?.value.trim();
            const facebookLink = document.getElementById('facebookLink')?.value.trim();
            const imageFile = document.getElementById('donationImage')?.files[0];

            if (!donationDrive || !contactPerson || !contactNumber || !accountNumber || !accountName || !region || !province || !city || !barangay || !address) {
                Swal.fire('Error', "Please fill in all required fields, including the full address (Region, Province, City, Barangay, and Address).", 'error');
                return;
            }

            function saveDonation(base64Image) {
                const newDonation = {
                    donationId: `DONATION-${Math.floor(100 + Math.random() * 900)}`,
                    dateTime: new Date().toISOString(),
                    donationDrive,
                    contact: {
                        person: contactPerson,
                        number: contactNumber
                    },
                    account: {
                        number: accountNumber,
                        name: accountName
                    },
                    address: {
                        region: region,
                        province: province,
                        city: city,
                        barangay: barangay,
                        street: address,
                        fullAddress: `${address}, ${barangay}, ${city}, ${province}, ${region}` // Corrected full address
                    },
                    facebookLink: facebookLink || "N/A",
                    image: base64Image || '',
                    status: "Pending",
                    userRole: userRole || 'default',
                    timestamp: Date.now()
                };

                // Save to Firebase under the 'callfordonation' node
                firebase.database().ref('callfordonation').push(newDonation)
                    .then(() => {
                        // Clear form fields after successful submission
                        document.getElementById('donationDrive').value = '';
                        document.getElementById('contactPerson').value = '';
                        document.getElementById('contactNumber').value = '';
                        document.getElementById('accountNumber').value = '';
                        document.getElementById('accountName').value = '';

                        my_handlers.fill_regions(); // Reset location dropdowns

                        document.getElementById('address').value = '';
                        document.getElementById('facebookLink').value = '';
                        document.getElementById('donationImage').value = '';

                        if (regionTextInput) regionTextInput.value = '';
                        if (provinceTextInput) provinceTextInput.value = '';
                        if (cityTextInput) cityTextInput.value = '';
                        if (barangayTextInput) barangayTextInput.value = '';

                        formHasChanges = false;

                        Swal.fire('Success', 'Donation added successfully!', 'success');
                    })
                    .catch(error => {
                        console.error("Error saving donation to Firebase:", error);
                        Swal.fire('Error', 'Failed to save the donation.', 'error');
                    });
            }

            if (imageFile) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    saveDonation(event.target.result);
                };
                reader.readAsDataURL(imageFile);
            } else {
                saveDonation('');
            }
        });
    }

    // --- Excel Export Functionality ---
    exportBtn.addEventListener("click", () => {
        if (filteredAndSortedDonations.length === 0) {
            Swal.fire("Info", "No data to export!", "info");
            return;
        }

        const dataForExport = filteredAndSortedDonations.map((d, i) => ({
            "No.": i + 1,
            "Donation Drive": d.donationDrive || '',
            "Contact Person": d.contact?.person || '',
            "Contact Number": String(d.contact?.number || ''),
            "Account Number": String(d.account?.number || ''),
            "Account Name": d.account?.name || '',
            "Region": d.address?.region || '',
            "Province": d.address?.province || '',
            "City/Municipality": d.address?.city || '',
            "Barangay": d.address?.barangay || '',
            "Street Address": d.address?.street || '',
            "Full Address": d.address?.fullAddress || d.dropOff || '',
            "Facebook Link": d.facebookLink && d.facebookLink !== 'N/A' ? d.facebookLink : 'N/A',
            "Status": d.status || '',
            "Submitted Date/Time": new Date(d.dateTime).toLocaleString() || ''
        }));

        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            Swal.fire("Error", "XLSX library not loaded. Please ensure `xlsx.full.min.js` is included in your HTML.", "error");
            console.error("XLSX library is not loaded.");
            return;
        }

        const ws = XLSX.utils.json_to_sheet(dataForExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Call for Donations");

        // Get current date and format it for the filename
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        // Construct the filename with the date
        const filename = `call-for-donations_${formattedDate}.xlsx`;
        XLSX.writeFile(wb, filename);
        Swal.fire("Success", `Call for Donations data exported to ${filename}!`, "success");
    });

    // --- PDF Export Functionality ---
    savePdfBtn.addEventListener("click", () => {
        if (filteredAndSortedDonations.length === 0) {
            Swal.fire("Info", "No data to export to PDF!", "info");
            return;
        }

        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            Swal.fire("Error", "jsPDF library not loaded. Please ensure `jspdf.umd.min.js` and `jspdf.autotable.min.js` are included in your HTML.", "error");
            console.error("jsPDF library is not loaded.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');

        let yOffset = 20;
        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';

        // Show a loading indicator while the PDF is being generated
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while your PDF is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });


        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;

            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

            doc.setFontSize(18);
            doc.text("Call for Donations Report", 14, yOffset);
            yOffset += 10;
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, yOffset);
            yOffset += 15;

            const head = [[
                "No.", "Donation Drive", "Contact Person", "Contact Number",
                "Account Number", "Account Name", "Full Address", "Facebook Link",
                "Status", "Submission Date/Time"
            ]];

            const body = filteredAndSortedDonations.map((d, i) => [
                i + 1,
                d.donationDrive || 'N/A',
                d.contact?.person || 'N/A',
                String(d.contact?.number || 'N/A'),
                String(d.account?.number || 'N/A'),
                d.account?.name || 'N/A',
                d.address?.fullAddress || d.dropOff || 'N/A',
                d.facebookLink && d.facebookLink !== 'N/A' ? d.facebookLink : 'N/A',
                d.status || 'N/A',
                new Date(d.dateTime).toLocaleString() || 'N/A'
            ]);

            doc.autoTable({
                head: head,
                body: body,
                startY: yOffset,
                theme: 'grid',
                headStyles: {
                    fillColor: [20, 174, 187],
                    textColor: [255, 255, 255],
                    halign: 'center'
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                didDrawPage: function (data) {
                    doc.setFontSize(8);
                    const pageNumberText = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                    const poweredByText = "Powered by: Appvance";
                    const pageWidth = doc.internal.pageSize.width;
                    const margin = data.settings.margin.left;
                    const footerY = doc.internal.pageSize.height - 10;

                    doc.text(pageNumberText, margin, footerY);
                    doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });
                }
            });

            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            const filename = `call-for-donations_${formattedDate}.pdf`;
            doc.save(filename);
            Swal.close();
            Swal.fire("Success", `Call for Donations data exported to "${filename}"`, "success");
        };

        logo.onerror = function() {
            Swal.close(); // Close loading Swal
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    });

    // --- Save Single CFD Donation to PDF ---
    function saveSingleCfdDonationPdf(donation) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while your PDF is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';

        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;


            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

            doc.setFontSize(18);
            doc.text("Call for Donation Details", margin, 22);
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin, 30);

            let y = 45;

            const addDetail = (label, value) => {
                doc.text(`${label}: ${value || 'N/A'}`, margin, y);
                y += 7;
            };

            addDetail("Donation Drive", donation.donationDrive);
            addDetail("Contact Person", donation.contact?.person);
            addDetail("Contact Number", String(donation.contact?.number || 'N/A'));
            addDetail("Account Number", String(donation.account?.number || 'N/A'));
            addDetail("Account Name", donation.account?.name);
            addDetail("Region", donation.address?.region);
            addDetail("Province", donation.address?.province);
            addDetail("City/Municipality", donation.address?.city);
            addDetail("Barangay", donation.address?.barangay);
            addDetail("Street Address", donation.address?.street);
            addDetail("Full Address", donation.address?.fullAddress || donation.dropOff);
            addDetail("Facebook Link", donation.facebookLink && donation.facebookLink !== 'N/A' ? donation.facebookLink : 'N/A');
            addDetail("Status", donation.status);
            addDetail("Submitted Date/Time", new Date(donation.dateTime).toLocaleString());

            if (donation.image) {
                y += 10;
                const imgWidth = 80;
                const imgHeight = (imgWidth / logo.naturalWidth) * logo.naturalHeight;
                const imgX = margin;
                if (y + imgHeight > doc.internal.pageSize.height - margin) {
                    doc.addPage();
                    y = margin;
                }
                doc.text("Attached Image:", margin, y);
                y += 5;
                doc.addImage(donation.image, 'JPEG', imgX, y, imgWidth, imgHeight);
            }

            // Footer
            doc.setFontSize(8);
            const footerY = doc.internal.pageSize.height - 10;
            const pageNumberText = `Page 1 of 1`;
            const poweredByText = "Powered by: Appvance";

            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

            doc.save(`cfd_donation_${new Date().toISOString().slice(0, 10)}.pdf`);


            Swal.close();
            Swal.fire({
                title: 'Export Successful!',
                text: `Donation details for "${donation.donationDrive}" have been exported to PDF.`,
                icon: 'success',
                color: '#1b5e20',
                iconColor: '#43a047',
                confirmButtonColor: '#388e3c',
                confirmButtonText: 'Great!',
                customClass: {
                    popup: 'swal2-popup-success-export',
                    title: 'swal2-title-success-export',
                    content: 'swal2-text-success-export',
                    confirmButton: 'swal2-button-success-export'
                }
            });
        };

        logo.onerror = function() {
            Swal.close(); // Close loading Swal
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    }

    // Initial calls when the DOM content is loaded
    toggleExportCsvButton();
    updateRemoveButtonVisibility();
    applyChange();
});