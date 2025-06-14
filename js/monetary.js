document.addEventListener("DOMContentLoaded", () => {
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
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const auth = firebase.auth();

    const form = document.getElementById("form-container-1");
    const tableBody = document.querySelector("#monetaryTable tbody");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const exportBtn = document.getElementById("exportBtn");
    const savePdfBtn = document.getElementById("savePdfBtn");
    const entriesInfo = document.getElementById("entriesInfo");
    const paginationContainer = document.getElementById("pagination");
    const clearFormBtn = document.getElementById("clearFormBtn"); 
    const editModal = document.getElementById("editModal"); 

    const rowsPerPage = 10;
    let currentPage = 1;
    let allDonations = [];
    let filteredAndSortedDonations = [];
    let editingKey = null;
    // let currentAuthUserUid = null; 

    let formHasChanges = false;

    // Variables for inactivity detection --------------------------------------------------------------------
    let inactivityTimeout;
    const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

    // Function to reset the inactivity timer
    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
        console.log("Inactivity timer reset.");
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

    // Generate initial cash invoice number
    const generateCashInvoiceNumber = () => {
        const prefix = "CINV-";
        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        return prefix + randomNumber;
    };
    document.getElementById("invoice").value = generateCashInvoiceNumber();

    // Function to update search input placeholder
    const updateSearchPlaceholder = () => {
        const selectedSort = sortSelect.value;
        let placeholderText = "Search";

        switch (selectedSort) {
            case "encoder-asc":
            case "encoder-desc":
                placeholderText = "Search by Encoder";
                break;
            case "name-asc":
            case "name-desc":
                placeholderText = "Search by Name";
                break;
            case "type-asc":
            case "type-desc":
                placeholderText = "Search by Type";
                break;
            case "address-asc":
            case "address-desc":
                placeholderText = "Search by Address";
                break;
            case "contactPerson-asc":
            case "contactPerson-desc":
                placeholderText = "Search by Contact Person";
                break;
            case "number-asc":
            case "number-desc":
                placeholderText = "Search by Number";
                break;
            case "email-asc":
            case "email-desc":
                placeholderText = "Search by Email";
                break;
            case "valuation-asc":
            case "valuation-desc":
                placeholderText = "Search by Valuation";
                break;
            case "status-asc":
            case "status-desc":
                placeholderText = "Search by Status";
                break;
            case "donationDate-asc":
            case "donationDate-desc":
                placeholderText = "Search by Donation Date";
                break;
            default:
                placeholderText = "Search by Name, Encoder, Staff-In Charge"; // Default broad search
        }
        searchInput.placeholder = placeholderText;
    };
    
    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access in-kind donations.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }
        console.log("User authenticated:", user.uid);
        loadDonations(user.uid);
        updateSearchPlaceholder(); 
        resetInactivityTimer();
    });

    function loadDonations(userUid) {
        database.ref("donations/monetary").on("value", snapshot => {
            allDonations = [];
            const donations = snapshot.val();
            if (donations) {
                Object.keys(donations).forEach(key => {
                    const donation = donations[key];
                    allDonations.push({
                        firebaseKey: key,
                        userUid: donation.userUid,
                        ...donation
                    });
                });
            }
            filteredAndSortedDonations = [...allDonations];
            renderTable();
        }, error => {
            console.error("Error fetching in-kind donations:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load in-kind donations: ' + error.message,
            });
        });
    }

    const isEmpty = (value) => value.trim() === "";
    const isLettersOnly = (value) => /^[a-zA-Z\s]+$/.test(value);
    const isValidNumber = (value) => /^\+?\d{7,15}$/.test(value.replace(/\s/g, ''));
    const isValidNumericAmount = (value) => /^\d+(\.\d{1,2})?$/.test(value);

    const showError = (inputField, message) => {
        const errorDiv = inputField.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('error-message')) {
            const newErrorDiv = document.createElement('div');
            newErrorDiv.className = 'error-message';
            inputField.parentNode.insertBefore(newErrorDiv, inputField.nextSibling);
            newErrorDiv.textContent = message;
        } else {
            errorDiv.textContent = message;
        }
        inputField.classList.add('error');
    };

    // Function to clear an error message
    const clearError = (inputField) => {
        const errorDiv = inputField.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('error-message')) {
            errorDiv.textContent = '';
        }
        inputField.classList.remove('error');
    };

    const validateForm = () => {
        let isValid = true;
        const fieldsToCheck = [
            { input: form.encoder, label: "Encoder", lettersOnly: true },
            { input: form.name, label: "Name/Company", lettersOnly: false },
            { input: form.address, label: "Location" },
            { input: form.number, label: "Number", telNumber: true },
            { input: form.amount, label: "Amount Donated", numericAmount: true, positiveNumber: true },
            { input: form.invoice, label: "Cash Invoice #", required: false },
            { input: form.dateReceived, label: "Date Received" },
            { input: form.email, label: "Email", isEmail: true },
            { input: form.bank, label: "Bank" },
            { input: form.proof, label: "Proof of Transaction", required: false },
        ];

        fieldsToCheck.forEach(({ input, label, lettersOnly, telNumber, numericAmount, positiveNumber, isEmail, required = true }) => {
            clearError(input);
            if (required && isEmpty(input.value)) {
                showError(input, `${label} is required.`);
                isValid = false;
            } else if (!isEmpty(input.value)) {
                if (lettersOnly && !isLettersOnly(input.value)) {
                    showError(input, `${label} should only contain letters and spaces.`);
                    isValid = false;
                }
                if (telNumber && !isValidNumber(input.value)) {
                    showError(input, `${label} should be a valid phone number.`);
                    isValid = false;
                }
                if (numericAmount) {
                    if (!isValidNumericAmount(input.value)) {
                        showError(input, `${label} should only contain numbers.`);
                        isValid = false;
                    } else if (positiveNumber && parseFloat(input.value) <= 0) {
                        showError(input, `${label} must be a positive number.`);
                        isValid = false;
                    }
                }
                if (isEmail) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(input.value.trim())) {
                        showError(input, `Please enter a valid ${label.toLowerCase()} address.`);
                        isValid = false;
                    }
                }
            }
        });

        return isValid;
    };

    form.addEventListener("input", () => {
        formHasChanges = true;
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (validateForm()) {
            const user = auth.currentUser;
            if (!user) {
                Swal.fire("Error", "User not authenticated!", "error");
                return;
            }

            const newDonation = {
                encoder: form.encoder.value,
                name: form.name.value,
                address: form.address.value,
                number: form.number.value,
                amountDonated: parseFloat(form.amount.value),
                invoice: form.invoice.value,
                dateReceived: form.dateReceived.value,
                email: form.email.value,
                bank: form.bank.value,
                proof: form.proof.value,
                id: Date.now(),
                userUid: user.uid,
                createdAt: new Date().toISOString(),
            };

            database.ref("donations/monetary").push(newDonation)
            .then(() => {
                form.reset();
                formHasChanges = false;
                Swal.fire({
                icon: 'success',
                title: 'Donation Added!',
                text: 'Your donation has been successfully recorded.',
                timer: 2000,
                showConfirmButton: false,
                background: '#e6f4ea',          
                color: '#1b5e20',               
                iconColor: '#2e7d32',    
                customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    content: 'swal2-text-success-clean'
                }
                });

            })
            .catch(error => {
                console.error("Error adding donation:", error);
                Swal.fire({
                icon: 'error',
                title: 'Failed to Add Donation',
                text: 'An error occurred: ' + error.message,
                background: '#fcebea',         
                color: '#b71c1c',               
                iconColor: '#c62828',           
                confirmButtonColor: '#c62828',  
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    content: 'swal2-text-error-clean'
                }
                });
            });
        }
    });

    clearFormBtn.addEventListener("click", () => {
        const clearFormFields = () => {
            form.encoder.value = '';
            form.name.value = '';
            form.address.value = '';
            form.number.value = '';
            form.amount.value = '';
            form.dateReceived.value = '';
            form.email.value = '';
            form.bank.value = '';
            form.proof.value = '';

            document.getElementById("invoice").value = generateCashInvoiceNumber();

            formHasChanges = false;
            const errorMessages = form.querySelectorAll('.error-message');
            errorMessages.forEach(msg => msg.textContent = '');
            const errorInputs = form.querySelectorAll('.error');
            errorInputs.forEach(input => input.classList.remove('error'));
        };

        if (formHasChanges) {
            Swal.fire({
            title: 'Discard Changes?',
            text: 'You have unsaved changes. Are you sure you want to clear the form?',
            icon: 'warning',                                
            iconColor: '#f57c00',               
            showCancelButton: true,
            confirmButtonColor: '#c62828',      
            cancelButtonColor: '#546e7a',        
            confirmButtonText: 'Yes, clear it!',
            cancelButtonText: 'No, keep editing',
            reverseButtons: true,               
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                content: 'swal2-text-warning-clean',
                confirmButton: 'swal2-button-confirm-clean',
                cancelButton: 'swal2-button-cancel-clean'
            }
            }).then((result) => {
                if (result.isConfirmed) {
                    clearFormFields();
                }
            });
        } else {
            clearFormFields();
        }
    });
    
    function renderTable() {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageRows = filteredAndSortedDonations.slice(startIndex, endIndex);

        tableBody.innerHTML = "";
        if (currentPageRows.length === 0) {
            const noDataRow = document.createElement("tr");
            noDataRow.innerHTML = `<td colspan="12" style="text-align: center;">No donations found.</td>`;
            tableBody.appendChild(noDataRow);
        } else {
            currentPageRows.forEach((d, i) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${startIndex + i + 1}</td>
                    <td>${d.encoder || 'N/A'}</td>
                    <td>${d.name || 'N/A'}</td>
                    <td>${d.address || 'N/A'}</td>
                    <td>${d.number || 'N/A'}</td>
                    <td>${parseFloat(d.amountDonated  || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                    <td>${d.invoice || 'N/A'}</td>
                    <td>${new Date(d.dateReceived).toLocaleDateString('en-PH')}</td>
                    <td>${d.email || 'N/A'}</td>
                    <td>${d.bank || 'N/A'}</td>
                    <td>${d.proof ? `<a href="${d.proof}" target="_blank">View Proof</a>` : 'N/A'}</td>
                    <td>
                        <button class="editBtn">Edit</button>
                        <button class="deleteBtn">Archive</button>
                        <button class="savePDFBtn">Save PDF</button>
                    </td>
                `;
                tr.querySelector(".editBtn").addEventListener("click", () => openEditModal(d.firebaseKey));
                tr.querySelector(".deleteBtn").addEventListener("click", () => deleteRow(d.firebaseKey));
                tr.querySelector(".savePDFBtn").addEventListener("click", () => saveSingleMonetaryDonationPdf(d));
                tableBody.appendChild(tr);
            });
        }

        updatePaginationInfo();
        renderPagination();
    }

    function updatePaginationInfo() {
        const totalEntries = filteredAndSortedDonations.length;
        const startEntry = (currentPage - 1) * rowsPerPage + 1;
        const endEntry = Math.min(currentPage * rowsPerPage, totalEntries);
        entriesInfo.textContent = `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`;
        if (totalEntries === 0) {
            entriesInfo.textContent = `Showing 0 to 0 of 0 entries`;
        }
    }

    const createPaginationButton = (label, page, disabled = false, isActive = false) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (disabled) btn.disabled = true;
        if (isActive) btn.classList.add('active-page');
        btn.addEventListener('click', () => {
            if (!disabled) {
                currentPage = page;
                renderTable();
            }
        });
        return btn;
    };

    function renderPagination() {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredAndSortedDonations.length / rowsPerPage);

        if (totalPages === 0) {
            paginationContainer.innerHTML = '<span>No entries to display</span>';
            return;
        }

        paginationContainer.appendChild(createPaginationButton('Prev', Math.max(1, currentPage - 1), currentPage === 1));

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPaginationButton(i, i, false, i === currentPage));
        }

        paginationContainer.appendChild(createPaginationButton('Next', Math.min(totalPages, currentPage + 1), currentPage === totalPages));
    }

    // Event listener for search input
    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.toLowerCase();
        const currentSort = sortSelect.value;

        filteredAndSortedDonations = allDonations.filter(d => {
            if (currentSort.includes('encoder')) return (d.encoder || '').toLowerCase().includes(searchTerm);
            if (currentSort.includes('name')) return (d.name || '').toLowerCase().includes(searchTerm);
            if (currentSort.includes('address')) return (d.address || '').toLowerCase().includes(searchTerm);
            if (currentSort.includes('number')) return String(d.number || '').includes(searchTerm);
            if (currentSort.includes('amount')) return String(d.amountDonated || '').includes(searchTerm); 
            if (currentSort.includes('invoice')) return (d.invoice || '').toLowerCase().includes(searchTerm);
            if (currentSort.includes('dateReceived')) return (d.dateReceived || '').toLowerCase().includes(searchTerm);
            if (currentSort.includes('email')) return (d.email || '').toLowerCase().includes(searchTerm);
            if (currentSort.includes('bank')) return (d.bank || '').toLowerCase().includes(searchTerm);

            // Default broad search if no specific sort or 'Sort by' is selected
            return (d.name || '').toLowerCase().includes(searchTerm) ||
                (d.encoder || '').toLowerCase().includes(searchTerm) ||
                (d.address || '').toLowerCase().includes(searchTerm) ||
                (String(d.number) || '').includes(searchTerm) ||
                (String(d.amountDonated) || '').includes(searchTerm) ||
                (d.invoice || '').toLowerCase().includes(searchTerm) ||
                (d.dateReceived || '').toLowerCase().includes(searchTerm) ||
                (d.email || '').toLowerCase().includes(searchTerm) ||
                (d.bank || '').toLowerCase().includes(searchTerm);
        });

        currentPage = 1; // Reset to the first page after filtering
        renderTable();
    });

    // Event listener for sort select
    sortSelect.addEventListener("change", () => {
        const sortVal = sortSelect.value;
        applySorting(filteredAndSortedDonations, sortVal);
        updateSearchPlaceholder(); 
        renderTable();
    });

    function applySorting(arr, sortVal) {
        if (sortVal === "encoder-asc") arr.sort((a, b) => (a.encoder || '').localeCompare(b.encoder || ''));
        else if (sortVal === "encoder-desc") arr.sort((a, b) => (b.encoder || '').localeCompare(a.encoder || ''));
        else if (sortVal === "name-asc") arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        else if (sortVal === "name-desc") arr.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        else if (sortVal === "address-asc") arr.sort((a, b) => (a.address || '').localeCompare(b.address || ''));
        else if (sortVal === "address-desc") arr.sort((a, b) => (b.address || '').localeCompare(a.address || ''));
        else if (sortVal === "number-asc") arr.sort((a, b) => parseInt((a.number || '0').replace(/\D/g, '')) - parseInt((b.number || '0').replace(/\D/g, '')));
        else if (sortVal === "number-desc") arr.sort((a, b) => parseInt((b.number || '0').replace(/\D/g, '')) - parseInt((a.number || '0').replace(/\D/g, '')));
        else if (sortVal === "amount-asc") arr.sort((a, b) => (a.amountDonated || 0) - (b.amountDonated || 0));
        else if (sortVal === "amount-desc") arr.sort((a, b) => (b.amountDonated || 0) - (a.amountDonated || 0));
        else if (sortVal === "invoice-asc") arr.sort((a, b) => (a.invoice || '').localeCompare(b.invoice || ''));
        else if (sortVal === "invoice-desc") arr.sort((a, b) => (b.invoice || '').localeCompare(a.invoice || ''));
        else if (sortVal === "dateReceived-asc") arr.sort((a, b) => new Date(a.dateReceived || '0') - new Date(b.dateReceived || '0'));
        else if (sortVal === "dateReceived-desc") arr.sort((a, b) => new Date(b.dateReceived || '0') - new Date(a.dateReceived || '0'));
        else if (sortVal === "email-asc") arr.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        else if (sortVal === "email-desc") arr.sort((a, b) => (b.email || '').localeCompare(a.email || ''));
        else if (sortVal === "bank-asc") arr.sort((a, b) => (a.bank || '').localeCompare(b.bank || ''));
        else if (sortVal === "bank-desc") arr.sort((a, b) => (b.bank || '').localeCompare(a.bank || ''));
    }

    // --- Excel Export Functionality ---
    exportBtn.addEventListener("click", () => {
        if (allDonations.length === 0) {
            Swal.fire("Info", "No data to export!", "info");
            return;
        }

        const dataForExport = allDonations.map((d, i) => ({
            "No.": i + 1,
            "Encoder": d.encoder,
            "Name/Company": d.name,
            "Location": d.address,
            "Number": d.number,
            "Amount Donated": d.amountDonated,
            "Cash Invoice #": d.invoice,
            "Date Received": new Date(d.dateReceived).toLocaleDateString('en-PH'),
            "Email": d.email,
            "Bank": d.bank,
            "Proof of Transaction": d.proof
        }));

        const ws = XLSX.utils.json_to_sheet(dataForExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monetary Donations");
        // Get current date and format it for the filename
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); 
        const day = String(today.getDate()).padStart(2, '0'); 
        const formattedDate = `${year}-${month}-${day}`;
        // Construct the filename with the date
        const filename = `monetary-donations_${formattedDate}.xlsx`;
        XLSX.writeFile(wb, filename);
        Swal.fire("Success", `Monetary Donations exported to ${filename}!`, "success");
    });

    // --- PDF Export Functionality (All Data)---
    savePdfBtn.addEventListener("click", () => {
        if (allDonations.length === 0) {
            Swal.fire("Info", "No data to export to PDF!", "info");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');

        let yOffset = 20;
        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';

        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;

            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

            doc.setFontSize(18);
            doc.text("Monetary Donations Report", 14, yOffset);
            yOffset += 10;
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, yOffset);
            yOffset += 15;

            const head = [[
                "No.", "Encoder", "Name/Company", "Location",
                "Number", "Amount Donated", "Cash Invoice #",
                "Date Received", "Email", "Bank"
            ]];

            const body = allDonations.map((d, i) => [
                i + 1,
                d.encoder || 'N/A',
                d.name || 'N/A',
                d.address || 'N/A',
                String(d.number) || 'N/A',
                `PHP ${parseFloat(d.amountDonated || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
                d.invoice || 'N/A',
                new Date(d.dateReceived).toLocaleDateString('en-PH') || 'N/A',
                d.email || 'N/A',
                d.bank || 'N/A'
            ]);

            doc.autoTable({
                head: head,
                body: body,
                startY: yOffset,
                theme: 'grid',
                headStyles: {
                    fillColor: [20, 174, 187],
                    textColor: [255, 255, 255],
                    halign: 'center'
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2
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

            const filename = `all-monetary-donations_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);
            Swal.close();
            Swal.fire("Success", `All Monetary Donations exported to "${filename}"`, "success");
        };

        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    });

    // --- Save Single Donation to PDF ---
    function saveSingleMonetaryDonationPdf(donation) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const logo = new Image();
        logo.src = '../assets/images/AB_logo.png';

        logo.onload = function() {
            const pageWidth = doc.internal.pageSize.width;
            const logoWidth = 30;
            const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
            const margin = 14;

            doc.addImage(logo, 'PNG', pageWidth - logoWidth - margin, margin, logoWidth, logoHeight);

            doc.setFontSize(18);
            doc.text("Monetary Donation Details", 14, 22);
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 30);
            let y = 45;

            const addDetail = (label, value) => {
                doc.text(`${label}: ${value || 'N/A'}`, 14, y);
                y += 7;
            };

            addDetail("Encoder", donation.encoder);
            addDetail("Name/Company", donation.name);
            addDetail("Location", donation.address);
            addDetail("Number", String(donation.number));
            addDetail("Amount Donated", `PHP ${parseFloat(donation.amountDonated || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`); 
            addDetail("Cash Invoice #", donation.invoice);
            addDetail("Date Received", new Date(donation.dateReceived).toLocaleDateString('en-PH'));
            addDetail("Email", donation.email);
            addDetail("Bank", donation.bank);
            addDetail("Proof of Transaction", donation.proof);
            addDetail("Recorded On", new Date(donation.createdAt).toLocaleString());

            doc.setFontSize(8);
            const footerY = doc.internal.pageSize.height - 10;
            const pageNumberText = `Page 1 of 1`;
            const poweredByText = "Powered by: Appvance";

            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

            doc.save(`monetary_donation_${new Date().toISOString().slice(0, 10)}.pdf`);
            Swal.fire({
            title: 'Export Successful!',
            text: 'Monetary donation details have been exported to PDF.',
            icon: 'success',
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
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    }

    function deleteRow(firebaseKey) {
        Swal.fire({
            title: 'Are you sure?',
            text: "This monetary donation entry will be deleted from the list but saved to deleted donations!",
            icon: 'warning',
            iconColor: '#ffa000',
            showCancelButton: true,
            confirmButtonColor: '#d32f2f',  // stronger red
            cancelButtonColor: '#546e7a',   // blue-gray
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            customClass: {
                popup: 'swal2-popup-delete-clean',
                title: 'swal2-title-delete-clean',
                content: 'swal2-text-delete-clean',
                confirmButton: 'swal2-button-confirm-clean',
                cancelButton: 'swal2-button-cancel-clean'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const donationToDelete = allDonations.find(d => d.firebaseKey === firebaseKey);
                if (!donationToDelete) {
                    Swal.fire("Error", "Donation not found!", "error");
                    return;
                }

                const deletedDonation = {
                    ...donationToDelete,
                    deletedAt: new Date().toISOString()
                };

                database.ref(`deleteddonations/deletedmonetary/${firebaseKey}`).set(deletedDonation)
                    .then(() => {
                        return database.ref(`donations/monetary/${firebaseKey}`).remove();
                    })
                    .then(() => {
                        Swal.fire('Deleted!', 'The donation entry has been moved to deleted donations.', 'success');
                    })
                    .catch(error => {
                        console.error("Error moving donation to deleted donations:", error);
                        Swal.fire("Error", "Failed to delete donation: " + error.message, "error");
                    });
            }
        });
    }

    const validateEditForm = () => {
        let isValid = true;
        const fieldsToCheck = [
            { input: document.getElementById("edit-encoder"), label: "Encoder", lettersOnly: true },
            { input: document.getElementById("edit-name"), label: "Name/Company", lettersOnly: false },
            { input: document.getElementById("edit-address"), label: "Location" },
            { input: document.getElementById("edit-number"), label: "Number", telNumber: true },
            { input: document.getElementById("edit-amount"), label: "Amount Donated", numericAmount: true, positiveNumber: true },
            { input: document.getElementById("edit-invoice"), label: "Cash Invoice #", required: false },
            { input: document.getElementById("edit-dateReceived"), label: "Date Received" },
            { input: document.getElementById("edit-email"), label: "Email", isEmail: true },
            { input: document.getElementById("edit-bank"), label: "Bank" },
            { input: document.getElementById("edit-proof"), label: "Proof of Transaction", required: false },
        ];

        fieldsToCheck.forEach(({ input, label, lettersOnly, telNumber, numericAmount, positiveNumber, isEmail, required = true }) => {
            clearError(input);
            if (required && isEmpty(input.value)) {
                showError(input, `${label} is required.`);
                isValid = false;
            } else if (!isEmpty(input.value)) {
                if (lettersOnly && !isLettersOnly(input.value)) {
                    showError(input, `${label} should only contain letters and spaces.`);
                    isValid = false;
                }
                if (telNumber && !isValidNumber(input.value)) {
                    showError(input, `${label} should be a valid phone number.`);
                    isValid = false;
                }
                if (numericAmount) {
                    if (!isValidNumericAmount(input.value)) {
                        showError(input, `${label} should only contain numbers.`);
                        isValid = false;
                    } else if (positiveNumber && parseFloat(input.value) <= 0) {
                        showError(input, `${label} must be a positive number.`);
                        isValid = false;
                    }
                }
                if (isEmail) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(input.value.trim())) {
                        showError(input, `Please enter a valid ${label.toLowerCase()} address.`);
                        isValid = false;
                    }
                }
            }
        });
        return isValid;
    };

    function openEditModal(firebaseKey) {
        editingKey = firebaseKey;
        const donationToEdit = allDonations.find(d => d.firebaseKey === firebaseKey);
        if (donationToEdit) {
            document.getElementById("edit-encoder").value = donationToEdit.encoder || '';
            document.getElementById("edit-name").value = donationToEdit.name || '';
            document.getElementById("edit-address").value = donationToEdit.address || '';
            document.getElementById("edit-number").value = donationToEdit.number || '';
            document.getElementById("edit-amount").value = donationToEdit.amountDonated; 
            document.getElementById("edit-invoice").value = donationToEdit.invoice || '';
            document.getElementById("edit-dateReceived").value = donationToEdit.dateReceived || '';
            document.getElementById("edit-email").value = donationToEdit.email || '';
            document.getElementById("edit-bank").value = donationToEdit.bank || '';
            document.getElementById("edit-proof").value = donationToEdit.proof || "";
            editModal.style.display = "block";
            Array.from(editModal.querySelectorAll('input, select')).forEach(clearError);
        }
    }

    document.getElementById("saveEditBtn").addEventListener("click", () => {
        if (editingKey !== null) {
            if (validateEditForm()) {
                const updatedDonation = {
                    encoder: document.getElementById("edit-encoder").value,
                    name: document.getElementById("edit-name").value,
                    address: document.getElementById("edit-address").value,
                    number: document.getElementById("edit-number").value,
                    amountDonated: parseFloat(document.getElementById("edit-amount").value),
                    invoice: document.getElementById("edit-invoice").value,
                    dateReceived: document.getElementById("edit-dateReceived").value,
                    email: document.getElementById("edit-email").value,
                    bank: document.getElementById("edit-bank").value,
                    proof: document.getElementById("edit-proof").value,
                    id: allDonations.find(d => d.firebaseKey === editingKey).id,
                    userUid: allDonations.find(d => d.firebaseKey === editingKey).userUid,
                    createdAt: allDonations.find(d => d.firebaseKey === editingKey).createdAt,
                    updatedAt: new Date().toISOString(), 
                };

                database.ref(`donations/monetary/${editingKey}`).update(updatedDonation) // Use .update() instead of .set() to only change specified fields
                .then(() => {
                    closeEditModal();
                    Swal.fire({
                    title: 'Success!',
                    text: 'Donation updated successfully!',
                    icon: 'success',
                    color: '#1b5e20',
                    iconColor: '#43a047',
                    confirmButtonColor: '#388e3c',
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal2-popup-success-clean',
                        title: 'swal2-title-success-clean',
                        content: 'swal2-text-success-clean',
                        confirmButton: 'swal2-button-success-clean'
                    }
                    });

                    editingKey = null;
                })
                .catch(error => {
                    console.error("Error updating donation:", error);
                    Swal.fire("Error", "Failed to update donation: " + error.message, "error");
                });
            }
        }
    });

    function closeEditModal() {
        const editModal = document.getElementById("editModal");
        editModal.style.display = "none";
        editingKey = null;
        const errorMessages = editModal.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');
        const errorInputs = editModal.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }

    document.getElementById("closeEditModalBtn").addEventListener("click", closeEditModal); 
    document.getElementById("cancelEditBtn").addEventListener("click", closeEditModal);
});