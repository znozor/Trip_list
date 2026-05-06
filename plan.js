// plan.js
let currentStep = 0;
const totalSteps = 4;
let cityCount = 1;

function updateStepUI() {
  for (let i = 0; i < totalSteps; i++) {
    const dot = document.getElementById(`dot-${i}`);
    dot.classList.remove('active', 'done');
    if (i < currentStep) { dot.classList.add('done'); dot.innerHTML = '<i class="fa-solid fa-check"></i>'; }
    else if (i === currentStep) { dot.classList.add('active'); dot.textContent = i+1; }
    else dot.textContent = i+1;
    const line = document.getElementById(`line-${i}`);
    if (line) line.classList.toggle('done', i < currentStep);
  }
  document.querySelectorAll('.form-step').forEach((s,i) => s.classList.toggle('active', i === currentStep));
  document.getElementById('prevBtn').style.display = currentStep > 0 ? 'inline-flex' : 'none';
  document.getElementById('nextBtn').innerHTML = currentStep < totalSteps-1 ? 'Next →' : '✨ Generate List';
}

function formNext() {
  if (currentStep < totalSteps-1) { currentStep++; updateStepUI(); }
  else generateList();
}
function formPrev() { if (currentStep > 0) { currentStep--; updateStepUI(); } }

function generateList() {
  const trip = {
    country: document.getElementById('countrySelect').value,
    city: document.getElementById('city-0').value,
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value,
    activities: Array.from(document.querySelectorAll('#chips-activities .chip.selected')).map(c => c.dataset.val),
    style: document.querySelector('#chips-style .chip.selected')?.dataset.val || 'Standard',
    reason: document.querySelector('#chips-reason .chip.selected')?.dataset.val || 'Leisure'
  };
  sessionStorage.setItem('pendingTrip', JSON.stringify(trip));
  window.location.href = 'list.html';
}

window.addCity = () => { cityCount++; const cf = document.getElementById('cityFields'); const row = document.createElement('div'); row.className = 'city-row'; row.innerHTML = `<input class="input-field" placeholder="City ${cityCount}" id="city-${cityCount-1}"/><span onclick="this.parentElement.remove()" class="remove-city">✖</span>`; cf.appendChild(row); };
function toggleChip(el, multi) { if (multi) el.classList.toggle('selected'); else { document.querySelectorAll(`.${el.parentElement.id} .chip`).forEach(c => c.classList.remove('selected')); el.classList.add('selected'); } }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nextBtn').onclick = formNext;
  document.getElementById('prevBtn').onclick = formPrev;
  document.getElementById('multiCountryToggle').onchange = e => document.getElementById('extraCountries').style.display = e.target.checked ? 'block' : 'none';
  const now = new Date(); now.setMonth(now.getMonth()+3);
  document.getElementById('startDate').valueAsDate = now;
  now.setDate(now.getDate()+5);
  document.getElementById('endDate').valueAsDate = now;
  updateStepUI();
  // Attach chip toggles
  document.querySelectorAll('.chip').forEach(c => c.onclick = function(e) { toggleChip(this, e.currentTarget.parentElement.id === 'chips-activities'); });
});
