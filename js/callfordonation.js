document.addEventListener('DOMContentLoaded', () => {
  let reports = [
    {
      VolunteerGroupName: "Team Bicol",
      Barangay: "Barangay 1",
      CityMunicipality: "Legazpi",
      Province: "Albay",
      Status: "Approved"
    },
    {
      VolunteerGroupName: "Sorsogon Strong",
      Barangay: "Barangay 5",
      CityMunicipality: "Sorsogon City",
      Province: "Sorsogon",
      Status: "Pending"
    }
  ];

  let filteredReports = reports;
  let viewingApproved = false;

  const searchInput = document.getElementById('searchInput');
  const provinceSelect = document.getElementById('provinceSelect');
  const citySelect = document.getElementById('citySelect');
  const barangaySelect = document.getElementById('barangaySelect');
  const sortSelect = document.getElementById('sortSelect');
  const nextBtn = document.getElementById('nextBtn');

  const cities = {
    Albay: ["Legazpi", "Daraga", "Tabaco"],
    Sorsogon: ["Sorsogon City", "Gubat", "Castilla"]
  };

  if (provinceSelect && citySelect && barangaySelect) {
    provinceSelect.addEventListener('change', () => {
      const selectedProvince = provinceSelect.value;
      citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
      barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

      if (selectedProvince && cities[selectedProvince]) {
        cities[selectedProvince].forEach(city => {
          const opt = document.createElement('option');
          opt.value = city;
          opt.textContent = city;
          citySelect.appendChild(opt);
        });
      }

      applyFilters();
    });

    citySelect.addEventListener('change', () => {
      const city = citySelect.value;
      barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

      if (city) {
        for (let i = 1; i <= 5; i++) {
          const opt = document.createElement('option');
          opt.value = `Barangay ${i}`;
          opt.textContent = `Barangay ${i}`;
          barangaySelect.appendChild(opt);
        }
      }

      applyFilters();
    });
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (barangaySelect) barangaySelect.addEventListener('change', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  function applyFilters() {
    let data = reports;

    if (viewingApproved) {
      data = data.filter(r => r.Status === 'Approved');
    }

    const search = searchInput?.value.toLowerCase() || "";
    if (search) {
      data = data.filter(r =>
        (r.VolunteerGroupName || '').toLowerCase().includes(search) ||
        (r.Barangay || '').toLowerCase().includes(search) ||
        (r.CityMunicipality || '').toLowerCase().includes(search)
      );
    }

    const selectedProvince = provinceSelect?.value;
    const selectedCity = citySelect?.value;
    const selectedBarangay = barangaySelect?.value;

    if (selectedProvince) {
      const citiesList = cities[selectedProvince] || [];
      data = data.filter(r => citiesList.includes(r.CityMunicipality));
    }

    if (selectedCity) {
      data = data.filter(r => r.CityMunicipality === selectedCity);
    }

    if (selectedBarangay) {
      data = data.filter(r => r.Barangay === selectedBarangay);
    }

    const sortValue = sortSelect?.value;
    if (sortValue) {
      const [field, dir] = sortValue.split('-');
      data.sort((a, b) => {
        const valA = a[field] || '';
        const valB = b[field] || '';
        return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    filteredReports = data;
    renderReports(1);
  }

  function renderReports(page) {
    const container = document.getElementById('reportsContainer');
    if (!container) return;
    container.innerHTML = "";

    if (filteredReports.length === 0) {
      container.innerHTML = "<p>No reports found.</p>";
      return;
    }

    filteredReports.forEach((r, index) => {
      const row = document.createElement('div');
      row.className = "report-row";
      row.innerHTML = `
        <strong>${index + 1}. ${r.VolunteerGroupName}</strong><br>
        ${r.Barangay}, ${r.CityMunicipality}, ${r.Province} - <em>${r.Status}</em>
      `;
      container.appendChild(row);
    });
  }

  applyFilters();

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const donationDrive = document.getElementById('donationDrive')?.value;
      const contactPerson = document.getElementById('contactPerson')?.value;
      const contactNumber = document.getElementById('contactNumber')?.value;
      const accountNumber = document.getElementById('accountNumber')?.value;
      const accountName = document.getElementById('accountName')?.value;
      const province = provinceSelect?.value;
      const city = citySelect?.value;
      const barangay = barangaySelect?.value;
      const address = document.getElementById('address')?.value;
      const facebookLink = document.getElementById('facebookLink')?.value; 


      const websiteLink = document.getElementById('websiteLink')?.value;
      const imageInput = document.getElementById('donationImage');
      const imageFile = imageInput?.files[0];

      if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
          saveDonation(e.target.result); // Base64
        };
        reader.readAsDataURL(imageFile);
      } else {
        saveDonation(""); // No image
      }

      function saveDonation(imageBase64) {
        const donationData = {
          donationDrive,
          contactPerson,
          contactNumber,
          accountNumber,
          accountName,
          dropOff: `${address}, ${barangay}, ${city}, ${province}`,
          facebookLink,
          image: imageBase64
        };

        let donations = JSON.parse(localStorage.getItem('donations')) || [];
        donations.push(donationData);
        localStorage.setItem('donations', JSON.stringify(donations));

        Swal.fire('Success', 'Donation drive submitted!', 'success').then(() => {
          window.location.href = 'donationlist.html';
        });
      }


      if (!donationDrive || !contactPerson || !contactNumber || !accountNumber || !accountName || !province || !city || !barangay || !address) {
        Swal.fire('Error', 'Please fill out all required fields.', 'error');
        return;
      }

      const donationData = {
        donationDrive,
        contactPerson,
        contactNumber,
        accountNumber,
        accountName,
        dropOff: `${address}, ${barangay}, ${city}, ${province}`,
        facebookLink
      };

      let donations = JSON.parse(localStorage.getItem('donations')) || [];
      donations.push(donationData);
      localStorage.setItem('donations', JSON.stringify(donations));

      Swal.fire('Success', 'Donation drive submitted!', 'success').then(() => {
        window.location.href = 'donationlist.html';
      });
    });
  }
});
