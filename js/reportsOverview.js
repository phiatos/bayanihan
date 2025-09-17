try {
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

    let database, auth;
    try {
        const firebaseApp = firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        auth = firebase.auth();
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        Swal.fire({
            icon: 'error',
            title: 'Initialization Error',
            text: 'Failed to initialize Firebase. Please try again later.',
        });
        return;
    }

    const totalReports = document.getElementById("total-reports");
    const pendingReports = document.getElementById("pending-reports");
    const approvedReports = document.getElementById("approved-reports");
    const totalFoodPacks = document.getElementById("total-food-packs");
    const totalVolunteers = document.getElementById("total-volunteers");
    const totalHotMeals = document.getElementById("total-hot-meals");
    const totalWater = document.getElementById("total-water");
    const totalInKind = document.getElementById("total-in-kind");
    const totalMonetary = document.getElementById("total-monetary");
    const foodPacksChange = document.getElementById("food-packs-change");
    const volunteersChange = document.getElementById("volunteers-change");
    const hotMealsChange = document.getElementById("hot-meals-change");
    const waterChange = document.getElementById("water-change");
    const inKindChange = document.getElementById("in-kind-change");
    const monetaryChange = document.getElementById("monetary-change");
    const foodPacksChart = document.getElementById("food-packs-chart");
    const volunteersChart = document.getElementById("volunteers-chart");
    const hotMealsChart = document.getElementById("hot-meals-chart");
    const waterChart = document.getElementById("water-chart");
    const inKindChart = document.getElementById("in-kind-chart");
    const monetaryChart = document.getElementById("monetary-chart");
    const reportsTable = document.getElementById("reports-table");
    const abvnRankingsTable = document.getElementById("abvn-rankings-table");
    const abvnTotalMetricsTable = document.getElementById("abvn-total-metrics-table");
    const reportSearchInput = document.getElementById("report-search-input");
    const statusFilter = document.getElementById("status-filter");
    const calamityTypeFilter = document.getElementById("calamity-type-filter");
    const calamityNameFilter = document.getElementById("calamity-name-filter");
    const reportPreviewModal = document.getElementById("reportPreviewModal");
    const reportModalContent = document.getElementById("reportModalContent");
    const closeReportModal = document.getElementById("closeReportModal");
    const metricBreakdownModal = document.getElementById("metricBreakdownModal");
    const metricModalContent = document.getElementById("metricModalContent");
    const closeMetricModal = document.getElementById("closeMetricModal");
    const reportsChartCanvas = document.getElementById("reportsChart");

    console.log("DOM elements check:", {
        totalReports: !!totalReports,
        pendingReports: !!pendingReports,
        approvedReports: !!approvedReports,
        totalFoodPacks: !!totalFoodPacks,
        totalVolunteers: !!totalVolunteers,
        totalHotMeals: !!totalHotMeals,
        totalWater: !!totalWater,
        totalInKind: !!totalInKind,
        totalMonetary: !!totalMonetary,
        foodPacksChange: !!foodPacksChange,
        volunteersChange: !!volunteersChange,
        hotMealsChange: !!hotMealsChange,
        waterChange: !!waterChange,
        inKindChange: !!inKindChange,
        monetaryChange: !!monetaryChange,
        foodPacksChart: !!foodPacksChart,
        volunteersChart: !!volunteersChart,
        hotMealsChart: !!hotMealsChart,
        waterChart: !!waterChart,
        inKindChart: !!inKindChart,
        monetaryChart: !!monetaryChart,
        reportsTable: !!reportsTable,
        abvnRankingsTable: !!abvnRankingsTable,
        abvnTotalMetricsTable: !!abvnTotalMetricsTable,
        reportSearchInput: !!reportSearchInput,
        statusFilter: !!statusFilter,
        calamityTypeFilter: !!calamityTypeFilter,
        calamityNameFilter: !!calamityNameFilter,
        reportPreviewModal: !!reportPreviewModal,
        reportModalContent: !!reportModalContent,
        closeReportModal: !!closeReportModal,
        metricBreakdownModal: !!metricBreakdownModal,
        metricModalContent: !!metricModalContent,
        closeMetricModal: !!closeMetricModal,
        reportsChartCanvas: !!reportsChartCanvas
    });

    if (!totalReports || !pendingReports || !approvedReports || !totalFoodPacks || !totalVolunteers || 
        !totalHotMeals || !totalWater || !totalInKind || !totalMonetary || !foodPacksChange || 
        !volunteersChange || !hotMealsChange || !waterChange || !inKindChange || !monetaryChange || 
        !foodPacksChart || !volunteersChart || !hotMealsChart || !waterChart || !inKindChart || 
        !monetaryChart || !reportsTable || !abvnRankingsTable || !abvnTotalMetricsTable || !reportSearchInput || !statusFilter || 
        !calamityTypeFilter || !calamityNameFilter || !reportPreviewModal || !reportModalContent || 
        !closeReportModal || !metricBreakdownModal || !metricModalContent || !closeMetricModal || 
        !reportsChartCanvas) {
        console.error("Required DOM elements not found:", {
            totalReports: !!totalReports,
            pendingReports: !!pendingReports,
            approvedReports: !!approvedReports,
            totalFoodPacks: !!totalFoodPacks,
            totalVolunteers: !!totalVolunteers,
            totalHotMeals: !!totalHotMeals,
            totalWater: !!totalWater,
            totalInKind: !!totalInKind,
            totalMonetary: !!totalMonetary,
            foodPacksChange: !!foodPacksChange,
            volunteersChange: !!volunteersChange,
            hotMealsChange: !!hotMealsChange,
            waterChange: !!waterChange,
            inKindChange: !!inKindChange,
            monetaryChange: !!monetaryChange,
            foodPacksChart: !!foodPacksChart,
            volunteersChart: !!volunteersChart,
            hotMealsChart: !!hotMealsChart,
            waterChart: !!waterChart,
            inKindChart: !!inKindChart,
            monetaryChart: !!monetaryChart,
            reportsTable: !!reportsTable,
            abvnRankingsTable: !!abvnRankingsTable,
            abvnTotalMetricsTable: !!abvnTotalMetricsTable,
            reportSearchInput: !!reportSearchInput,
            statusFilter: !!statusFilter,
            calamityTypeFilter: !!calamityTypeFilter,
            calamityNameFilter: !!calamityNameFilter,
            reportPreviewModal: !!reportPreviewModal,
            reportModalContent: !!reportModalContent,
            closeReportModal: !!closeReportModal,
            metricBreakdownModal: !!metricBreakdownModal,
            metricModalContent: !!metricModalContent,
            closeMetricModal: !!closeMetricModal,
            reportsChartCanvas: !!reportsChartCanvas
        });
        Swal.fire({
            icon: 'error',
            title: 'Page Error',
            text: 'Required elements are missing on the page. Please contact support.',
        });
        return;
    }

    let allReports = [];
    let chartInstance = null;
    let metricChartInstances = {
        foodPacks: null,
        volunteers: null,
        hotMeals: null,
        water: null,
        inKind: null,
        monetary: null
    };

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return isNaN(date) ? dateStr || "-" : date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    function formatCurrency(value) {
        return value != null
            ? new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP',
                minimumFractionDigits: 0,
            }).format(value)
            : "-";
    }

    function formatWithCommas(value) {
        return value != null ? Number(value).toLocaleString() : "-";
    }

    function calculatePercentageChange(current, previous) {
        if (previous === 0) {
            return current === 0 ? 0 : (current > 0 ? Infinity : -Infinity);
        }
        return ((current - previous) / previous * 100).toFixed(1);
    }

    function formatPercentageChange(change) {
        if (change === 0) return { text: "No change from last month", color: "#666" };
        if (change === Infinity) return { text: "New contributions this month", color: "#28a745" };
        if (change === -Infinity) return { text: "No contributions this month", color: "#dc3545" };
        const prefix = change > 0 ? "+" : "";
        const color = change > 0 ? "#28a745" : "#dc3545";
        return { text: `${prefix}${change}% from last month`, color };
    }

    function transformReportData(report, key, activationData = {}) {
        const calamityName = activationData.calamityName || activationData.typhoonName || report.CalamityName || report.CalamityAreaDetails || "-";
        const calamityType = activationData.calamityType || activationData.CalamityType || report.CalamityType || 
                            (report.CalamityAreaDetails ? report.CalamityAreaDetails.split(' ')[0] : "-");

        return {
            firebaseKey: key,
            ReportID: report.reportID || report.ReportID || "-",
            VolunteerGroupName: report.organization || report.VolunteerGroupName || "Admin",
            AreaOfOperation: report.AreaOfOperation || "-",
            CalamityType: calamityType,
            CalamityName: calamityName,
            DateOfReport: report.dateOfReport || report.DateOfReport || "-",
            Status: report.status || report.Status || "Approved",
            TotalValueOfInKindDonations: report.inKindValue || report.TotalValueOfInKindDonations || 0,
            TotalMonetaryDonations: report.amountRaised || report.TotalMonetaryDonations || 0,
            NoOfVolunteersMobilized: report.volunteers || report.NoOfVolunteersMobilized || 0,
            NoOfFoodPacks: report.foodPacks || report.NoOfFoodPacks || 0,
            NoOfHotMeals: report.hotMeals || report.NoOfHotMeals || 0,
            LitersOfWater: report.water || report.LitersOfWater || 0,
            activationId: report.activationId || "-"
        };
    }

    function calculateKeyMetrics() {
        const abvnReports = allReports.filter(report => report.VolunteerGroupName !== "Admin");
        const currentDate = new Date('2025-09-18');
        const currentMonth = currentDate.toLocaleString("en-US", { month: "short", year: "numeric" });
        const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const previousMonth = prevMonthDate.toLocaleString("en-US", { month: "short", year: "numeric" });

        // Define the last 6 months for charts
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            months.push(date.toLocaleString("en-US", { month: "short", year: "numeric" }));
        }

        const currentMonthReports = abvnReports.filter(report => {
            const reportDate = new Date(report.DateOfReport);
            return reportDate.toLocaleString("en-US", { month: "short", year: "numeric" }) === currentMonth;
        });

        const previousMonthReports = abvnReports.filter(report => {
            const reportDate = new Date(report.DateOfReport);
            return reportDate.toLocaleString("en-US", { month: "short", year: "numeric" }) === previousMonth;
        });

        const totalFoodPacksCount = abvnReports.reduce((sum, report) => sum + (Number(report.NoOfFoodPacks) || 0), 0);
        const totalVolunteersCount = abvnReports.reduce((sum, report) => sum + (Number(report.NoOfVolunteersMobilized) || 0), 0);
        const totalHotMealsCount = abvnReports.reduce((sum, report) => sum + (Number(report.NoOfHotMeals) || 0), 0);
        const totalWaterCount = abvnReports.reduce((sum, report) => sum + (Number(report.LitersOfWater) || 0), 0);
        const totalInKindCount = abvnReports.reduce((sum, report) => sum + (Number(report.TotalValueOfInKindDonations) || 0), 0);
        const totalMonetaryCount = abvnReports.reduce((sum, report) => sum + (Number(report.TotalMonetaryDonations) || 0), 0);

        const currentFoodPacks = currentMonthReports.reduce((sum, report) => sum + (Number(report.NoOfFoodPacks) || 0), 0);
        const currentVolunteers = currentMonthReports.reduce((sum, report) => sum + (Number(report.NoOfVolunteersMobilized) || 0), 0);
        const currentHotMeals = currentMonthReports.reduce((sum, report) => sum + (Number(report.NoOfHotMeals) || 0), 0);
        const currentWater = currentMonthReports.reduce((sum, report) => sum + (Number(report.LitersOfWater) || 0), 0);
        const currentInKind = currentMonthReports.reduce((sum, report) => sum + (Number(report.TotalValueOfInKindDonations) || 0), 0);
        const currentMonetary = currentMonthReports.reduce((sum, report) => sum + (Number(report.TotalMonetaryDonations) || 0), 0);

        const previousFoodPacks = previousMonthReports.reduce((sum, report) => sum + (Number(report.NoOfFoodPacks) || 0), 0);
        const previousVolunteers = previousMonthReports.reduce((sum, report) => sum + (Number(report.NoOfVolunteersMobilized) || 0), 0);
        const previousHotMeals = previousMonthReports.reduce((sum, report) => sum + (Number(report.NoOfHotMeals) || 0), 0);
        const previousWater = previousMonthReports.reduce((sum, report) => sum + (Number(report.LitersOfWater) || 0), 0);
        const previousInKind = previousMonthReports.reduce((sum, report) => sum + (Number(report.TotalValueOfInKindDonations) || 0), 0);
        const previousMonetary = previousMonthReports.reduce((sum, report) => sum + (Number(report.TotalMonetaryDonations) || 0), 0);

        // Calculate monthly data for charts
        const monthlyData = {
            foodPacks: {},
            volunteers: {},
            hotMeals: {},
            water: {},
            inKind: {},
            monetary: {}
        };
        abvnReports.forEach(report => {
            const reportDate = new Date(report.DateOfReport);
            if (isNaN(reportDate)) return;
            const monthYear = reportDate.toLocaleString("en-US", { month: "short", year: "numeric" });
            if (months.includes(monthYear)) {
                monthlyData.foodPacks[monthYear] = (monthlyData.foodPacks[monthYear] || 0) + (Number(report.NoOfFoodPacks) || 0);
                monthlyData.volunteers[monthYear] = (monthlyData.volunteers[monthYear] || 0) + (Number(report.NoOfVolunteersMobilized) || 0);
                monthlyData.hotMeals[monthYear] = (monthlyData.hotMeals[monthYear] || 0) + (Number(report.NoOfHotMeals) || 0);
                monthlyData.water[monthYear] = (monthlyData.water[monthYear] || 0) + (Number(report.LitersOfWater) || 0);
                monthlyData.inKind[monthYear] = (monthlyData.inKind[monthYear] || 0) + (Number(report.TotalValueOfInKindDonations) || 0);
                monthlyData.monetary[monthYear] = (monthlyData.monetary[monthYear] || 0) + (Number(report.TotalMonetaryDonations) || 0);
            }
        });

        return {
            totalFoodPacksCount,
            totalVolunteersCount,
            totalHotMealsCount,
            totalWaterCount,
            totalInKindCount,
            totalMonetaryCount,
            foodPacksChange: calculatePercentageChange(currentFoodPacks, previousFoodPacks),
            volunteersChange: calculatePercentageChange(currentVolunteers, previousVolunteers),
            hotMealsChange: calculatePercentageChange(currentHotMeals, previousHotMeals),
            waterChange: calculatePercentageChange(currentWater, previousWater),
            inKindChange: calculatePercentageChange(currentInKind, previousInKind),
            monetaryChange: calculatePercentageChange(currentMonetary, previousMonetary),
            monthlyData,
            months
        };
    }

    function calculateABVNRankings() {
        const abvnReports = allReports.filter(report => report.VolunteerGroupName !== "Admin");
        const reportCounts = abvnReports.reduce((acc, report) => {
            acc[report.VolunteerGroupName] = (acc[report.VolunteerGroupName] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(reportCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    function calculateABVNTotalMetrics() {
        const abvnReports = allReports.filter(report => report.VolunteerGroupName !== "Admin");
        const metrics = abvnReports.reduce((acc, report) => {
            const groupName = report.VolunteerGroupName;
            if (!acc[groupName]) {
                acc[groupName] = {
                    foodPacks: 0,
                    volunteers: 0,
                    hotMeals: 0,
                    water: 0,
                    inKind: 0,
                    monetary: 0
                };
            }
            acc[groupName].foodPacks += Number(report.NoOfFoodPacks) || 0;
            acc[groupName].volunteers += Number(report.NoOfVolunteersMobilized) || 0;
            acc[groupName].hotMeals += Number(report.NoOfHotMeals) || 0;
            acc[groupName].water += Number(report.LitersOfWater) || 0;
            acc[groupName].inKind += Number(report.TotalValueOfInKindDonations) || 0;
            acc[groupName].monetary += Number(report.TotalMonetaryDonations) || 0;
            return acc;
        }, {});
        return Object.entries(metrics)
            .map(([name, values]) => ({ name, ...values }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    window.showMetricBreakdown = function(metric) {
        const metricMap = {
            foodPacks: 'NoOfFoodPacks',
            volunteers: 'NoOfVolunteersMobilized',
            hotMeals: 'NoOfHotMeals',
            water: 'LitersOfWater',
            inKind: 'TotalValueOfInKindDonations',
            monetary: 'TotalMonetaryDonations'
        };
        const titleMap = {
            foodPacks: 'Food Packs',
            volunteers: 'Volunteers Mobilized',
            hotMeals: 'Hot Meals',
            water: 'Liters of Water',
            inKind: 'In-Kind Donations',
            monetary: 'Monetary Donations'
        };
        const contributionCounts = allReports
            .filter(report => report.VolunteerGroupName !== "Admin")
            .reduce((acc, report) => {
                const value = Number(report[metricMap[metric]]) || 0;
                if (value > 0) {
                    acc[report.VolunteerGroupName] = (acc[report.VolunteerGroupName] || 0) + value;
                }
                return acc;
            }, {});
        const rankings = Object.entries(contributionCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        metricModalContent.innerHTML = `
            <h2>${titleMap[metric]} Breakdown by ABVN</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Volunteer Group</th>
                            <th>${titleMap[metric]}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rankings.length === 0 ? '<tr><td colspan="3">No contributions found.</td></tr>' : 
                        rankings.map((group, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${group.name}</td>
                                <td>${metric === 'inKind' || metric === 'monetary' ? formatCurrency(group.value) : formatWithCommas(group.value)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        metricBreakdownModal.style.display = "flex";
    };

    async function loadReports() {
        try {
            console.log("Loading reports from Firebase...");
            const approvedSnapshot = await database.ref("reports/approved").once("value");
            const archivedSnapshot = await database.ref("reports/archived/reportslog").once("value");
            const pendingSnapshot = await database.ref("reports/verification").once("value");
            allReports = [];

            const processReports = async (reports, source) => {
                if (reports) {
                    for (const [key, report] of Object.entries(reports)) {
                        let activationData = {};
                        if (report.activationId) {
                            try {
                                const activationSnapshot = await database.ref(`activations/${report.activationId}`).once("value");
                                activationData = activationSnapshot.val() || {};
                            } catch (error) {
                                console.warn(`Error fetching activation data for ${source} report ${key}:`, error);
                            }
                        }
                        if (!report.VolunteerGroupName && !report.organization) {
                            report.VolunteerGroupName = "Admin";
                        }
                        const transformedReport = transformReportData(report, key, activationData);
                        transformedReport.source = source;
                        allReports.push(transformedReport);
                    }
                }
            };

            await processReports(approvedSnapshot.val(), "approved");
            await processReports(archivedSnapshot.val(), "archived");
            await processReports(pendingSnapshot.val(), "verification");
            console.log("Reports loaded successfully:", allReports.length);
            renderDashboard();
            populateFilters();
        } catch (error) {
            console.error("Error fetching reports:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load reports: ' + error.message,
            });
        }
    }

    function populateFilters() {
        const calamityTypes = [...new Set(allReports.map(report => report.CalamityType))].filter(type => type !== "-");
        const calamityNames = [...new Set(allReports.map(report => report.CalamityName))].filter(name => name !== "-");

        calamityTypeFilter.innerHTML = '<option value="">All Calamity Types</option>';
        calamityTypes.forEach(type => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type;
            calamityTypeFilter.appendChild(option);
        });

        calamityNameFilter.innerHTML = '<option value="">All Calamity Names</option>';
        calamityNames.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            calamityNameFilter.appendChild(option);
        });
    }

    function renderDashboard() {
        // Update summary cards
        const total = allReports.length;
        const approved = allReports.filter(r => r.source === "approved").length;
        const pending = allReports.filter(r => r.source === "verification").length;
        totalReports.textContent = formatWithCommas(total);
        pendingReports.textContent = formatWithCommas(pending);
        approvedReports.textContent = formatWithCommas(approved);

        // Update key metrics and charts
        const { 
            totalFoodPacksCount, 
            totalVolunteersCount, 
            totalHotMealsCount, 
            totalWaterCount, 
            totalInKindCount, 
            totalMonetaryCount,
            foodPacksChange: foodPacksChangeValue,
            volunteersChange: volunteersChangeValue,
            hotMealsChange: hotMealsChangeValue,
            waterChange: waterChangeValue,
            inKindChange: inKindChangeValue,
            monetaryChange: monetaryChangeValue,
            monthlyData,
            months
        } = calculateKeyMetrics();

        // Update metric values
        totalFoodPacks.textContent = formatWithCommas(totalFoodPacksCount);
        totalVolunteers.textContent = formatWithCommas(totalVolunteersCount);
        totalHotMeals.textContent = formatWithCommas(totalHotMealsCount);
        totalWater.textContent = formatWithCommas(totalWaterCount);
        totalInKind.textContent = formatCurrency(totalInKindCount);
        totalMonetary.textContent = formatCurrency(totalMonetaryCount);

        // Update percentage changes
        const foodPacksChangeData = formatPercentageChange(foodPacksChangeValue);
        foodPacksChange.textContent = foodPacksChangeData.text;
        foodPacksChange.style.color = foodPacksChangeData.color;

        const volunteersChangeData = formatPercentageChange(volunteersChangeValue);
        volunteersChange.textContent = volunteersChangeData.text;
        volunteersChange.style.color = volunteersChangeData.color;

        const hotMealsChangeData = formatPercentageChange(hotMealsChangeValue);
        hotMealsChange.textContent = hotMealsChangeData.text;
        hotMealsChange.style.color = hotMealsChangeData.color;

        const waterChangeData = formatPercentageChange(waterChangeValue);
        waterChange.textContent = waterChangeData.text;
        waterChange.style.color = waterChangeData.color;

        const inKindChangeData = formatPercentageChange(inKindChangeValue);
        inKindChange.textContent = inKindChangeData.text;
        inKindChange.style.color = inKindChangeData.color;

        const monetaryChangeData = formatPercentageChange(monetaryChangeValue);
        monetaryChange.textContent = monetaryChangeData.text;
        monetaryChange.style.color = monetaryChangeData.color;

        // Render metric charts
        const chartConfig = {
            type: 'line',
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { font: { size: 10 } },
                        grid: { display: false }
                    },
                    x: {
                        ticks: { font: { size: 10 } },
                        grid: { display: false }
                    }
                }
            }
        };

        // Destroy existing chart instances
        Object.keys(metricChartInstances).forEach(key => {
            if (metricChartInstances[key]) {
                metricChartInstances[key].destroy();
                metricChartInstances[key] = null;
            }
        });

        // Food Packs Chart
        metricChartInstances.foodPacks = new Chart(foodPacksChart, {
            ...chartConfig,
            data: {
                labels: months,
                datasets: [{
                    data: months.map(month => monthlyData.foodPacks[month] || 0),
                    borderColor: '#14aebb',
                    backgroundColor: 'rgba(20, 174, 187, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            }
        });

        // Volunteers Chart
        metricChartInstances.volunteers = new Chart(volunteersChart, {
            ...chartConfig,
            data: {
                labels: months,
                datasets: [{
                    data: months.map(month => monthlyData.volunteers[month] || 0),
                    borderColor: '#14aebb',
                    backgroundColor: 'rgba(20, 174, 187, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            }
        });

        // Hot Meals Chart
        metricChartInstances.hotMeals = new Chart(hotMealsChart, {
            ...chartConfig,
            data: {
                labels: months,
                datasets: [{
                    data: months.map(month => monthlyData.hotMeals[month] || 0),
                    borderColor: '#14aebb',
                    backgroundColor: 'rgba(20, 174, 187, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            }
        });

        // Water Chart
        metricChartInstances.water = new Chart(waterChart, {
            ...chartConfig,
            data: {
                labels: months,
                datasets: [{
                    data: months.map(month => monthlyData.water[month] || 0),
                    borderColor: '#14aebb',
                    backgroundColor: 'rgba(20, 174, 187, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            }
        });

        // In-Kind Donations Chart
        metricChartInstances.inKind = new Chart(inKindChart, {
            ...chartConfig,
            data: {
                labels: months,
                datasets: [{
                    data: months.map(month => monthlyData.inKind[month] || 0),
                    borderColor: '#14aebb',
                    backgroundColor: 'rgba(20, 174, 187, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            }
        });

        // Monetary Donations Chart
        metricChartInstances.monetary = new Chart(monetaryChart, {
            ...chartConfig,
            data: {
                labels: months,
                datasets: [{
                    data: months.map(month => monthlyData.monetary[month] || 0),
                    borderColor: '#14aebb',
                    backgroundColor: 'rgba(20, 174, 187, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            }
        });

        // Update ABVN rankings
        const rankings = calculateABVNRankings();
        abvnRankingsTable.innerHTML = "";
        if (rankings.length === 0) {
            abvnRankingsTable.innerHTML = "<tr><td colspan='3'>No ABVN reports found.</td></tr>";
        } else {
            rankings.forEach((group, index) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${group.name}</td>
                    <td>${formatWithCommas(group.count)}</td>
                `;
                abvnRankingsTable.appendChild(tr);
            });
        }

        // Update ABVN total metrics
        const totalMetrics = calculateABVNTotalMetrics();
        abvnTotalMetricsTable.innerHTML = "";
        if (totalMetrics.length === 0) {
            abvnTotalMetricsTable.innerHTML = "<tr><td colspan='7'>No ABVN metrics found.</td></tr>";
        } else {
            totalMetrics.forEach(group => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${group.name}</td>
                    <td>${formatWithCommas(group.foodPacks)}</td>
                    <td>${formatWithCommas(group.volunteers)}</td>
                    <td>${formatWithCommas(group.hotMeals)}</td>
                    <td>${formatWithCommas(group.water)}</td>
                    <td>${formatCurrency(group.inKind)}</td>
                    <td>${formatCurrency(group.monetary)}</td>
                `;
                abvnTotalMetricsTable.appendChild(tr);
            });
        }

        // Render table with filters applied
        applyFiltersAndRenderTable();

        // Render main timeline chart
        renderChart();
    }

    function applyFiltersAndRenderTable() {
        const searchQuery = reportSearchInput.value.toLowerCase();
        const status = statusFilter.value;
        const calamityType = calamityTypeFilter.value;
        const calamityName = calamityNameFilter.value;

        let filteredReports = allReports.filter(report => {
            const matchesSearch = report.ReportID.toLowerCase().includes(searchQuery) || 
                                 report.VolunteerGroupName.toLowerCase().includes(searchQuery);
            const matchesStatus = !status || 
                                 (status === "approved" && report.source === "approved") || 
                                 (status === "archived" && report.source === "archived") ||
                                 (status === "verification" && report.source === "verification");
            const matchesType = !calamityType || report.CalamityType === calamityType;
            const matchesName = !calamityName || report.CalamityName === calamityName;
            return matchesSearch && matchesStatus && matchesType && matchesName;
        });

        reportsTable.innerHTML = "";
        if (filteredReports.length === 0) {
            reportsTable.innerHTML = "<tr><td colspan='9'>No reports found.</td></tr>";
            return;
        }

        filteredReports.forEach((report, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${report.ReportID || "-"}</td>
                <td>${report.VolunteerGroupName || "Admin"}</td>
                <td>${report.AreaOfOperation || "-"}</td>
                <td>${report.CalamityType || "-"}</td>
                <td>${report.CalamityName || "-"}</td>
                <td>${formatDate(report.DateOfReport) || "-"}</td>
                <td>${report.source === "approved" ? "Approved" : report.source === "archived" ? "Archived" : "Pending"}</td>
                <td>
                    <button class="view-btn" data-report-id="${report.firebaseKey}"><i class='bx bx-show-alt'></i></button>
                </td>
            `;
            reportsTable.appendChild(tr);
        });

        // Add event listeners for view buttons
        document.querySelectorAll(".view-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const reportId = btn.dataset.reportId;
                const report = allReports.find(r => r.firebaseKey === reportId);
                showReportModal(report);
            });
        });
    }

    function renderChart() {
        if (chartInstance) {
            chartInstance.destroy();
        }

        const reportsByMonth = allReports.reduce((acc, report) => {
            const date = new Date(report.DateOfReport);
            if (isNaN(date)) return acc;
            const monthYear = date.toLocaleString("en-US", { month: "short", year: "numeric" });
            acc[monthYear] = acc[monthYear] || { approved: 0, archived: 0, verification: 0 };
            if (report.source === "approved") {
                acc[monthYear].approved += 1;
            } else if (report.source === "archived") {
                acc[monthYear].archived += 1;
            } else if (report.source === "verification") {
                acc[monthYear].verification += 1;
            }
            return acc;
        }, {});

        const labels = Object.keys(reportsByMonth).sort((a, b) => new Date(a) - new Date(b));
        const approvedData = labels.map(label => reportsByMonth[label].approved);
        const archivedData = labels.map(label => reportsByMonth[label].archived);
        const pendingData = labels.map(label => reportsByMonth[label].verification);

        chartInstance = new Chart(reportsChartCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Approved Reports',
                        data: approvedData,
                        borderColor: '#14aebb',
                        backgroundColor: 'rgba(20, 174, 187, 0.2)',
                        fill: true
                    },
                    {
                        label: 'Archived Reports',
                        data: archivedData,
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255, 107, 107, 0.2)',
                        fill: true
                    },
                    {
                        label: 'Pending Reports',
                        data: pendingData,
                        borderColor: '#ffbb00',
                        backgroundColor: 'rgba(255, 187, 0, 0.2)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Reports' }
                    },
                    x: {
                        title: { display: true, text: 'Month' }
                    }
                }
            }
        });
    }

    function showReportModal(report) {
        reportModalContent.innerHTML = `
            <h2>Report Details</h2>
            <p><strong>Report ID:</strong> ${report.ReportID || "-"}</p>
            <p><strong>Volunteer Group:</strong> ${report.VolunteerGroupName || "Admin"}</p>
            <p><strong>Area of Operation:</strong> ${report.AreaOfOperation || "-"}</p>
            <p><strong>Calamity Type:</strong> ${report.CalamityType || "-"}</p>
            <p><strong>Calamity Name:</strong> ${report.CalamityName || "-"}</p>
            <p><strong>Date of Report:</strong> ${formatDate(report.DateOfReport) || "-"}</p>
            <p><strong>Status:</strong> ${report.source === "approved" ? "Approved" : report.source === "archived" ? "Archived" : "Pending"}</p>
            <p><strong>In-Kind Donations:</strong> ${formatCurrency(report.TotalValueOfInKindDonations)}</p>
            <p><strong>Monetary Donations:</strong> ${formatCurrency(report.TotalMonetaryDonations)}</p>
            <p><strong>Volunteers Mobilized:</strong> ${formatWithCommas(report.NoOfVolunteersMobilized)}</p>
            <p><strong>Food Packs:</strong> ${formatWithCommas(report.NoOfFoodPacks)}</p>
            <p><strong>Hot Meals:</strong> ${formatWithCommas(report.NoOfHotMeals)}</p>
            <p><strong>Liters of Water:</strong> ${formatWithCommas(report.LitersOfWater)}</p>
        `;
        reportPreviewModal.style.display = "flex";
    }

    closeReportModal.addEventListener("click", () => {
        reportPreviewModal.style.display = "none";
    });

    closeMetricModal.addEventListener("click", () => {
        metricBreakdownModal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
        if (event.target === reportPreviewModal) {
            reportPreviewModal.style.display = "none";
        }
        if (event.target === metricBreakdownModal) {
            metricBreakdownModal.style.display = "none";
        }
    });

    reportSearchInput.addEventListener("input", applyFiltersAndRenderTable);
    statusFilter.addEventListener("change", applyFiltersAndRenderTable);
    calamityTypeFilter.addEventListener("change", applyFiltersAndRenderTable);
    calamityNameFilter.addEventListener("change", applyFiltersAndRenderTable);

    auth.onAuthStateChanged(async (user) => {
        console.log("Auth state changed:", user ? { uid: user.uid, email: user.email } : 'No user');
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to view the reports overview.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }

        try {
            const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = userSnapshot.val();
            const passwordNeedsReset = userData ? (userData.password_needs_reset || false) : false;

            if (passwordNeedsReset) {
                console.log("Password change required for user. Redirecting to profile page.");
                Swal.fire({
                    icon: 'error',
                    title: 'Password Change Required',
                    text: 'Please change your password. Redirecting to profile.',
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
                    window.location.replace('../pages/profile.html');
                });
                return;
            }

            loadReports();
        } catch (error) {
            console.error("Error checking user data:", error);
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'Failed to verify account status. Please try logging in again.',
                showConfirmButton: true,
                confirmButtonText: 'OK',
                customClass: {
                    popup: 'swal2-popup-error-clean',
                    title: 'swal2-title-error-clean',
                    htmlContainer: 'swal2-text-error-clean',
                    confirmButton: 'my-error-button'
                }
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
        }
    });

    window.cleanupReportsOverview = () => {
        console.log("Cleaning up reports overview");
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        Object.keys(metricChartInstances).forEach(key => {
            if (metricChartInstances[key]) {
                metricChartInstances[key].destroy();
                metricChartInstances[key] = null;
            }
        });
        reportSearchInput.removeEventListener("input", applyFiltersAndRenderTable);
        statusFilter.removeEventListener("change", applyFiltersAndRenderTable);
        calamityTypeFilter.removeEventListener("change", applyFiltersAndRenderTable);
        calamityNameFilter.removeEventListener("change", applyFiltersAndRenderTable);
        closeReportModal.removeEventListener("click", () => {
            reportPreviewModal.style.display = "none";
        });
        closeMetricModal.removeEventListener("click", () => {
            metricBreakdownModal.style.display = "none";
        });
        window.removeEventListener("click", (event) => {
            if (event.target === reportPreviewModal) {
                reportPreviewModal.style.display = "none";
            }
            if (event.target === metricBreakdownModal) {
                metricBreakdownModal.style.display = "none";
            }
        });
    };

} catch (error) {
    console.error("Error in reportsOverview.js:", error);
    Swal.fire({
        icon: 'error',
        title: 'Script Error',
        text: 'Failed to execute reports overview script: ' + error.message,
    });
}s