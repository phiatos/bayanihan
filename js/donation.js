// ../js/donation.js

// DOM elements
const donationDriveInput = document.getElementById("donationDrive");
const contactPersonInput = document.getElementById("contactPerson");
const contactNumberInput = document.getElementById("contactNumber");
const accountNumberInput = document.getElementById("accountNumber");
const accountNameInput = document.getElementById("accountName");
const provinceSelect = document.querySelector("select[name='province']");
const citySelect = document.querySelector("select[name='city']");
const barangaySelect = document.querySelector("select[name='barangay']");
const addressInput = document.getElementById("address");
const nextBtn = document.getElementById("nextBtn");

// Dropdown data
const provinces = ["Sorsogon", "Albay"];
const cities = {
  Sorsogon: ["Sorsogon City", "Gubat"],
  Albay: ["Legazpi City", "Tabaco"]
};
const barangays = {
  "Sorsogon City": ["Barangay Guinlajon", "Barangay Bacon"],
  Gubat: ["Barangay Ariman", "Barangay Bulacao"],
  "Legazpi City": ["Barangay Bogtong", "Barangay Bonot"],
  Tabaco: ["Barangay Oas", "Barangay San Jose"]
};

function populateSelect(select, options) {
  select.innerHTML = '<option value="">Select</option>';
  options.forEach(option => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
}

// Initial population
populateSelect(provinceSelect, provinces);

// Province change
provinceSelect.addEventListener("change", () => {
  const selected = provinceSelect.value;
  populateSelect(citySelect, cities[selected] || []);
  barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
});

// City change
citySelect.addEventListener("change", () => {
  const selected = citySelect.value;
  populateSelect(barangaySelect, barangays[selected] || []);
});

// Submit logic
nextBtn.addEventListener("click", () => {
  // Validate form
  if (
    !donationDriveInput.value ||
    !contactPersonInput.value ||
    !contactNumberInput.value ||
    !accountNumberInput.value ||
    !accountNameInput.value ||
    !provinceSelect.value ||
    !citySelect.value ||
    !barangaySelect.value ||
    !addressInput.value
  ) {
    Swal.fire({
      icon: 'error',
      title: 'Incomplete Form',
      text: 'Please fill out all required fields.'
    });
    return;
  }

  // Get existing data from localStorage
  const existingData = JSON.parse(localStorage.getItem("donationData")) || [];

  // New donation entry
  const donationEntry = {
    donationDrive: donationDriveInput.value,
    contactPerson: contactPersonInput.value,
    contactNumber: contactNumberInput.value,
    accountNumber: accountNumberInput.value,
    accountName: accountNameInput.value,
    province: provinceSelect.value,
    city: citySelect.value,
    barangay: barangaySelect.value,
    address: addressInput.value,
    timestamp: new Date().toISOString()
  };

  // Save updated data
  existingData.push(donationEntry);
  localStorage.setItem("donationData", JSON.stringify(existingData));

  Swal.fire({
    icon: 'success',
    title: 'Saved!',
    text: 'Donation details have been saved.'
  }).then(() => {
    // Navigate to the donation list
    window.location.href = '../pages/donationList.html';
  });
});
