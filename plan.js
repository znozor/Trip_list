let currentStep = 0;
const totalSteps = 4;
let cityCount = 1;

function updateStepUI() {
  for (let i = 0; i < totalSteps; i++) {
    const dot = document.getElementById(`dot-${i}`);
    const line = document.getElementById(`line-${i}`);
    dot.classList.remove('active', 'done');
    if (i < currentStep) { dot.classList.add('done'); dot.innerHTML = '<i class="fa-solid fa-check"></i>'; }
    else if (i === currentStep) { dot.classList.add('active'); dot.textContent = i+1; }
    else dot.textContent = i+1;
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

function addCity() {
  cityCount++;
  const container = document.getElementById('cityFields');
  const newId = `citySelect${cityCount}`;
  const div = document.createElement('div');
  div.className = 'city-row';
  div.style.marginTop = '12px';
  div.innerHTML = `<label class="input-label">City</label><select id="${newId}" class="input-field city-select"><option>Tokyo</option><option>Osaka</option><option>Kyoto</option></select><span class="remove-city" onclick="this.parentElement.remove()" style="margin-left:8px; cursor:pointer;">✖</span>`;
  container.appendChild(div);
}

function toggleChip(el, multi) {
  if (multi) el.classList.toggle('selected');
  else { const group = el.closest('.chips-group'); if(group) { group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected')); el.classList.add('selected'); } }
}

function getSelectedChips(groupId) {
  return Array.from(document.querySelectorAll(`#${groupId} .chip.selected`)).map(c => c.dataset.val);
}

function updateWeatherPreview() {
  const country = document.getElementById('countrySelect').value;
  const city = document.getElementById('citySelect0').value;
  document.getElementById('weatherPreview').innerHTML = `<div>${city}, ${country}: 28°C / 22°C, humid 🌤️<br>Rainy season, pack umbrella.</div>`;
}

function generateList() {
  const trip = {
    country: document.getElementById('countrySelect').value,
    city: document.getElementById('citySelect0').value,
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value,
    reason: getSelectedChips('chips-reason')[0] || 'Leisure',
    style: getSelectedChips('chips-style')[0] || 'Standard',
    activities: getSelectedChips('chips-activities'),
    luggage: getSelectedChips('chips-luggage')[0] || 'Checked',
    simClose: document.getElementById('timeTravelToggle').checked
  };
  sessionStorage.setItem('pendingTrip', JSON.stringify(trip));
  window.location.href = 'list.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nextBtn').onclick = formNext;
  document.getElementById('prevBtn').onclick = formPrev;
  document.getElementById('multiCountryToggle').onchange = (e) => {
    document.getElementById('extraCountries').style.display = e.target.checked ? 'block' : 'none';
    document.getElementById('multiDates').style.display = e.target.checked ? 'block' : 'none';
  };
  const now = new Date(); now.setMonth(now.getMonth()+3);
  const end = new Date(now); end.setDate(end.getDate()+5);
  document.getElementById('startDate').valueAsDate = now;
  document.getElementById('endDate').valueAsDate = end;
  document.querySelectorAll('.chip').forEach(chip => {
    const isMulti = chip.closest('#chips-activities') !== null;
    chip.onclick = () => toggleChip(chip, isMulti);
  });
  updateWeatherPreview();
  updateStepUI();
});
