// Get elements
const formPage1 = document.getElementById('form-page-1');
const formPage2 = document.getElementById('form-page-2');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');

//set date today as default value
const dateInput = document.getElementById('dateOfReport');
if (dateInput) {
    const today = new Date();
    const formatted = today.toLocaleDateString('en-CA'); // YYYY-MM-DD
    dateInput.value = formatted;
}

// Generate a random report ID and set it as the value of the input field
const idInput = document.getElementById('reportId');
    if (idInput) {
        const randomId = 'ABRN' + Math.floor(10000 + Math.random() * 9000000000); // e.g., RPT-123456
        idInput.value = randomId;
    }

// Go to next form only if valid
nextBtn.addEventListener('click', function () {
    if (formPage1.checkValidity()) {
        formPage1.style.display = "none";
        formPage2.style.display = "block";
    } else {
        formPage1.reportValidity(); // Show native browser error
    }
});

// Go back to first form
backBtn.addEventListener('click', function () {
    formPage2.style.display = "none";
    formPage1.style.display = "block";
});

// Submit second form
formPage2.addEventListener("submit", function (e) {
    e.preventDefault();

    const inputs = document.querySelectorAll("input, textarea");
    const formData = {};

    inputs.forEach((input, index) => {
        if (input.placeholder) {
            formData[input.placeholder] = input.value;
        } else {
            formData["textarea_" + index] = input.value;
        }
    });

    // ✅ Set today's date as "Date of Report"
    const today = new Date();
    formData["Date of Report"] = today.toLocaleDateString('en-US'); // format: MM/DD/YYYY

    // Save to localStorage
    localStorage.setItem("reportData", JSON.stringify(formData));

    // Redirect to summary page
    window.location.href = "../pages/reportSummary.html";
});