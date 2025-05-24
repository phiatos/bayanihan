document.addEventListener("DOMContentLoaded", () => {
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
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const auth = firebase.auth();

    const form = document.getElementById("form-container-1");
    const tableBody = document.querySelector("#monetaryTable tbody");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const exportExcelBtn = document.getElementById("exportMonetaryExcelBtn");
    const exportPdfBtn = document.getElementById("exportMonetaryPdfBtn");
    const entriesInfo = document.getElementById("entriesInfo");
    const paginationContainer = document.getElementById("pagination");
    const editModal = document.getElementById("editMonetaryModal");

    const rowsPerPage = 10;
    let currentPage = 1;
    let allDonations = [];
    let filteredAndSortedDonations = [];
    let editingKey = null;

    // Generate initial cash invoice number
    const generateCashInvoiceNumber = () => {
        const prefix = "CINV-";
        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        return prefix + randomNumber;
    };
    document.getElementById("invoice").value = generateCashInvoiceNumber();

    // Check if user is authenticated
    auth.onAuthStateChanged(user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access monetary donations.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }
        console.log("User authenticated:", user.uid);
        loadDonations(user.uid);
    });

    function loadDonations(userUid) {
    database.ref("donations/monetary").on("value", snapshot => {
        allDonations = [];
        const donations = snapshot.val();
        if (donations) {
            Object.keys(donations).forEach(key => {
                const donation = donations[key];
                
                const cleanAmountString = String(donation.amountDonated || '0').replace(/[^0-9.]/g, '');
                const parsedAmount = parseFloat(cleanAmountString);

                const finalAmount = isNaN(parsedAmount) ? 0 : parsedAmount;

                allDonations.push({
                    firebaseKey: key,
                    userUid: donation.userUid,
                    ...donation,
                    // Store the now guaranteed-clean number
                    amount: finalAmount 
                });
            });
        }
        filteredAndSortedDonations = [...allDonations];
        renderTable();
    }, error => {
        console.error("Error fetching monetary donations:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load monetary donations: ' + error.message,
        });
    });
}

    // Function to check if a field is empty
    const isEmpty = (value) => value.trim() === "";

    // Function to check if a value contains only letters (and spaces)
    const isLettersOnly = (value) => /^[a-zA-Z\s]+$/.test(value);

    // Function to check if a value is a valid number
    const isValidNumber = (value) => {
        if (value === null || value.trim() === '') return true;
        return !isNaN(parseFloat(value)) && isFinite(value);
    };

    // Function to display an error message
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

    // Validate the add donation form
    const validateForm = () => {
        let isValid = true;
        const fieldsToCheck = [
            { input: form.encoder, label: "Encoder", lettersOnly: true },
            { input: form.name, label: "Name/Company", lettersOnly: true },
            { input: form.address, label: "Location" },
            { input: form.number, label: "Number", numberOnly: true },
            { input: form.amount, label: "Amount Donated", numberOnly: true, positiveNumber: true },
            { input: form.invoice, label: "Cash Invoice #" },
            { input: form.dateReceived, label: "Date Received" },
            { input: form.email, label: "Email", isEmail: true },
            { input: form.bank, label: "Bank" },
            { input: form.proof, label: "Proof of Transaction", required: false },
        ];

        fieldsToCheck.forEach(({ input, label, lettersOnly, numberOnly, positiveNumber, isEmail, required = true }) => {
            clearError(input);
            if (required && isEmpty(input.value)) {
                showError(input, `${label} is required.`);
                isValid = false;
            } else if (!isEmpty(input.value)) {
                if (lettersOnly && !isLettersOnly(input.value)) {
                    showError(input, `${label} should only contain letters and spaces.`);
                    isValid = false;
                }
                if (numberOnly) {
                    if (!isValidNumber(input.value)) {
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

    // Handle Form Submission (for adding new donations)
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        if (!validateForm()) {
            Swal.fire("Validation Error", "Please correct the highlighted errors before submitting.", "error");
            return;
        }

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
                Array.from(form.querySelectorAll('input, select')).forEach(clearError);
                document.getElementById("invoice").value = generateCashInvoiceNumber();
                Swal.fire("Success", "Monetary Donation Added Successfully!", "success");
            })
            .catch(error => {
                console.error("Error adding donation:", error);
                Swal.fire("Error", "Failed to add donation: " + error.message, "error");
            });
    });

    function renderTable() {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageRows = filteredAndSortedDonations.slice(startIndex, endIndex);

        tableBody.innerHTML = "";
        currentPageRows.forEach((d, i) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${startIndex + i + 1}</td>
                <td>${d.encoder}</td>
                <td>${d.name}</td>
                <td>${d.address}</td>
                <td>${d.number}</td>
                <td>${d.amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                <td>${d.invoice}</td>
                <td>${new Date(d.dateReceived).toLocaleDateString('en-PH')}</td>
                <td>${d.email}</td>
                <td>${d.bank}</td>
                <td>${d.proof ? `<a href="${d.proof}" target="_blank">View Proof</a>` : 'N/A'}</td>
                <td>
                    <button class="editBtn">Edit</button>
                    <button class="deleteBtn">Delete</button>
                    <button class="savePDFBtn">Save PDF</button>
                </td>
            `;
            tr.querySelector(".editBtn").addEventListener("click", () => openEditMonetaryModal(d.firebaseKey));
            tr.querySelector(".deleteBtn").addEventListener("click", () => deleteMonetaryDonation(d.firebaseKey));
            tr.querySelector(".savePDFBtn").addEventListener("click", () => saveSingleMonetaryDonationPdf(d));
            
            tableBody.appendChild(tr);
        });

        updatePaginationInfo();
        renderPagination();
    }

    function updatePaginationInfo() {
        const totalEntries = filteredAndSortedDonations.length;
        const startEntry = (currentPage - 1) * rowsPerPage + 1;
        const endEntry = Math.min(currentPage * rowsPerPage, totalEntries);
        entriesInfo.textContent = `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`;
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

    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.toLowerCase();
        filteredAndSortedDonations = allDonations.filter(d =>
            d.encoder.toLowerCase().includes(searchTerm) ||
            d.name.toLowerCase().includes(searchTerm) ||
            d.address.toLowerCase().includes(searchTerm) ||
            d.number.toLowerCase().includes(searchTerm) ||
            String(d.amountDonated).includes(searchTerm) ||
            d.invoice.toLowerCase().includes(searchTerm) ||
            new Date(d.dateReceived).toLocaleDateString('en-PH').includes(searchTerm) ||
            d.email.toLowerCase().includes(searchTerm) ||
            d.bank.toLowerCase().includes(searchTerm)
        );
        currentPage = 1;
        renderTable();
    });

    sortSelect.addEventListener("change", () => {
        const sortVal = sortSelect.value;
        applySorting(filteredAndSortedDonations, sortVal);
        renderTable();
    });

    function applySorting(arr, sortVal) {
        if (sortVal === "encoder-asc") arr.sort((a, b) => a.encoder.localeCompare(b.encoder));
        else if (sortVal === "encoder-desc") arr.sort((a, b) => b.encoder.localeCompare(a.encoder));
        else if (sortVal === "name-asc") arr.sort((a, b) => a.name.localeCompare(b.name));
        else if (sortVal === "name-desc") arr.sort((a, b) => b.name.localeCompare(a.name));
        else if (sortVal === "address-asc") arr.sort((a, b) => a.address.localeCompare(b.address));
        else if (sortVal === "address-desc") arr.sort((a, b) => b.address.localeCompare(a.address));
        else if (sortVal === "number-asc") arr.sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
        else if (sortVal === "number-desc") arr.sort((a, b) => parseFloat(b.number) - parseFloat(a.number));
        else if (sortVal === "amount-asc") arr.sort((a, b) => a.amountDonated - b.amountDonated);
        else if (sortVal === "amount-desc") arr.sort((a, b) => b.amountDonated - a.amountDonated);
        else if (sortVal === "invoice-asc") arr.sort((a, b) => a.invoice.localeCompare(b.invoice));
        else if (sortVal === "invoice-desc") arr.sort((a, b) => b.invoice.localeCompare(a.invoice));
        else if (sortVal === "dateReceived-asc") arr.sort((a, b) => new Date(a.dateReceived) - new Date(b.dateReceived));
        else if (sortVal === "dateReceived-desc") arr.sort((a, b) => new Date(b.dateReceived) - new Date(a.dateReceived));
        else if (sortVal === "email-asc") arr.sort((a, b) => a.email.localeCompare(b.email));
        else if (sortVal === "email-desc") arr.sort((a, b) => b.email.localeCompare(a.email));
        else if (sortVal === "bank-asc") arr.sort((a, b) => a.bank.localeCompare(b.bank));
        else if (sortVal === "bank-desc") arr.sort((a, b) => b.bank.localeCompare(a.bank));
    }

    // --- Excel Export Functionality ---
    exportExcelBtn.addEventListener("click", () => {
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

        // Create a worksheet from the data
        const ws = XLSX.utils.json_to_sheet(dataForExport);

        // Create a new workbook
        const wb = XLSX.utils.book_new();

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, "Monetary Donations"); // Sheet name

        // Write the workbook and trigger download
        XLSX.writeFile(wb, "monetary-donations.xlsx");

        Swal.fire("Success", "Monetary Donations exported to Excel!", "success");
    });

    // --- Excel Export Functionality ---
    exportExcelBtn.addEventListener("click", () => {
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
        XLSX.writeFile(wb, "monetary-donations.xlsx");

        Swal.fire("Success", "Monetary Donations exported to Excel!", "success");
    });

    // --- PDF Export Functionality (All Data)---
    exportPdfBtn.addEventListener("click", () => {
        if (allDonations.length === 0) {
            Swal.fire("Info", "No data to export to PDF!", "info");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');

        let yOffset = 20;
        const logo = new Image();
        logo.src = '/Bayanihan-PWA/assets/images/AB_logo.png';

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
                `PHP ${parseFloat(d.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
        logo.src = '/Bayanihan-PWA/assets/images/AB_logo.png';

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
            addDetail("Amount Donated", `PHP ${parseFloat(donation.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
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
            Swal.fire("Success", "Monetary donation details exported to PDF!", "success");
        };

        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    }

    function deleteMonetaryDonation(firebaseKey) {
        Swal.fire({
            title: 'Are you sure?',
            text: "This monetary donation entry will be deleted from the list but saved to deleted donations!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                // Fetch the donation to be deleted
                const donationToDelete = allDonations.find(d => d.firebaseKey === firebaseKey);
                if (!donationToDelete) {
                    Swal.fire("Error", "Donation not found!", "error");
                    return;
                }

                // Add deletedAt timestamp
                const deletedDonation = {
                    ...donationToDelete,
                    deletedAt: new Date().toISOString()
                };

                // Move to deleteddonations/deletedmonetary
                database.ref(`deleteddonations/deletedmonetary/${firebaseKey}`).set(deletedDonation)
                    .then(() => {
                        // Remove from donations/monetary
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

    // Validate the edit donation form
    const validateEditForm = () => {
        let isValid = true;
        const fieldsToCheck = [
            { input: document.getElementById("edit-encoder"), label: "Encoder", lettersOnly: true },
            { input: document.getElementById("edit-name"), label: "Name/Company", lettersOnly: true },
            { input: document.getElementById("edit-address"), label: "Location" },
            { input: document.getElementById("edit-number"), label: "Number", numberOnly: true },
            { input: document.getElementById("edit-amount"), label: "Amount Donated", numberOnly: true, positiveNumber: true },
            { input: document.getElementById("edit-invoice"), label: "Cash Invoice #" },
            { input: document.getElementById("edit-dateReceived"), label: "Date Received" },
            { input: document.getElementById("edit-email"), label: "Email", isEmail: true },
            { input: document.getElementById("edit-bank"), label: "Bank" },
            { input: document.getElementById("edit-proof"), label: "Proof of Transaction", required: false },
        ];

        fieldsToCheck.forEach(({ input, label, lettersOnly, numberOnly, positiveNumber, isEmail, required = true }) => {
            clearError(input);
            if (required && isEmpty(input.value)) {
                showError(input, `${label} is required.`);
                isValid = false;
            } else if (!isEmpty(input.value)) {
                if (lettersOnly && !isLettersOnly(input.value)) {
                    showError(input, `${label} should only contain letters and spaces.`);
                    isValid = false;
                }
                if (numberOnly) {
                    if (!isValidNumber(input.value)) {
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

    function openEditMonetaryModal(firebaseKey) {
        editingKey = firebaseKey;
        const donationToEdit = allDonations.find(d => d.firebaseKey === firebaseKey);
        if (donationToEdit) {
            document.getElementById("edit-encoder").value = donationToEdit.encoder;
            document.getElementById("edit-name").value = donationToEdit.name;
            document.getElementById("edit-address").value = donationToEdit.address;
            document.getElementById("edit-number").value = donationToEdit.number;
            document.getElementById("edit-amount").value = donationToEdit.amountDonated;
            document.getElementById("edit-invoice").value = donationToEdit.invoice;
            document.getElementById("edit-dateReceived").value = donationToEdit.dateReceived;
            document.getElementById("edit-email").value = donationToEdit.email;
            document.getElementById("edit-bank").value = donationToEdit.bank;
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

                database.ref(`donations/monetary/${editingKey}`).set(updatedDonation)
                    .then(() => {
                        closeEditMonetaryModal();
                        Swal.fire("Success", "Donation updated!", "success");
                        editingKey = null;
                    })
                    .catch(error => {
                        console.error("Error updating donation:", error);
                        Swal.fire("Error", "Failed to update donation: " + error.message, "error");
                    });
            }
        }
    });

    function closeEditMonetaryModal() {
        const editModal = document.getElementById("editMonetaryModal");
        editModal.style.display = "none";
        editingKey = null;
        const errorMessages = editModal.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');
        const errorInputs = editModal.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    }

    document.getElementById("closeEditModalBtn").addEventListener("click", closeEditMonetaryModal);
    document.getElementById("cancelEditBtn").addEventListener("click", closeEditMonetaryModal);
});