// plan.js - Dynamic Country & City Search with API Integration

document.addEventListener('DOMContentLoaded', () => {
    // ---------- Global State ----------
    let countriesList = [];             // Array of country names
    let citiesCache = new Map();        // countryName -> array of cities
    let mainCityInputs = [];            // Track all main city input elements (dynamic + initial)

    // DOM Elements
    const countryInput = document.getElementById('countryInput');
    const country2Input = document.getElementById('country2Input');
    const cityInput0 = document.getElementById('cityInput0');
    const city2Input = document.getElementById('city2Input');
    const cityFieldsContainer = document.getElementById('cityFields');
    const extraCountriesDiv = document.getElementById('extraCountries');
    const multiCountryToggle = document.getElementById('multiCountryToggle');
    const addCityBtn = document.querySelector('.btn-ghost.btn-sm');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const steps = document.querySelectorAll('.form-step');
    const stepDots = document.querySelectorAll('.step-dot');
    const stepLines = document.querySelectorAll('.step-line');
    let currentStep = 0;

    // Weather preview element
    const weatherPreviewDiv = document.getElementById('weatherPreview');

    // ---------- Helper: Fetch Countries (REST Countries) ----------
    async function fetchCountries() {
        try {
            const response = await fetch('https://restcountries.com/v3.1/all?fields=name');
            if (!response.ok) throw new Error('Failed to fetch countries');
            const data = await response.json();
            countriesList = data.map(c => c.name.common).sort();
            return countriesList;
        } catch (error) {
            console.error('Error fetching countries:', error);
            // Fallback static list
            countriesList = ["Japan", "France", "Italy", "Thailand", "USA", "Spain", "UK", "Germany", "Canada", "Australia"];
            return countriesList;
        }
    }

    // ---------- Fetch Cities for a Country (CountriesNow API) ----------
    async function fetchCitiesForCountry(countryName) {
        if (!countryName) return [];
        if (citiesCache.has(countryName)) {
            return citiesCache.get(countryName);
        }
        try {
            const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country: countryName })
            });
            if (!response.ok) throw new Error('Cities API error');
            const data = await response.json();
            let cities = data.data || [];
            if (!cities.length) cities = ["Unknown City"];
            citiesCache.set(countryName, cities);
            return cities;
        } catch (error) {
            console.error('Error fetching cities:', error);
            const fallback = ["Tokyo", "Paris", "Rome", "Bangkok", "New York", "Madrid", "London"];
            citiesCache.set(countryName, fallback);
            return fallback;
        }
    }

    // ---------- Setup Autocomplete for Country Input (filtered dropdown) ----------
    function setupCountryAutocomplete(inputElement, datalistId, filterFn = null) {
        let datalist = document.getElementById(datalistId);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            document.body.appendChild(datalist);
        }
        inputElement.setAttribute('list', datalistId);

        const updateSuggestions = () => {
            const searchTerm = inputElement.value.toLowerCase().trim();
            let sourceList = filterFn ? filterFn() : countriesList;
            if (!sourceList.length) sourceList = countriesList;
            const filtered = searchTerm === '' ? sourceList : sourceList.filter(c => c.toLowerCase().includes(searchTerm));
            datalist.innerHTML = '';
            filtered.slice(0, 50).forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                datalist.appendChild(option);
            });
        };

        inputElement.addEventListener('input', updateSuggestions);
        updateSuggestions();
        return datalist;
    }

    // ---------- Setup City Input with its own dynamic datalist + filtering ----------
    async function setupCityAutocomplete(cityInput, countryGetter, datalistId) {
        let datalist = document.getElementById(datalistId);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            document.body.appendChild(datalist);
        }
        cityInput.setAttribute('list', datalistId);

        let currentCities = [];

        const refreshCityList = async () => {
            const country = countryGetter();
            if (!country) {
                datalist.innerHTML = '';
                currentCities = [];
                return;
            }
            const cities = await fetchCitiesForCountry(country);
            currentCities = cities;
            filterCities(cityInput.value);
        };

        const filterCities = (searchTerm) => {
            const term = searchTerm.toLowerCase().trim();
            const filtered = term === '' ? currentCities : currentCities.filter(c => c.toLowerCase().includes(term));
            datalist.innerHTML = '';
            filtered.slice(0, 50).forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                datalist.appendChild(option);
            });
        };

        cityInput.addEventListener('input', (e) => filterCities(e.target.value));
        cityInput.addEventListener('focus', () => filterCities(cityInput.value));
        await refreshCityList();
        return { refresh: refreshCityList };
    }

    // ---------- Refresh all main city inputs (for current main country) ----------
    async function refreshAllMainCityFields() {
        const mainCountry = countryInput.value;
        if (!mainCountry) return;
        // Fetch cities for this country once and cache
        const cities = await fetchCitiesForCountry(mainCountry);
        // Update each city input's datalist dynamically
        mainCityInputs.forEach(cityInput => {
            const datalistId = cityInput.getAttribute('list');
            if (datalistId) {
                const datalist = document.getElementById(datalistId);
                if (datalist) {
                    const currentVal = cityInput.value;
                    const filtered = currentVal ? cities.filter(c => c.toLowerCase().includes(currentVal.toLowerCase())) : cities;
                    datalist.innerHTML = '';
                    filtered.slice(0, 50).forEach(city => {
                        const opt = document.createElement('option');
                        opt.value = city;
                        datalist.appendChild(opt);
                    });
                }
            }
        });
    }

    // ---------- Add another city field for same country ----------
    function addCityField() {
        const newIndex = mainCityInputs.length;
        const newDiv = document.createElement('div');
        newDiv.className = 'city-row';
        newDiv.style.marginTop = '12px';
        const label = document.createElement('label');
        label.className = 'input-label';
        label.textContent = `City ${newIndex + 1}`;
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.className = 'input-field';
        newInput.placeholder = 'Type or select city';
        const datalistId = `cityDatalistMain_${Date.now()}_${newIndex}`;
        newInput.setAttribute('list', datalistId);
        newDiv.appendChild(label);
        newDiv.appendChild(newInput);
        cityFieldsContainer.appendChild(newDiv);

        // Create datalist for this new city input
        const datalist = document.createElement('datalist');
        datalist.id = datalistId;
        document.body.appendChild(datalist);
        newInput.setAttribute('list', datalistId);
        
        // Store reference
        mainCityInputs.push(newInput);
        
        // Setup filtering for this new input based on main country
        const updateFilter = async () => {
            const mainCountry = countryInput.value;
            if (!mainCountry) return;
            const cities = await fetchCitiesForCountry(mainCountry);
            const filterCities = (term) => {
                const filtered = term ? cities.filter(c => c.toLowerCase().includes(term.toLowerCase())) : cities;
                datalist.innerHTML = '';
                filtered.slice(0, 50).forEach(city => {
                    const opt = document.createElement('option');
                    opt.value = city;
                    datalist.appendChild(opt);
                });
            };
            newInput.addEventListener('input', (e) => filterCities(e.target.value));
            filterCities(newInput.value);
        };
        updateFilter();
        
        // Also refresh when main country changes
        const countryChangeHandler = () => updateFilter();
        countryInput.addEventListener('change', countryChangeHandler);
        // remove listener later? Not critical for demo
    }

    // ---------- Setup Second Country & City (multi-country) ----------
    async function setupSecondCountryAndCity() {
        if (!country2Input || !city2Input) return;
        // Setup country autocomplete for 2nd country
        setupCountryAutocomplete(country2Input, 'countryListDyn2', () => countriesList);
        // City setup for 2nd country
        const getSecondCountry = () => country2Input.value;
        const secondCityDatalistId = 'cityDatalistSecond';
        await setupCityAutocomplete(city2Input, getSecondCountry, secondCityDatalistId);
        // Refresh when second country changes
        country2Input.addEventListener('change', async () => {
            const country = country2Input.value;
            if (country) {
                const cities = await fetchCitiesForCountry(country);
                const datalist = document.getElementById(secondCityDatalistId);
                if (datalist) {
                    datalist.innerHTML = '';
                    cities.forEach(city => {
                        const opt = document.createElement('option');
                        opt.value = city;
                        datalist.appendChild(opt);
                    });
                }
            }
        });
    }

    // ---------- Weather Preview (Open-Meteo) ----------
    async function updateWeatherPreview() {
        if (!weatherPreviewDiv) return;
        const mainCountry = countryInput.value;
        const mainCity = mainCityInputs[0]?.value || cityInput0.value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!mainCity || !mainCountry || !startDate) {
            weatherPreviewDiv.innerHTML = '<i class="fa-solid fa-cloud-rain"></i> Please fill destination and start date in previous steps.';
            return;
        }
        
        weatherPreviewDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching weather data...';
        
        try {
            // Geocoding with Open-Meteo
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(mainCity)}&count=1&language=en&format=json`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();
            if (!geoData.results || geoData.results.length === 0) {
                weatherPreviewDiv.innerHTML = '⚠️ Could not locate city. Try a more specific city name.';
                return;
            }
            const { latitude, longitude, name, country } = geoData.results[0];
            
            // Get forecast for date range (up to 7 days)
            const today = new Date();
            const start = new Date(startDate);
            let end = endDate ? new Date(endDate) : new Date(startDate);
            end.setDate(end.getDate() + 1);
            const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            const forecastDays = Math.min(diffDays, 7);
            
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=${forecastDays}`;
            const weatherRes = await fetch(weatherUrl);
            const weatherData = await weatherRes.json();
            
            if (weatherData.daily) {
                let weatherHtml = `<div style="background:#f0f7ff; border-radius:20px; padding:12px;"><strong>${name}, ${country}</strong><br>`;
                for (let i = 0; i < weatherData.daily.time.length; i++) {
                    const date = weatherData.daily.time[i];
                    const max = weatherData.daily.temperature_2m_max[i];
                    const min = weatherData.daily.temperature_2m_min[i];
                    const code = weatherData.daily.weathercode[i];
                    let emoji = '☀️';
                    if (code >= 51 && code <= 67) emoji = '🌧️';
                    else if (code >= 71 && code <= 77) emoji = '❄️';
                    else if (code >= 80 && code <= 99) emoji = '⛈️';
                    weatherHtml += `<div>📅 ${date}: ${emoji} ${min}°C ~ ${max}°C</div>`;
                }
                weatherHtml += `</div><div class="note"><i class="fa-regular fa-clock"></i> Forecast for first ${forecastDays} days</div>`;
                weatherPreviewDiv.innerHTML = weatherHtml;
            } else {
                weatherPreviewDiv.innerHTML = '🌡️ Weather data not available.';
            }
        } catch (err) {
            console.error(err);
            weatherPreviewDiv.innerHTML = '❌ Weather service error. Please try later.';
        }
    }

    // ---------- Step Navigation Logic ----------
    function updateStepUI() {
        steps.forEach((step, idx) => {
            step.classList.toggle('active', idx === currentStep);
        });
        stepDots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx <= currentStep);
            if (idx < stepDots.length - 1) {
                const line = stepLines[idx];
                if (line) line.classList.toggle('active', idx < currentStep);
            }
        });
        prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-flex';
        nextBtn.textContent = currentStep === steps.length - 1 ? 'Finish' : 'Next →';
        if (currentStep === steps.length - 1) {
            updateWeatherPreview();
        }
    }
    
    async function goNext() {
        // Basic validation per step
        if (currentStep === 0) {
            const country = countryInput.value;
            const firstCity = mainCityInputs[0]?.value || cityInput0.value;
            if (!country || !firstCity) {
                alert('Please select at least a country and a city.');
                return;
            }
        }
        if (currentStep === 1) {
            const start = document.getElementById('startDate').value;
            const end = document.getElementById('endDate').value;
            if (!start) {
                alert('Please select a start date.');
                return;
            }
            if (end && new Date(end) < new Date(start)) {
                alert('End date cannot be before start date.');
                return;
            }
        }
        if (currentStep < steps.length - 1) {
            currentStep++;
            updateStepUI();
        } else {
            alert('✨ Trip saved! Check your dashboard. (Demo flow completed)');
            // In real app, save to localStorage or backend
        }
    }
    
    function goPrev() {
        if (currentStep > 0) {
            currentStep--;
            updateStepUI();
        }
    }
    
    nextBtn.addEventListener('click', goNext);
    prevBtn.addEventListener('click', goPrev);
    
    // ---------- Initialize Everything ----------
    async function initialize() {
        await fetchCountries();
        
        // Setup main country autocomplete
        setupCountryAutocomplete(countryInput, 'countryListDynamic', () => countriesList);
        
        // Setup second country if multi-country toggled
        if (multiCountryToggle) {
            multiCountryToggle.addEventListener('change', (e) => {
                extraCountriesDiv.style.display = e.target.checked ? 'block' : 'none';
                if (e.target.checked && country2Input) setupSecondCountryAndCity();
            });
            extraCountriesDiv.style.display = 'none';
        }
        
        // Setup main city fields: initial city + track dynamic
        mainCityInputs = [cityInput0];
        // Create and assign dynamic datalist for initial city input0
        const mainDatalistId = 'mainCityDatalist0';
        let mainDatalist = document.getElementById(mainDatalistId);
        if (!mainDatalist) {
            mainDatalist = document.createElement('datalist');
            mainDatalist.id = mainDatalistId;
            document.body.appendChild(mainDatalist);
        }
        cityInput0.setAttribute('list', mainDatalistId);
        // Filter + fetch integration for initial city
        const refreshMainCities = async () => {
            const country = countryInput.value;
            if (!country) return;
            const cities = await fetchCitiesForCountry(country);
            const filterCities = (term) => {
                const filtered = term ? cities.filter(c => c.toLowerCase().includes(term.toLowerCase())) : cities;
                mainDatalist.innerHTML = '';
                filtered.slice(0, 50).forEach(city => {
                    const opt = document.createElement('option');
                    opt.value = city;
                    mainDatalist.appendChild(opt);
                });
            };
            cityInput0.addEventListener('input', (e) => filterCities(e.target.value));
            filterCities(cityInput0.value);
        };
        countryInput.addEventListener('change', refreshMainCities);
        await refreshMainCities();
        
        // Enable add city button
        if (addCityBtn) {
            addCityBtn.addEventListener('click', addCityField);
        }
        
        // Initialize second country if any
        if (country2Input && city2Input) {
            setupCountryAutocomplete(country2Input, 'countryListDyn2', () => countriesList);
            const secondDatalistId = 'cityDatalistSecond';
            let secondDatalist = document.getElementById(secondDatalistId);
            if (!secondDatalist) {
                secondDatalist = document.createElement('datalist');
                secondDatalist.id = secondDatalistId;
                document.body.appendChild(secondDatalist);
            }
            city2Input.setAttribute('list', secondDatalistId);
            const refreshSecondCity = async () => {
                const country2 = country2Input.value;
                if (!country2) return;
                const cities = await fetchCitiesForCountry(country2);
                const filterCities = (term) => {
                    const filtered = term ? cities.filter(c => c.toLowerCase().includes(term.toLowerCase())) : cities;
                    secondDatalist.innerHTML = '';
                    filtered.slice(0, 50).forEach(city => {
                        const opt = document.createElement('option');
                        opt.value = city;
                        secondDatalist.appendChild(opt);
                    });
                };
                city2Input.addEventListener('input', (e) => filterCities(e.target.value));
                filterCities(city2Input.value);
            };
            country2Input.addEventListener('change', refreshSecondCity);
            await refreshSecondCity();
        }
        
        // Also handle date change for weather update in step 4
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        if (startDateInput) startDateInput.addEventListener('change', () => { if (currentStep === 3) updateWeatherPreview(); });
        if (endDateInput) endDateInput.addEventListener('change', () => { if (currentStep === 3) updateWeatherPreview(); });
        
        // Time travel toggle (just UI flair)
        const timeTravelToggle = document.getElementById('timeTravelToggle');
        if (timeTravelToggle) {
            timeTravelToggle.addEventListener('change', (e) => {
                if (e.target.checked) weatherPreviewDiv.innerHTML += '<div class="time-travel-note"><i class="fa-regular fa-hourglass-half"></i> Time travel mode: simulating future weather window.</div>';
                updateWeatherPreview();
            });
        }
        
        updateStepUI();
    }
    
    initialize().catch(console.warn);
});
