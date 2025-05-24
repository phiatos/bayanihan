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
    const tableBody = document.querySelector("#inKindTable tbody");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const exportBtn = document.getElementById("exportBtn");
    const savePdfBtn = document.getElementById("savePdfBtn");
    const entriesInfo = document.getElementById("entriesInfo");
    const paginationContainer = document.getElementById("pagination");
    const clearFormBtn = document.getElementById("clearFormBtn"); 

    const rowsPerPage = 10;
    let currentPage = 1;
    let allDonations = [];
    let filteredAndSortedDonations = [];
    let editingKey = null;

    let formHasChanges = false;

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
            case "assistance-asc":
            case "assistance-desc":
                placeholderText = "Search by Type of Assistance";
                break;
            case "valuation-asc":
            case "valuation-desc":
                placeholderText = "Search by Valuation";
                break;
            case "notes-asc":
            case "notes-desc":
                placeholderText = "Search by Additional Notes";
                break;
            case "status-asc":
            case "status-desc":
                placeholderText = "Search by Status";
                break;
            case "staffIncharge-asc":
            case "staffIncharge-desc":
                placeholderText = "Search by Staff-In Charge";
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


    // Check if user is authenticated
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
    });

    function loadDonations(userUid) {
        database.ref("donations/inkind").on("value", snapshot => {
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
    const isValidNumber = (value) => /^\d+(\.\d+)?$/.test(value);

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
            { input: form.name, label: "Name", lettersOnly: true },
            { input: form.type, label: "Type", lettersOnly: true },
            { input: form.contactPerson, label: "Contact Person", lettersOnly: true },
            { input: form.assistance, label: "Type of Assistance", lettersOnly: true },
            { input: form.number, label: "Number", numberOnly: true },
            { input: form.valuation, label: "Valuation", numberOnly: true },
            { input: form.address, label: "Address" },
            { input: form.email, label: "Email" },
            { input: form.additionalnotes, label: "Additional Notes", required: false },
            { input: form.status, label: "Status" },
            { input: form.staffIncharge, label: "Staff-In Charge", lettersOnly: true },
            { input: document.getElementById("donationDate"), label: "Donation Date" },
        ];

        fieldsToCheck.forEach(({ input, label, lettersOnly, numberOnly, required = true }) => {
            clearError(input);
            if (required && isEmpty(input.value)) {
                showError(input, `${label} is required`);
                isValid = false;
            } else if (!isEmpty(input.value) && lettersOnly && !isLettersOnly(input.value)) {
                showError(input, `${label} should only contain letters and spaces`);
                isValid = false;
            } else if (!isEmpty(input.value) && numberOnly && !isValidNumber(input.value)) {
                showError(input, `${label} should only contain numbers`);
                isValid = false;
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
                type: form.type.value,
                address: form.address.value,
                contactPerson: form.contactPerson.value,
                number: form.number.value,
                email: form.email.value,
                assistance: form.assistance.value,
                valuation: form.valuation.value,
                additionalnotes: form.additionalnotes.value,
                status: form.status.value,
                staffIncharge: form.staffIncharge.value,
                donationDate: document.getElementById("donationDate").value,
                id: Date.now(),
                userUid: user.uid,
                createdAt: new Date().toISOString(),
            };

            database.ref("donations/inkind").push(newDonation)
            .then(() => {
                form.reset();
                formHasChanges = false;
                Swal.fire("Success", "Donation added!", "success");
            })
            .catch(error => {
                console.error("Error adding donation:", error);
                Swal.fire("Error", "Failed to add donation: " + error.message, "error");
            });
        }
    });

    clearFormBtn.addEventListener("click", () => {
        if (formHasChanges) {
            Swal.fire({
                title: 'Discard Changes?',
                text: "You have unsaved changes. Are you sure you want to clear the form?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, clear it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    form.reset();
                    formHasChanges = false;
                    const errorMessages = form.querySelectorAll('.error-message');
                    errorMessages.forEach(msg => msg.textContent = '');
                    const errorInputs = form.querySelectorAll('.error');
                    errorInputs.forEach(input => input.classList.remove('error'));
                }
            });
        } else {
            form.reset();
            const errorMessages = form.querySelectorAll('.error-message');
            errorMessages.forEach(msg => msg.textContent = '');
            const errorInputs = form.querySelectorAll('.error');
            errorInputs.forEach(input => input.classList.remove('error'));
        }
    });

    function renderTable() {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const currentPageRows = filteredAndSortedDonations.slice(startIndex, endIndex);

        tableBody.innerHTML = "";
        if (currentPageRows.length === 0) {
            const noResultsRow = document.createElement("tr");
            noResultsRow.innerHTML = `<td colspan="16" style="text-align: center; padding: 20px;">No donations found matching your criteria.</td>`;
            tableBody.appendChild(noResultsRow);
        } else {
            currentPageRows.forEach((d, i) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${startIndex + i + 1}</td>
                    <td>${d.encoder}</td>
                    <td>${d.name}</td>
                    <td>${d.type}</td>
                    <td>${d.address}</td>
                    <td>${d.contactPerson}</td>
                    <td>${d.number}</td>
                    <td>${d.email}</td>
                    <td>${d.assistance}</td>
                    <td>₱${parseFloat(d.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${d.additionalnotes}</td>
                    <td>${d.staffIncharge}</td>
                    <td>${d.status}</td>
                    <td>${d.donationDate || 'N/A'}</td>
                    <td>
                        <button class="editBtn">Edit</button>
                        <button class="deleteBtn">Delete</button>
                        <button class="savePDFBtn">Save PDF</button> </td>
                    </td>
                    <td>
                        <button class="endorseBtn">Endorse</button>
                    </td>
                `;
                tr.querySelector(".editBtn").addEventListener("click", () => openEditModal(d.firebaseKey));
                tr.querySelector(".deleteBtn").addEventListener("click", () => deleteRow(d.firebaseKey));
                tr.querySelector(".endorseBtn").addEventListener("click", () => openEndorseModal(d.firebaseKey));
                tr.querySelector(".savePDFBtn").addEventListener("click", () => saveSingleDonationPdf(d));

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

        if (totalPages === 0 || filteredAndSortedDonations.length === 0) {
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
        const currentSort = sortSelect.value;
        filteredAndSortedDonations = allDonations.filter(d => {
            if (currentSort.includes('encoder')) return d.encoder.toLowerCase().includes(searchTerm);
            if (currentSort.includes('name')) return d.name.toLowerCase().includes(searchTerm);
            if (currentSort.includes('type')) return d.type.toLowerCase().includes(searchTerm);
            if (currentSort.includes('address')) return d.address.toLowerCase().includes(searchTerm);
            if (currentSort.includes('contactPerson')) return d.contactPerson.toLowerCase().includes(searchTerm);
            if (currentSort.includes('number')) return String(d.number).includes(searchTerm); // Number as string
            if (currentSort.includes('email')) return d.email.toLowerCase().includes(searchTerm);
            if (currentSort.includes('assistance')) return d.assistance.toLowerCase().includes(searchTerm);
            if (currentSort.includes('valuation')) return String(d.valuation).includes(searchTerm); // Valuation as string
            if (currentSort.includes('notes')) return d.additionalnotes.toLowerCase().includes(searchTerm);
            if (currentSort.includes('status')) return d.status.toLowerCase().includes(searchTerm);
            if (currentSort.includes('staffIncharge')) return d.staffIncharge.toLowerCase().includes(searchTerm);
            if (currentSort.includes('donationDate')) return d.donationDate.toLowerCase().includes(searchTerm);
            
            // Default broad search if no specific sort or 'Sort by' is selected
            return d.name.toLowerCase().includes(searchTerm) ||
                   d.encoder.toLowerCase().includes(searchTerm) ||
                   d.staffIncharge.toLowerCase().includes(searchTerm);
        });
        currentPage = 1;
        renderTable();
    });

    sortSelect.addEventListener("change", () => {
        const sortVal = sortSelect.value;
        applySorting(filteredAndSortedDonations, sortVal);
        updateSearchPlaceholder(); // New: Update placeholder when sort changes
        renderTable();
    });

    function applySorting(arr, sortVal) {
        if (sortVal === "encoder-asc") arr.sort((a, b) => a.encoder.localeCompare(b.encoder));
        else if (sortVal === "encoder-desc") arr.sort((a, b) => b.encoder.localeCompare(a.encoder));
        else if (sortVal === "name-asc") arr.sort((a, b) => a.name.localeCompare(b.name));
        else if (sortVal === "name-desc") arr.sort((a, b) => b.name.localeCompare(a.name));
        else if (sortVal === "type-asc") arr.sort((a, b) => a.type.localeCompare(b.type));
        else if (sortVal === "type-desc") arr.sort((a, b) => b.type.localeCompare(a.type));
        else if (sortVal === "address-asc") arr.sort((a, b) => a.address.localeCompare(b.address));
        else if (sortVal === "address-desc") arr.sort((a, b) => b.address.localeCompare(a.address));
        else if (sortVal === "contactPerson-asc") arr.sort((a, b) => a.contactPerson.localeCompare(b.contactPerson));
        else if (sortVal === "contactPerson-desc") arr.sort((a, b) => b.contactPerson.localeCompare(a.contactPerson));
        else if (sortVal === "number-asc") arr.sort((a, b) => parseInt(a.number) - parseInt(b.number));
        else if (sortVal === "number-desc") arr.sort((a, b) => parseInt(b.number) - parseInt(a.number));
        else if (sortVal === "email-asc") arr.sort((a, b) => a.email.localeCompare(b.email));
        else if (sortVal === "email-desc") arr.sort((a, b) => b.email.localeCompare(a.email));
        else if (sortVal === "assistance-asc") arr.sort((a, b) => a.assistance.localeCompare(b.assistance));
        else if (sortVal === "assistance-desc") arr.sort((a, b) => b.assistance.localeCompare(a.assistance));
        else if (sortVal === "valuation-asc") arr.sort((a, b) => parseFloat(a.valuation) - parseFloat(b.valuation));
        else if (sortVal === "valuation-desc") arr.sort((a, b) => parseFloat(b.valuation) - parseFloat(a.valuation));
        else if (sortVal === "notes-asc") arr.sort((a, b) => a.additionalnotes.localeCompare(b.additionalnotes));
        else if (sortVal === "notes-desc") arr.sort((a, b) => b.additionalnotes.localeCompare(a.additionalnotes));
        else if (sortVal === "status-asc") arr.sort((a, b) => a.status.localeCompare(b.status));
        else if (sortVal === "status-desc") arr.sort((a, b) => b.status.localeCompare(a.status));
        else if (sortVal === "staffIncharge-asc") arr.sort((a, b) => a.staffIncharge.localeCompare(b.staffIncharge));
        else if (sortVal === "staffIncharge-desc") arr.sort((a, b) => b.staffIncharge.localeCompare(a.staffIncharge));
        else if (sortVal === "donationDate-asc") arr.sort((a, b) => new Date(a.donationDate) - new Date(b.donationDate));
        else if (sortVal === "donationDate-desc") arr.sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
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
            "Name": d.name,
            "Type": d.type,
            "Address": d.address,
            "Contact Person": d.contactPerson,
            "Number": String(d.number),
            "Email": d.email,
            "Type of Assistance": d.assistance,
            "Valuation": parseFloat(d.valuation),
            "Additional Notes": d.additionalnotes,
            "Staff-In Charge": d.staffIncharge,
            "Status": d.status,
            "Donation Date": d.donationDate
        }));

        const ws = XLSX.utils.json_to_sheet(dataForExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "In-Kind Donations");
        XLSX.writeFile(wb, "in-kind-donations.xlsx");

        Swal.fire("Success", "In-Kind Donations exported to Excel!", "success");
    });

    // --- PDF Export Functionality (All Data) ---
    savePdfBtn.addEventListener("click", () => {
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
            doc.text("In-Kind Donations Report", 14, yOffset);
            yOffset += 10;
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, yOffset);
            yOffset += 15;

            const head = [[
                "No.", "Encoder", "Name", "Type", "Address", "Contact Person",
                "Number", "Email", "Type of Assistance", "Valuation",
                "Additional Notes", "Staff-In Charge", "Status", "Donation Date"
            ]];

            const body = allDonations.map((d, i) => [
                i + 1,
                d.encoder || 'N/A',
                d.name || 'N/A',
                d.type || 'N/A',
                d.address || 'N/A',
                String(d.contactPerson) || 'N/A',
                String(d.number) || 'N/A',
                d.email || 'N/A',
                d.assistance || 'N/A',
                `PHP ${parseFloat(d.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                d.additionalnotes || 'N/A',
                d.staffIncharge || 'N/A',
                d.status || 'N/A',
                d.donationDate || 'N/A'
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

            const filename = `all-in-kind-donations_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(filename);
            Swal.close();
            Swal.fire("Success", `All In-Kind Donations exported to "${filename}"`, "success");
        };

        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    });

    // --- Save Single Donation to PDF ---
    function saveSingleDonationPdf(donation) {
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
            doc.text("In-Kind Donation Details", 14, 22);
            doc.setFontSize(10);
            doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 30);
            let y = 45;

            const addDetail = (label, value) => {
                doc.text(`${label}: ${value || 'N/A'}`, 14, y);
                y += 7;
            };

            addDetail("Encoder", donation.encoder);
            addDetail("Name", donation.name);
            addDetail("Type", donation.type);
            addDetail("Address", donation.address);
            addDetail("Contact Person", donation.contactPerson);
            addDetail("Number", String(donation.number));
            addDetail("Email", donation.email);
            addDetail("Type of Assistance", donation.assistance);
            addDetail("Valuation", `PHP ${parseFloat(donation.valuation || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            addDetail("Staff-In Charge", donation.staffIncharge);
            addDetail("Status", donation.status);
            addDetail("Donation Date", donation.donationDate || 'N/A');
            addDetail("Recorded On", new Date(donation.createdAt).toLocaleString());


            doc.setFontSize(8);
            const footerY = doc.internal.pageSize.height - 10;
            const pageNumberText = `Page 1 of 1`;
            const poweredByText = "Powered by: Appvance";

            doc.text(pageNumberText, margin, footerY);
            doc.text(poweredByText, pageWidth - margin, footerY, { align: 'right' });

            doc.save(`donation_${new Date().toISOString().slice(0, 10)}.pdf`);
            Swal.fire("Success", "Donation details exported to PDF!", "success");
        };

        logo.onerror = function() {
            Swal.fire("Error", "Failed to load logo image. Please check the path.", "error");
        };
    }

    function deleteRow(firebaseKey) {
        Swal.fire({
            title: 'Are you sure?',
            text: "This donation entry will be deleted from the list but saved to deleted donations!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
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

                database.ref(`deleteddonations/deletedinkind/${firebaseKey}`).set(deletedDonation)
                    .then(() => {
                        return database.ref(`donations/inkind/${firebaseKey}`).remove();
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

    function openEndorseModal(firebaseKey) {
        const modal = document.getElementById("endorseModal");
        modal.style.display = "block";
        const abvnList = document.getElementById("abvnList");
        abvnList.innerHTML = `
            <label><input type="radio" name="abvn" value="Group A" /> Group A</label><br/>
            <label><input type="radio" name="abvn" value="Group B" /> Group B</label>
            <p><b>Note:</b> Actual ABVN selection logic based on donation details would go here.</p>
        `;
        modal.dataset.firebaseKey = firebaseKey;
    }

    document.getElementById("confirmEndorseBtn").addEventListener("click", () => {
        const modal = document.getElementById("endorseModal");
        const firebaseKey = modal.dataset.firebaseKey;
        const selected = document.querySelector("input[name='abvn']:checked");
        if (!selected) {
            Swal.fire("Select a group to endorse", "", "warning");
            return;
        }
        const group = selected.value;
        Swal.fire("Endorsed!", `Donation with ID ${firebaseKey} endorsed to ${group}`, "success");
        modal.style.display = "none";
    });

    document.getElementById("cancelEndorseBtn").addEventListener("click", () => {
        document.getElementById("endorseModal").style.display = "none";
    });

    const validateEditForm = () => {
        let isValid = true;
        const fieldsToCheck = [
            { input: document.getElementById("edit-encoder"), label: "Encoder", lettersOnly: true },
            { input: document.getElementById("edit-name"), label: "Name", lettersOnly: true },
            { input: document.getElementById("edit-type"), label: "Type", lettersOnly: true },
            { input: document.getElementById("edit-contactPerson"), label: "Contact Person", lettersOnly: true },
            { input: document.getElementById("edit-assistance"), label: "Type of Assistance", lettersOnly: true },
            { input: document.getElementById("edit-number"), label: "Number", numberOnly: true },
            { input: document.getElementById("edit-valuation"), label: "Valuation", numberOnly: true },
            { input: document.getElementById("edit-address"), label: "Address" },
            { input: document.getElementById("edit-email"), label: "Email" },
            { input: document.getElementById("edit-additionalnotes"), label: "Additional Notes", required: false },
            { input: document.getElementById("edit-status"), label: "Status" },
            { input: document.getElementById("edit-staffIncharge"), label: "Staff-In Charge", lettersOnly: true },
            { input: document.getElementById("edit-donationDate"), label: "Donation Date" },
        ];

        fieldsToCheck.forEach(({ input, label, lettersOnly, numberOnly, required = true }) => {
            clearError(input);
            if (required && isEmpty(input.value)) {
                showError(input, `${label} is required`);
                isValid = false;
            } else if (!isEmpty(input.value) && lettersOnly && !isLettersOnly(input.value)) {
                showError(input, `${label} should only contain letters and spaces`);
                isValid = false;
            } else if (!isEmpty(input.value) && numberOnly && !isValidNumber(input.value)) {
                showError(input, `${label} should only contain numbers`);
                isValid = false;
            }
        });

        return isValid;
    };

    function openEditModal(firebaseKey) {
        editingKey = firebaseKey;
        const donationToEdit = allDonations.find(d => d.firebaseKey === firebaseKey);
        if (donationToEdit) {
            const editModal = document.getElementById("editModal");
            document.getElementById("edit-encoder").value = donationToEdit.encoder;
            document.getElementById("edit-name").value = donationToEdit.name;
            document.getElementById("edit-type").value = donationToEdit.type;
            document.getElementById("edit-address").value = donationToEdit.address;
            document.getElementById("edit-contactPerson").value = donationToEdit.contactPerson;
            document.getElementById("edit-number").value = donationToEdit.number;
            document.getElementById("edit-email").value = donationToEdit.email;
            document.getElementById("edit-assistance").value = donationToEdit.assistance;
            document.getElementById("edit-valuation").value = donationToEdit.valuation;
            document.getElementById("edit-additionalnotes").value = donationToEdit.additionalnotes;
            document.getElementById("edit-status").value = donationToEdit.status;
            document.getElementById("edit-staffIncharge").value = donationToEdit.staffIncharge;
            document.getElementById("edit-donationDate").value = donationToEdit.donationDate || '';
            editModal.style.display = "block";
        }
    }

    document.getElementById("saveEditBtn").addEventListener("click", () => {
        if (editingKey !== null) {
            if (validateEditForm()) {
                const updatedDonation = {
                    encoder: document.getElementById("edit-encoder").value,
                    name: document.getElementById("edit-name").value,
                    type: document.getElementById("edit-type").value,
                    address: document.getElementById("edit-address").value,
                    contactPerson: document.getElementById("edit-contactPerson").value,
                    number: document.getElementById("edit-number").value,
                    email: document.getElementById("edit-email").value,
                    assistance: document.getElementById("edit-assistance").value,
                    valuation: document.getElementById("edit-valuation").value,
                    additionalnotes: document.getElementById("edit-additionalnotes").value,
                    status: document.getElementById("edit-status").value,
                    staffIncharge: document.getElementById("edit-staffIncharge").value,
                    donationDate: document.getElementById("edit-donationDate").value,
                    id: allDonations.find(d => d.firebaseKey === editingKey).id,
                    userUid: allDonations.find(d => d.firebaseKey === editingKey).userUid,
                    createdAt: allDonations.find(d => d.firebaseKey === editingKey).createdAt,
                    updatedAt: new Date().toISOString(),
                };

                database.ref(`donations/inkind/${editingKey}`).set(updatedDonation)
                .then(() => {
                    closeEditModal();
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