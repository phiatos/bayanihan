// Firebase configuration
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
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const database = firebase.database();
  
  // OTP verification variables
  let confirmationResult;
  
  // Initialize reCAPTCHA verifier
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      'size': 'invisible',
      'callback': () => {
          // Will be called after reCAPTCHA verification
      }
  }, auth);
  
  document.addEventListener("DOMContentLoaded", () => {
      // Function to update UI with "N/A" if data fetch fails
      const setFieldsToNA = () => {
          console.log("Setting profile fields to N/A due to data fetch failure.");
          document.getElementById('profile-org-name').textContent = 'N/A';
          document.getElementById('profile-hq').textContent = 'N/A';
          document.getElementById('profile-contact-person').textContent = 'N/A';
          document.getElementById('profile-email').textContent = 'N/A';
          document.getElementById('profile-mobile').textContent = 'N/A';
          document.getElementById('profile-area').textContent = 'N/A';
          document.getElementById('otp-info').textContent = 'Mobile number not available for OTP verification.';
      };
  
      // Function to fetch user data
      const fetchUserData = (user) => {
          const userMobile = localStorage.getItem("userMobile");
          console.log("Fetching data for userMobile:", userMobile);
  
          if (!userMobile) {
              console.error("No userMobile found in localStorage.");
              Swal.fire({
                  icon: 'error',
                  title: 'Not Logged In',
                  text: 'No user mobile found. Please log in again.'
              }).then(() => {
                  window.location.href = '/Bayanihan-PWA/login.html';
              });
              return;
          }
  
          // First, fetch user data to get the volunteerGroupId
          console.log("Querying users node for mobile:", userMobile);
          database.ref('users').orderByChild('mobile').equalTo(userMobile).once('value')
              .then(snapshot => {
                  console.log("Users snapshot:", snapshot.val());
                  if (!snapshot.exists()) {
                      console.error("No user found with mobile:", userMobile);
                      Swal.fire({
                          icon: 'error',
                          title: 'User Not Found',
                          text: 'User data not found in the database. Please contact support.'
                      });
                      setFieldsToNA();
                      return;
                  }
  
                  let userData = null;
                  let userId = null;
                  snapshot.forEach(childSnapshot => {
                      userId = childSnapshot.key;
                      userData = childSnapshot.val();
                  });
  
                  console.log("User data retrieved:", userData);
  
                  if (!userData.volunteerGroupId) {
                      console.error("No volunteerGroupId found for user:", userId);
                      Swal.fire({
                          icon: 'error',
                          title: 'Volunteer Group Not Found',
                          text: 'Volunteer group association not found. Please contact support.'
                      });
                      setFieldsToNA();
                      return;
                  }
  
                  // Fetch volunteer group data
                  console.log("Querying volunteerGroups node for ID:", userData.volunteerGroupId);
                  database.ref(`volunteerGroups/${userData.volunteerGroupId}`).once('value')
                      .then(groupSnapshot => {
                          const groupData = groupSnapshot.val();
                          console.log("Volunteer group snapshot:", groupData);
                          if (!groupData) {
                              console.error("No group data found for volunteerGroupId:", userData.volunteerGroupId);
                              Swal.fire({
                                  icon: 'error',
                                  title: 'Group Data Not Found',
                                  text: 'Volunteer group data not found. Please contact support.'
                              });
                              setFieldsToNA();
                              return;
                          }
  
                          console.log("Volunteer group data retrieved:", groupData);
  
                          // Display data
                          document.getElementById('profile-org-name').textContent = groupData.organization || 'N/A';
                          document.getElementById('profile-hq').textContent = groupData.hq || 'N/A';
                          document.getElementById('profile-contact-person').textContent = groupData.contactPerson || 'N/A';
                          document.getElementById('profile-email').textContent = groupData.email || 'N/A';
                          document.getElementById('profile-mobile').textContent = groupData.mobileNumber || userMobile || 'N/A';
                          document.getElementById('profile-area').textContent = groupData.areaOfOperation || 'N/A';
  
                          // Update OTP info and send OTP if mobile number exists
                          const mobileForOTP = groupData.mobileNumber || userMobile;
                          if (mobileForOTP) {
                              document.getElementById('otp-info').textContent = `Sending OTP to ${mobileForOTP}`;
                              sendOTP(mobileForOTP);
                          } else {
                              console.warn("No mobile number available for OTP.");
                              document.getElementById('otp-info').textContent = 'Mobile number not available for OTP verification.';
                          }
  
                          // Store group data in localStorage for use in volunteergroupmanagement.html
                          localStorage.setItem('loggedInVolunteerGroup', JSON.stringify({
                              no: userData.volunteerGroupId,
                              organization: groupData.organization,
                              hq: groupData.hq,
                              areaOfOperation: groupData.areaOfOperation,
                              contactPerson: groupData.contactPerson,
                              email: groupData.email,
                              mobileNumber: groupData.mobileNumber || userMobile,
                              socialMedia: groupData.socialMedia || ''
                          }));
                      })
                      .catch(error => {
                          console.error('Error fetching volunteer group data:', error);
                          Swal.fire({
                              icon: 'error',
                              title: 'Error',
                              text: 'Failed to fetch volunteer group data: ' + error.message
                          });
                          setFieldsToNA();
                      });
              })
              .catch(error => {
                  console.error('Error fetching user data:', error);
                  Swal.fire({
                      icon: 'error',
                      title: 'Error',
                      text: 'Failed to fetch user data: ' + error.message
                  });
                  setFieldsToNA();
              });
      };
  
      // Check authentication state
      auth.onAuthStateChanged(user => {
          if (user) {
              console.log("User is authenticated:", user.uid);
              fetchUserData(user);
          } else {
              console.error("No user is authenticated.");
              Swal.fire({
                  icon: 'error',
                  title: 'Not Logged In',
                  text: 'Please log in to view your profile.'
              }).then(() => {
                  window.location.href = '/Bayanihan-PWA/login.html';
              });
          }
      });
  
      // Password change handling
      const form = document.querySelector("form");
      form.addEventListener('submit', async (e) => {
          e.preventDefault();
  
          const userMobile = localStorage.getItem("userMobile");
          if (!userMobile) {
              console.error("No userMobile found for password change.");
              Swal.fire({
                  icon: 'error',
                  title: 'Not Logged In',
                  text: 'Please log in to change your password.'
              }).then(() => {
                  window.location.href = '/Bayanihan-PWA/login.html';
              });
              return;
          }
  
          const currentPassword = document.getElementById('current-password').value;
          const newPassword = document.getElementById('new-password').value;
          const confirmNewPassword = document.getElementById('confirm-new-password').value;
  
          if (newPassword !== confirmNewPassword) {
              Swal.fire({
                  icon: 'error',
                  title: 'Password Mismatch',
                  text: 'New password and confirmation do not match.'
              });
              return;
          }
  
          if (newPassword.length < 6) {
              Swal.fire({
                  icon: 'error',
                  title: 'Weak Password',
                  text: 'New password must be at least 6 characters long.'
              });
              return;
          }
  
          try {
              const user = auth.currentUser;
              if (!user) {
                  throw new Error('No user is currently signed in.');
              }
  
              const credential = firebase.auth.EmailAuthProvider.credential(`${userMobile}@bayanihan.com`, currentPassword);
              await user.reauthenticateWithCredential(credential);
              await user.updatePassword(newPassword);
              Swal.fire({
                  icon: 'success',
                  title: 'Password Changed',
                  text: 'Your password has been updated successfully.'
              });
              form.reset();
          } catch (error) {
              console.error('Password change error:', error);
              Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: error.message || 'Failed to change password.'
              });
          }
      });
  
      // OTP verification
      const submitBtnOTP = document.querySelector(".verify-otp");
      const otpInput = document.getElementById('otp-code');
      const termsCheckbox = document.getElementById('terms');
      const dataConsentCheckbox = document.getElementById('data-consent');
  
      if (submitBtnOTP) {
          submitBtnOTP.addEventListener('click', (event) => {
              event.preventDefault();
  
              if (!termsCheckbox.checked || !dataConsentCheckbox.checked) {
                  Swal.fire({
                      icon: 'warning',
                      title: 'Consent Required',
                      text: 'Please agree to the terms and privacy policy and consent to data collection.'
                  });
                  return;
              }
  
              const otpCode = otpInput.value;
              if (otpCode.length === 6) {
                  verifyOTP(otpCode);
              } else {
                  Swal.fire({
                      icon: 'error',
                      title: 'Invalid OTP',
                      text: 'Please enter the 6-digit OTP code.'
                  });
              }
          });
      }
  });
  
  // Function to send OTP
  function sendOTP(mobileNumber) {
      const phoneNumber = `+63${mobileNumber}`;
      console.log("Sending OTP to:", phoneNumber);
      firebase.auth().signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier)
          .then(result => {
              confirmationResult = result;
              console.log("OTP sent successfully.");
          })
          .catch(error => {
              console.error("OTP send error:", error);
              Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'Failed to send OTP: ' + error.message
              });
          });
  }
  
  // Function to verify OTP
  function verifyOTP(code) {
      if (!confirmationResult) {
          console.error("No confirmationResult available for OTP verification.");
          Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'OTP verification not initiated. Please try again.'
          });
          return;
      }
  
      console.log("Verifying OTP:", code);
      confirmationResult.confirm(code)
          .then(result => {
              Swal.fire({
                  icon: 'success',
                  title: 'OTP Verified!',
                  text: 'Your mobile number has been verified.'
              }).then(() => {
                  window.location.href = '../pages/dashboard.html';
              });
          })
          .catch(error => {
              console.error('OTP verification error:', error);
              Swal.fire({
                  icon: 'error',
                  title: 'Invalid OTP',
                  text: 'The OTP you entered is incorrect: ' + error.message
              });
          });
  }