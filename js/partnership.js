// document.addEventListener('DOMContentLoaded', () => {
//     const table = document.getElementById('partnershipTable').getElementsByTagName('tbody')[0];
//     const paginationContainer = document.getElementById("pagination");
//     const entriesInfo = document.getElementById("entriesInfo");
//     const searchInput = document.querySelector("#searchInput");
//     const clearBtn = document.getElementById('clearBtn');  

//     const rowsPerPage = 5; 
//     let currentPage = 1;
//     let filteredRows = [];  // Array to hold filtered rows based on search query

//     // Event listeners
//     document.querySelector("button[onclick='addRow()']").addEventListener('click', addRow);
//     document.querySelector("button[onclick='saveTable()']").addEventListener('click', saveTable);

//     // Enhanced Search Functionality
//     function handleSearch() {
//         const query = searchInput.value.trim().toLowerCase();
//         clearBtn.style.display = query ? 'flex' : 'none'; 

//         // Filter rows based on search query
//         filteredRows = Array.from(table.rows).filter(row => {
//             return Array.from(row.cells).some(cell => {
//                 return cell.textContent.toLowerCase().includes(query);  
//             });
//         });

//         currentPage = 1; // Reset to first page on search
//         renderTable(filteredRows);
//     }

//     // Clear search input and reset table

//     // Initialize clear button visibility
//     // clearBtn.style.display = 'none';

//     // Attach search input event listener
//     searchInput.addEventListener('input', handleSearch);

//     // Clear button functionality
//     // clearBtn.addEventListener('click', clearDInputs);

//     // Dropdown toggle for area selection
//     document.addEventListener("click", (e) => {
//         const isDropBtn = e.target.matches(".area-dropbtn");

//         document.querySelectorAll(".area-dropdown").forEach(dropdown => {
//             if (!dropdown.contains(e.target)) {
//                 dropdown.classList.remove("show");
//             }
//         });

//         if (isDropBtn) {
//             const dropdown = e.target.closest(".area-dropdown");
//             dropdown.classList.toggle("show");
//         }
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
//             { type: 'input', inputType: 'email', placeholder: 'Email Address' },
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
//                     option.disabled = index === 0;
//                     if (index === 0) option.selected = true;
//                     select.appendChild(option);
//                 });
//                 cell.appendChild(select);
//             }
//         });

//         // Add a delete button to the last cell
//         const deleteCell = newRow.insertCell();
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
//      const rowIndex = rowToDelete.rowIndex;
//      table.deleteRow(rowIndex);
//      reindexTable(); // Update the number column
//      saveTable(); // Save the updated table data
//  }

//  function reindexTable() {
//      const rows = table.rows;
//      for (let i = 0; i < rows.length; i++) {
//          const numberCell = rows[i].cells[0];
//          numberCell.textContent = i + 1;
//      }
//  }

//     // Save table data to localStorage
//     function saveTable() {
//         const rows = table.rows;
//         const data = [];

//         for (let i = 0; i < rows.length; i++) {
//             const row = rows[i];
//             const rowData = [];
//             let isEmptyRow = true;

//             for (let j = 1; j < row.cells.length; j++) {
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
//         // addRow();
//         Swal.fire('Saved!', 'Partnership data has been saved locally and displayed.', 'success');
//     }

//     // Load saved table data from localStorage
//     function loadTableData() {
//         const storedData = localStorage.getItem('partnershipData');
//         if (storedData) {
//         const data = JSON.parse(storedData);

//             data.forEach((rowData, index) => {
//                 const newRow = table.insertRow();
//                 const numberCell = newRow.insertCell(0);
//                 numberCell.textContent = index + 1;

//                     rowData.forEach((cellData, colIndex) => {
//                         const cell = newRow.insertCell();
//                         let element;

//                         if (colIndex === 6) {
//                             element = document.createElement('input');
//                             element.type = 'email';
//                         } else if (colIndex === 5) {
//                             element = document.createElement('input');
//                             element.type = 'tel';
//                         } else if (colIndex >= 8 && colIndex <= 10) { // These are the select columns
//                             const selectOptions = [
//                                 ['Select Assistance Type', 'Cash', 'Relief Goods', 'Services'],
//                                 ['Select Status', 'Close', 'Closed Successful', 'Pending'],
//                                 ['Select Endorsee', 'Team A', 'Team B', 'External Partner']
//                             ];
//                             const select = document.createElement('select');
//                             const options = selectOptions[colIndex - 8];
//                             options.forEach(optionText => {
//                                 const option = document.createElement('option');
//                                 option.textContent = optionText;
//                                 option.value = optionText; // Set the value
//                                 if (optionText === cellData) {
//                                     option.selected = true;
//                                 } else if (options[0] === optionText && cellData === '') {
//                                     option.selected = true; // Select the default if no data
//                                 }
//                                 select.appendChild(option);
//                             });
//                             element = select;
//                         } else {
//                             element = document.createElement('input');
//                             element.type = 'text';
//                         }
//                         element.value = cellData;
//                         cell.appendChild(element);
//                     });

//                     // Add the delete button for loaded rows as well
//                     const deleteCell = newRow.insertCell();
//                     const deleteButton = document.createElement('button');
//                     deleteButton.textContent = 'Delete';
//                     deleteButton.classList.add('delete-btn');
//                     deleteButton.addEventListener('click', function() {
//                         deleteRow(this.parentNode.parentNode);
//                     });
//                     deleteCell.appendChild(deleteButton);
//             });
//         }
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
//     // addRow(); 
//     applyPagination();
// });

document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('partnershipTable').getElementsByTagName('tbody')[0];
    const paginationContainer = document.getElementById("pagination");
    const entriesInfo = document.getElementById("entriesInfo");
    const searchInput = document.querySelector("#searchInput");
    const clearBtn = document.querySelector('.clear-btn'); // Use class selector

    const rowsPerPage = 5;
    let currentPage = 1;
    let filteredRows = [];

    // Event listeners
    const addRowButton = document.querySelector(".add-row-btn");
    if (addRowButton) {
        addRowButton.addEventListener('click', addRow);
    }
    const saveButton = document.getElementById('saveBtn');
    if (saveButton) {
        saveButton.addEventListener('click', saveTable);
    }

    // Enhanced Search Functionality
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        clearBtn.style.display = query ? 'flex' : 'none';

        filteredRows = Array.from(table.rows).filter(row => {
            return Array.from(row.cells).some(cell => {
                return cell.textContent.toLowerCase().includes(query);
            });
        });

        currentPage = 1; // Reset to first page on search
        renderTable(filteredRows);
    }

    // Clear search input and reset table
    function clearDInputs() {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        filteredRows = Array.from(table.rows); // Reset to all rows
        currentPage = 1;
        renderTable(filteredRows);
        searchInput.focus();
    }

    // Initialize clear button visibility
    clearBtn.style.display = 'none';

    // Attach search input event listener
    searchInput.addEventListener('input', handleSearch);

    // Clear button functionality
    clearBtn.addEventListener('click', clearDInputs);

    // Dropdown toggle for area selection (assuming this is related to a different part of your UI)
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

    // Add row function
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
            { type: 'input', inputType: 'email', placeholder: 'Enter Email Address' },
            { type: 'select', options: ['Select Assistance Type', 'Cash', 'Relief Goods', 'Services'] },
            { type: 'textarea', placeholder: 'Enter Additional Notes', rows: 2 },
            { type: 'input', inputType: 'number', placeholder: 'Enter Valuation' },
            { type: 'select', options: ['Select Status', 'Close', 'Closed Successful', 'Pending'] },
            { type: 'select', options: ['Select Endorsee', 'Team A', 'Team B', 'External Partner'] },
            { type: 'input', inputType: 'text', placeholder: 'Enter Staff In-Charge' }
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
                    option.value = optionText; // Set value for consistency
                    option.disabled = index === 0;
                    if (index === 0) option.selected = true;
                    select.appendChild(option);
                });
                cell.appendChild(select);
            }
        });

        // Add a delete button to the last cell
        const deleteCell = newRow.insertCell(columns.length + 1); // Insert at the correct index
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-btn'); // Add a class for styling
        deleteButton.addEventListener('click', function() {
            deleteRow(this.parentNode.parentNode); // 'this' refers to the button, parentNode is the cell, parentNode.parentNode is the row
        });
        deleteCell.appendChild(deleteButton);

        applyPagination();
    }

    function deleteRow(rowToDelete) {
        const rowIndex = rowToDelete.rowIndex;
        table.deleteRow(rowIndex);
        reindexTable(); // Update the number column
        saveTable(); // Save the updated table data
        applyPagination(); // Re-apply pagination after deletion
    }

    function reindexTable() {
        const rows = table.rows;
        for (let i = 0; i < rows.length; i++) {
            const numberCell = rows[i].cells[0];
            numberCell.textContent = i + 1;
        }
    }

    // Save table data to localStorage
    function saveTable() {
        const rows = table.rows;
        const data = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowData = [];
            let isEmptyRow = true;

            for (let j = 1; j < row.cells.length - 1; j++) { // Exclude the delete button cell
                const cell = row.cells[j];
                const input = cell.querySelector('input, textarea, select');
                const value = input ? input.value.trim() : '';
                rowData.push(value);
                if (value !== '') isEmptyRow = false;
            }

            if (!isEmptyRow) {
                data.push(rowData);
            }
        }

        localStorage.setItem('partnershipData', JSON.stringify(data));

        // Clear table before reloading
        while (table.rows.length > 0) {
            table.deleteRow(0);
        }

        loadTableData(); // Reload saved data
        Swal.fire('Saved!', 'Partnership data has been saved locally and displayed.', 'success');
    }

    // Load saved table data from localStorage
    function loadTableData() {
        const storedData = localStorage.getItem('partnershipData');
        if (storedData) {
            const data = JSON.parse(storedData);

            data.forEach((rowData, index) => {
                const newRow = table.insertRow();
                const numberCell = newRow.insertCell(0);
                numberCell.textContent = index + 1;

                rowData.forEach((cellData, colIndex) => {
                    const cell = newRow.insertCell();
                    let element;

                    if (colIndex === 6) { // Email
                        element = document.createElement('input');
                        element.type = 'email';
                    } else if (colIndex === 5) { // Number (Tel)
                        element = document.createElement('input');
                        element.type = 'tel';
                    } else if (colIndex === 7 || colIndex === 11 || colIndex === 12) { // These are the select columns
                        let selectOptions = [];
                        if (colIndex === 7) {
                            selectOptions = ['Select Assistance Type', 'Cash', 'Relief Goods', 'Services'];
                        } else if (colIndex === 11) {
                            selectOptions = ['Select Status', 'Close', 'Closed Successful', 'Pending'];
                        } else if (colIndex === 12) {
                            selectOptions = ['Select Endorsee', 'Team A', 'Team B', 'External Partner'];
                        }
                        const select = document.createElement('select');
                        selectOptions.forEach(optionText => {
                            const option = document.createElement('option');
                            option.textContent = optionText;
                            option.value = optionText;
                            if (optionText === cellData) {
                                option.selected = true;
                            } else if (selectOptions[0] === optionText && cellData === '') {
                                option.selected = true;
                            }
                            select.appendChild(option);
                        });
                        element = select;
                    } else {
                        element = document.createElement('input');
                        element.type = 'text';
                    }
                    element.value = cellData;
                    cell.appendChild(element);
                });

                // Add the delete button for loaded rows
                const deleteCell = newRow.insertCell(rowData.length + 1); 
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.classList.add('delete-btn');
                deleteButton.addEventListener('click', function() {
                    deleteRow(this.parentNode.parentNode);
                });
                deleteCell.appendChild(deleteButton);
            });
        } else {
            addRow();
        }
        applyPagination();
    }

    // Pagination handling
    function applyPagination() {
        const rows = filteredRows.length > 0 ? filteredRows : Array.from(table.rows);
        const totalRows = rows.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage);

        // Show only rows for the current page
        const startIdx = (currentPage - 1) * rowsPerPage;
        const endIdx = Math.min(currentPage * rowsPerPage, totalRows);

        for (let i = 0; i < totalRows; i++) {
            const row = rows[i];
            row.style.display = (i >= startIdx && i < endIdx) ? '' : 'none';
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

    loadTableData();
    applyPagination();
});
