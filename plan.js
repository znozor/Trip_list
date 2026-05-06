// city data for each country
const cityMap = {
  Japan: ['Tokyo','Osaka','Kyoto','Yokohama','Fukuoka'],
  France: ['Paris','Lyon','Marseille','Toulouse','Nice'],
  Italy: ['Rome','Milan','Venice','Florence','Naples'],
  Thailand: ['Bangkok','Phuket','Chiang Mai','Krabi','Pattaya'],
  USA: ['New York','Los Angeles','Chicago','Miami','Seattle'],
  default: ['Select city']
};
let currentStep = 0;
const totalSteps = 4;
let cityCounter = 1;

function updateCityDatalist(countryValue, datalistId) {
  const cities = cityMap[countryValue] || cityMap.default;
  const datalist = document.getElementById(datalistId);
  if (datalist) {
    datalist.innerHTML = cities.map(c => `<option>${c}</option>`).join('');
  }
}

function initSearchableCities() {
  const countryInput = document.getElementById('countryInput');
  const cityInput = document.getElementById('cityInput0');
  const update = () => {
    const country = countryInput.value;
    updateCityDatalist(country, 'cityList0');
    cityInput.value = ''; // clear previous city
  };
  countryInput.addEventListener('input', update);
  if (countryInput.value) update();
}
window.addCityField = function() {
  const container = document.getElementById('cityFields');
  const newId = `cityInput${++cityCounter}`;
  const newListId = `cityList${cityCounter}`;
  const div = document.createElement('div');
  div.className = 'city-row';
  div.style.marginTop = '12px';
  div.innerHTML = `
    <label class="input-label">City</label>
    <input type="text" id="${newId}" list="${newListId}" class="input-field" placeholder="Type or select city">
    <datalist id="${newListId}"></datalist>
    <span class="remove-city" onclick="this.parentElement.remove()" style="cursor:pointer;">✖</span>
  `;
  container.appendChild(div);
  // bind to current country
  const currentCountry = document.getElementById('countryInput').value;
  updateCityDatalist(currentCountry, newListId);
};

function toggleChip(el, multi) {
  if (multi) el.classList.toggle('selected');
  else {
    const parent = el.closest('.chips-group');
    parent.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }
}

function getSelectedChips(groupId) {
  return Array.from(document.querySelectorAll(`#${groupId} .chip.selected`)).map(c => c.dataset.val);
}

function updateStepUI() {
  for (let i = 0; i < totalSteps; i++) {
    const dot = document.getElementById(`dot-${i}`);
    const line = document.getElementById(`line-${i}`);
    dot.classList.remove('active','done');
    if (i < currentStep) {
      dot.classList.add('done');
      dot.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (i === currentStep) {
      dot.classList.add('active');
      dot.textContent = i+1;
    } else dot.textContent = i+1;
    if (line) line.classList.toggle('done', i < currentStep);
  }
  document.querySelectorAll('.form-step').forEach((s,i) => s.classList.toggle('active', i===currentStep));
  document.getElementById('prevBtn').style.display = currentStep>0 ? 'inline-flex' : 'none';
  const nextBtn = document.getElementById('nextBtn');
  nextBtn.innerHTML = currentStep<totalSteps-1 ? 'Next →' : '✨ Generate List';
}

async function formNext() {
  if (currentStep < totalSteps-1) {
    currentStep++;
    updateStepUI();
    if (currentStep === 2) await updateWeatherPreview();
  } else {
    await generateList();
  }
}
function formPrev() { if (currentStep>0) { currentStep--; updateStepUI(); } }

async function updateWeatherPreview() {
  const country = document.getElementById('countryInput').value;
  const city = document.getElementById('cityInput0')?.value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const simClose = document.getElementById('timeTravelToggle').checked;
  if (!country || !city || !startDate) {
    document.getElementById('weatherPreview').innerHTML = 'Please fill country, city and start date.';
    return;
  }
  try {
    const { getWeatherForTrip } = await import('./weather.js');
    const weather = await getWeatherForTrip(country, city, startDate, endDate, simClose);
    document.getElementById('weatherPreview').innerHTML = `
      <div style="display:flex; justify-content:space-between;">
        <div><div>${city}, ${country}</div><div style="font-size:24px; font-weight:bold;">${weather.temp}°C</div><div>${weather.condition}</div></div>
        <div style="font-size:48px;">${weather.icon}</div>
      </div>
      <div style="margin-top:12px;">${weather.note}</div>
    `;
  } catch(e) {
    document.getElementById('weatherPreview').innerHTML = 'Weather info unavailable.';
  }
}

async function generateList() {
  const country = document.getElementById('countryInput').value;
  const city = document.getElementById('cityInput0')?.value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const reason = getSelectedChips('chips-reason')[0] || 'Leisure';
  const style = getSelectedChips('chips-style')[0] || 'Standard';
  const activities = getSelectedChips('chips-activities');
  const luggage = getSelectedChips('chips-luggage')[0] || 'Checked';
  const simClose = document.getElementById('timeTravelToggle').checked;
  if (!country || !city || !startDate || !endDate) {
    showToast('Please fill all required fields', 'warning');
    return;
  }
  const tripInfo = { country, city, startDate, endDate, reason, style, activities, luggage, simClose };
  sessionStorage.setItem('pendingTrip', JSON.stringify(tripInfo));
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
  // chip listeners
  document.querySelectorAll('.chip').forEach(chip => {
    const isMulti = chip.closest('#chips-activities') !== null;
    chip.onclick = () => toggleChip(chip, isMulti);
  });
  initSearchableCities();
  updateStepUI();
});
