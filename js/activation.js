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
const database = firebase.database();

// Data array to store fetched data
let data = [];

const calamityOptions = [
  "Typhoon", "Earthquake", "Flood", "Volcanic Eruption", "Landslide", "Tsunami"
];

const areas = ["Luzon", "Visayas", "Mindanao"];

let currentPage = 1;
const rowsPerPage = 5;

const tableBody = document.querySelector("#orgTable tbody");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const entriesInfo = document.querySelector("#entriesInfo");
const paginationContainer = document.querySelector("#pagination");
const clearBtn = document.querySelector('.clear-btn');

// Monitor authentication state and fetch data only when authenticated
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    console.log("User is authenticated:", user.uid);
    listenForDataUpdates(); 
  } else {
    console.log("No user is authenticated. Attempting anonymous sign-in...");
    firebase.auth().signInAnonymously()
      .then(() => {
        console.log("Signed in anonymously");
      })
      .catch(error => {
        console.error("Anonymous auth failed:", error.code, error.message);
        Swal.fire({
          icon: 'error',
          title: 'Authentication Error',
          text: `Failed to authenticate: ${error.message}. Please check your network and Firebase configuration.`
        });
      });
  }
});

// Listen for real-time updates from Firebase
function listenForDataUpdates() {
  console.log("Setting up real-time listener for volunteerGroups...");
  database.ref("volunteerGroups").on("value", snapshot => {
    const fetchedData = snapshot.val();
    console.log("Real-time data update received:", fetchedData);

    if (!fetchedData) {
      console.log("No data found in volunteerGroups node.");
      Swal.fire({
        icon: 'info',
        title: 'No Data',
        text: 'No volunteer groups found in the database.'
      });
      data = [];
      renderTable();
      return;
    }

    data = [];
    for (let key in fetchedData) {
      data.push({
        no: parseInt(key),
        organization: fetchedData[key].organization || "Unknown",
        hq: fetchedData[key].hq || "Not specified",
        areaOfOperation: fetchedData[key].areaOfOperation || "Not specified",
        contactPerson: fetchedData[key].contactPerson || "Unknown",
        email: fetchedData[key].email || "Not specified",
        mobileNumber: fetchedData[key].mobileNumber || "Not specified",
        calamity: fetchedData[key].calamityType || "Typhoon",
        status: fetchedData[key].activation || "inactive"
      });
    }

    console.log("Processed data:", data);
    data.sort((a, b) => a.no - b.no);
    renderTable();
  }, error => {
    console.error("Error listening for data updates from Firebase:", error.code, error.message);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: `Failed to listen for data updates: ${error.message}`
    });
  });
}

function renderTable(filteredData = data) {
  tableBody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);

  pageData.forEach(row => {
    const tr = document.createElement("tr");

    console.log(`Rendering row with ID: ${row.no}`); // Debug log

    const calamitySelect = calamityOptions
      .map(opt => `<option value="${opt}" ${opt === row.calamity ? "selected" : ""}>${opt}</option>`)
      .join("");

    tr.innerHTML = `
      <td>${row.no}</td>
      <td contenteditable="false">${row.organization}</td>
      <td contenteditable="false">${row.hq}</td>
      <td>
        <div class="area-dropdown">
          <button type="button" class="area-dropbtn">${row.areaOfOperation ? row.areaOfOperation : 'Select Areas'}</button>
          <div class="area-dropdown-content">
            ${areas.map(area => `
              <label>
                <input type="checkbox" name="area" value="${area}" ${row.areaOfOperation.includes(area) ? 'checked' : ''}>
                ${area}
              </label>
            `).join('')}
          </div>
        </div>
      </td>
      <td contenteditable="false">${row.contactPerson}</td>
      <td contenteditable="false">${row.email}</td>
      <td contenteditable="false">${row.mobileNumber}</td>
      <td>
         <div class="calamity-container">
          <select class="calamity-select" data-id="${row.no}" data-row="${row.no}">
            ${calamitySelect}
          </select>
          <input 
            type="text" 
            class="typhoon-name-input" 
            data-row="${row.no}" 
            placeholder="Enter typhoon name" 
            style="display: ${row.calamity === "Typhoon" ? "inline-block" : "none"};" 
            value="${row.typhoonName || ""}"
          />
        </div>
      </td>
      <td>
        <button class="activation-btn ${row.status === "active" ? "green-btn" : "red-btn"}" data-id="${row.no}">
          ${row.status === "active" ? "Deactivate" : "Activate"}
        </button>
      </td>
      <td>
        <span class="status-circle ${row.status === "active" ? "green" : "red"}"></span>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;

  renderPagination(filteredData.length);
}

// Search Functionality
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

// Dropdown toggle for area selection
document.addEventListener("click", (e) => {
  const isDropBtn = e.target.matches(".area-dropbtn");

  document.querySelectorAll(".area-dropdown").forEach(dropdown => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });

  if (isDropBtn) {
    const dropdown = e.target.closest(".area-dropdown");
    dropdown.classList.toggle("show");
  }
});

document.addEventListener("change", (e) => {
  if (e.target.matches('input[name="area"]')) {
    const dropdown = e.target.closest(".area-dropdown");
    const selected = Array.from(dropdown.querySelectorAll('input[name="area"]:checked'))
      .map(input => input.value)
      .join(", ");

    const button = dropdown.querySelector(".area-dropbtn");
    button.textContent = selected.length > 0 ? selected : "Select Areas";

    // Update Firebase with the new area of operation
    const row = dropdown.closest("tr");
    const rowId = parseInt(row.cells[0].textContent, 10);
    const updatedData = { areaOfOperation: selected.length > 0 ? selected : "Select Areas" };
    console.log(`Updating areaOfOperation for volunteerGroups/${rowId} to: ${updatedData.areaOfOperation}`);
    database.ref(`volunteerGroups/${rowId}`).update(updatedData)
      .then(() => {
        console.log(`Successfully updated areaOfOperation for volunteerGroups/${rowId}`);
        // No need to call fetchAndRenderTable since the real-time listener will handle updates
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Area of operation updated successfully!'
        });
      })
      .catch(error => {
        console.error("Error updating area of operation in Firebase:", error.code, error.message);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `Failed to update area of operation: ${error.message}`
        });
      });
  }

  if (e.target.matches('.calamity-select')) {
    const rowId = e.target.getAttribute('data-id');
    const newCalamity = e.target.value;

    // Ensure the user is authenticated before attempting the update
    const user = firebase.auth().currentUser;
    if (!user) {
      console.error("User not authenticated. Cannot update calamity type.");
      Swal.fire({
        icon: 'error',
        title: 'Authentication Error',
        text: 'User not authenticated. Please refresh the page and try again.'
      });
      return;
    }

    console.log(`Updating calamityType for volunteerGroups/${rowId} to: ${newCalamity}`);
    database.ref(`volunteerGroups/${rowId}`).update({ calamityType: newCalamity })
      .then(() => {
        console.log(`Successfully updated calamityType for volunteerGroups/${rowId}`);
        // No need to call fetchAndRenderTable since the real-time listener will handle updates
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Calamity type updated successfully!'
        });
      })
      .catch(error => {
        console.error("Error updating calamity type in Firebase:", error.code, error.message);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `Failed to update calamity type: ${error.message}`
        });
      });
  }
});

// Activation toggle
document.addEventListener("click", e => {
  const btn = e.target;

  if (btn.classList.contains("activation-btn")) {
    const rowId = btn.getAttribute('data-id');
    const record = data.find(row => row.no === parseInt(rowId));

    if (!record) {
      console.error(`Record with ID ${rowId} not found in local data`);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Volunteer group not found. Please refresh the page and try again.'
      });
      return;
    }

    // Ensure the user is authenticated before attempting the update
    const user = firebase.auth().currentUser;
    if (!user) {
      console.error("User not authenticated. Cannot update activation status.");
      Swal.fire({
        icon: 'error',
        title: 'Authentication Error',
        text: 'User not authenticated. Please refresh the page and try again.'
      });
      return;
    }

    const newStatus = record.status === "active" ? "inactive" : "active";
    record.status = newStatus;

    console.log(`Updating activation for volunteerGroups/${rowId} to: ${newStatus}`);
    database.ref(`volunteerGroups/${rowId}`).update({ activation: newStatus })
      .then(() => {
        console.log(`Successfully updated activation for volunteerGroups/${rowId}`);
        // No need to call fetchAndRenderTable since the real-time listener will handle updates
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Volunteer group ${newStatus === "active" ? "activated" : "deactivated"} successfully!`
        });
      })
      .catch(error => {
        console.error("Error updating activation in Firebase:", error.code, error.message);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `Failed to update activation: ${error.message}`
        });
      });
  }
});

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