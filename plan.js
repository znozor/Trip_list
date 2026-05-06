// plan.js – multiple cities, combine weather
let currentStep = 0;
const totalSteps = 4;
let cityCounter = 1;
let mainCityInputs = [];

const cityMap = {
  Japan: ['Tokyo','Osaka','Kyoto','Yokohama'],
  France: ['Paris','Lyon','Marseille','Nice'],
  Italy: ['Rome','Milan','Venice','Florence'],
  Thailand: ['Bangkok','Phuket','Chiang Mai'],
  USA: ['New York','Los Angeles','Chicago','Miami'],
  Spain: ['Madrid','Barcelona','Seville'],
  UK: ['London','Manchester','Edinburgh']
};
let countriesList = [];
let weatherDataCache = new Map();

async function fetchCountries() { /* same as before */ }
async function fetchCities(country) {
  if (cityMap[country]) return cityMap[country];
  return ['Unknown'];
}

// Add city field
window.addCityField = function() {
  const idx = mainCityInputs.length;
  const container = document.getElementById('cityFields');
  const newDiv = document.createElement('div');
  newDiv.className = 'city-row';
  newDiv.style.marginTop = '12px';
  newDiv.innerHTML = `
    <label class="input-label">City ${idx+1}</label>
    <input type="text" id="cityInput${idx}" class="input-field city-input" placeholder="Type city" autocomplete="off">
    <span class="remove-city" onclick="this.parentElement.remove()" style="margin-left:8px; cursor:pointer;">✖</span>
  `;
  container.appendChild(newDiv);
  mainCityInputs.push(document.getElementById(`cityInput${idx}`));
};

async function getWeatherForCity(city, country, startDate) {
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const geoData = await geoRes.json();
  if (!geoData.results || !geoData.results.length) return null;
  const { latitude, longitude } = geoData.results[0];
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=7`;
  const weatherRes = await fetch(weatherUrl);
  const weatherData = await weatherRes.json();
  if (!weatherData.daily) return null;
  const avgTemp = (weatherData.daily.temperature_2m_max[0] + weatherData.daily.temperature_2m_min[0]) / 2;
  const code = weatherData.daily.weathercode[0];
  let condition = 'Mild';
  if (code >= 51 && code <= 67) condition = 'Rainy';
  else if (code >= 71 && code <= 77) condition = 'Snowy';
  else if (avgTemp > 25) condition = 'Hot';
  else if (avgTemp < 10) condition = 'Cold';
  return { city, avgTemp, condition, rainy: (code>=51 && code<=67), snowy: (code>=71 && code<=77) };
}

async function updateWeatherPreview() {
  const country = document.getElementById('countryInput').value;
  const cities = mainCityInputs.map(inp => inp.value).filter(c => c);
  const startDate = document.getElementById('startDate').value;
  if (!country || cities.length === 0 || !startDate) {
    document.getElementById('weatherPreview').innerHTML = '<div>Fill country, at least one city, and start date.</div>';
    return;
  }
  document.getElementById('weatherPreview').innerHTML = '<div class="weather-loading"><i class="fa-solid fa-spinner fa-pulse"></i> Fetching forecasts for all cities...</div>';
  let forecasts = [];
  for (const city of cities) {
    const f = await getWeatherForCity(city, country, startDate);
    if (f) forecasts.push(f);
  }
  if (forecasts.length === 0) {
    document.getElementById('weatherPreview').innerHTML = '<div>Could not fetch weather.</div>';
    return;
  }
  let html = '<div class="weather-card"><div class="weather-location"><i class="fa-solid fa-location-dot"></i> Multi‑city forecast</div><div class="weather-days">';
  forecasts.forEach(f => {
    let icon = '☀️';
    if (f.snowy) icon = '❄️';
    else if (f.rainy) icon = '🌧️';
    else if (f.condition === 'Hot') icon = '🔥';
    html += `<div class="weather-day"><strong>${f.city}</strong> ${icon} ${f.condition}, ${Math.round(f.avgTemp)}°C</div>`;
  });
  html += `</div><div class="weather-note"><i class="fa-regular fa-lightbulb"></i> Your packing list will be tailored to the most extreme weather among your cities.</div></div>`;
  document.getElementById('weatherPreview').innerHTML = html;
  weatherDataCache.set('forecasts', forecasts);
}

async function generateList() {
  const country = document.getElementById('countryInput').value;
  const cities = mainCityInputs.map(inp => inp.value).filter(c => c);
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  if (!country || cities.length === 0 || !startDate || !endDate) {
    alert('Please complete all steps.');
    return false;
  }
  
  // Get stored forecasts (or fetch fresh)
  let forecasts = weatherDataCache.get('forecasts');
  if (!forecasts) {
    // fallback: fetch now
    forecasts = [];
    for (const city of cities) {
      const f = await getWeatherForCity(city, country, startDate);
      if (f) forecasts.push(f);
    }
  }
  // Combine: most extreme condition (rainy/snowy > hot > cold > mild) and highest temp
  let combined = { condition: 'Mild', avgTemp: 0, rainy: false, snowy: false };
  for (let f of forecasts) {
    if (f.snowy) combined.snowy = true;
    if (f.rainy) combined.rainy = true;
    if (f.avgTemp > combined.avgTemp) combined.avgTemp = f.avgTemp;
    if (f.condition === 'Snowy') combined.condition = 'Snowy';
    else if (f.condition === 'Rainy') combined.condition = 'Rainy';
    else if (f.condition === 'Hot') combined.condition = 'Hot';
    else if (f.condition === 'Cold' && combined.condition !== 'Snowy') combined.condition = 'Cold';
  }
  
  const preferences = { reason, style, who, activities, luggage };
  const tripData = {
    id: Date.now(),
    name: `${cities[0]} & ${cities.length-1} more` || cities[0],
    destinations: { main: { country, cities } },
    dates: { start: startDate, end: endDate },
    preferences: preferences,
    weather: combined,
    packingList: generatePackingList(combined, preferences)
  };
  localStorage.setItem('currentTripMetadata', JSON.stringify(tripData));
  localStorage.setItem('currentPackingList', JSON.stringify(tripData.packingList));
  return true;
}
