import { getWeatherForTrip } from './weather.js';

let currentTrip = null;
let packingList = null;

async function generateAndRenderList() {
  const weather = await getWeatherForTrip(currentTrip.country, currentTrip.city, currentTrip.startDate, currentTrip.endDate, currentTrip.simClose);
  packingList = {
    mandatory: { title: 'Mandatory', items: ['Passport','Wallet','Phone charger','Meds'] },
    weather: { title: `Weather: ${weather.condition} (${weather.temp}°C)`, items: [] },
    activity: { title: 'Activity‑based', items: [] }
  };
  if (weather.condition.includes('rain')) packingList.weather.items.push('Umbrella', 'Rain jacket');
  if (weather.temp > 25) packingList.weather.items.push('Sunscreen', 'Hat', 'Shorts');
  if (weather.temp < 10) packingList.weather.items.push('Coat', 'Gloves');
  // ... add activity items based on currentTrip.activities
  renderPackingList();
}
