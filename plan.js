// plan.js – multi‑city, multi‑day forecast with collapsible sections
// Enhanced packing list generator with reasons, quantities, essential/optional badges, and medicine
document.addEventListener('DOMContentLoaded', () => {
    // ---------- DOM Elements (unchanged) ----------
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

    // ---------- Global state (unchanged) ----------
    let countriesList = [];
    let citiesCache = new Map();
    let mainCityInputs = [cityInput];
    let activeCountry = '';
    let weatherForecasts = [];
    let selectedReason = 'Leisure';
    let selectedStyle = 'Standard';
    let selectedWho = 'Solo';
    let selectedActivities = ['Hiking', 'City Tours'];
    let selectedLuggage = 'Checked';

    // ---------- Helper: Fetch Countries (unchanged) ----------
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

    // ---------- Fetch Cities for a Country (unchanged) ----------
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

    // ---------- Custom Autocomplete (unchanged) ----------
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
            if (!query) { this.hide(); return; }
            const suggestions = await this.fetchSuggestions(query);
            if (suggestions.length === 0) { this.hide(); return; }
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

    function setupCountryAutocomplete(input, onSelect) {
        new Autocomplete(input, async (query) => {
            if (!countriesList.length) await fetchCountries();
            return countriesList.filter(c => c.toLowerCase().includes(query.toLowerCase()));
        }, onSelect);
    }

    function setupCityAutocomplete(input, countryGetter, onSelect) {
        let currentCities = [];
        new Autocomplete(input, async (query) => {
            const country = countryGetter();
            if (!country) return [];
            if (!currentCities.length) currentCities = await fetchCities(country);
            return currentCities.filter(c => c.toLowerCase().includes(query.toLowerCase()));
        }, onSelect);
    }

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

    // ---------- Fetch daily forecast for a city (unchanged) ----------
    async function fetchDailyForecast(city, country, startDate, endDate) {
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
            const geoData = await geoRes.json();
            if (!geoData.results || !geoData.results.length) return null;
            const { latitude, longitude, name } = geoData.results[0];
            let days = 3;
            if (endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diff = Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
                days = Math.min(diff, 7);
            }
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto&forecast_days=${days}`;
            const weatherRes = await fetch(weatherUrl);
            const weatherData = await weatherRes.json();
            if (!weatherData.daily) return null;
            const daily = [];
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
                daily.push({ date, max, min, precip, code, icon, condition });
            }
            return { city: name, daily };
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    // ---------- Weather Preview (unchanged) ----------
    async function updateWeatherPreview() {
        const country = countryInput.value;
        const cities = mainCityInputs.map(inp => inp.value).filter(c => c);
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (!country || cities.length === 0 || !startDate) {
            weatherPreviewDiv.innerHTML = '<div class="weather-placeholder"><i class="fa-solid fa-cloud-moon"></i> Fill destination & start date to see forecast.</div>';
            return;
        }
        weatherPreviewDiv.innerHTML = '<div class="weather-loading"><i class="fa-solid fa-spinner fa-pulse"></i> Fetching daily forecasts for all cities...</div>';
        let forecasts = [];
        for (const city of cities) {
            const dailyData = await fetchDailyForecast(city, country, startDate, endDate);
            if (dailyData) forecasts.push(dailyData);
        }
        if (forecasts.length === 0) {
            weatherPreviewDiv.innerHTML = '<div class="weather-error">❌ Could not fetch weather. Try again.</div>';
            return;
        }
        weatherForecasts = forecasts;
        let html = `<div class="weather-multi">`;
        for (let i = 0; i < forecasts.length; i++) {
            const f = forecasts[i];
            const isFirst = i === 0;
            const collapsedClass = isFirst ? '' : 'collapsed';
            html += `
                <div class="weather-city-card ${collapsedClass}" data-city-index="${i}">
                    <div class="weather-city-header">
                        <span><i class="fa-solid fa-location-dot"></i> ${f.city}</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </div>
                    <div class="weather-days">
                        ${f.daily.map(day => `
                            <div class="weather-day">
                                <span class="date">${day.date.slice(5)}</span>
                                <span class="icon">${day.icon}</span>
                                <span class="temp">${Math.round(day.min)}°–${Math.round(day.max)}°</span>
                                <span class="rain">${day.precip > 0 ? '💧' + day.precip + 'mm' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        html += `<div class="weather-note"><i class="fa-regular fa-lightbulb"></i> Your packing list will be tailored to the most extreme weather among your cities.</div></div>`;
        weatherPreviewDiv.innerHTML = html;

        document.querySelectorAll('.weather-city-header').forEach(header => {
            header.addEventListener('click', () => {
                const card = header.closest('.weather-city-card');
                card.classList.toggle('collapsed');
            });
        });
    }

    // ---------- Combine weather across cities (unchanged) ----------
    function combineWeather(forecasts) {
        let combined = { avgTemp: 0, condition: 'Mild', rainy: false, snowy: false, hot: false, cold: false };
        let tempSum = 0;
        let count = 0;
        for (const f of forecasts) {
            for (const day of f.daily) {
                const avgDay = (day.max + day.min) / 2;
                tempSum += avgDay;
                count++;
                if (day.condition === 'Rainy') combined.rainy = true;
                if (day.condition === 'Snowy') combined.snowy = true;
                if (avgDay > 25) combined.hot = true;
                if (avgDay < 10) combined.cold = true;
            }
        }
        combined.avgTemp = count ? tempSum / count : 20;
        if (combined.snowy) combined.condition = 'Snowy';
        else if (combined.rainy) combined.condition = 'Rainy';
        else if (combined.hot) combined.condition = 'Hot';
        else if (combined.cold) combined.condition = 'Cold';
        else combined.condition = 'Mild';
        return combined;
    }

    // ---------- ENHANCED: Generate packing list with reasons, quantities, essential/optional, medicine ----------
    function generatePackingListFromWeather(weather, preferences, forecastType = 'climate') {
        const { condition, rainy, snowy, avgTemp } = weather;
        const activities = preferences.activities;
        const style = preferences.style;
        const who = preferences.who;
        const luggage = preferences.luggage;
        const items = [];

        function addItem(name, category, reason, quantity = null, essential = true) {
            items.push({
                name: quantity ? `${name} (${quantity})` : name,
                category,
                reason,
                essential,
                checked: false
            });
        }

        // ----- Weather based -----
        if (condition === 'Hot') {
            addItem('T-shirts', 'Clothing', 'Hot weather – breathable fabrics', '3-4', true);
            addItem('Shorts', 'Clothing', 'High temperatures expected', '2-3', true);
            addItem('Light dresses / skirts', 'Clothing', 'Stay cool', '1-2', false);
            if (activities.includes('Beach')) 
                addItem('Swimwear', 'Clothing', 'Beach activity', '1-2', true);
            addItem('Sunscreen SPF 30+', 'Health', 'Intense sun – prevent burns', '1 bottle', true);
            addItem('Sun hat & sunglasses', 'Accessories', 'UV protection', '1 set', true);
            addItem('Insect repellent', 'Health', 'Mosquitoes common in hot regions', '1 small', false);
        } 
        else if (condition === 'Cold') {
            addItem('Thermal base layers', 'Clothing', 'Cold weather insulation', '2-3', true);
            addItem('Sweaters / fleece', 'Clothing', 'Mid layer warmth', '2-3', true);
            addItem('Heavy jacket / coat', 'Clothing', 'Outer protection', '1', true);
            addItem('Gloves, scarf, beanie', 'Accessories', 'Prevent heat loss', '1 set', true);
            addItem('Lip balm', 'Health', 'Prevents chapping in cold', '1', false);
            addItem('Hand warmers', 'Accessories', 'Extra warmth', '2 pairs', false);
        } 
        else {
            addItem('Long-sleeve shirts', 'Clothing', 'Mild & variable weather', '2-3', true);
            addItem('T-shirts', 'Clothing', 'Mild days', '2-3', true);
            addItem('Jeans / trousers', 'Clothing', 'Everyday wear', '2', true);
            addItem('Light jacket or cardigan', 'Clothing', 'Cool evenings', '1', true);
        }

        if (rainy) {
            addItem('Rain jacket', 'Gear', 'Rain forecast', '1', true);
            addItem('Compact umbrella', 'Gear', 'Sudden showers', '1', true);
            addItem('Waterproof shoes', 'Footwear', 'Keep feet dry', '1 pair', false);
        }
        if (snowy) {
            addItem('Waterproof boots', 'Footwear', 'Snow and slush', '1 pair', true);
            addItem('Snow gloves', 'Accessories', 'Warmth and grip', '1 pair', true);
        }

        // ----- Activity based -----
        if (activities.includes('Hiking')) {
            addItem('Hiking boots', 'Footwear', 'Trail support', '1 pair', true);
            addItem('Day backpack', 'Gear', 'Carry water & snacks', '1', true);
            addItem('Water bottle', 'Gear', 'Stay hydrated', '1', true);
            addItem('Energy bars', 'Food', 'Quick fuel', '3-4', false);
        }
        if (activities.includes('Beach')) {
            addItem('Beach towel', 'Accessories', 'Sand & sun', '1', true);
            addItem('Flip flops', 'Footwear', 'Beach walks', '1 pair', true);
            addItem('Dry bag', 'Gear', 'Protect electronics', '1', false);
        }
        if (activities.includes('City Tours')) {
            addItem('Comfortable walking shoes', 'Footwear', 'All‑day walking', '1 pair', true);
            addItem('Portable charger', 'Electronics', 'Phone battery for maps', '1', true);
            addItem('City map or offline app', 'Documents', 'Navigation', '1', false);
        }
        if (style === 'Luxury' || activities.includes('Shopping')) {
            addItem('Dress shoes / sandals', 'Footwear', 'Evenings & dining', '1 pair', false);
            addItem('Smart casual outfit', 'Clothing', 'Restaurants or events', '1 set', false);
        }
        if (who === 'Family') {
            addItem('First-aid kit', 'Health', 'Kids’ minor injuries', '1', true);
            addItem('Snacks', 'Food', 'For children', 'some', false);
            addItem('Entertainment (tablet, books)', 'Electronics', 'Keep kids occupied', '1', false);
        }

        // ----- Medicine & health variety (NEW) -----
        addItem('Pain relievers (ibuprofen/paracetamol)', 'Health', 'Headaches, minor pain', 'small pack', true);
        addItem('Antihistamines', 'Health', 'Allergies or insect bites', '1 strip', false);
        addItem('Motion sickness pills', 'Health', 'Car/boat/plane travel', '6 tablets', false);
        addItem('Oral rehydration salts', 'Health', 'Dehydration from heat or illness', '2-3 sachets', false);
        addItem('Bandages & antiseptic wipes', 'Health', 'Minor cuts', 'small kit', true);
        addItem('Prescription medications', 'Health', 'Medical necessity', 'full supply', true);
        addItem('Hand sanitizer', 'Health', 'Hygiene on the go', 'small bottle', true);
        addItem('Face masks', 'Health', 'Crowded transport', '3-4', false);

        // ----- Standard essentials -----
        addItem('Toothbrush & toothpaste', 'Toiletries', 'Oral hygiene', '1 set', true);
        addItem('Shampoo & soap', 'Toiletries', 'Personal care', 'travel size', true);
        addItem('Deodorant', 'Toiletries', 'Freshness', '1', true);
        addItem('Passport / ID', 'Documents', 'Required for travel', '1', true);
        addItem('Wallet / cash / cards', 'Documents', 'Money access', '1', true);
        addItem('Phone + charger', 'Electronics', 'Communication & maps', '1', true);
        addItem('Power bank', 'Electronics', 'Backup battery', '1', false);
        addItem('Travel adapter', 'Electronics', 'Plug compatibility', '1', false);
        addItem('Copy of documents (digital backup)', 'Documents', 'Emergency', '1', false);
        addItem('Travel insurance card', 'Documents', 'Medical coverage', '1', true);

        // ----- Luggage limit -----
        let finalItems = items;
        if (luggage === 'Carry-on') {
            finalItems = items.slice(0, 16);
            finalItems.push({
                name: '🧳 Pack light! Aim for 7kg',
                category: 'Tip',
                reason: 'Carry‑on only',
                essential: true,
                checked: false
            });
        }

        // Add pro tip
        finalItems.push({
            name: '💡 Pro tip: Roll clothes instead of folding',
            category: 'Tip',
            reason: 'Saves space & reduces wrinkles',
            essential: false,
            checked: false
        });

        return finalItems;
    }

    // ---------- MODIFIED: Generate final trip with forecastType ----------
    async function generateList() {
        const country = countryInput.value;
        const cities = mainCityInputs.map(inp => inp.value).filter(c => c);
        const start = startDateInput.value;
        const end = endDateInput.value;
        if (!country || cities.length === 0 || !start || !end) {
            alert('Please complete all steps.');
            return false;
        }
        let forecasts = weatherForecasts;
        if (!forecasts || forecasts.length === 0) {
            forecasts = [];
            for (const city of cities) {
                const dailyData = await fetchDailyForecast(city, country, start, end);
                if (dailyData) forecasts.push(dailyData);
            }
        }
        const combinedWeather = combineWeather(forecasts);
        
        // Determine forecast confidence
        const daysToTrip = Math.ceil((new Date(start) - new Date()) / (1000 * 3600 * 24));
        const forecastType = daysToTrip <= 14 ? 'real' : 'climate';
        
        const preferences = { reason: selectedReason, style: selectedStyle, who: selectedWho, activities: selectedActivities, luggage: selectedLuggage, travelersCount: 1 };
        const packingList = generatePackingListFromWeather(combinedWeather, preferences, forecastType);
        
        const tripData = {
            id: Date.now(),
            name: cities.length === 1 ? `${cities[0]} (${new Date(start).toLocaleDateString()})` : `${cities[0]} & ${cities.length-1} more (${new Date(start).toLocaleDateString()})`,
            destinations: { main: { country, cities } },
            dates: { start, end },
            preferences: preferences,
            weather: { ...combinedWeather, forecastType },
            packingList: packingList,
            createdAt: new Date().toISOString()
        };
        sessionStorage.setItem('pendingTrip', JSON.stringify(tripData));
        window.location.href = 'list.html';
        return true;
    }

    // ---------- Step Navigation (unchanged) ----------
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

    // ---------- Chips Handling (unchanged) ----------
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

    // ---------- Additional listeners (unchanged) ----------
    if (addCityBtn) {
        addCityBtn.removeAttribute('onclick');
        addCityBtn.addEventListener('click', window.addCityField);
    }
    if (timeTravelToggle) {
        timeTravelToggle.addEventListener('change', () => updateWeatherPreview());
    }
    startDateInput.addEventListener('change', () => { if (currentStep === steps.length-1) updateWeatherPreview(); });
    endDateInput.addEventListener('change', () => { if (currentStep === steps.length-1) updateWeatherPreview(); });

    // ---------- Initialize (unchanged) ----------
    initAutocompletes();
    initChips();
    updateStepUI();
});
