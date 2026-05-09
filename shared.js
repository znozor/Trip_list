// shared.js – complete working version with Supabase trip storage
(function() {
  let sb = null;
  window.currentUser = null;

  // ================= HELPER: ROW TO TRIP =================
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

  // ================= TOAST =================
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

  // ================= CUSTOM POPUP =================
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

  // ================= SUPABASE INIT =================
  try {
    if (window.CONFIG && window.CONFIG.SUPABASE_URL && window.supabase) {
      sb = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
      window.sb = sb;
    }
  } catch(e) { console.warn(e); }

  // ================= FORCE SESSION REFRESH =================
  async function refreshSession() {
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      window.currentUser = session?.user || null;
      console.log('Session refreshed:', window.currentUser?.email || 'none');
    }
    return window.currentUser;
  }
  window.refreshSession = refreshSession;
  refreshSession();

  // ================= AUTH FUNCTIONS =================
  window.initAuth = refreshSession;

  window.signInWithGoogle = async function() {
    if (!sb) { window.showToast('Supabase not ready', 'danger'); return; }
    const redirectUrl = window.location.origin + '/plan.html';
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

  // ================= AUTH STATE LISTENER (with OAuth reload fix) =================
  if (sb) {
    sb.auth.onAuthStateChange(async (event, session) => {
      window.currentUser = session?.user || null;

      if (event === 'SIGNED_IN') {
        // Clear OAuth flag and reload to fix viewport
        if (sessionStorage.getItem('_oauth')) {
          sessionStorage.removeItem('_oauth');
          const name = window.currentUser.user_metadata?.full_name ||
                       window.currentUser.user_metadata?.name ||
                       window.currentUser.email?.split('@')[0] ||
                       'Traveler';
          sessionStorage.setItem('_welcome', name);
          window.location.replace(window.location.pathname);
          return;
        }

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

      if (event === 'INITIAL_SESSION' && session && sessionStorage.getItem('_welcome')) {
        const name = sessionStorage.getItem('_welcome');
        sessionStorage.removeItem('_welcome');
        window.showCustomPopup(`Welcome, ${name}! 🎒`, 'success');
      }
    });
  }

  // ================= TRIP HELPERS (Supabase storage) =================
  window.saveTripToSupabase = async function(tripData) {
    if (!sb || !window.currentUser) {
      console.warn('Cannot save: not logged in');
      return null;
    }
    const { title, startDate, endDate, reason, style, travelersCount, luggage, packingList, preferences, weather } = tripData;
    const { data, error } = await sb.from('trips').insert({
      user_id: window.currentUser.id,
      title: title,
      start_date: startDate,
      end_date: endDate,
      travel_reason: reason,
      travel_style: style,
      travelers_count: travelersCount || 1,
      luggage_type: luggage,
      packing_list_json: packingList,
      preferences_json: preferences,
      weather_json: weather
    }).select().single();
    if (error) {
      window.showToast(error.message, 'danger');
      return null;
    }
    return rowToTrip(data);
  };

  window.getTripsFromSupabase = async function() {
    if (!sb || !window.currentUser) return [];
    const { data, error } = await sb
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

})();
