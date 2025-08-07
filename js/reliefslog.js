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

// Variables for inactivity detection --------------------------------------------------------------------
let inactivityTimeout;
const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    console.log("Inactivity timer reset.");
}

// --- Helper function to generate a random Relief ID ---
function generateRandomReliefID() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'RELIEFS-'; // Prefix for Relief Request
    const length = 6; // Length of the random part (e.g., RR + 6 chars = RRABC123)
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Function to check for inactivity and prompt the user
function checkInactivity() {
    Swal.fire({
        title: 'Are you still there?',
        text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Stay Login',
        cancelButtonText: 'Log Out',
        allowOutsideClick: false,
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            resetInactivityTimer(); // User chose to continue, reset the timer
            console.log("User chose to continue session.");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // User chose to log out
            auth.signOut().then(() => {
                console.log("User logged out due to inactivity.");
                window.location.href = "../pages/login.html"; // Redirect to login page
            }).catch((error) => {
                console.error("Error logging out:", error);
                Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
            });
        }
    });
}

// Attach event listeners to detect user activity
['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
});
//-------------------------------------------------------------------------------------
    const tableBody = document.querySelector('#orgTable tbody');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const entriesInfo = document.getElementById('entriesInfo');
    const pagination = document.getElementById('pagination');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const exportExcelBtn = document.getElementById('exportBtn'); 

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

    // --- PDF Export Functionality (All Data) ---
    savePdfBtn.addEventListener('click', () => {
        if (filteredData.length === 0) {
            Swal.fire("Info", "No data to export to PDF!", "info");
            return;
        }

        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while the PDF is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape'); // Changed to landscape to match inkind

        let yOffset = 20;
        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png'; // Assuming the logo path is the same

        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;

            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

            doc.setFontSize(18);
            doc.text("Relief Request Log Report", 14, yOffset); // Updated title
            yOffset += 10;
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, yOffset);
            yOffset += 15;

            const headers = [
                'No.', 'Relief ID', 'Volunteer Group Name', 'City', 'Drop-off Address',
                'Contact Person', 'Contact Number', 'Request Category', 'Items (Name & Qty)', 'Status', 'Notes' 
            ];

            const body = filteredData.map((item, index) => {
                const itemsFormatted = (item.items || []).map(i => `${i.name} (Qty: ${i.quantity})`).join('\n'); 
               
                return [
                    index + 1,
                    item.id || 'N/A',
                    item.volunteerOrganization || 'N/A',
                    item.city || 'N/A',
                    item.address || 'N/A',
                    item.contact || 'N/A',
                    item.number || 'N/A',
                    item.category || 'N/A',
                    itemsFormatted || 'N/A',
                    item.status || 'Pending',
                    item.notes || 'N/A'
                ];
            });

            doc.autoTable({
                head: [headers],
                body: body,
                startY: yOffset, 
                theme: 'grid', 
                headStyles: {
                    fillColor: [20, 174, 187], 
                    textColor: [255, 255, 255],
                    halign: 'center', 
                    fontSize: 8 
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                
                columnStyles: {
                    0: { cellWidth: 10 }, 
                    1: { cellWidth: 20 }, 
                    2: { cellWidth: 30 },   
                    3: { cellWidth: 25 },   
                    4: { cellWidth: 40 },    
                    5: { cellWidth: 25 },    
                    6: { cellWidth: 20 },   
                    7: { cellWidth: 25 },    
                    8: { cellWidth: 35 },    
                    9: { cellWidth: 15 },    
                    10: { cellWidth: 25 }    
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

            const filename = `Relief_Request_Log_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);
            Swal.close();
            Swal.fire("Success", `Relief Request Log exported to "${filename}"`, "success"); // Matched success message
        };

        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    });

    // Fetch data from Firebase
    database.ref('requestRelief/requests').on('value', (snapshot) => {
        console.log('Fetching data from Firebase');
        data = [];
        const requests = snapshot.val();
        if (requests) {
            const existingReliefIDs = new Set();

            Object.keys(requests).forEach((key, index) => {
                const request = requests[key];
                const groupName = request.volunteerOrganization || "[Unknown Org]";
                if (!request.volunteerOrganization) {
                    console.warn(`Relief request ${key} is missing volunteerOrganization field. Using default: [Unknown Org]`);
                }

                let reliefId = request.id; 
                if (!reliefId || existingReliefIDs.has(reliefId)) {
                    do {
                        reliefId = generateRandomReliefID();
                    } while (existingReliefIDs.has(reliefId)); 
                }
                existingReliefIDs.add(reliefId);

                data.push({
                    id: reliefId,
                    volunteerOrganization: groupName,
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

        if (currentRows.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='9'>No approved reports found on this page.</td></tr>";
            entriesInfo.textContent = "Showing 0 to 0 of 0 entries";
            return;
        }

        currentRows.forEach((item, index) => {
            const tr = document.createElement('tr');
            const rowIndex = start + index;

            tr.innerHTML = `
                <td data-key="No">${rowIndex + 1}</td>
                <td data-key="ReliefID">${item.id}</td>
                <td data-key="VolunteerGroupName">${item.volunteerOrganization}</td>
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
                    <textarea class="notesInput" maxlength="50" rows="3" data-id="${item.id}">${item.notes || ''}</textarea>
                </td>

                <td>
                    <button class="saveBtn" data-key="${item.firebaseKey}"><i class='bx bx-save'></i></button>
                    <button class="viewBtn" data-index="${data.findIndex(d => d.firebaseKey === item.firebaseKey)}"><i class='bx bx-show-alt'></i></button>
                    <button class="deleteBtn" data-key="${item.firebaseKey}"><i class="bx bx-x-circle"></i></button>
                    <button class="savePDFBtn" data-index="${data.indexOf(item)}"><i class='bx bxs-file-pdf'></i></button>
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
                showConfirmButton: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    content: 'swal2-text-success-clean'
                }
                });
            }).catch(error => {
                console.error('Error saving to Firebase:', error);
                Swal.fire({
                icon: 'error',
                title: 'Save failed',
                text: error.message,
                timer: 2500,
                showConfirmButton: false,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    content: 'swal2-text-error-clean'
                }
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
            if (isActive) btn.classList.add('active-page');
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
                VolunteerGroupName: item => item.volunteerOrganization,
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

            document.getElementById('modalTitle').textContent = `Relief Request of ${item.volunteerOrganization}`;
            document.getElementById('modalContact').textContent = item.contact;
            document.getElementById('modalNumber').textContent = item.number;
            document.getElementById('modalEmail').textContent = item.email || 'N/A';
            document.getElementById('modalAddress').textContent = item.address;
            document.getElementById('modalCategory').textContent = item.category;
            document.getElementById('modalGroup').textContent = item.volunteerOrganization;

            const itemsTableBody = document.querySelector('#itemsTable tbody');
            itemsTableBody.innerHTML = '';
            (item.items || []).forEach(i => {
                itemsTableBody.insertAdjacentHTML('beforeend', `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.notes}</td></tr>`);
            });

            const modal = document.getElementById('reliefModal');
            modal.classList.remove('hidden');
            modal.style.display = 'flex'; // ← this forces visibility regardless of CSS class

            document.getElementById('closeModal').addEventListener('click', () => {
            const modal = document.getElementById('reliefModal');
            modal.classList.add('hidden');
            modal.style.display = 'none'; // reset display
            });
        }

        if (e.target.classList.contains('savePDFBtn')) {
            const idx = parseInt(e.target.dataset.index);
            const itemToExport = data[idx]; 
            if (itemToExport) {
                saveSingleReliefToPdf(itemToExport);
            } else {
                Swal.fire("Error", "Could not find the relief request data to export.", "error");
            }
        }

        if (e.target.classList.contains('deleteBtn')) {
        const firebaseKey = e.target.dataset.key;
        archiveRequest(firebaseKey, () => {
            // Remove from main data array
            data = data.filter(item => item.firebaseKey !== firebaseKey);
            filteredData = [...data];
            renderTable(); // refresh main table if needed
            renderArchivedTable(); // refresh archive modal content
        });
        }
    });

    function archiveRequest(firebaseKey, onSuccessCallback) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This request will be archived, not deleted.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, archive it!',
        cancelButtonText: 'No, cancel!',
        background: '#fff',
        color: '#212529',
        iconColor: '#f0ad4e',
        customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        content: 'custom-swal-text',
        confirmButton: 'custom-confirm-btn',
        cancelButton: 'custom-cancel-btn'
        },
        buttonsStyling: false
    }).then(result => {
        if (!result.isConfirmed) return;

        // Step 1: Fetch the original request
        database.ref(`requestRelief/requests/${firebaseKey}`).once('value')
        .then(snapshot => {
            const requestData = snapshot.val();

            if (!requestData) {
            throw new Error('Request not found.');
            }

            const userUid = requestData.userUid;

            // Step 2: Archive the request
            const archiveRef = database.ref(`requestRelief/archived/${firebaseKey}`);
            const userRef = database.ref(`users/${userUid}/requests/${firebaseKey}`);
            const activeRef = database.ref(`requestRelief/requests/${firebaseKey}`);

            return archiveRef.set({
            ...requestData,
            archivedAt: new Date().toISOString()
            }).then(() => {
            return Promise.all([
                activeRef.remove(),
                userRef.remove()
            ]);
            });
        })
        .then(() => {
            Swal.fire({
            icon: 'success',
            title: 'Archived!',
            text: 'The request has been moved to the archive.',
            timer: 2000,
            showConfirmButton: false
            });

            // Optional: run callback to update UI
            if (typeof onSuccessCallback === 'function') {
            onSuccessCallback();
            }
        })
        .catch(error => {
            console.error('Archive failed:', error);
            Swal.fire({
            icon: 'error',
            title: 'Archive Error',
            text: error.message || 'Failed to archive the request. Please try again.'
            });
        });
    });
    }

    let archivedCurrentPage = 1;
const archivedRowsPerPage = 5;

function renderArchivedTable() {
  const archivedTableBody = document.getElementById('archivedTableBody');
  const archivedEntriesInfo = document.getElementById('archivedEntriesInfo');
  const archivedPagination = document.getElementById('archivedPagination');

  archivedTableBody.innerHTML = '<tr><td colspan="10">Loading...</td></tr>';

  database.ref('requestRelief/archived').once('value').then(snapshot => {
    const data = snapshot.val();
    console.log("Archived data from Firebase:", data);
    archivedTableBody.innerHTML = '';

    if (!data) {
      archivedTableBody.innerHTML = '<tr><td colspan="10">No archived requests found.</td></tr>';
      archivedEntriesInfo.textContent = "Showing 0 to 0 of 0 entries";
      archivedPagination.innerHTML = "";
      return;
    }

    // Convert to array & filter valid entries
    const requests = Object.entries(data)
      .map(([key, req]) => req ? ({ firebaseKey: key, ...req }) : null)
      .filter(Boolean); // Remove nulls

    const totalEntries = requests.length;
    const totalPages = Math.ceil(totalEntries / archivedRowsPerPage);

    // Clamp page number
    if (archivedCurrentPage > totalPages) archivedCurrentPage = totalPages || 1;
    if (archivedCurrentPage < 1) archivedCurrentPage = 1;

    const start = (archivedCurrentPage - 1) * archivedRowsPerPage;
    const end = Math.min(start + archivedRowsPerPage, totalEntries);
    const paginatedRequests = requests.slice(start, end);

    if (paginatedRequests.length === 0) {
      archivedTableBody.innerHTML = '<tr><td colspan="10">No data available for this page.</td></tr>';
    } else {
      paginatedRequests.forEach((item, index) => {
        const rowIndex = start + index + 1;
        const archivedAtFormatted = item.archivedAt
          ? new Date(item.archivedAt).toLocaleString()
          : 'Not timestamped';

        archivedTableBody.innerHTML += `
          <tr>
            <td>${rowIndex || 'N/A'}</td>
            <td>${item.volunteerOrganization || 'N/A'}</td>
            <td>${item.city || 'N/A'}</td>
            <td>${item.address || 'N/A'}</td>
            <td>${item.contactPerson || 'N/A'}</td>
            <td>${item.category || 'N/A'}</td>
            <td>${archivedAtFormatted}</td>
            <td>
              <button class="restoreBtn" data-key="${item.firebaseKey}">Restore</button>
            </td>
          </tr>`;
      });
    }

    archivedEntriesInfo.textContent =
      `Showing ${totalEntries === 0 ? 0 : start + 1} to ${end} of ${totalEntries} entries`;

    // Render pagination buttons
    archivedPagination.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = i === archivedCurrentPage ? 'active-page' : '';
      btn.addEventListener('click', () => {
        archivedCurrentPage = i;
        renderArchivedTable();
      });
      archivedPagination.appendChild(btn);
    }

    // Attach restore button handlers
    document.querySelectorAll('.restoreBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        restoreArchivedRequest(key);
      });
    });
  }).catch(err => {
    console.error('Error loading archived requests:', err);
    archivedTableBody.innerHTML = '<tr><td colspan="10">Error loading data.</td></tr>';
  });
}

function restoreArchivedRequest(firebaseKey) {
  Swal.fire({
    title: 'Restore Request?',
    text: 'This will move the request back to the active list.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#28a745',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, Restore it!'
  }).then(result => {
    if (result.isConfirmed) {
      database.ref(`requestRelief/archived/${firebaseKey}`).once('value')
        .then(snapshot => {
          const requestData = snapshot.val();
          if (!requestData) throw new Error('Request not found in archive.');

          const userUid = requestData.userUid;
          if (!userUid) throw new Error('Missing userUid in archived request.');

          return Promise.all([
            database.ref(`requestRelief/requests/${firebaseKey}`).set(requestData),
            database.ref(`users/${userUid}/requests/${firebaseKey}`).set(requestData),
            database.ref(`requestRelief/archived/${firebaseKey}`).remove()
          ]);
        })
        .then(() => {
          Swal.fire('Restored!', 'The request has been moved back to active.', 'success');
          renderArchivedTable();
        })
        .catch(err => {
          console.error(err);
          Swal.fire('Error', err.message || 'Failed to restore request.', 'error');
        });
    }
  });
}

// Modal open/close triggers
document.getElementById('viewArchived').addEventListener('click', function () {
  document.getElementById('archivedModal').style.display = 'flex';
  renderArchivedTable(); // Call the right function here
});

document.getElementById('closeArchivedModalBtn').addEventListener('click', function () {
  document.getElementById('archivedModal').style.display = 'none';
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
                'Contact Person', 'Contact Number', 'Request Category', 'Items (Name & Qty)', 'Status', 'Notes'
            ];
            worksheetData.push(headers);

            // Add data rows
            filteredData.forEach((item, index) => {
                const itemsFormatted = (item.items || []).map(i => `${i.name} (Qty: ${i.quantity})`).join(', '); 

                worksheetData.push([
                    index + 1,
                    item.id,
                    item.volunteerOrganization,
                    item.city,
                    item.address,
                    item.contact,
                    item.number,
                    item.category,
                    itemsFormatted,
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
                {wch: 35},   // Items (Name & Qty) - Adjusted width
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

    // --- Save Single Donation to PDF ---
    function saveSingleReliefToPdf(item) {
        Swal.fire({
            title: 'Generating PDF...',
            text: 'Please wait while the PDF file is being created.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('portrait');

        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png'; // Your logo path

        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;
            let y = margin;

            // Header for single report
            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
            doc.setFontSize(18);
            doc.text("Relief Request Details", margin, y + 8); // Updated title
            y += 18;
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin, y);
            y += 15;

            // Helper to add details with page breaks
            const addDetail = (label, value, isTitle = false) => {
                if (y > pageHeight - margin - 20) { // Check if content will fit on the current page
                    doc.addPage();
                    y = margin; // Reset y for new page
                    // Add header to new page
                    doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);
                    doc.setFontSize(14);
                    doc.text("Relief Request Details (Cont.)", margin, y + 8);
                    y += 18;
                }

                doc.setFontSize(isTitle ? 12 : 10);
                if (isTitle) {
                    doc.setTextColor(20, 174, 187);
                    doc.text(`${label}`, margin, y);
                    doc.setTextColor(0);
                    y += 7; // Space after title
                } else {
                    const text = `• ${label}: ${value || '-'}`;
                    const splitText = doc.splitTextToSize(text, pageWidth - (2 * margin));
                    doc.text(splitText, margin, y);
                    y += (splitText.length * 5); // 5 is line height
                }
            };

            // Relief ID (prominent)
            doc.setFontSize(14);
            doc.setTextColor(20, 174, 187);
            doc.text(`Relief ID: ${item.id || "-"}`, margin, y);
            y += 10;
            doc.setTextColor(0); // Reset color

            // Basic Information
            addDetail("Basic Information", "", true);
            addDetail("Volunteer Group Name", item.volunteerOrganization || "[Unknown Org]");
            addDetail("Request Category", item.category || "-");
            addDetail("Contact Person", item.contact || "-");
            addDetail("Contact Number", item.number || "-");
            addDetail("Email", item.email || "-");
            addDetail("City", item.city || "-");
            addDetail("Drop-off Address", item.address || "-");
            addDetail("Current Status", item.status || "Pending");
            addDetail("Notes", item.notes || "N/A");
            y += 5;

            // Requested Items
            if (item.items && item.items.length > 0) {
                addDetail("Requested Items", "", true);
                const itemsTableData = item.items.map(i => [i.name || '-', i.quantity || '-', i.notes || 'N/A']);
                doc.autoTable({
                    startY: y,
                    head: [['Item Name', 'Quantity', 'Notes']],
                    body: itemsTableData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [20, 174, 187],
                        textColor: [255, 255, 255],
                        halign: 'center',
                        fontSize: 8
                    },
                    styles: {
                        fontSize: 8,
                        cellPadding: 2,
                        overflow: 'linebreak'
                    },
                    margin: { left: margin, right: margin }
                });
                y = doc.autoTable.previous.finalY + 10; // Update y after table
            } else {
                addDetail("Requested Items", "No items specified.");
                y += 5;
            }

            // Footer
            doc.setFontSize(8);
            const footerY = pageHeight - 10;
            const pageNumberText = `Page ${doc.internal.getNumberOfPages()}`;
            const poweredByText = "Powered by: Appvance";

            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

            doc.save(`Relief_Request_${item.id || 'Details'}.pdf`);

            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'PDF Generated!',
                text: `Relief Request "${item.id || 'Details'}" saved as PDF.`,
                timer: 2000,
                showConfirmButton: false,
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
            Swal.close();
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    }
});

