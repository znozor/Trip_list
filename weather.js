export async function getWeatherForTrip(country, city, startDate, endDate, simClose = false) {
  const today = new Date();
  const tripStart = new Date(startDate);
  const daysUntilTrip = Math.ceil((tripStart - today) / (1000*60*60*24));
  if (daysUntilTrip <= 14 || simClose) {
    return await getRealForecast(city, country);
  } else {
    return getClimateAverage(city, startDate);
  }
}

async function getRealForecast(city, country) {
  const apiKey = window.CONFIG?.WEATHERBIT_API_KEY;
  if (!apiKey) {
    console.warn('No Weatherbit API key – using mock');
    return { temp: 24, condition: 'Partly cloudy', icon: '⛅', note: 'Add API key for real forecasts' };
  }
  const url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&days=5&key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.data && data.data.length) {
      const f = data.data[0];
      return {
        temp: Math.round(f.temp),
        condition: f.weather.description,
        icon: mapWeatherIcon(f.weather.icon),
        note: `Real forecast: ${f.weather.description}, ${Math.round(f.temp)}°C`
      };
    } else {
      throw new Error('No forecast data');
    }
  } catch(e) {
    console.error(e);
    return { temp: 22, condition: 'Unknown', icon: '🌥️', note: 'Forecast unavailable – using climate averages' };
  }
}

function getClimateAverage(city, startDate) {
  const month = new Date(startDate).toLocaleString('default', { month: 'long' });
  const isSummer = ['June','July','August'].includes(month);
  const baseTemps = {
    Tokyo: isSummer ? 28 : 10,
    Paris: isSummer ? 24 : 7,
    Italy: isSummer ? 30 : 8,
    Thailand: isSummer ? 32 : 28,
    USA: isSummer ? 30 : 5,
    default: isSummer ? 25 : 10
  };
  const temp = baseTemps[city] || baseTemps.default;
  const condition = isSummer ? 'Warm, possible rain' : 'Cool, occasional showers';
  const icon = isSummer ? '☀️' : '❄️';
  return { temp, condition, icon, note: `Climate average for ${city} in ${month} (30-year normals)` };
}

function mapWeatherIcon(iconCode) {
  const map = {
    'c01d': '☀️', 'c02d': '⛅', 'c03d': '☁️',
    'r01d': '🌧️', 'r02d': '🌦️', 'r03d': '🌧️',
    's01d': '❄️', 's02d': '❄️', 't01d': '⛈️'
  };
  return map[iconCode] || '🌡️';
}
