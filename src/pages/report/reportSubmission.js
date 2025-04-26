// Get the elements
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const formPage1 = document.getElementById('form-page-1');
const formPage2 = document.getElementById('form-page-2');

// Go to next form
nextBtn.addEventListener('click', function() {
  formPage1.style.display = 'none';
  formPage2.style.display = 'block';
});

// Go back to first form
backBtn.addEventListener('click', function() {
  formPage2.style.display = 'none';
  formPage1.style.display = 'block';
});
