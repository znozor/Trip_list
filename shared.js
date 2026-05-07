// Fix viewport on every page load (catches OAuth redirects)
(function fixViewportAfterOAuth() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    // Toggle content to force browser re-evaluation
    meta.content = '';
    requestAnimationFrame(() => {
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover';
    });
  }
  window.scrollTo(0, 1);
  window.scrollTo(0, 0);
})();



// shared.js – direct Google redirect (no intermediate page) with session sync
(function() {
  let sb = null;
  window.currentUser = null;

  // Toast
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

  // Custom popup
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

  // Init Supabase
  try {
    if (window.CONFIG && window.CONFIG.SUPABASE_URL && window.supabase) {
      sb = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
      window.sb = sb;
    }
  } catch(e) { console.warn(e); }

  // Force session refresh (call this on every page load)
  async function refreshSession() {
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      window.currentUser = session?.user || null;
      console.log('Session refreshed:', window.currentUser?.email || 'none');
    }
    return window.currentUser;
  }
  window.refreshSession = refreshSession;

  // Run immediately
  refreshSession();

  // Auth functions
  window.initAuth = refreshSession;

  window.signInWithGoogle = async function() {
    if (!sb) { window.showToast('Supabase not ready', 'danger'); return; }
    // Direct redirect to plan.html (no intermediate page)
    const redirectUrl = window.location.origin + '/callback.html';
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false
      }
    });
    if (error) window.showToast(error.message, 'danger');
  };

  window.signUpWithEmail = async function(email, password, fullName) {
    if (!sb) { window.showToast('Supabase not ready', 'danger'); return; }
    const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
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
    window.location.href = 'plan.html';
  };

  window.signOut = async function() {
    if (sb) await sb.auth.signOut();
    window.location.href = 'index.html';
  };

  // Auth state listener
  if (sb) {
    sb.auth.onAuthStateChange(async (event, session) => {
      window.currentUser = session?.user || null;
      if (event === 'SIGNED_IN') {
        const name = window.currentUser.user_metadata?.full_name ||
                     window.currentUser.user_metadata?.name ||
                     window.currentUser.email?.split('@')[0] ||
                     'Traveler';
        window.showCustomPopup(`Welcome, ${name}! 🎒`, 'success');
        const path = window.location.pathname;
        if (path.includes('index.html') || path === '/' || path.includes('login.html')) {
          window.location.href = 'plan.html';
        }
      }
    });
  }

  // Trip helpers (keep as before)
  function rowToTrip(row) { /* same as your existing */ return row; }
  window.saveTripToSupabase = async function(tripData) { /* your existing */ };
  window.getTripsFromSupabase = async function() { /* your existing */ };
  window.requestNotificationPermission = function() { /* your existing */ };
})();
