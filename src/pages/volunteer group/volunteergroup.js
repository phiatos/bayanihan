  const calamityOptions = [
    "Typhoon", "Earthquake", "Flood", "Volcanic Eruption", "Landslide", "Tsunami"
  ];

  const data = [
    { no: 1, organization: "Red Cross", hq: "Geneva, Switzerland", areaOfOperations: "Global", contactPerson: "Anna Meyer", email: "anna.meyer@redcross.org", mobileNumber: "+41 22 123 4567", socialMedia: "@redcross" },
    { no: 2, organization: "Doctors Without Borders", hq: "Geneva, Switzerland", areaOfOperations: "Global", contactPerson: "Carlos Ruiz", email: "cruiz@msf.org", mobileNumber: "+41 22 987 6543", socialMedia: "@msf_intl"},
    { no: 3, organization: "UNICEF", hq: "New York, USA", areaOfOperations: "Global", contactPerson: "Emily Chen", email: "echen@unicef.org", mobileNumber: "+1 212 123 4567", socialMedia: "@unicef"},
    { no: 4, organization: "Habitat for Humanity", hq: "Atlanta, USA", areaOfOperations: "Worldwide", contactPerson: "Michael Santos", email: "msantos@habitat.org", mobileNumber: "+1 404 123 7890", socialMedia: "@habitatforhumanity"},
    { no: 5, organization: "World Food Programme", hq: "Rome, Italy", areaOfOperations: "Global", contactPerson: "Giulia Romano", email: "giulia.romano@wfp.org", mobileNumber: "+39 06 6513 3456", socialMedia: "@wfp" },
    { no: 6, organization: "Greenpeace", hq: "Amsterdam, Netherlands", areaOfOperations: "Global", contactPerson: "Lars van Dijk", email: "lars.vd@greenpeace.org", mobileNumber: "+31 20 718 2000", socialMedia: "@greenpeace"},
    { no: 7, organization: "Amnesty International", hq: "London, UK", areaOfOperations: "Global", contactPerson: "Rebecca Shaw", email: "rshaw@amnesty.org", mobileNumber: "+44 20 7413 5500", socialMedia: "@amnesty"},
    { no: 8, organization: "Oxfam", hq: "Oxford, UK", areaOfOperations: "Global", contactPerson: "Tom Bennett", email: "tbennett@oxfam.org", mobileNumber: "+44 1865 473727", socialMedia: "@oxfam"},
    { no: 9, organization: "World Wildlife Fund", hq: "Gland, Switzerland", areaOfOperations: "Global", contactPerson: "Nina Keller", email: "nkeller@wwf.org", mobileNumber: "+41 22 364 9111", socialMedia: "@wwf" }
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
  const updateButton = document.querySelector("#editButton");
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
        <td contenteditable="false">${row.no}</td>
        <td contenteditable="false">${row.organization}</td>
        <td contenteditable="false" class="hqCell">${row.hq}</td> 
        <td contenteditable="false" class="locationCell">${row.areaOfOperations}</td> 
        <td contenteditable="false">${row.contactPerson} </td>
        <td contenteditable="false">${row.email}</td>
        <td contenteditable="false">${row.mobileNumber}</td>
        <td contenteditable="false">${row.socialMedia}</td>
        <td><button class="editButton">Edit</button></td>
      `;
      tableBody.appendChild(tr);
    });
  
    entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
  
    renderPagination(filteredData.length);
    attachRowHandlers();
  
    document.querySelectorAll('.editButton').forEach((button, index) => {
      button.addEventListener('click', () => toggleEditableCells(index));
    });
  }
  

  // Editable Button for Row
  function toggleEditableCells(rowIndex) {
    const row = document.querySelectorAll('#orgTable tbody tr')[rowIndex];
    const cells = row.querySelectorAll('td');
    const isEditable = cells[0].getAttribute('contenteditable') === 'true';
  
    for (let i = 0; i < cells.length - 1; i++) {
      cells[i].setAttribute('contenteditable', isEditable ? 'false' : 'true');
    }
    if (!isEditable) {
      row.classList.add('editing');  
    } else {
      row.classList.remove('editing');
    }
  
    const editButton = row.querySelector('.editButton');
    editButton.textContent = isEditable ? 'Edit' : 'Save';
  }
  
  function populateProvinces() {
    const provinceList = document.getElementById('hqProvinceOptions');
    const locProvinceList = document.getElementById('locProvinceOptions');
    provinceList.innerHTML = '';
    locProvinceList.innerHTML = '';
  
    provinces.forEach(p => {
      const option1 = document.createElement('option');
      const option2 = document.createElement('option');
      option1.value = p;
      option2.value = p;
      provinceList.appendChild(option1);
      locProvinceList.appendChild(option2);
    });
  }
  
  function populateCities(province, isLocation = false) {
    const cityList = isLocation ? document.getElementById('locCityOptions') : document.getElementById('hqCityOptions');
    cityList.innerHTML = '';
    if (cities[province]) {
      cities[province].forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        cityList.appendChild(option);
      });
    }
  }
  
  function populateBarangays(city, isLocation = false) {
    const brgyList = isLocation ? document.getElementById('locBarangayOptions') : document.getElementById('hqBarangayOptions');
    brgyList.innerHTML = '';
    if (barangays[city]) {
      barangays[city].forEach(b => {
        const option = document.createElement('option');
        option.value = b;
        brgyList.appendChild(option);
      });
    }
  }
  
  function openModal() {
    if (!currentAddressCell) return;
  
    const row = currentAddressCell.closest('tr');
    const hqCell = row.querySelector('.hqCell');
    const locCell = row.querySelector('.locationCell');
  
    if (hqCell) {
      const hqParts = hqCell.textContent.split(',').map(p => p.trim());
      document.getElementById('hqProvinceInput').value = hqParts[2] || '';
      document.getElementById('hqCityInput').value = hqParts[1] || '';
      document.getElementById('hqBarangayInput').value = hqParts[0] || '';
    }
  
    if (locCell) {
      const locParts = locCell.textContent.split(',').map(p => p.trim());
      document.getElementById('locProvinceInput').value = locParts[2] || '';
      document.getElementById('locCityInput').value = locParts[1] || '';
      document.getElementById('locBarangayInput').value = locParts[0] || '';
    }
  
    populateProvinces(); 
    populateCities(document.getElementById('hqProvinceInput').value, false);
    populateCities(document.getElementById('locProvinceInput').value, true);
    populateBarangays(document.getElementById('hqCityInput').value, false);
    populateBarangays(document.getElementById('locCityInput').value, true);
  
    document.getElementById('addressModal').style.display = 'flex';
  }
  
  function closeModal() {
    document.getElementById('addressModal').style.display = 'none';
    currentAddressCell = null;
    clearInputs();
  }
  
  function applyChanges() {
    const hqProvince = document.getElementById('hqProvinceInput').value.trim();
    const hqCity = document.getElementById('hqCityInput').value.trim();
    const hqBarangay = document.getElementById('hqBarangayInput').value.trim();
    const locProvince = document.getElementById('locProvinceInput').value.trim();
    const locCity = document.getElementById('locCityInput').value.trim();
    const locBarangay = document.getElementById('locBarangayInput').value.trim();
  
    const hqFullAddress = `${hqBarangay}, ${hqCity}, ${hqProvince}`;
    const locFullAddress = `${locBarangay}, ${locCity}, ${locProvince}`;
  
    if (currentAddressCell) {
      const row = currentAddressCell.closest('tr');
      const hqCell = row.querySelector('.hqCell');
      const locCell = row.querySelector('.locationCell');
  
      if (hqCell) {
        hqCell.textContent = hqFullAddress;
      }
  
      if (locCell) {
        locCell.textContent = locFullAddress;
      }
    }
  
    closeModal();
  }
  
  function clearInputs() {
    document.getElementById('hqProvinceInput').value = '';
    document.getElementById('hqCityInput').value = '';
    document.getElementById('hqBarangayInput').value = '';
    document.getElementById('locProvinceInput').value = '';
    document.getElementById('locCityInput').value = '';
    document.getElementById('locBarangayInput').value = '';
  }
  

  document.getElementById('hqProvinceInput').addEventListener('input', e => {
    populateCities(e.target.value, false);
  });
  
  document.getElementById('locProvinceInput').addEventListener('input', e => {
    populateCities(e.target.value, true);
  });
  
  document.getElementById('hqCityInput').addEventListener('input', e => {
    populateBarangays(e.target.value, false);
  });
  
  document.getElementById('locCityInput').addEventListener('input', e => {
    populateBarangays(e.target.value, true);
  });
  

  function attachRowHandlers() {
    const rows = document.querySelectorAll("#orgTable tbody tr");
  
    rows.forEach(row => {
      const editBtn = row.querySelector(".editButton");
      
  
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          row.classList.add("editing");
  

          const hqCell = row.querySelector(".hqCell");
          const locCell = row.querySelector(".locationCell");
  
          if (hqCell) {
            hqCell.addEventListener("click", () => {
              if (row.classList.contains("editing")) {
                currentAddressCell = hqCell;
                openModal();
              }
            });
          }
  
          if (locCell) {
            locCell.addEventListener("click", () => {
              if (row.classList.contains("editing")) {
                currentAddressCell = locCell;
                openModal();
              }
            });
          }
        });
      }
    });
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    attachRowHandlers();
  });
  
  addNew.addEventListener('click', () => {
    addOrgModal.style.display = 'flex';
  });


  function filterAndPopulateList(inputId, listId, dataArray) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
  
    input.addEventListener('input', function () {
      const val = this.value.toLowerCase();
      const filtered = dataArray.filter(item => item.toLowerCase().includes(val));
      list.innerHTML = '';
      filtered.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        list.appendChild(opt);
      });
    });
  }
  
  // Combine all options from cities and barangays
  const allCities = Object.values(cities).flat();
  const allBarangays = Object.values(barangays).flat();
  
  // Apply filtering
  filterAndPopulateList('provinceInput', 'provinceList', provinces);
  filterAndPopulateList('cityInput', 'cityList', allCities);
  filterAndPopulateList('barangayInput', 'barangayList', allBarangays);
  

  function populateProvinceList() {
    const list = document.getElementById('provinceList');
    list.innerHTML = '';
    provinces.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      list.appendChild(opt);
    });
  }
  
  function populateCityList() {
    const list = document.getElementById('cityList');
    list.innerHTML = '';
    Object.values(cities).flat().forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      list.appendChild(opt);
    });
  }
  
  function populateBarangayList() {
    const list = document.getElementById('barangayList');
    list.innerHTML = '';
    Object.values(barangays).flat().forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      list.appendChild(opt);
    });
  }
  
  document.getElementById('addOperationArea').addEventListener('click', function () {
    populateProvinceList();
    populateCityList();
    populateBarangayList();
    document.getElementById('areaOperationModal').style.display = 'flex';
  });
  
  document.getElementById('areaOperationForm').addEventListener('submit', function (e) {
    e.preventDefault();
  
    const province = document.getElementById('provinceInput').value.trim();
    const city = document.getElementById('cityInput').value.trim();
    const barangay = document.getElementById('barangayInput').value.trim();
  
    if (!province || !city || !barangay) return;
  
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.name = 'Area Operation';
    newInput.value = `${province}, ${city}, ${barangay}`;
    newInput.readOnly = true;
    newInput.style.marginTop = '10px';
    newInput.style.width = '100%';
    newInput.style.maxWidth = '520px';
    newInput.style.padding = '10px 14px';
    newInput.style.border = '#605D67 1px solid';
    newInput.style.borderRadius = '12px';
    newInput.style.display = 'flex';
    newInput.style.marginLeft = 'auto';
    newInput.style.marginRight = 'auto';
  
    document.getElementById('areaOperationContainer').appendChild(newInput);
  
    // Reset form and close modal
    document.getElementById('areaOperationForm').reset();
    document.getElementById('areaOperationModal').style.display = 'none';
  });
  
  
  document.getElementById('addOrgForm').addEventListener('submit', function (event) {
    event.preventDefault();
  
    const form = this;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
  
    orgData = {
      organization: form.organization.value,
      hq: `${form['hq-barangay'].value}, ${form['hq-city'].value}, ${form['hq-province'].value}`,
      areaOps: Array.from(document.querySelectorAll('#areaOperationContainer input')).map(input => input.value),
      contactPerson: form.contactPerson.value,
      email: form.email.value,
      mobileNumber: form.mobileNumber.value,
      socialMedia: form.socialMedia.value
    };
  
    // Update confirmation details
    const confirmDetails = document.getElementById('confirmDetails');
    confirmDetails.innerHTML = `
      <p><strong style="color: #4059A5;">Organization:</strong> ${orgData.organization}</p>
      <p><strong style="color: #4059A5;">HQ:</strong> ${orgData.hq}</p>
      <p><strong style="color: #4059A5;">Contact Person:</strong> ${orgData.contactPerson}</p>
      <p><strong style="color: #4059A5;">Email:</strong> ${orgData.email}</p>
      <p><strong style="color: #4059A5;">Mobile:</strong> ${orgData.mobileNumber}</p>
      <p><strong style="color: #4059A5;">Social Media:</strong> ${orgData.socialMedia}</p>
      <p><strong style="color: #4059A5;">Area of Operations:</strong> ${orgData.areaOps.join(', ')}</p>
    `;
  
    document.getElementById('addOrgModal').style.display = 'none';
    document.getElementById('confirmModal').style.display = 'block';
  });
  
  document.getElementById('editDetailsBtn').addEventListener('click', function () {
    document.getElementById('confirmModal').style.display = 'none';
    document.getElementById('addOrgModal').style.display = 'block';
  });
  
  document.getElementById('confirmSaveBtn').addEventListener('click', function () {
    if (!orgData) return;
  
    const table = document.querySelector('#orgTable tbody');
    const rowCount = table.rows.length + 1;
  
    const row = table.insertRow();
    row.innerHTML = `
      <td>${rowCount}</td>
      <td>${orgData.organization}</td>
      <td>${orgData.hq}</td>
      <td>${orgData.areaOps.join(', ')}</td>
      <td>${orgData.contactPerson}</td>
      <td>${orgData.email}</td>
      <td>${orgData.mobileNumber}</td>
      <td>${orgData.socialMedia}</td>
      <td><button>Edit</button></td>
    `;
  
    orgData = null;
    document.getElementById('confirmModal').style.display = 'none';
    document.getElementById('successModal').style.display = 'block';
  });
  
  document.getElementById('closeSuccessBtn').addEventListener('click', () => {
    clearAInputs();
    document.getElementById('successModal').style.display = 'none';
  });
  
 
  
  function closeAModal() {
    document.getElementById('addOrgModal').style.display = 'none';
    clearAInputs();
  }

  function clearAInputs() {
    const form = document.getElementById('addOrgForm');
    form.reset(); // This will reset all form inputs
    document.getElementById('areaOperationContainer').innerHTML = ''; 
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


  //filtering
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


  // search 
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTable(filterAndSort());
  });

  sortSelect.addEventListener("change", () => {
    currentPage = 1;
    renderTable(filterAndSort());
  });

  
  // Initial render
  renderTable();
