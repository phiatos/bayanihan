const form = document.getElementById('partnershipForm');
const table = document.querySelector('#dataTable tbody');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.querySelector("#sortSelect");
const entriesInfo = document.querySelector("#entriesInfo");
const paginationContainer = document.querySelector("#pagination");
const clearBtn = document.querySelector('.clear-btn');

let rowCount = 0;
let currentPage = 1;
const rowsPerPage = 5;
let tableData = []; // To store all form data

form.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    rowCount++;
    data.id = rowCount; // Add a unique ID for each row
    tableData.push(data); // Store data in tableData

    form.reset();
    const filtered = filterAndSort();
    renderTable(filtered);
    renderPagination(filtered.length);
});

// Search Functionality
function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    clearBtn.style.display = query ? 'flex' : 'none';
    currentPage = 1; 

    const filtered = filterAndSort();
    renderTable(filtered);
    renderPagination(filtered.length);
}

// Clear search input and reset table
function clearDInputs() {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    currentPage = 1;

    const filtered = filterAndSort();
    renderTable(filtered);
    renderPagination(filtered.length);
    searchInput.focus();
}

// Initialize clear button visibility
clearBtn.style.display = 'none';

// Attach search input event listener
searchInput.addEventListener('input', handleSearch);

function deleteRow(btn) {
    const row = btn.closest('tr');
    const rowId = row.dataset.id; // Get ID of the row
    tableData = tableData.filter(item => item.id !== rowId); // Remove from data
    row.remove();
    renderPagination(tableData.length);
    renderTable(filterAndSort());
}

function editRow(btn) {
    const row = btn.closest('tr');
    const cells = row.querySelectorAll('td');
    const values = Array.from(cells).slice(1, 14).map(cell => cell.innerText);
    
    const inputs = form.querySelectorAll('input');
    values.forEach((val, idx) => inputs[idx].value = val);

    tableData = tableData.filter(item => item.id !== row.dataset.id); // Remove the row from data
    row.remove();
    renderPagination(tableData.length);
}

function filterAndSort() {
    let filteredData = tableData;

    // Handle Search Filtering
    if (searchInput.value) {
        filteredData = filteredData.filter(item => 
            Object.values(item).some(value => value.toString().toLowerCase().includes(searchInput.value.toLowerCase()))
        );
    }

    // Handle Sorting (assuming you want to sort by one column for simplicity)
    const sortOption = sortSelect.value;
    if (sortOption) {
        filteredData = filteredData.sort((a, b) => {
            if (a[sortOption] < b[sortOption]) return -1;
            if (a[sortOption] > b[sortOption]) return 1;
            return 0;
        });
    }

    return filteredData;
}

function renderTable(filteredData) {
    table.innerHTML = ''; // Clear the table body
    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = startIdx + rowsPerPage;
    const dataToDisplay = filteredData.slice(startIdx, endIdx);

    dataToDisplay.forEach(data => {
        const row = table.insertRow();
        row.dataset.id = data.id;
        row.innerHTML = `
            <td>${data.id}</td>
            <td>${data.encoder}</td>
            <td>${data.partnerName}</td>
            <td>${data.partnerType}</td>
            <td>${data.address}</td>
            <td>${data.contactPerson}</td>
            <td>${data.number}</td>
            <td>${data.email}</td>
            <td>${data.assistanceType}</td>
            <td>${data.notes}</td>
            <td>${data.valuation}</td>
            <td>${data.status}</td>
            <td>${data.endorsedTo}</td>
            <td>${data.staffInCharge}</td>
            <td class="actions">
                <button onclick="editRow(this)">Edit</button>
                <button onclick="deleteRow(this)">Delete</button>
            </td>
        `;
    });
    
    // Update entries info
    const totalEntries = filteredData.length;
    const visibleEntriesStart = startIdx + 1;
    const visibleEntriesEnd = Math.min(startIdx + rowsPerPage, totalEntries);
    entriesInfo.textContent = `Showing ${visibleEntriesStart} to ${visibleEntriesEnd} of ${totalEntries} entries`;
}

function renderPagination(totalRows) {
    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const maxVisible = 5;

    const createButton = (label, page = null, disabled = false, active = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (active) btn.classList.add('active-page');
        if (page !== null) {
            btn.addEventListener('click', () => {
                currentPage = page;
                renderTable(filterAndSort());
            });
        }
        return btn;
    };

    if (totalPages === 0) {
        paginationContainer.textContent = 'No entries to display';
        return;
    }

    paginationContainer.appendChild(createButton('Prev', currentPage - 1, currentPage === 1));

    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }

    paginationContainer.appendChild(createButton('Next', currentPage + 1, currentPage === totalPages));
}

document.getElementById('exportBtn').addEventListener('click', function () {
    const filteredData = filterAndSort(); // Get filtered and sorted data
    exportToCSV(filteredData);
});

function exportToCSV(dataArray) {
    if (!dataArray.length) {
        alert('No data to export!');
        return;
    }

    const headers = [
        "ID", "Encoder", "Partner Name", "Partner Type", "Address", 
        "Contact Person", "Number", "Email", "Assistance Type", 
        "Notes", "Valuation", "Status", "Endorsed To", "Staff In-Charge"
    ];

    const rows = dataArray.map(item => [
        item.id, item.encoder, item.partnerName, item.partnerType, item.address,
        item.contactPerson, item.number, item.email, item.assistanceType,
        item.notes, item.valuation, item.status, item.endorsedTo, item.staffInCharge
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "partnership_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


