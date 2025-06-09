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
const gcashDetailsBtn = document.getElementById('gcashDetails');
const bankDetailsBtn = document.getElementById('bankDetails');
const gcashDiv = document.getElementById('gcashDiv');
const bankDiv = document.getElementById('bankDiv');

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
    const monetaryNumberInput = document.getElementById('monetaryNumber');
    const inKindContactNumberInput = document.getElementById('inKindContactNumber');
    const amountDonatedInput = document.getElementById('amountDonated');
    const cashInvoiceInput = document.getElementById('cashInvoice');
    const bankSelect = document.getElementById('bank');


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

    // --- Number Input Validation (11 digits, starts with 09) ---
    const validatePhoneNumber = (inputElement) => {
        // Only allow digits and handle auto-09 prefix on initial type
        inputElement.addEventListener('input', () => {
            let value = inputElement.value.replace(/\D/g, ''); // Remove non-digits
            
            // Auto-prefix with 09 if the first digit is 9 (common for mobile numbers)
            if (value.length === 1 && value.charAt(0) === '9') {
                value = '0' + value;
            } else if (value.length > 0 && !value.startsWith('09')) {
                // If it doesn't start with 09, try to correct it, but don't force if user is typing something else
                // This is a more lenient auto-correction
                if (value.length >= 2 && value.substring(0, 2) !== '09') {
                    // If they type 639..., try to fix it to 09...
                    if (value.startsWith('63')) {
                        value = '0' + value.substring(2);
                    } else {
                        // For any other non-09 start, just keep it, validation on blur will catch it
                    }
                }
            }

            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            inputElement.value = value;
        });

        // The alert will only trigger on blur if the number is invalid
        inputElement.addEventListener('blur', () => {
            const value = inputElement.value;
            if (value.length !== 11 || !value.startsWith('09')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Number Format',
                    text: 'Please enter an 11-digit mobile number starting with 09 (e.g., 09171234567).'
                });
                // Optionally, clear the field or leave it for the user to correct
                // inputElement.value = ''; 
            }
        });
    };

    if (monetaryNumberInput) {
        validatePhoneNumber(monetaryNumberInput);
    }
    if (inKindContactNumberInput) {
        validatePhoneNumber(inKindContactNumberInput);
    }

    // --- Amount Donated Formatting ---
    if (amountDonatedInput) {
        amountDonatedInput.addEventListener('input', (event) => {
            let value = event.target.value.replace(/,/g, ''); // Remove existing commas

            // Check if the value is empty or not a valid number before formatting
            if (value === '' || isNaN(value)) {
                event.target.value = ''; // Clear if not a number
                return;
            }

            // Convert to a number, then format back to string with commas
            event.target.value = Number(value).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        });
    }

    // --- Cash Invoice Random Generation ---
    if (cashInvoiceInput) {
        const generateCashInvoice = () => {
            const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
            return `CINV-${randomNumber}`;
        };
        cashInvoiceInput.value = generateCashInvoice();
        // You might want to disable the input if it's auto-generated
        cashInvoiceInput.setAttribute('readonly', true);
    }

    if (inKindDonationForm) {
        inKindDonationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const inKindEncoder = document.getElementById('inKindEncoder').value;
            const inKindDonorName = document.getElementById('inKindDonorName').value;
            const inKindDonorType = document.getElementById('inKindDonorType').value;
            const inKindDonorAddress = document.getElementById('inKindDonorAddress').value;
            const inKindContactPerson = document.getElementById('inKindContactPerson').value;
            const inKindContactNumber = document.getElementById('inKindContactNumber').value; // Validated
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

            // Validate inKindContactNumber again for submission
            if (inKindContactNumber.length !== 11 || !inKindContactNumber.startsWith('09')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Contact Number',
                    text: 'Please ensure the In-Kind Contact Number is an 11-digit mobile number starting with 09.'
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

    if (gcashDiv) gcashDiv.style.display = 'none';
    if (bankDiv) bankDiv.style.display = 'none';

    if (gcashDetailsBtn && bankDetailsBtn && gcashDiv && bankDiv) {
        gcashDetailsBtn.addEventListener('click', () => {
            gcashDiv.style.display = 'block';
            bankDiv.style.display = 'none';
        });

        bankDetailsBtn.addEventListener('click', () => {
            bankDiv.style.display = 'block';
            gcashDiv.style.display = 'none';
        });
    }

    if (monetaryDonationForm) {
        console.log("Monetary Donation Form element found.");
        monetaryDonationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Monetary form submitted event triggered!");

            const monetaryEncoder = document.getElementById('monetaryEncoder').value;
            const monetaryDonorName = document.getElementById('monetaryDonorName').value;
            const monetaryLocation = document.getElementById('monetaryLocation').value;
            const monetaryNumber = document.getElementById('monetaryNumber').value; // Validated
            const amountDonated = document.getElementById('amountDonated').value.replace(/,/g, ''); // Remove commas for submission
            const cashInvoice = document.getElementById('cashInvoice').value; // Auto-generated
            const monetaryDonationDate = document.getElementById('monetaryDonationDate').value;
            const monetaryEmail = document.getElementById('monetaryEmail').value;
            const bank = document.getElementById('bank').value; // Dropdown value
            const proofofTransferFile = document.getElementById('proofofTransfer').value;


            console.log("Collected values:", {
                monetaryEncoder, monetaryDonorName, monetaryLocation, monetaryNumber,
                amountDonated, cashInvoice, monetaryDonationDate, monetaryEmail, bank,
                proofofTransferFile: proofofTransferFile ? proofofTransferFile.name : 'No file selected'
            });

            if (!monetaryDonorName || !amountDonated || !monetaryDonationDate) {
                console.warn("Validation failed: Required fields are empty.");
                Swal.fire({
                    icon: 'error',
                    title: 'Missing Information',
                    text: 'Please fill in all required fields for Monetary Donation (Name/Company, Amount Donated, and Date Received).'
                });
                return;
            }

            // Validate monetaryNumber again for submission
            if (monetaryNumber.length !== 11 || !monetaryNumber.startsWith('09')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Contact Number',
                    text: 'Please ensure the Monetary Contact Number is an 11-digit mobile number starting with 09.'
                });
                return;
            }

            const proofofTransferText = document.getElementById('proofofTransfer').value;

            let proofOfTransferUrl = proofofTransferText;

            const newMonetaryDonation = {
                userUid: currentUserUid,
                encoder: monetaryEncoder,
                name: monetaryDonorName,
                address: monetaryLocation,
                number: monetaryNumber,
                amountDonated: parseFloat(amountDonated) || 0,
                invoice: cashInvoice,
                dateReceived: monetaryDonationDate,
                email: monetaryEmail,
                bank: bank,
                proof: proofOfTransferUrl,
                createdAt: new Date().toISOString()
            };

            console.log("Data to be written to Firebase:", newMonetaryDonation);
            try {
                const newDonationRef = database.ref('pendingMonetary').push();
                await newDonationRef.set(newMonetaryDonation);

                console.log("Monetary donation successfully written to Realtime Database.");
                Swal.fire({
                    icon: 'success',
                    title: 'Donation Submitted!',
                    text: 'Your monetary donation has been successfully recorded. Thank you for your generosity!'
                });

                monetaryDonationForm.reset();
                if (gcashDiv) gcashDiv.style.display = 'none';
                if (bankDiv) bankDiv.style.display = 'none';
                // Regenerate cash invoice for the next potential donation
                if (cashInvoiceInput) {
                    const generateCashInvoice = () => {
                        const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
                        return `CINV-${randomNumber}`;
                    };
                    cashInvoiceInput.value = generateCashInvoice();
                }

            } catch (error) {
                console.error("Error submitting monetary donation to Firebase Realtime Database:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Submission Failed',
                    text: `There was an error submitting your donation. Please try again.<br>Error: ${error.message}`
                });
            }
        });
    } else {
        console.error("ERROR: Monetary Donation Form element with ID 'monetaryDonationForm' not found!");
    }
});

const donationButtons = document.querySelectorAll('.donation-buttons button');

donationButtons.forEach(button => {
    button.addEventListener('click', () => {
        donationButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});


const buttons = document.querySelectorAll('.gcash-btn, .banktrans-btn');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});
