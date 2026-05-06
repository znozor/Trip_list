import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let supabase = null;
let currentUser = null;

try {
  if (window.CONFIG && window.CONFIG.SUPABASE_URL) {
    supabase = createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
  } else {
    console.warn('Supabase not configured – guest mode only');
  }
} catch(e) { console.warn('Supabase init error:', e); }

// Expose supabase and currentUser globally
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
  if (!window.supabase) { window.showToast('Demo mode – no backend', 'warning'); return; }
  await window.supabase.auth.signInWithOAuth({ provider: 'google' });
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
    luggage_type: tripData.luggage
  }).select().single();
  if (error) window.showToast(error.message, 'danger');
  return data;
};

window.getTripsFromSupabase = async function() {
  if (!window.supabase || !window.currentUser) return [];
  const { data, error } = await window.supabase.from('trips').select('*').eq('user_id', window.currentUser.id).order('created_at', { ascending: false });
  if (error) window.showToast(error.message, 'danger');
  return data || [];
};

window.requestNotificationPermission = function() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
};
