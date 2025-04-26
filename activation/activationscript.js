// script.js

const calamityOptions = [
    "Typhoon",
    "Earthquake",
    "Flood",
    "Volcanic Eruption",
    "Landslide",
    "Tsunami"
  ];
  

  const data = [
    { no: 1, organization: "Red Cross",  hq: "Manila",    area: "Luzon",    contact: "Anna Cruz",  email: "anna@rc.org",  mobile: "09171234567", calamity: "Typhoon",    status: "inactive" },
    { no: 2, organization: "ReliefNow",  hq: "Cebu",      area: "Visayas",  contact: "Ben Santos", email: "ben@rn.org",   mobile: "09221234567", calamity: "Earthquake", status: "active"   },
    { no: 3, organization: "CareAid",    hq: "Davao",     area: "Mindanao", contact: "Cora Reyes", email: "cora@ca.org",  mobile: "09331234567", calamity: "Flood",      status: "inactive" },
    // ...add correct data from database, data entries must be inlined with the given excel sheet
  ];
  
  let currentPage = 1;
  const rowsPerPage = 5;
  
  const tableBody   = document.querySelector("#orgTable tbody");
  const searchInput = document.querySelector("#searchInput");
  const sortSelect  = document.querySelector("#sortSelect");
  const entriesInfo = document.querySelector("#entriesInfo");
  const prevPageBtn = document.querySelector("#prevPage");
  const nextPageBtn = document.querySelector("#nextPage");
  
  function renderTable(filteredData) {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end   = start + rowsPerPage;
    const pageData = filteredData.slice(start, end);
  
    pageData.forEach(row => {
      const calamitySelect = calamityOptions
        .map(opt => `<option value="${opt}" ${opt === row.calamity ? "selected" : ""}>${opt}</option>`)
        .join("");
  
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.no}</td>
        <td contenteditable="false">${row.organization}</td>
        <td contenteditable="false">${row.hq}</td>
        <td contenteditable="false">${row.area}</td>
        <td contenteditable="false">${row.contact}</td>
        <td contenteditable="false">${row.email}</td>
        <td contenteditable="false">${row.mobile}</td>
        <td contenteditable="false">
          <select class="calamity-select" disabled>${calamitySelect}</select>
          <input type="text" class="calamity-input" value="${row.calamity}" disabled />
        </td>
        <td>
          <button class="activation-btn ${row.status}">
            ${row.status === "active" ? "Deactivate" : "Activate"}
          </button>
        </td>
        <td>
          <span class="status-circle ${row.status === "active" ? "green" : "gray"}"></span>
        </td>
        <td>
          <button class="edit-btn">Edit</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  
    entriesInfo.textContent = 
      `Showing ${start + 1} to ${Math.min(end, filteredData.length)} of ${filteredData.length} entries`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = end >= filteredData.length;
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
  
  // Event listeners
  
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTable(filterAndSort());
  });
  
  sortSelect.addEventListener("change", () => {
    currentPage = 1;
    renderTable(filterAndSort());
  });
  
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable(filterAndSort());
    }
  });
  
  nextPageBtn.addEventListener("click", () => {
    const filtered = filterAndSort();
    if (currentPage * rowsPerPage < filtered.length) {
      currentPage++;
      renderTable(filtered);
    }
  });
  
  // Delegate Edit & Activation button clicks
  document.addEventListener("click", e => {
    const btn = e.target;
  
    // Toggle Edit/Save
    if (btn.classList.contains("edit-btn")) {
      const rowEl    = btn.closest("tr");
      const isSave   = btn.textContent === "Save";    // were we in Save mode?
      const rowNo    = parseInt(rowEl.cells[0].textContent, 10);
      const record   = data.find(r => r.no === rowNo);
  
      // If we clicked Save, persist changes back into data
      if (isSave) {
        // Update any contenteditable cells if you want:
        // e.g. record.organization = rowEl.cells[1].textContent;
  
        // Update calamity from <select> and <input>
        const sel = rowEl.querySelector(".calamity-select");
        const inp = rowEl.querySelector(".calamity-input");
        // Prefer the input value if non-empty, otherwise the select
        record.calamity = inp.value.trim() || sel.value;
      }
  
      // Toggle contenteditable on the other fields
      rowEl.querySelectorAll("td[contenteditable]").forEach(cell => {
        cell.contentEditable = isSave ? "false" : "true";
        cell.classList.toggle("editing", !isSave);
      });
  
      // Toggle disabled on both calamity fields
      const calamitySel = rowEl.querySelector(".calamity-select");
      const calamityInp = rowEl.querySelector(".calamity-input");
      calamitySel.disabled = isSave;
      calamityInp.disabled = isSave;
  
      // Flip the button text
      btn.textContent = isSave ? "Edit" : "Save";
    }
  
    // Toggle Activate/Deactivate
    if (btn.classList.contains("activation-btn")) {
      const rowEl = btn.closest("tr");
      const idx   = parseInt(rowEl.cells[0].textContent, 10) - 1;
      data[idx].status = data[idx].status === "active" ? "inactive" : "active";
      renderTable(filterAndSort());
    }
  });
  
  // Initial draw
  renderTable(filterAndSort());
  