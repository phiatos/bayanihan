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

  // Form data variables
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
  let currentUserGroupName = '';
  let currentUserUid = '';
  let canSubmit = false; // Flag to control submission eligibility
  let reportData = {}; // global variable inside DOMContentLoaded


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

  function formatLargeNumber(value) {
  if (value === null || value === undefined || value === "") return "0";

  // Convert to number safely
  let num = Number(value.toString().replace(/^0+/, "")); // Remove leading zeros
  if (isNaN(num)) return "0";

  // Handle large numbers
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000)         return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";

  return num.toString();
}
// Function to generate preview
function generatePreview() {
  const previewContainer = document.getElementById("preview-data");
  previewContainer.innerHTML = ""; // clear previous preview

  // ===== Page 1: Disaster Profile =====
  const provinceSelect = document.getElementById("profileProvince");
  const citySelect = document.getElementById("profileCity");
  const barangaySelect = document.getElementById("profileBarangay");

  const province = provinceSelect.options[provinceSelect.selectedIndex]?.text || "";
  const city = citySelect.options[citySelect.selectedIndex]?.text || "";
  const barangay = barangaySelect.options[barangaySelect.selectedIndex]?.text || "";
  const infoDate = document.getElementById("infoGatheredDate").value;

  // Authorities & Organizations table
  const profileTable = document.querySelector("#Profilepreviewdata-table tbody");
  const authorityOrgRows = [];
  profileTable.querySelectorAll("tr:not(.no-entries)").forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 2) {
      const authority = cells[0].innerText.trim();
      const organization = cells[1].innerText.trim();
      if (authority || organization) {
        authorityOrgRows.push({ authority, organization });
      }
    }
  });

  // ===== Page 1: Modality (Affected Locations) =====
  const affectedLocations = [];
  const locationTable = document.querySelector("#Locationspreviewdata-table tbody");
  locationTable.querySelectorAll("tr:not(.no-entries)").forEach(row => {
    const cells = row.querySelectorAll("td");
    affectedLocations.push({
      province: cells[0].innerText,
      city: cells[1].innerText,
      barangay: cells[2].innerText
    });
  });

  const disasterTypeSelect = document.getElementById("disasterType");
  const disasterType = disasterTypeSelect.options[disasterTypeSelect.selectedIndex]?.text || "";

  const occurrenceDate = document.getElementById("occurrenceDate").value;
  const summary = document.getElementById("summaryInput").value;

  // ===== Page 2: Initial Effects =====
  const disasterEffects = [];
  const effectsTable = document.querySelector("#tableBody");
  effectsTable.querySelectorAll("tr:not(.error-row)").forEach(row => {
    const inputs = row.querySelectorAll("input, select");
    const effect = Array.from(inputs).map(input => {
      if (input.tagName === "SELECT") {
        return input.options[input.selectedIndex]?.text || "";
      }
      return input.value;
    });
    disasterEffects.push(effect);
  });

// ===== Page 3: Status of Lifelines, Social Structure, and Critical Facilities =====
const lifelines = [];
const statusTable = document.querySelector("#status-table tbody");
statusTable.querySelectorAll("tr").forEach(row => {
  const structure = row.querySelector("td#status-td")?.innerText.trim();
  const select = row.querySelector("select");
  const input = row.querySelector("input");

  let status = "N/A"; // default value

  if (select) {
    const selectedText = select.options[select.selectedIndex]?.text;
    if (selectedText && selectedText !== "Select from one of the following") {
      status = selectedText;
    }
  }

  if (input) {
    const inputVal = input.value.trim();
    if (inputVal) {
      status = inputVal;
    }
  }

  if (structure) {
    lifelines.push({ structure, status });
  }
});



// ===== Page 4: Initial Needs Assessment =====
const checklistLabels = {
  reliefPacks: "Relief Packs",
  hotMeals: "Hot Meals",
  hygieneKits: "Hygiene Kits",
  drinkingWater: "Drinking Water",
  ricePacks: "Rice Packs"
};

// Collect checked items
const checklist = [];
Object.keys(checklistLabels).forEach(id => {
  const cb = document.getElementById(id);
  if (cb && cb.checked) {
    checklist.push(id);
  }
});

// Build checklist HTML
let checklistHtml = "None";
if (checklist.length > 0) {
  checklistHtml = checklist
    .map(item => `<span class="badge">${checklistLabels[item] || item}</span>`)
    .join(" ");
}


  const immediateNeeds = [];
  const needsTable = document.querySelector("#ImmediateNeedspreviewdata-table tbody");
  needsTable.querySelectorAll("tr:not(.no-entries)").forEach(row => {
    const cells = row.querySelectorAll("td");
    immediateNeeds.push({
      need: cells[0].innerText,
      qty: cells[1].innerText
    });
  });

  const initialResponse = [];
  const responseTable = document.querySelector("#InitialResponsepreviewdata-table tbody");
  responseTable.querySelectorAll("tr:not(.no-entries)").forEach(row => {
    const cells = row.querySelectorAll("td");
    initialResponse.push({
      group: cells[0].innerText,
      assistance: cells[1].innerText,
      families: cells[2].innerText
    });
  });

  const reportData = {
    profile: {
      province,
      city,
      barangay,
      infoDate,
      authorities: authorityOrgRows,
      affectedLocations,
      disasterType,
      occurrenceDate,
      summary
    },
    disasterEffects,
    lifelines,
    checklist,
    immediateNeeds,
    initialResponse
  };


  // ===== Build HTML preview =====
  let html = `
    <div class="preview-section">
      <h2>I. Profile of the Disaster</h2>
      <p><strong>Site Location/Address (Province):</strong> ${province}</p>
      <p><strong>Site Location/Address (City/Municipality):</strong> ${city}</p>
      <p><strong>Site Location/Address (Barangay):</strong> ${barangay}</p>
      <p><strong>Date and Time of Information Gathered:</strong> ${infoDate}</p>

      <p><strong>Authorities & Organizations</strong></p>
      <table class="preview-table">
        <tr><th>Authority</th><th>Organization</th></tr>
        ${authorityOrgRows.map(r => `<tr><td>${r.authority}</td><td>${r.organization}</td></tr>`).join("")}
      </table>

      <h3>Modality</h3>
      <p><strong>Locations and Areas Affected:</strong></p>
      <ul>${affectedLocations.map(loc => `<li>${loc.province} / ${loc.city} / ${loc.barangay}</li>`).join("")}</ul>

      <p><strong>Disaster Details:</strong></p>
      <p><strong>Type of Disaster:</strong> ${disasterType}</p>
      <p><strong>Date and Time of Occurence:</strong> ${occurrenceDate}</p>
      <p><strong>Summary:</strong> ${summary}</p>
    </div>


    <div class="preview-section">
      <h2>II. Initial Effects</h2>
      <table class="preview-table">
        <tr>
          <th>City/Municipality</th>
          <th>Total Pop</th>
          <th>Affected</th>
          <th>Deaths</th>
          <th>Injured</th>
          <th>Missing</th>
          <th>Children</th>
          <th>Women</th>
          <th>Seniors</th>
          <th>PWD</th>
        </tr>
        ${disasterEffects.map(row => `
          <tr>
            ${row.map((col, i) => {
              // Apply formatting only to numeric columns (skip city/municipality)
              if (i > 0) {
                return `<td>${formatLargeNumber(col)}</td>`;
              }
              return `<td>${col}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </table>
    </div>

    <div class="preview-section">
      <h2>III. Status of Lifelines, Social Structure, and Critical Facilities</h2>
      <table class="preview-table">
        <tr><th>Structure</th><th>Status</th></tr>
        ${lifelines.map(r => `<tr><td>${r.structure}</td><td>${r.status}</td></tr>`).join("")}
      </table>
    </div>


    <div class="preview-section">
      <h2>IV. Initial Needs Assessment Checklist</h2>
      <p><strong>Checklist Items:</strong></p>
      <div class="checklist-container">${checklistHtml}</div>
      <table class="preview-table">
        <tr><th>Need</th><th>Quantity</th></tr>
        ${immediateNeeds.map(n => `
          <tr>
            <td>${n.need}</td>
            <td>${formatLargeNumber(n.qty)}</td>
          </tr>
        `).join("")}
      </table>
    </div>

    <div class="preview-section">
      <h2>V. Initial Response Actions</h2>
      <table class="preview-table">
        <tr><th>Group</th><th>Assistance</th><th>Families</th></tr>
        ${initialResponse.map(r => `
          <tr>
            <td>${r.group}</td>
            <td>${r.assistance}</td>
            <td>${formatLargeNumber(r.families)}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `;

  previewContainer.innerHTML = html;
    console.log("📄 Generated Report Data:", JSON.stringify(reportData, null, 2));

  return reportData;
}

  // Notify admin function
  const notifyAdmin = async (message, disasterType, location, details, rdanaId, senderName, organization) => {
    try {
      const identifier = `rdana_${rdanaId}_${Date.now()}`;
      const key = firebase.database().ref("notifications").push().key;
      await firebase.database().ref("notifications").child(key).set({
        message,
        calamityType: disasterType || null,
        location: location || null,
        details: details || null,
        eventId: null,
        rdanaId,
        senderName,
        organization,
        identifier,
        timestamp: Date.now(),
        read: false,
        type: "admin"
      });
      
    } catch (error) {
      
    }
  };

  // Variables for inactivity detection --------------------------------------------------------------------
  let inactivityTimeout;
  const INACTIVITY_TIME = 1800000; // 30 minutes in milliseconds

  // Function to reset the inactivity timer
  function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, INACTIVITY_TIME);
    
  }

  // Function to check for inactivity and prompt the user
  function checkInactivity() {
    Swal.fire({
      title: 'Are you still there?',
      text: 'You\'ve been inactive for a while. Do you want to continue your session or log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Stay Login',
      cancelButtonText: 'Log Out',
      allowOutsideClick: false,
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        resetInactivityTimer();
        
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        auth.signOut().then(() => {
          
          window.location.href = "../pages/login.html";
        }).catch((error) => {
          
          Swal.fire('Error', 'Failed to log out. Please try again.', 'error');
        });
      }
    });
  }

  // Attach event listeners to detect user activity
  ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
    document.addEventListener(eventType, resetInactivityTimer);
  });

  

  // Check if user is authenticated and determine submission eligibility
  auth.onAuthStateChanged(async user => {
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

    resetInactivityTimer();
    
    currentUserUid = user.uid;

    const profilePage = 'profile.html';

    try {
      // Fetch user data from the database
      const userSnapshot = await database.ref(`users/${user.uid}`).once("value");
      const userDataFromDb = userSnapshot.val();

      if (!userDataFromDb) {
        
        Swal.fire({
          icon: 'error',
          title: 'User Data Missing',
          text: 'Your user profile is incomplete. Please contact support.',
        }).then(() => {
          window.location.href = "../pages/login.html";
        });
        return;
      }

      // Password reset check
      const passwordNeedsReset = userDataFromDb.password_needs_reset || false;
      if (passwordNeedsReset) {
        
        Swal.fire({
          icon: 'error',
          title: 'Password Change Required',
          text: 'For security reasons, please change your password. You will be redirected to your profile.',
          allowOutsideClick: false,
          timer: 1600,
          showConfirmButton: false,
          timerProgressBar: true,
          customClass: {
            popup: 'swal2-popup-error-clean',
            title: 'swal2-title-error-clean',
            htmlContainer: 'swal2-text-error-clean'
          }
        }).then(() => {
          window.location.replace(`../pages/${profilePage}`);
        });
        return;
      }

      // === PAGE NAVIGATION FUNCTION ===
      // Select all pages and steps
      const pages = Array.from(document.querySelectorAll(".form-page"));
      const steps = Array.from(document.querySelectorAll(".step"));
      let currentPageIndex = 0;

      // Function to show a page based on index and update stepper
window.showPage = function(index) {
  pages.forEach((page, i) => {
    const isVisible = i === index;
    page.style.display = isVisible ? "block" : "none";

    page.querySelectorAll("input, select, textarea").forEach(el => {
      if (isVisible) el.removeAttribute("disabled");
      else el.setAttribute("disabled", "disabled");
    });
  });

  currentPageIndex = index;

  steps.forEach((step, i) => {
    step.classList.toggle("active", i === index);
  });
};


// Initialize first page
showPage(0);

// Next buttons
document.querySelectorAll("[id^='nextBtn']").forEach(btn => {
  btn.addEventListener("click", () => {
    const currentPageId = pages[currentPageIndex].id;

    if (validatePage(currentPageId)) {
      if (currentPageIndex < pages.length - 1) {
        showPage(currentPageIndex + 1);
      }
    }
  });
});

// Back buttons
document.querySelectorAll("[id^='backBtn']").forEach(btn => {
  btn.addEventListener("click", () => {
    if (currentPageIndex > 0) showPage(currentPageIndex - 1);
  });
});

    // Optional: allow clicking steps only if you want
    steps.forEach((step, i) => {
      step.addEventListener("click", () => {
        // Only allow jump if previous pages are valid
        let canJump = true;
        for (let j = 0; j < i; j++) {
          if (!validatePage(pages[j].id)) {
            canJump = false;
            break;
          }
        }
        if (canJump) showPage(i);
      });
    });




      // Get user role and organization
      const currentUserRole = userDataFromDb.role;
      currentUserGroupName = userDataFromDb.organization || 'Admin';
      

      // Role-based submission eligibility check
      const submitBtn = document.getElementById("submitReportBtn");
      if (currentUserRole === 'AB ADMIN') {
        
        canSubmit = true;
        if (submitBtn) submitBtn.disabled = false; // Ensure button is enabled
      } else if (currentUserRole === 'ABVN') {
        
        if (currentUserGroupName === 'Admin') {
          
          Swal.fire({
            icon: 'warning',
            title: 'Organization Not Assigned',
            text: 'Your account is not associated with an organization. Redirecting to dashboard.',
          }).then(() => {
            window.location.href = '../pages/dashboard.html';
          });
          return;
        }

        // Check for active activations
        const organizationActivationsSnapshot = await database.ref("activations")
          .orderByChild("organization")
          .equalTo(currentUserGroupName)
          .once('value');

        let organizationHasActiveActivations = false;
        organizationActivationsSnapshot.forEach(childSnapshot => {
          if (childSnapshot.val().status === "active") {
            organizationHasActiveActivations = true;
            return true; // Exit loop early
          }
        });

        if (organizationHasActiveActivations) {
          canSubmit = true;
          if (submitBtn) submitBtn.disabled = false;
        } else {
          canSubmit = false;
          if (submitBtn) {
            submitBtn.disabled = true; // Disable submit button
            Swal.fire({
              icon: 'warning',
              title: 'Organization Inactive',
              text: 'Your organization has no active operations. Redirecting to dashboard.',
              allowOutsideClick: false,
              showConfirmButton: true,
              confirmButtonText: 'OK',
              customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                htmlContainer: 'swal2-text-warning-clean',
                confirmButton: 'my-warning-button'
              },
              didClose: () => {
                window.location.href = '../pages/dashboard.html';
              }
            });
          }
        }
      } else {
        canSubmit = false;
        if (submitBtn) submitBtn.disabled = true;
        Swal.fire({
          icon: 'error',
          title: 'Unauthorized Access',
          text: 'Your role does not permit report submission. Redirecting to dashboard.',
        }).then(() => {
          window.location.href = '../pages/dashboard.html';
        });
        return;
      }

      // Load reports if elements exist
      if (submittedReportsContainer && paginationContainer && entriesInfo && searchInput && sortSelect) {
        loadSubmittedReports(user.uid);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Authentication Error',
        text: 'Failed to verify account status. Please try logging in again.',
      }).then(() => {
        window.location.href = '../pages/login.html';
      });
    }
  });

  // Call generatePreview when opening Page 5
  document.getElementById("nextBtn4").addEventListener("click", () => {
    generatePreview();
  });

  const submitBtn = document.getElementById("submitReportBtn");

  if (submitBtn) {
    submitBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      // Generate the report data
      const reportData = generatePreview();

      // Basic validation
      if (!reportData || !reportData.profile || reportData.disasterEffects.length === 0) {
        Swal.fire({
          icon: "error",
          title: "Incomplete Data",
          text: "Please ensure all required fields are filled before submitting.",
        });
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Report";
        return;
      }

      // Firebase authentication check
      const user = auth.currentUser;
      if (!user) {
        Swal.fire({
          icon: "error",
          title: "Sign In Required",
          text: "Please sign in to submit a report.",
        }).then(() => window.location.href = "../pages/login.html");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Report";
        return;
      }

      // Generate a unique ID for the report
      async function generateUniqueId() {
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
          const randomNum = Math.floor(100 + Math.random() * 900);
          const customId = `RDANA-${randomNum}`;

          const snapshot = await database.ref("rdana/submitted")
            .orderByChild("rdanaId").equalTo(customId).once("value");

          if (!snapshot.exists()) return customId;
          attempts++;
        }
        throw new Error("Unable to generate a unique RDANA ID.");
      }

      try {
        const rdanaId = await generateUniqueId();
        const submission = {
          rdanaId,
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          userUid: user.uid,
          reportData,
          status: "Submitted",
        };

        const ref = database.ref("rdana/submitted");
        await ref.push(submission);

        // ✅ Notify admin after submission
        try {
          const message = `New RDANA report (${rdanaId}) submitted by ${currentUserGroupName || user.email || user.uid} on ${new Date().toLocaleString()}.`;
          await notifyAdmin(
            message,
            reportData.profile?.disasterType || null,
            [reportData.profile?.province, reportData.profile?.city, reportData.profile?.barangay].filter(Boolean).join(', ') || null,
            reportData.profile?.summary || null,
            rdanaId,
            currentUserGroupName || user.displayName || user.email || user.uid,
            currentUserGroupName || user.displayName || user.email || user.uid
          );
        } catch (notifyErr) {
          console.error("notifyAdmin error (non-fatal):", notifyErr);
        }


        Swal.fire({
          icon: "success",
          title: "Report Submitted",
          text: "Your report has been successfully submitted.",
          timer: 2000,
          showConfirmButton: false,
          willClose: () => {
            window.showPage(0);
          }
          });
        // Reset all form inputs
        document.querySelectorAll("input, select, textarea").forEach(input => {
          if (input.type === "checkbox" || input.type === "radio") {
            input.checked = false;
          } else {
            input.value = "";
          }
        });

        // Clear all preview tables
        document.querySelectorAll("table.required-table, table").forEach(table => {
          const tbody = table.querySelector("tbody");
          if (!tbody) return;

          // Remove all rows except the placeholder row (class="no-entries")
          tbody.querySelectorAll("tr:not(.no-entries)").forEach(row => row.remove());

          // Restore the placeholder row if it exists
          const placeholder = tbody.querySelector(".no-entries");
          if (placeholder) placeholder.style.display = "";
        });

        document.getElementById("preview-data").innerHTML = "";
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Submission Failed",
          text: error.message,
        });
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Report";
      }
    });
  }

  




  

  // Input validation for text fields
document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
  input.addEventListener('input', function () {

    if (this.classList.contains('number-input')) {
      // Number-only validation here:
      this.value = this.value
        .replace(/-/g, '')           // Remove minus signs
        .replace(/[^0-9.]/g, '')     // Allow digits and decimal point
        .replace(/(\..*)\./g, '$1'); // Only one decimal point

      // Remove leading zeros except for "0." pattern
      if (/^0[0-9]/.test(this.value)) {
        this.value = this.value.replace(/^0+/, '');
      }
    } else {
      // Your existing text input validations
      this.value = this.value.charAt(0).toUpperCase() + this.value.slice(1);

      if (this.placeholder.includes('Name') || this.placeholder.includes('Organization')) {
        this.value = this.value.replace(/[^a-zA-Z\s,-]/g, '');
      }
      if (this.id === 'affectedBarangayInput') {
        this.value = this.value.replace(/[^a-zA-Z0-9\s,-]/g, '');
      } else if (this.placeholder.includes('Name') || this.placeholder.includes('Organization') || (this.id === 'OthersInput')) {
        this.value = this.value.replace(/[^a-zA-Z\s,-]/g, '');
      } else if (
        this.placeholder.includes('City/Municipality') ||
        this.placeholder.includes('Province') ||
        this.placeholder.includes('Relief Assistance') ||
        this.placeholder.includes('Items') ||
        this.placeholder.includes('Barangay')
      ) {
        this.value = this.value.replace(/[^a-zA-Z\s,-]/g, '');
      } else {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
      }
    }
  });
});

  // Only add event listeners for search and sort if the elements exist
  if (searchInput && sortSelect) {
    searchInput.addEventListener("input", applySearchAndSort);
    sortSelect.addEventListener("change", applySearchAndSort);
  }

// ====== INPUT VALIDATION (delegated) ======
document.getElementById("tableBody").addEventListener("input", (e) => {
  const input = e.target;

  if (input.classList.contains("number-input")) {
    // Number-only validation
    input.value = input.value
      .replace(/-/g, '')           // Remove minus signs
      .replace(/[^0-9.]/g, '')     // Allow only digits and decimal
      .replace(/(\..*)\./g, '$1'); // Only one decimal point

    // Remove leading zeros except "0."
    if (/^0[0-9]/.test(input.value)) {
      input.value = input.value.replace(/^0+/, '');
    }

  } else if (input.type === "text") {
    // Example text validation: capitalize first letter
    input.value = input.value.charAt(0).toUpperCase() + input.value.slice(1);
    // Remove invalid characters (letters, spaces, commas, hyphens allowed)
    input.value = input.value.replace(/[^a-zA-Z\s,-]/g, '');
  }
});

const pageValidations = {
  "form-page-1": {
    staticInputs: [
      "profileProvince",
      "profileCity",
      "profileBarangay",
      "infoGatheredDate",
      "disasterType",
      "occurrenceDate"
    ],
    tables: ["Profilepreviewdata-table", "Locationspreviewdata-table"]
  },
   "form-page-2": {
    staticInputs: [], // no standalone inputs
    tables: [
      { id: "disasterprofile-table", optionalIfFilled: false } // require at least one entry
    ]
  },
  "form-page-3": {
    staticInputs: [], // all optional, no required inputs
    tables: []
  },
  "form-page-4": {
  staticInputs: ["responseGroupInput", "assistanceInput", "familiesInput"],
  tables: [
    {
      id: "InitialResponsepreviewdata-table",
      optionalIfFilled: true // <-- allows table to satisfy requirement
    }
  ]
}
};


function validatePage(pageId) {
  const page = document.getElementById(pageId);
  if (!page) return false;

  const rules = pageValidations[pageId];
  if (!rules) return true; // no rules, always valid

  let isValid = true;

  // 1. Validate static inputs
  rules.staticInputs?.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (!input.value || (input.type === "checkbox" && !input.checked)) {
      isValid = false;
      input.classList.add("input-error");
    } else {
      input.classList.remove("input-error");
    }
  });

  // 2. Special 48-hour check for page 1
  if (pageId === "form-page-1") {
    const infoInput = document.getElementById("infoGatheredDate");
    const occInput = document.getElementById("occurrenceDate");
    const infoDate = infoInput.value;
    const occDate = occInput.value;

    if (infoDate && occDate) {
      const diffMs = new Date(infoDate) - new Date(occDate);
      const maxMs = 48 * 60 * 60 * 1000; // 48 hours

      if (diffMs < 0 || diffMs > maxMs) {
        isValid = false;
        infoInput.classList.add("input-error");
        occInput.classList.add("input-error");

        Swal.fire({
          icon: "error",
          title: "Invalid Dates",
          text: "The report must be submitted within 48 hours after the disaster."
        });
      } else {
        infoInput.classList.remove("input-error");
        occInput.classList.remove("input-error");
      }
    }
  }

  // 3. Page 2 table validation (at least one complete row)
  if (pageId === "form-page-2") {
    const table = document.getElementById("disasterprofile-table");
    const rows = table.querySelectorAll("tbody tr");
    let tableValid = false;

    rows.forEach(row => {
      const inputs = row.querySelectorAll("input[required], select[required]");
      let rowValid = true;

      inputs.forEach(input => {
        if (!input.value) {
          rowValid = false;
          input.classList.add("input-error");
        } else {
          input.classList.remove("input-error");
        }
      });

      if (rowValid) tableValid = true; // at least one complete row
    });

    if (!tableValid) {
      isValid = false;
      Swal.fire({
        icon: "error",
        title: "Incomplete Data",
        text: "Please fill in at least one complete row in the Initial Effects table."
      });
    }
  }

  // 4. Page 4: static inputs OR table filled
  if (pageId === "form-page-4") {
    const table = document.getElementById("InitialResponsepreviewdata-table");
    const rows = table.querySelectorAll("tbody tr:not(.no-entries)");
    const tableValid = rows.length > 0;

    const staticValid = rules.staticInputs.every(id => {
      const input = document.getElementById(id);
      if (!input) return false;
      if (!input.value) {
        input.classList.add("input-error");
        return false;
      } else {
        input.classList.remove("input-error");
        return true;
      }
    });

    if (!tableValid && !staticValid) {
      isValid = false;
      Swal.fire({
        icon: "error",
        title: "Incomplete Data",
        text: "Please fill out all required fields or add at least one entry in the Initial Response table."
      });
    } else {
      isValid = true; // either table has row or static inputs filled
    }
  }

  // 5. General table validations for other pages
  rules.tables?.forEach(tableRule => {
    let tableId, optionalIfFilled = false;

    if (typeof tableRule === "string") tableId = tableRule;
    else {
      tableId = tableRule.id;
      optionalIfFilled = tableRule.optionalIfFilled || false;
    }

    const table = document.getElementById(tableId);
    if (!table) return;

    const hasData = table.querySelectorAll("tbody tr:not(.no-entries)").length > 0;

    if (!hasData && !optionalIfFilled) {
      isValid = false;
      table.classList.add("input-error");
    } else {
      table.classList.remove("input-error");
    }
  });

  // 6. Show general error if still invalid
  if (!isValid && pageId !== "form-page-2" && pageId !== "form-page-1" && pageId !== "form-page-4") {
    Swal.fire({
      icon: "error",
      title: "Incomplete Data",
      text: "Please fill out all required fields and add at least one entry in the table(s) before continuing."
    });
  }

  return isValid;
}










});


const regionSelect = document.getElementById("region");
const provinceSelect = document.getElementById("profileProvince");
const citySelect = document.getElementById("profileCity");
const barangaySelect = document.getElementById("profileBarangay");

const AffectedprovinceSelect = document.getElementById("AffectedProvince");
const AffectedcitySelect = document.getElementById("AffectedCity");
const AffectedbarangaySelect = document.getElementById("AffectedBarangay");

const IEcitySelect = document.getElementById("IE-city");

const baseJsonPath = '../json/';

var my_handlers = {
    fill_provinces: function () {
        // Reset both sets
        provinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
        citySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';

        AffectedprovinceSelect.innerHTML = '<option value="" selected="true" disabled>Choose Province</option>';
        AffectedcitySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';
        AffectedbarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Province First</option>';

        const url = `${baseJsonPath}province.json`;
        console.log(`Fetching provinces from: ${url}`);

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Province data loaded:", data);

                if (!Array.isArray(data) || !data.every(item => item.province_code && item.province_name)) {
                    throw new Error("Invalid province data structure");
                }

                data.sort((a, b) => a.province_name.localeCompare(b.province_name));

                data.forEach(entry => {
                    // Profile provinces
                    const opt1 = document.createElement('option');
                    opt1.value = entry.province_code;
                    opt1.textContent = entry.province_name;
                    provinceSelect.appendChild(opt1);

                    // Affected provinces
                    const opt2 = document.createElement('option');
                    opt2.value = entry.province_code;
                    opt2.textContent = entry.province_name;
                    AffectedprovinceSelect.appendChild(opt2);
                });
            })
            .catch(error => {
                console.error("Province fetch failed:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Load Provinces',
                    text: `Unable to load province data: ${error.message}`,
                    confirmButtonText: 'OK'
                });
            });
    },

    // Profile Cities
    fill_cities: function () {
        var province_code = provinceSelect.value;
        if (!province_code) {
            Swal.fire({
                icon: 'warning',
                title: 'Select Province First',
                text: 'Please select a province before choosing a city.',
                confirmButtonText: 'OK'
            });
            return;
        }

        citySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';

        const url = `${baseJsonPath}city.json`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                var result = data.filter(c => c.province_code === province_code);
                result.sort((a, b) => a.city_name.localeCompare(b.city_name));

                result.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.city_code;
                    opt.textContent = entry.city_name;
                    citySelect.appendChild(opt);
                });
            })
            .catch(error => {
                console.error("City fetch failed:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Load Cities',
                    text: `Unable to load city data: ${error.message}`,
                    confirmButtonText: 'OK'
                });
            });
    },

    // Affected Cities
    fill_affected_cities: function () {
        var province_code = AffectedprovinceSelect.value;
        if (!province_code) {
            Swal.fire({
                icon: 'warning',
                title: 'Select Province First',
                text: 'Please select a province before choosing a city.',
                confirmButtonText: 'OK'
            });
            return;
        }

        AffectedcitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
        AffectedbarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose City First</option>';

        const url = `${baseJsonPath}city.json`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                var result = data.filter(c => c.province_code === province_code);
                result.sort((a, b) => a.city_name.localeCompare(b.city_name));

                result.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.city_code;
                    opt.textContent = entry.city_name;
                    AffectedcitySelect.appendChild(opt);
                });
            })
            .catch(error => {
                console.error("Affected city fetch failed:", error);
            });
    },

    // Profile Barangays
    fill_barangays: function () {
        var city_code = citySelect.value;
        if (!city_code) {
            Swal.fire({
                icon: 'warning',
                title: 'Select City First',
                text: 'Please select a city before choosing a barangay.',
                confirmButtonText: 'OK'
            });
            return;
        }

        barangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';

        const url = `${baseJsonPath}barangay.json`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                var result = data.filter(b => b.city_code === city_code);
                result.sort((a, b) => a.brgy_name.localeCompare(b.brgy_name));

                result.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.brgy_code;
                    opt.textContent = entry.brgy_name;
                    barangaySelect.appendChild(opt);
                });
            })
            .catch(error => {
                console.error("Barangay fetch failed:", error);
            });
    },

    // Affected Barangays
    fill_affected_barangays: function () {
        var city_code = AffectedcitySelect.value;
        if (!city_code) {
            Swal.fire({
                icon: 'warning',
                title: 'Select City First',
                text: 'Please select a city before choosing a barangay.',
                confirmButtonText: 'OK'
            });
            return;
        }

        AffectedbarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';

        const url = `${baseJsonPath}barangay.json`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                var result = data.filter(b => b.city_code === city_code);
                result.sort((a, b) => a.brgy_name.localeCompare(b.brgy_name));

                result.forEach(entry => {
                    const opt = document.createElement('option');
                    opt.value = entry.brgy_code;
                    opt.textContent = entry.brgy_name;
                    AffectedbarangaySelect.appendChild(opt);
                });
            })
            .catch(error => {
                console.error("Affected barangay fetch failed:", error);
            });
    },
};

my_handlers.fill_IE_cities = function (selectEl) {
    if (!selectEl) return; // safety check

    const province_code = provinceSelect.value; // profile province drives IE-city
    selectEl.innerHTML = '<option value="" selected disabled>Loading...</option>';

    if (!province_code) {
        selectEl.innerHTML = '<option value="" selected disabled>Select City/Municipality</option>';
        return;
    }

    fetch(`${baseJsonPath}city.json`)
        .then(response => response.json())
        .then(data => {
            const result = data.filter(c => c.province_code === province_code);
            result.sort((a, b) => a.city_name.localeCompare(b.city_name));

            selectEl.innerHTML = '<option value="" selected disabled>Select City/Municipality</option>';
            result.forEach(entry => {
                const opt = document.createElement('option');
                opt.value = entry.city_code;
                opt.textContent = entry.city_name;
                selectEl.appendChild(opt);
            });
        })
        .catch(error => console.error("IE City fetch failed:", error));
};


document.addEventListener("DOMContentLoaded", function () {
  // load provinces (this populates both profile and affected province <select>s)
  my_handlers.fill_provinces();

  // Populate all existing IE-city selects
    document.querySelectorAll(".IE-city").forEach(select => {
        my_handlers.fill_IE_cities(select);
  });

  AffectedprovinceSelect.disabled = true;

  let affectedProvinceHidden = document.getElementById('AffectedProvinceHidden');
  if (!affectedProvinceHidden) {
    affectedProvinceHidden = document.createElement('input');
    affectedProvinceHidden.type = 'hidden';
    affectedProvinceHidden.id = 'AffectedProvinceHidden';
    affectedProvinceHidden.name = 'AffectedProvince'; // adjust name if your backend expects something else
    // append inside form if you have one, otherwise append to body
    const formEl = document.querySelector('form');
    (formEl || document.body).appendChild(affectedProvinceHidden);
  }

  // When user picks Profile Province:
  provinceSelect.addEventListener('change', function () {
    // populate profile cities for selected province
    my_handlers.fill_cities();

    document.querySelectorAll(".IE-city").forEach(select => {
            my_handlers.fill_IE_cities(select);
    });

    // sync affected province to the same value & update hidden input for submission
    AffectedprovinceSelect.value = this.value;
    affectedProvinceHidden.value = this.value;

    // reset affected city/barangay placeholders (user will pick these independently)
    AffectedcitySelect.innerHTML = '<option value="" selected="true" disabled>Choose City / Municipality</option>';
    AffectedbarangaySelect.innerHTML = '<option value="" selected="true" disabled>Choose Barangay</option>';

    // populate AffectedCity dropdown for the same province (user can still pick a different city)
    my_handlers.fill_affected_cities();
  });

  // When user picks Profile City -> populate profile barangays only
  citySelect.addEventListener('change', function () {
    my_handlers.fill_barangays();
    // DO NOT sync affected city here (user can choose a different municipality)
  });

  // When user picks Affected City -> populate affected barangays
  AffectedcitySelect.addEventListener('change', function () {
    my_handlers.fill_affected_barangays();
  });

  // If Profile Province already has a pre-filled value on load (e.g., editing an existing report),
  // sync Affected province and populate its cities:
  if (provinceSelect.value) {
    AffectedprovinceSelect.value = provinceSelect.value;
    affectedProvinceHidden.value = provinceSelect.value;
    // populate AffectedCity list for that province so the user can pick municipality/barangay
    my_handlers.fill_affected_cities();
  }
});


//Add to table functions
document.getElementById("addAuthorityBtn").addEventListener("click", function() {
  addToTable("authority");
});

document.getElementById("addOrganizationBtn").addEventListener("click", function() {
  addToTable("organization");
});

document.getElementById("addAuthorityBtn").addEventListener("click", function() {
  addToTable("authority");
});

document.getElementById("addOrganizationBtn").addEventListener("click", function() {
  addToTable("organization");
});

function addToTable(type) {
  const preview = document.getElementById("Profilepreview-table");
  const ProfiletableBody = document.querySelector("#Profilepreviewdata-table tbody");

  preview.style.display = "block";

  // Remove placeholder row if it exists
  const placeholder = ProfiletableBody.querySelector(".no-entries");
  if (placeholder) placeholder.remove();

  let value = "";
  if (type === "authority") {
    const input = document.getElementById("authorityInput");
    value = input.value.trim();
    if (!value) return;
    input.value = "";

    ProfiletableBody.insertAdjacentHTML(
      "beforeend",
      `<tr>
        <td>${value}</td>
        <td></td>
        <td><button type="button" class="remove-row">✖</button></td>
      </tr>`
    );
  }

  if (type === "organization") {
    const input = document.getElementById("organizationInput");
    value = input.value.trim();
    if (!value) return;
    input.value = "";

    ProfiletableBody.insertAdjacentHTML(
      "beforeend",
      `<tr>
        <td></td>
        <td>${value}</td>
        <td><button type="button" class="remove-row">✖</button></td>
      </tr>`
    );
  }

  // Row delete handler + add placeholder if empty
  ProfiletableBody.querySelectorAll(".remove-row").forEach(btn => {
    btn.onclick = function () {
      this.closest("tr").remove();
      if (ProfiletableBody.children.length === 0) {
        ProfiletableBody.innerHTML = `
          <tr class="no-entries">
            <td colspan="3" style="text-align:center; color:#888;">No Entries Yet</td>
          </tr>
        `;
      }
    };
  });

  // Close preview manually
  preview.querySelector(".close-preview").onclick = () => {
    preview.style.display = "none";
    ProfiletableBody.innerHTML = `
      <tr class="no-entries">
        <td colspan="3" style="text-align:center; color:#888;">No Entries Yet</td>
      </tr>
    `;
  };
}

  const addLocationBtn = document.getElementById("addLocationBtn");
  const tableBody = document.querySelector("#Locationspreviewdata-table tbody");

  // Enable button only when all dropdowns have values
  function toggleButton() {
    if (AffectedprovinceSelect.value && AffectedcitySelect.value && AffectedbarangaySelect.value) {
      addLocationBtn.disabled = false;
    } else {
      addLocationBtn.disabled = true;
    }
  }

  [AffectedprovinceSelect, AffectedcitySelect, AffectedbarangaySelect].forEach(select => {
    select.addEventListener("change", toggleButton);
  });

addLocationBtn.addEventListener("click", () => {
  const province = AffectedprovinceSelect.value;
  const city = AffectedcitySelect.value;
  const barangay = AffectedbarangaySelect.value;

  if (!province || !city || !barangay) return;

  // Remove "No Entries Yet"
  const noEntriesRow = tableBody.querySelector(".no-entries");
  if (noEntriesRow) noEntriesRow.remove();

  // Add new row
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${AffectedprovinceSelect.options[AffectedprovinceSelect.selectedIndex].text}</td>
    <td>${AffectedcitySelect.options[AffectedcitySelect.selectedIndex].text}</td>
    <td>${AffectedbarangaySelect.options[AffectedbarangaySelect.selectedIndex].text}</td>
    <td><button type="button" class="remove-btn">✖</button></td>
  `;
  tableBody.appendChild(row);

  // Reset selects
  AffectedcitySelect.value = "";
  AffectedbarangaySelect.value = "";
  addLocationBtn.disabled = true;
});

//Initial Effects Function
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("tableBody");
  const addRowBtn = document.getElementById("addRowBtn");

  // ===== Add Row =====
  addRowBtn.addEventListener("click", () => {
    const newRow = document.createElement("tr");

    newRow.innerHTML = `
      <td>
        <select class="IE-city" required>
          <option value="">Select City/Municipality</option>
        </select>
      </td>
      <td><input type="number" class="number-input" placeholder="Enter Total Population" required/></td>
      <td><input type="number" class="number-input" placeholder="Enter Affected Population" required/></td>
      <td><input type="number" class="number-input" placeholder="No. of Deaths" required/></td>
      <td><input type="number" class="number-input" placeholder="No. of Injured" required/></td>
      <td><input type="number" class="number-input" placeholder="No. of Missing" required/></td>
      <td><input type="number" class="number-input" placeholder="No. of Children" required/></td>
      <td><input type="number" class="number-input" placeholder="No. of Women" required/></td>
      <td><input type="number" class="number-input" placeholder="No. of Senior Citizens" required/></td>
      <td><input type="number" class="number-input" placeholder="No. of PWD" required/></td>
      <td><button type="button" class="deleteRowBtn">Delete</button></td>
    `;

    tableBody.appendChild(newRow);

    // Populate city select
    const newIECitySelect = newRow.querySelector(".IE-city");
    my_handlers.fill_IE_cities(newIECitySelect);
  });

  // ===== Delete / Clear Row ===== (delegated)
  tableBody.addEventListener("click", (e) => {
    const row = e.target.closest("tr");
    if (!row || row.classList.contains("error-row")) return;

    // Remove the error row after this row if it exists
    const nextRow = row.nextElementSibling;
    if (nextRow && nextRow.classList.contains("error-row")) {
      nextRow.remove();
    }

    if (e.target.classList.contains("deleteRowBtn")) {
      row.remove();
    }

    if (e.target.classList.contains("removeRowBtn")) {
      // Clear inputs for first row
      row.querySelectorAll("input").forEach(input => input.value = "");
      row.querySelector(".IE-city").selectedIndex = 0;
      clearRowErrors(row); // also removes any leftover error borders
    }
  });


  // ===== Input / Validation =====
  tableBody.addEventListener("input", (e) => {
    const row = e.target.closest("tr");
    if (!row || row.classList.contains("error-row")) return;

    validateDisasterRow(row, [], false); // do not clear errors yet
  });
});


//Initial Needs Assessment Function
document.addEventListener("DOMContentLoaded", () => {
    const needInput = document.getElementById("needInput");
    const qtyInput = document.getElementById("qtyInput");
    const addBtn = document.getElementById("addImmediateNeedsBtn");
    const tableBody = document.querySelector("#ImmediateNeedspreviewdata-table tbody");

    // Enable/disable button
    function toggleButton() {
        if (needInput.value.trim() !== "" && qtyInput.value.trim() !== "") {
            addBtn.disabled = false;
        } else {
            addBtn.disabled = true;
        }
    }

    needInput.addEventListener("input", toggleButton);
    qtyInput.addEventListener("input", toggleButton);

    // Add row
    addBtn.addEventListener("click", () => {
        const needValue = needInput.value.trim();
        const qtyValue = qtyInput.value.trim();

        if (!needValue || !qtyValue) return;

        // Remove placeholder
        const placeholder = tableBody.querySelector(".no-entries");
        if (placeholder) placeholder.remove();

        // New row
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td>${needValue}</td>
            <td>${qtyValue}</td>
            <td><button type="button" class="deleteRowBtn">Delete</button></td>
        `;
        tableBody.appendChild(newRow);

        // Reset
        needInput.value = "";
        qtyInput.value = "";
        addBtn.disabled = true;
    });

    // Delete row
    tableBody.addEventListener("click", (e) => {
        if (e.target.classList.contains("deleteRowBtn")) {
            e.target.closest("tr").remove();

            if (tableBody.children.length === 0) {
                const placeholderRow = document.createElement("tr");
                placeholderRow.classList.add("no-entries");
                placeholderRow.innerHTML = `<td colspan="3" style="text-align:center; color:#888;">No Entries Yet</td>`;
                tableBody.appendChild(placeholderRow);
            }
        }
    });
});

//Initial Response Function
document.addEventListener("DOMContentLoaded", () => {
    const responseGroupInput = document.getElementById("responseGroupInput");
    const assistanceInput = document.getElementById("assistanceInput");
    const familiesInput = document.getElementById("familiesInput");
    const addInitialResponseBtn = document.getElementById("addInitialResponseBtn");
    const initialTableBody = document.querySelector("#InitialResponsepreviewdata-table tbody");

    // Enable/disable Add button
    function toggleResponseBtn() {
        if (
            responseGroupInput.value.trim() !== "" &&
            assistanceInput.value.trim() !== "" &&
            familiesInput.value.trim() !== ""
        ) {
            addInitialResponseBtn.disabled = false;
        } else {
            addInitialResponseBtn.disabled = true;
        }
    }

    [responseGroupInput, assistanceInput, familiesInput].forEach(input => {
        input.addEventListener("input", toggleResponseBtn);
    });

    // Add row
    addInitialResponseBtn.addEventListener("click", () => {
        const groupValue = responseGroupInput.value.trim();
        const assistanceValue = assistanceInput.value.trim();
        const familiesValue = familiesInput.value.trim();

        if (!groupValue || !assistanceValue || !familiesValue) return;

        // Remove placeholder
        const placeholder = initialTableBody.querySelector(".no-entries");
        if (placeholder) placeholder.remove();

        // New row
        const newRow = document.createElement("tr");
        newRow.innerHTML = `
            <td>${groupValue}</td>
            <td>${assistanceValue}</td>
            <td>${familiesValue}</td>
            <td><button type="button" class="deleteRowBtn">Delete</button></td>
        `;
        initialTableBody.appendChild(newRow);

        // Reset fields
        responseGroupInput.value = "";
        assistanceInput.value = "";
        familiesInput.value = "";
        addInitialResponseBtn.disabled = true;
    });

    // Delete row
    initialTableBody.addEventListener("click", (e) => {
        if (e.target.classList.contains("deleteRowBtn")) {
            e.target.closest("tr").remove();

            if (initialTableBody.children.length === 0) {
                const placeholderRow = document.createElement("tr");
                placeholderRow.classList.add("no-entries");
                placeholderRow.innerHTML = `<td colspan="4" style="text-align:center; color:#888;">No Entries Yet</td>`;
                initialTableBody.appendChild(placeholderRow);
            }
        }
    });
});

//Initial Effects Logical Validations
// remove any existing error-row after the row
function clearRowErrors(row) {
  const next = row.nextElementSibling;
  if (next && next.classList.contains("error-row")) next.remove();

  row.querySelectorAll("input, select").forEach(el => el.classList.remove("error-border"));
}





// ====== Wire it to your table ======
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("tableBody");

  // Validate a row whenever an input/select changes
  tableBody.addEventListener("input", (e) => {
    const row = e.target.closest("tr");
    if (row && !row.classList.contains("error-row")) {
      validateDisasterRow(row);
    }
  });

  // Optional: validate all rows before submission
  window.validateAllRowsBeforeSubmit = function() {
    const rows = [...tableBody.querySelectorAll("tr")].filter(r => !r.classList.contains("error-row") && !r.classList.contains("no-entries"));
    let allValid = true;
    rows.forEach(r => { if (!validateDisasterRow(r)) allValid = false; });
    return allValid;
  };
});

// show row-level errors (messages: array of {field, inputEl, message})
function showRowErrors(row, messages) {
  clearRowErrors(row);

  messages.forEach(m => {
    if (m.inputEl) m.inputEl.classList.add("error-border");
  });

  const table = row.closest("table");
  const colCount = table ? table.querySelectorAll("thead th").length : row.cells.length;

  const errorRow = document.createElement("tr");
  errorRow.className = "error-row";

  const td = document.createElement("td");
  td.colSpan = colCount;

  td.innerHTML = messages.map(m => {
    const fieldName = m.field ? `<span class="error-field">${m.field}:</span>` : "";
    return `<div class="error-item">${fieldName}<span class="error-text">${m.message}</span></div>`;
  }).join("");

  errorRow.appendChild(td);
  row.parentNode.insertBefore(errorRow, row.nextSibling);
}

// validate a single disaster-profile row
function validateDisasterRow(row) {
  const totalPopField = row.querySelector('input[placeholder="Enter Total Population"]');
  const affectedPopField = row.querySelector('input[placeholder="Enter Affected Population"]');
  const deathsField = row.querySelector('input[placeholder="No. of Deaths"]');
  const injuredField = row.querySelector('input[placeholder="No. of Injured"]');
  const missingField = row.querySelector('input[placeholder="No. of Missing"]');
  const childrenField = row.querySelector('input[placeholder="No. of Children"]');
  const womenField = row.querySelector('input[placeholder="No. of Women"]');
  const seniorsField = row.querySelector('input[placeholder="No. of Senior Citizens"]');
  const pwdField = row.querySelector('input[placeholder="No. of PWD"]');
  const citySelect = row.querySelector("select.IE-city");

  const totalPop = Math.max(0, parseInt(totalPopField?.value) || 0);
  const affectedPop = Math.max(0, parseInt(affectedPopField?.value) || 0);
  const deaths = Math.max(0, parseInt(deathsField?.value) || 0);
  const injured = Math.max(0, parseInt(injuredField?.value) || 0);
  const missing = Math.max(0, parseInt(missingField?.value) || 0);
  const children = Math.max(0, parseInt(childrenField?.value) || 0);
  const women = Math.max(0, parseInt(womenField?.value) || 0);
  const seniors = Math.max(0, parseInt(seniorsField?.value) || 0);
  const pwd = Math.max(0, parseInt(pwdField?.value) || 0);

  const messages = [];

  if (!citySelect?.value) {
    messages.push({ field: "Municipality", inputEl: citySelect, message: "Please select a city/municipality." });
  }
  if (affectedPop > totalPop) {
    messages.push({ field: "Affected Population", inputEl: affectedPopField, message: "Affected population cannot exceed total population." });
  }
  if ((deaths + injured + missing) > affectedPop) {
    messages.push({ field: "Casualties", inputEl: missingField, message: "Deaths + Injured + Missing cannot exceed affected population." });
  }
  if ((children + women + seniors + pwd) > affectedPop) {
    messages.push({ field: "Demographics", inputEl: pwdField, message: "Demographic groups cannot exceed affected population." });
  }
  if (totalPop === 0 && affectedPop > 0) {
    messages.push({ field: "Total Population", inputEl: totalPopField, message: "Total population is zero but affected people exist." });
  }

  if (messages.length > 0) {
    showRowErrors(row, messages);
    return false;
  } else {
    clearRowErrors(row);
    return true;
  }
}

















