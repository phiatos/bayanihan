document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing reliefslog script');

    // Firebase configuration
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
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
    const database = firebase.database();

    const tableBody = document.querySelector('#orgTable tbody');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');

    if (!tableBody || !searchInput || !sortSelect || !entriesInfo || !pagination) {
        console.error('One or more DOM elements are missing:', {
            tableBody: !!tableBody,
            searchInput: !!searchInput,
            sortSelect: !!sortSelect,
            entriesInfo: !!entriesInfo,
            pagination: !!pagination
        });
        return;
    }

    let data = [];
    let filteredData = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filteredData = data.filter(item => {
            return Object.values(item).some(value => {
                return String(value).toLowerCase().includes(searchTerm);
            });
        });
        currentPage = 1;
        renderTable();
    });

    // Fetch data from Firebase
    database.ref('requestRelief/requests').on('value', (snapshot) => {
        console.log('Fetching data from Firebase');
        data = [];
        const requests = snapshot.val();
        if (requests) {
            Object.keys(requests).forEach((key, index) => {
                const request = requests[key];
                const groupName = request.volunteerOrganization || "[Unknown Org]";
                if (!request.volunteerOrganization) {
                    console.warn(`Relief request ${key} is missing volunteerOrganization field. Using default: [Unknown Org]`);
                }
                data.push({
                    id: `RR${String(index + 1).padStart(3, '0')}`,
                    group: groupName,
                    city: request.city,
                    address: request.address,
                    contact: request.contactPerson,
                    number: request.contactNumber,
                    email: request.email,
                    category: request.category,
                    userUid: request.userUid || "N/A", // Include UID
                    items: request.items || [],
                    firebaseKey: key
                });
            });
            console.log('Data fetched successfully:', data);
        } else {
            console.log('No data found in requestRelief/requests');
        }
        filteredData = [...data];
        renderTable();
    }, (error) => {
        console.error('Error fetching data from Firebase:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load relief requests: ' + error.message,
        });
    });

    function renderTable() {
        console.log('Rendering table');
        tableBody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const currentRows = filteredData.slice(start, end);

        currentRows.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-key="No">${start + index + 1}</td>
                <td data-key="ReliefID">${item.id}</td>
                <td data-key="VolunteerGroupName">${item.group}</td>
                <td data-key="UserUID">${item.userUid}</td> <!-- Added UID column -->
                <td data-key="City">${item.city}</td>
                <td data-key="DropoffAddress">${item.address}</td>
                <td data-key="ContactPerson">${item.contact}</td>
                <td data-key="ContactNumber">${item.number}</td>
                <td data-key="RequestCategory">${item.category}</td>
                <td>
                    <button class="viewBtn" data-index="${data.indexOf(item)}">View</button>
                    <button class="deleteBtn" data-key="${item.firebaseKey}">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        entriesInfo.textContent = `Showing ${filteredData.length ? start + 1 : 0} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
        renderPagination();
    }

    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('reliefModal').classList.add('hidden');
    });

    function renderPagination() {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);

        if (totalPages === 0) {
            pagination.innerHTML = '<span>No entries to display</span>';
            return;
        }

        const createButton = (label, page, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (isActive) btn.classList.add('active');
            btn.addEventListener('click', () => {
                currentPage = page;
                renderTable();
            });
            return btn;
        };

        pagination.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pagination.appendChild(createButton(i, i, false, i === currentPage));
        }

        pagination.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
    }

    document.getElementById("sortSelect").addEventListener("change", function () {
        const selectedValue = this.value;
        if (!selectedValue) return;

        const [key, order] = selectedValue.split("-");
        sortTableData(key, order);
    });

    function sortTableData(key, order = "asc") {
        filteredData.sort((a, b) => {
            const map = {
                No: (item, i) => i + 1,
                ReliefID: item => item.id,
                VolunteerGroupName: item => item.group,
                UserUID: item => item.userUid, // Added for sorting
                City: item => item.city,
                DropoffAddress: item => item.address,
                ContactPerson: item => item.contact,
                ContactNumber: item => item.number,
                RequestCategory: item => item.category
            };

            const valA = typeof map[key] === "function" ? map[key](a, data.indexOf(a)) : "";
            const valB = typeof map[key] === "function" ? map[key](b, data.indexOf(b)) : "";

            const compA = isNaN(valA) ? String(valA).toLowerCase() : parseFloat(valA);
            const compB = isNaN(valB) ? String(valB).toLowerCase() : parseFloat(valB);

            if (compA < compB) return order === "asc" ? -1 : 1;
            if (compA > compB) return order === "asc" ? 1 : -1;
            return 0;
        });

        currentPage = 1;
        renderTable();
    }

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('viewBtn')) {
            console.log('View button clicked');
            const idx = parseInt(e.target.dataset.index);
            const item = data[idx];

            document.getElementById('modalTitle').textContent = `Relief Request of ${item.group}`;
            document.getElementById('modalContact').textContent = item.contact;
            document.getElementById('modalNumber').textContent = item.number;
            document.getElementById('modalEmail').textContent = item.email || 'N/A';
            document.getElementById('modalAddress').textContent = item.address;
            document.getElementById('modalCategory').textContent = item.category;
            document.getElementById('modalGroup').textContent = item.group;

            const itemsTableBody = document.querySelector('#itemsTable tbody');
            itemsTableBody.innerHTML = '';
            (item.items || []).forEach(i => {
                itemsTableBody.insertAdjacentHTML('beforeend', `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.notes}</td></tr>`);
            });

            document.getElementById('reliefModal').classList.remove('hidden');
        }

        if (e.target.classList.contains('deleteBtn')) {
            const firebaseKey = e.target.dataset.key;
            console.log('Delete button clicked for ID:', firebaseKey);

            Swal.fire({
                title: 'Are you sure?',
                text: "You will not be able to recover this request!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'No, cancel!',
            }).then((result) => {
                if (result.isConfirmed) {
                    // Fetch the request to get the userUid
                    database.ref(`requestRelief/requests/${firebaseKey}`).once('value', snapshot => {
                        const request = snapshot.val();
                        const userUid = request.userUid;

                        // Delete from both nodes
                        Promise.all([
                            database.ref(`requestRelief/requests/${firebaseKey}`).remove(),
                            database.ref(`users/${userUid}/requests/${firebaseKey}`).remove()
                        ])
                            .then(() => {
                                Swal.fire(
                                    'Deleted!',
                                    'The request has been deleted.',
                                    'success'
                                );
                                data = data.filter(item => item.firebaseKey !== firebaseKey);
                                filteredData = [...data];
                                renderTable();
                            })
                            .catch((error) => {
                                Swal.fire(
                                    'Error!',
                                    'Failed to delete the request. Please try again.',
                                    'error'
                                );
                                console.error('Delete failed:', error);
                            });
                    });
                }
            });
        }
    });
});