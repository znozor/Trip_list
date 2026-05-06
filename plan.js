// plan.js
let currentStep = 0;
const totalSteps = 4;
let cityCount = 1;

function updateStepUI() {
  for (let i = 0; i < totalSteps; i++) {
    const dot = document.getElementById(`dot-${i}`);
    const line = document.getElementById(`line-${i}`);
    dot.classList.remove('active', 'done');
    if (i < currentStep) {
      dot.classList.add('done');
      dot.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (i === currentStep) {
      dot.classList.add('active');
      dot.textContent = i + 1;
    } else {
      dot.textContent = i + 1;
    }
    if (line) line.classList.toggle('done', i < currentStep);
  }
  // Only show the current step
  document.querySelectorAll('.form-step').forEach((s, i) => {
    s.classList.toggle('active', i === currentStep);
  });
  const prevBtn = document.getElementById('prevBtn');
  prevBtn.style.display = currentStep > 0 ? 'inline-flex' : 'none';
  const nextBtn = document.getElementById('nextBtn');
  nextBtn.innerHTML = currentStep < totalSteps - 1 ? '<i class="fa-solid fa-arrow-right"></i> Next' : '<i class="fa-solid fa-magic-wand-sparkles"></i> Generate List';
}

function formNext() {
  if (currentStep < totalSteps - 1) {
    if (currentStep === 2) updateWeatherPreview();
    currentStep++;
    updateStepUI();
  } else {
    generateList();
  }
}

function formPrev() {
  if (currentStep > 0) {
    currentStep--;
    updateStepUI();
  }
}

function addCity() {
  cityCount++;
  const container = document.getElementById('cityFields');
  const row = document.createElement('div');
  row.className = 'city-row';
  row.style.marginTop = '12px';
  row.innerHTML = `
    <label class="input-label">City</label>
    <input type="text" class="input-field city-input" placeholder="City name" list="cityListGeneric">
    <datalist id="cityListGeneric"><option>Tokyo</option><option>Paris</option><option>London</option></datalist>
    <span class="remove-city" onclick="this.parentElement.remove()" style="margin-left:8px; cursor:pointer;">✖</span>
  `;
  container.appendChild(row);
}

function toggleChip(el, multi) {
  if (multi) {
    el.classList.toggle('selected');
  } else {
    const group = el.closest('.chips-group');
    if (group) {
      group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
    }
  }
}

function getSelectedChips(groupId) {
  return Array.from(document.querySelectorAll(`#${groupId} .chip.selected`)).map(c => c.dataset.val);
}

function updateWeatherPreview() {
  const country = document.getElementById('countryInput').value;
  const city = document.querySelector('.city-input')?.value || 'Tokyo';
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  // Mock weather data (replace with real API later)
  document.getElementById('weatherPreview').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div><div style="opacity:0.8;">${city}, ${country}</div><div style="font-size:28px; font-weight:bold;">28°C / 22°C</div><div>Warm, humid</div></div>
      <div style="font-size:48px;">🌤️</div>
    </div>
    <div class="note" style="margin-top:12px;">⚠️ Rainy season starts mid‑June. Pack umbrella.</div>
  `;
}

function generateList() {
  const country = document.getElementById('countryInput').value;
  const city = document.querySelector('.city-input')?.value || 'Tokyo';
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const reason = getSelectedChips('chips-reason')[0] || 'Leisure';
  const style = getSelectedChips('chips-style')[0] || 'Standard';
  const activities = getSelectedChips('chips-activities');
  const luggage = getSelectedChips('chips-luggage')[0] || 'Checked';
  const simClose = document.getElementById('timeTravelToggle').checked;
  const tripInfo = { country, city, startDate, endDate, reason, style, activities, luggage, simClose };
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
  const now = new Date();
  now.setMonth(now.getMonth() + 3);
  const end = new Date(now);
  end.setDate(end.getDate() + 5);
  document.getElementById('startDate').valueAsDate = now;
  document.getElementById('endDate').valueAsDate = end;
  // Chip event delegation
  document.querySelectorAll('.chip').forEach(chip => {
    const isMulti = chip.closest('#chips-activities') !== null;
    chip.onclick = () => toggleChip(chip, isMulti);
  });
  updateWeatherPreview();
  updateStepUI();
});
