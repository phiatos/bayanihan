// script.js

document.addEventListener('DOMContentLoaded', () => {
    // Step IDs in order
    const steps = ['step1','step2','step3','step4'];
    let current = 0;
  
    // Elements
    const toStep2Btn      = document.getElementById('to-step2');
    const verifyOtpBtn    = document.getElementById('verify-otp');
    const resendOtp       = document.getElementById('resend-otp');
    const updatePwdBtn    = document.getElementById('update-password');
    const backToLogin     = document.getElementById('back-to-login');
    const timerDisplay    = document.getElementById('timer');
    const mobileInput     = document.getElementById('mobile');
    const displayMobileEl = document.getElementById('display-mobile'); // ← NEW
    const otpInputs       = document.querySelectorAll('#step2 .otp');
    const newPwdInput     = document.getElementById('new-password');
    const confirmPwdIn    = document.getElementById('confirm-password');
  
    // Show only one step
    function showStep(idx) {
      steps.forEach((id,i) => {
        document.getElementById(id).classList.toggle('hidden', i !== idx);
      });
    }
    showStep(current);
  
    // Timer state
    let timerInterval, timerActive = false;
  
    // OTP timer
    function startTimer(sec) {
      clearInterval(timerInterval);
      timerActive = true;
      resendOtp.classList.add('disabled');
  
      let t = sec;
      function tick() {
        const m = String(Math.floor(t/60)).padStart(2,'0');
        const s = String(t%60).padStart(2,'0');
        timerDisplay.textContent = `${m}:${s}`;
        if (t-- < 0) {
          clearInterval(timerInterval);
          timerDisplay.textContent = 'Expired';
          timerActive = false;
          resendOtp.classList.remove('disabled');
          otpInputs.forEach(i=> i.disabled = true);
          verifyOtpBtn.disabled = true;
        }
      }
      tick();
      timerInterval = setInterval(tick, 1000);
    }
  
    // Initialize OTP inputs
    function resetOtpInputs() {
      otpInputs.forEach((inp,i) => {
        inp.value = '';
        inp.disabled = i !== 0;
      });
      otpInputs[0].focus();
      verifyOtpBtn.disabled = true;
      verifyOtpBtn.classList.remove('active');
    }
  
    // Step 1 → Step 2
    toStep2Btn.addEventListener('click', () => {
      const mob = mobileInput.value.trim();
      if (!/^09\d{9}$/.test(mob)) {
        alert('Enter a valid 11-digit Philippine mobile number.');
        return;
      }
  
      // ← DISPLAY IT HERE
      displayMobileEl.textContent = mob;
  
      current = 1;
      resetOtpInputs();
      startTimer(180);
      showStep(current);
    });
  
    // Resend OTP (only after timer expires)
    resendOtp.addEventListener('click', e => {
      e.preventDefault();
      if (timerActive) return;
      resetOtpInputs();
      startTimer(180);
      // TODO: actually resend OTP via API
    });
  
    // OTP input logic...
    otpInputs.forEach((inp, idx) => {
      inp.addEventListener('keyup', e => {
        const val = inp.value, next = otpInputs[idx+1], prev = otpInputs[idx-1];
        if (val.length > 1) inp.value = val.charAt(0);
        if (val && next) {
          next.disabled = false;
          next.focus();
        }
        if (e.key === 'Backspace' && prev) {
          inp.value = '';
          inp.disabled = true;
          prev.focus();
        }
        const allFilled = [...otpInputs].every(i=> i.value.trim() !== '');
        verifyOtpBtn.disabled = !allFilled;
        verifyOtpBtn.classList.toggle('active', allFilled);
      });
    });
  
    // Verify OTP → Step 3
    verifyOtpBtn.addEventListener('click', () => {
      if (verifyOtpBtn.disabled) return;
      current = 2;
      showStep(current);
    });
  
    // Update Password → Step 4
    updatePwdBtn.addEventListener('click', () => {
      const np = newPwdInput.value, cp = confirmPwdIn.value;
      if (!np || np !== cp) {
        alert('Passwords must match and not be empty.');
        return;
      }
      current = 3;
      showStep(current);
    });
  
    // Back to login
    backToLogin.addEventListener('click', () => {
      window.location.href = '/login';
    });
  });
  