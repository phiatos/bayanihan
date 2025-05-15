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

  // Handle Form Submission (for adding new donations)
  form.addEventListener("submit", (e) => {
    e.preventDefault();

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
      id: Date.now(),
    };

    allDonations.push(newDonation);
    filteredAndSortedDonations = [...allDonations];
    currentPage = 1;
    form.reset();
    renderTable();
    Swal.fire("Success", "Donation added!", "success");
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
      d.encoder.toLowerCase().includes(searchTerm)
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
    // Add other sorting options as needed
  }

  exportBtn.addEventListener("click", () => {
    if (allDonations.length === 0) {
      Swal.fire("Info", "No data to export!", "info");
      return;
    }
    const headers = ["No.", "Encoder", "Name", "Type", "Address", "Contact Person", "Number", "Email", "Type of Assistance", "Valuation", "Additional Notes", "Status"];
    const rows = allDonations.map((d, i) => [i + 1, d.encoder, d.name, d.type, d.address, d.contactPerson, d.number, d.email, d.assistance, d.valuation, d.additionalnotes, d.status]);
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
      editModal.style.display = "block";
    }
  };

  // Function to handle saving the edited donation
  window.saveEditedDonation = () => {
    if (editingId !== null) {
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
      };

      const index = allDonations.findIndex(donation => donation.id === editingId);
      if (index !== -1) {
        allDonations[index] = updatedDonation;
        filteredAndSortedDonations = [...allDonations]; // Update filtered list as well
        renderTable();
        closeEditModal();
        Swal.fire("Success", "Donation updated!", "success");
      }
      editingId = null;
    }
  };

  // Function to close the edit modal
  window.closeEditModal = () => {
    const editModal = document.getElementById("editModal");
    editModal.style.display = "none";
    editingId = null;
  };

  // Initial rendering
  filteredAndSortedDonations = [...allDonations];
  renderTable();
});