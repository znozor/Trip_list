import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let supabase = null;
let currentUser = null;
try {
  if (window.CONFIG && window.CONFIG.SUPABASE_URL) {
    supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
} catch(e) { console.log('Supabase not configured'); }

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
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
  }
  return currentUser;
};

window.signInWithGoogle = async function() {
  if (!supabase) { showToast('Demo mode – no backend', 'warning'); return; }
  await supabase.auth.signInWithOAuth({ provider: 'google' });
};

window.signUpWithEmail = async function(email, password, fullName) {
  if (!supabase) { showToast('Demo mode – signup disabled', 'warning'); return; }
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) showToast(error.message, 'danger');
  else showToast('Check email to confirm', 'success');
};

window.signInWithEmail = async function(email, password) {
  if (!supabase) { showToast('Demo mode – login disabled', 'warning'); return; }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) showToast(error.message, 'danger');
  else window.location.href = 'plan.html';
};

window.signOut = async function() {
  if (supabase) await supabase.auth.signOut();
  window.location.href = 'index.html';
};

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    if (event === 'SIGNED_IN' && window.location.pathname.includes('index.html'))
      window.location.href = 'plan.html';
  });
}

window.saveTripToSupabase = async function(tripData) {
  if (!supabase || !currentUser) return null;
  const { data, error } = await supabase.from('trips').insert({
    user_id: currentUser.id,
    title: tripData.title,
    start_date: tripData.startDate,
    end_date: tripData.endDate,
    travel_reason: tripData.reason,
    travel_style: tripData.style,
    travelers_count: tripData.travelersCount || 1,
    luggage_type: tripData.luggage
  }).select().single();
  if (error) showToast(error.message, 'danger');
  return data;
};

window.getTripsFromSupabase = async function() {
  if (!supabase || !currentUser) return [];
  const { data, error } = await supabase.from('trips').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  if (error) showToast(error.message, 'danger');
  return data || [];
};

window.requestNotificationPermission = function() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
};
