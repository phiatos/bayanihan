document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('partnershipTable').getElementsByTagName('tbody')[0];
    const paginationContainer = document.getElementById("pagination");
    const entriesInfo = document.getElementById("entriesInfo");
    const searchInput = document.querySelector("#searchInput");
    const sortSelect = document.querySelector("#sortSelect");

    const rowsPerPage = 5; 
    let currentPage = 1;

    document.querySelector("button[onclick='addRow()']").addEventListener('click', addRow);
    document.querySelector("button[onclick='saveTable()']").addEventListener('click', saveTable);

    // Enhanced Search Functionality
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        clearBtn.style.display = query ? 'flex' : 'none';

        currentPage = 1; // Reset to first page on search
        renderTable(filterAndSort());
    }
    
    // Clear search input and reset table
        function clearDInputs() {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        currentPage = 1;
        renderTable(filterAndSort());
        searchInput.focus();
    }

    // Initialize clear button visibility
    clearBtn.style.display = 'none';

    // Attach search input event listener
    searchInput.addEventListener('input', handleSearch);

    // Dropdown toggle for area selection
    document.addEventListener("click", (e) => {
    const isDropBtn = e.target.matches(".area-dropbtn");

    document.querySelectorAll(".area-dropdown").forEach(dropdown => {
        if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("show");
        }
    });

    if (isDropBtn) {
        const dropdown = e.target.closest(".area-dropdown");
        dropdown.classList.toggle("show");
    }
    });

    function addRow() {
        const newRow = table.insertRow();
        const rowIndex = table.rows.length;

        const numberCell = newRow.insertCell(0);
        numberCell.textContent = rowIndex;

        const columns = [
            { type: 'input', inputType: 'text', placeholder: 'Enter Encoder' },
            { type: 'input', inputType: 'text', placeholder: 'Enter Name' },
            { type: 'input', inputType: 'text', placeholder: 'Enter Type' },
            { type: 'input', inputType: 'text', placeholder: 'Enter Address' },
            { type: 'input', inputType: 'text', placeholder: 'Enter Contact Person' },
            { type: 'input', inputType: 'tel', placeholder: 'Enter Mobile Number' },
            { type: 'input', inputType: 'email', placeholder: 'Email Address' },
           
        ];

        columns.forEach((col, i) => {
            const cell = newRow.insertCell(i + 1);
            if (col.type === 'input') {
                const input = document.createElement('input');
                input.type = col.inputType;
                input.placeholder = col.placeholder;
                cell.appendChild(input);
            } else if (col.type === 'textarea') {
                const textarea = document.createElement('textarea');
                textarea.placeholder = col.placeholder;
                textarea.rows = col.rows || 2;
                cell.appendChild(textarea);
            } else if (col.type === 'select') {
                const select = document.createElement('select');
                col.options.forEach((optionText, index) => {
                    const option = document.createElement('option');
                    option.textContent = optionText;
                    option.disabled = index === 0;
                    if (index === 0) option.selected = true;
                    select.appendChild(option);
                });
                cell.appendChild(select);
            }
        });

        applyPagination();
    }

    function saveTable() {
        const rows = table.rows;
        const data = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowData = [];
            for (let j = 1; j < row.cells.length; j++) {
                const cell = row.cells[j];
                const input = cell.querySelector('input, textarea, select');
                rowData.push(input ? input.value : '');
            }
            data.push(rowData);
        }

        console.log(data); // Replace with your API call or Firebase logic
        Swal.fire('Saved!', 'Partnership data has been logged to console.', 'success');
    }

    function applyPagination() {
        const rows = table.rows;
        const totalRows = rows.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage);

        // Show only rows for the current page
        const startIdx = (currentPage - 1) * rowsPerPage;
        const endIdx = Math.min(currentPage * rowsPerPage, totalRows);

        for (let i = 0; i < totalRows; i++) {
            rows[i].style.display = (i >= startIdx && i < endIdx) ? '' : 'none';
        }

        entriesInfo.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalRows} entries`;

        renderPagination(totalRows, totalPages);
    }

    function renderPagination(totalRows, totalPages) {
        paginationContainer.innerHTML = "";

        const createButton = (label, page = null, disabled = false, active = false) => {
            const btn = document.createElement("button");
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (active) btn.classList.add("active-page");
            if (page !== null) {
                btn.addEventListener("click", () => {
                    currentPage = page;
                    applyPagination();
                });
            }
            return btn;
        };

        paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

        for (let i = 1; i <= totalPages; i++) {
            paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
        }

        paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
    }

    // Initialize pagination when page loads
    applyPagination();
});
