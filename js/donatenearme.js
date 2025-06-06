const firebaseConfig = {
    apiKey: "AIzaSyDJxMv8GCaMvQT2QBW3CdzA3dV5X_T2KqQ",
    authDomain: "bayanihan-5ce7e.firebaseapp.com",
    databaseURL: "https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bayanihan-5ce7e",
    storageBucket: "bayanihan-5ce7e.appspot.com",
    messagingSenderId: "593123849917",
    appId: "1:593123849917:web:eb85a63a536eeff78ce9d4",
    measurementId: "G-ZTQ9VXXVV0"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app();
}

const database = firebase.database();
const storage = firebase.storage(); 

let currentUserUid = null;
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUserUid = user.uid;
        console.log("Authenticated user UID:", currentUserUid);
    } else {
        currentUserUid = null;
        console.log("No user is currently authenticated.");
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const inKindBtn = document.getElementById('inKindBtn');
    const monetaryBtn = document.getElementById('monetaryBtn');
    const inKindDonationForm = document.getElementById('inKindDonationForm');
    const monetaryDonationForm = document.getElementById('monetaryDonationForm');

    if (inKindBtn && monetaryBtn && inKindDonationForm && monetaryDonationForm) {
        inKindBtn.addEventListener('click', () => {
            console.log("In Kind button clicked. Showing In Kind form.");
            inKindDonationForm.style.display = 'block';
            monetaryDonationForm.style.display = 'none';
        });

        monetaryBtn.addEventListener('click', () => {
            console.log("Monetary button clicked. Showing Monetary form.");
            monetaryDonationForm.style.display = 'block';
            inKindDonationForm.style.display = 'none';
        });
    } else {
        console.error("One or more required elements (buttons or forms) not found in the DOM. Check your HTML IDs.");
    }

    if (inKindDonationForm) {
        inKindDonationForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 
            const inKindEncoder = document.getElementById('inKindEncoder').value;
            const inKindDonorName = document.getElementById('inKindDonorName').value;
            const inKindDonorType = document.getElementById('inKindDonorType').value;
            const inKindDonorAddress = document.getElementById('inKindDonorAddress').value;
            const inKindContactPerson = document.getElementById('inKindContactPerson').value;
            const inKindContactNumber = document.getElementById('inKindContactNumber').value;
            const inKindDonorEmail = document.getElementById('inKindDonorEmail').value;
            const itemType = document.getElementById('itemType').value;
            const value = document.getElementById('value').value;
            const description = document.getElementById('description').value;
            const status = document.getElementById('status').value;
            const staffIncharge = document.getElementById('staffIncharge').value;
            const donationDate = document.getElementById('donationDate').value;

            if (!inKindDonorName || !itemType || !value || !donationDate) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Please fill in all required fields for In Kind Donation (Donor Name, Type of Assistance, Valuation, and Donation Date).'
                });
                return;
            }
            const newDonationRef = database.ref('pendingInkind').push();
            const newDonationId = newDonationRef.key; 
 
            const newInKindDonation = {
                id: newDonationId, 
                userUid: currentUserUid, 
                encoder: inKindEncoder,
                name: inKindDonorName, 
                type: inKindDonorType, 
                address: inKindDonorAddress, 
                contactPerson: inKindContactPerson,
                number: inKindContactNumber, 
                email: inKindDonorEmail, 
                assistance: itemType, 
                valuation: parseFloat(value) || 0, 
                additionalnotes: description, 
                status: status || 'pending', 
                staffIncharge: staffIncharge, 
                donationDate: donationDate,
                createdAt: new Date().toISOString() 
            };

            try {
                await newDonationRef.set(newInKindDonation); 
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'In Kind Donation submitted successfully.'
                });
                inKindDonationForm.reset(); 
            } catch (error) {
                console.error("Error submitting in-kind donation to Firebase:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: `Failed to submit In Kind Donation. Please try again.<br>Error: ${error.message}`
                });
            }
        });
    }
});