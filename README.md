# Disaster Relief and Rehabilitation Management Portal
HTML, CSS, and JavaScript 

-----

planned system flow: https://docs.google.com/document/d/15CWf6rDFmi5rI86DARh8CFWT9hMMcmGE4y5EN9dF6f0/edit?usp=sharing

## How to Run the Project Locally
1. Clone or download this repository.
2. You can run the project from the 'main' branch
3. Open `index.html` directly in a browser, or use a live server extension (like in VS Code).

📌 Current Progress Overview
✅ Frontend Pages with Initial Functions:
• Login & Forgot Password (basic validation, toggle password)
• Profile Pages (Admin & ABVN – partial implementation)
• Admin Dashboard (Reports only; Mapping for visualization only)
• Volunteer Group Management (basic form and logic)
• Relief Log (Admin side)
• Reports Submission (ABVN) and Verification (Admin)

⚠️ Still in Progress:
• Organizing CSS and JavaScript functions
• Service Worker (not updated)
• Full access control for ABVN accounts
• Validations and error handling
• Mobile verification & change password
• Mapping & notification integration
• ABVN Organization name connection in other pages

<!-- // ================================================== // -->
Test Walkthrough (For Review)
Admin Account
Mobile Number: 09166605231
Password: abcdefg
✅ Full page access
✅ Can create ABVN accounts in VGM
✅ Can activate/deactivate ABVN accounts (list of accounts from VGM is connected)
⚠️ Activation status not yet linked to dashboard view

ABVN Account
Mobile Number: 09499894578
Password: 3xgbgylvU(
⚠️ Limited access setup (not fully working)
You can register a new ABVN in VGM or use this account

<!-- // ================================================== // -->
Key Module Status:
1. Login & Access
• Forgot Password page is connected, but OTP verification is (not yet implemented)
• Users can toggle password visibility.
• Only basic form validations are currently implemented.
+ Validations, error handling, and access control is still on-going.

2. Dashboards
• Admin Dashboard: 
    - only the Reports section is functionally connected.
    - The mapping feature is not yet integrated (for visualization lang po muna yan)
    - Notifications and the list of activated ABVN per calamity are (not yet implemented) 
    - Search functionality is not working yet.
• ABVN Dashboard: Not yet implemented

3. Profile
 - Admin: Static profile (not editable yet)
 - ABVN: basic info is link to VGM infos registered by admin.
    - Change password (not yet implemented)
    - Mobile verification (not yet implemented)

4. Volunteer Group Management (VGM) - All information about the volunteer groups will be displayed here. According to Sir Macoy, they want to handle the registration of new volunteer groups, while the existing ones will already be registered by the admins.
- The admin will fill out a form with the Volunteer Group’s details (aayusin pa po namin ito)
Once submitted, the system will:
    - Automatically create an account for the ABVN.
    - Send a randomized temporary password to the ABVN’s email.
    - Will link the area of operation to the mapping feature for location-based monitoring. (not yet implemented)

5. Activation Page:
- VGM and Activation lists are connected
- can activate or deactivate a volunteer group.
- if activated:
    - The volunteer group will appear on the dashboard, indicating which groups are assigned to which calamity. (not yet implemented)
    - A notification will be sent via the dashboard to the activated volunteer group, informing them that features such as Relief Request and Report Submission are now accessible. (not yet implemented)


ABVN Side: 
1. Request Relief - they can submit relief requests, which will be visible to the admin side for an overview.
2. Reports Submission Page:
- ABVN users can submit their reports through this page. 
- They can preview their report in the Reports Preview Page before final submission.
- Once submitted, the report will be sent to the Reports Verification Page on the admin side.

Admin Side:
1. Reliefs Log:
- Displays a tabular overview of all relief requests submitted by ABVN groups.
2. Reports Verification Page:
- Admins will review and verify submitted reports.
- Once verified, the reports will be forwarded to the Reports Log.
2. Reports Log: 
- Displays a tabular summary of approved reports.
- Data/Figures from approved reports will automatically update the dashboard, including the general summary dashboard and individual ABVN dashboards.
- pin location for area of operation is (not yet implemented)

<!-- // ================================================== // -->
📝 Notes
- Validations and overall UI improvements are still in progress.
- Role-based access control is currently being implemented.
- Data binding between components and tables is still ongoing.
- CSS and JS cleanup in progress — sorry po
- Notifications and SMS/Email integrations are not yet active in this version.
- Please let us know about your Firebase Blaze database setup po once the development pipeline is up and running, so we can proceed with mapping integrations accordingly po

Questions:
1. Are we allowed to use the SweetAlert2 JS library for beautiful alert popups?
2. Are we allowed to use Boxicons for icons in the project?
3. What are the restrictions, if any, in using libraries in the project while maintaining a "vanilla" approach for the core functionality?