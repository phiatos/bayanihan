document.addEventListener('DOMContentLoaded', () => {
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
    const savePdfBtn = document.getElementById('savePdfBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn'); 

    if (!tableBody || !searchInput || !sortSelect || !entriesInfo || !pagination || !savePdfBtn || !exportExcelBtn) {
        console.error('One or more DOM elements are missing:', {
            tableBody: !!tableBody,
            searchInput: !!searchInput,
            sortSelect: !!sortSelect,
            entriesInfo: !!entriesInfo,
            pagination: !!pagination,
            savePdfBtn: !!savePdfBtn,
            exportExcelBtn: !!exportExcelBtn
        });
        return;
    }

    let data = [];
    let filteredData = [];
    let currentPage = 1;
    const rowsPerPage = 5;

    // --- PDF Generation ---
    savePdfBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while the PDF is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const doc = new window.jspdf.jsPDF('l', 'mm', 'a4'); 

        const headers = [
            'No.', 'Relief ID', 'Volunteer Group Name', 'City', 'Drop-off Address',
            'Contact Person', 'Contact Number', 'Request Category', 'Status', 'Notes'
        ];

        const body = filteredData.map((item, index) => {
            return [
                index + 1, 
                item.id,
                item.group,
                item.city,
                item.address,
                item.contact,
                item.number,
                item.category,
                item.status || 'Pending', 
                item.notes || 'N/A' 
            ];
        });

        doc.autoTable({
            head: [headers],
            body: body,
            startY: 20,
            theme: 'striped',
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 10
            },
            styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 20 },
                2: { cellWidth: 35 },
                3: { cellWidth: 25 },
                4: { cellWidth: 45 },
                5: { cellWidth: 30 },
                6: { cellWidth: 25 },
                7: { cellWidth: 25 },
                8: { cellWidth: 20 },
                9: { cellWidth: 30 }
            },
            didDrawPage: function (data) {
                doc.setFontSize(14);
                doc.setTextColor(40);
                doc.text('Relief Request Log', data.settings.margin.left, 15);
            }
        });

        // doc.save('Relief_Request_Log.pdf');
        doc.save(`Relief_Request_Log_${new Date().toISOString().slice(0,10)}.pdf`);
        Swal.close(); 

        Swal.fire({
            title: 'Success!',
            text: 'PDF generated successfully!',
            icon: 'success',
            timer: 1500, 
            showConfirmButton: false
        });
    });

    // --- Excel Export Logic ---
    exportExcelBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Generating Excel...',
            text: 'Please wait while the Excel file is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const worksheetData = [];
            
            // Add headers
            const headers = [
                'No.', 'Relief ID', 'Volunteer Group Name', 'City', 'Drop-off Address',
                'Contact Person', 'Contact Number', 'Request Category', 'Status', 'Notes'
            ];
            worksheetData.push(headers);

            // Add data rows
            filteredData.forEach((item, index) => {
                worksheetData.push([
                    index + 1,
                    item.id,
                    item.group,
                    item.city,
                    item.address,
                    item.contact,
                    item.number,
                    item.category,
                    item.status || 'Pending',
                    item.notes || 'N/A'
                ]);
            });

            // Create a worksheet
            const ws = XLSX.utils.aoa_to_sheet(worksheetData);

            // Optional: Set column widths for better display in Excel
            const wscols = [
                {wch: 5},   // No.
                {wch: 15},  // Relief ID
                {wch: 30},  // Volunteer Group Name
                {wch: 20},  // City
                {wch: 40},  // Drop-off Address
                {wch: 25},  // Contact Person
                {wch: 20},  // Contact Number
                {wch: 25},  // Request Category
                {wch: 15},  // Status
                {wch: 35}   // Notes
            ];
            ws['!cols'] = wscols;

            // Create a workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Relief Requests");

            // Write and download the file
            XLSX.writeFile(wb, 'Relief_Request_Log.xlsx');

            Swal.close();
            Swal.fire({
                title: 'Success!',
                text: 'Excel file generated successfully!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error generating Excel:', error);
            Swal.close();
            Swal.fire('Error!', 'Failed to generate Excel: ' + error.message, 'error');
        }
    });


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
                    userUid: request.userUid || "N/A", // Keep userUid in data
                    items: request.items || [],
                    firebaseKey: key,
                    status: request.status || "",         // ADD THIS
                    notes: request.notes || ""
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
        const rowIndex = start + index;

        tr.innerHTML = `
            <td data-key="No">${rowIndex + 1}</td>
            <td data-key="ReliefID">${item.id}</td>
            <td data-key="VolunteerGroupName">${item.group}</td>
            <td data-key="City">${item.city}</td>
            <td data-key="DropoffAddress">${item.address}</td>
            <td data-key="ContactPerson">${item.contact}</td>
            <td data-key="ContactNumber">${item.number}</td>
            <td data-key="RequestCategory">${item.category}</td>

            <!-- Status dropdown -->
            <td>
                <select class="statusSelect" data-id="${item.id}">
                    <option disabled selected value="">Select Status</option>
                    <option value="Pending" ${item.status === "Pending" ? "selected" : ""}>Pending</option>
                    <option value="Completed" ${item.status === "Completed" ? "selected" : ""}>Completed</option>
                </select>
            </td>

            <!-- Notes column -->
            <td>
                <textarea class="notesInput" rows="2" data-id="${item.id}">${item.notes || ''}</textarea>
            </td>

            <td>
                <button class="saveBtn" data-key="${item.firebaseKey}">Save </button>
                <button class="viewBtn" data-index="${data.indexOf(item)}">View</button>
                <button class="deleteBtn" data-key="${item.firebaseKey}">Remove</button>
            </td>
        `;

        tableBody.appendChild(tr);
    });

        entriesInfo.textContent = `Showing ${filteredData.length ? start + 1 : 0} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
        renderPagination();
        attachSaveListeners();
    }

    function attachSaveListeners() {
    document.querySelectorAll('.saveBtn').forEach(button => {
        button.addEventListener('click', function () {
            const key = this.dataset.key;
            const row = this.closest('tr');
            const status = row.querySelector('.statusSelect').value;
            const notes = row.querySelector('.notesInput').value;

            // Save to Firebase
            database.ref(`requestRelief/requests/${key}`).update({
                status: status,
                notes: notes
            }).then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Saved!',
                    text: 'Status and notes updated successfully.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }).catch(error => {
                console.error('Error saving to Firebase:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Save failed',
                    text: error.message
                });
            });
        });
    });
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