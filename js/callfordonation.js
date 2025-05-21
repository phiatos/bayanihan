document.addEventListener('DOMContentLoaded', () => {
  let donations = JSON.parse(localStorage.getItem('donations')) || [];
  let filteredReports = donations;
  let currentPage = 1;
  const entriesPerPage = 10;
  let viewingApproved = false;

  // DOM elements
  const searchInput = document.getElementById('searchInput');
  const provinceSelect = document.getElementById('provinceSelect');
  const citySelect = document.getElementById('citySelect');
  const barangaySelect = document.getElementById('barangaySelect');
  const sortSelect = document.getElementById('sortSelect');
  const tableBody = document.querySelector('#donationTable tbody');
  const entriesInfo = document.getElementById('entriesInfo');
  const pagination = document.getElementById('pagination');
  const nextBtn = document.getElementById('nextBtn');
  const donationForm = document.getElementById('donationForm');

  // Province to city mapping
  const cities = {
    Albay: ["Legazpi", "Daraga", "Tabaco"],
    Sorsogon: ["Sorsogon City", "Gubat", "Castilla"]
  };

  // Populate city and barangay options
  if (provinceSelect && citySelect && barangaySelect) {
    provinceSelect.addEventListener('change', () => {
      const selectedProvince = provinceSelect.value;
      citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
      barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

      if (cities[selectedProvince]) {
        cities[selectedProvince].forEach(city => {
          const opt = document.createElement('option');
          opt.value = city;
          opt.textContent = city;
          citySelect.appendChild(opt);
        });
      }
    });

    citySelect.addEventListener('change', () => {
      barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
      for (let i = 1; i <= 5; i++) {
        const opt = document.createElement('option');
        opt.value = `Barangay ${i}`;
        opt.textContent = `Barangay ${i}`;
        barangaySelect.appendChild(opt);
      }
    });
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  function applyChange() {
    filteredReports = [...donations];
    currentPage = 1;
    renderReports();
  }

// Add event listeners
searchInput?.addEventListener('input', applyFilters);
sortSelect?.addEventListener('change', applyFilters);

function applyFilters() {
  let data = [...donations]; // assuming donations is your original array

  // Search filter
  const searchTerm = searchInput.value.trim().toLowerCase();
  if (searchTerm) {
    data = data.filter(d =>
      (d.donationDrive || '').toLowerCase().includes(searchTerm) ||
      (d.contactPerson || '').toLowerCase().includes(searchTerm) ||
      (d.contactNumber || '').toLowerCase().includes(searchTerm) ||
      (d.accountNumber || '').toLowerCase().includes(searchTerm) ||
      (d.accountName || '').toLowerCase().includes(searchTerm) ||
      (d.dropOff || '').toLowerCase().includes(searchTerm) ||
      (d.facebookLink || '').toLowerCase().includes(searchTerm)
    );
  }

  // Sort logic
  const sortValue = sortSelect.value;
  if (sortValue) {
    const [field, direction] = sortValue.split('-');
    data.sort((a, b) => {
      const valA = (a[field] || '').toString().toLowerCase();
      const valB = (b[field] || '').toString().toLowerCase();
      return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  // Render or update your table here
  filteredReports = data;
  currentPage = 1;
  renderReports(); // Make sure you have a renderReports() function
}

  function renderReports() {
    tableBody.innerHTML = "";

    const totalEntries = filteredReports.length;
    const totalPages = Math.ceil(totalEntries / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
    const pageData = filteredReports.slice(startIndex, endIndex);

    if (pageData.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='9'>No donations found.</td></tr>";
    } else {
      pageData.forEach((r, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${startIndex + i + 1}</td>
          <td>${r.donationDrive || ''}</td>
          <td>${r.contactPerson || ''}</td>
          <td>${r.contactNumber || ''}</td>
          <td>${r.accountNumber || ''}</td>
          <td>${r.accountName || ''}</td>
          <td>${r.dropOff || r.address || ''}</td>
          <td><a href="${r.facebookLink || '#'}" target="_blank" rel="noopener noreferrer">Visit The Page</a></td>
          <td>
            <button class="view-btn" data-index="${startIndex + i}">View Image</button>
            <button class="delete-btn" data-index="${startIndex + i}">Delete</button>
          </td>
        `;
        tableBody.appendChild(row);
      });
    }

    entriesInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalEntries} entries`;
    renderPagination(totalPages);
    attachEventListeners();
  }

  function renderPagination(totalPages) {
    pagination.innerHTML = "";

    const prevBtn = document.createElement('button');
    prevBtn.id = 'prevBtnPage';
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage === 1;
    pagination.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      if (i === currentPage) {
        pageBtn.classList.add('active');
      }
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        renderReports();
      });
      pagination.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.id = 'nextBtnPage';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    pagination.appendChild(nextBtn);

    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderReports();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderReports();
      }
    });
  }

  function attachEventListeners() {
    document.querySelectorAll('.view-btn').forEach(button => {
      button.addEventListener('click', e => {
        const index = parseInt(e.target.dataset.index);
        const data = filteredReports[index];
        Swal.fire({
          html: data?.image ? `<img src="${data.image}" alt="Donation Image" style="max-width: 100%; margin-top: 10px;" />` : 'No image available.',
          icon: 'info',
          confirmButtonText: 'Close'
        });
      });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', e => {
        const index = parseInt(e.target.dataset.index);
        const data = filteredReports[index];

        Swal.fire({
          title: 'Are you sure?',
          text: "This donation will be deleted.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, delete it!'
        }).then(result => {
          if (result.isConfirmed) {
            donations = donations.filter(d => d !== data);
            localStorage.setItem('donations', JSON.stringify(donations));
            applyFilters();
            Swal.fire('Deleted!', 'The donation has been removed.', 'success');
          }
        });
      });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();

      const donationDrive = document.getElementById('donationDrive')?.value.trim();
      const contactPerson = document.getElementById('contactPerson')?.value.trim();
      const contactNumber = document.getElementById('contactNumber')?.value.trim();
      const accountNumber = document.getElementById('accountNumber')?.value.trim();
      const accountName = document.getElementById('accountName')?.value.trim();
      const province = provinceSelect?.value;
      const city = citySelect?.value;
      const barangay = barangaySelect?.value;
      const address = document.getElementById('address')?.value.trim();
      const facebookLink = document.getElementById('facebookLink')?.value.trim();
      const imageFile = document.getElementById('donationImage')?.files[0];

      if (!donationDrive || !contactPerson || !contactNumber || !accountNumber || !accountName || !province || !city || !barangay) {
        alert("Please fill in all required fields.");
        return;
      }

      function saveDonation(base64Image) {
        const newDonation = {
          donationDrive,
          contactPerson,
          contactNumber,
          accountNumber,
          accountName,
          Province: province,
          CityMunicipality: city,
          Barangay: barangay,
          dropOff: `${address}, ${barangay}, ${city}, ${province}`,
          facebookLink,
          image: base64Image || '',
          Status: "Pending"
        };
        donations.push(newDonation);
        localStorage.setItem('donations', JSON.stringify(donations));
        applyChange();

        document.getElementById('donationDrive').value = '';
        document.getElementById('contactPerson').value = '';
        document.getElementById('contactNumber').value = '';
        document.getElementById('accountNumber').value = '';
        document.getElementById('accountName').value = '';
        provinceSelect.value = '';
        citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
        document.getElementById('address').value = '';
        document.getElementById('facebookLink').value = '';
        document.getElementById('donationImage').value = '';

        Swal.fire('Success', 'Donation added successfully!', 'success');
      }

      if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(event) {
          saveDonation(event.target.result);
        };
        reader.readAsDataURL(imageFile);
      } else {
        saveDonation('');
      }
    });
  }

  applyChange();
});
