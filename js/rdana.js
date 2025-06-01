document.addEventListener('DOMContentLoaded', () => {
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
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  const auth = firebase.auth();

  // Form data variables (declared in higher scope to persist across event listeners)
  let profileData = {};
  let affectedCommunities = [];
  let needsChecklist = [];
  let summary = "";
  let structureStatus = [];
  let otherNeeds = "";
  let estQty = "";
  let responseGroup = "";
  let reliefDeployed = "";
  let familiesServed = "";
  let currentUserGroupName = '';  // global variable to hold the group name
  let currentUserUid = '';        // optional: global variable for UID


  const submittedReportsContainer = document.getElementById("submittedReportsContainer");
  const paginationContainer = document.getElementById("pagination");
  const entriesInfo = document.getElementById("entriesInfo");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");


  
  // Helper function to sanitize keys for Firebase
  function sanitizeKey(key) {
    return key
      .replace(/[.#$/[\]]/g, '_') 
      .replace(/\s+/g, '_') 
      .replace(/[^a-zA-Z0-9_]/g, ''); 
  }

  // Check if user is authenticated
  auth.onAuthStateChanged(user => {
  if (!user) {
    Swal.fire({
      icon: 'error',
      title: 'Authentication Required',
      text: 'Please sign in to access RDANA reports.',
    }).then(() => {
      window.location.href = "../pages/login.html";
    });
    return;
  }

  console.log('Logged-in user UID:', user.uid);
  currentUserUid = user.uid;

  const volunteerGroup = JSON.parse(localStorage.getItem('loggedInVolunteerGroup'));
  currentUserGroupName = volunteerGroup?.organization || 'Unknown Group';

  console.log('Current logged-in user group:', currentUserGroupName);

  if (submittedReportsContainer && paginationContainer && entriesInfo && searchInput && sortSelect) {
    loadSubmittedReports(user.uid);
  }
});





  // Input Validations
 function validatePageInputs(pageSelector) {
  const inputs = document.querySelectorAll(`${pageSelector} input[required], ${pageSelector} select[required], ${pageSelector} textarea[required]`);
  let isValid = true;

  inputs.forEach(input => {
    const errorMessage = input.nextElementSibling;
    if (!input.value.trim()) {
      isValid = false;
      input.classList.add("input-error");
      if (errorMessage && errorMessage.classList.contains("error-message")) {
        errorMessage.textContent = "This field is required.";
        errorMessage.style.display = "block";
      }
    } else {
      input.classList.remove("input-error");
      if (errorMessage && errorMessage.classList.contains("error-message")) {
        errorMessage.style.display = "none";
      }
    }
  });

  return isValid;
}


  // Input validation for text fields
  document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', function () {
      // Capitalize first letter
      this.value = this.value.charAt(0).toUpperCase() + this.value.slice(1);

      // Allow only alphabets for names
      if (this.placeholder.includes('Name') || this.placeholder.includes('Organization')) {
        this.value = this.value.replace(/[^a-zA-Z\s,-]/g, ''); // Only letters and spaces
      }

      // For Barangay (Letters & Numbers)
      if (this.id === 'affectedBarangayInput') {
        this.value = this.value.replace(/[^a-zA-Z0-9\s,]/g, ''); // Alphanumeric, spaces, commas
      }
      else if (this.placeholder.includes('Name') || this.placeholder.includes('Organization')) {
      // For Name and Organization → letters, spaces, commas, hyphens only
      this.value = this.value.replace(/[^a-zA-Z\s,-]/g, '');
      }
      else if (this.placeholder.includes('City/Municipality') || this.placeholder.includes('Province')|| this.placeholder.includes('Relief Assistance')|| this.placeholder.includes('Items')) {
        this.value = this.value.replace(/[^a-zA-Z\s,-]/g, ''); // Only letters and spaces
      }
      else{
        // For all other text inputs → optionally set a more general rule
        this.value = this.value.replace(/[^a-zA-Z\s]/g, ''); // Only letters and spaces
      }

      // For numbers (prevent negative numbers)
      if (this.type === 'number') {
        if (this.value < 0) {
          this.value = '';
        }
      }
    });
  });

  // Add the submit functionality for the RDANA report
  const nextBtn4 = document.getElementById('nextBtn4');
  if (nextBtn4) {
    nextBtn4.addEventListener('click', () => {
      if (!validatePageInputs('#form-page-4')) {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Data',
            text: 'Please fill in all required fields on this page.',
            background: '#fffaf0',             
            color: '#92400e',                  
            iconColor: '#f59e0b',              
            confirmButtonColor: '#d97706',     
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                content: 'swal2-text-warning-clean'
            }
        });

        return;
      }

      const previewDiv = document.getElementById("preview-data");
      previewDiv.innerHTML = ""; // Clear previous content

      // Page 1 data
      const page1Inputs = document.querySelectorAll("#form-page-1 input, #form-page-1 select");
      let page1Table = `<h3>Profile of the Disaster</h3><div class='table-scroll'><table class='preview-table' id='page1preview'>`;
      profileData = {}; // Reset profileData
      page1Inputs.forEach(input => {
        const label = input.previousElementSibling ? input.previousElementSibling.innerText : "Field";
        const sanitizedLabel = sanitizeKey(label); // Sanitize the key for Firebase
        page1Table += `<tr><td id='page1-tdlabel'>${label}</td><td id='page1-tdinput'>${input.value}</td></tr>`;
        profileData[sanitizedLabel] = input.value; // Use sanitized key
      });
      page1Table += `</table></div>`;

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

    // Page 2 data
    summary = document.querySelector("#form-page-2 textarea")?.value || "";
    let page2Table = `<h3>Summary of Disaster/Incident</h3><p>${summary}</p>`;
    const tableRows = document.querySelectorAll("#disasterprofile-table tbody tr");
    page2Table += `<div class='table-scroll'><table class='preview-table' id='page2preview'><tr><th>Community</th><th>Total Pop.</th><th>Affected Pop.</th><th>Deaths</th><th>Injured</th><th>Missing</th><th>Children</th><th>Women</th><th>Seniors</th><th>PWD</th></tr>`;
    affectedCommunities = []; // Reset affectedCommunities

    tableRows.forEach(row => {
      const cells = row.querySelectorAll("input") || [];
      page2Table += "<tr>";
      const communityData = {
        community: cells[0]?.value || "",
        totalPop: formatLargeNumber(cells[1]?.value) || "0",
        affected: formatLargeNumber(cells[2]?.value) || "0",
        deaths: formatLargeNumber(cells[3]?.value) || "0",
        injured: formatLargeNumber(cells[4]?.value) || "0",
        missing: formatLargeNumber(cells[5]?.value) || "0",
        children: formatLargeNumber(cells[6]?.value) || "0",
        women: formatLargeNumber(cells[7]?.value) || "0",
        seniors: formatLargeNumber(cells[8]?.value) || "0",
        pwd: formatLargeNumber(cells[9]?.value) || "0"
      };
      affectedCommunities.push(communityData);

      cells.forEach((cell, i) => {
        if (i === 0) {
          page2Table += `<td>${cell.value}</td>`;
        } else {
          page2Table += `<td>${formatLargeNumber(cell.value)}</td>`;
        }
      });

      page2Table += "</tr>";
    });

    page2Table += "</table></div>";


      // Page 3 data
      const statusRows = document.querySelectorAll("#status-table tbody tr");
      let page3Table = `<h3>Status of Structures</h3><div class='table-scroll'><table class='preview-table' id='page3preview'><tr><th>Structure</th><th>Status</th></tr>`;
      structureStatus = []; // Reset structureStatus
      statusRows.forEach(row => {
        const structure = row.querySelector("td")?.innerText || "";
        let status = "N/A";
        const select = row.querySelector("select");
        const input = row.querySelector("input");

        if (select) {
          const selectedOption = select.selectedOptions[0];
          status = selectedOption && selectedOption.value ? selectedOption.text : "N/A";
        } else if (input) {
          status = input.value.trim() || "N/A";
        }

        page3Table += `<tr><td>${structure}</td><td>${status}</td></tr>`;
        structureStatus.push({ structure, status });
      });
      page3Table += `</table></div>`;

      // Page 4 checklist
      const checklistItems = document.querySelectorAll("#checklist-table input[type='checkbox']");
      let page4Table = `<h3>Initial Needs Assessment</h3><div class='table-scroll'><table class='preview-table' id='page4preview'><tr><th>Item</th><th>Needed</th></tr>`;
      needsChecklist = []; // Reset needsChecklist
      checklistItems.forEach(item => {
        const label = item.closest("tr").querySelector("td")?.innerText || "";
        page4Table += `<tr><td>${label}</td><td>${item.checked ? "Yes" : "No"}</td></tr>`;
        needsChecklist.push({ item: label, needed: item.checked });
      });
      page4Table += `</table></div>`;

      // Page 4 additional needs
      otherNeeds = document.querySelector("#form-page-4 input[placeholder='Enter items']")?.value || "N/A";
      estQty = document.querySelector("#form-page-4 input[placeholder='Estimated No. of Families to Benefit']")?.value || "N/A";
      responseGroup = document.querySelector("#form-page-4 input[placeholder='Enter Name of Organization/s']")?.value || "N/A";
      reliefDeployed = document.querySelector("#form-page-4 input[placeholder='Enter Relief Assistance']")?.value || "N/A";
      familiesServed = document.querySelector("#form-page-4 input[placeholder='Enter number of families']")?.value || "N/A";

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

      // Wire up the static submit button
      const submitBtn = document.getElementById("submitReportBtn");
      if (submitBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newSubmitBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

        newSubmitBtn.addEventListener("click", (e) => {
          e.preventDefault(); // Prevent form submission
          newSubmitBtn.disabled = true; // Disable button
          newSubmitBtn.textContent = "Submitting..."; // Update text

          console.log("Submit button clicked at:", new Date().toISOString());

          auth.onAuthStateChanged(user => {
            console.log("Auth state checked:", user ? user.uid : "No user");
            if (!user) {
              Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to submit a report.',
              }).then(() => {
                window.location.href = "../pages/login.html";
              });
              newSubmitBtn.disabled = false;
              newSubmitBtn.textContent = "Submit Report";
              return;
            }

            console.log("User authenticated for submission:", user.uid);
            console.log("Form data before validation:", { profileData, affectedCommunities, needsChecklist });

            // Validate form data before submission
            if (!profileData || Object.keys(profileData).length === 0 || 
                !affectedCommunities || affectedCommunities.length === 0 || 
                !needsChecklist || needsChecklist.length === 0) {
              console.error("Form data is incomplete:", { profileData, affectedCommunities, needsChecklist });
              Swal.fire({
                  icon: 'error',
                  title: 'Submission Failed',
                  text: 'Form data is incomplete. Please ensure all fields are filled correctly.',
                  background: '#fef2f2',             
                  color: '#7f1d1d',                  
                  iconColor: '#b91c1c',               
                  confirmButtonColor: '#991b1b',       
                  customClass: {
                      popup: 'swal2-popup-error-clean',
                      title: 'swal2-title-error-clean',
                      content: 'swal2-text-error-clean'
                  }
              });

              newSubmitBtn.disabled = false;
              newSubmitBtn.textContent = "Submit Report";
              return;
            }

            const reportData = {
              rdanaId: `RDANA-${Math.floor(100 + Math.random() * 900)}`,
              dateTime: new Date().toISOString(),
              rdanaGroup: currentUserGroupName,
              siteLocation: profileData[sanitizeKey("Site Location/Address (Barangay)")] || "N/A",
              disasterType: profileData[sanitizeKey("Type of Disaster")] || "N/A",
              effects: { affectedPopulation: affectedCommunities.reduce((sum, c) => sum + c.affected, 0) },
              needs: { priority: needsChecklist.filter(n => n.needed).map(n => n.item) },
              profile: profileData,
              modality: {
                "Locations_and_Areas_Affected": profileData[sanitizeKey("Locations and Areas Affected (Barangay)")] || "N/A",
                "Type_of_Disaster": profileData[sanitizeKey("Type of Disaster")] || "N/A",
                "Date_and_Time_of_Occurrence": (profileData[sanitizeKey("Date of Occurrence")] + " " + profileData[sanitizeKey("Time of Occurrence")]) || "N/A"
              },
              summary: summary,
              affectedCommunities: affectedCommunities,
              structureStatus: structureStatus,
              needsChecklist: needsChecklist,
              otherNeeds: otherNeeds,
              estQty: estQty,
              responseGroup: responseGroup,
              reliefDeployed: reliefDeployed,
              familiesServed: familiesServed,
              userUid: user.uid,
              status: "Submitted",
              timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            console.log("Attempting to save RDANA report:", reportData);

            const ref = database.ref("rdana/submitted");
            console.log("Database reference created:", ref.toString());

            ref.push(reportData)
              .then(() => {
                console.log("RDANA report saved successfully to rdana/submitted");
                Swal.fire({
                  icon: 'success',
                  title: 'Report Submitted',
                  text: 'Your RDANA report has been submitted for verification!',
                  background: '#e6ffed',           // soft mint-green background for positivity
                  color: '#065f46',                // deep green text for good readability
                  iconColor: '#10b981',            // fresh teal-green icon to reinforce success
                  confirmButtonColor: '#059669',  // matching green confirm button for consistency
                  timer: 2000,                    // auto-close after 2 seconds
                  showConfirmButton: false,
                  customClass: {
                    popup: 'swal2-popup-success-clean',
                    title: 'swal2-title-success-clean',
                    content: 'swal2-text-success-clean'
                  }
                }).then(() => {
                  // Reset form data after successful submission
                  profileData = {};
                  affectedCommunities = [];
                  needsChecklist = [];
                  summary = "";
                  structureStatus = [];
                  otherNeeds = "";
                  estQty = "";
                  responseGroup = "";
                  reliefDeployed = "";
                  familiesServed = "";

                  // Reset all form fields
                  document.querySelectorAll('input, textarea, select').forEach(input => {
                    if (input.type === 'checkbox') {
                      input.checked = false;
                    } else {
                      input.value = '';
                    }
                  });

                  // Reset dynamic table to one row
                  const tableBody = document.getElementById("tableBody");
                  if (tableBody) {
                    tableBody.innerHTML = `
                      <tr>
                        <td><input type="text" placeholder="Enter Municipalities/Communities" required/></td>
                        <td><input type="number" placeholder="Enter Total Population" min="0" required/></td>
                        <td><input type="number" placeholder="Enter Affected Population" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Deaths" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Injured" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Missing" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Children" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Women" min="0" required/></td>
                        <td><input type="number" placeholder="No. of Senior Citizens" min="0" required/></td>
                        <td><input type="number" placeholder="No. of PWD" min="0" required/></td>
                        <td><button type="reset" class="removeRowBtn">Clear</button></td>
                      </tr>
                    `;
                  }

                  // Navigate back to the first page
                  document.getElementById("form-page-5").style.display = "none";
                  document.getElementById("form-page-1").style.display = "block";
                });
              })
              .catch(error => {
                console.error("Error saving RDANA report to Firebase:", error);
                console.error("Error code:", error.code);
                console.error("Error message:", error.message);
                Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: 'Failed to submit RDANA report: ' + error.message,
                background: '#fdecea',          
                color: '#b91c1c',                
                iconColor: '#dc2626',            
                confirmButtonColor: '#b91c1c',  
                timer: 3000,                    
                showConfirmButton: true,
                customClass: {
                  popup: 'swal2-popup-error-clean',
                  title: 'swal2-title-error-clean',
                  content: 'swal2-text-error-clean'
                }
              });

              })
              .finally(() => {
                newSubmitBtn.disabled = false;
                newSubmitBtn.textContent = "Submit Report";
              });
          });
        });
      }
    });
  }

  // Only add event listeners for search and sort if the elements exist
  if (searchInput && sortSelect) {
    searchInput.addEventListener("input", applySearchAndSort);
    sortSelect.addEventListener("change", applySearchAndSort);
  }

  // Add navigation for other pages (next/back buttons)
  const nextBtn1 = document.getElementById('nextBtn1');
  const nextBtn2 = document.getElementById('nextBtn2');
  const nextBtn3 = document.getElementById('nextBtn3');
  const backBtn2 = document.getElementById('backBtn2');
  const backBtn3 = document.getElementById('backBtn3');
  const backBtn4 = document.getElementById('backBtn4');
  const backBtn5 = document.getElementById('backBtn5');

  if (nextBtn1) {
    nextBtn1.addEventListener('click', () => {
      if (validatePageInputs('#form-page-1')) {
        document.getElementById("form-page-1").style.display = "none";
        document.getElementById("form-page-2").style.display = "block";
      } else {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Data',
            text: 'Please fill in all required fields on this page.',
            background: '#fffaf0',             
            color: '#92400e',                  
            iconColor: '#f59e0b',              
            confirmButtonColor: '#d97706',     
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                content: 'swal2-text-warning-clean'
            }
        });
      }
    });
  }

  if (nextBtn2) {
    nextBtn2.addEventListener('click', () => {
      if (validatePageInputs('#form-page-2')) {
        document.getElementById("form-page-2").style.display = "none";
        document.getElementById("form-page-3").style.display = "block";
      } else {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Data',
            text: 'Please fill in all required fields on this page.',
            background: '#fffaf0',             
            color: '#92400e',                  
            iconColor: '#f59e0b',              
            confirmButtonColor: '#d97706',     
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                content: 'swal2-text-warning-clean'
            }
        });
      }
    });
  }

  if (nextBtn3) {
    nextBtn3.addEventListener('click', () => {
      if (validatePageInputs('#form-page-3')) {
        document.getElementById("form-page-3").style.display = "none";
        document.getElementById("form-page-4").style.display = "block";
      } else {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete Data',
            text: 'Please fill in all required fields on this page.',
            background: '#fffaf0',             
            color: '#92400e',                  
            iconColor: '#f59e0b',              
            confirmButtonColor: '#d97706',     
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                content: 'swal2-text-warning-clean'
            }
        });
      }
    });
  }

  if (backBtn2) {
    backBtn2.addEventListener('click', () => {
      document.getElementById("form-page-2").style.display = "none";
      document.getElementById("form-page-1").style.display = "block";
    });
  }

  if (backBtn3) {
    backBtn3.addEventListener('click', () => {
      document.getElementById("form-page-3").style.display = "none";
      document.getElementById("form-page-2").style.display = "block";
    });
  }

  if (backBtn4) {
    backBtn4.addEventListener('click', () => {
      document.getElementById("form-page-4").style.display = "none";
      document.getElementById("form-page-3").style.display = "block";
    });
  }

  if (backBtn5) {
    backBtn5.addEventListener('click', () => {
      document.getElementById("form-page-5").style.display = "none";
      document.getElementById("form-page-4").style.display = "block";
    });
  }

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

});

