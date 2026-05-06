// plan.js - Fixed version with working list generation
document.addEventListener('DOMContentLoaded', () => {
    // ---------- DOM Elements ----------
    const countryInput = document.getElementById('countryInput');
    const cityInput = document.getElementById('cityInput0');
    const addCityBtn = document.querySelector('.btn-ghost.btn-sm');
    const cityFieldsContainer = document.getElementById('cityFields');
    const multiCountryToggle = document.getElementById('multiCountryToggle');
    const extraCountriesDiv = document.getElementById('extraCountries');
    const country2Input = document.getElementById('country2Input');
    const city2Input = document.getElementById('city2Input');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const startDate2Input = document.getElementById('startDate2');
    const endDate2Input = document.getElementById('endDate2');
    const multiDatesDiv = document.getElementById('multiDates');
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
    let weatherForecast = null;
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

    // ---------- City Autocomplete (depends on country) ----------
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
        // Main country
        setupCountryAutocomplete(countryInput, (val) => {
            activeCountry = val;
            refreshMainCitySuggestions();
        });
        // Main city (first)
        function getMainCountry() { return countryInput.value; }
        setupCityAutocomplete(cityInput, getMainCountry, null);
        // Multi-country second row (if exists)
        if (country2Input && city2Input) {
            setupCountryAutocomplete(country2Input, null);
            setupCityAutocomplete(city2Input, () => country2Input.value, null);
        }
    }

    async function refreshMainCitySuggestions() {
        const country = countryInput.value;
        if (!country) return;
        await fetchCities(country);
        // Users will re-type to see suggestions; no need to update existing autocompletes directly.
    }

    // ---------- Add dynamic city field (make it global for onclick) ----------
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
        // Setup autocomplete for this new city
        setupCityAutocomplete(newInput, () => countryInput.value, null);
    };

    // ---------- Weather Preview (User‑friendly UI) ----------
    async function updateWeatherPreview() {
        const country = countryInput.value;
        const city = mainCityInputs[0]?.value;
        const startDate = startDateInput.value;
        if (!country || !city || !startDate) {
            weatherPreviewDiv.innerHTML = '<div class="weather-placeholder"><i class="fa-solid fa-cloud-moon"></i> Fill destination & start date to see forecast.</div>';
            return;
        }
        weatherPreviewDiv.innerHTML = '<div class="weather-loading"><i class="fa-solid fa-spinner fa-pulse"></i> Fetching forecast...</div>';
        try {
            // Geocode via Open-Meteo
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();
            if (!geoData.results || !geoData.results.length) throw new Error('City not found');
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
            if (weatherData.daily) {
                weatherForecast = weatherData.daily;
                let html = `<div class="weather-card"><div class="weather-location"><i class="fa-solid fa-location-dot"></i> ${name}, ${country}</div><div class="weather-days">`;
                for (let i = 0; i < weatherData.daily.time.length; i++) {
                    const date = weatherData.daily.time[i];
                    const max = weatherData.daily.temperature_2m_max[i];
                    const min = weatherData.daily.temperature_2m_min[i];
                    const precip = weatherData.daily.precipitation_sum[i];
                    const code = weatherData.daily.weathercode[i];
                    let icon = '☀️', condition = 'Sunny';
                    if (code >= 51 && code <= 67) { icon = '🌧️'; condition = 'Rainy'; }
                    else if (code >= 71 && code <= 77) { icon = '❄️'; condition = 'Snowy'; }
                    else if (code >= 80 && code <= 99) { icon = '⛈️'; condition = 'Stormy'; }
                    html += `<div class="weather-day"><span class="date">${date}</span><span class="icon">${icon}</span><span class="temp">${min}°–${max}°</span><span class="rain">${precip > 0 ? '💧' + precip + 'mm' : ''}</span></div>`;
                }
                html += `</div><div class="weather-note"><i class="fa-regular fa-lightbulb"></i> Based on this forecast, your packing list will be tailored.</div></div>`;
                weatherPreviewDiv.innerHTML = html;
            } else {
                weatherPreviewDiv.innerHTML = '<div class="weather-error">⚠️ Forecast unavailable. Try a different city.</div>';
            }
        } catch (err) {
            console.error(err);
            weatherPreviewDiv.innerHTML = '<div class="weather-error">❌ Weather service error. Please try later.</div>';
        }
    }

    // ---------- Generate Packing List Based on Weather & Preferences ----------
    async function generatePackingList() {
        // Gather inputs
        const country = countryInput.value;
        const cities = mainCityInputs.map(inp => inp.value).filter(c => c);
        const multiCountry = multiCountryToggle.checked && country2Input.value && city2Input.value;
        const secondDest = multiCountry ? { country: country2Input.value, city: city2Input.value } : null;
        const start = startDateInput.value;
        const end = endDateInput.value;
        const reason = selectedReason;
        const style = selectedStyle;
        const who = selectedWho;
        const activities = selectedActivities;
        const luggage = selectedLuggage;

        if (!country || cities.length === 0 || !start) {
            alert('Please complete step 1 and 2 before generating list.');
            return false;
        }

        // Get weather summary (use forecast if available, else fallback)
        let weatherSummary = { avgTemp: 20, condition: 'Sunny', rainy: false, snowy: false };
        if (weatherForecast && weatherForecast.temperature_2m_max && weatherForecast.temperature_2m_max.length) {
            const avgMax = weatherForecast.temperature_2m_max.reduce((a,b) => a+b,0) / weatherForecast.temperature_2m_max.length;
            const avgMin = weatherForecast.temperature_2m_min.reduce((a,b) => a+b,0) / weatherForecast.temperature_2m_min.length;
            weatherSummary.avgTemp = (avgMax + avgMin) / 2;
            const hasRain = weatherForecast.weathercode.some(code => code >= 51 && code <= 67);
            const hasSnow = weatherForecast.weathercode.some(code => code >= 71 && code <= 77);
            weatherSummary.rainy = hasRain;
            weatherSummary.snowy = hasSnow;
            if (hasSnow) weatherSummary.condition = 'Snowy';
            else if (hasRain) weatherSummary.condition = 'Rainy';
            else if (weatherSummary.avgTemp > 25) weatherSummary.condition = 'Hot';
            else if (weatherSummary.avgTemp < 10) weatherSummary.condition = 'Cold';
            else weatherSummary.condition = 'Mild';
        } else {
            // Fallback based on month
            const month = new Date(start).getMonth();
            const isSummer = (month >= 5 && month <= 7); // June-August
            weatherSummary.avgTemp = isSummer ? 25 : 12;
            weatherSummary.condition = isSummer ? 'Mild' : 'Cold';
            weatherSummary.rainy = false;
            weatherSummary.snowy = false;
        }

        // Build packing list
        let items = [];

        // Base clothing
        if (weatherSummary.condition === 'Hot') {
            items.push({ name: 'T-shirts (3-4)', category: 'Clothing', checked: false });
            items.push({ name: 'Shorts (2-3)', category: 'Clothing', checked: false });
            items.push({ name: 'Light dresses / skirts', category: 'Clothing', checked: false });
            if (activities.includes('Beach')) items.push({ name: 'Swimwear', category: 'Clothing', checked: false });
        } else if (weatherSummary.condition === 'Cold') {
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
        if (weatherSummary.rainy) items.push({ name: 'Rain jacket / umbrella', category: 'Gear', checked: false });
        if (weatherSummary.snowy) items.push({ name: 'Waterproof boots', category: 'Footwear', checked: false });

        // Footwear
        items.push({ name: 'Comfortable walking shoes', category: 'Footwear', checked: false });
        if (activities.includes('Hiking')) items.push({ name: 'Hiking boots', category: 'Footwear', checked: false });
        if (style === 'Luxury' || activities.includes('Shopping')) items.push({ name: 'Dress shoes / sandals', category: 'Footwear', checked: false });

        // Activity based
        if (activities.includes('Beach')) items.push({ name: 'Beach towel', category: 'Accessories', checked: false });
        if (activities.includes('Hiking')) items.push({ name: 'Backpack (daypack)', category: 'Gear', checked: false });
        if (activities.includes('City Tours')) items.push({ name: 'Portable charger', category: 'Electronics', checked: false });
        if (who === 'Family') items.push({ name: 'First-aid kit', category: 'Health', checked: false });

        // Luggage limit
        if (luggage === 'Carry-on') {
            items = items.slice(0, 12);
        }

        // Toiletries
        items.push({ name: 'Toothbrush & toothpaste', category: 'Toiletries', checked: false });
        items.push({ name: 'Shampoo & soap', category: 'Toiletries', checked: false });
        if (weatherSummary.condition === 'Hot') items.push({ name: 'Sunscreen', category: 'Health', checked: false });

        // Ensure no duplicate categories for display
        const finalList = items.map(i => ({ name: i.name, category: i.category, checked: false }));

        // Store data for list.html
        const tripData = {
            id: Date.now(),
            name: `${cities[0]} (${new Date(start).toLocaleDateString()})`,
            destinations: { main: { country, cities }, second: secondDest },
            dates: { start, end },
            preferences: { reason, style, who, activities, luggage },
            weather: weatherSummary,
            packingList: finalList,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('currentPackingList', JSON.stringify(finalList));
        localStorage.setItem('currentTripMetadata', JSON.stringify(tripData));
        // Save to trips array
        let savedTrips = JSON.parse(localStorage.getItem('userTrips') || '[]');
        savedTrips.unshift(tripData);
        localStorage.setItem('userTrips', JSON.stringify(savedTrips));
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
        nextBtn.textContent = currentStep === steps.length - 1 ? 'Generate List' : 'Next →';
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
            const success = await generatePackingList();
            if (success) {
                window.location.href = 'list.html';
            }
            return;
        }
        currentStep++;
        updateStepUI();
    }

    function goPrev() {
        if (currentStep > 0) {
            currentStep--;
            updateStepUI();
        }
    }

    nextBtn.addEventListener('click', goNext);
    prevBtn.addEventListener('click', goPrev);

    // ---------- Read chips selections ----------
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

        // initial values
        selectedReason = document.querySelector('#chips-reason .chip.selected').dataset.val;
        selectedStyle = document.querySelector('#chips-style .chip.selected').dataset.val;
        selectedWho = document.querySelector('#chips-who .chip.selected').dataset.val;
        selectedLuggage = document.querySelector('#chips-luggage .chip.selected').dataset.val;
        selectedActivities = Array.from(document.querySelectorAll('#chips-activities .chip.selected')).map(c => c.dataset.val);
    }

    // ---------- Multi-country toggle ----------
    multiCountryToggle.addEventListener('change', (e) => {
        extraCountriesDiv.style.display = e.target.checked ? 'block' : 'none';
        multiDatesDiv.style.display = e.target.checked ? 'block' : 'none';
    });
    extraCountriesDiv.style.display = 'none';
    multiDatesDiv.style.display = 'none';

    // ---------- Add city button (if using JS listener instead of inline) ----------
    if (addCityBtn) {
        addCityBtn.removeAttribute('onclick'); // remove inline to avoid double call
        addCityBtn.addEventListener('click', window.addCityField);
    }

    // ---------- Time travel toggle (affects weather preview) ----------
    if (timeTravelToggle) {
        timeTravelToggle.addEventListener('change', () => updateWeatherPreview());
    }

    // ---------- Refresh weather on date changes ----------
    startDateInput.addEventListener('change', () => { if (currentStep === steps.length-1) updateWeatherPreview(); });
    endDateInput.addEventListener('change', () => { if (currentStep === steps.length-1) updateWeatherPreview(); });

    // ---------- Initialize ----------
    initAutocompletes();
    initChips();
    updateStepUI();
});
