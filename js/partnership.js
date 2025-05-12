// document.addEventListener('DOMContentLoaded', () => {
//     const table = document.getElementById('partnershipTable').getElementsByTagName('tbody')[0];
//     const paginationContainer = document.getElementById("pagination");
//     const entriesInfo = document.getElementById("entriesInfo");
//     const searchInput = document.querySelector("#searchInput");
//     const clearBtn = document.querySelector('.clear-btn'); 
//     const sortSelect = document.querySelector("#sortSelect");

//     const rowsPerPage = 5;
//     let currentPage = 1;
//     let filteredRows = [];

//     // Event listeners
//     const addRowButton = document.querySelector(".add-row-btn");
//     if (addRowButton) {
//         addRowButton.addEventListener('click', addRow);
//     }
//     const saveButton = document.getElementById('saveBtn');
//     if (saveButton) {
//         saveButton.addEventListener('click', saveTable);
//     }

//     function handleSearch() {
//         const query = searchInput.value.trim().toLowerCase();
//         clearBtn.style.display = query ? 'flex' : 'none';

//         filteredRows = Array.from(table.rows).filter(row => {
//             return Array.from(row.cells).some(cell => {
//                 return cell.textContent.toLowerCase().includes(query);
//             });
//         });

//         currentPage = 1; // Reset to first page on search
//         applyPagination(); // Call applyPagination here
//     }

//     // Clear search input and reset table
//     function clearDInputs() {
//         searchInput.value = '';
//         clearBtn.style.display = 'none';
//         filteredRows = Array.from(table.rows); // Reset to all rows
//         currentPage = 1;
//         applyPagination();
//         searchInput.focus();
//     }

//     // Initialize clear button visibility
//     clearBtn.style.display = 'none';

//     // Attach search input event listener
//     searchInput.addEventListener('input', handleSearch);

//     // Clear button functionality
//     clearBtn.addEventListener('click', clearDInputs);

//     // Sort functionality
//     function sortData(rowsToSort, sortBy) {
//         if (!sortBy) {
//             return rowsToSort; // No sorting needed
//         }

//         return rowsToSort.sort((rowA, rowB) => {
//             const cellA = rowA.cells[parseInt(sortBy)].textContent.toLowerCase();
//             const cellB = rowB.cells[parseInt(sortBy)].textContent.toLowerCase();
//             return cellA.localeCompare(cellB);
//         });
//     }

//     sortSelect.addEventListener("change", () => {
//         currentPage = 1; // Reset to the first page after sorting
//         const rowsToSort = filteredRows.length > 0 ? filteredRows : Array.from(table.rows);
//         const sortedRows = sortData(rowsToSort, sortSelect.value);
//         filteredRows = sortedRows; // Update filteredRows with the sorted data
//         applyPagination(); // Re-apply pagination to the sorted data
//     });

//     // Add row function
//     function addRow() {
//         const newRow = table.insertRow();
//         const rowIndex = table.rows.length;

//         const numberCell = newRow.insertCell(0);
//         numberCell.textContent = rowIndex;

//         const columns = [
//             { type: 'input', inputType: 'text', placeholder: 'Enter Encoder' },
//             { type: 'input', inputType: 'text', placeholder: 'Enter Name' },
//             { type: 'input', inputType: 'text', placeholder: 'Enter Type' },
//             { type: 'input', inputType: 'text', placeholder: 'Enter Address' },
//             { type: 'input', inputType: 'text', placeholder: 'Enter Contact Person' },
//             { type: 'input', inputType: 'tel', placeholder: 'Enter Mobile Number' },
//             { type: 'input', inputType: 'email', placeholder: 'Enter Email Address' },
//             { type: 'select', options: ['Select Assistance Type', 'Cash', 'Relief Goods', 'Services'] },
//             { type: 'textarea', placeholder: 'Enter Additional Notes', rows: 2 },
//             { type: 'input', inputType: 'number', placeholder: 'Enter Valuation' },
//             { type: 'select', options: ['Select Status', 'Close', 'Closed Successful', 'Pending'] },
//             { type: 'select', options: ['Select Endorsee', 'Team A', 'Team B', 'External Partner'] },
//             { type: 'input', inputType: 'text', placeholder: 'Enter Staff In-Charge' }
//         ];

//         columns.forEach((col, i) => {
//             const cell = newRow.insertCell(i + 1);
//             if (col.type === 'input') {
//                 const input = document.createElement('input');
//                 input.type = col.inputType;
//                 input.placeholder = col.placeholder;
//                 cell.appendChild(input);
//             } else if (col.type === 'textarea') {
//                 const textarea = document.createElement('textarea');
//                 textarea.placeholder = col.placeholder;
//                 textarea.rows = col.rows || 2;
//                 cell.appendChild(textarea);
//             } else if (col.type === 'select') {
//                 const select = document.createElement('select');
//                 col.options.forEach((optionText, index) => {
//                     const option = document.createElement('option');
//                     option.textContent = optionText;
//                     option.value = optionText; // Set value for consistency
//                     option.disabled = index === 0;
//                     if (index === 0) option.selected = true;
//                     select.appendChild(option);
//                 });
//                 cell.appendChild(select);
//             }
//         });

//         // Add a delete button to the last cell
//         const deleteCell = newRow.insertCell(columns.length + 1); // Insert at the correct index
//         const deleteButton = document.createElement('button');
//         deleteButton.textContent = 'Delete';
//         deleteButton.classList.add('delete-btn'); // Add a class for styling
//         deleteButton.addEventListener('click', function() {
//             deleteRow(this.parentNode.parentNode); // 'this' refers to the button, parentNode is the cell, parentNode.parentNode is the row
//         });
//         deleteCell.appendChild(deleteButton);

//         applyPagination();
//     }

//     function deleteRow(rowToDelete) {
//         const rowIndex = rowToDelete.rowIndex;
//         table.deleteRow(rowIndex);
//         reindexTable(); // Update the number column
//         saveTable(); // Save the updated table data
//         applyPagination(); // Re-apply pagination after deletion
//     }

//     function reindexTable() {
//         const rows = table.rows;
//         for (let i = 0; i < rows.length; i++) {
//             const numberCell = rows[i].cells[0];
//             numberCell.textContent = i + 1;
//         }
//     }

//     // Save table data to localStorage
//     function saveTable() {
//         const rows = table.rows;
//         const data = [];

//         for (let i = 0; i < rows.length; i++) {
//             const row = rows[i];
//             const rowData = [];
//             let isEmptyRow = true;

//             for (let j = 1; j < row.cells.length - 1; j++) { // Exclude the delete button cell
//                 const cell = row.cells[j];
//                 const input = cell.querySelector('input, textarea, select');
//                 const value = input ? input.value.trim() : '';
//                 rowData.push(value);
//                 if (value !== '') isEmptyRow = false;
//             }

//             if (!isEmptyRow) {
//                 data.push(rowData);
//             }
//         }

//         localStorage.setItem('partnershipData', JSON.stringify(data));

//         // Clear table before reloading
//         while (table.rows.length > 0) {
//             table.deleteRow(0);
//         }

//         loadTableData(); // Reload saved data
//         Swal.fire('Saved!', 'Partnership data has been saved locally and displayed.', 'success');
//     }

//     // Load saved table data from localStorage
//     function loadTableData() {
//         const storedData = localStorage.getItem('partnershipData');
//         if (storedData) {
//             const data = JSON.parse(storedData);

//             data.forEach((rowData, index) => {
//                 const newRow = table.insertRow();
//                 const numberCell = newRow.insertCell(0);
//                 numberCell.textContent = index + 1;

//                 rowData.forEach((cellData, colIndex) => {
//                     const cell = newRow.insertCell();
//                     let element;

//                     if (colIndex === 6) { // Email
//                         element = document.createElement('input');
//                         element.type = 'email';
//                     } else if (colIndex === 5) { // Number (Tel)
//                         element = document.createElement('input');
//                         element.type = 'tel';
//                     } else if (colIndex === 7 || colIndex === 11 || colIndex === 12) { // These are the select columns
//                         let selectOptions = [];
//                         if (colIndex === 7) {
//                             selectOptions = ['Select Assistance Type', 'Cash', 'Relief Goods', 'Services'];
//                         } else if (colIndex === 11) {
//                             selectOptions = ['Select Status', 'Close', 'Closed Successful', 'Pending'];
//                         } else if (colIndex === 12) {
//                             selectOptions = ['Select Endorsee', 'Team A', 'Team B', 'External Partner'];
//                         }
//                         const select = document.createElement('select');
//                         selectOptions.forEach(optionText => {
//                             const option = document.createElement('option');
//                             option.textContent = optionText;
//                             option.value = optionText;
//                             if (optionText === cellData) {
//                                 option.selected = true;
//                             } else if (selectOptions[0] === optionText && cellData === '') {
//                                 option.selected = true;
//                             }
//                             select.appendChild(option);
//                         });
//                         element = select;
//                     } else {
//                         element = document.createElement('input');
//                         element.type = 'text';
//                     }
//                     element.value = cellData;
//                     cell.appendChild(element);
//                 });

//                 // Add the delete button for loaded rows
//                 const deleteCell = newRow.insertCell(rowData.length + 1); 
//                 const deleteButton = document.createElement('button');
//                 deleteButton.textContent = 'Delete';
//                 deleteButton.classList.add('delete-btn');
//                 deleteButton.addEventListener('click', function() {
//                     deleteRow(this.parentNode.parentNode);
//                 });
//                 deleteCell.appendChild(deleteButton);
//             });
//         } else {
//             addRow();
//         }
//         filteredRows = Array.from(table.rows); 
//         applyPagination();
//     }

//     // Pagination handling
//     function applyPagination() {
//         const rows = filteredRows.length > 0 ? filteredRows : Array.from(table.rows);
//         const totalRows = rows.length;
//         const totalPages = Math.ceil(totalRows / rowsPerPage);

//         // Show only rows for the current page
//         const startIdx = (currentPage - 1) * rowsPerPage;
//         const endIdx = Math.min(currentPage * rowsPerPage, totalRows);

//         for (let i = 0; i < totalRows; i++) {
//             const row = rows[i];
//             row.style.display = (i >= startIdx && i < endIdx) ? '' : 'none';
//         }

//         entriesInfo.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalRows} entries`;

//         renderPagination(totalRows, totalPages);
//     }

//     function renderPagination(totalRows, totalPages) {
//         paginationContainer.innerHTML = "";

//         const createButton = (label, page = null, disabled = false, active = false) => {
//             const btn = document.createElement("button");
//             btn.textContent = label;
//             if (disabled) btn.disabled = true;
//             if (active) btn.classList.add("active-page");
//             if (page !== null) {
//                 btn.addEventListener("click", () => {
//                     currentPage = page;
//                     applyPagination();
//                 });
//             }
//             return btn;
//         };

//         paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

//         for (let i = 1; i <= totalPages; i++) {
//             paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
//         }

//         paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
//     }

//     loadTableData();
//     applyPagination();
// });

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#partnershipTable tbody');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const paginationContainer = document.getElementById("pagination");
    const clearBtn = document.querySelector('.clear-btn');
    const addRowButton = document.querySelector(".add-row-btn");
    const saveButton = document.getElementById('saveBtn');

    const rowsPerPage = 5;
    let data = [];
    let filteredData = [];
    let currentPage = 1;

    function loadTableData() {
        const storedData = localStorage.getItem('partnershipData');
        data = storedData ? JSON.parse(storedData).map((rowData, index) => ({
            id: index + 1,
            encoder: rowData[0] || '',
            name: rowData[1] || '',
            type: rowData[2] || '',
            address: rowData[3] || '',
            contactPerson: rowData[4] || '',
            mobileNumber: rowData[5] || '',
            email: rowData[6] || '',
            assistanceType: rowData[7] || 'Select Assistance Type',
            notes: rowData[8] || '',
            valuation: rowData[9] || '',
            status: rowData[10] || 'Select Status',
            endorsee: rowData[11] || 'Select Endorsee',
            staffInCharge: rowData[12] || ''
        })) : [];
        filteredData = [...data];
        renderTable();
        renderPaginationButtons(data.length, Math.ceil(data.length / rowsPerPage));
        clearBtn.style.display = searchInput.value.trim() ? 'flex' : 'none';
    }

    function renderTable() {
        tableBody.innerHTML = '';
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const currentRows = filteredData.slice(start, end);

        currentRows.forEach(item => {
            const tr = tableBody.insertRow();
            tr.insertCell(0).textContent = item.id;
            tr.insertCell(1).textContent = item.encoder;
            tr.insertCell(2).textContent = item.name;
            tr.insertCell(3).textContent = item.type;
            tr.insertCell(4).textContent = item.address;
            tr.insertCell(5).textContent = item.contactPerson;
            tr.insertCell(6).textContent = item.mobileNumber;
            tr.insertCell(7).textContent = item.email;
            tr.insertCell(8).textContent = item.assistanceType;
            tr.insertCell(9).textContent = item.notes;
            tr.insertCell(10).textContent = item.valuation;
            tr.insertCell(11).textContent = item.status;
            tr.insertCell(12).textContent = item.endorsee;
            tr.insertCell(13).textContent = item.staffInCharge;
            const deleteCell = tr.insertCell(14);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', function() {
                const rowIndex = Array.from(tableBody.rows).indexOf(tr);
                const actualIndex = data.findIndex(d => d.id === currentRows[rowIndex].id);
                deleteRow(actualIndex);
            });
            deleteCell.appendChild(deleteButton);
        });
        entriesInfo.textContent = `Showing ${filteredData.length ? start + 1 : 0} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
    }

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filteredData = data.filter(item => {
            return Object.values(item).some(value => {
                return String(value).toLowerCase().includes(searchTerm);
            });
        });
        currentPage = 1;
        renderTable();
        renderPaginationButtons(filteredData.length, Math.ceil(filteredData.length / rowsPerPage));
        clearBtn.style.display = searchTerm ? 'flex' : 'none';
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        filteredData = [...data];
        currentPage = 1;
        renderTable();
        renderPaginationButtons(data.length, Math.ceil(data.length / rowsPerPage));
        clearBtn.style.display = 'none';
        searchInput.focus();
    });

    sortSelect.addEventListener("change", function () {
        const selectedValue = this.value;
        if (!selectedValue) return;

        const [key, order] = selectedValue.split("-");
        sortTableData(key, order);
    });

    function sortTableData(key, order = "asc") {
        filteredData.sort((a, b) => {
            const valA = String(a[key]).toLowerCase();
            const valB = String(b[key]).toLowerCase();

            if (valA < valB) return order === "asc" ? -1 : 1;
            if (valA > valB) return order === "asc" ? 1 : -1;
            return 0;
        });
        currentPage = 1;
        renderTable();
        renderPaginationButtons(filteredData.length, Math.ceil(filteredData.length / rowsPerPage));
    }

    if (addRowButton) {
        addRowButton.addEventListener('click', addRow);
    }

    function addRow() {
        const newRowData = {
            id: data.length > 0 ? Math.max(...data.map(item => item.id)) + 1 : 1,
            encoder: '',
            name: '',
            type: '',
            address: '',
            contactPerson: '',
            mobileNumber: '',
            email: '',
            assistanceType: 'Select Assistance Type',
            notes: '',
            valuation: '',
            status: 'Select Status',
            endorsee: 'Select Endorsee',
            staffInCharge: ''
        };
        data.push(newRowData);
        filteredData = [...data];
        renderTable();
        renderPaginationButtons(data.length, Math.ceil(data.length / rowsPerPage));
    }

    if (saveButton) {
        saveButton.addEventListener('click', saveTable);
    }

    function saveTable() {
        const saveData = data.map(item => [
            item.encoder, item.name, item.type, item.address, item.contactPerson,
            item.mobileNumber, item.email, item.assistanceType, item.notes,
            item.valuation, item.status, item.endorsee, item.staffInCharge
        ]);
        localStorage.setItem('partnershipData', JSON.stringify(saveData));
        Swal.fire('Saved!', 'Partnership data has been saved locally.', 'success');
    }

    function deleteRow(indexToDelete) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                data.splice(indexToDelete, 1);
                data = data.map((item, index) => ({ ...item, id: index + 1 }));
                filteredData = [...data];
                currentPage = 1;
                renderTable();
                renderPaginationButtons(data.length, Math.ceil(data.length / rowsPerPage));
                Swal.fire(
                    'Deleted!',
                    'The row has been deleted.',
                    'success'
                );
            }
        });
    }

    function renderPaginationButtons(totalItems, totalPages) {
        paginationContainer.innerHTML = "";

        const createButton = (label, page = null, disabled = false, active = false) => {
            const btn = document.createElement("button");
            btn.textContent = label;
            if (disabled) btn.disabled = true;
            if (active) btn.classList.add("active-page");
            if (page !== null) {
                btn.addEventListener("click", () => {
                    currentPage = page;
                    renderTable();
                });
            }
            return btn;
        };

        paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1 && totalPages > maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
        }

        paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
    }

    loadTableData();
});
