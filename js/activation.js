const calamityOptions = [
    "Typhoon", "Earthquake", "Flood", "Volcanic Eruption", "Landslide", "Tsunami"
  ];
  
  const data = [
    { no: 1, organization: "Red Cross", hq: "Manila", area: "Luzon", contact: "Anna Cruz", email: "anna@rc.org", mobile: "09171234567", calamity: "Typhoon", status: "inactive" },
    { no: 2, organization: "ReliefNow", hq: "Cebu", area: "Visayas", contact: "Ben Santos", email: "ben@rn.org", mobile: "09221234567", calamity: "Earthquake", status: "active" },
    { no: 3, organization: "CareAid", hq: "Davao", area: "Mindanao", contact: "Cora Reyes", email: "cora@ca.org", mobile: "09331234567", calamity: "Flood", status: "inactive" },
    { no: 4, organization: "Red Cross", hq: "Manila", area: "Luzon", contact: "Anna Cruz", email: "anna@rc.org", mobile: "09171234567", calamity: "Typhoon", status: "inactive" },
    { no: 5, organization: "ReliefNow", hq: "Cebu", area: "Visayas", contact: "Ben Santos", email: "ben@rn.org", mobile: "09221234567", calamity: "Earthquake", status: "active" },
    { no: 6, organization: "CareAid", hq: "Davao", area: "Mindanao", contact: "Cora Reyes", email: "cora@ca.org", mobile: "09331234567", calamity: "Flood", status: "inactive" },
    { no: 7, organization: "Red Cross", hq: "Manila", area: "Luzon", contact: "Anna Cruz", email: "anna@rc.org", mobile: "09171234567", calamity: "Typhoon", status: "inactive" },
    { no: 8, organization: "ReliefNow", hq: "Cebu", area: "Visayas", contact: "Ben Santos", email: "ben@rn.org", mobile: "09221234567", calamity: "Earthquake", status: "active" },
    { no: 9, organization: "CareAid", hq: "Davao", area: "Mindanao", contact: "Cora Reyes", email: "cora@ca.org", mobile: "09331234567", calamity: "Flood", status: "inactive" },
    // Add more data as needed
  ];
  
  const areas = ["Luzon", "Visayas", "Mindanao"];
  
  
  let currentPage = 1;
  const rowsPerPage = 5;
  
  const tableBody = document.querySelector("#orgTable tbody");
  const searchInput = document.querySelector("#searchInput");
  const sortSelect = document.querySelector("#sortSelect");
  const entriesInfo = document.querySelector("#entriesInfo");
  const paginationContainer = document.querySelector("#pagination");
  
  function renderTable(filteredData) {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);
  
    pageData.forEach(row => {
  
      
      const tr = document.createElement("tr");
  
      const calamitySelect = calamityOptions
        .map(opt => `<option value="${opt}" ${opt === row.calamity ? "selected" : ""}>${opt}</option>`)
        .join("");
        
  
      tr.innerHTML = `
        <td>${row.no}</td>
        <td contenteditable="false">${row.organization}</td>
        <td contenteditable="false">${row.hq}</td>
        <td>
          <div class="area-dropdown">
            <button type="button" class="area-dropbtn">${row.area ? row.area : 'Select Areas'}</button>
            <div class="area-dropdown-content">
              ${areas.map(area => `
                <label>
                  <input type="checkbox" name="area" value="${area}" ${row.area.includes(area) ? 'checked' : ''}>
                  ${area}
                </label>
              `).join('')}
            </div>
          </div>
        </td>
        <td contenteditable="false">${row.contact}</td>
        <td contenteditable="false">${row.email}</td>
        <td contenteditable="false">${row.mobile}</td>
        <td contenteditable="false">
          <select enabled>${calamitySelect}</select>
          <input type="text" value="${row.calamity}" enabled/>
        </td>
        <td>
          <button class="activation-btn ${row.status === "active" ? "green-btn" : "red-btn"}">
            ${row.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </td>
        <td>
          <span class="status-circle ${row.status === "active" ? "green" : "red"}"></span>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  
    entriesInfo.textContent = `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
  
    renderPagination(filteredData.length);
  }
  
  document.addEventListener("click", (e) => {
    const isDropBtn = e.target.matches(".area-dropbtn");
  
    document.querySelectorAll(".area-dropdown").forEach(dropdown => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("show");
      }
    });
  
    if (isDropBtn) {
      const dropdown = e.target.closest(".area-dropdown");
      dropdown.classList.toggle("show");
    }
  });
  
  document.addEventListener("change", (e) => {
    if (e.target.matches('input[name="area"]')) {
      const dropdown = e.target.closest(".area-dropdown");
      const selected = Array.from(dropdown.querySelectorAll('input[name="area"]:checked'))
        .map(input => input.value)
        .join(", ");
  
      const button = dropdown.querySelector(".area-dropbtn");
      button.textContent = selected.length > 0 ? selected : "Select Areas";
    }
  });
  
  
  
  function renderPagination(totalRows) {
    paginationContainer.innerHTML = "";
  
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const maxVisiblePages = 5; // How many page numbers to show
    const pageButtons = [];
  
    const createButton = (label, page = null, disabled = false, isActive = false) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      if (disabled) btn.disabled = true;
      if (isActive) btn.classList.add("active-page");
      if (page !== null) {
        btn.addEventListener("click", () => {
          currentPage = page;
          renderTable(filterAndSort());
        });
      }
      return btn;
    };
  
    // Prev Button
    paginationContainer.appendChild(createButton("Prev", currentPage - 1, currentPage === 1));
  
    // Page Buttons Logic
    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if few pages
      for (let i = 1; i <= totalPages; i++) {
        paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 3; i++) {
          paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
        }
        paginationContainer.appendChild(createButton("..."));
        paginationContainer.appendChild(createButton(totalPages, totalPages));
      } else if (currentPage >= totalPages - 2) {
        paginationContainer.appendChild(createButton(1, 1));
        paginationContainer.appendChild(createButton("..."));
        for (let i = totalPages - 2; i <= totalPages; i++) {
          paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
        }
      } else {
        paginationContainer.appendChild(createButton(1, 1));
        paginationContainer.appendChild(createButton("..."));
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          paginationContainer.appendChild(createButton(i, i, false, i === currentPage));
        }
        paginationContainer.appendChild(createButton("..."));
        paginationContainer.appendChild(createButton(totalPages, totalPages));
      }
    }
  
    // Next Button
    paginationContainer.appendChild(createButton("Next", currentPage + 1, currentPage === totalPages));
  }
  
  
  function filterAndSort() {
    let filtered = data.filter(row => {
      const q = searchInput.value.toLowerCase();
      return Object.values(row).some(v => v.toString().toLowerCase().includes(q));
    });
  
    if (sortSelect.value) {
      filtered.sort((a, b) =>
        a[sortSelect.value].toString().localeCompare(b[sortSelect.value].toString())
      );
    }
  
    return filtered;
  }
  
  // Event Listeners
  
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTable(filterAndSort());
  });
  
  sortSelect.addEventListener("change", () => {
    currentPage = 1;
    renderTable(filterAndSort());
  });
  
  document.addEventListener("click", e => {
    const btn = e.target;
  
    if (btn.classList.contains("edit-btn")) {
      const row = btn.closest("tr");
      const editing = btn.textContent === "Save";
  
      row.querySelectorAll("td[contenteditable]").forEach(cell => {
        cell.contentEditable = editing ? "false" : "true";
        cell.classList.toggle("editing", !editing);
      });
  
      const select = row.querySelector("select");
      const input = row.querySelector("input");
      select.disabled = editing;
      input.disabled = editing;
  
      btn.textContent = editing ? "Edit" : "Save";
    }
  
    if (btn.classList.contains("activation-btn")) {
      const rowEl = btn.closest("tr");
      const idx = parseInt(rowEl.cells[0].textContent, 10) - 1;
      const record = data[idx];
  
      record.status = record.status === "active" ? "inactive" : "active";
      renderTable(filterAndSort());
    }
  });
  
  
  
  // Initial render
  renderTable(filterAndSort());
  