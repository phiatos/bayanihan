document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing reliefslog script'); // Debug log

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

    // Verify DOM elements exist
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
    const rowsPerPage = 5;
    let currentPage = 1;

    // Fetch data from Firebase
    database.ref('requestRelief/requests').on('value', (snapshot) => {
        console.log('Fetching data from Firebase');
        data = [];
        const requests = snapshot.val();
        if (requests) {
            Object.keys(requests).forEach((key, index) => {
                const request = requests[key];
                data.push({
                    id: `RR${String(index + 1).padStart(3, '0')}`,
                    group: request.volunteerOrganization || '[Your Org]',
                    city: request.city,
                    address: request.address,
                    contact: request.contactPerson,
                    number: request.contactNumber,
                    email: request.email,
                    category: request.category,
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
                <td>${start + index + 1}</td>
                <td>${item.id}</td>
                <td>${item.group}</td>
                <td>${item.city}</td>
                <td>${item.address}</td>
                <td>${item.contact}</td>
                <td>${item.number}</td>
                <td>${item.category}</td>
                <td><button class="view-btn" data-index="${data.indexOf(item)}">View</button></td>
            `;
            tableBody.appendChild(tr);
        });

        entriesInfo.textContent = `Showing ${filteredData.length ? start + 1 : 0} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
        renderPagination();
    }

    function renderPagination() {
        console.log('Rendering pagination');
        pagination.innerHTML = '';
        const totalPages = Math.ceil(filteredData.length / rowsPerPage);

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            if (i === currentPage) btn.classList.add('active');
            btn.addEventListener('click', () => {
                currentPage = i;
                renderTable();
            });
            pagination.appendChild(btn);
        }
    }

    function applySearchAndSort() {
        console.log('Applying search and sort');
        const query = searchInput.value.toLowerCase();
        const sortBy = sortSelect.value;

        filteredData = data.filter(item =>
            Object.values(item).some(val =>
                typeof val === 'string' && val.toLowerCase().includes(query)
            )
        );

        if (sortBy) {
            filteredData.sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
        }

        currentPage = 1;
        renderTable();
    }

    searchInput.addEventListener('input', applySearchAndSort);
    sortSelect.addEventListener('change', applySearchAndSort);

    window.clearDInputs = () => {
        console.log('Clearing search input');
        searchInput.value = '';
        applySearchAndSort();
    };

    // Show modal with details
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-btn')) {
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
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        console.log('Close modal button clicked');
        document.getElementById('reliefModal').classList.add('hidden');
    });

    // Initial render
    renderTable();
});