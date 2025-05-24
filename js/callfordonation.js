document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole'); // Assuming user role is stored in localStorage

  let donations = JSON.parse(localStorage.getItem('donations')) || [];
  let filteredReports = donations;
  let currentPage = 1;
  const entriesPerPage = 10;
  let viewingApproved = false;

  // DOM elements
  const searchInput = document.getElementById('searchInput');
  const regionSelect = document.getElementById('region');
  const provinceSelect = document.getElementById('province');
  const citySelect = document.getElementById('city');
  const barangaySelect = document.getElementById('barangay');
  const sortSelect = document.getElementById('sortSelect');
  const tableBody = document.querySelector('#donationTable tbody');
  const entriesInfo = document.getElementById('entriesInfo');
  const pagination = document.getElementById('pagination');
  const donationForm = document.getElementById('form-container-1'); // Corrected to form-container-1
  const submitButton = document.getElementById('nextBtn');

  const exportCsvButton = document.getElementById('exportBtn');

  // Input fields to display selected text
  const regionTextInput = document.getElementById('region-text');
  const provinceTextInput = document.getElementById('province-text');
  const cityTextInput = document.getElementById('city-text');
  const barangayTextInput = document.getElementById('barangay-text');


  var my_handlers = {
      // Function to load all regions initially
      fill_regions: function() {
          if (regionTextInput) regionTextInput.value = '';
          if (provinceTextInput) provinceTextInput.value = '';
          if (cityTextInput) cityTextInput.value = '';
          if (barangayTextInput) barangayTextInput.value = '';

          regionSelect.innerHTML = '<option selected="true" disabled>Choose Region</option>';
          regionSelect.selectedIndex = 0;

          provinceSelect.innerHTML = '<option selected="true" disabled></option>';
          provinceSelect.selectedIndex = 0;

          citySelect.innerHTML = '<option selected="true" disabled></option>';
          citySelect.selectedIndex = 0;

          barangaySelect.innerHTML = '<option selected="true" disabled></option>';
          barangaySelect.selectedIndex = 0;

          // Use the path relative to the HTML document
          // (e.g., if HTML in 'pages/', JSON in 'js/', path is '../js/region.json')
          const url = '../js/region.json';

          // *** REPLACED $.getJSON with fetch API ***
          fetch(url)
              .then(response => {
                  if (!response.ok) { // Check if the HTTP request was successful (e.g., 200 OK)
                      throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                  }
                  return response.json(); // Parse the JSON response
              })
              .then(data => {
                  console.log("Region data loaded (Vanilla JS):", data); // FOR DEBUGGING: Check what's loaded

                  data.sort(function(a, b) {
                      return a.region_name.localeCompare(b.region_name);
                  });

                  // *** REPLACED $.each with forEach ***
                  data.forEach(entry => {
                      const opt = document.createElement('option');
                      opt.value = entry.region_code;
                      opt.textContent = entry.region_name;
                      regionSelect.appendChild(opt);
                  });
              })
              .catch(error => { // Catch any errors during the fetch operation
                  console.error("Request for region.json Failed (Vanilla JS): " + error.message);
                  console.error("Fetch error object: ", error);
              });
      },
      // Function to load provinces based on selected region
      fill_provinces: function() {
          var region_code = regionSelect.value;
          // Use textContent instead of jQuery's .text()
          var region_text = regionSelect.options[regionSelect.selectedIndex].textContent;
          if (regionTextInput) regionTextInput.value = region_text;

          if (provinceTextInput) provinceTextInput.value = '';
          if (cityTextInput) cityTextInput.value = '';
          if (barangayTextInput) barangayTextInput.value = '';

          provinceSelect.innerHTML = '<option selected="true" disabled>Choose State/Province</option>';
          provinceSelect.selectedIndex = 0;

          citySelect.innerHTML = '<option selected="true" disabled></option>';
          citySelect.selectedIndex = 0;

          barangaySelect.innerHTML = '<option selected="true" disabled></option>';
          barangaySelect.selectedIndex = 0;

          const url = '../province.json';

          // *** REPLACED $.getJSON with fetch API ***
          fetch(url)
              .then(response => {
                  if (!response.ok) {
                      throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                  }
                  return response.json();
              })
              .then(data => {
                  var result = data.filter(function(value) {
                      return value.region_code == region_code;
                  });

                  result.sort(function(a, b) {
                      return a.province_name.localeCompare(b.province_name);
                  });

                  // *** REPLACED $.each with forEach ***
                  result.forEach(entry => {
                      const opt = document.createElement('option');
                      opt.value = entry.province_code;
                      opt.textContent = entry.province_name;
                      provinceSelect.appendChild(opt);
                  });
              })
              .catch(error => {
                  console.error("Request for province.json Failed (Vanilla JS): " + error.message);
                  console.error("Fetch error object: ", error);
              });
      },
      // fill city
      fill_cities: function() {
          var province_code = provinceSelect.value;

          var province_text = provinceSelect.options[provinceSelect.selectedIndex].textContent;
          if (provinceTextInput) provinceTextInput.value = province_text;

          if (cityTextInput) cityTextInput.value = '';
          if (barangayTextInput) barangayTextInput.value = '';

          citySelect.innerHTML = '<option selected="true" disabled>Choose city/municipality</option>';
          citySelect.selectedIndex = 0;

          barangaySelect.innerHTML = '<option selected="true" disabled></option>';
          barangaySelect.selectedIndex = 0;

          const url = '../city.json';

          // *** REPLACED $.getJSON with fetch API ***
          fetch(url)
              .then(response => {
                  if (!response.ok) {
                      throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                  }
                  return response.json();
              })
              .then(data => {
                  var result = data.filter(function(value) {
                      return value.province_code == province_code;
                  });

                  result.sort(function(a, b) {
                      return a.city_name.localeCompare(b.city_name);
                  });

                  // *** REPLACED $.each with forEach ***
                  result.forEach(entry => {
                      const opt = document.createElement('option');
                      opt.value = entry.city_code;
                      opt.textContent = entry.city_name;
                      citySelect.appendChild(opt);
                  });
              })
              .catch(error => {
                  console.error("Request for city.json Failed (Vanilla JS): " + error.message);
                  console.error("Fetch error object: ", error);
              });
      },
      // fill barangay
      fill_barangays: function() {
          var city_code = citySelect.value;

          var city_text = citySelect.options[citySelect.selectedIndex].textContent;
          if (cityTextInput) cityTextInput.value = city_text;

          if (barangayTextInput) barangayTextInput.value = '';

          barangaySelect.innerHTML = '<option selected="true" disabled>Choose barangay</option>';
          barangaySelect.selectedIndex = 0;

          const url = '../barangay.json';

          // *** REPLACED $.getJSON with fetch API ***
          fetch(url)
              .then(response => {
                  if (!response.ok) {
                      throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
                  }
                  return response.json();
              })
              .then(data => {
                  var result = data.filter(function(value) {
                      return value.city_code == city_code;
                  });

                  result.sort(function(a, b) {
                      return a.brgy_name.localeCompare(b.brgy_name);
                  });

                  // *** REPLACED $.each with forEach ***
                  result.forEach(entry => {
                      const opt = document.createElement('option');
                      opt.value = entry.brgy_code;
                      opt.textContent = entry.brgy_name;
                      barangaySelect.appendChild(opt);
                  });
              })
              .catch(error => {
                  console.error("Request for barangay.json Failed (Vanilla JS): " + error.message);
                  console.error("Fetch error object: ", error);
              });
      },
      onchange_barangay: function() {
          var barangay_text = barangaySelect.options[barangaySelect.selectedIndex].textContent;
          if (barangayTextInput) barangayTextInput.value = barangay_text;
      },
  };

  // Function to control the visibility of the Export CSV button
  function toggleExportCsvButton() {
      if (exportCsvButton) {
          if (userRole === 'ABVN') {
              exportCsvButton.style.display = 'none'; // Hide for ABVN users
          } else {
              exportCsvButton.style.display = 'block'; // Show for other users (like AB ADMIN)
          }
      }
  }

  // Function to enable/disable form elements
  function toggleFormElements(enable) {
      const formContainer = document.getElementById('form-container-1');
      if (formContainer) {
          // Using Array.from for HTMLCollection to allow forEach
          Array.from(formContainer.elements).forEach(element => {
              if (element.id !== 'region' && element.id !== 'province' && element.id !== 'city' && element.id !== 'barangay') {
                  element.disabled = !enable;
              }
          });
      }
      // Specific elements that might not be in the form.elements collection or need direct handling
      const donationDrive = document.getElementById('donationDrive');
      const contactPerson = document.getElementById('contactPerson');
      const contactNumber = document.getElementById('contactNumber');
      const accountNumber = document.getElementById('accountNumber');
      const accountName = document.getElementById('accountName');
      const donationImage = document.getElementById('donationImage');
      const address = document.getElementById('address');
      const facebookLink = document.getElementById('facebookLink');

      if (submitButton) {
          submitButton.disabled = !enable;
      }

      if (donationDrive) donationDrive.disabled = !enable;
      if (contactPerson) contactPerson.disabled = !enable;
      if (contactNumber) contactNumber.disabled = !enable;
      if (accountNumber) accountNumber.disabled = !enable;
      if (accountName) accountName.disabled = !enable;
      if (donationImage) donationImage.disabled = !enable;
      if (address) address.disabled = !enable;
      if (facebookLink) facebookLink.disabled = !enable;
  }


  // Function to handle button visibility in the table
  function updateTableButtons() {
      const deleteButtons = document.querySelectorAll('.delete-btn');
      if (userRole === 'ABVN') {
          deleteButtons.forEach(button => {
              button.style.display = 'none';
          });
          const formPage1 = document.querySelector('.form-page-1');
          if(formPage1) {
              formPage1.style.display = 'none';
          }
      } else {
          deleteButtons.forEach(button => {
              button.style.display = 'inline-block';
          });
          const formPage1 = document.querySelector('.form-page-1');
          if(formPage1) {
              formPage1.style.display = 'block';
          }
      }
  }

  // Attach event listeners for the location dropdowns
  if (regionSelect) regionSelect.addEventListener('change', my_handlers.fill_provinces);
  if (provinceSelect) provinceSelect.addEventListener('change', my_handlers.fill_cities);
  if (citySelect) citySelect.addEventListener('change', my_handlers.fill_barangays);
  if (barangaySelect) barangaySelect.addEventListener('change', my_handlers.onchange_barangay);

  // Call the initial fill for regions directly on page load
  my_handlers.fill_regions();

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  function applyChange() {
      filteredReports = [...donations];
      currentPage = 1;
      renderReports();
  }

  searchInput?.addEventListener('input', applyFilters);
  sortSelect?.addEventListener('change', applyFilters);

  function applyFilters() {
      let data = [...donations];

      const searchTerm = searchInput.value.trim().toLowerCase();
      if (searchTerm) {
          data = data.filter(d =>
              (d.donationDrive || '').toLowerCase().includes(searchTerm) ||
              (d.contactPerson || '').toLowerCase().includes(searchTerm) ||
              (d.contactNumber || '').toLowerCase().includes(searchTerm) ||
              (d.accountNumber || '').toLowerCase().includes(searchTerm) ||
              (d.accountName || '').toLowerCase().includes(searchTerm) ||
              (d.dropOff || '').toLowerCase().includes(searchTerm) ||
              (d.facebookLink || '').toLowerCase().includes(searchTerm)
          );
      }

      const sortValue = sortSelect.value;
      if (sortValue) {
          const [field, direction] = sortValue.split('-');
          data.sort((a, b) => {
              const valA = (a[field] || '').toString().toLowerCase();
              const valB = (b[field] || '').toString().toLowerCase();
              return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          });
      }

      filteredReports = data;
      currentPage = 1;
      renderReports();
  }

  function renderReports() {
      tableBody.innerHTML = "";

      const totalEntries = filteredReports.length;
      const totalPages = Math.ceil(totalEntries / entriesPerPage);
      const startIndex = (currentPage - 1) * entriesPerPage;
      const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
      const pageData = filteredReports.slice(startIndex, endIndex);

      if (pageData.length === 0) {
          tableBody.innerHTML = "<tr><td colspan='9'>No donations found.</td></tr>";
      } else {
          pageData.forEach((r, i) => {
              const row = document.createElement('tr');
              row.innerHTML = `
                  <td>${startIndex + i + 1}</td>
                  <td>${r.donationDrive || ''}</td>
                  <td>${r.contactPerson || ''}</td>
                  <td>${r.contactNumber || ''}</td>
                  <td>${r.accountNumber || ''}</td>
                  <td>${r.accountName || ''}</td>
                  <td>${r.dropOff || r.address || ''}</td>
                  <td><a href="${r.facebookLink || '#'}" target="_blank" rel="noopener noreferrer">Visit The Page</a></td>
                  <td>
                      <button class="view-btn" data-index="${startIndex + i}">View Image</button>
                      <button class="delete-btn" data-index="${startIndex + i}">Delete</button>
                  </td>
              `;
              tableBody.appendChild(row);
          });
      }

      entriesInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalEntries} entries`;
      renderPagination(totalPages);
      attachEventListeners();
      updateTableButtons();
  }

  function renderPagination(totalPages) {
      pagination.innerHTML = "";

      const prevBtn = document.createElement('button');
      prevBtn.id = 'prevBtnPage';
      prevBtn.textContent = 'Prev';
      prevBtn.disabled = currentPage === 1;
      pagination.appendChild(prevBtn);

      for (let i = 1; i <= totalPages; i++) {
          const pageBtn = document.createElement('button');
          pageBtn.textContent = i;
          if (i === currentPage) {
              pageBtn.classList.add('active');
          }
          pageBtn.addEventListener('click', () => {
              currentPage = i;
              renderReports();
          });
          pagination.appendChild(pageBtn);
      }

      const nextBtn = document.createElement('button');
      nextBtn.id = 'nextBtnPage';
      nextBtn.textContent = 'Next';
      nextBtn.disabled = currentPage === totalPages || totalPages === 0;
      pagination.appendChild(nextBtn);

      prevBtn.addEventListener('click', () => {
          if (currentPage > 1) {
              currentPage--;
              renderReports();
          }
      });

      nextBtn.addEventListener('click', () => {
          if (currentPage < totalPages) {
              currentPage++;
              renderReports();
          }
      });
  }

  function attachEventListeners() {
      document.querySelectorAll('.view-btn').forEach(button => {
          button.addEventListener('click', e => {
              const index = parseInt(e.target.dataset.index);
              const data = filteredReports[index];
              Swal.fire({
                  html: data?.image ? `<img src="${data.image}" alt="Donation Image" style="max-width: 100%; margin-top: 10px;" />` : 'No image available.',
                  icon: 'info',
                  confirmButtonText: 'Close'
              });
          });
      });

      document.querySelectorAll('.delete-btn').forEach(button => {
          button.addEventListener('click', e => {
              const index = parseInt(e.target.dataset.index);
              const data = filteredReports[index];

              Swal.fire({
                  title: 'Are you sure?',
                  text: "This donation will be deleted.",
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Yes, delete it!'
              }).then(result => {
                  if (result.isConfirmed) {
                      donations = donations.filter(d => d !== data);
                      localStorage.setItem('donations', JSON.stringify(donations));
                      applyFilters();
                      Swal.fire('Deleted!', 'The donation has been removed.', 'success');
                  }
              });
          });
      });
  }

  if (submitButton) {
      submitButton.addEventListener('click', (e) => {
          e.preventDefault();

          const donationDrive = document.getElementById('donationDrive')?.value.trim();
          const contactPerson = document.getElementById('contactPerson')?.value.trim();
          const contactNumber = document.getElementById('contactNumber')?.value.trim();
          const accountNumber = document.getElementById('accountNumber')?.value.trim();
          const accountName = document.getElementById('accountName')?.value.trim();
          const region = regionSelect?.options[regionSelect.selectedIndex]?.textContent || '';
          const province = provinceSelect?.options[provinceSelect.selectedIndex]?.textContent || '';
          const city = citySelect?.options[citySelect.selectedIndex]?.textContent || '';
          const barangay = barangaySelect?.options[barangaySelect.selectedIndex]?.textContent || '';
          const address = document.getElementById('address')?.value.trim();
          const facebookLink = document.getElementById('facebookLink')?.value.trim();
          const imageFile = document.getElementById('donationImage')?.files[0];

          if (!donationDrive || !contactPerson || !contactNumber || !accountNumber || !accountName || !region || !province || !city || !barangay || !address) {
              Swal.fire('Error', "Please fill in all required fields, including the full address (Region, Province, City, Barangay, and Address).", 'error');
              return;
          }

          function saveDonation(base64Image) {
              const newDonation = {
                  donationDrive,
                  contactPerson,
                  contactNumber,
                  accountNumber,
                  accountName,
                  Region: region,
                  Province: province,
                  CityMunicipality: city,
                  Barangay: barangay,
                  dropOff: `${address}, ${barangay}, ${city}, ${province}, ${region}`,
                  facebookLink,
                  image: base64Image || '',
                  Status: "Pending"
              };
              donations.push(newDonation);
              localStorage.setItem('donations', JSON.stringify(donations));
              applyChange();

              document.getElementById('donationDrive').value = '';
              document.getElementById('contactPerson').value = '';
              document.getElementById('contactNumber').value = '';
              document.getElementById('accountNumber').value = '';
              document.getElementById('accountName').value = '';

              my_handlers.fill_regions();

              document.getElementById('address').value = '';
              document.getElementById('facebookLink').value = '';
              document.getElementById('donationImage').value = '';

              if (regionTextInput) regionTextInput.value = '';
              if (provinceTextInput) provinceTextInput.value = '';
              if (cityTextInput) cityTextInput.value = '';
              if (barangayTextInput) barangayTextInput.value = '';

              Swal.fire('Success', 'Donation added successfully!', 'success');
          }

          if (imageFile) {
              const reader = new FileReader();
              reader.onload = function(event) {
                  saveDonation(event.target.result);
              };
              reader.readAsDataURL(imageFile);
          } else {
              saveDonation('');
          }
      });
  }

  // Export to CSV functionality
  if (exportCsvButton) {
      exportCsvButton.addEventListener('click', () => {
          if (filteredReports.length === 0) {
              Swal.fire('No Data', 'There is no data to export.', 'info');
              return;
          }

          const headers = [
              "No.", "Donation Drive", "Contact Name", "Contact Number",
              "Account Number", "Account Name", "Region", "Province",
              "City/Municipality", "Barangay", "Exact Drop Off Address",
              "Facebook Link", "Image Link"
          ];

          const csvData = filteredReports.map((item, index) => [
              index + 1,
              `"${item.donationDrive || ''}"`,
              `"${item.contactPerson || ''}"`,
              `"${item.contactNumber || ''}"`,
              `"${item.accountNumber || ''}"`,
              `"${item.accountName || ''}"`,
              `"${item.Region || ''}"`,
              `"${item.Province || ''}"`,
              `"${item.CityMunicipality || ''}"`,
              `"${item.Barangay || ''}"`,
              `"${item.dropOff || ''}"`,
              `"${item.facebookLink || ''}"`,
              `"${item.image || ''}"`
          ].join(','));

          const csvContent = [
              headers.join(','),
              ...csvData
          ].join('\n');

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', 'call_for_donation_reports.csv');
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          Swal.fire('Exported!', 'Donation data has been exported to CSV.', 'success');
      });
  }

  toggleExportCsvButton();
  updateTableButtons();
  applyChange();
});



