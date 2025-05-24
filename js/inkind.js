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

    const rowsPerPage = 10;
    let currentPage = 1;
    let allDonations = [];
    let filteredAndSortedDonations = [];
    let editingKey = null;

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

    // Function to check if a field is empty
    const isEmpty = (value) => value.trim() === "";

    // Function to check if a value contains only letters (and spaces)
    const isLettersOnly = (value) => /^[a-zA-Z\s]+$/.test(value);

    // Function to check if a value is a valid number
    const isValidNumber = (value) => /^\d+(\.\d+)?$/.test(value);

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
            { input: form.status, label: "Status" },
            { input: form.staffIncharge, label: "Staff-In Charge", lettersOnly: true },
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

    // Handle Form Submission (for adding new donations)
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
                id: Date.now(),
                userUid: user.uid,
                createdAt: new Date().toISOString(),
            };

            // Save to Firebase
            database.ref("donations/inkind").push(newDonation)
                .then(() => {
                    form.reset();
                    Swal.fire("Success", "Donation added!", "success");
                })
                .catch(error => {
                    console.error("Error adding donation:", error);
                    Swal.fire("Error", "Failed to add donation: " + error.message, "error");
                });
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
                <td>₱${parseFloat(d.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>${d.additionalnotes}</td>
                <td>${d.staffIncharge}</td>
                <td>${d.status}</td>
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
            d.staffIncharge.toLowerCase().includes(searchTerm)
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
        else if (sortVal === "staffIncharge-asc") arr.sort((a, b) => a.staffIncharge.localeCompare(b.staffIncharge));
        else if (sortVal === "staffIncharge-desc") arr.sort((a, b) => b.staffIncharge.localeCompare(a.staffIncharge));
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
            "Status": d.status
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

        const head = [[
            "No.", "Encoder", "Name", "Type", "Address", "Contact Person",
            "Number", "Email", "Type of Assistance", "Valuation",
            "Additional Notes", "Staff-In Charge", "Status"
        ]];

        const body = allDonations.map((d, i) => [
            i + 1,
            d.encoder,
            d.name,
            d.type,
            d.address,
            String(d.contactPerson),
            String(d.number),
            d.email,
            d.assistance,
            `₱${parseFloat(d.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
            d.additionalnotes,
            d.staffIncharge,
            d.status
        ]);

        // Add the table to the PDF
        doc.autoTable({
            head: head,
            body: body,
            startY: 20,
            theme: 'striped', 
            headStyles: { fillColor: [50, 100, 150] }, 
            styles: { fontSize: 8 }, 
            didDrawPage: function (data) {
                doc.setFontSize(10);
                doc.text("In-Kind Donations Report", data.settings.margin.left, 10);
                doc.text(`Page ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.width - data.settings.margin.right, 10, { align: 'right' });
            }
        });

        // Save the PDF
        doc.save("all-in-kind-donations.pdf"); 
        Swal.close();
        Swal.fire("Success", "All In-Kind Donations exported to PDF!", "success");
    });

    // --- Save Single Donation to PDF ---
    function saveSingleDonationPdf(donation) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF(); 

        doc.setFontSize(18);
        doc.text("In-Kind Donation Details", 14, 22);

        doc.setFontSize(12);
        let y = 30; 

        const addDetail = (label, value) => {
            doc.text(`${label}: ${value}`, 14, y);
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
        addDetail("Valuation", `₱${parseFloat(donation.valuation).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`); 
        addDetail("Staff-In Charge", donation.staffIncharge);
        addDetail("Status", donation.status);
        addDetail("Recorded On", new Date(donation.createdAt).toLocaleString()); 

        doc.save(`donation_${donation.firebaseKey}.pdf`);
        Swal.fire("Success", "Donation details exported to PDF!", "success");
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

                // Move to deleteddonations/deletedinkind
                database.ref(`deleteddonations/deletedinkind/${firebaseKey}`).set(deletedDonation)
                    .then(() => {
                        // Remove from donations/inkind
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
            { input: document.getElementById("edit-additionalnotes"), label: "Additional Notes", required: false },
            { input: document.getElementById("edit-status"), label: "Status" },
            { input: document.getElementById("edit-staffIncharge"), label: "Staff-In Charge", lettersOnly: true },
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