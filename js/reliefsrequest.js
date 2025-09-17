// console.log = function () {};
// console.error = function () {};
// console.warn = function () {};

// Notify admin function (defined globally within the file)
const notifyAdmin = async (message, calamityType, location, details, requestId, senderName, organization) => {
    try {
        const identifier = `request_${requestId}_${Date.now()}`;
        const key = firebase.database().ref("notifications").push().key;
        await firebase.database().ref("notifications").child(key).set({
            message,
            calamityType: calamityType || null,
            location: location || null,
            details: details || null,
            eventId: null,
            requestId,
            senderName,
            organization,
            identifier,
            timestamp: Date.now(),
            read: false,
            type: "admin"
        });
    } catch (error) {
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyBkmXOJvnlBtzkjNyR6wyd9BgGM0BhN0L8",
      authDomain: "bayanihan-new-472410.firebaseapp.com",
      projectId: "bayanihan-new-472410",
      storageBucket: "bayanihan-new-472410.firebasestorage.app",
      messagingSenderId: "995982574131",
      appId: "1:995982574131:web:3d45e358fad330c276d946",
      measurementId: "G-CEVPTQZM9C",
      databaseURL: "https://bayanihan-new-472410-default-rtdb.asia-southeast1.firebasedatabase.app/"
    };

    // Initialize Firebase
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (error) {
    }
    const database = firebase.database();
    const auth = firebase.auth();

    // DOM elements
    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const itemsTable = document.getElementById('itemsTable');
    const previewContact = document.getElementById('previewContact');
    const previewItemsTable = document.getElementById('previewItemsTable');

    // Page-1 inputs
    const contactPersonInput = document.getElementById('contactPerson');
    const contactNumberInput = document.getElementById('contactNumber');
    const emailInput = document.getElementById('email');
    const addressInput = document.getElementById('address');
    const donationCategoryInput = document.getElementById('category');

    // 1. Get all the necessary elements
    const categorySelect = document.getElementById('category');
    const itemNameInput = document.getElementById('itemName');
    const quantityInput = document.getElementById('quantity');
    const notesInput = document.getElementById('notes');
    const addItemBtn = document.getElementById('addItemBtn');
    const itemsTableBody = document.querySelector('#itemsTable tbody');
    const noEntriesRow = document.getElementById('noEntriesRow');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = {
        'requests': document.getElementById('form-main-content').querySelector('form'),
        'my-requests': document.getElementById('my-requests-tab')
    };
    
    // Initial setup: display the 'requests' tab content by default
    document.getElementById('form-main-content').querySelector('form').style.display = 'block';

    tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;

        // Remove 'active' class from all buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));

        // Hide all tab contents
        for (const key in tabContents) {
            tabContents[key].style.display = 'none';
        }

        // Add 'active' class to the clicked button
        button.classList.add('active');

        // Show the corresponding tab content
        if (tabContents[tabName]) {
            tabContents[tabName].style.display = 'block';
        }
    });
});

    function updateRequestCounter() {
  const requestsListContainer = document.querySelector('#my-requests-tab .requests-list-container');
  const counter = document.getElementById('requests-counter');
  if (!requestsListContainer || !counter) return;

  const count = requestsListContainer.querySelectorAll('.request-card').length;
  counter.textContent = `Total of ${count} Request${count !== 1 ? 's' : ''}`;
}

    const requestsListContainer = document.querySelector('.requests-list-container');
    // Function to fetch and display user's requests
    function fetchUserRequests() {
    const user = auth.currentUser;
    if (user) {
        const userUid = user.uid;
        const requestsRef = firebase.database().ref('requestRelief/requests');

        // Filter by userUid
        requestsRef.orderByChild('userUid').equalTo(userUid).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    requestsListContainer.innerHTML = ''; // Clear existing
                    snapshot.forEach((childSnapshot) => {
                        const requestData = childSnapshot.val();
                        const requestId = childSnapshot.key;
                        createRequestCard(requestId, requestData);
                    });

                     updateRequestCounter();

                } else {
                    requestsListContainer.innerHTML = `
                        <p style="text-align: center; color: #888; padding: 20px;">
                            No requests found. Submit a new request using the form.
                        </p>`;
                         updateRequestCounter();
                }
            })
            .catch((error) => {
                console.error("Error fetching data:", error);
                requestsListContainer.innerHTML = `
                    <p style="text-align: center; color: #dc3545; padding: 20px;">
                        Error loading requests. Please try again later.
                    </p>`;
                     updateRequestCounter();
            });
    } else {
        requestsListContainer.innerHTML = `
            <p style="text-align: center; color: #555; padding: 20px;">
                Please log in to view your requests.
            </p>`;
             updateRequestCounter();
    }
}

    // Call fetchUserRequests when the "My Requests" tab is clicked
    document.querySelector('button[data-tab="my-requests"]').addEventListener('click', fetchUserRequests);

    // Function to create and append a single request card
    function createRequestCard(requestId, data) {
        const card = document.createElement('div');
        card.className = 'request-card';
        card.setAttribute('data-request-id', requestId);

        const timestamp = new Date(data.timestamp).toLocaleString();
        
        let itemsHtml = '';
        if (data.items && data.items.length > 0) {
            itemsHtml = data.items.map(item => `
            <li>
                <strong>${item.name}:</strong> ${item.quantity}
                ${item.notes && item.notes !== 'N/A' ? `<br><small>Notes: ${item.notes}</small>` : ''}
            </li>
        `).join('');
        } else {
            itemsHtml = '<li>No specific items listed.</li>';
        }

        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">Request for <span class="card-category">${data.category}</span></h3>
                <span class="card-status status-${data.status || 'Submitted'}">${data.status || 'SUBMITTED'}</span>
            </div>
            <div class="card-body">
              <div class="card-body-wrapper">
                <div class="left-column">
                  <div class="contact-info">
                    <h4>Contact Details</h4>
                    <p><strong>Contact Person:</strong> <span class="contact-name">${data.contactPerson}</span></p>
                    <p><strong>Organization:</strong> <span class="contact-org">${data.volunteerOrganization || 'N/A'}</span></p>
                    <p><strong>Contact Number:</strong> <span class="contact-number">${data.contactNumber}</span></p>
                    <p><strong>Email:</strong> <span class="contact-email">${data.email}</span></p>
                  </div>
                  <div class="address-info">
                    <h4>Drop-off Location</h4>
                    <p><strong>Address:</strong> <span class="address-text">${data.address?.formattedAddress}</span></p>
                    <p><strong>Submitted On:</strong> <span class="timestamp-text">${timestamp}</span></p>
                  </div>
                  <div class="items-info">
                    <h4>Requested Items</h4>
                    <ul class="items-list">
                      ${itemsHtml}
                    </ul>
                  </div>
                </div>
                <div class="right-column">
                    
                </div>
              </div>
            </div>
            
        `;

        requestsListContainer.appendChild(card);
    }
    
// --- Helper function to update button and fields state ---
function updateState() {
    const isCategorySelected = categorySelect.value !== '';
    const isItemNameFilled = itemNameInput.value.trim() !== '';
    const isQuantityFilled = quantityInput.value.trim() !== '' && Number(quantityInput.value) > 0;

    itemNameInput.disabled = !isCategorySelected;
    quantityInput.disabled = !isCategorySelected;
    notesInput.disabled = !isCategorySelected;

    addItemBtn.disabled = !(isCategorySelected && isItemNameFilled && isQuantityFilled);
}

// Initial State
updateState();

// Event listeners for updates
categorySelect.addEventListener('change', updateState);
itemNameInput.addEventListener('input', updateState);
quantityInput.addEventListener('input', updateState);

// Add Item
addItemBtn.addEventListener('click', function() {
    if (addItemBtn.disabled) return;

    if (noEntriesRow && itemsTableBody.contains(noEntriesRow)) {
        itemsTableBody.removeChild(noEntriesRow);
    }

    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${itemNameInput.value.trim()}</td>
        <td>${quantityInput.value.trim()}</td>
        <td>${notesInput.value.trim() || 'N/A'}</td>
        <td><button class="delete-btn">Delete</button></td>
    `;

    itemsTableBody.appendChild(newRow);

    // Add to addedItems array
    addedItems.push({
      name: itemNameInput.value.trim(),
      quantity: quantityInput.value.trim(),
      notes: notesInput.value.trim() || 'N/A'
    });

    // Clear fields
    itemNameInput.value = '';
    quantityInput.value = '';
    notesInput.value = '';

    updateState();
    itemNameInput.focus();
});

// Delete functionality
itemsTableBody.addEventListener('click', function(event) {
    if (event.target.classList.contains('delete-btn')) {
        const rowToRemove = event.target.closest('tr');
        const itemName = rowToRemove.children[0].textContent.trim();
        const quantity = Number(rowToRemove.children[1].textContent.trim());
        const notes = rowToRemove.children[2].textContent.trim();

        // Remove from addedItems array
        const index = addedItems.findIndex(item =>
            item.name === itemName &&
            item.quantity === quantity &&
            item.notes === notes
        );
        if (index > -1) {
            addedItems.splice(index, 1);
        }

        // Remove row from table
        rowToRemove.remove();

        // If no rows left, re-add "no entries yet" row
        if (itemsTableBody.querySelectorAll('tr').length === 0) {
            itemsTableBody.appendChild(noEntriesRow);
            noEntriesRow.style.display = '';
        }
    }
});
    // Verify DOM elements exist
    const elements = {
        'form-page-1': formPage1, 'form-page-2': formPage2, 'nextBtn': nextBtn, 'backBtn': backBtn,
        'itemsTable': itemsTable, 'itemsTableBody': itemsTableBody, 'previewContact': previewContact,
        'previewItemsTable': previewItemsTable, 'contactPerson': contactPersonInput, 'contactNumber': contactNumberInput,
        'email': emailInput, 'address': addressInput, 'category': donationCategoryInput, 'itemName': itemNameInput, 'quantity': quantityInput,
        'notes': notesInput, 'addItemBtn': addItemBtn
    };

    for (const id in elements) {
        if (!elements[id]) {
            console.error(`Error: Missing DOM element with ID "${id}". Script execution stopped.`);
            return;
        }
    }

    const addedItems = [];
    let userUid = null;
    let volunteerOrganization = "[Unknown Org]";

    // Variables for inactivity detection
    let inactivityTimeout;
    const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

    // Function to reset the inactivity timer
    function resetInactivityTimer() {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    }

    // Function to check for inactivity and prompt the user
    function checkInactivity() {
        Swal.fire({
            title: 'Are you still there?',
            text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Stay Login',
            cancelButtonText: 'Log Out',
            allowOutsideClick: false,
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                resetInactivityTimer(); // User chose to continue, reset the timer
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                // User chose to log out
                auth.signOut().then(() => {
                    window.location.href = "../pages/login.html"; // Redirect to login page
                }).catch((error) => {
                    Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
                });
            }
        });
    }

    // Attach event listeners to detect user activity
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });

    // Updated auth.onAuthStateChanged with role and activation checks
    auth.onAuthStateChanged(async user => {
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'Please log in to submit a relief request.',
            }).then(() => {
                window.location.href = '../pages/login.html'; // Redirect to login page
            });
            return;
        }

        resetInactivityTimer();
        userUid = user.uid;

        try {
            // Fetch user data from the database
            const userSnapshot = await database.ref(`users/${userUid}`).once('value');
            const userData = userSnapshot.val();

            console.log('User data fetched from database:', userData);

            if (!userData) {
                Swal.fire({
                    icon: 'error',
                    title: 'User Data Missing',
                    text: 'Your user profile is incomplete. Please contact an administrator.',
                }).then(() => {
                    window.location.href = '../pages/login.html';
                });
                return;
            }

            // Password reset check
            const passwordNeedsReset = userData.password_needs_reset || false;
            const profilePage = 'profile.html';
            if (passwordNeedsReset) {
                Swal.fire({
                    icon: 'error',
                    title: 'Password Change Required',
                    text: 'For security reasons, please change your password. You will be redirected to your profile.',
                    allowOutsideClick: false,
                    timer: 1600,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    customClass: {
                        popup: 'swal2-popup-error-clean',
                        title: 'swal2-title-error-clean',
                        htmlContainer: 'swal2-text-error-clean'
                    }
                }).then(() => {
                    window.location.replace(`../pages/${profilePage}`);
                });
                return;
            }

            // Get user role and organization
            const currentUserRole = userData.role;
            volunteerOrganization = userData.organization || 'Admin';

            // Check if user is AB ADMIN
            if (currentUserRole === 'AB ADMIN') {
                // Pre-fill form fields
                contactPersonInput.value = userData.firstName + " " + userData.lastName || '';
                contactNumberInput.value = userData.mobile || '';
                emailInput.value = userData.email || '';
            }
            // Check if user is ABVN
            else if (currentUserRole === 'ABVN') {
                if (volunteerOrganization !== 'Not Assigned') {
                    // Check for active activations
                    const organizationActivationsSnapshot = await database.ref("activations")
                        .orderByChild("organization")
                        .equalTo(volunteerOrganization)
                        .once('value');

                    let organizationHasActiveActivations = false;
                    organizationActivationsSnapshot.forEach(childSnapshot => {
                        if (childSnapshot.val().status === "active") {
                            organizationHasActiveActivations = true;
                            return true; // Exit loop early
                        }
                    });

                    if (organizationHasActiveActivations) {
                        // Pre-fill form fields
                        contactPersonInput.value = userData.organization || '';
                        contactNumberInput.value = userData.mobile || '';
                        emailInput.value = userData.email || '';
                    } else {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Organization Inactive',
                            text: 'Your organization has no active operations. Redirecting to dashboard.',
                            allowOutsideClick: false,
                            showConfirmButton: true,
                            confirmButtonText: 'OK',
                            customClass: {
                                popup: 'swal2-popup-warning-clean',
                                title: 'swal2-title-warning-clean',
                                htmlContainer: 'swal2-text-warning-clean',
                                confirmButton: 'my-warning-button'
                            },
                            didClose: () => {
                                window.location.href = '../pages/dashboard.html';
                            }
                        });
                    }
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Organization Not Assigned',
                        text: 'Your account is not associated with an organization. Redirecting to dashboard.',
                        didClose: () => {
                            window.location.href = '../pages/dashboard.html';
                        }
                    });
                }
            }
            // Handle unsupported roles
            else {
                Swal.fire({
                    icon: 'error',
                    title: 'Unauthorized Access',
                    text: 'Your role does not permit access. Redirecting to dashboard.',
                    didClose: () => {
                        window.location.href = '../pages/dashboard.html';
                    }
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'Failed to verify account status. Please try logging in again.',
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
        }
    });

  // --- Quantity Formatter ---
  function formatLargeNumber(numStr) {
    let num = BigInt(numStr || "0");
    const trillion = 1_000_000_000_000n;
    const billion = 1_000_000_000n;
    const million = 1_000_000n;
    const thousand = 1_000n;

    if (num >= trillion) {
      return (Number(num) / Number(trillion)).toFixed(2).replace(/\.?0+$/, '') + 'T';
    } else if (num >= billion) {
      return (Number(num) / Number(billion)).toFixed(2).replace(/\.?0+$/, '') + 'B';
    } else if (num >= million) {
      return (Number(num) / Number(million)).toFixed(2).replace(/\.?0+$/, '') + 'M';
    } else if (num >= thousand) {
      return (Number(num) / Number(thousand)).toFixed(2).replace(/\.?0+$/, '') + 'k';
    }
    return num.toString();
  }

  // --- Validation helpers ---
  function markError(input, message) {
    input.classList.add("input-error");
    let errorMsg = input.parentElement.querySelector(".error-text");
    if (!errorMsg) {
      errorMsg = document.createElement("span");
      errorMsg.className = "error-text";
      input.insertAdjacentElement("afterend", errorMsg);
    }
    errorMsg.textContent = message;
  }

  function clearError(input) {
    input.classList.remove("input-error");
    const errorMsg = input.parentElement.querySelector(".error-text");
    if (errorMsg) errorMsg.remove();
  }

  // --- Enforce min=1 and live formatting for quantity inputs ---
  function validateAndFormatInputs() {
    const inputs = document.querySelectorAll(".number-input");

    inputs.forEach(input => {
      input.addEventListener("input", () => {
        let value = input.value.replace(/[^0-9]/g, ""); // only digits
        let num = parseInt(value || "0", 10);

        if (isNaN(num) || num < 1) {
          num = 1; // enforce minimum
        }

        input.value = num; // keep numeric for submission
        input.title = formatLargeNumber(num.toString()); // show readable format on hover
      });

      input.addEventListener("blur", () => {
        let num = parseInt(input.value || "0", 10);
        if (isNaN(num) || num < 1) {
          num = 1;
        }
        input.value = num;
        input.title = formatLargeNumber(num.toString());
      });
    });
  }
  validateAndFormatInputs();

  // --- Live validation clearing ---
  ["contactPerson", "contactNumber", "address", "category"].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => clearError(input));
    if (input.tagName === "SELECT") {
      input.addEventListener("change", () => clearError(input));
    }
  });

  nextBtn.addEventListener("click", () => {
    let valid = true;
    let messages = [];

    // Clear previous errors
    document.querySelectorAll(".error-text").forEach(el => el.remove());
    document.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));

    // 1. Organization Name
    const contactPerson = document.getElementById("contactPerson");
    if (contactPerson.value.trim() === "") {
      valid = false;
      messages.push("Organization Name is required.");
      markError(contactPerson, "Organization Name is required.");
    }

    // 2. Contact Number
    const contactNumber = document.getElementById("contactNumber");
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(contactNumber.value.trim())) {
      valid = false;
      messages.push("Contact Number must be exactly 11 digits.");
      markError(contactNumber, "Contact Number must be exactly 11 digits.");
    }

    // 3. Address
    const address = document.getElementById("address");
    if (address.value.trim() === "") {
      valid = false;
      messages.push("Drop-off Address is required.");
      markError(address, "Drop-off Address is required.");
    }

    // 4. Category
    const category = document.getElementById("category");
    if (!category.value) {
      valid = false;
      messages.push("Please select a Request Category.");
      markError(category, "Please select a Request Category.");
    }

    // 5. Items table
    const itemsTable = document.querySelectorAll("#itemsTable tbody tr");
    if (itemsTable.length === 1 && document.getElementById("noEntriesRow")) {
      valid = false;
      messages.push("Please add at least one requested item.");
    }

    // --- Stop if invalid ---
    if (!valid) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        html: messages.join("<br>"),
      });
      return;
    }

    // ✅ If valid → proceed
    const email = document.getElementById("email");
    previewContact.innerHTML = `
      <p><strong>Organization Name:</strong> ${contactPerson.value}</p>
      <p><strong>Contact Number:</strong> ${contactNumber.value}</p>
      <p><strong>Email:</strong> ${email.value}</p>
      <p><strong>Drop-off Address:</strong> ${address.value}</p>
      <p><strong>Request Category:</strong> ${category.value}</p>
    `;

    // --- Collect items ---
    const itemsBody = document.getElementById("itemsTable").querySelector("tbody");
    previewItemsTable.innerHTML = "";
    const rows = itemsBody.querySelectorAll("tr");
    rows.forEach(row => {
      if (row.id === "noEntriesRow") return;
      const cols = row.querySelectorAll("td");
      if (cols.length >= 3) {
        const itemName = cols[0].textContent.trim();
        const qty = cols[1].textContent.trim();
        const notes = cols[2].textContent.trim();

        const previewRow = document.createElement("tr");
        previewRow.innerHTML = `
          <td>${itemName}</td>
          <td>${formatLargeNumber(qty)}</td>
          <td>${notes}</td>
        `;
        previewItemsTable.appendChild(previewRow);
      }
    });

    // Switch to page 2
    formPage1.style.display = "none";
    formPage2.style.display = "block";
  });

  backBtn.addEventListener("click", () => {
    formPage2.style.display = "none";
    formPage1.style.display = "block";
  });

  // --- SUBMISSION LOGIC ---
  formPage2.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!userUid) {
      Swal.fire({
        icon: "error",
        title: "Authentication Error",
        text: "User not authenticated. Please log in again.",
      }).then(() => {
        window.location.href = "../pages/login.html";
      });
      return;
    }

    // Disable button + show loading text
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const contactPerson = document.getElementById("contactPerson").value.trim();
    const contactNumber = document.getElementById("contactNumber").value.trim();
    const email = document.getElementById("email").value.trim();
    const formattedAddress = document.getElementById("address").value.trim();
    const category = document.getElementById("category").value;
    const latitude = document.getElementById("latitude").value || null;
    const longitude = document.getElementById("longitude").value || null;

    // Collect items from addedItems array
    if (addedItems.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Items",
        text: "Please add at least one item before submitting.",
      });
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
      return;
    }

    const newRequest = {
      contactPerson,
      contactNumber,
      email,
      category,
      volunteerOrganization,
      userUid,
      address: {
        formattedAddress,
        latitude,
        longitude,
      },
      items: addedItems.map(item => ({
        ...item,
        quantity: Number(item.quantity)
      })),
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      donationDate: new Date().toISOString(),
      status: "Pending"
    };

    // Sample data to populate the database
    const sampleRequests = [
      {
        contactPerson: `${contactPerson} (Sample 1)`,
        contactNumber: "09123456789",
        email: `sample1@${email.split('@')[1]}`,
        category: "Medical Supplies",
        volunteerOrganization,
        userUid,
        address: {
          formattedAddress: "123 Sample St, Quezon City, Metro Manila",
          latitude: "14.6760",
          longitude: "121.0437"
        },
        items: [
          { name: "Bandages", quantity: 100, notes: "Sterile" },
          { name: "Antiseptics", quantity: 50, notes: "Alcohol-based" }
        ],
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        donationDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: "Pending"
      },
      {
        contactPerson: `${contactPerson} (Sample 2)`,
        contactNumber: "09876543210",
        email: `sample2@${email.split('@')[1]}`,
        category: "Food Supplies",
        volunteerOrganization,
        userUid,
        address: {
          formattedAddress: "456 Relief Ave, Manila, Metro Manila",
          latitude: "14.5995",
          longitude: "120.9842"
        },
        items: [
          { name: "Canned Goods", quantity: 200, notes: "Assorted" },
          { name: "Rice", quantity: 50, notes: "50kg sacks" }
        ],
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        donationDate: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
        status: "Approved"
      },
      {
        contactPerson: `${contactPerson} (Sample 3)`,
        contactNumber: "09712345678",
        email: `sample3@${email.split('@')[1]}`,
        category: "Clothing",
        volunteerOrganization,
        userUid,
        address: {
          formattedAddress: "789 Aid Rd, Pasig City, Metro Manila",
          latitude: "14.5764",
          longitude: "121.0851"
        },
        items: [
          { name: "Blankets", quantity: 75, notes: "Warm" },
          { name: "Jackets", quantity: 30, notes: "Adult sizes" }
        ],
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        donationDate: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
        status: "Delivered"
      }
    ];

    const requestRef = database.ref("requestRelief/requests").push();
    const userRequestRef = database.ref(`users/${userUid}/requests/${requestRef.key}`);

    try {
      // Submit the user's request
      await Promise.all([
        requestRef.set(newRequest),
        userRequestRef.set(newRequest)
      ]);

      // Notify admin for user's request
      const message = `New relief request submitted by ${contactPerson} from ${volunteerOrganization} for ${category}.`;
      await notifyAdmin(message, null, null, null, requestRef.key, contactPerson, volunteerOrganization);

      // Submit sample requests
      const samplePromises = sampleRequests.map(async (sampleRequest) => {
        const sampleRequestRef = database.ref("requestRelief/requests").push();
        const sampleUserRequestRef = database.ref(`users/${userUid}/requests/${sampleRequestRef.key}`);
        await Promise.all([
          sampleRequestRef.set(sampleRequest),
          sampleUserRequestRef.set(sampleRequest)
        ]);
        const sampleMessage = `Sample relief request submitted by ${sampleRequest.contactPerson} from ${volunteerOrganization} for ${sampleRequest.category}.`;
        await notifyAdmin(sampleMessage, null, null, null, sampleRequestRef.key, sampleRequest.contactPerson, volunteerOrganization);
      });

      await Promise.all(samplePromises);

      Swal.fire({
        icon: "success",
        title: "Request Submitted",
        text: "Your relief request and sample data have been successfully submitted!",
        confirmButtonText: "OK"
      }).then(() => {
        formPage1.reset();
        formPage2.reset();
        addedItems.length = 0;
        itemsTableBody.innerHTML = '';
        itemsTableBody.appendChild(noEntriesRow);
        noEntriesRow.style.display = '';
        formPage2.style.display = "none";
        formPage1.style.display = "block";
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to submit request: " + error.message,
      });
    } finally {
      // Re-enable button
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });

  // Event listeners for real-time validation
  document.getElementById('contactPerson').addEventListener('input', function () {
    this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
    // Auto-capitalize the first letter of each word
    this.value = this.value.replace(/\b\w/g, char => char.toUpperCase());
  });

  document.getElementById('contactNumber').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, ''); // remove non-digits
  });

  // Validate on blur
  contactNumberInput.addEventListener('blur', validateContactNumber);

  // Optional: prevent invalid input early
  contactNumberInput.addEventListener('input', function () {
    this.value = this.value.replace(/[^0-9]/g, '');
  });

  document.getElementById('email').addEventListener('input', function () {
    this.value = this.value.replace(/\s/g, '');
  });
});

let map, marker;

// Modal elements
const modal = document.getElementById('mapModal');
const pinBtn = document.getElementById('pinBtn');
const closeBtn = document.querySelector('.closeBtn');
const confirmBtn = document.getElementById('confirmLocationBtn');
const addressInput = document.getElementById('address');
const mapSearch = document.getElementById('mapSearch');
const suggestionsContainer = document.getElementById('suggestions');

// Initialize Leaflet map when pin button is clicked
pinBtn.addEventListener('click', () => {
  modal.style.display = 'flex';

  if (!map) {
    // Initialize Leaflet map
    map = L.map('map').setView([14.5995, 120.9842], 13); // Manila default

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add draggable marker
    marker = L.marker([14.5995, 120.9842], { draggable: true }).addTo(map);

    // Autocomplete search with suggestions
    mapSearch.addEventListener('input', debounce(async () => {
      const query = mapSearch.value;
      suggestionsContainer.innerHTML = ''; // Clear previous suggestions
      if (query.length < 3) return;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        const results = await response.json();
        if (results.length > 0) {
          results.forEach((result) => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion-item';
            suggestion.textContent = result.display_name;
            suggestion.addEventListener('click', () => {
              map.setView([result.lat, result.lon], 13);
              marker.setLatLng([result.lat, result.lon]);
              document.getElementById('latitude').value = result.lat;
              document.getElementById('longitude').value = result.lon;
              mapSearch.value = result.display_name;
              suggestionsContainer.innerHTML = ''; // Clear suggestions
            });
            suggestionsContainer.appendChild(suggestion);
          });
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 500));

    // Clear suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!suggestionsContainer.contains(e.target) && e.target !== mapSearch) {
        suggestionsContainer.innerHTML = '';
      }
    });

    // Click map to move marker
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      document.getElementById('latitude').value = e.latlng.lat;
      document.getElementById('longitude').value = e.latlng.lng;
      suggestionsContainer.innerHTML = ''; // Clear suggestions
    });

    // Drag marker to update lat/lng
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      document.getElementById('latitude').value = position.lat;
      document.getElementById('longitude').value = position.lng;
    });
  }
});

// Close modal
closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  suggestionsContainer.innerHTML = ''; // Clear suggestions
});

// Confirm location and reverse geocode
confirmBtn.addEventListener('click', async () => {
  if (marker) {
    const position = marker.getLatLng();
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`
      );
      const data = await response.json();
      if (data.display_name) {
        addressInput.value = data.display_name;
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  }
  modal.style.display = 'none';
  suggestionsContainer.innerHTML = ''; // Clear suggestions
});

// Close modal if user clicks outside
window.addEventListener('click', (event) => {
  if (event.target == modal) {
    modal.style.display = 'none';
    suggestionsContainer.innerHTML = ''; // Clear suggestions
  }
});

// Debounce function to limit API calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}