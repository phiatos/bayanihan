  const calamityOptions = [
    "Typhoon", "Earthquake", "Flood", "Volcanic Eruption", "Landslide", "Tsunami"
  ];

  const data = [
      {organization: "Red Cross", address: "Manila", location: "Luzon", contact: "Anna Cruz", mobile: "09171234567", link: "", needs: "", update: "Inactive", status: "Ongoing"},
      {organization: "Red Cross", address: "Manila", location: "Luzon", contact: "Anna Cruz", mobile: "09171234567", link: "", needs: "", update: "Inactive", status: ""},
      {organization: "ReliefNow", address: "Cebu", location: "Visayas", contact: "Ben Santos", mobile: "09221234567", link: "", needs: "", update: "Active", status: ""},
      {organization: "CareAid", address: "Davao", location: "Mindanao", contact: "Cora Reyes", mobile: "09331234567", link: "", needs: "", update: "Inactive", status: "Ongoing"},
      {organization: "Food for All", address: "Quezon City", location: "Luzon", contact: "Diana Lee", mobile: "09451234567", link: "", needs: "", update: "Active", status: "Ongoing"},
      {organization: "Hope Foundation", address: "Iloilo", location: "Visayas", contact: "Eliot Tan", mobile: "09561234567", link: "", needs: "", update: "Inactive", status: ""},
      {organization: "Aid for the Needy", address: "Zamboanga", location: "Mindanao", contact: "Fiona Lim", mobile: "09671234567", link: "", needs: "", update: "Active", status: ""},
      {organization: "Community Helpers", address: "Baguio", location: "Luzon", contact: "George Kim", mobile: "09781234567", link: "", needs: "", update: "Inactive", status: ""},
      {organization: "Disaster Relief Team", address: "Cagayan de Oro", location: "Mindanao", contact: "Hannah Reyes", mobile: "09891234567", link: "", needs: "", update: "Active", status: "Ongoing"},
  ];

  const provinces = [
    "Abra", "Agusan del Norte", "Agusan del Sur", "Aklan", "Albay", "Antique", "Apayao", "Aurora",
    "Basilan", "Bataan", "Batanes", "Batangas", "Benguet", "Biliran", "Bohol", "Bukidnon", "Bulacan",
    "Cagayan", "Camarines Norte", "Camarines Sur", "Camiguin", "Capiz", "Catanduanes", "Cavite", 
    "Cebu", "Cotabato", "Davao del Norte", "Davao del Sur", "Davao Oriental", "Dinagat Islands", 
    "Eastern Samar", "Guimaras", "Ifugao", "Ilocos Norte", "Ilocos Sur", "Iloilo", "Isabela", "Kalinga",
    "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur", "Leyte", "Maguindanao", "Marinduque", 
    "Masbate", "Mindoro Occidental", "Mindoro Oriental", "Misamis Occidental", "Misamis Oriental", 
    "Mountain Province", "Negros Occidental", "Negros Oriental", "Northern Samar", "Nueva Ecija", 
    "Nueva Vizcaya", "Palawan", "Pampanga", "Pangasinan", "Quezon", "Quirino", "Rizal", "Romblon", 
    "Samar", "Sarangani", "Siquijor", "Sorsogon", "South Cotabato", "Southern Leyte", "Sultan Kudarat", 
    "Sulu", "Surigao del Norte", "Surigao del Sur", "Tarlac", "Tawi-Tawi", "Zambales", "Zamboanga del Norte", 
    "Zamboanga del Sur", "Zamboanga Sibugay"
  ];
  
  
  const cities = {
    "Metro Manila": ["Quezon City", "Makati", "Manila", "Taguig", "Pasig", "Caloocan", "Parañaque", 
                      "Muntinlupa", "Marikina", "Pasay", "Malabon", "Navotas", "Valenzuela", "Las Piñas", 
                      "San Juan", "Manila", "Mandaluyong", "Pateros", "Taguig", "Quezon City"],
    "Cebu": ["Cebu City", "Mandaue", "Lapu-Lapu", "Toledo", "Danao", "Talisay", "Carcar", "Naga", "Bogo"],
    "Davao": ["Davao City", "Tagum", "Panabo", "Digos", "Samal", "Carmen", "Hagonoy", "Magsaysay"],
    "Iloilo": ["Iloilo City", "Passi", "Arevalo", "Leganes", "Pavia", "Oton", "Bingawan", "Dingle", "San Miguel"],
    "Zamboanga": ["Zamboanga City", "Dipolog", "Dapitan", "Pagadian", "Molave", "Lakewood", "Sominot"],
    "Batangas": ["Batangas City", "Tanauan", "Lipa", "Nasugbu", "Lian", "San Juan", "Balayan", "Taal"]
  };
  
  
  const barangays = {
    "Quezon City": ["Barangay Holy Spirit", "Barangay Commonwealth", "Barangay Diliman", "Barangay San Isidro", 
                    "Barangay Loyola Heights", "Barangay Payatas", "Barangay Bagumbayan", "Barangay San Martin de Porres"],
    "Cebu City": ["Barangay Guadalupe", "Barangay Lahug", "Barangay Mabolo", "Barangay Apas", 
                  "Barangay Kalunasan", "Barangay Tinago", "Barangay Tejero", "Barangay Kamputhaw"],
    "Davao City": ["Barangay Buhangin", "Barangay Talomo", "Barangay Calinan", "Barangay Baguio", 
                   "Barangay Lasang", "Barangay Panabo", "Barangay Paquibato", "Barangay Tigatto"],
    "Iloilo City": ["Barangay City Proper", "Barangay Arevalo", "Barangay Mandurriao", "Barangay Jaro", 
                    "Barangay Lapuz", "Barangay Molo", "Barangay Villa Arevalo", "Barangay San Jose"],
    "Zamboanga City": ["Barangay Santa Catalina", "Barangay Pasonanca", "Barangay San Roque", "Barangay Baliwasan", 
                       "Barangay Tumaga", "Barangay Recodo", "Barangay Zambowood", "Barangay Talisayan"],
    "Batangas City": ["Barangay Poblacion", "Barangay Sta. Clara", "Barangay Poblacion II", "Barangay Alangilan", 
                      "Barangay Balagtas", "Barangay Tinga", "Barangay Luntal", "Barangay San Pascual"]
  };
  

  const rowsPerPage = 5;
  let currentPage = 1;
  let isEditing = false;
  let currentAddressCell = null;
  let currentLocationCell = null;
  const tableBody = document.querySelector("#orgTable tbody");
  const entriesInfo = document.querySelector("#entriesInfo");
  const paginationContainer = document.querySelector("#pagination");
  const updateButton = document.querySelector("#updateSelected"); 
  const selectedCount = document.querySelector("#selectedCount"); 
  const addNew = document.getElementById('addNew');
    const addOrgModal = document.getElementById('addOrgModal');
    
    const addOrgForm = document.getElementById('addOrgForm');
    

  function renderTable(filteredData = data) {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);

    pageData.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" data-no="${row.no}"></td>
        <td contenteditable="false">${row.organization}</td>
        <td contenteditable="false">${row.address}</td>      
        <td contenteditable="false">${row.location}</td>
        <td contenteditable="false">${row.contact}</td>
        <td contenteditable="false">${row.mobile}<button class="copy-btn" data-content="${row.mobile}">
            <i class='bx bx-copy-alt'></i>
          </button></td>
        <td contenteditable="false">${row.link}</td>
        <td contenteditable="false">${row.needs}</td>
        <td>
        <button class="activation-btn ${row.update.toLowerCase() ===      'active' ? 'green-btn' : 'red-btn'}">
      ${row.update.toLowerCase() === 'active' ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td contenteditable="false">${row.status}</td>

      `;
      tableBody.appendChild(tr);
    });

    entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;

    renderPagination(filteredData.length);
    updateSelectedCount(); 
    updateTotalCount();
    attachCheckboxListeners();
    attachAddressClickListeners();

  }



  function attachCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', updateSelectedCount);
    });
  }

  function populateProvinces() {
    const provinceInput = document.getElementById('provinceOptions');
    provinces.forEach(province => {
      const option = document.createElement('option');
      option.value = province;
      provinceInput.appendChild(option);
    });
  }
  
  // Populating the City
  function populateCities(province) {
    const cityInput = document.getElementById('cityOptions');
    cityInput.innerHTML = ''; // Clear previous cities
    if (cities[province]) {
      cities[province].forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        cityInput.appendChild(option);
      });
    }
  }
  
  // Populating Barangay 
  function populateBarangays(city) {
    const barangayInput = document.getElementById('barangayOptions');
    barangayInput.innerHTML = ''; 
    if (barangays[city]) {
      barangays[city].forEach(barangay => {
        const option = document.createElement('option');
        option.value = barangay;
        barangayInput.appendChild(option);
      });
    }
  }
  

  tableBody.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row || e.target.classList.contains('row-checkbox')) return;

    const checkbox = row.querySelector('.row-checkbox');
    if (!checkbox.checked || !isEditing) {
      e.preventDefault();
    }
  });

  // Copy phone no.
  tableBody.addEventListener('click', (e) => {
    if (e.target.closest('.copy-btn')) {
      const btn = e.target.closest('.copy-btn');
      const content = btn.getAttribute('data-content');
      navigator.clipboard.writeText(content).then(() => {
        alert(`Copied to clipboard: ${content}`);
      }).catch(err => {
        console.error("Error copying text: ", err);
      });
    }
  });

  // total result
  function updateTotalCount() {
    const totalCount = data.length;
    document.getElementById('totalCount').textContent = `${totalCount} results`;
  }
  

  
  // Modal functions
  function openModal() {
    if (!currentAddressCell) return;
    document.getElementById('addressModal').style.display = 'flex';
    
    const parts = currentAddressCell.textContent.split(',').map(p => p.trim());
    const province = parts[2] || '';
    const city = parts[1] || '';
    const barangay = parts[0] || '';
  
    document.getElementById('provinceInput').value = province;
    document.getElementById('cityInput').value = city;
    document.getElementById('barangayInput').value = barangay;
  
    populateProvinces();
    populateCities(province);
    populateBarangays(city);
  }

  function closeModal() {
    document.getElementById('addressModal').style.display = 'none';
  } 

  function closeAModal() {
    document.getElementById('addOrgModal').style.display = 'none';
  } 
  
  function applyChanges() {
    // Get Address input values
    const addressProvince = document.getElementById('provinceInput').value.trim();
    const addressCity = document.getElementById('cityInput').value.trim();
    const addressBarangay = document.getElementById('barangayInput').value.trim();
    const fullAddress = `${addressBarangay}, ${addressCity}, ${addressProvince}`;
  
    // Get Location input values
    const locationProvince = document.getElementById('provinceLocationInput').value.trim();
    const locationCity = document.getElementById('cityLocationInput').value.trim();
    const locationBarangay = document.getElementById('barangayLocationInput').value.trim();
    const fullLocation = `${locationBarangay}, ${locationCity}, ${locationProvince}`;
  
    // Update table
    const table = document.getElementById('myTable');
    const firstRow = table.querySelector('tbody tr');
  
    if (firstRow) {
      const addressCell = firstRow.querySelector('.addressCell');
      const locationCell = firstRow.querySelector('.locationCell');
  
      if (addressCell) addressCell.textContent = fullAddress;
      if (locationCell) locationCell.textContent = fullLocation;
    }
  
    closeModal(); // Close modal after updating
  }
  
  function clearInputs() {
    // Clear Address inputs
    document.getElementById('provinceInput').value = '';
    document.getElementById('cityInput').value = '';
    document.getElementById('barangayInput').value = '';
  
    // Clear Location inputs
    document.getElementById('provinceLocationInput').value = '';
    document.getElementById('cityLocationInput').value = '';
    document.getElementById('barangayLocationInput').value = '';
  }

  addNew.addEventListener('click', () => {
    addOrgModal.style.display = 'flex';
  });

  addOrgForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(addOrgForm);
    const newEntry = {
      organization: formData.get('organization'),
      address: formData.get('address'),
      location: formData.get('location'),
      contact: formData.get('contact'),
      mobile: formData.get('mobile'),
      link: formData.get('link'),
      needs: formData.get('needs'),
      update: formData.get('update'),
      status: formData.get('status')
    };

    data.push(newEntry);
    addRowToTable(newEntry);

    addOrgModal.style.display = 'none';
    addOrgForm.reset();
  });
  
  
  // filtering/sorting
  updateTotalCount();

  updateButton.addEventListener('click', () => {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
  
    if (selectedCheckboxes.length === 0) {
      alert('Please select at least one row to edit.');
      return;
    }
  
    selectedCheckboxes.forEach(checkbox => {
      const row = checkbox.closest('tr');
      const cells = row.querySelectorAll('td:not(:first-child):not(:last-child)');
      cells.forEach(cell => {
        if (isEditing) {
          cell.contentEditable = false;
          cell.classList.remove('editable');
        } else {
          cell.contentEditable = true;
          cell.classList.add('editable');
        }
      });
    });
  
    isEditing = !isEditing; 
    updateSelectedCount(); 
    alert(isEditing ? 'Selected rows are now editable.' : 'Editing finished!');
  });

  // Update selected row count
  function updateSelectedCount() {
    const selected = document.querySelectorAll('.row-checkbox:checked').length;
    selectedCount.textContent = `${selected} Selected`;
  }

  // Pagination
  function renderPagination(totalRows) {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    const createButton = (label, page = null, disabled = false, active = false) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      if (disabled) btn.disabled = true;
      if (active) btn.classList.add("active-page");
      if (page !== null) {
        btn.addEventListener("click", () => {
          currentPage = page;
          renderTable();
        });
      }
      return btn;
    };

    paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));

    for (let i = 1; i <= totalPages; i++) {
      paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
    }

    paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
  }

  function filterAndSort() {
    let filtered = data.filter(row => {
      const q = searchInput.value.toLowerCase();
      return Object.values(row).some(v => v.toString().toLowerCase().includes(q));
    });

    if (sortSelect.value) {
      filtered.sort((a, b) =>
        a[sortSelect.value].toString().localeCompare(b[sortSelect.value].toString())
      );
    }

    return filtered;
  }

  // Event Listeners

  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTable(filterAndSort());
  });

  sortSelect.addEventListener("change", () => {
    currentPage = 1;
    renderTable(filterAndSort());
  });

  document.addEventListener("click", e => {
    const btn = e.target;

    if (btn.classList.contains("edit-btn")) {
      const row = btn.closest("tr");
      const editing = btn.textContent === "Save";

      row.querySelectorAll("td[contenteditable]").forEach(cell => {
        cell.contentEditable = editing ? "false" : "true";
        cell.classList.toggle("editing", !editing);
      });

      const select = row.querySelector("select");
      const input = row.querySelector("input");
      select.disabled = editing;
      input.disabled = editing;

      btn.textContent = editing ? "Edit" : "Save";
    }

    if (btn.classList.contains("activation-btn")) {
      const rowEl = btn.closest("tr");
      const idx = parseInt(rowEl.cells[0].textContent, 10) - 1;
      const record = data[idx];

      record.status = record.status === "Active" ? "Inactive" : "Active";
      renderTable(filterAndSort());
    }
  });

  function attachAddressClickListeners() {
    const rows = tableBody.querySelectorAll("tr");
  
    rows.forEach(row => {
      const checkbox = row.querySelector(".row-checkbox");
      const addressCell = row.children[2]; // Address is the 3rd column (index 2)
  
      addressCell.addEventListener("click", function () {
        if (checkbox.checked) {
          currentAddressCell = addressCell; // save which cell we're editing
          openModal();
        }
      });
    });
  }

  document.getElementById('provinceInput').addEventListener('input', (e) => {
    const province = e.target.value;
    populateCities(province);  // Update cities dropdown
  });
  
  document.getElementById('cityInput').addEventListener('input', (e) => {
    const city = e.target.value;
    populateBarangays(city);  // Update barangays dropdown
  });
  

  document.getElementById('addOperationArea').addEventListener('click', function() {
    const container = document.getElementById('areaOperationContainer');
    const newInput = document.createElement('input');
  
    newInput.type = 'text';
    newInput.name = 'Area Operation'; 
    newInput.placeholder = 'Enter Area';
    newInput.style.marginTop = '10px';
    newInput.style.width = '100%';
    newInput.style.maxWidth = '520px';
    newInput.style.padding = '10px 14px';
    newInput.style.border = '#605D67 1px solid';
    newInput.style.borderRadius = '12px';
    newInput.style.display = 'flex';
    newInput.style.marginLeft = 'auto';
    newInput.style.marginRight = 'auto';
  
    container.appendChild(newInput);
  });

  document.getElementById('addOrgForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Always prevent default first
  
    const form = this;
  
    // Manual form validation
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
  
    const formElements = form.elements;
    let detailsHTML = '<ul style="list-style: none; padding: 0; >';
  
    for (let element of formElements) {
      if ((element.tagName === 'INPUT' || element.tagName === 'SELECT') && element.type !== 'submit' && element.type !== 'button') {
        const label = element.previousElementSibling ? element.previousElementSibling.innerText : element.name;
        const value = element.value.trim() !== '' ? element.value.trim() : 'N/A';
    
        detailsHTML += `<li><strong style="color: #4059A5;">${label}:</strong> ${value}</li>`;

      }
    }
  
    detailsHTML += '</ul>';
  
    document.getElementById('confirmDetails').innerHTML = detailsHTML;
  
    document.getElementById('addOrgModal').style.display = 'none';
    document.getElementById('confirmModal').style.display = 'block';
  });
  
  document.getElementById('editDetailsBtn').addEventListener('click', function() {
    document.getElementById('confirmModal').style.display = 'none'; 
    document.getElementById('addOrgModal').style.display = 'block'; 
   
  });
  
  document.getElementById('confirmSaveBtn').addEventListener('click', function() {
    document.getElementById('confirmModal').style.display = 'none'; 
    document.getElementById('successModal').style.display = 'flex'; 
  });

  document.getElementById('closeSuccessBtn').addEventListener('click', function() {
    document.getElementById('successModal').style.display = 'none'; 
    document.getElementById('addOrgForm').reset(); 
    
  });
  
  
  // Initial render
  renderTable();
