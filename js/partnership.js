// partnership.js

document.addEventListener('DOMContentLoaded', () => {
    const page1 = document.getElementById('form-page-1');
    const page2 = document.getElementById('form-page-2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const form2 = document.getElementById('form-page-2');

    // Store input data
    let partnershipData = {};

    nextBtn.addEventListener('click', () => {
        // Get values from form-page-1
        const partnerName = document.getElementById('partnerName').value.trim();
        const partnerType = document.getElementById('partnerType').value.trim();
        const partnerAddress = document.getElementById('partnerAddress').value.trim();
        const contactPerson = document.getElementById('contactPerson').value.trim();
        const contactNumber = document.getElementById('contactNumber').value.trim();
        const email = document.getElementById('email').value.trim();
        const assistanceType = document.getElementById('assistanceType').value;
        const notes = document.getElementById('notes')?.value.trim() || '';
        const valuation = document.getElementById('valuation')?.value.trim() || '';
        const endorsedTo = document.getElementById('endorsedTo').value;
        const staffIncharge = document.getElementById('staffIncharge').value.trim();

        // Show Page 2, hide Page 1
        document.getElementById('form-page-1').style.display = 'none';
        document.getElementById('form-page-2').style.display = 'block';

        // Basic validation
        if (!partnerName || !partnerType || !partnerAddress || !contactPerson || !contactNumber || !email ||
            !assistanceType || !valuation || !endorsedTo || !staffIncharge) {
            Swal.fire({
                icon: 'warning',
                title: 'Incomplete',
                text: 'Please fill in all required fields.'
            });
            return;
        }

        // Store data
        partnershipData = {
            partnerName,
            partnerType,
            partnerAddress,
            contactPerson,
            contactNumber,
            email,
            assistanceType,
            notes,
            valuation,
            endorsedTo,
            staffIncharge
        };

        // Switch to preview page
        page1.style.display = 'none';
        page2.style.display = 'block';

        populatePreview(partnershipData);
    });

    backBtn.addEventListener('click', () => {
        page2.style.display = 'none';
        page1.style.display = 'block';
    });

    form2.addEventListener('submit', (e) => {
        e.preventDefault();

        // Simulated submission
        Swal.fire({
            icon: 'success',
            title: 'Submitted!',
            text: 'Partnership form successfully submitted.'
        }).then(() => {
            // Reset form (optional)
            document.getElementById('form-page-1').reset();
            form2.reset();
            page2.style.display = 'none';
            page1.style.display = 'block';
        });
    });

    function populatePreview(data) {
        const previewDiv = document.getElementById('previewContact');
        const previewTable = document.getElementById('previewItemsTable');

        previewDiv.innerHTML = `
            <p><strong>Name:</strong> ${data.partnerName}</p>
            <p><strong>Type:</strong> ${data.partnerType}</p>
            <p><strong>Location:</strong> ${data.partnerAddress}</p>
            <p><strong>Contact Person:</strong> ${data.contactPerson}</p>
            <p><strong>Contact Number:</strong> ${data.contactNumber}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Type of Assistance:</strong> ${data.assistanceType}</p>
            <p><strong>Notes:</strong> ${data.notes || 'None'}</p>
            <p><strong>Valuation:</strong> ${data.valuation}</p>
            <p><strong>Endorsed To:</strong> ${data.endorsedTo}</p>
            <p><strong>Staff In-Charge:</strong> ${data.staffIncharge}</p>
        `;

        previewTable.innerHTML = `
            <tr>
                <td>${data.assistanceType}</td>
                <td>${data.valuation}</td>
                <td>${data.notes || '—'}</td>
            </tr>
        `;
    }
});
