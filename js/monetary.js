document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-container-1");
  const tableBody = document.querySelector("#monetaryTable tbody");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const exportBtn = document.getElementById("exportMonetaryBtn");
  const entriesInfo = document.getElementById("entriesInfo");
  const paginationContainer = document.getElementById("pagination");
  const editModal = document.getElementById("editMonetaryModal");

  const rowsPerPage = 10;
  let currentPage = 1;
  let allDonations = [];
  let filteredAndSortedDonations = [];
  let editingId = null;

  // Add this function within your DOMContentLoaded listener, before the form submission handler
  const generateCashInvoiceNumber = () => {
    const prefix = "CINV-";
    const randomNumber = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
    return prefix + randomNumber;
  };
  document.getElementById("invoice").value = generateCashInvoiceNumber();


  // Function to find a donation by its ID
  const findDonation = (id) => allDonations.find(donation => donation.id === id);

  // Function to check if a field is empty
  const isEmpty = (value) => value.trim() === "";

  // Function to check if a value contains only letters (and spaces)
  const isLettersOnly = (value) => /^[a-zA-Z\s]+$/.test(value);

  // Function to check if a value is a valid number (integer or float)
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
  const validateForm = (formElements) => {
    let isValid = true;
    const fieldsToCheck = [
      { input: formElements.encoder, label: "Encoder", lettersOnly: true },
      { input: formElements.name, label: "Name/Company", lettersOnly: true },
      { input: formElements.address, label: "Location" },
      { input: formElements.number, label: "Number", numberOnly: true },
      { input: formElements.amount, label: "Amount Donated", numberOnly: true, positiveNumber: true },
      { input: formElements.invoice, label: "Cash Invoice #" },
      { input: formElements.dateReceived, label: "Date Received" },
      { input: formElements.email, label: "Email", isEmail: true },
      { input: formElements.bank, label: "Bank" },
      // { input: formElements.proof, label: "Proof of Transaction", required: false }
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

    if (!validateForm(form.elements)) {
      Swal.fire("Validation Error", "Please correct the highlighted errors before submitting.", "error");
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
    };

    allDonations.push(newDonation);
    filteredAndSortedDonations = [...allDonations];
    currentPage = 1;
    form.reset();
    Array.from(form.querySelectorAll('input, select')).forEach(clearError);
    document.getElementById("invoice").value = generateCashInvoiceNumber();
    renderTable();
    Swal.fire("Success", "Monetary Donation Added Successfully!", "success");
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
        <td>${d.amountDonated.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
        <td>${d.invoice}</td>
        <td>${new Date(d.dateReceived).toLocaleDateString('en-PH')}</td>
        <td>${d.email}</td>
        <td>${d.bank}</td>
        <td> ${d.proof ? `<a href="${d.proof}" target="_blank">View Proof</a>` : 'N/A'}</td>
        <td>
          <button class="btn-edit" onclick="openEditMonetaryModal(${d.id})">Edit</button>
          <button class="btn-delete" onclick="deleteMonetaryDonation('${d.id}')">Delete</button>
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

  exportBtn.addEventListener("click", () => {
    if (allDonations.length === 0) {
      Swal.fire("Info", "No data to export!", "info");
      return;
    }
    const headers = ["No.", "Encoder", "Name/Company", "Location", "Number", "Amount Donated", "Cash Invoice #", "Date Received", "Email", "Bank", "Proof of Transaction"];
    const rows = allDonations.map((d, i) => [
      i + 1,
      d.encoder,
      d.name,
      d.address,
      d.number,
      d.amountDonated,
      d.invoice,
      new Date(d.dateReceived).toLocaleDateString('en-PH'),
      d.email,
      d.bank,
      d.proof,
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "monetary-donations.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

   window.deleteMonetaryDonation = (donationId) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "This monetary donation entry will be deleted!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        allDonations = allDonations.filter(d => String(d.id) !== donationId);
        filteredAndSortedDonations = filteredAndSortedDonations.filter(d => String(d.id) !== donationId);
        if ((currentPage - 1) * rowsPerPage >= filteredAndSortedDonations.length && currentPage > 1) {
          currentPage--;
        }
        renderTable();
        Swal.fire('Deleted!', 'The donation entry has been deleted.', 'success');
      }
    });
  };

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
    ];

      fieldsToCheck.forEach(({ input, label, lettersOnly, numberOnly, positiveNumber, isEmail, required = true }) => {
        clearError(input); // Clear previous errors first

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

  window.openEditMonetaryModal = (donationId) => {
    editingId = donationId;
    const donationToEdit = findDonation(donationId);
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
      document.getElementById("edit-proof").value = donationToEdit.proof;
      editModal.style.display = "block";
      // Clear any error messages when opening the modal
      Array.from(editModal.querySelectorAll('input, select')).forEach(clearError);
    }
  };

  window.saveEditedMonetaryDonation = () => {
    if (editingId !== null) {
      // Re-create a temporary 'form.elements' like object for validation
      const editFormElements = {
        encoder: document.getElementById("edit-encoder").value,
        name: document.getElementById("edit-name").value,
        address: document.getElementById("edit-address").value,
        number: document.getElementById("edit-number").value,
        amount: document.getElementById("edit-amount").value, 
        invoice: document.getElementById("edit-invoice").value,
        dateReceived: document.getElementById("edit-dateReceived").value,
        email: document.getElementById("edit-email").value,
        bank: document.getElementById("edit-bank").value,
      };

      if (validateEditForm()) {
        const updatedDonation = {
          id: editingId,
          encoder: editFormElements.encoder,
          name: editFormElements.name,
          address: editFormElements.address,
          number: editFormElements.number,
          amountDonated: parseFloat(editFormElements.amount),
          invoice: editFormElements.invoice,
          dateReceived: editFormElements.dateReceived,
          email: editFormElements.email,
          bank: editFormElements.bank,
          proof: document.getElementById("edit-proof").value,
        };

        const index = allDonations.findIndex(donation => donation.id === editingId);
        if (index !== -1) {
          allDonations[index] = updatedDonation;
          filteredAndSortedDonations = [...allDonations];
          renderTable();
          closeEditMonetaryModal();
          Swal.fire("Success", "Donation updated!", "success");
        }
        editingId = null;
      }
    }
  };

  window.closeEditMonetaryModal = () => {
    const editModal = document.getElementById("editMonetaryModal");
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
