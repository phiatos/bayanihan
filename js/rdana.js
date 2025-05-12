// Page navigation
const nextBtn1 = document.getElementById('nextBtn1');
const backBtn2 = document.getElementById('backBtn2');
const nextBtn2 = document.getElementById('nextBtn2');
const backBtn3 = document.getElementById('backBtn3');
const nextBtn3 = document.getElementById('nextBtn3');
const backBtn4 = document.getElementById('backBtn4');
const nextBtn4 = document.getElementById('nextBtn4');
const backBtn5 = document.getElementById('backBtn5');

nextBtn1.addEventListener('click', () => {
  if (validatePageInputs('#form-page-1')) {
    document.getElementById('form-page-1').style.display = 'none';
    document.getElementById('form-page-2').style.display = 'block';
  } else {
    Swal.fire("Incomplete Data", "Please fill in all required fields on this page.", "warning");
  }
});

backBtn2.addEventListener('click', () => {
  document.getElementById('form-page-2').style.display = 'none';
  document.getElementById('form-page-1').style.display = 'block';
});

nextBtn2.addEventListener('click', () => {
  if (validatePageInputs('#form-page-2')) {
    document.getElementById('form-page-2').style.display = 'none';
    document.getElementById('form-page-3').style.display = 'block';
  } else {
    Swal.fire("Incomplete Data", "Please fill in all required fields on this page.", "warning");
  }
});

backBtn3.addEventListener('click', () => {
  document.getElementById('form-page-3').style.display = 'none';
  document.getElementById('form-page-2').style.display = 'block';
});

nextBtn3.addEventListener('click', () => {
  if (validatePageInputs('#form-page-3')) {
    document.getElementById('form-page-3').style.display = 'none';
    document.getElementById('form-page-4').style.display = 'block';
  } else {
    Swal.fire("Incomplete Data", "Please fill in all required fields on this page.", "warning");
  }
});
backBtn4.addEventListener('click', () => {
  document.getElementById('form-page-4').style.display = 'none';
  document.getElementById('form-page-3').style.display = 'block';
});

nextBtn4.addEventListener('click', () => {
  if (!validatePageInputs('#form-page-4')) {
        Swal.fire("Incomplete Data", "Please fill in all required fields on this page.", "warning");
  } else {
        document.getElementById("nextBtn4").addEventListener("click", function () {
        const previewDiv = document.getElementById("preview-data");
        previewDiv.innerHTML = ""; // Clear previous preview

        // Page 1 data
        const page1Inputs = document.querySelectorAll("#form-page-1 input, #form-page-1 select");
        let page1Table = `<h3>Profile of the Disaster</h3><div class='table-scroll'><table class='preview-table' id='page1preview'>`;
        page1Inputs.forEach(input => {
            const label = input.previousElementSibling ? input.previousElementSibling.innerText : "Field";
            page1Table += `<tr><td id='page1-tdlabel'>${label}</td><td id='page1-tdinput'>${input.value}</td></tr>`;
        });
        page1Table += `</table></div>`;

        // Page 2 data
        const summary = document.querySelector("#form-page-2 textarea")?.value || "";
        let page2Table = `<h3>Summary of Disaster/Incident</h3><p>${summary}</p>`;
        const tableRows = document.querySelectorAll("#disasterprofile-table tbody tr");
        page2Table += `<div class='table-scroll'><table class='preview-table' id='page2preview'><tr><th>Community</th><th>Total Pop.</th><th>Affected Pop.</th><th>Deaths</th><th>Injured</th><th>Missing</th><th>Children</th><th>Women</th><th>Seniors</th><th>PWD</th></tr>`;
        tableRows.forEach(row => {
            const cells = row.querySelectorAll("input") || "0";
            page2Table += "<tr>";
            cells.forEach(cell => {
                page2Table += `<td>${cell.value}</td>`;
            });
            page2Table += "</tr>";
        });
        page2Table += "</table></div>";

        // Page 3 data
        const statusRows = document.querySelectorAll("#status-table tbody tr");
        let page3Table = `<h3>Status of Structures</h3><div class='table-scroll'><table class='preview-table' id='page3preview'><tr><th>Structure</th><th>Status</th></tr>`;
        statusRows.forEach(row => {
            const structure = row.querySelector("td")?.innerText || "";
            const status = row.querySelector("input")?.value || "N/A";
            page3Table += `<tr><td>${structure}</td><td>${status}</td></tr>`;
        });
        page3Table += `</table></div>`;

        // Page 4 checklist
        const checklistItems = document.querySelectorAll("#checklist-table input[type='checkbox']");
        let page4Table = `<h3>Initial Needs Assessment</h3><div class='table-scroll'><table class='preview-table' id='page4preview'><tr><th>Item</th><th>Needed</th></tr>`;
        checklistItems.forEach(item => {
            const label = item.closest("tr").querySelector("td")?.innerText || "";
            page4Table += `<tr><td>${label}</td><td>${item.checked ? "Yes" : "No"}</td></tr>`;
        });
        page4Table += `</table></div>`;

        // Page 4 additional needs
        const otherNeeds = document.querySelector("#form-page-4 input[placeholder='Enter items']")?.value || "N/A";
        const estQty = document.querySelector("#form-page-4 input[placeholder='Estimated No. of Families to Benefit']")?.value || "N/A";
        const responseGroup = document.querySelector("#form-page-4 input[placeholder='Enter Name of Organization/s']")?.value || "N/A";
        const reliefDeployed = document.querySelector("#form-page-4 input[placeholder='Enter Relief Assistance']")?.value || "N/A";
        const familiesServed = document.querySelector("#form-page-4 input[placeholder='Enter number of families']")?.value || "N/A";

        page4Table += `
            <p><strong>Other Immediate Needs:</strong> ${otherNeeds}</p>
            <p><strong>Estimated Quantity:</strong> ${estQty}</p>
            <h3 style="margin-top: 15px; margin-bottom: 10px;">Initial Response Actions</h3>
            <p><strong>Response Groups Involved:</strong> ${responseGroup}</p>
            <p><strong>Relief Assistance Deployed:</strong> ${reliefDeployed}</p>
            <p><strong>Number of Families Served:</strong> ${familiesServed}</p>
        `;

        // Combine all sections
        previewDiv.innerHTML = page1Table + page2Table + page3Table + page4Table;

        // Navigate to page 5
        document.getElementById("form-page-4").style.display = "none";
        document.getElementById("form-page-5").style.display = "block";
        });
  }
});

backBtn5.addEventListener('click', () => {
  document.getElementById('form-page-5').style.display = 'none';
  document.getElementById('form-page-4').style.display = 'block';
});

function validatePageInputs(pageSelector) {
    const inputs = document.querySelectorAll(`${pageSelector} input[required], ${pageSelector} select[required], ${pageSelector} textarea[required]`);
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add("input-error");
        } else {
            input.classList.remove("input-error");
        }
    });

    return isValid;
}


// Input Validation

// Auto Capitalize & Validate Inputs
document.querySelectorAll('input[type="text"]').forEach(input => {
  input.addEventListener('input', function () {
    // Capitalize first letter
    this.value = this.value.charAt(0).toUpperCase() + this.value.slice(1);

    // Allow only alphabets for names
    if (this.placeholder.includes('Name') || this.placeholder.includes('Organization')) {
      this.value = this.value.replace(/[^a-zA-Z\s]/g, ''); // Only letters and spaces
    }

    // For Barangay (Letters & Numbers)
    if (this.placeholder.includes('Barangay')) {
      this.value = this.value.replace(/[^a-zA-Z0-9\s]/g, ''); // Alphanumeric and spaces only
    }

    // For numbers (prevent negative numbers)
    if (this.type === 'number') {
      if (this.value < 0) {
        this.value = '';
      }
    }
  });
});

// Add row functionality
  document.getElementById("addRowBtn").addEventListener('click', function() {
    const tableBody = document.getElementById("tableBody");
    const newRow = document.createElement("tr");

    newRow.innerHTML = `
      <td><input type="text" placeholder="Enter Municipalities/Communities" /></td>
      <td><input type="number" placeholder="Enter Total Population" /></td>
      <td><input type="number" placeholder="Enter Affected Population" /></td>
      <td><input type="number" placeholder="No. of Deaths" /></td>
      <td><input type="number" placeholder="No. of Injured" /></td>
      <td><input type="number" placeholder="No. of Missing" /></td>
      <td><input type="number" placeholder="No. of Children" /></td>
      <td><input type="number" placeholder="No. of Women" /></td>
      <td><input type="number" placeholder="No. of Senior Citizens" /></td>
      <td><input type="number" placeholder="No. of PWD" /></td>
      <td><button type="button" class="deleteRowBtn">Delete</button></td>
    `;
    tableBody.appendChild(newRow);

    // Add delete functionality for new rows
    const deleteBtns = document.querySelectorAll(".deleteRowBtn");
    deleteBtns.forEach(button => {
      button.addEventListener('click', function() {
        this.closest('tr').remove();
      });
    });
  });

  // Clear row functionality
  const clearBtns = document.querySelectorAll(".removeRowBtn");
  clearBtns.forEach(button => {
    button.addEventListener('click', function() {
      const row = this.closest('tr');
      row.querySelectorAll('input').forEach(input => input.value = '');
    });
});






