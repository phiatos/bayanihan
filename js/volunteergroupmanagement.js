// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
  authDomain: "bayanihan-5ce7e.firebaseapp.com",
  databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bayanihan-5ce7e",
  storageBucket: "bayanihan-5ce7e.appspot.com",
  messagingSenderId: "593123849917",
  appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
  measurementId: "G-ZTQ9VXXVV0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Initialize EmailJS with the correct Public Key
emailjs.init('X4kCYg2glUhqW6738');

// Data array to store fetched data
let data = [];

const calamityOptions = [
  "Typhoon", "Earthquake", "Flood", "Volcanic Eruption", "Landslide", "Tsunami"
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
let editingRowId = null;
const tableBody = document.querySelector("#orgTable tbody");
const entriesInfo = document.querySelector("#entriesInfo");
const paginationContainer = document.querySelector("#pagination");
const addNew = document.getElementById('addNew');
const addOrgModal = document.getElementById('addOrgModal');
const addOrgForm = document.getElementById('addOrgForm');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');
const clearBtn = document.querySelector('.clear-btn');
let orgData = null;
let isProcessing = false;

// Helper function to format mobile numbers (consistent with global.js)
function formatMobileNumber(mobile) {
  const cleaned = mobile.replace(/\D/g, "");
  if (/^\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

// Function to generate a random temporary password
function generateTempPassword(length = 10) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

// Fetch data from Firebase and include logged-in ABVN data
function fetchAndRenderTable() {
  console.log("Fetching data from Firebase...");
  
  // First, check for logged-in ABVN data in localStorage
  const loggedInVolunteerGroup = localStorage.getItem('loggedInVolunteerGroup');
  let abvnData = null;
  if (loggedInVolunteerGroup) {
    abvnData = JSON.parse(loggedInVolunteerGroup);
    console.log("Logged-in ABVN data from localStorage:", abvnData);
  } else {
    console.log("No logged-in ABVN data found in localStorage. Attempting to fetch from Firebase...");
    
    const userMobile = localStorage.getItem("userMobile");
    if (!userMobile) {
      console.error("No userMobile found in localStorage.");
      // Proceed to fetch other volunteer groups without ABVN data
    } else {
      // Fetch ABVN data directly from Firebase if not in localStorage
      database.ref('users').orderByChild('mobile').equalTo(userMobile).once('value')
        .then(snapshot => {
          if (snapshot.exists()) {
            let userData = null;
            snapshot.forEach(childSnapshot => {
              userData = childSnapshot.val();
            });
            if (userData && userData.volunteerGroupId) {
              return database.ref(`volunteerGroups/${userData.volunteerGroupId}`).once('value');
            }
          }
          throw new Error("No user or volunteerGroupId found.");
        })
        .then(groupSnapshot => {
          if (groupSnapshot.exists()) {
            const groupData = groupSnapshot.val();
            abvnData = {
              no: userData.volunteerGroupId,
              organization: groupData.organization,
              hq: groupData.hq,
              areaOfOperation: groupData.areaOfOperation,
              contactPerson: groupData.contactPerson,
              email: groupData.email,
              mobileNumber: groupData.mobileNumber || userMobile,
              socialMedia: groupData.socialMedia || ''
            };
            localStorage.setItem('loggedInVolunteerGroup', JSON.stringify(abvnData));
            console.log("Fetched ABVN data from Firebase:", abvnData);
          }
        })
        .catch(error => {
          console.error("Error fetching ABVN data from Firebase:", error);
        });
    }
  }

  // Fetch all volunteer groups from Firebase
  database.ref("volunteerGroups").once("value", snapshot => {
    const fetchedData = snapshot.val();
    console.log("Fetched volunteer groups data:", fetchedData);

    if (!fetchedData) {
      console.log("No data found in volunteerGroups node.");
      data = [];
      if (abvnData) {
        data.push(abvnData); // Include ABVN data even if no other groups exist
      }
      renderTable();
      return;
    }

    data = [];
    for (let key in fetchedData) {
      const entry = fetchedData[key];
      const requiredFields = ['organization', 'hq', 'areaOfOperation', 'contactPerson', 'email', 'mobileNumber', 'socialMedia'];
      const hasAllFields = requiredFields.every(field => entry[field] !== undefined && entry[field] !== null);

      if (hasAllFields) {
        const groupEntry = {
          no: parseInt(key),
          organization: entry.organization,
          hq: entry.hq,
          areaOfOperation: entry.areaOfOperation,
          contactPerson: entry.contactPerson,
          email: entry.email,
          mobileNumber: entry.mobileNumber,
          socialMedia: entry.socialMedia
        };
        // Add to data array only if it's not the logged-in ABVN's group (to avoid duplicates)
        if (!abvnData || parseInt(key) !== parseInt(abvnData.no)) {
          data.push(groupEntry);
        }
      } else {
        console.warn(`Skipping entry with key ${key}: Missing or invalid required fields`, entry);
      }
    }

    // Add the logged-in ABVN's data to the top of the list
    if (abvnData) {
      data.unshift(abvnData); // Add ABVN data at the beginning
    }

    console.log("Processed data with ABVN included:", data);
    data.sort((a, b) => a.no - b.no); // Sort by 'no' field
    renderTable();
  }).catch(error => {
    console.error("Error fetching data from Firebase:", error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: `Failed to fetch data from the database: ${error.message}`
    });
    // If Firebase fetch fails, still display ABVN data if available
    if (abvnData) {
      data = [abvnData];
      renderTable();
    }
  });
}

function renderTable(filteredData = data) {
  console.log("Rendering table with data:", filteredData);
  tableBody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);
  console.log("Page data:", pageData);

  pageData.forEach(row => {
    console.log("Rendering row:", row);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td contenteditable="false">${row.no}</td>
      <td contenteditable="false">${row.organization || 'N/A'}</td>
      <td contenteditable="false" class="hqCell">${row.hq || 'N/A'}</td>
      <td contenteditable="false" class="locationCell">${row.areaOfOperation || 'N/A'}</td>
      <td contenteditable="false">${row.contactPerson || 'N/A'}</td>
      <td contenteditable="false">${row.email || 'N/A'}</td>
      <td contenteditable="false">${row.mobileNumber || 'N/A'}</td>
      <td contenteditable="false">${row.socialMedia || 'N/A'}</td>
      <td><button class="editButton" data-id="${row.no}">Edit</button></td>
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

// Enhanced Search Functionality
function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  clearBtn.style.display = query ? 'flex' : 'none';

  currentPage = 1; // Reset to first page on search
  renderTable(filterAndSort());
}

// Clear search input and reset table
function clearDInputs() {
  searchInput.value = '';
  clearBtn.style.display = 'none';
  currentPage = 1;
  renderTable(filterAndSort());
  searchInput.focus();
}

// Initialize clear button visibility
clearBtn.style.display = 'none';

// Attach search input event listener
searchInput.addEventListener('input', handleSearch);

// Editable Button for Row
function toggleEditableCells(rowIndex) {
  const row = document.querySelectorAll('#orgTable tbody tr')[rowIndex];
  const cells = row.querySelectorAll('td');
  const isEditable = cells[0].getAttribute('contenteditable') === 'true';
  const editButton = row.querySelector('.editButton');
  const rowId = editButton.getAttribute('data-id');

  if (!isEditable) {
    for (let i = 0; i < cells.length - 1; i++) {
      cells[i].setAttribute('contenteditable', 'true');
    }
    row.classList.add('editing');
    editButton.textContent = 'Save';
    editingRowId = rowId;
  } else {
    const updatedData = {
      organization: cells[1].textContent.trim(),
      hq: cells[2].textContent.trim(),
      areaOfOperation: cells[3].textContent.trim(),
      contactPerson: cells[4].textContent.trim(),
      email: cells[5].textContent.trim(),
      mobileNumber: cells[6].textContent.trim(),
      socialMedia: cells[7].textContent.trim()
    };

    database.ref(`volunteerGroups/${rowId}`).update(updatedData)
      .then(() => {
        for (let i = 0; i < cells.length - 1; i++) {
          cells[i].setAttribute('contenteditable', 'false');
        }
        row.classList.remove('editing');
        editButton.textContent = 'Edit';
        editingRowId = null;
        fetchAndRenderTable();
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Volunteer group updated successfully!'
        });
      })
      .catch(error => {
        console.error("Error updating data in Firebase:", error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to update data in the database. Please try again.'
        });
      });
  }
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

const allCities = Object.values(cities).flat();
const allBarangays = Object.values(barangays).flat();

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

  document.getElementById('areaOperationForm').reset();
  document.getElementById('areaOperationModal').style.display = 'none';
});

document.getElementById('addOrgForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const form = this;
  const email = form.email.value.trim();
  const mobileNumber = form.mobileNumber.value.trim();

  // Custom validation for email and mobile number
  const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const formattedMobile = formatMobileNumber(mobileNumber);

  if (!isValidEmail(email)) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid Email',
      text: 'Please enter a valid email address.'
    });
    return;
  }

  if (!formattedMobile) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid Mobile Number',
      text: 'Please enter a valid mobile number (10-15 digits, numbers only).'
    });
    return;
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  orgData = {
    organization: form.organization.value,
    hq: `${form['hq-barangay'].value}, ${form['hq-city'].value}, ${form['hq-province'].value}`,
    hqBarangay: form['hq-barangay'].value,
    hqCity: form['hq-city'].value,
    hqProvince: form['hq-province'].value,
    areaOps: Array.from(document.querySelectorAll('#areaOperationContainer input')).map(input => input.value),
    contactPerson: form.contactPerson.value,
    email: email,
    mobileNumber: formattedMobile,
    socialMedia: form.socialMedia.value
  };

  const confirmDetails = document.getElementById('confirmDetails');
  confirmDetails.innerHTML = `
    <p><strong style="color: #4059A5;">Organization</strong> ${orgData.organization}</p>
    <p><strong style="color: #4059A5;">HQ Location (Barangay)</strong> ${orgData.hqBarangay}</p>
    <p><strong style="color: #4059A5;">HQ Location (City/ Municipality)</strong> ${orgData.hqCity}</p>
    <p><strong style="color: #4059A5;">HQ Location (Province)</strong> ${orgData.hqProvince}</p>
    <p><strong style="color: #4059A5;">Contact Person</strong> ${orgData.contactPerson}</p>
    <p><strong style="color: #4059A5;">Email</strong> ${orgData.email}</p>
    <p><strong style="color: #4059A5;">Mobile</strong> ${orgData.mobileNumber}</p>
    <p><strong style="color: #4059A5;">Social Media</strong> ${orgData.socialMedia}</p>
    <p><strong style="color: #4059A5;">Area of Operations</strong></p>
    <ul style="padding-left:20px;">
      ${orgData.areaOps.map(area => `<li>${area}</li>`).join('')}
    </ul>
  `;

  document.getElementById('addOrgModal').style.display = 'none';
  document.getElementById('confirmModal').style.display = 'block';
});

document.getElementById('editDetailsBtn').addEventListener('click', function () {
  document.getElementById('confirmModal').style.display = 'none';
  document.getElementById('addOrgModal').style.display = 'block';
});

document.getElementById('confirmSaveBtn').addEventListener('click', async function () {
  if (isProcessing) return;
  isProcessing = true;
  this.disabled = true;

  console.log('orgData:', orgData);

  if (!orgData) {
    console.log('orgData is null or undefined');
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No organization data found. Please fill out the form again.'
    });
    isProcessing = false;
    this.disabled = false;
    return;
  }

  console.log('orgData.email:', orgData.email);
  console.log('orgData.mobileNumber:', orgData.mobileNumber);

  const newVolunteerGroup = {
    organization: orgData.organization,
    hq: orgData.hq,
    areaOfOperation: orgData.areaOps.join(', '),
    contactPerson: orgData.contactPerson,
    email: orgData.email,
    mobileNumber: orgData.mobileNumber,
    socialMedia: orgData.socialMedia
  };

  const tempPassword = generateTempPassword();

  const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const formattedMobile = formatMobileNumber(orgData.mobileNumber);

  if (!orgData.email || !isValidEmail(orgData.email)) {
    console.log('Invalid or missing email in orgData:', orgData.email);
    Swal.fire({
      icon: 'error',
      title: 'Invalid Email',
      text: 'Please enter a valid email address.'
    });
    isProcessing = false;
    this.disabled = false;
    return;
  }

  if (!formattedMobile) {
    console.log('Invalid or missing mobile number in orgData:', orgData.mobileNumber);
    Swal.fire({
      icon: 'error',
      title: 'Invalid Mobile Number',
      text: 'Please enter a valid mobile number (10-15 digits, numbers only).'
    });
    isProcessing = false;
    this.disabled = false;
    return;
  }

  let createdUser = null;

  try {
    const syntheticEmail = `${orgData.mobileNumber}@bayanihan.com`;
    console.log('Synthetic email for Firebase Auth:', syntheticEmail);

    const signInMethods = await auth.fetchSignInMethodsForEmail(syntheticEmail);
    if (signInMethods.length > 0) {
      throw new Error('The mobile number is already in use by another account.');
    }

    const userCredential = await auth.createUserWithEmailAndPassword(syntheticEmail, tempPassword);
    createdUser = userCredential.user;

    const userData = {
      email: orgData.email,
      role: 'ABVN',
      createdAt: new Date().toISOString(),
      mobile: orgData.mobileNumber,
      organization: orgData.organization
    };

    await database.ref(`users/${createdUser.uid}`).set(userData);

    const emailParams = {
      email: orgData.email,
      organization: orgData.organization,
      tempPassword: tempPassword,
      mobileNumber: orgData.mobileNumber
    };
    console.log('Sending email with params:', emailParams);
    const emailResponse = await emailjs.send('service_gebyrih', 'template_fa31b56', emailParams);
    console.log('EmailJS response:', emailResponse);

    const snapshot = await database.ref('volunteerGroups').once('value');
    const groups = snapshot.val();
    const keys = groups ? Object.keys(groups).map(Number) : [];
    const nextKey = keys.length > 0 ? Math.max(...keys) + 1 : 1;

    await database.ref(`volunteerGroups/${nextKey}`).set(newVolunteerGroup);

    const successEmail = orgData.email;
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: `Volunteer group added successfully!`
    });
    orgData = null;
    document.getElementById('confirmModal').style.display = 'none';
    document.getElementById('successModal').style.display = 'block';
    fetchAndRenderTable();
  } catch (error) {
    console.error('Error adding volunteer group:', error);
    console.log('Full error object:', JSON.stringify(error, null, 2));

    if (createdUser) {
      try {
        await createdUser.delete();
        console.log('Cleaned up: Firebase user deleted due to registration failure.');
      } catch (deleteError) {
        console.error('Failed to delete Firebase user during cleanup:', deleteError);
      }
    }

    let errorMessageText = 'An unexpected error occurred.';
    if (error.message) {
      errorMessageText = error.message;
    } else if (error.text) {
      errorMessageText = error.text;
    } else if (error.status && error.statusText) {
      errorMessageText = `HTTP ${error.status}: ${error.statusText}`;
    } else if (typeof error === 'object') {
      errorMessageText = JSON.stringify(error);
    } else {
      errorMessageText = String(error);
    }

    let errorMessage = 'Failed to add volunteer group. ';
    if (errorMessageText.includes('email-already-in-use') || errorMessageText.includes('mobile number is already in use')) {
      errorMessage += 'The mobile number is already in use by another account.';
    } else if (errorMessageText.includes('auth/invalid-email')) {
      errorMessage += 'The email address is not valid.';
    } else if (errorMessageText.includes('404')) {
      errorMessage += 'Failed to send email with temporary password. The EmailJS Template ID or Service ID may be incorrect. Please verify your EmailJS configuration.';
    } else if (errorMessageText.includes('Account not found')) {
      errorMessage += 'Account not found. Please verify your EmailJS Public Key and account status.';
    } else if (errorMessageText.includes('The recipients address is empty')) {
      errorMessage += 'The recipient email address is missing. Please ensure the email address is provided.';
    } else {
      errorMessage += errorMessageText;
    }

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage
    });
  } finally {
    isProcessing = false;
    this.disabled = false;
  }
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
  form.reset();
  document.getElementById('areaOperationContainer').innerHTML = '';
}

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
    const query = searchInput.value.trim().toLowerCase();
    return Object.values(row).some(val => {
      if (typeof val === 'string' || typeof val === 'number') {
        return val.toString().toLowerCase().includes(query);
      }
      return false;
    });
  });

  if (sortSelect.value) {
    filtered.sort((a, b) =>
      a[sortSelect.value].toString().localeCompare(b[sortSelect.value].toString())
    );
  }

  return filtered;
}

sortSelect.addEventListener("change", () => {
  currentPage = 1;
  renderTable(filterAndSort());
});

document.addEventListener("DOMContentLoaded", () => {
  fetchAndRenderTable();
  attachRowHandlers();
});