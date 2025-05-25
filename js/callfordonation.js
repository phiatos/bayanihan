document.addEventListener('DOMContentLoaded', () => {
    // Firebase Configuration (Updated with your config)
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

    let donations = [];
    let filteredReports = donations;
    let currentPage = 1;
    const entriesPerPage = 10;
    let viewingApproved = false;

    // DOM elements
    const searchInput = document.getElementById('searchInput');
    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');
    const barangaySelect = document.getElementById('barangay');
    const sortSelect = document.getElementById('sortSelect');
    const tableBody = document.querySelector('#donationTable tbody');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const donationForm = document.getElementById('form-container-1');
    const submitButton = document.getElementById('nextBtn');
    const clearFormBtn = document.getElementById("clearFormBtn");
    const exportCsvButton = document.getElementById('exportBtn');

    // Input fields to display selected text
    const regionTextInput = document.getElementById('region-text');
    const provinceTextInput = document.getElementById('province-text');
    const cityTextInput = document.getElementById('city-text');
    const barangayTextInput = document.getElementById('barangay-text');

    // Variable to track if the form has changes
    let formHasChanges = false;

    // Add event listeners to the form inputs to track changes
    if (donationForm) {
        donationForm.addEventListener('input', () => {
            formHasChanges = true;
        });
        donationForm.addEventListener('change', () => {
            formHasChanges = true;
        });
    }

    // Base path for JSON files
    const baseJsonPath = '../json/';

    // Load donations from Firebase
    const dbRef = firebase.database().ref('callfordonation');
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        donations = [];
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                donations.push({ ...value, firebaseKey: key });
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

    // Function to handle button visibility in the table
    function updateTableButtons() {
        const deleteButtons = document.querySelectorAll('.delete-btn');
        if (userRole === 'ABVN') {
            deleteButtons.forEach(button => {
                button.style.display = 'none';
            });
            const formPage1 = document.querySelector('.form-page-1');
            if(formPage1) {
                formPage1.style.display = 'none';
            }
        } else {
            deleteButtons.forEach(button => {
                button.style.display = 'inline-block';
            });
            const formPage1 = document.querySelector('.form-page-1');
            if(formPage1) {
                formPage1.style.display = 'block';
            }
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
        filteredReports = [...donations];
        currentPage = 1;
        renderReports();
    }

    function applyFilters() {
        let data = [...donations];

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

        filteredReports = data;
        currentPage = 1;
        renderReports();
    }

    // Clear form button event listener
    clearFormBtn.addEventListener("click", () => {
        if (formHasChanges) {
            Swal.fire({
                title: 'Discard Changes?',
                text: "You have unsaved changes. Are you sure you want to clear the form?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, clear it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    if (donationForm) {
                        Array.from(donationForm.querySelectorAll('input, select, textarea')).forEach(element => {
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
                    const errorMessages = donationForm ? donationForm.querySelectorAll('.error-message') : [];
                    errorMessages.forEach(msg => msg.textContent = '');
                    const errorInputs = donationForm ? donationForm.querySelectorAll('.error') : [];
                    errorInputs.forEach(input => input.classList.remove('error'));
                }
            });
        } else {
            if (donationForm) {
                Array.from(donationForm.querySelectorAll('input, select, textarea')).forEach(element => {
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
            const errorMessages = donationForm ? donationForm.querySelectorAll('.error-message') : [];
            errorMessages.forEach(msg => msg.textContent = '');
            const errorInputs = donationForm ? donationForm.querySelectorAll('.error') : [];
            errorInputs.forEach(input => input.classList.remove('error'));
        }
    });

    function renderReports() {
        tableBody.innerHTML = "";

        const totalEntries = filteredReports.length;
        const totalPages = Math.ceil(totalEntries / entriesPerPage);
        const startIndex = (currentPage - 1) * entriesPerPage;
        const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
        const pageData = filteredReports.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='9'>No donations found.</td></tr>";
        } else {
            pageData.forEach((r, i) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${startIndex + i + 1}</td>
                    <td>${r.donationDrive || ''}</td>
                    <td>${r.contact?.person || r.contactPerson || ''}</td>
                    <td>${r.contact?.number || r.contactNumber || ''}</td>
                    <td>${r.account?.number || r.accountNumber || ''}</td>
                    <td>${r.account?.name || r.accountName || ''}</td>
                    <td>${r.address?.fullAddress || r.dropOff || ''}</td>
                    <td><a href="${r.facebookLink || '#'}" target="_blank" rel="noopener noreferrer">${r.facebookLink && r.facebookLink !== 'N/A' ? 'Visit The Page' : 'N/A'}</a></td>
                    <td>
                        <button class="view-btn" data-index="${startIndex + i}">View Image</button>
                        <button class="delete-btn" data-index="${startIndex + i}">Remove</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        entriesInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalEntries} entries`;
        renderPagination(totalPages);
        attachEventListeners();
        updateTableButtons();
    }

    function renderPagination(totalPages) {
        pagination.innerHTML = "";

        const prevBtn = document.createElement('button');
        prevBtn.id = 'prevBtnPage';
        prevBtn.textContent = 'Prev';
        prevBtn.disabled = currentPage === 1;
        pagination.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            if (i === currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                renderReports();
            });
            pagination.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.id = 'nextBtnPage';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
        pagination.appendChild(nextBtn);

        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderReports();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderReports();
            }
        });
    }

    function attachEventListeners() {
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', e => {
                const index = parseInt(e.target.dataset.index);
                const data = filteredReports[index];
                Swal.fire({
                    html: data?.image ? `<img src="${data.image}" alt="Donation Image" style="max-width: 100%; margin-top: 10px;" />` : 'No image available.',
                    icon: 'info',
                    confirmButtonText: 'Close'
                });
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', e => {
                const index = parseInt(e.target.dataset.index);
                const data = filteredReports[index];

                Swal.fire({
                    title: 'Are you sure?',
                    text: "This donation will be deleted.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, delete it!'
                }).then(result => {
                    if (result.isConfirmed) {
                        // Remove from Firebase
                        firebase.database().ref(`callfordonation/${data.firebaseKey}`).remove()
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
        });
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
                        fullAddress: `${address}, ${barangay}, ${city}, ${province}, ${region}`
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

                        my_handlers.fill_regions();

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

    // Export to CSV functionality
    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', () => {
            if (filteredReports.length === 0) {
                Swal.fire('No Data', 'There is no data to export.', 'info');
                return;
            }

            const headers = [
                "No.", "Donation Drive", "Contact Name", "Contact Number",
                "Account Number", "Account Name", "Region", "Province",
                "City/Municipality", "Barangay", "Exact Drop Off Address",
                "Facebook Link", "Image Link"
            ];

            const csvData = filteredReports.map((item, index) => [
                index + 1,
                `"${item.donationDrive || ''}"`,
                `"${item.contact?.person || item.contactPerson || ''}"`,
                `"${item.contact?.number || item.contactNumber || ''}"`,
                `"${item.account?.number || item.accountNumber || ''}"`,
                `"${item.account?.name || item.accountName || ''}"`,
                `"${item.address?.region || item.Region || ''}"`,
                `"${item.address?.province || item.Province || ''}"`,
                `"${item.address?.city || item.CityMunicipality || ''}"`,
                `"${item.address?.barangay || item.Barangay || ''}"`,
                `"${item.address?.fullAddress || item.dropOff || ''}"`,
                `"${item.facebookLink || ''}"`,
                `"${item.image || ''}"`
            ].join(','));

            const csvContent = [
                headers.join(','),
                ...csvData
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'call_for_donation_reports.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            Swal.fire('Exported!', 'Donation data has been exported to CSV.', 'success');
        });
    }

    // Initial calls when the DOM content is loaded
    toggleExportCsvButton();
    updateTableButtons();
    applyChange();
});