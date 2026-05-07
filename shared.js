// shared.js – uses window.supabase from global CDN
let supabase = null;
let currentUser = null;

function showGlobalDebug(msg) {
  const div = document.getElementById('debugMsg');
  if (div) {
    div.innerText = msg;
    const area = document.getElementById('debugArea');
    if (area) area.style.display = 'block';
    setTimeout(() => { if (area) area.style.display = 'none'; }, 8000);
  }
  console.log(msg);
}
showGlobalDebug('shared.js loaded');

// Initialize Supabase using the global supabase object from CDN
try {
  if (window.CONFIG && window.CONFIG.SUPABASE_URL && window.supabase) {
    supabase = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
    showGlobalDebug('Supabase client created');
  } else if (!window.supabase) {
    showGlobalDebug('ERROR: supabase CDN not loaded');
  } else {
    showGlobalDebug('Supabase not configured (guest mode)');
  }
} catch(e) {
  console.warn('Supabase init error:', e);
  showGlobalDebug('Supabase init error: ' + e.message);
}

window.supabase = supabase;
window.currentUser = currentUser;

window.showToast = function(msg, type='info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type==='success'?'fa-circle-check':'fa-circle-info'}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

window.initAuth = async function() {
  if (window.supabase) {
    const { data: { session } } = await window.supabase.auth.getSession();
    window.currentUser = session?.user || null;
    currentUser = window.currentUser;
  }
  return window.currentUser;
};

window.signInWithGoogle = async function() {
  showGlobalDebug('signInWithGoogle called');
  if (!window.supabase) {
    const msg = 'Supabase not initialized. Check config.js and CDN.';
    showGlobalDebug(msg);
    window.showToast(msg, 'danger');
    return;
  }
  try {
    const { error } = await window.supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: { redirectTo: window.location.origin + '/plan.html' }
    });
    if (error) {
      showGlobalDebug('Google login error: ' + error.message);
      window.showToast(error.message, 'danger');
    } else {
      showGlobalDebug('Google OAuth started – redirecting');
    }
  } catch (err) {
    showGlobalDebug('Unexpected error: ' + err.message);
    window.showToast(err.message, 'danger');
  }
};

window.signUpWithEmail = async function(email, password, fullName) {
  if (!window.supabase) { window.showToast('Demo mode – signup disabled', 'warning'); return; }
  const { error } = await window.supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) window.showToast(error.message, 'danger');
  else window.showToast('Check email to confirm', 'success');
};

window.signInWithEmail = async function(email, password) {
  if (!window.supabase) { window.showToast('Demo mode – login disabled', 'warning'); return; }
  const { error } = await window.supabase.auth.signInWithPassword({ email, password });
  if (error) window.showToast(error.message, 'danger');
  else window.location.href = 'plan.html';
};

window.signOut = async function() {
  if (window.supabase) await window.supabase.auth.signOut();
  window.location.href = 'index.html';
};

if (window.supabase) {
  window.supabase.auth.onAuthStateChange((event, session) => {
    window.currentUser = session?.user || null;
    currentUser = window.currentUser;
    if (event === 'SIGNED_IN' && window.location.pathname.includes('index.html')) {
      window.location.href = 'plan.html';
    }
  });
}

function rowToTrip(row) {
  return {
    id: row.id,
    name: row.title,
    dates: { start: row.start_date, end: row.end_date },
    destinations: row.preferences_json?.destinations || { main: { country: '', cities: [] } },
    preferences: row.preferences_json || {},
    weather: row.weather_json || {},
    packingList: row.packing_list_json || [],
    createdAt: row.created_at,
    savedAt: row.updated_at
  };
}

window.saveTripToSupabase = async function(tripData) {
  if (!window.supabase || !window.currentUser) return null;
  const { data, error } = await window.supabase.from('trips').insert({
    user_id: window.currentUser.id,
    title: tripData.title,
    start_date: tripData.startDate,
    end_date: tripData.endDate,
    travel_reason: tripData.reason,
    travel_style: tripData.style,
    travelers_count: tripData.travelersCount || 1,
    luggage_type: tripData.luggage,
    packing_list_json: tripData.packingList,
    preferences_json: tripData.preferences,
    weather_json: tripData.weather
  }).select().single();
  if (error) window.showToast(error.message, 'danger');
  return data ? rowToTrip(data) : null;
};

window.getTripsFromSupabase = async function() {
  if (!window.supabase || !window.currentUser) return [];
  const { data, error } = await window.supabase
    .from('trips')
    .select('*')
    .eq('user_id', window.currentUser.id)
    .order('created_at', { ascending: false });
  if (error) {
    window.showToast(error.message, 'danger');
    return [];
  }
  return data.map(rowToTrip);
};

window.requestNotificationPermission = function() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
};
