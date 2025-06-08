window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
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
let approvedReports = []; // Store approved reports

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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

console.log('Firebase DB initialized:', database);

// Format numbers
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

// Elements for Reports
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

        const reports = snapshot.val();
        if (reports) {
            const reportEntries = Object.entries(reports);
            reportEntries.forEach(([key, report]) => {
                totalEvacuees += parseFloat(report.NoOfIndividualsOrFamilies || report.families || 0);
                totalFoodPacks += parseFloat(report.NoOfFoodPacks || report.foodPacks || 0);
                totalHotMeals += parseFloat(report.NoOfHotMeals || report.hotMeals || 0);
                totalWaterLiters += parseFloat(report.LitersOfWater || report.water || 0);
                totalVolunteers += parseFloat(report.NoOfVolunteersMobilized || report.volunteers || 0);
                totalMonetaryDonations += parseFloat(report.TotalMonetaryDonations || report.amountRaised || 0);
                totalInKindDonations += parseFloat(report.TotalValueOfInKindDonations || report.inKindValue || 0);
            });
        }

        animateNumber('evacuees', totalEvacuees, 1000, 0);
        animateNumber('food-packs', totalFoodPacks, 1000, 0);
        animateNumber('hot-meals', totalHotMeals, 1000, 0);
        animateNumber('water-liters', totalWaterLiters, 1000, 0);
        animateNumber('volunteers', totalVolunteers, 1000, 0);
        animateNumber('amount-raised', totalMonetaryDonations, 1000, 2);
        animateNumber('inkind-donations', totalInKindDonations, 1000, 2);
    }, error => {
        console.error("Error fetching approved reports:", error);
        if (evacueesEl) evacueesEl.textContent = "0 (Error)";
        if (foodPacksEl) foodPacksEl.textContent = "0 (Error)";
        if (hotMealsEl) hotMealsEl.textContent = "0 (Error)";
        if (waterLitersEl) waterLitersEl.textContent = "0 (Error)";
        if (volunteersEl) volunteersEl.textContent = "0 (Error)";
        if (amountRaisedEl) amountRaisedEl.textContent = "₱0.00 (Error)";
        if (inKindDonationsEl) inKindDonationsEl.textContent = "₱0.00 (Error)";
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

    const philippinesBounds = {
        north: 21.5,
        south: 4.5,
        west: 114.0,
        east: 127.0
    };

    const defaultLocation = { lat: 14.5995, lng: 121.05 };

    map = new google.maps.Map(mapDiv, {
        center: defaultLocation,
        zoom: 6,
        restriction: {
            latLngBounds: philippinesBounds,
            strictBounds: true
        },
        mapTypeId: "roadmap"
    });

    fetch('./json/ph_admin1.geojson')
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log("GeoJSON loaded:", data);

            geoJsonLayer = map.data;
            geoJsonLayer.addGeoJson(data);

            geoJsonLayer.setStyle({
                fillColor: '#FA3C99',
                fillOpacity: 0.5,
                strokeColor: '#FFF',
                strokeWeight: 1,
                clickable: false
            });

            geoJsonLayer.addListener('mouseover', event => {
                geoJsonLayer.overrideStyle(event.feature, { fillOpacity: 0.7 });
            });

            geoJsonLayer.addListener('mouseout', event => {
                geoJsonLayer.revertStyle(event.feature);
            });

            geoJsonLayer.addListener('click', event => {
                const name = event.feature.getProperty("name") || event.feature.getProperty("NAME_1") || "Unnamed Province";
                const content = `<strong>${name}</strong>`;
                const infowindow = new google.maps.InfoWindow({
                    content,
                    position: event.latLng
                });
                infowindow.open(map);
            });

            // Ensure approved reports are loaded before adding markers
            loadApprovedReports().then(() => {
                console.log("Approved reports loaded before adding markers");
                addMarkersForActiveActivations();
                fetchReports();
            }).catch(error => {
                console.error("Failed to load approved reports before adding markers:", error);
                // Proceed anyway to avoid blocking the map
                addMarkersForActiveActivations();
                fetchReports();
            });
        })
        .catch(err => {
            console.error("Failed to load GeoJSON:", err);
            Swal.fire({
                icon: "error",
                title: "GeoJSON Error",
                text: "Could not load the province boundaries."
            });
        });
}

async function loadApprovedReports() {
    try {
        const snapshot = await database.ref("reports/approved").once("value");
        const reports = snapshot.val();
        approvedReports = [];
        if (reports) {
            Object.keys(reports).forEach(key => {
                const report = reports[key];
                console.log(`Loading report ${key}:`, report); // Debug log
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
            console.log("Approved reports loaded:", approvedReports);
        } else {
            console.log("No approved reports found in Firebase");
        }
    } catch (error) {
        console.error("Error loading approved reports:", error);
        throw error; // Re-throw to catch in initializeMap
    }
}

async function addMarkersForActiveActivations() {
    if (!map) {
        console.error("Map not initialized before adding markers");
        return;
    }

    if (activationsListenerQuery && activationsListenerCallback) {
        activationsListenerQuery.off("value", activationsListenerCallback);
        console.log("Removed previous activations listener");
    }

    activationsListenerQuery = database.ref("activations").orderByChild("status").equalTo("active");

    activationsListenerCallback = async snapshot => {
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        const activations = snapshot.val();
        console.log("Firebase activations snapshot:", activations);

        if (!activations) {
            console.log("No active activations found in Firebase.");
            return;
        }

        for (const [key, activation] of Object.entries(activations)) {
            if (!activation.latitude || !activation.longitude) {
                console.warn(`Skipping activation ${key} due to missing lat/lng`);
                continue;
            }

            const lat = parseFloat(activation.latitude);
            const lng = parseFloat(activation.longitude);
            if (isNaN(lat) || isNaN(lng)) {
                console.warn(`Skipping activation ${key} due to invalid lat/lng`);
                continue;
            }

            const position = { lat, lng };

            const group = allVolunteerGroups.find(g => g.no === activation.groupId);
            const organization = activation.organization || "unknown";
            console.log(`Processing activation ${key} with organization: ${organization}`);

            const marker = new google.maps.Marker({
                position,
                map,
                title: activation.organization || "Organization Unknown",
            });

            // Fetch needs assessment and approved reports
            let needsAssessmentHtml = "<p>No needs assessment available for this activation.</p>";
            let approvedReportsHtml = "<p>No approved reports available for this ABVN.</p>";
            let hasRdanaData = false;
            let hasApprovedReports = false;

            try {
                // Fetch RDANA logs
                const rdanaSnapshot = await database.ref("rdana/approved").once("value");
                const rdanaLogs = rdanaSnapshot.val();
                console.log(`All RDANA logs:`, rdanaLogs);

                if (rdanaLogs) {
    for (let rdanaKey in rdanaLogs) {
        const log = rdanaLogs[rdanaKey];
        console.log(`Checking RDANA ${rdanaKey}: rdanaGroup=${log.rdanaGroup}, activation organization=${organization}`);
        if (log.rdanaGroup && organization && log.rdanaGroup.toLowerCase() === organization.toLowerCase()) {
            const needsChecklist = log.needsChecklist || [];
            console.log(`Needs checklist for RDANA ${rdanaKey}:`, needsChecklist);

            if (needsChecklist.length > 0) {
                // Filter for items where needed is true and map to HTML
                const neededItems = needsChecklist.filter(item => item.needed);
                if (neededItems.length > 0) {
                    needsAssessmentHtml = `
                        <h3>Critical Needs</h3>
                        <ul>
                            ${neededItems.map(item => `<li>${item.item}</li>`).join("")}
                        </ul>
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
} else {
    console.log("No RDANA logs found in rdana/approved.");
}

                // Fetch approved reports submitted by this specific ABVN (organization)
                console.log(`Approved reports array:`, approvedReports);

                const relevantReports = approvedReports.filter(report => {
                    const matchesVolunteerGroup = report.VolunteerGroupName && organization && 
                        report.VolunteerGroupName.toLowerCase() === organization.toLowerCase();
                    console.log(`Checking report: VolunteerGroupName=${report.VolunteerGroupName}, organization=${organization}, matches=${matchesVolunteerGroup}`);
                    return matchesVolunteerGroup;
                });

                console.log(`Relevant reports for ${organization}:`, relevantReports);

              if (relevantReports.length > 0) {
    approvedReportsHtml = `
        <ul>
            ${relevantReports.map(report => `
                <li>
                    <h3>Relief Operation Report (${formatDate(report.DateOfReport) || 'No date'})</h3>
                    Evacuees: ${report.NoOfIndividualsOrFamilies || 0}<br>
                    Food Packs: ${report.NoOfFoodPacks || 0}<br>
                    Hot Meals: ${report.NoOfHotMeals || 0}<br>
                    Water (Liters): ${report.LitersOfWater || 0}<br>
                    Volunteers: ${report.NoOfVolunteersMobilized || 0}<br>
                    Monetary Donations: ₱${abbreviateNumber(parseFloat(report.TotalMonetaryDonations || 0))}<br>
                    In-Kind Donations: ₱${abbreviateNumber(parseFloat(report.TotalValueOfInKindDonations || 0))}
                </li>
            `).join("")}
        </ul>
    `;
    hasApprovedReports = true;
} else {
    // Fallback to show raw report data for debugging
    approvedReportsHtml = `
        <h3>Relief Operation Reports</h3>
        <p>No matching reports found. Raw approved reports data:</p>
        <pre>${JSON.stringify(approvedReports.filter(r => r.VolunteerGroupName && organization && r.VolunteerGroupName.toLowerCase() === organization.toLowerCase()), null, 2)}</pre>
    `;
}
            } catch (error) {
                console.error(`Error fetching RDANA or reports for organization ${organization}:`, error);
                needsAssessmentHtml = "<p>Error loading needs assessment.</p>";
                approvedReportsHtml = "<p>Error loading approved reports for this ABVN.</p>";
            }

            // Initialize as empty strings to hide sections if no data exists
            let finalNeedsAssessmentHtml = needsAssessmentHtml;
            let finalApprovedReportsHtml = approvedReportsHtml;
            if (needsAssessmentHtml.includes("No needs assessment") || needsAssessmentHtml.includes("Error loading")) {
                finalNeedsAssessmentHtml = "";
            }
            if (approvedReportsHtml.includes("No approved reports") || approvedReportsHtml.includes("Error loading")) {
                finalApprovedReportsHtml = "";
            }

            // Base info sections that are always displayed
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
                        <span class="value">${activation.calamityType || "Unknown"}${activation.typhoonName ? ` (${activation.typhoonName})` : ''}</span>
                    </div>
                </div>
                <div class="info-item">
                    <div class="small-placeholder-icon"><i class='bx bx-building'></i></div>
                    <div class="info-text">
                        <span class="label">ABVN Group</span>
                        <span class="value">${group ? group.organization : 'Unknown'}</span>
                    </div>
                </div>
            `;

            // If there’s RDANA or approved reports data, append those sections
            if (hasRdanaData || hasApprovedReports) {
                infoSectionContent += `
                    ${finalNeedsAssessmentHtml}
                    ${finalApprovedReportsHtml}
                `;
            }

            const infowindow = new google.maps.InfoWindow({
                content: `
                    <div class="bayanihan-infowindow">
                        <div class="header">
                            <div class="placeholder-icon"><i class='bx bx-building'></i></div>
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
                `
            });

            marker.addListener("click", () => {
                infowindow.open(map, marker);
            });

            markers.push(marker);
        }

        console.log(`Added ${markers.length} markers to the map.`);
    };

    activationsListenerQuery.on("value", activationsListenerCallback);
    console.log('addMarkersForActiveActivations listener attached');
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
        console.error("Error fetching volunteerGroups:", error);
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
    markers.forEach(marker => marker.setMap(null));
    markers = [];
});

// Helper function to format date (from reports.js)
function formatDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr || "-";
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}