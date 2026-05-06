// plan.js – multi‑city support, combine weather forecasts
document.addEventListener('DOMContentLoaded', () => {
    // ---------- DOM Elements ----------
    const countryInput = document.getElementById('countryInput');
    const cityInput = document.getElementById('cityInput0');
    const addCityBtn = document.querySelector('.btn-ghost.btn-sm');
    const cityFieldsContainer = document.getElementById('cityFields');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const steps = document.querySelectorAll('.form-step');
    const stepDots = document.querySelectorAll('.step-dot');
    const stepLines = document.querySelectorAll('.step-line');
    const weatherPreviewDiv = document.getElementById('weatherPreview');
    const timeTravelToggle = document.getElementById('timeTravelToggle');

    // ---------- Global state ----------
    let countriesList = [];
    let citiesCache = new Map();
    let mainCityInputs = [cityInput];
    let activeCountry = '';
    let weatherForecasts = []; // store per city
    let selectedReason = 'Leisure';
    let selectedStyle = 'Standard';
    let selectedWho = 'Solo';
    let selectedActivities = ['Hiking', 'City Tours'];
    let selectedLuggage = 'Checked';

    // ---------- Helper: Fetch Countries ----------
    async function fetchCountries() {
        try {
            const res = await fetch('https://restcountries.com/v3.1/all?fields=name');
            if (!res.ok) throw new Error();
            const data = await res.json();
            countriesList = data.map(c => c.name.common).sort();
        } catch {
            countriesList = ["Japan", "France", "Italy", "Thailand", "USA", "Spain", "UK", "Germany", "Canada", "Australia"];
        }
        return countriesList;
    }

    // ---------- Fetch Cities for a Country ----------
    async function fetchCities(countryName) {
        if (!countryName) return [];
        if (citiesCache.has(countryName)) return citiesCache.get(countryName);
        try {
            const res = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country: countryName })
            });
            const data = await res.json();
            let cities = data.data || [];
            if (!cities.length) cities = ["Unknown City"];
            citiesCache.set(countryName, cities);
            return cities;
        } catch {
            const fallback = ["Tokyo", "Paris", "Rome", "Bangkok", "New York", "Madrid", "London"];
            citiesCache.set(countryName, fallback);
            return fallback;
        }
    }

    // ---------- Custom Autocomplete Component ----------
    class Autocomplete {
        constructor(inputElement, fetchSuggestions, onSelect) {
            this.input = inputElement;
            this.fetchSuggestions = fetchSuggestions;
            this.onSelect = onSelect;
            this.container = document.createElement('div');
            this.container.className = 'autocomplete-container';
            this.suggestionsDiv = document.createElement('div');
            this.suggestionsDiv.className = 'autocomplete-suggestions';
            this.container.appendChild(this.suggestionsDiv);
            this.input.parentNode.insertBefore(this.container, this.input.nextSibling);
            this.input.addEventListener('input', () => this.update());
            this.input.addEventListener('focus', () => this.update());
            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target) && e.target !== this.input) this.hide();
            });
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.suggestionsDiv.children.length) {
                        this.selectItem(this.suggestionsDiv.children[0]);
                    }
                }
            });
        }
        async update() {
            const query = this.input.value.trim();
            if (!query) {
                this.hide();
                return;
            }
            const suggestions = await this.fetchSuggestions(query);
            if (suggestions.length === 0) {
                this.hide();
                return;
            }
            this.suggestionsDiv.innerHTML = '';
            suggestions.slice(0, 8).forEach(s => {
                const div = document.createElement('div');
                div.textContent = s;
                div.addEventListener('click', () => this.selectItem(div));
                this.suggestionsDiv.appendChild(div);
            });
            this.show();
        }
        selectItem(div) {
            this.input.value = div.textContent;
            if (this.onSelect) this.onSelect(this.input.value);
            this.hide();
        }
        show() { this.suggestionsDiv.style.display = 'block'; }
        hide() { this.suggestionsDiv.style.display = 'none'; }
    }

    // ---------- Country Autocomplete ----------
    function setupCountryAutocomplete(input, onSelect) {
        new Autocomplete(input, async (query) => {
            if (!countriesList.length) await fetchCountries();
            return countriesList.filter(c => c.toLowerCase().includes(query.toLowerCase()));
        }, onSelect);
    }

    // ---------- City Autocomplete ----------
    function setupCityAutocomplete(input, countryGetter, onSelect) {
        let currentCities = [];
        new Autocomplete(input, async (query) => {
            const country = countryGetter();
            if (!country) return [];
            if (!currentCities.length) currentCities = await fetchCities(country);
            return currentCities.filter(c => c.toLowerCase().includes(query.toLowerCase()));
        }, onSelect);
    }

    // ---------- Initialize Autocompletes ----------
    async function initAutocompletes() {
        await fetchCountries();
        setupCountryAutocomplete(countryInput, (val) => {
            activeCountry = val;
            refreshMainCitySuggestions();
        });
        function getMainCountry() { return countryInput.value; }
        setupCityAutocomplete(cityInput, getMainCountry, null);
    }

    async function refreshMainCitySuggestions() {
        const country = countryInput.value;
        if (!country) return;
        await fetchCities(country);
    }

    // ---------- Add dynamic city field ----------
    window.addCityField = function() {
        const idx = mainCityInputs.length;
        const newDiv = document.createElement('div');
        newDiv.className = 'city-row';
        newDiv.style.marginTop = '12px';
        const label = document.createElement('label');
        label.className = 'input-label';
        label.textContent = `City ${idx + 1}`;
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.className = 'input-field';
        newInput.placeholder = 'Type or select city';
        newDiv.appendChild(label);
        newDiv.appendChild(newInput);
        cityFieldsContainer.appendChild(newDiv);
        mainCityInputs.push(newInput);
        setupCityAutocomplete(newInput, () => countryInput.value, null);
    };

    // ---------- Fetch weather for a single city ----------
    async function fetchWeatherForCity(city, country, startDate) {
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();
            if (!geoData.results || !geoData.results.length) return null;
            const { latitude, longitude, name } = geoData.results[0];
            let days = 3;
            if (endDateInput.value) {
                const start = new Date(startDate);
                const end = new Date(endDateInput.value);
                const diff = Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
                days = Math.min(diff, 7);
            }
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto&forecast_days=${days}`;
            const weatherRes = await fetch(weatherUrl);
            const weatherData = await weatherRes.json();
            if (!weatherData.daily) return null;
            const avgMax = weatherData.daily.temperature_2m_max.reduce((a,b) => a+b,0) / weatherData.daily.temperature_2m_max.length;
            const avgMin = weatherData.daily.temperature_2m_min.reduce((a,b) => a+b,0) / weatherData.daily.temperature_2m_min.length;
            const avgTemp = (avgMax + avgMin) / 2;
            const hasRain = weatherData.daily.weathercode.some(code => code >= 51 && code <= 67);
            const hasSnow = weatherData.daily.weathercode.some(code => code >= 71 && code <= 77);
            let condition = 'Mild';
            if (hasSnow) condition = 'Snowy';
            else if (hasRain) condition = 'Rainy';
            else if (avgTemp > 25) condition = 'Hot';
            else if (avgTemp < 10) condition = 'Cold';
            return { city, avgTemp, condition, rainy: hasRain, snowy: hasSnow, forecast: weatherData.daily };
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    // ---------- Weather Preview (all cities) ----------
    async function updateWeatherPreview() {
        const country = countryInput.value;
        const cities = mainCityInputs.map(inp => inp.value).filter(c => c);
        const startDate = startDateInput.value;
        if (!country || cities.length === 0 || !startDate) {
            weatherPreviewDiv.innerHTML = '<div class="weather-placeholder"><i class="fa-solid fa-cloud-moon"></i> Fill destination & start date to see forecast.</div>';
            return;
        }
        weatherPreviewDiv.innerHTML = '<div class="weather-loading"><i class="fa-solid fa-spinner fa-pulse"></i> Fetching forecasts for all cities...</div>';
        let forecasts = [];
        for (const city of cities) {
            const f = await fetchWeatherForCity(city, country, startDate);
            if (f) forecasts.push(f);
        }
        if (forecasts.length === 0) {
            weatherPreviewDiv.innerHTML = '<div class="weather-error">❌ Could not fetch weather. Try again.</div>';
            return;
        }
        weatherForecasts = forecasts;
        let html = `<div class="weather-card"><div class="weather-location"><i class="fa-solid fa-location-dot"></i> Multi‑city forecast</div><div class="weather-days">`;
        forecasts.forEach(f => {
            let icon = '☀️';
            if (f.snowy) icon = '❄️';
            else if (f.rainy) icon = '🌧️';
            else if (f.condition === 'Hot') icon = '🔥';
            else if (f.condition === 'Cold') icon = '❄️';
            html += `<div class="weather-day"><strong>${f.city}</strong> ${icon} ${f.condition}, ${Math.round(f.avgTemp)}°C</div>`;
        });
        html += `</div><div class="weather-note"><i class="fa-regular fa-lightbulb"></i> Your packing list will be tailored to the most extreme weather among your cities.</div></div>`;
        weatherPreviewDiv.innerHTML = html;
    }

    // ---------- Combine weather forecasts into one ----------
    function combineWeather(forecasts) {
        let combined = { avgTemp: 0, condition: 'Mild', rainy: false, snowy: false };
        for (let f of forecasts) {
            if (f.snowy) combined.snowy = true;
            if (f.rainy) combined.rainy = true;
            if (f.avgTemp > combined.avgTemp) combined.avgTemp = f.avgTemp;
            if (f.condition === 'Snowy') combined.condition = 'Snowy';
            else if (f.condition === 'Rainy') combined.condition = 'Rainy';
            else if (f.condition === 'Hot') combined.condition = 'Hot';
            else if (f.condition === 'Cold' && combined.condition !== 'Snowy') combined.condition = 'Cold';
        }
        return combined;
    }

    // ---------- Generate packing list based on combined weather ----------
    function generatePackingListFromWeather(weather, preferences) {
        const activities = preferences.activities;
        const style = preferences.style;
        const who = preferences.who;
        const luggage = preferences.luggage;
        let items = [];
        if (weather.condition === 'Hot') {
            items.push({ name: 'T-shirts (3-4)', category: 'Clothing', checked: false });
            items.push({ name: 'Shorts (2-3)', category: 'Clothing', checked: false });
            items.push({ name: 'Light dresses / skirts', category: 'Clothing', checked: false });
            if (activities.includes('Beach')) items.push({ name: 'Swimwear', category: 'Clothing', checked: false });
        } else if (weather.condition === 'Cold') {
            items.push({ name: 'Thermal base layers', category: 'Clothing', checked: false });
            items.push({ name: 'Sweaters / fleece', category: 'Clothing', checked: false });
            items.push({ name: 'Heavy jacket / coat', category: 'Clothing', checked: false });
            items.push({ name: 'Gloves, scarf, beanie', category: 'Accessories', checked: false });
        } else {
            items.push({ name: 'Long-sleeve shirts', category: 'Clothing', checked: false });
            items.push({ name: 'T-shirts', category: 'Clothing', checked: false });
            items.push({ name: 'Jeans / trousers', category: 'Clothing', checked: false });
            items.push({ name: 'Light jacket or cardigan', category: 'Clothing', checked: false });
        }
        if (weather.rainy) items.push({ name: 'Rain jacket / umbrella', category: 'Gear', checked: false });
        if (weather.snowy) items.push({ name: 'Waterproof boots', category: 'Footwear', checked: false });
        items.push({ name: 'Comfortable walking shoes', category: 'Footwear', checked: false });
        if (activities.includes('Hiking')) items.push({ name: 'Hiking boots', category: 'Footwear', checked: false });
        if (style === 'Luxury' || activities.includes('Shopping')) items.push({ name: 'Dress shoes / sandals', category: 'Footwear', checked: false });
        if (activities.includes('Beach')) items.push({ name: 'Beach towel', category: 'Accessories', checked: false });
        if (activities.includes('Hiking')) items.push({ name: 'Backpack (daypack)', category: 'Gear', checked: false });
        if (activities.includes('City Tours')) items.push({ name: 'Portable charger', category: 'Electronics', checked: false });
        if (who === 'Family') items.push({ name: 'First-aid kit', category: 'Health', checked: false });
        if (luggage === 'Carry-on') items = items.slice(0, 12);
        items.push({ name: 'Toothbrush & toothpaste', category: 'Toiletries', checked: false });
        items.push({ name: 'Shampoo & soap', category: 'Toiletries', checked: false });
        if (weather.condition === 'Hot') items.push({ name: 'Sunscreen', category: 'Health', checked: false });
        return items.map(i => ({ name: i.name, category: i.category, checked: false }));
    }

    // ---------- Generate final trip and store ----------
    async function generateList() {
        const country = countryInput.value;
        const cities = mainCityInputs.map(inp => inp.value).filter(c => c);
        const start = startDateInput.value;
        const end = endDateInput.value;
        if (!country || cities.length === 0 || !start || !end) {
            alert('Please complete all steps.');
            return false;
        }
        // Use stored forecasts or fetch fresh
        let forecasts = weatherForecasts;
        if (!forecasts || forecasts.length === 0) {
            forecasts = [];
            for (const city of cities) {
                const f = await fetchWeatherForCity(city, country, start);
                if (f) forecasts.push(f);
            }
        }
        const combinedWeather = combineWeather(forecasts);
        const preferences = { reason: selectedReason, style: selectedStyle, who: selectedWho, activities: selectedActivities, luggage: selectedLuggage, travelersCount: 1 };
        const packingList = generatePackingListFromWeather(combinedWeather, preferences);
        const tripData = {
            id: Date.now(),
            name: cities.length === 1 ? `${cities[0]} (${new Date(start).toLocaleDateString()})` : `${cities[0]} & ${cities.length-1} more (${new Date(start).toLocaleDateString()})`,
            destinations: { main: { country, cities } },
            dates: { start, end },
            preferences: preferences,
            weather: combinedWeather,
            packingList: packingList,
            createdAt: new Date().toISOString()
        };
        // Store in sessionStorage for list.html
        sessionStorage.setItem('pendingTrip', JSON.stringify(tripData));
        window.location.href = 'list.html';
        return true;
    }

    // ---------- Step Navigation ----------
    let currentStep = 0;
    function updateStepUI() {
        steps.forEach((s, idx) => s.classList.toggle('active', idx === currentStep));
        stepDots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx <= currentStep);
            if (idx < stepLines.length) stepLines[idx].classList.toggle('active', idx < currentStep);
        });
        prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-flex';
        nextBtn.innerHTML = currentStep === steps.length - 1 ? 'Generate List' : 'Next →';
        if (currentStep === steps.length - 1) updateWeatherPreview();
    }
    async function goNext() {
        if (currentStep === 0) {
            if (!countryInput.value || !mainCityInputs[0].value) {
                alert('Please select country and at least one city.');
                return;
            }
        }
        if (currentStep === 1) {
            if (!startDateInput.value) { alert('Start date required'); return; }
            if (endDateInput.value && new Date(endDateInput.value) < new Date(startDateInput.value)) {
                alert('End date cannot be before start date');
                return;
            }
        }
        if (currentStep === steps.length - 1) {
            await generateList();
            return;
        }
        currentStep++;
        updateStepUI();
    }
    function goPrev() { if (currentStep > 0) { currentStep--; updateStepUI(); } }
    nextBtn.addEventListener('click', goNext);
    prevBtn.addEventListener('click', goPrev);

    // ---------- Chips Handling ----------
    function initChips() {
        const reasonChips = document.querySelectorAll('#chips-reason .chip');
        const styleChips = document.querySelectorAll('#chips-style .chip');
        const whoChips = document.querySelectorAll('#chips-who .chip');
        const activityChips = document.querySelectorAll('#chips-activities .chip');
        const luggageChips = document.querySelectorAll('#chips-luggage .chip');
        function chipHandler(group, singleSelect, callback) {
            return (e) => {
                const chip = e.currentTarget;
                if (singleSelect) {
                    group.forEach(c => c.classList.remove('selected'));
                    chip.classList.add('selected');
                } else {
                    chip.classList.toggle('selected');
                }
                callback();
            };
        }
        reasonChips.forEach(chip => chip.addEventListener('click', chipHandler(reasonChips, true, () => {
            selectedReason = document.querySelector('#chips-reason .chip.selected').dataset.val;
        })));
        styleChips.forEach(chip => chip.addEventListener('click', chipHandler(styleChips, true, () => {
            selectedStyle = document.querySelector('#chips-style .chip.selected').dataset.val;
        })));
        whoChips.forEach(chip => chip.addEventListener('click', chipHandler(whoChips, true, () => {
            selectedWho = document.querySelector('#chips-who .chip.selected').dataset.val;
        })));
        luggageChips.forEach(chip => chip.addEventListener('click', chipHandler(luggageChips, true, () => {
            selectedLuggage = document.querySelector('#chips-luggage .chip.selected').dataset.val;
        })));
        activityChips.forEach(chip => chip.addEventListener('click', chipHandler(activityChips, false, () => {
            selectedActivities = Array.from(document.querySelectorAll('#chips-activities .chip.selected')).map(c => c.dataset.val);
        })));
        selectedReason = document.querySelector('#chips-reason .chip.selected').dataset.val;
        selectedStyle = document.querySelector('#chips-style .chip.selected').dataset.val;
        selectedWho = document.querySelector('#chips-who .chip.selected').dataset.val;
        selectedLuggage = document.querySelector('#chips-luggage .chip.selected').dataset.val;
        selectedActivities = Array.from(document.querySelectorAll('#chips-activities .chip.selected')).map(c => c.dataset.val);
    }

    // ---------- Additional listeners ----------
    if (addCityBtn) {
        addCityBtn.removeAttribute('onclick');
        addCityBtn.addEventListener('click', window.addCityField);
    }
    if (timeTravelToggle) {
        timeTravelToggle.addEventListener('change', () => updateWeatherPreview());
    }
    startDateInput.addEventListener('change', () => { if (currentStep === steps.length-1) updateWeatherPreview(); });
    endDateInput.addEventListener('change', () => { if (currentStep === steps.length-1) updateWeatherPreview(); });

    // ---------- Initialize ----------
    initAutocompletes();
    initChips();
    updateStepUI();
});
