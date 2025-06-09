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
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
    const database = firebase.database();
    const auth = firebase.auth();

    // DOM elements
    const formPage1 = document.getElementById('form-page-1');
    const formPage2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const addItemBtn = document.getElementById('addItemBtn');
    const itemsTable = document.getElementById('itemsTable');
    const itemsTableBody = itemsTable ? itemsTable.querySelector('tbody') : null;
    const previewContact = document.getElementById('previewContact');
    const previewItemsTable = document.getElementById('previewItemsTable');

    // Page-1 inputs
    const contactPersonInput = document.getElementById('contactPerson');
    const contactNumberInput = document.getElementById('contactNumber');
    const emailInput = document.getElementById('email');
    const addressInput = document.getElementById('address');
    const cityInput = document.getElementById('city');
    const donationCategoryInput = document.getElementById('category');

    // Item inputs
    const itemNameInput = document.getElementById('itemName');
    const quantityInput = document.getElementById('quantity');
    const notesInput = document.getElementById('notes');

    

    // Verify DOM elements exist
    if (!formPage1 || !formPage2 || !nextBtn || !backBtn || !addItemBtn || !itemsTable || !itemsTableBody || !previewContact || !previewItemsTable || !contactPersonInput || !contactNumberInput || !emailInput || !addressInput || !cityInput || !donationCategoryInput || !itemNameInput || !quantityInput || !notesInput) {
        console.error('One or more DOM elements are missing:', {
            formPage1: !!formPage1,
            formPage2: !!formPage2,
            nextBtn: !!nextBtn,
            backBtn: !!backBtn,
            addItemBtn: !!addItemBtn,
            itemsTable: !!itemsTable,
            itemsTableBody: !!itemsTableBody,
            previewContact: !!previewContact,
            previewItemsTable: !!previewItemsTable,
            contactPersonInput: !!contactPersonInput,
            contactNumberInput: !!contactNumberInput,
            emailInput: !!emailInput,
            addressInput: !!addressInput,
            cityInput: !!cityInput,
            donationCategoryInput: !!donationCategoryInput,
            itemNameInput: !!itemNameInput,
            quantityInput: !!quantityInput,
            notesInput: !!notesInput
        });
        return;
    }

    const addedItems = [];
    let userUid = null;
    let volunteerOrganization = "[Unknown Org]";

    // Check if user is logged in and fetch their UID and group name
    // auth.onAuthStateChanged(user => {
    //     if (user) {
    //         userUid = user.uid;
    //         console.log('Logged-in user UID:', userUid);

    //         // Fetch user data from the database
    //         database.ref(`users/${userUid}`).once('value', snapshot => {
    //             const userData = snapshot.val();
    //             if (userData && userData.organization) {
    //                 volunteerOrganization = userData.organization; 
    //                 console.log('Volunteer group fetched from database:', volunteerOrganization);

    //                 // Pre-fill form fields with user data
    //                 contactPersonInput.value = userData.contactPerson || '';
    //                 contactNumberInput.value = userData.mobile || '';
    //                 emailInput.value = userData.email || '';
    //             } else {
    //                 console.warn('User data or group not found in database for UID:', userUid);
    //             }
    //         }).catch(error => {
    //             console.error('Error fetching user data:', error);
    //         });
    //     } else {
    //         console.warn('No user is logged in');
    //         Swal.fire({
    //             icon: 'error',
    //             title: 'Not Logged In',
    //             text: 'Please log in to submit a relief request.',
    //         }).then(() => {
    //             window.location.href = '../pages/login.html'; // Redirect to login page
    //         });
    //     }
    // });

    auth.onAuthStateChanged(user => {
        if (user) {
            userUid = user.uid;
            console.log('Logged-in user UID:', userUid);

            // Fetch user data from the database
            database.ref(`users/${userUid}`).once('value', snapshot => {
                const userData = snapshot.val();
                if (!userData) {
                    console.warn('User data not found in database for UID:', userUid);
                    // Handle case where user node might not exist, e.g., newly registered
                    Swal.fire({
                        icon: 'error',
                        title: 'User Data Missing',
                        text: 'Your user profile is incomplete. Please contact an administrator.',
                    }).then(() => {
                        window.location.href = '../pages/login.html'; // Redirect to login page or profile setup
                    });
                    return;
                }

                // --- IMPORTANT: ADD THIS PASSWORD RESET CHECK ---
                const passwordNeedsReset = userData.password_needs_reset || false;
                const profilePage = 'profile.html'; // Assuming profile.html is in the same 'pages' directory

                if (passwordNeedsReset) {
                    console.log("Password change required. Redirecting to profile page.");
                    Swal.fire({
                        icon: 'info',
                        title: 'Password Change Required',
                        text: 'For security reasons, please change your password. You will be redirected to your profile.',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => {
                        window.location.replace(`../pages/${profilePage}`);
                    });
                    return; // Stop further execution if password reset is required
                }
                // --- END OF PASSWORD RESET CHECK ---

                if (userData.organization) {
                    volunteerOrganization = userData.organization; 
                    console.log('Volunteer group fetched from database:', volunteerOrganization);
                } else {
                    console.warn('Volunteer organization not found for UID:', userUid);
                }
                
                // Pre-fill form fields with user data
                contactPersonInput.value = userData.contactPerson || '';
                contactNumberInput.value = userData.mobile || '';
                emailInput.value = userData.email || '';

            }).catch(error => {
                console.error('Error fetching user data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to load user data. Please try again later.',
                });
            });
        } else {
            console.warn('No user is logged in');
            Swal.fire({
                icon: 'error',
                title: 'Not Logged In',
                text: 'Please log in to submit a relief request.',
            }).then(() => {
                window.location.href = '../pages/login.html'; // Redirect to login page
            });
        }
    });

    // Hide items table initially
    itemsTable.style.display = 'none';

    // Event listeners for real-time validation
    document.getElementById('contactPerson').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
    });

    document.getElementById('contactNumber').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9+\-\s()]/g, '');
    });

    document.getElementById('email').addEventListener('input', function(e) {
        this.value = this.value.replace(/\s/g, '');
    });

    document.getElementById('address').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^a-zA-Z0-9\s,.'-]/g, '');
    });

    document.getElementById('city').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^a-zA-Z\sñÑ]/g, ''); // Added ñ and Ñ
    });

    document.getElementById("category").addEventListener("change", function() {
        const selectedCategory = this.value;
        const itemName = document.getElementById("itemName");
        const quantity = document.getElementById("quantity");
        const notes = document.getElementById("notes");

        itemName.disabled = false;
        quantity.disabled = false;
        notes.disabled = false;

        const itemNameList = document.getElementById("itemNameList");
        while (itemNameList.firstChild) {
            itemNameList.removeChild(itemNameList.firstChild);
        }

        let items = [];
        if (selectedCategory === "Food") {
            items = ["Rice", "Canned Goods", "Water Bottles"];
        } else if (selectedCategory === "Clothing") {
            items = ["Blankets"];
        } else if (selectedCategory === "Medicine") {
            items = ["Medicine Kits"];
        } else if (selectedCategory === "Hygiene") {
            items = ["Hygiene Packs"];
        } else {
            items = ["Others"];
        }

        items.forEach(item => {
            const option = document.createElement("option");
            option.value = item;
            itemNameList.appendChild(option);
        });
    });

    //Converts Big Quantities to Readable Ones
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

    // Add Item button event listener
    addItemBtn.addEventListener('click', () => {
        console.log('Add Item button clicked');

        const name = itemNameInput.value.trim();
        const quantity = quantityInput.value.trim();
        const notes = notesInput.value.trim();

        console.log('Add Item inputs:', { name, quantity, notes });

        if (!name) {
            console.log('Validation failed: Item name is empty');
           Swal.fire({
            icon: 'warning',
            title: 'Missing Item Name',
            text: 'Please enter the item name.',
            timer: 2200,
            showConfirmButton: false,
            timerProgressBar: true,
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                content: 'swal2-text-warning-clean'
            }
            });
            return;
        }

        if (!quantity || parseInt(quantity) <= 0) {
            console.log('Validation failed: Invalid quantity', { quantity });
            Swal.fire({
            icon: 'warning',
            title: 'Invalid Quantity',
            text: 'Please enter a quantity greater than 0.',
            background: '#fefefe',                   // soft neutral background
            color: '#6c584c',                       // deep neutral text
            iconColor: '#d18f00',                   // warm amber icon
            confirmButtonColor: '#d18f00',          // matching amber confirm button
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                htmlContainer: 'swal2-text-warning-clean'
            }
        });

            return;
        }

        const itemIndex = addedItems.length;
        const formattedQuantity = formatLargeNumber(quantity);
        addedItems.push({ name, quantity, notes });
        console.log('Item added:', { name, quantity, notes, itemIndex });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td id="prevItmName">${name}</td>
            <td id="prevQty">${formattedQuantity}</td>
            <td id="prevNotes">${notes}</td>
            <td><button type="button" class="deleteBtn" id="deleteItmBtn" data-index="${itemIndex}">Delete</button></td>
        `;
        itemsTableBody.appendChild(tr);

        itemsTable.style.display = 'table';

        itemNameInput.value = '';
        quantityInput.value = '';
        notesInput.value = '';
    });

    // Delete button event listener
    itemsTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            console.log('Delete button clicked');
            const index = parseInt(e.target.getAttribute('data-index'));
            addedItems.splice(index, 1);
            renderItemsTable();
        }
    });

    function renderItemsTable() {
        console.log('Rendering items table');
        itemsTableBody.innerHTML = '';
        addedItems.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.notes}</td>
                <td><button type="button" class="delete-btn" data-index="${index}">Delete</button></td>
            `;
            itemsTableBody.appendChild(tr);
        });

        itemsTable.style.display = addedItems.length > 0 ? 'table' : 'none';
    }

    // Proceed button event listener
    nextBtn.addEventListener('click', () => {
        console.log('Proceed button clicked');

        const contactPerson = contactPersonInput.value.trim();
        const contactNumber = contactNumberInput.value.trim();
        const email = emailInput.value.trim();
        const address = addressInput.value.trim();
        const city = cityInput.value.trim();
        const donationCategory = donationCategoryInput.value;

        console.log('Proceed inputs:', {
            contactPerson,
            contactNumber,
            email,
            address,
            city,
            donationCategory,
            addedItemsLength: addedItems.length,
            volunteerOrganization
        });

        if (!contactPerson) {
            console.log('Validation failed: Contact person is empty');
            Swal.fire({
            icon: 'warning',
            title: 'Missing Contact Person',
            text: 'Please enter the contact person’s name.',
            background: '#fefefe',                   
            color: '#6c584c',                      
            iconColor: '#d18f00',                  
            confirmButtonColor: '#d18f00',         
            customClass: {
                popup: 'swal2-popup-warning-clean',
                title: 'swal2-title-warning-clean',
                htmlContainer: 'swal2-text-warning-clean'
            }
        });

            return;
        }

        if (!contactNumber || !/^\d{10,}$/.test(contactNumber)) {
            console.log('Validation failed: Invalid contact number', { contactNumber });
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Contact Number',
                text: 'Please enter a valid contact number (at least 10 digits).',
                 background: '#fefefe',                   
                color: '#6c584c',                      
                iconColor: '#d18f00',                  
                confirmButtonColor: '#d18f00',         
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean'
                }
            });
            return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            console.log('Validation failed: Invalid email', { email });
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Email',
                text: 'Please enter a valid email address.',
                 background: '#fefefe',                   
                color: '#6c584c',                      
                iconColor: '#d18f00',                  
                confirmButtonColor: '#d18f00',         
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean'
                }
            });
            return;
        }

        if (!address) {
            console.log('Validation failed: Address is empty');
            Swal.fire({
                icon: 'warning',
                title: 'Missing Address',
                text: 'Please enter the drop-off address.',
                background: '#fefefe',                   
                color: '#6c584c',                      
                iconColor: '#d18f00',                  
                confirmButtonColor: '#d18f00',         
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean'
                }
            });
            return;
        }

        if (!city) {
            console.log('Validation failed: City is empty');
            Swal.fire({
                icon: 'warning',
                title: 'Missing City',
                text: 'Please enter the city.',
                background: '#fefefe',                   
                color: '#6c584c',                      
                iconColor: '#d18f00',                  
                confirmButtonColor: '#d18f00',         
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean'
                }
            });
            return;
        }

        if (!donationCategory) {
            console.log('Validation failed: Donation category not selected');
            Swal.fire({
                icon: 'warning',
                title: 'Missing Category',
                text: 'Please select a donation category.',
                background: '#fefefe',                   
                color: '#6c584c',                      
                iconColor: '#d18f00',                  
                confirmButtonColor: '#d18f00',         
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean'
                }
            });
            return;
        }

        if (addedItems.length === 0) {
            console.log('Validation failed: No items added');
            Swal.fire({
                icon: 'warning',
                title: 'No Items Added',
                text: 'Please add at least one item before proceeding.',
                background: '#fefefe',                   
                color: '#6c584c',                      
                iconColor: '#d18f00',                  
                confirmButtonColor: '#d18f00',         
                customClass: {
                    popup: 'swal2-popup-warning-clean',
                    title: 'swal2-title-warning-clean',
                    htmlContainer: 'swal2-text-warning-clean'
                }
            });
            return;
        }

        formPage1.style.display = 'none';
        formPage2.style.display = 'block';
        console.log('Switched to form-page-2');

        previewContact.innerHTML = `
            <p><strong>Contact Person:</strong> ${contactPerson}</p>
            <p><strong>Contact Number:</strong> ${contactNumber}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Address:</strong> ${address}, ${city}</p>
            <p><strong>Donation Category:</strong> ${donationCategory}</p>
            <p><strong>Volunteer Organization:</strong> ${volunteerOrganization}</p>
        `;

        previewItemsTable.innerHTML = '';
        addedItems.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${item.name}</td><td>${item.quantity}</td><td>${item.notes}</td>`;
            previewItemsTable.appendChild(tr);
        });
    });

    // Back button event listener
    backBtn.addEventListener('click', () => {
        console.log('Back button clicked');
        formPage2.style.display = 'none';
        formPage1.style.display = 'block';
    });

    // Handle form submission to save data to Firebase
    formPage2.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Submit button clicked');

        if (!userUid) {
            console.error('No user UID available. Cannot submit request.');
            Swal.fire({
                icon: 'error',
                title: 'Authentication Error',
                text: 'User not authenticated. Please log in again.',
            }).then(() => {
                window.location.href = '../pages/login.html';
            });
            return;
        }

        const contactPerson = contactPersonInput.value.trim();
        const contactNumber = contactNumberInput.value.trim();
        const email = emailInput.value.trim();
        const address = addressInput.value.trim();
        const city = cityInput.value.trim();
        const donationCategory = donationCategoryInput.value;

        // Create a new request object
        const newRequest = {
            contactPerson,
            contactNumber,
            email,
            address,
            city,
            category: donationCategory,
            volunteerOrganization, // e.g., "RAZEL KIM ORG"
            userUid, // Include the UID
            items: addedItems,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Save to both requestRelief/requests and users/<uid>/requests
        const requestRef = database.ref('requestRelief/requests').push();
        const userRequestRef = database.ref(`users/${userUid}/requests/${requestRef.key}`);

        Promise.all([
            requestRef.set(newRequest),
            userRequestRef.set(newRequest)
        ])
            .then(() => {
                console.log('Data saved to Firebase successfully');
                Swal.fire({
                    icon: 'success',
                    title: 'Request Submitted',
                    text: 'Your relief request has been successfully submitted!',
                }).then(() => {
                    formPage1.reset();
                    formPage2.reset();
                    addedItems.length = 0;
                    renderItemsTable();
                    formPage2.style.display = 'none';
                    formPage1.style.display = 'block';
                });
            })
            .catch((error) => {
                console.error('Failed to save data to Firebase:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to submit request: ' + error.message,
                });
            });
    });
});