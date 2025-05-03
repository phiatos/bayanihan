document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#orgTable tbody');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');

    const data = [
        {
            id: 'RR001',
            group: 'HelpHands',
            city: 'Quezon City',
            address: '123 St.',
            contact: 'Anna Cruz',
            number: '09171234567',
            email: 'anna@helphands.org',
            category: 'Food',
            items: [
                { name: 'Rice', qty: 50, note: '5kg sacks' },
                { name: 'Canned Goods', qty: 100, note: 'Any variety' }
            ]
        },
        {
            id: 'RR002',
            group: 'Hope Foundation',
            city: 'Manila',
            address: '456 Avenue',
            contact: 'Carlos Garcia',
            number: '09181234567',
            email: 'carlos@hopefoundation.org',
            category: 'Clothing',
            items: [
                { name: 'T-Shirts', qty: 200, note: 'Any size' },
                { name: 'Jackets', qty: 50, note: 'L and XL' }
            ]
        },
        {
            id: 'RR003',
            group: 'Care4All',
            city: 'Cebu City',
            address: '789 Blvd.',
            contact: 'Mia Santos',
            number: '09191234567',
            email: 'mia@care4all.org',
            category: 'Medical Supplies',
            items: [
                { name: 'Masks', qty: 500, note: 'Surgical masks' },
                { name: 'Gloves', qty: 200, note: 'Latex, small and medium' }
            ]
        },
        {
            id: 'RR004',
            group: 'HandsOfHope',
            city: 'Davao',
            address: '101 St. Road',
            contact: 'John Reyes',
            number: '09201234567',
            email: 'john@handsofhope.org',
            category: 'Food',
            items: [
                { name: 'Sugar', qty: 40, note: '10kg bags' },
                { name: 'Flour', qty: 60, note: '5kg packs' }
            ]
        },
        {
            id: 'RR005',
            group: 'GiveBack Foundation',
            city: 'Iloilo City',
            address: '202 Main St.',
            contact: 'Elena Lopez',
            number: '09211234567',
            email: 'elena@giveback.org',
            category: 'Educational Materials',
            items: [
                { name: 'Books', qty: 300, note: 'Children’s books' },
                { name: 'Notebooks', qty: 500, note: 'Wide rule' }
            ]
        }
    ];
    

    let filteredData = [...data];
    const rowsPerPage = 5;
    let currentPage = 1;

    function renderTable() {
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
        searchInput.value = '';
        applySearchAndSort();
    };

    // Show modal with details
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-btn')) {
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
                itemsTableBody.insertAdjacentHTML('beforeend', `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.note}</td></tr>`);
            });

            document.getElementById('reliefModal').classList.remove('hidden');
        }
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('reliefModal').classList.add('hidden');
    });

    // Initial render
    renderTable();
});
