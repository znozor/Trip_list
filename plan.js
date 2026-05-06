// plan.js – handles multi-step form, weather preview, and passes data to list.html
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
  document.querySelectorAll('.form-step').forEach((s, i) => s.classList.toggle('active', i === currentStep));
  document.getElementById('prevBtn').style.display = currentStep > 0 ? 'inline-flex' : 'none';
  document.getElementById('nextBtn').innerHTML = currentStep < totalSteps-1 ? '<i class="fa-solid fa-arrow-right"></i> Next' : '<i class="fa-solid fa-magic-wand-sparkles"></i> Generate List';
}

function formNext() {
  if (currentStep < totalSteps-1) {
    if (currentStep === 2) updateWeatherPreview();
    currentStep++;
    updateStepUI();
  } else {
    generateList();
  }
}

function formPrev() { if (currentStep > 0) { currentStep--; updateStepUI(); } }

function addCity() { cityCount++; const cf = document.getElementById('cityFields'); const row = document.createElement('div'); row.className = 'city-row'; row.innerHTML = `<input class="input-field" placeholder="City ${cityCount}" id="city-${cityCount-1}"/><span class="remove-city" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></span>`; cf.appendChild(row); }

function toggleChip(el, multi = false) { if (multi) el.classList.toggle('selected'); else { const group = el.closest('.chips-group').id; document.querySelectorAll(`#${group} .chip`).forEach(c => c.classList.remove('selected')); el.classList.add('selected'); } }

function getSelectedChips(groupId) { return Array.from(document.querySelectorAll(`#${groupId} .chip.selected`)).map(c => c.dataset.val); }

function updateWeatherPreview() {
  const country = document.getElementById('countrySelect').value || 'Japan';
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const city = document.getElementById('city-0').value || 'Tokyo';
  // Mock climate data (replace with real API later)
  const climate = { high: 28, low: 22, desc: 'Warm, humid', note: 'Rainy season starts mid-June.' };
  document.getElementById('wpLocation').innerHTML = `${city}, ${country} • ${startDate ? startDate.slice(5) : 'Jun 10'} – ${endDate ? endDate.slice(5) : 'Jun 15'}`;
  document.getElementById('wpTemp').innerHTML = `${climate.high}°C / ${climate.low}°C`;
  document.getElementById('wpDesc').innerHTML = climate.desc;
  document.getElementById('wpNote').innerHTML = `⚠️ ${climate.note}`;
}

function generateList() {
  const country = document.getElementById('countrySelect').value || 'Japan';
  const city = document.getElementById('city-0').value || 'Tokyo';
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const activities = getSelectedChips('chips-activities');
  const style = getSelectedChips('chips-style')[0] || 'Standard';
  const who = getSelectedChips('chips-who')[0] || 'Solo';
  const simClose = document.getElementById('timeTravelToggle').checked;
  const tripInfo = { country, city, startDate, endDate, activities, style, who, simClose };
  sessionStorage.setItem('pendingTrip', JSON.stringify(tripInfo));
  window.location.href = 'list.html';
}

// Attach event listeners after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('nextBtn').addEventListener('click', formNext);
  document.getElementById('prevBtn').addEventListener('click', formPrev);
  document.getElementById('multiCountryToggle').addEventListener('change', (e) => {
    document.getElementById('extraCountries').style.display = e.target.checked ? 'block' : 'none';
    document.getElementById('multiDates').style.display = e.target.checked ? 'block' : 'none';
  });
  // Set default dates (3 months from now)
  const d = new Date(); d.setMonth(d.getMonth()+3);
  const d2 = new Date(d); d2.setDate(d2.getDate()+5);
  document.getElementById('startDate').value = d.toISOString().split('T')[0];
  document.getElementById('endDate').value = d2.toISOString().split('T')[0];
  updateStepUI();
  updateWeatherPreview();
});
