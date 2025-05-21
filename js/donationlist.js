document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('#donationTable tbody');
  let donations = JSON.parse(localStorage.getItem('donations')) || [];

  function renderTable() {
    tableBody.innerHTML = ''; // Clear existing rows

    donations.forEach((donation, index) => {
      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${donation.donationDrive}</td>
        <td>${donation.contactPerson}</td>
        <td>${donation.contactNumber}</td>
        <td>${donation.accountNumber}</td>
        <td>${donation.accountName}</td>
        <td>${donation.dropOff}</td>
        <td>
          <button class="view-btn" data-index="${index}">View</button>
          <button class="delete-btn" data-index="${index}">Delete</button>
        </td>
      `;

      tableBody.appendChild(row);
    });

    attachEventListeners();
  }

  function attachEventListeners() {
    // View
    document.querySelectorAll('.view-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        const data = donations[index];

        Swal.fire({
          title: data.donationDrive,
          html: `
            <p><strong>Contact Person:</strong> ${data.contactPerson}</p>
            <p><strong>Contact Number:</strong> ${data.contactNumber}</p>
            <p><strong>GCash Account Number:</strong> ${data.accountNumber}</p>
            <p><strong>GCash Account Name:</strong> ${data.accountName}</p>
            <p><strong>Drop-off Location:</strong> ${data.dropOff}</p>
            ${data.facebookLink ? `<p><strong>Link:</strong> <a href="${data.facebookLink}" target="_blank">Visit Page</a></p>` : ''}
            ${data.image ? `<img src="${data.image}" alt="Donation Image" style="max-width: 100%; margin-top: 10px;" />` : ''}
          `,
          icon: 'info',
          confirmButtonText: 'Close'
        });
      });
    });

    // Delete
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        Swal.fire({
          title: 'Are you sure?',
          text: "This will remove the donation permanently.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, delete it!',
        }).then((result) => {
          if (result.isConfirmed) {
            donations.splice(index, 1);
            localStorage.setItem('donations', JSON.stringify(donations));
            renderTable();
            Swal.fire('Deleted!', 'Donation has been deleted.', 'success');
          }
        });
      });
    });
  }

  renderTable();
});
