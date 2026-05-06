// weather.js
export async function getWeatherForTrip(country, city, startDate, endDate, simClose = false) {
  const today = new Date();
  const tripStart = new Date(startDate);
  const daysUntilTrip = Math.ceil((tripStart - today) / (1000*60*60*24));
  
  // Phase 2: within 14 days – use real forecast
  if (daysUntilTrip <= 14 || simClose) {
    return await getRealForecast(city, country, startDate);
  }
  // Phase 1: far out – use historical climate averages (mock or from weatherbit)
  return getClimateAverages(city, country, startDate);
}

async function getRealForecast(city, country, startDate) {
  const apiKey = window.CONFIG?.WEATHERBIT_API_KEY;
  if (!apiKey) {
    console.warn('No Weatherbit API key, using mock forecast');
    return { temp: 22, condition: 'rainy', icon: '🌧️', note: 'Mock forecast – add your API key' };
  }
  // Weatherbit 16-day forecast API
  const url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&days=16&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.data && data.data.length) {
    const forecast = data.data[0]; // first day of forecast
    return {
      temp: forecast.temp,
      condition: forecast.weather.description,
      icon: forecast.weather.icon,
      note: `Real forecast: ${forecast.weather.description}, ${forecast.temp}°C`
    };
  }
  return { temp: 22, condition: 'unknown', icon: '🌥️', note: 'Forecast unavailable' };
}

function getClimateAverages(city, country, startDate) {
  // Simple mock – you can expand with real climate API later
  const month = new Date(startDate).toLocaleString('default', { month: 'long' });
  const climates = {
    Tokyo: { summer: { temp: 28, condition: 'hot & humid', icon: '☀️' }, winter: { temp: 8, condition: 'cold', icon: '❄️' } },
    Paris: { summer: { temp: 24, condition: 'mild', icon: '⛅' }, winter: { temp: 5, condition: 'rainy', icon: '🌧️' } }
  };
  const isSummer = ['June','July','August'].includes(month);
  const data = climates[city]?.summer || { temp: 22, condition: 'pleasant', icon: '🌤️' };
  return { temp: data.temp, condition: data.condition, icon: data.icon, note: `Historical average for ${city} in ${month}` };
}
