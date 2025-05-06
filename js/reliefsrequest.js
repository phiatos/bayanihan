document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing script'); // Debug log

  // Firebase configuration
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

  // Initialize Firebase
  try {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully');
  } catch (error) {
      console.error('Firebase initialization failed:', error);
  }
  const database = firebase.database();

  // DOM elements
  const formPage1 = document.getElementById('form-page-1');
  const formPage2 = document.getElementById('form-page-2');
  const nextBtn = document.getElementById('nextBtn');
  const backBtn = document.getElementById('backBtn');
  const addItemBtn = document.getElementById('addItemBtn');
  const itemsTable = document.getElementById('itemsTable');
  const itemsTableBody = itemsTable ? itemsTable.querySelector('tbody') : null;
  const previewContact = document.getElementById('previewContact');
  const previewItemsTable = document.getElementById('previewItemsTable');

  // Page-1 inputs
  const contactPersonInput = document.getElementById('contactPerson');
  const contactNumberInput = document.getElementById('contactNumber');
  const emailInput = document.getElementById('email');
  const addressInput = document.getElementById('address');
  const cityInput = document.getElementById('city');
  const donationCategoryInput = document.getElementById('category');

  // Item inputs
  const itemNameInput = document.getElementById('itemName');
  const quantityInput = document.getElementById('quantity');
  const notesInput = document.getElementById('notes');

  // Verify DOM elements exist
  if (!formPage1 || !formPage2 || !nextBtn || !backBtn || !addItemBtn || !itemsTable || !itemsTableBody || !previewContact || !previewItemsTable || !contactPersonInput || !contactNumberInput || !emailInput || !addressInput || !cityInput || !donationCategoryInput || !itemNameInput || !quantityInput || !notesInput) {
      console.error('One or more DOM elements are missing:', {
          formPage1: !!formPage1,
          formPage2: !!formPage2,
          nextBtn: !!nextBtn,
          backBtn: !!backBtn,
          addItemBtn: !!addItemBtn,
          itemsTable: !!itemsTable,
          itemsTableBody: !!itemsTableBody,
          previewContact: !!previewContact,
          previewItemsTable: !!previewItemsTable,
          contactPersonInput: !!contactPersonInput,
          contactNumberInput: !!contactNumberInput,
          emailInput: !!emailInput,
          addressInput: !!addressInput,
          cityInput: !!cityInput,
          donationCategoryInput: !!donationCategoryInput,
          itemNameInput: !!itemNameInput,
          quantityInput: !!quantityInput,
          notesInput: !!notesInput
      });
      return;
  }

  const addedItems = [];
  let volunteerOrganization = "[Your Org]"; // Default value

  // Hide items table initially
  itemsTable.style.display = 'none';

    // Event listeners for real-time validation
    document.getElementById('contactPerson').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, '');  // Only allows letters and spaces
    });

    document.getElementById('contactNumber').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9+\-\s()]/g, '');  // Only allows numbers, plus, hyphens, spaces, and parentheses
    });

    document.getElementById('email').addEventListener('input', function(e) {
        // Email already validates input type, but we can prevent spaces as well
        this.value = this.value.replace(/\s/g, '');  // Remove spaces
    });

    document.getElementById('address').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^a-zA-Z0-9\s,.'-]/g, '');  // Allows letters, numbers, spaces, commas, periods, and hyphens
    });

    document.getElementById('city').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, '');  // Only allows letters and spaces
    });

    document.getElementById("category").addEventListener("change", function() {
        const selectedCategory = this.value;
        const itemName = document.getElementById("itemName");
        const quantity = document.getElementById("quantity");
        const notes = document.getElementById("notes");
  
        // Enable the item fields
        itemName.disabled = false;
        quantity.disabled = false;
        notes.disabled = false;
  
        // Adjust the items list based on the selected category
        const itemNameList = document.getElementById("itemNameList");
        const options = itemNameList.getElementsByTagName("option");
  
        // Remove all existing options
        while (itemNameList.firstChild) {
          itemNameList.removeChild(itemNameList.firstChild);
        }
  
        // Add relevant items for the selected category
        let items = [];
        if (selectedCategory === "Food") {
          items = ["Rice", "Canned Goods", "Water Bottles"];
        } else if (selectedCategory === "Clothing") {
          items = ["Blankets"];
        } else if (selectedCategory === "Medicine") {
          items = ["Medicine Kits"];
        } else if (selectedCategory === "Hygiene") {
          items = ["Hygiene Packs"];
        } else {
          items = ["Others"];
        }
  
        items.forEach(item => {
          const option = document.createElement("option");
          option.value = item;
          itemNameList.appendChild(option);
        });
      });
  

  // Function to fetch volunteer group based on contact person
  function fetchVolunteerGroup(contactPerson) {
      console.log('Fetching volunteer group for contact person:', contactPerson);
      database.ref('volunteerGroups').once('value', (snapshot) => {
          const volunteerGroups = snapshot.val();
          if (volunteerGroups) {
              let foundMatch = false;
              for (let key in volunteerGroups) {
                  const group = volunteerGroups[key];
                  if (group.contactPerson && group.contactPerson.toLowerCase() === contactPerson.toLowerCase()) {
                      volunteerOrganization = group.organization || "[Your Org]";
                      console.log('Volunteer group found:', volunteerOrganization);
                      foundMatch = true;
                      break;
                  }
              }
              if (!foundMatch) {
                  console.log('No matching volunteer group found, using default');
                  volunteerOrganization = "[Your Org]";
              }
          } else {
              console.log('No volunteer groups found in database');
              volunteerOrganization = "[Your Org]";
          }
      }).catch((error) => {
          console.error('Error fetching volunteer groups:', error);
          volunteerOrganization = "[Your Org]";
      });
  }

  // Listen for changes in the Contact Person input
  contactPersonInput.addEventListener('input', () => {
      const contactPerson = contactPersonInput.value.trim();
      if (contactPerson) {
          fetchVolunteerGroup(contactPerson);
      } else {
          volunteerOrganization = "[Your Org]";
          console.log('Contact person input cleared, resetting volunteer group to default');
      }
  });

  // Add Item button event listener
  addItemBtn.addEventListener('click', () => {
      console.log('Add Item button clicked'); // Debug log

      const name = itemNameInput.value.trim();
      const quantity = quantityInput.value.trim();
      const notes = notesInput.value.trim();

      console.log('Add Item inputs:', { name, quantity, notes }); // Debug log

      // Validation for item name and quantity
      if (!name) {
          console.log('Validation failed: Item name is empty');
          Swal.fire({
              icon: 'warning',
              title: 'Missing Item Name',
              text: 'Please enter the item name.',
          });
          return;
      }

      if (!quantity || parseInt(quantity) <= 0) {
          console.log('Validation failed: Invalid quantity', { quantity });
          Swal.fire({
              icon: 'warning',
              title: 'Invalid Quantity',
              text: 'Please enter a quantity greater than 0.',
          });
          return;
      }

      const itemIndex = addedItems.length;
      addedItems.push({ name, quantity, notes });
      console.log('Item added:', { name, quantity, notes, itemIndex }); // Debug log

      const tr = document.createElement('tr');
      tr.innerHTML = `
          <td id="prevItmName">${name}</td>
          <td id="prevQty">${quantity}</td>
          <td id="prevNotes">${notes}</td>
          <td><button type="button" class="delete-btn" id= "deleteItmBtn" data-index="${itemIndex}">Delete</button></td>
      `;
      itemsTableBody.appendChild(tr);

      // Show the table
      itemsTable.style.display = 'table';

      // Clear inputs
      itemNameInput.value = '';
      quantityInput.value = '';
      notesInput.value = '';
  });

  // Delete button event listener
  itemsTableBody.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) {
          console.log('Delete button clicked'); // Debug log
          const index = parseInt(e.target.getAttribute('data-index'));
          addedItems.splice(index, 1);

          // Re-render table
          renderItemsTable();
      }
  });

  function renderItemsTable() {
      console.log('Rendering items table'); // Debug log
      itemsTableBody.innerHTML = '';
      addedItems.forEach((item, index) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${item.notes}</td>
              <td><button type="button" class="delete-btn" data-index="${itemIndex}">Delete</button></td>
          `;
          itemsTableBody.appendChild(tr);
      });

      itemsTable.style.display = addedItems.length > 0 ? 'table' : 'none';
  }

  // Proceed button event listener
  nextBtn.addEventListener('click', () => {
      console.log('Proceed button clicked'); // Debug log

      const contactPerson = contactPersonInput.value.trim();
      const contactNumber = contactNumberInput.value.trim();
      const email = emailInput.value.trim();
      const address = addressInput.value.trim();
      const city = cityInput.value.trim();
      const donationCategory = donationCategoryInput.value;

      console.log('Proceed inputs:', {
          contactPerson,
          contactNumber,
          email,
          address,
          city,
          donationCategory,
          addedItemsLength: addedItems.length,
          volunteerOrganization
      }); // Debug log

      // Validation for contact fields
      if (!contactPerson) {
          console.log('Validation failed: Contact person is empty');
          Swal.fire({
              icon: 'warning',
              title: 'Missing Contact Person',
              text: 'Please enter the contact person’s name.',
          });
          return;
      }

      if (!contactNumber || !/^\d{10,}$/.test(contactNumber)) {
          console.log('Validation failed: Invalid contact number', { contactNumber });
          Swal.fire({
              icon: 'warning',
              title: 'Invalid Contact Number',
              text: 'Please enter a valid contact number (at least 10 digits).',
          });
          return;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          console.log('Validation failed: Invalid email', { email });
          Swal.fire({
              icon: 'warning',
              title: 'Invalid Email',
              text: 'Please enter a valid email address.',
          });
          return;
      }

      if (!address) {
          console.log('Validation failed: Address is empty');
          Swal.fire({
              icon: 'warning',
              title: 'Missing Address',
              text: 'Please enter the drop-off address.',
          });
          return;
      }

      if (!city) {
          console.log('Validation failed: City is empty');
          Swal.fire({
              icon: 'warning',
              title: 'Missing City',
              text: 'Please enter the city.',
          });
          return;
      }

      if (!donationCategory) {
          console.log('Validation failed: Donation category not selected');
          Swal.fire({
              icon: 'warning',
              title: 'Missing Category',
              text: 'Please select a donation category.',
          });
          return;
      }

      if (addedItems.length === 0) {
          console.log('Validation failed: No items added');
          Swal.fire({
              icon: 'warning',
              title: 'No Items Added',
              text: 'Please add at least one item before proceeding.',
          });
          return;
      }

      // Switch views
      formPage1.style.display = 'none';
      formPage2.style.display = 'block';
      console.log('Switched to form-page-2'); // Debug log

      // Render contact + category with the dynamically fetched volunteer organization
      previewContact.innerHTML = `
          <p><strong>Contact Person:</strong> ${contactPerson}</p>
          <p><strong>Contact Number:</strong> ${contactNumber}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Address:</strong> ${address}, ${city}</p>
          <p><strong>Donation Category:</strong> ${donationCategory}</p>
          <p><strong>Volunteer Organization:</strong> ${volunteerOrganization}</p>
      `;

      // Render items
      previewItemsTable.innerHTML = '';
      addedItems.forEach(item => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${item.name}</td><td>${item.quantity}</td><td>${item.notes}</td>`;
          previewItemsTable.appendChild(tr);
      });
  });

  // Back button event listener
  backBtn.addEventListener('click', () => {
      console.log('Back button clicked'); // Debug log
      formPage2.style.display = 'none';
      formPage1.style.display = 'block';
  });

  // Handle form submission to save data to Firebase
  formPage2.addEventListener('submit', (e) => {
      e.preventDefault();
      console.log('Submit button clicked'); // Debug log

      const contactPerson = contactPersonInput.value.trim();
      const contactNumber = contactNumberInput.value.trim();
      const email = emailInput.value.trim();
      const address = addressInput.value.trim();
      const city = cityInput.value.trim();
      const donationCategory = donationCategoryInput.value;

      // Create a new request object with the dynamically fetched volunteer organization
      const newRequest = {
          contactPerson,
          contactNumber,
          email,
          address,
          city,
          category: donationCategory,
          volunteerOrganization, // Use the dynamically fetched value
          items: addedItems,
          timestamp: firebase.database.ServerValue.TIMESTAMP
      };

      // Push the new request to the 'requestRelief/requests' node
      database.ref('requestRelief/requests').push(newRequest)
          .then(() => {
              console.log('Data saved to Firebase successfully');
              Swal.fire({
                  icon: 'success',
                  title: 'Request Submitted',
                  text: 'Your relief request has been successfully submitted!',
              }).then(() => {
                  // Reset the form and go back to the first page
                  formPage1.reset();
                  formPage2.reset();
                  addedItems.length = 0;
                  volunteerOrganization = "[Your Org]"; // Reset volunteer organization
                  renderItemsTable();
                  formPage2.style.display = 'none';
                  formPage1.style.display = 'block';
              });
          })
          .catch((error) => {
              console.error('Failed to save data to Firebase:', error);
              Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'Failed to submit request: ' + error.message,
              });
          });
  });

  function renderItemsTable() {
      console.log('Rendering items table'); // Debug log
      itemsTableBody.innerHTML = '';
      addedItems.forEach((item, index) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${item.notes}</td>
              <td><button type="button" class="delete-btn" data-index="${index}">Delete</button></td>
          `;
          itemsTableBody.appendChild(tr);
      });

      itemsTable.style.display = addedItems.length > 0 ? 'table' : 'none';
  }
});