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

<<<<<<< HEAD
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
=======
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

// Initialize EmailJS with updated public key
try {
  emailjs.init('ULA8rmn7VM-3fZ7ik'); // Updated to your new public key
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
>>>>>>> 47542607496c29c4264373a23319286868a6706b
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

<<<<<<< HEAD
// Helper functions
=======
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
>>>>>>> 47542607496c29c4264373a23319286868a6706b
function formatMobileNumber(mobile) {
  const cleaned = mobile.replace(/\D/g, "");
  if (/^\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

<<<<<<< HEAD
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
=======
// Fetch and render table data
function fetchAndRenderTable() {
  console.log("Checking authentication state...");
  auth.onAuthStateChanged(user => {
    console.log("User state:", user ? `Signed in as ${user.uid}` : "No user signed in");
    if (!user) {
      Swal.fire({
        icon: "warning",
        title: "Authentication Required",
        text: "Please sign in as an admin to view volunteer groups.",
        timer: 2000,
        showConfirmButton: false
      });
      setTimeout(() => {
        window.location.replace("/Bayanihan-PWA/pages/login.html");
      }, 2000);
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
          errorMessage = "Permission denied. Ensure database rules allow read access.";
        }
        Swal.fire({
          icon: "error",
          title: "Fetch Error",
          text: errorMessage
        });
        data = [];
        renderTable();
      });
  });
}

// Render table
>>>>>>> 47542607496c29c4264373a23319286868a6706b
function renderTable(filteredData = data) {
  console.log("Rendering table with data:", filteredData);
  if (!tableBody) return;
  tableBody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);
  console.log("Page data:", pageData);

  pageData.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.no}</td>
<<<<<<< HEAD
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
=======
      <td>${row.organization}</td>
      <td class="hqCell">${row.hq}</td>
      <td class="locationCell">${row.areaOfOperation}</td>
      <td>${row.contactPerson}</td>
      <td>${row.email}</td>
      <td>${row.mobileNumber}</td>
      <td>${row.socialMedia}</td>
      <td><button class="editButton" data-id="${row.no}">Edit</button></td>
>>>>>>> 47542607496c29c4264373a23319286868a6706b
    `;
    tableBody.appendChild(tr);
  });

<<<<<<< HEAD
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
=======
  if (entriesInfo) {
    entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
  }
  renderPagination(filteredData.length);
  attachRowHandlers();
}

// Search functionality
>>>>>>> 47542607496c29c4264373a23319286868a6706b
function handleSearch() {
  if (!searchInput) return;
  const query = searchInput.value.trim().toLowerCase();
<<<<<<< HEAD
  clearBtn.style.display = query ? 'flex' : 'none';
=======
  if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';
>>>>>>> 47542607496c29c4264373a23319286868a6706b
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

<<<<<<< HEAD
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
=======
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
>>>>>>> 47542607496c29c4264373a23319286868a6706b
  }
  return filtered;
}

<<<<<<< HEAD
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

=======
if (sortSelect) {
  sortSelect.addEventListener("change", () => {
    currentPage = 1;
    renderTable(filterAndSort());
  });
}

>>>>>>> 47542607496c29c4264373a23319286868a6706b
// Pagination
function renderPagination(totalRows) {
  if (!paginationContainer) return;
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(totalRows / rowsPerPage);
<<<<<<< HEAD
  const maxVisible = 5;
  const createButton = (label, page = null, disabled = false, active = false) => {
=======
  if (totalPages === 0) {
    paginationContainer.textContent = "No entries to display";
    return;
  }
  const createButton = (label, page, disabled = false, active = false) => {
>>>>>>> 47542607496c29c4264373a23319286868a6706b
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
<<<<<<< HEAD
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
=======
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
        cells.forEach((cell, i) => {
          if (i < cells.length - 1) cell.setAttribute('contenteditable', 'true');
        });
        button.textContent = 'Save';
        editingRowId = rowId;
      } else {
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
            cells.forEach((cell, i) => {
              if (i < cells.length - 1) cell.setAttribute('contenteditable', 'false');
            });
            button.textContent = 'Edit';
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
>>>>>>> 47542607496c29c4264373a23319286868a6706b
      }
    });
  });
<<<<<<< HEAD
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
=======
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

// Add new organization
if (addNew) {
  addNew.addEventListener('click', () => {
    if (addOrgModal) addOrgModal.style.display = 'flex';
  });
}

function closeAModal() {
  if (addOrgModal) addOrgModal.style.display = 'none';
  clearAInputs();
}

function closeAOOModal() {
  const areaOperationModal = document.getElementById('areaOperationModal');
  if (areaOperationModal) areaOperationModal.style.display = 'none';
  clearAOOInputs();
}

function clearAOOInputs() {
  const form = document.getElementById('areaOperationForm');
  if (form) form.reset();
}

function clearAInputs() {
  const form = document.getElementById('addOrgForm');
  const container = document.getElementById('areaOperationContainer');
  if (form) form.reset();
  if (container) container.innerHTML = '';
}

const addOperationArea = document.getElementById('addOperationArea');
if (addOperationArea) {
  addOperationArea.addEventListener('click', () => {
    populateProvinceList();
    populateCityList();
    populateBarangayList();
    const modal = document.getElementById('areaOperationModal');
    if (modal) modal.style.display = 'flex';
  });
}

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

      // Send EmailJS confirmation with temporary password using updated service and template IDs
      await emailjs.send('service_g5f0erj', 'template_0yk865p', { // Updated to your new service ID and template ID
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

const closeSuccessBtn = document.getElementById('closeSuccessBtn');
if (closeSuccessBtn) {
  closeSuccessBtn.addEventListener('click', () => {
    clearAInputs();
    const successModal = document.getElementById('successModal');
    if (successModal) successModal.style.display = 'none';
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, fetching data...");
  fetchAndRenderTable();
>>>>>>> 47542607496c29c4264373a23319286868a6706b
});