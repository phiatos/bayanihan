console.log = function () {};
console.error = function () {};
console.warn = function () {};
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('show');
});

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then((registration) => {})
      .catch((error) => {});
  }
  fetchVolunteerGroups();
  initializeMap();
});

let map;
let geoJsonLayer;
let markers = [];
let activationsListenerQuery;
let activationsListenerCallback;
let allVolunteerGroups = [];
let approvedReports = [];

let regionProvinces = {
  luzon: ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan", "Benguet", "Abra", "Ifugao", "Kalinga", "Apayao", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino", "Aurora", "Nueva Ecija", "Bulacan", "Pampanga", "Tarlac", "Zambales", "Bataan", "Rizal", "Laguna", "Batangas", "Cavite", "Quezon", "Metro Manila"],
  visayas: ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental", "Bohol", "Cebu", "Negros Oriental", "Siquijor", "Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte"],
  mindanao: ["Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay", "Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental", "Compostela Valley", "Davao del Norte", "Davao del Sur", "Davao Oriental", "Davao Occidental", "North Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat", "Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur", "Basilan", "Lanao del Sur", "Maguindanao", "Sulu", "Tawi-Tawi"]
};

const firebaseConfig = {
  apiKey: "AIzaSyBkmXOJvnlBtzkjNyR6wyd9BgGM0BhN0L8",
  authDomain: "bayanihan-new-472410.firebaseapp.com",
  projectId: "bayanihan-new-472410",
  storageBucket: "bayanihan-new-472410.firebasestorage.app",
  messagingSenderId: "995982574131",
  appId: "1:995982574131:web:3d45e358fad330c276d946",
  measurementId: "G-CEVPTQZM9C",
  databaseURL: "https://bayanihan-new-472410-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

function formatLargeNumber(numStr) {
  let num = BigInt(numStr || '0');
  const trillion = 1_000_000_000_000n;
  const billion = 1_000_000_000n;
  const million = 1_000_000n;
  const thousand = 1_000n;
  if (num >= trillion) return (Number(num) / Number(trillion)).toFixed(2).replace(/\.?0+$/, '') + 'T';
  if (num >= billion) return (Number(num) / Number(billion)).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (num >= million) return (Number(num) / Number(million)).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (num >= thousand) return (Number(num) / Number(thousand)).toFixed(2).replace(/\.?0+$/, '') + 'k';
  return num.toString();
}

function animateNumber(elementId, target, duration = 1000, decimals = 0) {
  const element = document.getElementById(elementId);
  if (!element) return;
  let start = 0;
  const stepTime = 16;
  const steps = duration / stepTime;
  const increment = target / steps;
  let currentStep = 0;
  function step() {
    currentStep++;
    start += increment;
    if (currentStep >= steps) start = target;
    const displayValue = decimals > 0 ? start.toFixed(decimals) : Math.floor(start);
    element.textContent = formatNumber(parseFloat(displayValue), elementId);
    highlight(element);
    if (currentStep < steps) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function formatNumber(num, id) {
  if (id === 'amount-raised' || id === 'inkind-donations') return '₱' + abbreviateNumber(num);
  if (num >= 10000) return formatLargeNumber(num.toString());
  return num.toLocaleString();
}

function abbreviateNumber(number) {
  const absNumber = Math.abs(number);
  if (absNumber >= 1.0e+9) return (number / 1.0e+9).toFixed(2) + "B";
  if (absNumber >= 1.0e+6) return (number / 1.0e+6).toFixed(2) + "M";
  if (absNumber >= 1.0e+3) return (number / 1.0e+3).toFixed(2) + "K";
  return number.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function highlight(element) {
  element.style.transition = 'color 0.3s ease';
  element.style.color = '#FFF';
  setTimeout(() => element.style.color = '#FFF', 300);
}

const evacueesEl = document.getElementById("evacuees");
const foodPacksEl = document.getElementById("food-packs");
const hotMealsEl = document.getElementById("hot-meals");
const waterLitersEl = document.getElementById("water-liters");
const volunteersEl = document.getElementById("volunteers");
const amountRaisedEl = document.getElementById("amount-raised");
const inKindDonationsEl = document.getElementById("inkind-donations");

function fetchReports() {
  const reportsListener = database.ref("reports/approved").limitToLast(50);
  reportsListener.on("value", snapshot => {
    let totalEvacuees = 0, totalFoodPacks = 0, totalHotMeals = 0, totalWaterLiters = 0, totalVolunteers = 0, totalMonetaryDonations = 0, totalInKindDonations = 0;
    let latestDate = null;
    const reports = snapshot.val();
    if (reports) {
      const reportEntries = Object.entries(reports);
      reportEntries.forEach(([key, report]) => {
        totalEvacuees += parseFloat(report.NoOfIndividualsOrFamilies || 0);
        totalFoodPacks += parseFloat(report.NoOfFoodPacks || 0);
        totalHotMeals += parseFloat(report.NoOfHotMeals || 0);
        totalWaterLiters += parseFloat(report.LitersOfWater || 0);
        totalVolunteers += parseFloat(report.NoOfVolunteersMobilized || 0);
        totalMonetaryDonations += parseFloat(report.TotalMonetaryDonations || 0);
        totalInKindDonations += parseFloat(report.TotalValueOfInKindDonations || 0);
        if (report.DateOfReport) {
          const reportDate = new Date(report.DateOfReport);
          if (!latestDate || reportDate > latestDate) {
            latestDate = reportDate;
          }
        }
      });
      if (latestDate) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById("latest-update-date").textContent = latestDate.toLocaleDateString('en-US', options);
      } else {
        document.getElementById("latest-update-date").textContent = "Unknown";
      }
    }
    animateNumber('evacuees', totalEvacuees, 1000, 0);
    animateNumber('food-packs', totalFoodPacks, 1000, 0);
    animateNumber('hot-meals', totalHotMeals, 1000, 0);
    animateNumber('water-liters', totalWaterLiters, 1000, 0);
    animateNumber('volunteers', totalVolunteers, 1000, 0);
    animateNumber('amount-raised', totalMonetaryDonations, 1000, 2);
    animateNumber('inkind-donations', totalInKindDonations, 1000, 2);
  }, error => {
    document.getElementById("latest-update-date").textContent = "Unavailable";
  });
}

function initializeMap() {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    Swal.fire({
      icon: "error",
      title: "Map Error",
      text: "Map container not found.",
    });
    return;
  }

  // Initialize Leaflet map
  map = L.map('map', {
    center: [14.5995, 121.05],
    zoom: 6,
    minZoom: 5,
    maxZoom: 10,
    maxBounds: [
      [3.5, 113.0],
      [22.5, 128.5]
    ],
    maxBoundsViscosity: 1.0
  });

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Load GeoJSON Provinces
  fetch('./json/ph_admin1.geojson')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      geoJsonLayer = L.geoJSON(data, {
        style: {
          fillColor: '#FA3C99',
          fillOpacity: 0.5,
          color: '#FFF',
          weight: 1
        },
        onEachFeature: function (feature, layer) {
          layer.on({
            mouseover: function (e) {
              layer.setStyle({ fillOpacity: 0.7 });
            },
            mouseout: function (e) {
              geoJsonLayer.resetStyle(layer);
            },
            click: function (e) {
              const name = feature.properties.name || feature.properties.NAME_1 || "Unnamed Province";
              const popup = L.popup()
                .setLatLng(e.latlng)
                .setContent(`<strong>${name}</strong>`)
                .openOn(map);
            }
          });
        }
      }).addTo(map);

      document.getElementById("regionFilter").addEventListener("change", function () {
        filterRegion(this.value);
      });

      loadApprovedReports().then(() => {
        addMarkersForActiveActivations();
        fetchReports();
      }).catch(error => {
        addMarkersForActiveActivations();
        fetchReports();
      });
    })
    .catch(err => {
      Swal.fire({
        icon: "error",
        title: "GeoJSON Error",
        text: "Could not load the province boundaries."
      });
    });
}

const regionBounds = {
  luzon: [[13.5, 119.0], [19.5, 123.0]],
  visayas: [[9.8, 123.0], [13.8, 125.5]],
  mindanao: [[5.5, 120.0], [9.8, 126.5]],
  all: [[2.5, 111.5], [24.0, 130.0]]
};

function filterRegion(region) {
  geoJsonLayer.eachLayer(layer => {
    const provinceName = layer.feature.properties.NAME_1;
    if (region === "all") {
      layer.setStyle({
        fillColor: '#FA3C99',
        fillOpacity: 0.5,
        color: '#FFF',
        weight: 1
      });
    } else {
      if (regionProvinces[region].includes(provinceName)) {
        layer.setStyle({
          fillColor: '#FF6EC7',
          fillOpacity: 0.7,
          color: '#FFF',
          weight: 2
        });
      } else {
        layer.setStyle({
          fillColor: '#FA3C99',
          fillOpacity: 0.2,
          color: '#FFF',
          weight: 1
        });
      }
    }
  });

  if (region !== "all") {
    map.fitBounds(regionBounds[region]);
  } else {
    map.fitBounds(regionBounds.all);
  }
}

document.getElementById("regionFilter").addEventListener("change", function () {
  filterRegion(this.value);
});

async function loadApprovedReports() {
  try {
    const snapshot = await database.ref("reports/approved").once("value");
    const reports = snapshot.val();
    approvedReports = [];
    if (reports) {
      Object.keys(reports).forEach(key => {
        const report = reports[key];
        const transformedReport = {
          firebaseKey: key,
          ReportID: report.reportID || report.ReportID || "-",
          VolunteerGroupName: report.organization || report.VolunteerGroupName || "[Unknown Org]",
          AreaOfOperation: report.AreaOfOperation || "-",
          TimeOfIntervention: report.timeOfIntervention || report.TimeOfIntervention || "-",
          DateOfReport: report.dateOfReport || report.DateOfReport || "-",
          Status: report.status || report.Status || "Approved",
          StartDate: report.operationDate || report.StartDate || "-",
          EndDate: report.operationDate || report.EndDate || "-",
          NoOfIndividualsOrFamilies: report.families || report.NoOfIndividualsOrFamilies || "-",
          NoOfFoodPacks: report.foodPacks || report.NoOfFoodPacks || "-",
          NoOfHotMeals: report.hotMeals || report.NoOfHotMeals || "-",
          LitersOfWater: report.water || report.LitersOfWater || "-",
          NoOfVolunteersMobilized: report.volunteers || report.NoOfVolunteersMobilized || "-",
          NoOfOrganizationsActivated: report.NoOfOrganizationsActivated || "-",
          TotalValueOfInKindDonations: report.inKindValue || report.TotalValueOfInKindDonations || "-",
          TotalMonetaryDonations: report.amountRaised || report.TotalMonetaryDonations || "-",
          NotesAdditionalInformation: report.remarks || report.urgentNeeds || report.NotesAdditionalInformation || "-",
          userUid: report.userUid || "-",
          submittedBy: report.submittedBy || "-",
        };
        approvedReports.push(transformedReport);
      });
    }
  } catch (error) {
    throw error;
  }
}

let currentPopup = null;

async function addMarkersForActiveActivations() {
  if (!map) {
    console.error('Map not initialized');
    return;
  }

  if (activationsListenerQuery && activationsListenerCallback) {
    activationsListenerQuery.off("value", activationsListenerCallback);
  }

  activationsListenerQuery = database.ref("activations").orderByChild("status").equalTo("active");

  activationsListenerCallback = async snapshot => {
    markers.forEach(marker => marker.remove());
    markers = [];

    const activations = snapshot.val();
    if (!activations) {
      console.log('No active activations found.');
      return;
    }

    let coordinateCount = {}; // Track duplicate coordinates
    for (const [key, activation] of Object.entries(activations)) {
      console.log('Attempting to process activation:', key, activation);
      let lat, lng;

      // Check if coordinates are at root level or nested under address
      if (activation.latitude && activation.longitude) {
        lat = parseFloat(activation.latitude);
        lng = parseFloat(activation.longitude);
      } else if (activation.address?.latitude && activation.address?.longitude) {
        lat = parseFloat(activation.address.latitude);
        lng = parseFloat(activation.address.longitude);
      } else {
        console.warn('Missing latitude or longitude for activation:', key);
        continue;
      }

      if (isNaN(lat) || isNaN(lng)) {
        console.warn('Invalid coordinates for activation:', key, { lat, lng });
        continue;
      }

      // Handle duplicate coordinates with increased offset
      const coordKey = `${lat},${lng}`;
      if (coordinateCount[coordKey]) {
        const offset = (coordinateCount[coordKey] * 0.001); // Increased to 0.001 degrees (~100 meters)
        lat += offset;
        lng += offset;
        console.log(`Offset applied for duplicate at ${coordKey}, new coords: [${lat}, ${lng}]`);
        coordinateCount[coordKey]++;
      } else {
        coordinateCount[coordKey] = 1;
      }

      const group = allVolunteerGroups.find(g => g.id === activation.groupId);
      const organization = activation.organization || "unknown";
      const formattedAddress = activation.address?.formattedAddress || activation.areaOfOperation || "Address not specified";

      const marker = L.marker([lat, lng], {
        title: activation.organization || "Organization Unknown"
      }).addTo(map);

      let needsAssessmentHtml = "<p>No needs assessment available for this activation.</p>";
      let approvedReportsHtml = "<p>No approved reports available for this ABVN.</p>";
      let hasRdanaData = false;
      let hasApprovedReports = false;

      try {
        const rdanaSnapshot = await database.ref("rdana/approved").once("value");
        const rdanaLogs = rdanaSnapshot.val();

        if (rdanaLogs) {
          for (let rdanaKey in rdanaLogs) {
            const log = rdanaLogs[rdanaKey];
            if (log.rdanaGroup && organization && log.rdanaGroup.toLowerCase() === organization.toLowerCase()) {
              const needsChecklist = log.needsChecklist || [];
              if (needsChecklist.length > 0) {
                const neededItems = needsChecklist.filter(item => item.needed);
                if (neededItems.length > 0) {
                  needsAssessmentHtml = `
                    <div style="background: #fff5f8; border: 1px solid #ff85b3; border-radius: 10px; padding: 16px 22px; margin-bottom: 14px; font-family: Arial, sans-serif; box-shadow: 0 3px 7px rgba(255, 105, 180, 0.15); max-width: 600px;">
                    <h3 style="color: #c2185b; margin-bottom: 12px; font-weight: 600; font-size: 1.1rem;">Critical Needs</h3>
                    <ul style="color: #444; font-size: 1rem; line-height: 1.6; padding-left: 24px; margin: 0; font-weight: 600;">
                    ${neededItems.map(item => `<li style="color: #e91e63; margin-bottom: 8px;">${item.item}</li>`).join('')}
                    </ul>
                    </div>
                  `;
                  hasRdanaData = true;
                } else {
                  needsAssessmentHtml = "<p>No specific needs identified in the RDANA report.</p>";
                }
              } else {
                needsAssessmentHtml = "<p>No specific needs identified in the RDANA report.</p>";
              }
              break;
            }
          }
        }

        const relevantReports = approvedReports.filter(report => 
          report.VolunteerGroupName && organization && report.VolunteerGroupName.toLowerCase() === organization.toLowerCase()
        ).sort((a, b) => new Date(b.DateOfReport) - new Date(a.DateOfReport));

        if (relevantReports.length > 0) {
          const totals = relevantReports.reduce((acc, report) => ({
            evacuees: (acc.evacuees || 0) + (parseInt(report.NoOfIndividualsOrFamilies) || 0),
            foodPacks: (acc.foodPacks || 0) + (parseInt(report.NoOfFoodPacks) || 0),
            hotMeals: (acc.hotMeals || 0) + (parseInt(report.NoOfHotMeals) || 0),
            water: (acc.water || 0) + (parseInt(report.LitersOfWater) || 0),
            volunteers: (acc.volunteers || 0) + (parseInt(report.NoOfVolunteersMobilized) || 0),
            monetary: (acc.monetary || 0) + (parseFloat(report.TotalMonetaryDonations) || 0),
            inKind: (acc.inKind || 0) + (parseFloat(report.TotalValueOfInKindDonations) || 0)
          }), {});

          approvedReportsHtml = `
            <div data-id="${totals.reportId}">
              <div style="background: ${totals.status === 'pending' ? '#e0f7fa' : '#f0f0f0'}; border: ${totals.status === 'pending' ? '2px solid #00acc1' : '1px solid #ccc'}; border-radius: 8px; padding: 15px 20px; margin-top: 12px; font-family: Arial, sans-serif;">
                <h3 style="color: #333; margin-bottom: 10px; font-weight: 700; font-size: 1rem;">
                  Total for ${organization === "unknown" ? "Unknown Organization" : organization}
                  ${totals.status === 'pending' ? '<span style="background-color: #ff4444; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 5px;">New</span>' : ''}
                </h3>
                <div style="line-height: 1.5; color: #333; font-size: 1rem;">
                  As of: <strong style="color: #ff4081; font-weight: 600;">${totals.timestamp ? new Date(totals.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "August 21, 2025"}</strong><br>
                  Evacuees: <strong style="color: #ff4081; font-weight: 600;">${totals.evacuees}</strong><br>
                  Food Packs: <strong style="color: #ff4081; font-weight: 600;">${totals.foodPacks}</strong><br>
                  Hot Meals: <strong style="color: #ff4081; font-weight: 600;">${totals.hotMeals}</strong><br>
                  Water (Liters): <strong style="color: #ff4081; font-weight: 600;">${totals.water}</strong><br>
                  Volunteers: <strong style="color: #ff4081; font-weight: 600;">${totals.volunteers}</strong><br>
                  Monetary Donations: <strong style="color: #ff4081; font-weight: 600;">₱${abbreviateNumber(totals.monetary)}</strong><br>
                  In-Kind Donations: <strong style="color: #ff4081; font-weight: 600;">₱${abbreviateNumber(totals.inKind)}</strong>
                </div>
              </div>
            </div>
          `;
          hasApprovedReports = true;
        }
      } catch (error) {
        console.error('Error loading RDANA or reports for activation:', key, error);
        needsAssessmentHtml = "<p>Error loading needs assessment.</p>";
        approvedReportsHtml = "<p>Error loading approved reports for this ABVN.</p>";
      }

      let finalNeedsAssessmentHtml = needsAssessmentHtml.includes("No needs assessment") || needsAssessmentHtml.includes("Error loading") ? "" : needsAssessmentHtml;
      let finalApprovedReportsHtml = approvedReportsHtml.includes("No approved reports") || approvedReportsHtml.includes("Error loading") ? "" : approvedReportsHtml;

      let infoSectionContent = `
        <div class="info-item">
          <i class='bx bx-map'></i>
          <div class="info-text">
            <span class="label">Location</span>
            <span class="value">${activation.areaOfOperation || "Not specified"}</span>
          </div>
        </div>
        <div class="info-item">
          <i class='bx bx-cloud-lightning'></i>
          <div class="info-text">
            <span class="label">Calamity</span>
            <span class="value">${activation.calamityType || "Unknown"}${activation.calamityName ? ` (${activation.calamityName})` : ''}</span>
          </div>
        </div>
        <div class="info-item">
          <div class="small-placeholder-icon"><i class='bx bx-building'></i></div>
          <div class="info-text">
            <span class="label">ABVN Group</span>
            <span class="value">${group ? group.organization : 'Unknown'}</span>
          </div>
        </div>
        <div class="info-item">
          <i class='bx bx-location-plus'></i>
          <div class="info-text">
            <span class="label">Address</span>
            <span class="value">${formattedAddress}</span>
          </div>
        </div>
      `;

      if (hasRdanaData || hasApprovedReports) {
        infoSectionContent += `
          ${finalNeedsAssessmentHtml}
          ${finalApprovedReportsHtml}
        `;
      }

      const popupContent = `
        <div class="bayanihan-infowindow">
          <div class="header">
            <img src="assets/images/AB_logo.png" alt="AB Logo" style="width: 60px; height: 60px; border-radius: 16px; padding: 6px; box-sizing: border-box; object-fit: contain">                            
            <div class="header-text">
              <h3>${activation.organization || "Unknown"}</h3>
              <span class="status-badge"><i class='bx bx-check-circle'></i> Active</span>
            </div>
          </div>
          <div class="info-section">
            ${infoSectionContent}
          </div>
        </div>
        <style>
          .bayanihan-infowindow {
            font-family: 'Arial', sans-serif;
            background: #fff;
            border-radius: 16px;
            max-width: 420px;
            padding: 28px;
            border-left: 8px solid #FF69B4;
            animation: fadeSlideIn 0.4s ease;
          }
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 24px;
            gap: 16px;
          }
          .placeholder-icon {
            width: 80px;
            height: 80px;
            border-radius: 16px;
            background: rgb(255, 255, 255);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px;
            box-sizing: border-box;
          }
          .small-placeholder-icon {
            width: 24px;
            height: 24px;
            border-radius: 8px;
            background: rgb(255, 255, 255);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2px;
            box-sizing: border-box;
            flex-shrink: 0;
            margin-top: 4px;
          }
          .header-text h3 {
            margin: 0;
            font-size: 20px;
            color: #007BFF;
            line-height: 1.3;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            margin-top: 6px;
            font-size: 13px;
            background: #d4edda;
            color: #388E3C;
            padding: 4px 10px;
            border-radius: 16px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .status-badge i {
            font-size: 18px;
            margin-right: 6px;
          }
          .info-section {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }
          .info-item {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            font-size: 16px;
            color: #333;
          }
          .info-item i {
            font-size: 24px;
            color: #007BFF;
            flex-shrink: 0;
            margin-top: 4px;
          }
          .info-text {
            display: flex;
            flex-direction: column;
          }
          .label {
            font-weight: bold;
            color: #555;
            font-size: 14px;
            margin-bottom: 4px;
          }
          .value {
            color: #222;
            font-size: 15px;
          }
          ul {
            list-style-type: none;
            padding-left: 0;
            margin: 10px 0;
          }
          li {
            margin: 5px 0;
            font-size: 14px;
          }
          pre {
            background: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
          }
          @keyframes fadeSlideIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        </style>
      `;

      marker.bindPopup(popupContent, { maxWidth: 420 });

      marker.on('click', () => {
        if (currentPopup) {
          currentPopup.closePopup();
        }
        marker.openPopup();
        currentPopup = marker;
      });

      markers.push(marker);
      console.log('Added marker for:', activation.organization, 'at', [lat, lng], 'with address:', formattedAddress);
    }
    console.log('Total markers added:', markers.length);
    if (markers.length > 0) {
      map.fitBounds(markers.map(m => m.getLatLng()), { padding: [50, 50] });
      console.log('Map bounds adjusted to show all markers');
    } else {
      console.warn('No markers to display');
    }
  };

  activationsListenerQuery.on("value", activationsListenerCallback, error => {
    console.error('Activation listener error:', error);
  });
}

function fetchVolunteerGroups() {
  database.ref("volunteerGroups").once("value", snapshot => {
    allVolunteerGroups = [];
    const fetchedGroups = snapshot.val();
    if (fetchedGroups) {
      for (let key in fetchedGroups) {
        allVolunteerGroups.push({
          no: parseInt(key),
          organization: fetchedGroups[key].organization || "Unknown",
          hq: fetchedGroups[key].hq || "Not specified",
        });
      }
      allVolunteerGroups.sort((a, b) => a.no - b.no);
    }
  }, error => {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: `Failed to load volunteer groups: ${error.message}`
    });
  });
}

window.addEventListener('beforeunload', () => {
  if (activationsListenerQuery && activationsListenerCallback) {
    activationsListenerQuery.off("value", activationsListenerCallback);
  }
  markers.forEach(marker => marker.remove());
  markers = [];
});

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr || "-";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: 'Asia/Manila'
  });
}

window.addEventListener("scroll", function () {
  const navbar = document.querySelector(".navbar");
  const scrollThreshold = 600;
  if (window.scrollY > scrollThreshold) {
    navbar.style.opacity = "0";
    navbar.style.pointerEvents = "none";
    navbar.style.transition = "opacity 0.5s ease";
  } else {
    navbar.style.opacity = "1";
    navbar.style.pointerEvents = "auto";
  }
});

database.ref("settings/metrics").on("value", snapshot => {
  const settings = snapshot.val();
  if (!settings) return;
  Object.entries(settings).forEach(([metricId, visible]) => {
    const el = document.getElementById(metricId);
    if (el) {
      el.closest(".metric-card").style.display = visible ? "block" : "none";
    }
  });
});