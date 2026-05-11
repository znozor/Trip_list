// plan.js – improved UI, smarter weather-aware packing list generation
document.addEventListener('DOMContentLoaded', () => {

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const countryInput       = document.getElementById('countryInput');
  const cityInput          = document.getElementById('cityInput0');
  const cityFieldsContainer= document.getElementById('cityFields');
  const startDateInput     = document.getElementById('startDate');
  const endDateInput       = document.getElementById('endDate');
  const nextBtn            = document.getElementById('nextBtn');
  const prevBtn            = document.getElementById('prevBtn');
  const steps              = document.querySelectorAll('.form-step');
  const stepDots           = document.querySelectorAll('.step-dot');
  const stepLines          = document.querySelectorAll('.step-line');
  const stepLabelItems     = document.querySelectorAll('.step-label-item');
  const weatherPreviewDiv  = document.getElementById('weatherPreview');
  const durationBadge      = document.getElementById('durationBadge');

  // ── State ─────────────────────────────────────────────────────────────────
  let countriesList    = [];
  let citiesCache      = new Map();
  let mainCityInputs   = [cityInput];
  let weatherForecasts = [];
  let selectedReason     = 'Leisure';
  let selectedStyle      = 'Standard';
  let selectedWho        = 'Solo';
  let selectedActivities = ['Hiking', 'City Tours'];
  let selectedLuggage    = 'Checked';

  // ── Countries ─────────────────────────────────────────────────────────────
  async function fetchCountries() {
    try {
      const res  = await fetch('https://restcountries.com/v3.1/all?fields=name');
      if (!res.ok) throw new Error();
      const data = await res.json();
      countriesList = data.map(c => c.name.common).sort();
    } catch {
      countriesList = ['Japan','France','Italy','Thailand','USA','Spain','UK','Germany','Canada','Australia','India','Brazil','Mexico','Portugal','Greece','Turkey','Indonesia','Vietnam','Morocco','New Zealand'];
    }
  }

  // ── Cities ────────────────────────────────────────────────────────────────
  async function fetchCities(countryName) {
    if (!countryName) return [];
    if (citiesCache.has(countryName)) return citiesCache.get(countryName);
    try {
      const res  = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName })
      });
      const data = await res.json();
      const cities = data.data?.length ? data.data : ['Unknown City'];
      citiesCache.set(countryName, cities);
      return cities;
    } catch {
      const fallback = ['Tokyo','Paris','Rome','Bangkok','New York','Madrid','London','Berlin','Sydney','Mumbai'];
      citiesCache.set(countryName, fallback);
      return fallback;
    }
  }

  // ── Autocomplete ──────────────────────────────────────────────────────────
  class Autocomplete {
    constructor(input, fetchFn, onSelect) {
      this.input   = input;
      this.fetchFn = fetchFn;
      this.onSelect= onSelect;

      this.wrap = document.createElement('div');
      this.wrap.className = 'autocomplete-container';
      this.drop = document.createElement('div');
      this.drop.className = 'autocomplete-suggestions';
      this.wrap.appendChild(this.drop);
      input.parentNode.insertBefore(this.wrap, input.nextSibling);

      input.addEventListener('input',  () => this.update());
      input.addEventListener('focus',  () => this.update());
      document.addEventListener('click', e => {
        if (!this.wrap.contains(e.target) && e.target !== input) this.hide();
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && this.drop.children.length) {
          e.preventDefault();
          this.selectItem(this.drop.children[0]);
        }
      });
    }
    async update() {
      const q = this.input.value.trim();
      if (!q) { this.hide(); return; }
      const list = await this.fetchFn(q);
      if (!list.length) { this.hide(); return; }
      this.drop.innerHTML = '';
      list.slice(0, 8).forEach(s => {
        const d = document.createElement('div');
        d.textContent = s;
        d.addEventListener('click', () => this.selectItem(d));
        this.drop.appendChild(d);
      });
      this.show();
    }
    selectItem(d) {
      this.input.value = d.textContent;
      if (this.onSelect) this.onSelect(this.input.value);
      this.hide();
    }
    show() { this.drop.style.display = 'block'; }
    hide() { this.drop.style.display = 'none'; }
  }

  async function initAutocompletes() {
    await fetchCountries();
    new Autocomplete(countryInput, async q =>
      countriesList.filter(c => c.toLowerCase().includes(q.toLowerCase())),
      val => { fetchCities(val); }
    );
    new Autocomplete(cityInput, async q => {
      const country = countryInput.value;
      if (!country) return [];
      const cities = await fetchCities(country);
      return cities.filter(c => c.toLowerCase().includes(q.toLowerCase()));
    }, null);
  }

  window.addCityField = function () {
    const idx = mainCityInputs.length;
    const wrap = document.createElement('div');
    wrap.className = 'city-row';
    wrap.style.marginTop = '8px';
    const label = document.createElement('label');
    label.className = 'input-label';
    label.textContent = `City ${idx + 1}`;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-field';
    input.placeholder = 'Type or select city';
    wrap.appendChild(label);
    wrap.appendChild(input);
    cityFieldsContainer.appendChild(wrap);
    mainCityInputs.push(input);
    new Autocomplete(input, async q => {
      const country = countryInput.value;
      if (!country) return [];
      const cities = await fetchCities(country);
      return cities.filter(c => c.toLowerCase().includes(q.toLowerCase()));
    }, null);
  };

  // ── Trip duration helper ──────────────────────────────────────────────────
  function getTripDays() {
    if (!startDateInput.value || !endDateInput.value) return 0;
    const diff = (new Date(endDateInput.value) - new Date(startDateInput.value)) / 86400000;
    return Math.max(1, Math.round(diff) + 1);
  }

  function updateDurationBadge() {
    if (!durationBadge) return;
    const days = getTripDays();
    if (days > 0) {
      const label = days === 1 ? 'day' : 'days';
      durationBadge.innerHTML = `
        <span class="duration-badge">
          <i class="fa-solid fa-calendar-check"></i>
          ${days} ${label} · ${days <= 3 ? 'Short trip' : days <= 7 ? 'Week trip' : days <= 14 ? 'Two-week trip' : 'Extended trip'}
        </span>`;
    } else {
      durationBadge.innerHTML = '';
    }
  }

  // ── Weather ───────────────────────────────────────────────────────────────
  async function fetchDailyForecast(city, country, startDate, endDate) {
    try {
      const geoRes  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results?.length) return null;
      const { latitude, longitude, name } = geoData.results[0];

      const days = endDate
        ? Math.min(Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1, 7)
        : 3;

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto&forecast_days=${days}`;
      const wRes  = await fetch(url);
      const wData = await wRes.json();
      if (!wData.daily) return null;

      const daily = wData.daily.time.map((date, i) => {
        const code   = wData.daily.weathercode[i];
        const max    = wData.daily.temperature_2m_max[i];
        const min    = wData.daily.temperature_2m_min[i];
        const precip = wData.daily.precipitation_sum[i];
        let icon = '☀️', condition = 'Sunny';
        if (code >= 1  && code <= 3)  { icon = '⛅'; condition = 'Cloudy'; }
        if (code >= 51 && code <= 67) { icon = '🌧️'; condition = 'Rainy'; }
        if (code >= 71 && code <= 77) { icon = '❄️'; condition = 'Snowy'; }
        if (code >= 80 && code <= 82) { icon = '🌦️'; condition = 'Showers'; }
        if (code >= 95 && code <= 99) { icon = '⛈️'; condition = 'Stormy'; }
        return { date, max, min, precip, code, icon, condition };
      });
      return { city: name, daily };
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async function updateWeatherPreview() {
    const country = countryInput.value;
    const cities  = mainCityInputs.map(i => i.value).filter(Boolean);
    const start   = startDateInput.value;
    const end     = endDateInput.value;

    if (!country || !cities.length || !start) {
      weatherPreviewDiv.innerHTML = `
        <div class="weather-placeholder">
          <i class="fa-solid fa-cloud-moon"></i>
          <span>Fill in destination & start date to see your forecast.</span>
        </div>`;
      return;
    }

    weatherPreviewDiv.innerHTML = `
      <div class="weather-loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Fetching live forecast…</span>
      </div>`;

    const forecasts = [];
    for (const city of cities) {
      const f = await fetchDailyForecast(city, country, start, end);
      if (f) forecasts.push(f);
    }

    if (!forecasts.length) {
      weatherPreviewDiv.innerHTML = `
        <div class="weather-error">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Could not fetch weather. Check city names and try again.</span>
        </div>`;
      return;
    }

    weatherForecasts = forecasts;

    let html = '';
    forecasts.forEach((f, i) => {
      const collapsed = i > 0 ? 'collapsed' : '';
      html += `
        <div class="weather-city-card ${collapsed}">
          <div class="weather-city-header">
            <span><i class="fa-solid fa-location-dot" style="color:var(--primary);margin-right:6px"></i>${f.city}</span>
            <i class="fa-solid fa-chevron-down"></i>
          </div>
          <div class="weather-days">
            ${f.daily.map(d => `
              <div class="weather-day">
                <span class="date">${d.date.slice(5)}</span>
                <span class="icon">${d.icon}</span>
                <span class="temp">${Math.round(d.min)}°–${Math.round(d.max)}°C</span>
                ${d.precip > 0 ? `<span class="rain">💧${d.precip}mm</span>` : ''}
              </div>`).join('')}
          </div>
        </div>`;
    });

    html += `
      <div class="weather-note">
        <i class="fa-regular fa-lightbulb"></i>
        Your packing list will be tailored to the most extreme weather across all your cities.
      </div>`;

    weatherPreviewDiv.innerHTML = html;

    document.querySelectorAll('.weather-city-header').forEach(h => {
      h.addEventListener('click', () => {
        h.closest('.weather-city-card').classList.toggle('collapsed');
      });
    });
  }

  // ── Weather combiner ──────────────────────────────────────────────────────
  function combineWeather(forecasts) {
    let tempSum = 0, count = 0;
    const w = { avgTemp: 20, condition: 'Mild', rainy: false, snowy: false, stormy: false, hot: false, cold: false, humid: false };
    for (const f of forecasts) {
      for (const d of f.daily) {
        const avg = (d.max + d.min) / 2;
        tempSum += avg; count++;
        if (d.condition === 'Rainy' || d.condition === 'Showers') w.rainy = true;
        if (d.condition === 'Snowy')  w.snowy   = true;
        if (d.condition === 'Stormy') w.stormy  = true;
        if (avg > 28) w.hot  = true;
        if (avg < 8)  w.cold = true;
        if (d.precip > 5) w.humid = true;
      }
    }
    w.avgTemp = count ? tempSum / count : 20;
    if (w.snowy)        w.condition = 'Snowy';
    else if (w.stormy)  w.condition = 'Stormy';
    else if (w.rainy)   w.condition = 'Rainy';
    else if (w.hot)     w.condition = 'Hot';
    else if (w.cold)    w.condition = 'Cold';
    else                w.condition = 'Mild';
    return w;
  }

  // ── Smart packing list generator ──────────────────────────────────────────
  function generatePackingList(weather, prefs) {
    const { condition, rainy, snowy, stormy, hot, cold, avgTemp } = weather;
    const { reason, style, who, activities, luggage } = prefs;
    const days = getTripDays() || 5;
    const items = [];
    const isBackpacker = style === 'Backpacker';
    const isLuxury     = style === 'Luxury';
    const isBusiness   = reason === 'Business';
    const isHoneymoon  = reason === 'Honeymoon';
    const isFamily     = who === 'Family';
    const isCouple     = who === 'Couple' || isHoneymoon;
    const carryOnly    = luggage === 'Carry-on';

    // Clothing quantities based on trip length
    const shirts  = carryOnly ? 3 : Math.min(Math.ceil(days * 0.7), 7);
    const bottoms = carryOnly ? 2 : Math.min(Math.ceil(days * 0.4), 5);
    const socks   = carryOnly ? 3 : Math.min(days, 7);

    function add(name, category, reason, essential = true) {
      items.push({ name, category, reason, essential, checked: false });
    }

    // ── CLOTHING ─────────────────────────────────────────────────────────
    if (hot) {
      add(`Lightweight t-shirts (×${shirts})`, 'Clothing', 'Hot weather – breathable fabrics essential', true);
      add(`Shorts or linen trousers (×${bottoms})`, 'Clothing', `${Math.round(avgTemp)}°C average – stay cool`, true);
      if (!isBusiness) add('Sandals or breathable shoes', 'Footwear', 'Hot pavement and comfort', true);
      if (isLuxury) add('Resort-wear / light linen shirt', 'Clothing', 'Smart-casual for upscale venues', false);
      if (activities.includes('Beach')) add('Swimwear (×2)', 'Clothing', 'Beach time', true);
    } else if (cold) {
      add(`Thermal base layers (×2)`, 'Clothing', `${Math.round(avgTemp)}°C – insulation essential`, true);
      add(`Warm sweaters / fleece (×${Math.min(bottoms + 1, 4)})`, 'Clothing', 'Mid-layer warmth', true);
      add('Heavy insulated jacket', 'Clothing', 'Cold temperatures – outer shell', true);
      add(`Jeans / thick trousers (×${bottoms})`, 'Clothing', 'Warmth and comfort', true);
      add('Thermal socks (×' + socks + ')', 'Clothing', 'Keep feet warm', true);
      add('Gloves, scarf & beanie set', 'Accessories', 'Prevent heat loss from extremities', true);
      add('Lip balm', 'Toiletries', 'Cold air causes chapping', false);
    } else {
      // Mild
      add(`T-shirts (×${shirts})`, 'Clothing', 'Mild weather, versatile layering', true);
      add(`Jeans / trousers (×${bottoms})`, 'Clothing', 'Everyday wear', true);
      add('Light jacket or cardigan', 'Clothing', 'Cool evenings and air-con', true);
      add(`Socks (×${socks})`, 'Clothing', 'Daily essentials', true);
    }

    if (snowy) {
      add('Waterproof snow boots', 'Footwear', 'Snow and slush – essential', true);
      add('Waterproof / insulated gloves', 'Accessories', 'Grip and warmth in snow', true);
    }
    if (rainy || stormy) {
      add('Waterproof rain jacket', 'Gear', 'Rain forecast – keep dry', true);
      add('Compact travel umbrella', 'Gear', 'Sudden showers', true);
      if (!hot) add('Waterproof shoes or overshoes', 'Footwear', 'Wet streets', false);
    }

    // Smart underwear quantity
    add(`Underwear (×${carryOnly ? 4 : Math.min(days, 8)})`, 'Clothing', 'Daily essentials', true);

    // ── FOOTWEAR ─────────────────────────────────────────────────────────
    if (!hot && !cold && !snowy) {
      add('Comfortable walking shoes / sneakers', 'Footwear', 'All-day city walking', true);
    }
    if (isLuxury || isBusiness || isHoneymoon) {
      add('Dress shoes / smart sandals', 'Footwear', 'Fine dining and formal occasions', false);
    }

    // ── BUSINESS ─────────────────────────────────────────────────────────
    if (isBusiness) {
      add(`Formal shirts / blouses (×${Math.min(Math.ceil(days / 2), 4)})`, 'Business', 'Professional meetings', true);
      add('Suit jacket or blazer', 'Business', 'Key meetings and presentations', true);
      add('Dress trousers / formal skirt', 'Business', 'Professional attire', true);
      add('Laptop + charger', 'Electronics', 'Work essential', true);
      add('Business cards', 'Documents', 'Networking', false);
      add('Portable WiFi or SIM card', 'Electronics', 'Stay connected for work', false);
      add('Notebook & pens', 'Business', 'Meeting notes', false);
    }

    // ── LUXURY ───────────────────────────────────────────────────────────
    if (isLuxury) {
      add('Smart casual evening outfits', 'Clothing', 'Upscale restaurants and venues', false);
      add('Jewelry / accessories set', 'Accessories', 'Complete your look', false);
      add('Silk sleep mask & earplugs', 'Comfort', 'Long-haul and hotel sleep quality', false);
      add('Portable steamer or wrinkle spray', 'Gear', 'Keep clothes pristine', false);
    }

    // ── HONEYMOON ────────────────────────────────────────────────────────
    if (isHoneymoon) {
      add('Romantic evening outfit', 'Clothing', 'Special dinners and celebrations', true);
      add('Swimwear (×2 each)', 'Clothing', 'Pool / beach time together', false);
    }

    // ── BACKPACKER ───────────────────────────────────────────────────────
    if (isBackpacker) {
      add('Microfibre travel towel', 'Gear', 'Compact and quick-drying', true);
      add('Padlock for hostel lockers', 'Security', 'Secure your valuables', true);
      add('Sleeping bag liner', 'Gear', 'Hostels and guesthouses', false);
      add('Duct tape (small roll)', 'Gear', 'Emergency repairs', false);
    }

    // ── FAMILY ───────────────────────────────────────────────────────────
    if (isFamily) {
      add('Children\'s clothing (per child)', 'Family', 'Extra changes for kids', true);
      add('Children\'s sunscreen SPF 50+', 'Health', 'Kids\' sensitive skin', true);
      add('Portable first-aid kit', 'Health', 'Kids\' minor cuts and bruises', true);
      add('Snacks & lunchbox', 'Food', 'Hungry kids on the go', true);
      add('Tablet or entertainment device', 'Electronics', 'Long journeys and downtime', false);
      add('Baby wipes (×3 packs)', 'Toiletries', 'Versatile and essential with kids', true);
      add('Stroller or baby carrier', 'Gear', 'City and site navigation with young children', false);
    }

    // ── ACTIVITIES ────────────────────────────────────────────────────────
    if (activities.includes('Hiking')) {
      add('Hiking boots (broken in)', 'Footwear', 'Ankle support on trails', true);
      add('Day backpack (20–30L)', 'Gear', 'Carry water, snacks, and layers', true);
      add('Reusable water bottle (1L)', 'Gear', 'Hydration on trails', true);
      add('Trekking poles (collapsible)', 'Gear', 'Knee support on descents', false);
      add('Energy bars / trail mix', 'Food', 'Quick fuel on the trail', false);
      add('Blister plasters', 'Health', 'Prevent and treat hotspots', true);
      if (cold || snowy) add('Gaiters', 'Gear', 'Keep boots dry in snow', false);
    }
    if (activities.includes('Beach')) {
      add('Sunscreen SPF 50+ (×2)', 'Health', 'Intense UV at the beach', true);
      add('Beach towel (large)', 'Accessories', 'Sand and sun sessions', true);
      add('Flip flops', 'Footwear', 'Hot sand and poolside', true);
      add('Dry bag / waterproof pouch', 'Gear', 'Protect phone and valuables', true);
      add('After-sun lotion', 'Health', 'Soothe skin after exposure', false);
      if (activities.includes('Water Sports')) {
        add('Rash guard / wetsuit top', 'Clothing', 'UV and abrasion protection', false);
        add('Waterproof watch', 'Accessories', 'Water activities', false);
      }
    }
    if (activities.includes('City Tours')) {
      add('Comfortable walking shoes (×2 pairs)', 'Footwear', 'All-day sightseeing', true);
      add('Day bag / cross-body bag', 'Accessories', 'Hands-free exploration', true);
      add('Portable charger (10,000mAh+)', 'Electronics', 'Maps and photos all day', true);
      add('Offline maps downloaded', 'Apps', 'Navigation without data', true);
      add('Reusable water bottle', 'Gear', 'Stay hydrated between sights', false);
    }
    if (activities.includes('Nightlife')) {
      add('Smart casual / going-out outfits', 'Clothing', 'Bars and clubs', true);
      add('Dressy shoes', 'Footwear', 'Venue dress codes', false);
      add('Portable battery pack', 'Electronics', 'Long nights out', false);
    }
    if (activities.includes('Museums')) {
      add('Comfortable flat shoes', 'Footwear', 'Long periods of standing', true);
      add('Light layer / cardigan', 'Clothing', 'Museum air-conditioning', false);
      add('Reusable tote bag', 'Accessories', 'Guidebooks and shop purchases', false);
    }
    if (activities.includes('Shopping')) {
      add('Foldable extra bag', 'Accessories', 'Carry purchases home', true);
      add('Copies of card / payment info', 'Documents', 'Backup if card is lost', false);
    }
    if (activities.includes('Dining')) {
      if (isLuxury || isHoneymoon) add('Smart outfit for fine dining', 'Clothing', 'Restaurant dress codes', false);
    }

    // ── SUN & HEAT ────────────────────────────────────────────────────────
    if (hot || activities.includes('Beach') || activities.includes('Hiking')) {
      if (!items.find(i => i.name.includes('Sunscreen'))) {
        add('Sunscreen SPF 30+', 'Health', 'UV protection', true);
      }
      add('Sun hat & sunglasses', 'Accessories', 'UV protection for face and eyes', true);
      add('Insect repellent', 'Health', 'Mosquitoes in warm regions', false);
    }

    // ── HEALTH & MEDICINE ─────────────────────────────────────────────────
    add('Prescription medications (full supply)', 'Health', 'Never run out abroad', true);
    add('Pain relievers (ibuprofen / paracetamol)', 'Health', 'Headaches, fever, aches', true);
    add('Antihistamines', 'Health', 'Allergies, insect bites, rashes', false);
    add('Stomach upset tablets (Imodium etc)', 'Health', 'Food changes and travel belly', true);
    add('Throat lozenges', 'Health', 'Air-con and dry air on flights', false);
    if (days > 7) {
      add('Vitamin supplements', 'Health', 'Immune support on longer trips', false);
    }
    if (rainy || cold) {
      add('Cold & flu tablets', 'Health', 'Cold weather and wet conditions', false);
    }
    add('Bandages & antiseptic wipes', 'Health', 'Minor cuts and scrapes', true);
    add('Motion sickness tablets', 'Health', 'Car, boat, or winding roads', false);
    add('Hand sanitiser (60ml+)', 'Health', 'Hygiene when soap unavailable', true);
    add('Face masks (×5)', 'Health', 'Crowded transport and flights', false);

    // ── TOILETRIES ────────────────────────────────────────────────────────
    add('Toothbrush & toothpaste', 'Toiletries', 'Oral hygiene', true);
    add('Shampoo & conditioner (travel size)', 'Toiletries', 'Hair care', true);
    add('Body wash / soap', 'Toiletries', 'Personal care', true);
    add('Deodorant', 'Toiletries', 'Freshness throughout the day', true);
    add('Moisturiser / face cream', 'Toiletries', 'Skin care, especially in AC or cold', false);
    if (isLuxury || isHoneymoon) {
      add('Perfume / cologne (travel size)', 'Toiletries', 'Personal scent', false);
    }
    if (isFamily) {
      add('Children\'s toothbrush & toothpaste', 'Toiletries', 'Kids\' dental care', true);
    }
    add('Razor & shaving cream', 'Toiletries', 'Grooming', false);
    add('Hair ties / brush / comb', 'Toiletries', 'Hair care', false);
    add('Cotton buds & nail clippers', 'Toiletries', 'Grooming essentials', false);

    // ── DOCUMENTS ────────────────────────────────────────────────────────
    add('Passport / national ID', 'Documents', 'Required at borders and hotels', true);
    add('Visa documentation (if required)', 'Documents', 'Check requirements for your destination', true);
    add('Flight & hotel booking confirmations', 'Documents', 'Check-in and proof of stay', true);
    add('Travel insurance documents', 'Documents', 'Medical and trip coverage', true);
    add('Emergency contacts list', 'Documents', 'Offline backup of key numbers', true);
    add('Copies of passport (digital + physical)', 'Documents', 'Emergency replacement', true);
    add('Vaccination certificate (if required)', 'Documents', 'Some destinations require proof', false);
    if (isBusiness) {
      add('Work contracts / presentation files', 'Documents', 'Professional meetings', false);
    }

    // ── ELECTRONICS ──────────────────────────────────────────────────────
    add('Smartphone + cable', 'Electronics', 'Communication, maps, photos', true);
    add('Universal travel adapter', 'Electronics', 'Different plug types abroad', true);
    add('Portable charger / power bank', 'Electronics', 'Backup battery on the go', days > 3 ? true : false);
    if (!isBusiness) {
      add('Camera or GoPro', 'Electronics', 'Capture memories', false);
    }
    add('Headphones / earbuds', 'Electronics', 'Flights and commutes', false);
    add('E-reader or books', 'Entertainment', 'Downtime and flights', false);

    // ── MONEY & SECURITY ──────────────────────────────────────────────────
    add('Wallet with foreign currency', 'Money', 'Cash for markets and tips', true);
    add('Credit / debit cards (×2)', 'Money', 'Backup payment method', true);
    add('Money belt or hidden pouch', 'Security', 'Pickpocket prevention', isBackpacker ? true : false);
    add('Padlock (TSA-approved)', 'Security', 'Luggage security', false);

    // ── CARRY-ON EXTRAS ───────────────────────────────────────────────────
    add('Neck pillow', 'Comfort', 'Long-haul flights and trains', false);
    add('Eye mask & earplugs', 'Comfort', 'Sleep on planes and in hostels', false);
    add('Reusable shopping bag', 'Accessories', 'Markets, picnics, eco-friendly', false);
    if (days > 10) {
      add('Laundry detergent pods (×5)', 'Gear', 'Wash clothes on long trips', false);
    }

    // ── LIMIT FOR CARRY-ON ────────────────────────────────────────────────
    if (carryOnly) {
      // Keep all essentials + top optionals, cap at 28
      const essentials = items.filter(i => i.essential);
      const optionals  = items.filter(i => !i.essential);
      return [...essentials, ...optionals].slice(0, 28);
    }

    return items;
  }

  // ── Generate and navigate to list ─────────────────────────────────────────
  async function generateList() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-cloud">
        <i class="fa-solid fa-cloud"></i>
        <div class="loading-dots"><span></span><span></span><span></span></div>
      </div>`;
    document.body.appendChild(overlay);

    const minLoad = new Promise(r => setTimeout(r, 900));

    try {
      const country = countryInput.value.trim();
      const cities  = mainCityInputs.map(i => i.value.trim()).filter(Boolean);
      const start   = startDateInput.value;
      const end     = endDateInput.value;

      if (!country || !cities.length || !start || !end) {
        alert('Please complete all fields before generating your list.');
        overlay.remove();
        return;
      }

      let forecasts = weatherForecasts;
      if (!forecasts.length) {
        for (const city of cities) {
          const f = await fetchDailyForecast(city, country, start, end);
          if (f) forecasts.push(f);
        }
      }

      const weather     = combineWeather(forecasts);
      const days        = getTripDays();
      const daysToTrip  = Math.ceil((new Date(start) - new Date()) / 86400000);
      const forecastType= daysToTrip <= 14 ? 'real' : 'climate';

      const prefs = {
        reason: selectedReason, style: selectedStyle,
        who: selectedWho, activities: selectedActivities,
        luggage: selectedLuggage, travelersCount: 1
      };

      const packingList = generatePackingList(weather, prefs);

      const tripName = cities.length === 1
        ? `${cities[0]}, ${country} (${new Date(start).toLocaleDateString()})`
        : `${cities[0]}, ${country} +${cities.length - 1} more (${new Date(start).toLocaleDateString()})`;

      const tripData = {
        id: Date.now(),
        name: tripName,
        destinations: { main: { country, cities } },
        dates: { start, end },
        preferences: prefs,
        weather: { ...weather, forecastType },
        packingList,
        createdAt: new Date().toISOString()
      };

      sessionStorage.setItem('pendingTrip', JSON.stringify(tripData));
      await minLoad;
      window.location.href = 'list.html';
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
      overlay.remove();
    }
  }

  // ── Step navigation ───────────────────────────────────────────────────────
  let currentStep = 0;

  function updateStepUI() {
    steps.forEach((s, i) => s.classList.toggle('active', i === currentStep));
    stepDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentStep);
      dot.classList.toggle('done',   i <  currentStep);
    });
    stepLines.forEach((line, i) => line.classList.toggle('done', i < currentStep));
    stepLabelItems.forEach((lbl, i) => lbl.classList.toggle('active', i === currentStep));
    prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-flex';
    nextBtn.innerHTML = currentStep === steps.length - 1
      ? '<i class="fa-solid fa-magic-wand-sparkles"></i> Generate List'
      : 'Next →';
    if (currentStep === steps.length - 1) updateWeatherPreview();
    if (currentStep === 1) updateDurationBadge();
  }

  async function goNext() {
    if (currentStep === 0) {
      if (!countryInput.value.trim() || !mainCityInputs[0].value.trim()) {
        alert('Please enter a country and at least one city.');
        return;
      }
    }
    if (currentStep === 1) {
      if (!startDateInput.value) { alert('Please enter a start date.'); return; }
      if (!endDateInput.value)   { alert('Please enter an end date.'); return; }
      if (new Date(endDateInput.value) < new Date(startDateInput.value)) {
        alert('End date must be after start date.');
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

  function goPrev() {
    if (currentStep > 0) { currentStep--; updateStepUI(); }
  }

  nextBtn.addEventListener('click', goNext);
  prevBtn.addEventListener('click', goPrev);

  // ── Chips ─────────────────────────────────────────────────────────────────
  function initChips() {
    function bindChips(groupId, multiSelect, onChange) {
      const chips = document.querySelectorAll(`#${groupId} .chip`);
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          if (multiSelect) {
            chip.classList.toggle('selected');
          } else {
            chips.forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
          }
          onChange();
        });
      });
    }

    bindChips('chips-reason', false, () => {
      selectedReason = document.querySelector('#chips-reason .chip.selected')?.dataset.val || 'Leisure';
    });
    bindChips('chips-style', false, () => {
      selectedStyle = document.querySelector('#chips-style .chip.selected')?.dataset.val || 'Standard';
    });
    bindChips('chips-who', false, () => {
      selectedWho = document.querySelector('#chips-who .chip.selected')?.dataset.val || 'Solo';
    });
    bindChips('chips-luggage', false, () => {
      selectedLuggage = document.querySelector('#chips-luggage .chip.selected')?.dataset.val || 'Checked';
    });
    bindChips('chips-activities', true, () => {
      selectedActivities = Array.from(document.querySelectorAll('#chips-activities .chip.selected')).map(c => c.dataset.val);
    });
  }

  // ── Date listeners ────────────────────────────────────────────────────────
  startDateInput.addEventListener('change', () => {
    updateDurationBadge();
    if (currentStep === steps.length - 1) updateWeatherPreview();
  });
  endDateInput.addEventListener('change', () => {
    updateDurationBadge();
    if (currentStep === steps.length - 1) updateWeatherPreview();
  });

  // ── Init ─────────────────────────────────────────────────────────────────
  initAutocompletes();
  initChips();
  updateStepUI();
});
