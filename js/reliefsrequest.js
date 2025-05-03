document.addEventListener('DOMContentLoaded', () => {
    const formPage1           = document.getElementById('form-page-1');
    const formPage2           = document.getElementById('form-page-2');
    const nextBtn             = document.getElementById('nextBtn');
    const backBtn             = document.getElementById('backBtn');
    const addItemBtn          = document.getElementById('addItemBtn');
    const itemsTable          = document.getElementById('itemsTable');
    const itemsTableBody      = itemsTable.querySelector('tbody');
    const previewContact      = document.getElementById('previewContact');
    const previewItemsTable   = document.getElementById('previewItemsTable');
  
    // Page-1 inputs
    const contactPersonInput    = document.getElementById('contactPerson');
    const contactNumberInput    = document.getElementById('contactNumber');
    const emailInput            = document.getElementById('email');
    const addressInput          = document.getElementById('address');
    const cityInput             = document.getElementById('city');
    const donationCategoryInput = document.getElementById('category');
  
    // Item inputs
    const itemNameInput = document.getElementById('itemName');
    const quantityInput = document.getElementById('quantity');
    const notesInput    = document.getElementById('notes');
  
    const addedItems = [];
  
    // hide items table initially
    itemsTable.style.display = 'none';
  
    addItemBtn.addEventListener('click', () => {
      const name     = itemNameInput.value.trim();
      const quantity = quantityInput.value.trim();
      const notes    = notesInput.value.trim();
  
      if (!name || !quantity) {
        return Swal.fire("Please enter both item name and quantity.");
      }
  
      addedItems.push({ name, quantity, notes });
  
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${name}</td><td>${quantity}</td><td>${notes}</td>`;
      itemsTableBody.appendChild(tr);
  
      // show the table
      itemsTable.style.display = 'table';
  
      // clear fields
      itemNameInput.value = '';
      quantityInput.value = '';
      notesInput.value = '';
    });
  
    nextBtn.addEventListener('click', () => {
      const contactPerson    = contactPersonInput.value.trim();
      const contactNumber    = contactNumberInput.value.trim();
      const email            = emailInput.value.trim();
      const address          = addressInput.value.trim();
      const city             = cityInput.value.trim();
      const donationCategory = donationCategoryInput.value;
  
      // validations
      if (!contactPerson || !contactNumber || !email || !address || !city || !donationCategory) {
        return Swal.fire("Please fill out all contact fields and select a donation category.");
      }
      if (addedItems.length === 0) {
        return Swal.fire("Please add at least one item before proceeding.");
      }
  
      // switch views
      formPage1.style.display = 'none';
      formPage2.style.display = 'block';
  
      // render contact + category
      previewContact.innerHTML = `
        <p><strong>Contact Person:</strong> ${contactPerson}</p>
        <p><strong>Contact Number:</strong> ${contactNumber}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Address:</strong> ${address}, ${city}</p>
        <p><strong>Donation Category:</strong> ${donationCategory}</p>
        <p><strong>Volunteer Organization:</strong> [Your Org]</p>
      `;
  
      // render items
      previewItemsTable.innerHTML = '';
      addedItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.name}</td><td>${item.quantity}</td><td>${item.notes}</td>`;
        previewItemsTable.appendChild(tr);
      });
    });
  
    backBtn.addEventListener('click', () => {
      formPage2.style.display = 'none';
      formPage1.style.display = 'block';
    });
  });
  