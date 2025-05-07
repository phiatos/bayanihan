// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail, getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { get, getDatabase, push, ref, remove, set } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Firebase config
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

// Initialize Firebase apps
const primaryApp = initializeApp(firebaseConfig, "PrimaryApp");
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const primaryAuth = getAuth(primaryApp);
const secondaryAuth = getAuth(secondaryApp);
const database = getDatabase(primaryApp);

// Initialize EmailJS
emailjs.init('X4kCYg2glUhqW6738');

// Data and constants
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

const addNewBtn = document.getElementById('addNew');

// Helper functions
function formatMobileNumber(mobile) {
  const cleaned = mobile.replace(/\D/g, "");
  if (/^\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

function generateTempPassword(length = 10) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

// Authentication and role check
document.addEventListener("DOMContentLoaded", () => {
  const userMobile = localStorage.getItem("userMobile");
  if (!userMobile) {
    Swal.fire({
      icon: 'error',
      title: 'Access Denied',
      text: 'You must be logged in to access this page.',
      timer: 1500,
      showConfirmButton: false
    });
    setTimeout(() => {
      window.location.replace("../pages/login.html");
    }, 1600);
    return;
  }

  get(query(ref(database, 'users'), orderByChild('mobile'), equalTo(userMobile)))
    .then(snapshot => {
      if (!snapshot.exists()) {
        Swal.fire({
          icon: 'error',
          title: 'Access Denied',
          text: 'User not found.',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => {
          window.location.replace("../pages/login.html");
        }, 1600);
        return;
      }

      let userData = null;
      snapshot.forEach(childSnapshot => {
        userData = childSnapshot.val();
      });

      if (userData.role !== 'AB ADMIN') {
        Swal.fire({
          icon: 'error',
          title: 'Access Denied',
          text: 'This page is restricted to AB ADMIN users only.',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => {
          window.location.replace("../pages/volunteer-dashboard.html");
        }, 1600);
        return;
      }

      // Clean up any 'undefined' keys
      remove(ref(database, 'volunteerGroups/undefined'))
        .then(() => {
          console.log("Cleaned up 'undefined' key in volunteerGroups.");
          listenForDataUpdates();
          attachRowHandlers();
        })
        .catch(error => {
          console.error("Error cleaning up 'undefined' key:", error);
          listenForDataUpdates();
          attachRowHandlers();
        });
    })
    .catch(error => {
      console.error("Error checking user role:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to verify user access.',
        timer: 1500,
        showConfirmButton: false
      });
      setTimeout(() => {
        window.location.replace("../pages/login.html");
      }, 1600);
    });
});

// Floating button visibility
document.addEventListener('mousemove', (e) => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const distanceX = windowWidth - e.clientX;
  const distanceY = windowHeight - e.clientY;
  if (distanceX < 200 && distanceY < 200) {
    addNewBtn.classList.add('visible');
  } else {
    addNewBtn.classList.remove('visible');
  }
});

// Get next ID for volunteer group
async function getNextId() {
  const snapshot = await get(ref(database, "volunteerGroups"));
  const fetchedData = snapshot.val();
  const ids = fetchedData
    ? Object.values(fetchedData)
        .map(entry => parseInt(entry.id || '0'))
        .filter(id => !isNaN(id))
    : [];
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return maxId + 1;
}

// Real-time data listener
function listenForDataUpdates() {
  console.log("Setting up real-time listener for volunteerGroups...");
  const userMobile = localStorage.getItem("userMobile");
  let abvnData = null;
  const loggedInVolunteerGroup = localStorage.getItem('loggedInVolunteerGroup');
  if (loggedInVolunteerGroup) {
    abvnData = JSON.parse(loggedInVolunteerGroup);
    console.log("Logged-in ABVN data from localStorage:", abvnData);
  }

  ref(database, "volunteerGroups").on("value", snapshot => {
    const fetchedData = snapshot.val();
    console.log("Real-time data update received:", fetchedData);
    console.log("Total entries fetched:", Object.keys(fetchedData || {}).length);

    if (!fetchedData) {
      console.log("No data found in volunteerGroups node.");
      Swal.fire({
        icon: 'info',
        title: 'No Data',
        text: 'No volunteer groups found in the database.'
      });
      data = abvnData ? [abvnData] : [];
      renderTable();
      return;
    }

    data = [];
    for (let key in fetchedData) {
      const entry = fetchedData[key];
      if (!entry || key === 'undefined') continue;

      const groupEntry = {
        no: parseInt(entry.id) || 0,
        organization: entry.organization || 'Not specified',
        hq: entry.hq || 'Not specified',
        areaOfOperation: entry.areaOfOperation || 'Not specified',
        contactPerson: entry.contactPerson || 'Not specified',
        email: entry.email || 'Not specified',
        mobileNumber: entry.mobileNumber || 'Not specified',
        socialMedia: entry.socialMedia || 'Not specified',
        status: entry.activation || 'inactive',
        firebaseKey: key
      };
      data.push(groupEntry);
    }

    if (abvnData && !data.some(d => d.firebaseKey === abvnData.firebaseKey)) {
      abvnData.no = parseInt(abvnData.id) || 0;
      data.unshift(abvnData);
    }

    console.log("Processed data with ABVN included:", data);
    console.log("Total entries after processing:", data.length);
    data.sort((a, b) => a.no - b.no);
    renderTable();
  }, error => {
    console.error("Error listening for data updates from Firebase:", error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: `Failed to listen for data updates: ${error.message}`
    });
    if (abvnData) {
      data = [abvnData];
      renderTable();
    }
  });
}

// Render table with pagination
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
      <td>${row.no}</td>
      <td contenteditable="false">${row.organization}</td>
      <td contenteditable="false" class="hqCell">${row.hq}</td>
      <td contenteditable="false" class="locationCell">${row.areaOfOperation}</td>
      <td contenteditable="false">${row.contactPerson}</td>
      <td contenteditable="false">${row.email}</td>
      <td contenteditable="false">${row.mobileNumber}</td>
      <td contenteditable="false">${row.socialMedia}</td>
      <td>
        <button class="activation-btn ${row.status === "active" ? "green-btn" : "red-btn"}" data-id="${row.firebaseKey}">
          ${row.status === "active" ? "Deactivate" : "Activate"}
        </button>
      </td>
      <td>
        <span class="status-circle ${row.status === "active" ? "green" : "red"}"></span>
      </td>
      <td><button class="editButton" data-id="${row.firebaseKey}">Edit</button></td>
    `;
    tableBody.appendChild(tr);
  });

  entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
  renderPagination(filteredData.length);
  attachRowHandlers();

  document.querySelectorAll('.editButton').forEach((button, index) => {
    button.addEventListener('click', () => toggleEditableCells(index));
  });

  document.querySelectorAll('.activation-btn').forEach(button => {
    button.addEventListener('click', () => {
      const rowId = button.getAttribute('data-id');
      const record = data.find(row => row.firebaseKey === rowId);

      if (!record) {
        console.error(`Record with Firebase Key ${rowId} not found in local data`);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Volunteer group not found. Please refresh the page and try again.'
        });
        return;
      }

      const newStatus = record.status === "active" ? "inactive" : "active";
      record.status = newStatus;

      console.log(`Updating activation for volunteerGroups/${rowId} to: ${newStatus}`);
      set(ref(database, `volunteerGroups/${rowId}/activation`), newStatus)
        .then(() => {
          console.log(`Successfully updated activation for volunteerGroups/${rowId}`);
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: `Volunteer group ${newStatus === "active" ? "activated" : "deactivated"} successfully!`
          });
        })
        .catch(error => {
          console.error("Error updating activation in Firebase:", error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Failed to update activation: ${error.message}`
          });
        });
    });
  });
}

// Search and clear inputs
function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  clearBtn.style.display = query ? 'flex' : 'none';
  currentPage = 1;
  renderTable(filterAndSort());
}

function clearDInputs() {
  searchInput.value = '';
  clearBtn.style.display = 'none';
  currentPage = 1;
  renderTable(filterAndSort());
  searchInput.focus();
}

clearBtn.style.display = 'none';
searchInput.addEventListener('input', handleSearch);

// Toggle editable cells for editing
function toggleEditableCells(rowIndex) {
  const row = document.querySelectorAll('#orgTable tbody tr')[rowIndex];
  const cells = row.querySelectorAll('td');
  const isEditable = cells[0].getAttribute('contenteditable') === 'true';
  const editButton = row.querySelector('.editButton');
  const rowId = editButton.getAttribute('data-id');

  if (!isEditable) {
    for (let i = 0; i < cells.length - 3; i++) {
      cells[i].setAttribute('contenteditable', 'true');
    }
    row.classList.add('editing');
    editButton.textContent = 'Save';
    editingRowId = rowId;
  } else {
    const updatedData = {
      id: cells[0].textContent.trim() || data.find(d => d.firebaseKey === rowId).no,
      organization: cells[1].textContent.trim() || 'Not specified',
      hq: cells[2].textContent.trim() || 'Not specified',
      areaOfOperation: cells[3].textContent.trim() || 'Not specified',
      contactPerson: cells[4].textContent.trim() || 'Not specified',
      email: cells[5].textContent.trim() || 'Not specified',
      mobileNumber: cells[6].textContent.trim() || 'Not specified',
      socialMedia: cells[7].textContent.trim() || 'Not specified'
    };

    set(ref(database, `volunteerGroups/${rowId}`), updatedData)
      .then(() => {
        for (let i = 0; i < cells.length - 3; i++) {
          cells[i].setAttribute('contenteditable', 'false');
        }
        row.classList.remove('editing');
        editButton.textContent = 'Edit';
        editingRowId = null;
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

// Populate location dropdowns
function populateProvinces() {
  const provinceList = document.getElementById('hqProvinceOptions');
  const locProvinceList = document.getElementById('locProvinceOptions');
  provinceList.innerHTML = '';
  locProvinceList.innerHTML = '';
  provinces.forEach(p => {
    const option1 = document.createElement('option');
    const option2 = document.createElement('option');
    option1.value = p;
    option1.textContent = p;
    option2.value = p;
    option2.textContent = p;
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
      option.textContent = c;
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
      option.textContent = b;
      brgyList.appendChild(option);
    });
  }
}

// Address modal handling
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
    if (hqCell) hqCell.textContent = hqFullAddress;
    if (locCell) locCell.textContent = locFullAddress;
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

// Attach row handlers for editing
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

// Add new volunteer group modal
addNew.addEventListener('click', () => {
  addOrgModal.style.display = 'flex';
});

// Populate location lists for area of operation
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

// Handle form submission for new volunteer group
document.getElementById('addOrgForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  const form = this;
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
      text: 'Please enter a valid mobile number (10-15 digits, numbers only).'
    });
    return;
  }

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const nextId = await getNextId();

  orgData = {
    id: nextId.toString(),
    organization: form.organization.value || 'Not specified',
    hq: `${form['hq-barangay'].value}, ${form['hq-city'].value}, ${form['hq-province'].value}`,
    hqBarangay: form['hq-barangay'].value || 'Not specified',
    hqCity: form['hq-city'].value || 'Not specified',
    hqProvince: form['hq-province'].value || 'Not specified',
    areaOps: Array.from(document.querySelectorAll('#areaOperationContainer input')).map(input => input.value),
    contactPerson: form.contactPerson.value || 'Not specified',
    email: email,
    mobileNumber: formattedMobile,
    socialMedia: form.socialMedia.value || 'Not specified'
  };

  const confirmDetails = document.getElementById('confirmDetails');
  confirmDetails.innerHTML = `
    <p><strong style="color: #4059A5;">ID</strong> ${orgData.id}</p>
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

// Edit and save buttons
document.getElementById('editDetailsBtn').addEventListener('click', function () {
  document.getElementById('confirmModal').style.display = 'none';
  document.getElementById('addOrgModal').style.display = 'block';
});

document.getElementById('confirmSaveBtn').addEventListener('click', async function () {
  if (isProcessing) return;
  isProcessing = true;
  this.disabled = true;

  if (!orgData) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No organization data found. Please fill out the form again.'
    });
    isProcessing = false;
    this.disabled = false;
    return;
  }

  const newVolunteerGroup = {
    id: orgData.id,
    organization: orgData.organization,
    hq: orgData.hq,
    areaOfOperation: orgData.areaOps.join(', '),
    contactPerson: orgData.contactPerson,
    email: orgData.email,
    mobileNumber: orgData.mobileNumber,
    socialMedia: orgData.socialMedia,
    activation: 'inactive',
    calamityType: 'Typhoon'
  };

  const tempPassword = generateTempPassword();
  const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const formattedMobile = formatMobileNumber(orgData.mobileNumber);

  if (!orgData.email || !isValidEmail(orgData.email)) {
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
  let groupKey = null;

  try {
    const syntheticEmail = `${formattedMobile}@bayanihan.com`;
    console.log('Synthetic email for Firebase Auth:', syntheticEmail);

    // Check for existing user
    const signInMethods = await fetchSignInMethodsForEmail(secondaryAuth, syntheticEmail);
    if (signInMethods.length > 0) {
      throw new Error('The mobile number is already in use by another account.');
    }

    // Create Authentication user
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, syntheticEmail, tempPassword);
    createdUser = userCredential.user;
    console.log('Firebase Auth user created with UID:', createdUser.uid);

    const userData = {
      email: orgData.email,
      role: 'ABVN',
      createdAt: new Date().toISOString(),
      mobile: formattedMobile,
      organization: orgData.organization,
      volunteerGroupId: null
    };

    // Generate group key
    groupKey = push(ref(database, 'volunteerGroups')).key;
    userData.volunteerGroupId = groupKey;

    // Write to database
    await Promise.all([
      set(ref(database, `users/${createdUser.uid}`), userData),
      set(ref(database, `volunteerGroups/${groupKey}`), newVolunteerGroup)
    ]);

    // Verify database writes
    const [userSnapshot, groupSnapshot] = await Promise.all([
      get(ref(database, `users/${createdUser.uid}`)),
      get(ref(database, `volunteerGroups/${groupKey}`))
    ]);

    if (!userSnapshot.exists()) {
      throw new Error('Failed to write user data to database.');
    }
    if (!groupSnapshot.exists()) {
      throw new Error('Failed to write volunteer group data to database.');
    }

    // Send email
    const emailParams = {
      email: orgData.email,
      organization: orgData.organization,
      tempPassword: tempPassword,
      mobileNumber: formattedMobile
    };
    console.log('Sending email with params:', emailParams);

    try {
      const emailResponse = await emailjs.send('service_gebyrih', 'template_fa31b56', emailParams);
      console.log('EmailJS response:', emailResponse);
    } catch (emailError) {
      console.error('EmailJS failed:', emailError);
      let emailErrorMessage = 'Failed to send email. ';
      if (emailError.status === 429) {
        emailErrorMessage += 'EmailJS free tier limit reached. Please upgrade your plan or wait for the limit to reset.';
      } else {
        emailErrorMessage += emailError.text || emailError.message;
      }
      throw new Error(emailErrorMessage);
    }

    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: `Volunteer group added successfully with ID ${orgData.id}!`
    });
    orgData = null;
    document.getElementById('confirmModal').style.display = 'none';
    document.getElementById('successModal').style.display = 'block';
  } catch (error) {
    console.error('Error adding volunteer group:', error);
    // Cleanup on failure
    if (createdUser) {
      try {
        await createdUser.delete();
        if (groupKey) {
          await remove(ref(database, `volunteerGroups/${groupKey}`));
        }
        await remove(ref(database, `users/${createdUser.uid}`));
        console.log('Cleaned up: Firebase user and database entries deleted.');
      } catch (deleteError) {
        console.error('Failed to cleanup:', deleteError);
      }
    }
    let errorMessage = 'Failed to add volunteer group. ';
    if (error.message.includes('mobile number is already in use')) {
      errorMessage += 'The mobile number is already registered. Please use a different mobile number or contact support.';
    } else if (error.message.includes('auth/invalid-email')) {
      errorMessage += 'The email address is not valid.';
    } else if (error.message.includes('database')) {
      errorMessage += 'Failed to save data. Please check database permissions or try again.';
    } else {
      errorMessage += error.message;
    }
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage
    });
  } finally {
    isProcessing = false;
    this.disabled = false;
    await secondaryAuth.signOut();
    console.log('Secondary auth signed out successfully');
  }
});

// Modal close and clear
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

// Pagination
function renderPagination(totalRows) {
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const maxVisible = 5;
  const createButton = (label, page = null, disabled = false, active = false) => {
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
  if (totalPages === 0) {
    paginationContainer.textContent = "No entries to display";
    return;
  }
  paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
  }
  paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
}

// Filter and sort data
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