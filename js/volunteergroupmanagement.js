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

// SECURITY NOTE: In production, store firebaseConfig in environment variables (e.g., .env) or use Firebase App Check to prevent exposure.

// Initialize primary Firebase app
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully:", firebase.app().name);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  Swal.fire({
    icon: "error",
    title: "Initialization Error",
    text: "Failed to initialize Firebase. Check configuration."
  });
}
const auth = firebase.auth();
const database = firebase.database();

// Initialize secondary Firebase app for creating users
try {
  firebase.initializeApp(firebaseConfig, "SecondaryApp");
  console.log("Secondary Firebase app initialized successfully");
} catch (error) {
  console.error("Secondary Firebase initialization failed:", error);
}
const secondaryAuth = firebase.auth(firebase.app("SecondaryApp"));

// Initialize EmailJS
try {
  emailjs.init('X4kCYg2glUhqW6738');
  console.log("EmailJS initialized successfully");
} catch (error) {
  console.error("EmailJS initialization failed:", error);
}

// Function to generate a random temporary password
function generateTempPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Data arrays
let data = [];
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
  "Camarines Sur": ["Naga City", "Iriga City", "Goa", "Pili", "Tinambac", "Calabanga", "Sipocot", "Tigaon"]
};
const barangays = {
  "Naga City": ["Concepcion Pequena", "San Felipe", "Tinago", "Mabolo", "Abella", "Balatas", "Igualdad", "Sabang"]
};

// Table settings
const rowsPerPage = 5;
let currentPage = 1;
let currentAddressCell = null;
let editingRowId = null;
let orgData = null;
let isProcessing = false;

// DOM elements
const tableBody = document.querySelector("#orgTable tbody");
const entriesInfo = document.querySelector("#entriesInfo");
const paginationContainer = document.querySelector("#pagination");
const addNew = document.getElementById('addNew');
const addOrgModal = document.getElementById('addOrgModal');
const addOrgForm = document.getElementById('addOrgForm');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');
const clearBtn = document.querySelector('.clear-btn');

// Validate DOM elements
if (!tableBody) console.error("Table body (#orgTable tbody) not found.");
if (!entriesInfo) console.error("Entries info (#entriesInfo) not found.");
if (!paginationContainer) console.error("Pagination container (#pagination) not found.");
if (!addNew) console.error("Add new button (#addNew) not found.");
if (!addOrgModal) console.error("Add org modal (#addOrgModal) not found.");
if (!addOrgForm) console.error("Add org form (#addOrgForm) not found.");
if (!sortSelect) console.error("Sort select (#sortSelect) not found.");
if (!searchInput) console.error("Search input (#searchInput) not found.");
if (!clearBtn) console.error("Clear button (.clear-btn) not found.");

// Floating button visibility
document.addEventListener('mousemove', (e) => {
  if (!addNew) return;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const distanceX = windowWidth - e.clientX;
  const distanceY = windowHeight - e.clientY;
  if (distanceX < 200 && distanceY < 200) {
    addNew.classList.add('visible');
  } else {
    addNew.classList.remove('visible');
  }
});

// Utility functions
function formatMobileNumber(mobile) {
  const cleaned = mobile.replace(/\D/g, "");
  if (/^\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

// Fetch and render table data
function fetchAndRenderTable() {
  console.log("Checking authentication state...");
  auth.onAuthStateChanged(user => {
    console.log("User state:", user ? `Signed in as ${user.uid}` : "No user signed in");
    if (!user) {
      Swal.fire({
        icon: "warning",
        title: "Authentication Required",
        text: "Please sign in as an admin to view volunteer groups."
      });
      return;
    }
    console.log("Fetching user data for UID:", user.uid);
    database.ref(`users/${user.uid}`).once("value")
      .then(snapshot => {
        const userData = snapshot.val();
        console.log("User data:", userData);
        if (!userData) {
          console.warn("No user data found for UID:", user.uid);
          Swal.fire({
            icon: "error",
            title: "User Not Found",
            text: `User data not found in the database. Contact support with UID: ${user.uid}`
          });
          return;
        }
        if (userData.role !== "AB ADMIN") {
          console.warn("User is not an admin:", userData);
          Swal.fire({
            icon: "error",
            title: "Access Denied",
            text: "Only admins can access this page."
          });
          return;
        }
        console.log("Fetching volunteerGroups...");
        database.ref("volunteerGroups").once("value")
          .then(snapshot => {
            const fetchedData = snapshot.val();
            console.log("Fetched volunteerGroups:", fetchedData);
            if (!fetchedData) {
              console.warn("No data found in volunteerGroups node.");
              data = [];
              renderTable();
              Swal.fire({
                icon: "info",
                title: "No Data",
                text: "No volunteer groups found in the database."
              });
              return;
            }
            data = Object.entries(fetchedData).map(([key, entry]) => ({
              no: parseInt(key),
              organization: entry.organization || "N/A",
              hq: entry.hq || "N/A",
              areaOfOperation: entry.areaOfOperation || "N/A",
              contactPerson: entry.contactPerson || "N/A",
              email: entry.email || "N/A",
              mobileNumber: entry.mobileNumber || "N/A",
              socialMedia: entry.socialMedia || "N/A",
              activation: entry.activation || "N/A",
              calamityType: entry.calamityType || "N/A"
            }));
            console.log("Processed Data:", data);
            data.sort((a, b) => a.no - b.no);
            renderTable();
          })
          .catch(error => {
            console.error("Error fetching volunteerGroups:", error);
            let errorMessage = "Failed to fetch data. Check network or database.";
            if (error.code === "PERMISSION_DENIED") {
              errorMessage = "Permission denied. Ensure database rules allow admin read access.";
            }
            Swal.fire({
              icon: "error",
              title: "Fetch Error",
              text: errorMessage
            });
            data = [];
            renderTable();
          });
      })
      .catch(error => {
        console.error("Error fetching user data:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `Failed to verify admin status: ${error.message}`
        });
      });
  });
}

// Render table
function renderTable(filteredData = data) {
  console.log("Rendering table with data:", filteredData);
  if (!tableBody) return;
  tableBody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);
  console.log("Page data:", pageData);

  pageData.forEach((row, index) => {
    const rowNumber = start + index + 1;
    console.log("Rendering row:", row);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td contenteditable="false">${rowNumber}</td>
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

  if (entriesInfo) {
    entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
  }
  renderPagination(filteredData.length);
  attachRowHandlers();
}

// Search functionality
function handleSearch() {
  if (!searchInput) return;
  const query = searchInput.value.trim().toLowerCase();
  if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
  currentPage = 1;
  renderTable(filterAndSort());
}

function clearDInputs() {
  if (!searchInput || !clearBtn) return;
  searchInput.value = '';
  clearBtn.style.display = 'none';
  currentPage = 1;
  renderTable(filterAndSort());
}

if (clearBtn) {
  clearBtn.style.display = 'none';
  clearBtn.addEventListener('click', clearDInputs);
}
if (searchInput) {
  searchInput.addEventListener('input', handleSearch);
}

// Filter and sort
function filterAndSort() {
  let filtered = data.filter(row =>
    Object.values(row).some(val =>
      typeof val === 'string' || typeof val === 'number'
        ? val.toString().toLowerCase().includes(searchInput.value.trim().toLowerCase())
        : false
    )
  );
  if (sortSelect && sortSelect.value) {
    filtered.sort((a, b) => a[sortSelect.value].toString().localeCompare(b[sortSelect.value].toString()));
  }
  return filtered;
}

if (sortSelect) {
  sortSelect.addEventListener("change", () => {
    currentPage = 1;
    renderTable(filterAndSort());
  });
}

// Pagination
function renderPagination(totalRows) {
  if (!paginationContainer) return;
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  if (totalPages === 0) {
    paginationContainer.textContent = "No entries to display";
    return;
  }
  const createButton = (label, page, disabled = false, active = false) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (disabled) btn.disabled = true;
    if (active) btn.classList.add("active-page");
    if (page !== null) {
      btn.addEventListener("click", () => {
        currentPage = page;
        renderTable(filterAndSort());
      });
    }
    return btn;
  };
  paginationContainer.appendChild(createButton("Prev", currentPage > 1 ? currentPage - 1 : null, currentPage === 1));
  for (let i = 1; i <= totalPages; i++) {
    paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
  }
  paginationContainer.appendChild(createButton("Next", currentPage < totalPages ? currentPage + 1 : null, currentPage === totalPages));
}

// Edit functionality
function attachRowHandlers() {
  document.querySelectorAll('.editButton').forEach(button => {
    button.addEventListener('click', () => {
      const row = button.closest('tr');
      const rowId = button.getAttribute('data-id');
      const cells = row.querySelectorAll('td');
      const isEditable = cells[0].getAttribute('contenteditable') === 'true';

  if (!isEditable) {
    for (let i = 1; i < cells.length - 1; i++) {
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
        for (let i = 1; i < cells.length - 1; i++) {
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

// Address modal
function populateProvinces() {
  ['hqProvinceOptions', 'locProvinceOptions'].forEach(id => {
    const list = document.getElementById(id);
    if (list) {
      list.innerHTML = '';
      provinces.forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        list.appendChild(option);
      });
    }
  });
}

function populateCities(province, isLocation) {
  const list = document.getElementById(isLocation ? 'locCityOptions' : 'hqCityOptions');
  if (!list) return;
  list.innerHTML = '';
  if (cities[province]) {
    cities[province].forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      list.appendChild(option);
    });
  }
}

function populateBarangays(city, isLocation) {
  const list = document.getElementById(isLocation ? 'locBarangayOptions' : 'hqBarangayOptions');
  if (!list) return;
  list.innerHTML = '';
  if (barangays[city]) {
    barangays[city].forEach(b => {
      const option = document.createElement('option');
      option.value = b;
      list.appendChild(option);
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
    document.getElementById('hqProvinceInput').value = hqParts[1] || '';
    document.getElementById('hqCityInput').value = hqParts[0] || '';
    document.getElementById('hqBarangayInput').value = hqParts[2] || '';
  }
  if (locCell) {
    const locParts = locCell.textContent.split(',').map(p => p.trim());
    document.getElementById('locProvinceInput').value = locParts[1] || '';
    document.getElementById('locCityInput').value = locParts[0] || '';
    document.getElementById('locBarangayInput').value = locParts[2] || '';
  }
  populateProvinces();
  populateCities(document.getElementById('hqProvinceInput').value, false);
  populateCities(document.getElementById('locProvinceInput').value, true);
  populateBarangays(document.getElementById('hqCityInput').value, false);
  populateBarangays(document.getElementById('locCityInput').value, true);
  const addressModal = document.getElementById('addressModal');
  if (addressModal) addressModal.style.display = 'flex';
}

function closeModal() {
  const addressModal = document.getElementById('addressModal');
  if (addressModal) addressModal.style.display = 'none';
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

  const hqAddress = hqBarangay ? `${hqBarangay}, ${hqCity}, ${hqProvince}` : hqCity && hqProvince ? `${hqCity}, ${hqProvince}` : '';
  const locAddress = locBarangay ? `${locBarangay}, ${locCity}, ${locProvince}` : locCity && locProvince ? `${locCity}, ${locProvince}` : '';

  if (currentAddressCell) {
    const row = currentAddressCell.closest('tr');
    const hqCell = row.querySelector('.hqCell');
    const locCell = row.querySelector('.locationCell');
    if (hqCell && hqAddress) hqCell.textContent = hqAddress;
    if (locCell && locAddress) locCell.textContent = locAddress;
  }
  closeModal();
}

function clearInputs() {
  ['hqProvinceInput', 'hqCityInput', 'hqBarangayInput', 'locProvinceInput', 'locCityInput', 'locBarangayInput'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
}

['hqProvinceInput', 'locProvinceInput'].forEach(id => {
  const input = document.getElementById(id);
  if (input) input.addEventListener('input', e => populateCities(e.target.value, id.includes('loc')));
});
['hqCityInput', 'locCityInput'].forEach(id => {
  const input = document.getElementById(id);
  if (input) input.addEventListener('input', e => populateBarangays(e.target.value, id.includes('loc')));
});

function attachRowHandlers() {
  const rows = document.querySelectorAll("#orgTable tbody tr");

  rows.forEach(row => {
    const editBtn = row.querySelector(".editButton");

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        const rowId = editBtn.getAttribute("data-id");
        const cells = row.querySelectorAll("td");
        const isEditable = cells[1].getAttribute("contenteditable") === "true"; // skip row number (index 0)

        if (!isEditable) {
          // Enable editing (skip first column and last button column)
          cells.forEach((cell, i) => {
            if (i > 0 && i < cells.length - 1) {
              cell.setAttribute("contenteditable", "true");
            }
          });
          row.classList.add("editing");
          editBtn.textContent = "Save";
          editingRowId = rowId;

          // Attach click listeners for modal-opening cells
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

        } else {
          // Save updates
          const updatedData = {
            organization: cells[1].textContent.trim() || "N/A",
            hq: cells[2].textContent.trim() || "N/A",
            areaOfOperation: cells[3].textContent.trim() || "N/A",
            contactPerson: cells[4].textContent.trim() || "N/A",
            email: cells[5].textContent.trim() || "N/A",
            mobileNumber: cells[6].textContent.trim() || "N/A",
            socialMedia: cells[7].textContent.trim() || "N/A"
          };

          database.ref(`volunteerGroups/${rowId}`).update(updatedData)
            .then(() => {
              // Disable editing
              cells.forEach((cell, i) => {
                if (i > 0 && i < cells.length - 1) {
                  cell.setAttribute("contenteditable", "false");
                }
              });
              row.classList.remove("editing");
              editBtn.textContent = "Edit";
              editingRowId = null;
              Swal.fire({
                icon: 'success',
                title: 'Updated',
                text: 'Volunteer group updated successfully!'
              });
              fetchAndRenderTable();
            })
            .catch(error => {
              console.error("Update error:", error);
              Swal.fire({
                icon: 'error',
                title: 'Update Error',
                text: error.message
              });
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
  if (!list) return;
  list.innerHTML = '';
  provinces.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    list.appendChild(opt);
  });
}

function populateCityList() {
  const list = document.getElementById('cityList');
  if (!list) return;
  list.innerHTML = '';
  Object.values(cities).flat().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    list.appendChild(opt);
  });
}

function populateBarangayList() {
  const list = document.getElementById('barangayList');
  if (!list) return;
  list.innerHTML = '';
  Object.values(barangays).flat().forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    list.appendChild(opt);
  });
}

const areaOperationForm = document.getElementById('areaOperationForm');
if (areaOperationForm) {
  areaOperationForm.addEventListener('submit', e => {
    e.preventDefault();
    const province = document.getElementById('provinceInput').value.trim();
    const city = document.getElementById('cityInput').value.trim();
    const barangay = document.getElementById('barangayInput').value.trim();
    if (!province || !city || !barangay) {
      Swal.fire({
        icon: 'error',
        title: 'Incomplete Input',
        text: 'Please fill all fields.'
      });
      return;
    }
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.name = 'Area Operation';
    newInput.value = `${barangay}, ${city}, ${province}`;
    newInput.readOnly = true;
    newInput.style.marginTop = '10px';
    newInput.style.width = '100%';
    newInput.style.maxWidth = '520px';
    newInput.style.padding = '10px 14px';
    newInput.style.border = '#605D67 1px solid';
    newInput.style.borderRadius = '12px';
    const container = document.getElementById('areaOperationContainer');
    if (container) container.appendChild(newInput);
    areaOperationForm.reset();
    const modal = document.getElementById('areaOperationModal');
    if (modal) modal.style.display = 'none';
  });
}

if (addOrgForm) {
  addOrgForm.addEventListener('submit', async e => {
    e.preventDefault();
    const form = addOrgForm;
    const email = form.email.value.trim();
    const mobileNumber = form.mobileNumber.value.trim();
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
        text: 'Mobile number must be 10-15 digits.'
      });
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Validate area of operation
    const areaOps = Array.from(document.querySelectorAll('#areaOperationContainer input')).map(input => input.value);
    if (!areaOps.length) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Input',
        text: 'At least one area of operation is required.'
      });
      return;
    }

    orgData = {
      organization: form.organization.value.trim(),
      hq: `${form['hq-barangay'].value}, ${form['hq-city'].value}, ${form['hq-province'].value}`,
      areaOps: areaOps,
      contactPerson: form.contactPerson.value.trim(),
      email: email,
      mobileNumber: formattedMobile,
      socialMedia: form.socialMedia.value.trim() || "N/A"
    };

    const confirmDetails = document.getElementById('confirmDetails');
    if (confirmDetails) {
      confirmDetails.innerHTML = `
        <p><strong style="color: #4059A5;">Organization</strong> ${orgData.organization}</p>
        <p><strong style="color: #4059A5;">HQ</strong> ${orgData.hq}</p>
        <p><strong style="color: #4059A5;">Contact Person</strong> ${orgData.contactPerson}</p>
        <p><strong style="color: #4059A5;">Email</strong> ${orgData.email}</p>
        <p><strong style="color: #4059A5;">Mobile</strong> ${orgData.mobileNumber}</p>
        <p><strong style="color: #4059A5;">Social Media</strong> ${orgData.socialMedia}</p>
        <p><strong style="color: #4059A5;">Area of Operations</strong></p>
        <ul style="padding-left:20px;">${orgData.areaOps.map(area => `<li>${area}</li>`).join('')}</ul>
      `;
    }
    if (addOrgModal) addOrgModal.style.display = 'none';
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) confirmModal.style.display = 'block';
  });
}

const editDetailsBtn = document.getElementById('editDetailsBtn');
if (editDetailsBtn) {
  editDetailsBtn.addEventListener('click', () => {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) confirmModal.style.display = 'none';
    if (addOrgModal) addOrgModal.style.display = 'block';
  });
}

const confirmSaveBtn = document.getElementById('confirmSaveBtn');
if (confirmSaveBtn) {
  confirmSaveBtn.addEventListener('click', async () => {
    if (isProcessing) return;
    isProcessing = true;
    confirmSaveBtn.disabled = true;

    if (!orgData) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No organization data found.'
      });
      isProcessing = false;
      confirmSaveBtn.disabled = false;
      return;
    }

    const newVolunteerGroup = {
      organization: orgData.organization,
      hq: orgData.hq,
      areaOfOperation: orgData.areaOps.join(', ') || "N/A",
      contactPerson: orgData.contactPerson,
      email: orgData.email || "N/A",
      mobileNumber: orgData.mobileNumber,
      socialMedia: orgData.socialMedia,
      activation: "",
      calamityType: ""
    };

    try {
      // Verify admin is signed in
      const adminUser = auth.currentUser;
      if (!adminUser) {
        throw new Error("No admin signed in. Please sign in again.");
      }
      console.log("Current admin:", adminUser.uid);

      // Verify admin role
      const adminSnapshot = await database.ref(`users/${adminUser.uid}`).once("value");
      const adminData = adminSnapshot.val();
      if (!adminData || adminData.role !== "AB ADMIN") {
        throw new Error("Current user is not an admin.");
      }

      // Check if mobile number already exists
      const usersSnapshot = await database.ref('users').once('value');
      const users = usersSnapshot.val();
      if (users && Object.values(users).some(user => user.mobile === orgData.mobileNumber)) {
        throw new Error("Mobile number already registered.");
      }

      // Create Firebase Authentication account
      const tempPassword = generateTempPassword();
      const syntheticEmail = `${orgData.mobileNumber}@bayanihan.com`;
      const userCredential = await secondaryAuth.createUserWithEmailAndPassword(syntheticEmail, tempPassword);
      const newUser = userCredential.user;

      // Save user data to users/<uid>
      await database.ref(`users/${newUser.uid}`).set({
        role: "ABVN",
        group: orgData.organization,
        email: orgData.email,
        mobile: orgData.mobileNumber,
        organization: orgData.organization,
        contactPerson: orgData.contactPerson,
        createdAt: new Date().toISOString()
      });

      // Save volunteer group
      const snapshot = await database.ref('volunteerGroups').once('value');
      const groups = snapshot.val();
      const nextKey = groups ? Math.max(...Object.keys(groups).map(Number)) + 1 : 1;
      await database.ref(`volunteerGroups/${nextKey}`).set({
        ...newVolunteerGroup,
        userId: newUser.uid
      });

      // Send EmailJS confirmation with temporary password
      await emailjs.send('service_gebyrih', 'template_fa31b56', {
        email: orgData.email,
        organization: orgData.organization,
        tempPassword: tempPassword,
        mobileNumber: orgData.mobileNumber,
        message: `Your volunteer group "${orgData.organization}" has been successfully registered with Bayanihan. Please use the credentials below to log in.`
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Volunteer group added successfully and credentials sent!'
      });
      orgData = null;
      const confirmModal = document.getElementById('confirmModal');
      const successModal = document.getElementById('successModal');
      if (confirmModal) confirmModal.style.display = 'none';
      if (successModal) successModal.style.display = 'block';
      fetchAndRenderTable();

      // Sign out secondary app
      await secondaryAuth.signOut();
    } catch (error) {
      console.error('Error adding volunteer group:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to add group: ${error.message}`
      });
    } finally {
      isProcessing = false;
      confirmSaveBtn.disabled = false;
      console.log("Admin still signed in:", auth.currentUser?.uid);
    }
  });
}

document.getElementById('closeSuccessBtn').addEventListener('click', () => {
  clearAInputs();
  document.getElementById('successModal').style.display = 'none';
});

function closeAModal() {
  document.getElementById('addOrgModal').style.display = 'none';
  document.getElementById('areaOperationModal').style.display = 'none';
  clearAInputs();
}

function closeAOOModal() {
  document.getElementById('areaOperationModal').style.display = 'none';
  clearAOOInputs();
}

function clearAOOInputs() {
  const form = document.getElementById('areaOperationForm');
  form.reset();
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
  console.log("DOM loaded, fetching data...");
  fetchAndRenderTable();
});