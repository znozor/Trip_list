// shared.js – full working version with welcome popup and correct user sync
(function() {

  let sb = null;
  let currentUser = null;

  // Toast helper (already present)
  window.showToast = function(msg, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // Custom popup (centered)
  window.showCustomPopup = function(message, type = 'success') {
    const existing = document.querySelector('.custom-popup');
    if (existing) existing.remove();
    const popup = document.createElement('div');
    popup.className = 'custom-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.zIndex = '10001';
    popup.style.backgroundColor = '#fff';
    popup.style.borderRadius = '28px';
    popup.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
    popup.style.padding = '20px 32px';
    popup.style.minWidth = '250px';
    popup.style.textAlign = 'center';
    popup.style.borderTop = `4px solid ${type === 'success' ? '#2E9C6E' : '#e74c3c'}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    popup.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; gap: 12px;"><i class="fa-solid ${icon}" style="font-size: 48px; color: ${type === 'success' ? '#2E9C6E' : '#e74c3c'};"></i><span style="font-size: 16px;">${message}</span></div>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
  };

  // Initialize Supabase
  try {
    if (window.CONFIG && window.CONFIG.SUPABASE_URL && window.supabase) {
      sb = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
      window.sb = sb;
    }
  } catch(e) { console.warn(e); }

  // Auth functions
  window.initAuth = async function() {
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      currentUser = session?.user || null;
      window.currentUser = currentUser;
    }
    return currentUser;
  };

  window.signInWithGoogle = async function() {
    if (!sb) { window.showToast('Supabase not ready', 'danger'); return; }
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/plan.html' }
    });
    if (error) window.showToast(error.message, 'danger');
  };

  window.signUpWithEmail = async function(email, password, fullName) {
    if (!sb) { window.showToast('Supabase not ready', 'danger'); return; }
    const { error } = await sb.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) window.showToast(error.message, 'danger');
    else window.showToast('Check your email to confirm!', 'success');
  };

  window.signInWithEmail = async function(email, password) {
    if (!sb) { window.showToast('Supabase not ready', 'danger'); return; }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        window.showToast('Invalid email or password', 'danger');
      } else {
        window.showToast(error.message, 'danger');
      }
      return;
    }
    // Welcome popup will be shown on auth state change after redirect
    window.location.href = 'plan.html';
  };

  window.signOut = async function() {
    if (sb) await sb.auth.signOut();
    window.location.href = 'index.html';
  };

  // Auth state listener – redirects and shows welcome popup
  if (sb) {
    sb.auth.onAuthStateChange(async (event, session) => {
      currentUser = session?.user || null;
      window.currentUser = currentUser;
      if (event === 'SIGNED_IN') {
        // Show welcome popup on the page that is loaded after redirect
        const name = currentUser.user_metadata?.full_name ||
                     currentUser.user_metadata?.name ||
                     currentUser.email?.split('@')[0] ||
                     'Traveler';
        window.showCustomPopup(`Welcome, ${name}! 🎒`, 'success');
        // If we are on index.html or login.html, redirect to plan.html
        const path = window.location.pathname;
        if (path.includes('index.html') || path === '/' || path.includes('login.html')) {
          window.location.href = 'plan.html';
        }
      }
    });
  }

  // Export trip functions (keep your existing ones, they are fine)
  window.saveTripToSupabase = async function(tripData) { /* your existing code */ };
  window.getTripsFromSupabase = async function() { /* your existing code */ };
  window.requestNotificationPermission = function() { /* your existing code */ };

})();
