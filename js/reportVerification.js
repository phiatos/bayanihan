
// test
// document.getElementById("next-Btn").addEventListener("click", function () {
//     document.getElementById("form-page-1").style.display = "none";
//     document.getElementById("form-page-2").style.display = "block";
// });

// document.getElementById("backBtn").addEventListener("click", function () {
//     document.getElementById("form-page-2").style.display = "none";
//     document.getElementById("form-page-1").style.display = "block";
// });

// const formPage1 = document.getElementById('form-page-1');
// const nextBtn = document.getElementById('nextBtn');

// nextBtn.addEventListener('click', function () {
//     if (formPage1.checkValidity()) {
//         // All fields are valid, show next page
//         formPage1.style.display = "none";
//         document.getElementById("form-page-2").style.display = "block";
//     } else {
//         formPage1.reportValidity(); // Triggers native browser validation messages
//     }
// });


// document.getElementById("form-page-2").addEventListener("submit", function (e) {
//     e.preventDefault();

//     const inputs = document.querySelectorAll("input, textarea");
//     const formData = {};

//     inputs.forEach((input, index) => {
//         if (input.placeholder) {
//             formData[input.placeholder] = input.value;
//         } else {
//             formData["textarea_" + index] = input.value;
//         }
//     });

    // Save to localStorage
    // localStorage.setItem("reportData", JSON.stringify(formData));

    // Redirect to the summary page
//     window.location.href = "summary.html";
// });





// test
// document.getElementById("next-Btn").addEventListener("click", function () {
//     document.getElementById("form-page-1").style.display = "none";
//     document.getElementById("form-page-2").style.display = "block";
// });

// document.getElementById("backBtn").addEventListener("click", function () {
//     document.getElementById("form-page-2").style.display = "none";
//     document.getElementById("form-page-1").style.display = "block";
// });

// const formPage1 = document.getElementById('form-page-1');
// const nextBtn = document.getElementById('nextBtn');

// nextBtn.addEventListener('click', function () {
//     if (formPage1.checkValidity()) {
//         // All fields are valid, show next page
//         formPage1.style.display = "none";
//         document.getElementById("form-page-2").style.display = "block";
//     } else {
//         formPage1.reportValidity(); // Triggers native browser validation messages
//     }
// });


// document.getElementById("form-page-2").addEventListener("submit", function (e) {
//     e.preventDefault();

//     const inputs = document.querySelectorAll("input, textarea");
//     const formData = {};

//     inputs.forEach((input, index) => {
//         if (input.placeholder) {
//             formData[input.placeholder] = input.value;
//         } else {
//             formData["textarea_" + index] = input.value;
//         }
//     });

    // Save to localStorage
    // localStorage.setItem("reportData", JSON.stringify(formData));

    // Redirect to the summary page
//     window.location.href = "summary.html";
// });




// Get elements
const formPage1 = document.getElementById('form-page-1');
const formPage2 = document.getElementById('form-page-2');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');

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

    // Save to localStorage
    localStorage.setItem("reportData", JSON.stringify(formData));

    // Redirect to summary page
    window.location.href = "../pages/reportSummary.html";
});