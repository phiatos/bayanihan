document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-container-1");
    const tableBody = document.querySelector("#inKindTable tbody");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const exportBtn = document.getElementById("exportBtn");
    const entriesInfo = document.getElementById("entriesInfo");
    const paginationContainer = document.getElementById("pagination");

    const rowsPerPage = 10;
    let currentPage = 1;
    let allDonations = [];
    let filteredAndSortedDonations = [];
    let editingId = null;

    // Function to find a donation by its ID
    const findDonation = (id) => allDonations.find(donation => donation.id === id);

    // Function to check if a field is empty
    const isEmpty = (value) => value.trim() === "";

    // Function to check if a value contains only letters (and spaces)
    const isLettersOnly = (value) => /^[a-zA-Z\s]+$/.test(value);

    // Function to check if a value is a valid number
    const isValidNumber = (value) => /^\d+$/.test(value);

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
            { input: form.name, label: "Name", lettersOnly: true },
            { input: form.type, label: "Type", lettersOnly: true },
            { input: form.contactPerson, label: "Contact Person", lettersOnly: true },
            { input: form.assistance, label: "Type of Assistance", lettersOnly: true },
            { input: form.number, label: "Number", numberOnly: true },
            { input: form.valuation, label: "Valuation", numberOnly: true },
            { input: form.address, label: "Address" },
            { input: form.email, label: "Email" },
            { input: form.additionalnotes, label: "Additional Notes", required: false },
            { input: form.status, label: "Status" }, // Assuming status is a dropdown, so we'll just check if it's selected
            { input: form.staffIncharge, label: "Staff-In Charge", lettersOnly: true }, // Added validation for Staff-In Charge
        ];

        fieldsToCheck.forEach(({ input, label, lettersOnly, numberOnly, required = true }) => { // Added required
            clearError(input);
            if (required && isEmpty(input.value)) { // Check if the field is required
                showError(input, `${label} is required`);
                isValid = false;
            } else if (!isEmpty(input.value) && lettersOnly && !isLettersOnly(input.value)) { //check if not empty before checking for lettersOnly
                showError(input, `${label} should only contain letters and spaces`);
                isValid = false;
            } else if (!isEmpty(input.value) && numberOnly && !isValidNumber(input.value)) { //check if not empty before checking for numbers
                showError(input, `${label} should only contain numbers`);
                isValid = false;
            }
        });

        return isValid;
    };

    // Handle Form Submission (for adding new donations)
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (validateForm()) {
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
                staffIncharge: form.staffIncharge.value, // Get the value of Staff-In Charge
                id: Date.now(),
            };

            allDonations.push(newDonation);
            filteredAndSortedDonations = [...allDonations];
            currentPage = 1;
            form.reset();
            renderTable();
            Swal.fire("Success", "Donation added!", "success");
        }
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
                <td>${d.type}</td>
                <td>${d.address}</td>
                <td>${d.contactPerson}</td>
                <td>${d.number}</td>
                <td>${d.email}</td>
                <td>${d.assistance}</td>
                <td>${d.valuation}</td>
                <td>${d.additionalnotes}</td>
                <td>${d.staffIncharge}</td>
                <td>${d.status}</td>
                <td>
                    <button class="btn-edit" onclick="openEditModal(${d.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteRow('${d.id}')">Delete</button>
                </td>
                <td>
                    <button class="btn-endorse" onclick="openEndorseModal(${d.id})">Endorse</button>
                </td>
            `;
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
            d.name.toLowerCase().includes(searchTerm) ||
            d.encoder.toLowerCase().includes(searchTerm) ||
            d.staffIncharge.toLowerCase().includes(searchTerm) // Added search for Staff-In Charge
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
        else if (sortVal === "staffIncharge-asc") arr.sort((a, b) => a.staffIncharge.localeCompare(b.staffIncharge)); // Added sorting for Staff-In Charge
        else if (sortVal === "staffIncharge-desc") arr.sort((a, b) => b.staffIncharge.localeCompare(a.staffIncharge)); // Added sorting for Staff-In Charge
    }

    exportBtn.addEventListener("click", () => {
        if (allDonations.length === 0) {
            Swal.fire("Info", "No data to export!", "info");
            return;
        }
        const headers = ["No.", "Encoder", "Name", "Type", "Address", "Contact Person", "Number", "Email", "Type of Assistance", "Valuation", "Additional Notes", "Staff-In Charge", "Status"];
        const rows = allDonations.map((d, i) => [i + 1, d.encoder, d.name, d.type, d.address, d.contactPerson, d.number, d.email, d.assistance, d.valuation, d.additionalnotes, d.staffIncharge, d.status]);
        const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "in-kind-donations.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    window.deleteRow = (donationId) => {
        Swal.fire({
            title: 'Are you sure?',
            text: "This donation entry will be deleted!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                allDonations = allDonations.filter(d => String(d.id) !== donationId); // Compare as strings
                filteredAndSortedDonations = filteredAndSortedDonations.filter(d => String(d.id) !== donationId); // Compare as strings
                if ((currentPage - 1) * rowsPerPage >= filteredAndSortedDonations.length && currentPage > 1) {
                    currentPage--;
                }
                renderTable();
                Swal.fire('Deleted!', 'The donation entry has been deleted.', 'success');
            }
        });
    };

    window.openEndorseModal = (donationId) => {
        const modal = document.getElementById("endorseModal");
        modal.style.display = "block";
        const abvnList = document.getElementById("abvnList");
        abvnList.innerHTML = `
            <label><input type="radio" name="abvn" value="Group A" /> Group A</label><br/>
            <label><input type="radio" name="abvn" value="Group B" /> Group B</label>
            <p><b>Note:</b> Actual ABVN selection logic based on donation details would go here.</p>
        `;
        modal.dataset.donationId = donationId;
    };

    window.confirmEndorsement = () => {
        const modal = document.getElementById("endorseModal");
        const donationId = modal.dataset.donationId;
        const selected = document.querySelector("input[name='abvn']:checked");
        if (!selected) {
            Swal.fire("Select a group to endorse", "", "warning");
            return;
        }
        const group = selected.value;
        Swal.fire("Endorsed!", `Donation with ID ${donationId} endorsed to ${group}`, "success");
        modal.style.display = "none";
    };

    // Validate the edit donation form
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
            { input: document.getElementById("edit-additionalnotes"), label: "Additional Notes", required: false }, // Added required: false
            { input: document.getElementById("edit-status"), label: "Status" }, // Assuming status is a dropdown
            { input: document.getElementById("edit-staffIncharge"), label: "Staff-In Charge", lettersOnly: true }, // Added validation for Staff-In Charge in edit form
        ];

        fieldsToCheck.forEach(({ input, label, lettersOnly, numberOnly, required = true }) => { // Added required
            clearError(input);
            if (required && isEmpty(input.value)) { // Check if the field is required
                showError(input, `${label} is required`);
                isValid = false;
            } else if (!isEmpty(input.value) && lettersOnly && !isLettersOnly(input.value)) { //check if not empty before checking for lettersOnly
                showError(input, `${label} should only contain letters and spaces`);
                isValid = false;
            } else if (!isEmpty(input.value) && numberOnly && !isValidNumber(input.value)) { //check if not empty before checking for numbers
                showError(input, `${label} should only contain numbers`);
                isValid = false;
            }
        });

        return isValid;
    };

    // Function to open the edit modal
    window.openEditModal = (donationId) => {
        editingId = donationId;
        const donationToEdit = findDonation(donationId);
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
            document.getElementById("edit-staffIncharge").value = donationToEdit.staffIncharge; // Populate Staff-In Charge in edit modal
            editModal.style.display = "block";
        }
    };

    // Function to handle saving the edited donation
    window.saveEditedDonation = () => {
        if (editingId !== null) {
            if (validateEditForm()) {
                const updatedDonation = {
                    id: editingId,
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
                    staffIncharge: document.getElementById("edit-staffIncharge").value, // Get updated Staff-In Charge value
                };

                const index = allDonations.findIndex(donation => donation.id === editingId);
                if (index !== -1) {
                    allDonations[index] = updatedDonation;
                    filteredAndSortedDonations = [...allDonations];
                    renderTable();
                    closeEditModal();
                    Swal.fire("Success", "Donation updated!", "success");
                }
                editingId = null;
            }
        }
    };

    // Function to close the edit modal
    window.closeEditModal = () => {
        const editModal = document.getElementById("editModal");
        editModal.style.display = "none";
        editingId = null;
        // Clear any error messages when closing the modal
        const errorMessages = editModal.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.textContent = '');
        const errorInputs = editModal.querySelectorAll('.error');
        errorInputs.forEach(input => input.classList.remove('error'));
    };

    // Initial rendering
    filteredAndSortedDonations = [...allDonations];
    renderTable();
});
