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
    const auth = firebase.auth();
    const database = firebase.database();

    // Elements to display metrics
    const headerEl = document.querySelector('header'); // Header element to update dynamically
    const foodPacksEl = document.getElementById('food-packs');
    const hotMealsEl = document.getElementById('hot-meals');
    const waterLitersEl = document.getElementById('water-liters');
    const volunteersEl = document.getElementById('volunteers');
    const amountRaisedEl = document.getElementById('amount-raised');
    const inkeyindDonationsEl = document.getElementById('inkind-donations');

    // Check user authentication
    auth.onAuthStateChanged(user => {
        if (!user) {
            // Redirect to login if not authenticated
            Swal.fire({
                icon: 'error',
                title: 'Authentication Required',
                text: 'Please sign in to access the dashboard.',
            }).then(() => {
                window.location.href = "../pages/login.html";
            });
            return;
        }

        // Debug: Log the user's UID
        console.log(`Logged-in user UID: ${user.uid}`);

        // Fetch user role
        database.ref(`users/${user.uid}`).once('value', snapshot => {
            const userData = snapshot.val();
            if (!userData || !userData.role) {
                console.error(`User data not found for UID: ${user.uid}`);
                Swal.fire({
                    icon: 'error',
                    title: 'User Data Missing',
                    text: 'User role not found. Please contact an administrator.',
                }).then(() => {
                    window.location.href = "../pages/login.html";
                });
                return;
            }

            const role = userData.role;
            const userEmail = user.email; // Use email to match SubmittedBy

            // Debug: Log the role of the logged-in user
            console.log(`Role of logged-in user (UID: ${user.uid}): ${role}`);
            console.log(`User Email: ${userEmail}`);

            // Update the dashboard header based on role
            headerEl.textContent = role === "AB ADMIN" ? "Admin Dashboard" : "Volunteer Dashboard";

            // Fetch approved reports and aggregate data
            database.ref("reports/approved").on("value", snapshot => {
                let totalFoodPacks = 0;
                let totalHotMeals = 0;
                let totalWaterLiters = 0;
                let totalVolunteers = 0;
                let totalAmountRaised = 0;
                let totalInkindDonations = 0;

                const reports = snapshot.val();
                if (reports) {
                    Object.values(reports).forEach(report => {
                        // Debug: Log each report's SubmittedBy field
                        console.log(`Report SubmittedBy: ${report.SubmittedBy}, Report Data:`, report);

                        // For ABVN, only include reports submitted by this user (match email case-insensitively)
                        if (role === "ABVN") {
                            const reportSubmittedBy = report.SubmittedBy ? report.SubmittedBy.toLowerCase() : "";
                            const currentUserEmail = userEmail ? userEmail.toLowerCase() : "";
                            
                            if (reportSubmittedBy !== currentUserEmail) {
                                console.log(`Skipping report for ABVN - SubmittedBy (${report.SubmittedBy}) does not match user email (${userEmail})`);
                                return; // Skip reports not submitted by this ABVN user
                            }
                        }

                        // Aggregate data (convert strings to numbers, default to 0 if undefined)
                        totalFoodPacks += Number(report.NoOfFoodPacks) || 0;
                        totalHotMeals += Number(report.NoOfHotMeals) || 0;
                        totalWaterLiters += Number(report.LitersOfWater) || 0;
                        totalVolunteers += Number(report.NoOfVolunteersMobilized) || 0;
                        totalAmountRaised += Number(report.TotalAmountRaised) || 0;
                        totalInkindDonations += Number(report.TotalValueOfInKindDonations) || 0;
                    });
                } else {
                    console.log("No approved reports found in the database.");
                }

                // Update the DOM with aggregated data
                foodPacksEl.textContent = totalFoodPacks;
                hotMealsEl.textContent = totalHotMeals;
                waterLitersEl.textContent = totalWaterLiters;
                volunteersEl.textContent = totalVolunteers;
                amountRaisedEl.textContent = totalAmountRaised;
                inkeyindDonationsEl.textContent = totalInkindDonations;

                // Debug: Log the aggregated totals
                console.log(`Totals - Food Packs: ${totalFoodPacks}, Hot Meals: ${totalHotMeals}, Water Liters: ${totalWaterLiters}, Volunteers: ${totalVolunteers}, Amount Raised: ${totalAmountRaised}, In-Kind Donations: ${totalInkindDonations}`);
            }, error => {
                console.error("Error fetching approved reports:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load dashboard data. Please try again later.',
                });
            });
        }, error => {
            console.error("Error fetching user data:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load user data. Please try again later.',
            });
        });
    });
});