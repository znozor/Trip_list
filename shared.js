// ========== CUSTOM CONFIRM & PROMPT MODALS ==========
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[m]);
}

/**
 * Custom confirm dialog (OK / Cancel)
 * @param {string} message - The question to display
 * @returns {Promise<boolean>} - true if OK, false if Cancel
 */
function showConfirm(message) {
  return new Promise((resolve) => {
    // Remove any existing overlay
    const existing = document.querySelector('.custom-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'custom-confirm-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 100010;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 24px;
      padding: 28px 24px;
      width: 300px;
      max-width: calc(100vw - 40px);
      text-align: center;
      box-shadow: 0 24px 60px rgba(0,0,0,0.3);
      box-sizing: border-box;
    `;

    modal.innerHTML = `
      <i class="fa-solid fa-circle-question" style="font-size: 44px; color: #06A77D; margin-bottom: 12px; display: block;"></i>
      <h3 style="font-family: 'Syne', sans-serif; font-weight: 700; font-size: 17px; margin-bottom: 8px; color: #1e2b2c;">Confirm</h3>
      <p style="font-size: 13px; color: #6B7B8D; margin-bottom: 20px; line-height: 1.5;">${escapeHtml(message)}</p>
      <div style="display: flex; gap: 12px;">
        <button class="confirm-cancel-btn" style="flex:1; padding:12px 0; border-radius:30px; font-weight:600; background:#eef2f0; border:none; cursor:pointer;">Cancel</button>
        <button class="confirm-ok-btn" style="flex:1; padding:12px 0; border-radius:30px; font-weight:600; background:#06A77D; color:white; border:none; cursor:pointer;">OK</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cancelBtn = modal.querySelector('.confirm-cancel-btn');
    const okBtn = modal.querySelector('.confirm-ok-btn');
    const closeModal = (result) => {
      overlay.remove();
      resolve(result);
    };

    cancelBtn.onclick = () => closeModal(false);
    okBtn.onclick = () => closeModal(true);
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(false); };
  });
}

/**
 * Custom prompt dialog with text input
 * @param {string} message - Label text
 * @param {string} defaultValue - Optional default value
 * @returns {Promise<string|null>} - entered string or null if cancelled
 */
function showPrompt(message, defaultValue = '') {
  return new Promise((resolve) => {
    const existing = document.querySelector('.custom-prompt-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'custom-prompt-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 100010;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 24px;
      padding: 28px 24px;
      width: 300px;
      max-width: calc(100vw - 40px);
      text-align: center;
      box-shadow: 0 24px 60px rgba(0,0,0,0.3);
      box-sizing: border-box;
    `;

    modal.innerHTML = `
      <i class="fa-solid fa-pen-to-square" style="font-size: 44px; color: #06A77D; margin-bottom: 12px; display: block;"></i>
      <p style="font-size: 14px; font-weight: 500; margin-bottom: 16px; color: #1e2b2c;">${escapeHtml(message)}</p>
      <input type="text" id="customPromptInput" class="input-field" style="width:100%; padding:12px; border-radius:16px; border:1px solid #ddd; margin-bottom:20px; font-size:14px; box-sizing:border-box;" value="${escapeHtml(defaultValue)}">
      <div style="display: flex; gap: 12px;">
        <button class="prompt-cancel-btn" style="flex:1; padding:12px 0; border-radius:30px; font-weight:600; background:#eef2f0; border:none; cursor:pointer;">Cancel</button>
        <button class="prompt-ok-btn" style="flex:1; padding:12px 0; border-radius:30px; font-weight:600; background:#06A77D; color:white; border:none; cursor:pointer;">OK</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = modal.querySelector('#customPromptInput');
    input.focus();

    const cancelBtn = modal.querySelector('.prompt-cancel-btn');
    const okBtn = modal.querySelector('.prompt-ok-btn');
    const closeModal = (result) => {
      overlay.remove();
      resolve(result);
    };

    cancelBtn.onclick = () => closeModal(null);
    okBtn.onclick = () => closeModal(input.value);
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(null); };
    input.onkeypress = (e) => { if (e.key === 'Enter') closeModal(input.value); };
  });
}


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
      packingList: [],
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
    // Show welcome for email login before redirect
    const { data: { session } } = await sb.auth.getSession();
    const user = session?.user;
    const name = user?.user_metadata?.full_name ||
                 user?.user_metadata?.name ||
                 user?.email?.split('@')[0] ||
                 'Traveler';
    window.showCustomPopup(`Welcome, ${name}! 🎒`, 'success');
    setTimeout(() => { window.location.href = 'plan.html'; }, 1500);
  };

  window.signOut = async function() {
    if (sb) await sb.auth.signOut();
    window.location.href = 'index.html';
  };

  // ================= AUTH STATE LISTENER =================
  if (sb) {
  sb.auth.onAuthStateChange(async (event, session) => {
    window.currentUser = session?.user || null;

    if (event === 'SIGNED_IN') {
      // OAuth first landing — reload for clean viewport
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
      // Email login redirect
      const path = window.location.pathname;
      if (path.includes('index.html') || path === '/' || path.includes('login.html')) {
        window.location.href = 'plan.html';
      }
    }

    // Check _welcome on ANY event — catches both INITIAL_SESSION and SIGNED_IN
    if (session && sessionStorage.getItem('_welcome')) {
      const name = sessionStorage.getItem('_welcome');
      sessionStorage.removeItem('_welcome');
      setTimeout(() => {
        window.showCustomPopup(`Welcome, ${name}! 🎒`, 'success');
      }, 800);
    }
  });
}

  // ================= TRIP HELPERS =================
  window.saveTripToSupabase = async function(tripData) {
    if (!sb || !window.currentUser) {
      console.warn('Cannot save: not logged in');
      return null;
    }

    // 1. Save trip row
    const { data: trip, error: tripError } = await sb.from('trips').insert({
      user_id: window.currentUser.id,
      title: tripData.title,
      start_date: tripData.startDate,
      end_date: tripData.endDate,
      travel_reason: tripData.reason,
      travel_style: tripData.style,
      travelers_count: tripData.travelersCount || 1,
      luggage_type: tripData.luggage,
      preferences_json: tripData.preferences,
      weather_json: tripData.weather
    }).select().single();

    if (tripError) { window.showToast(tripError.message, 'danger'); return null; }

    // 2. Batch upsert all packing_items at once
    const { data: packingItems, error: itemsError } = await sb
      .from('packing_items')
      .upsert(
        tripData.packingList.map(item => ({ name: item.name, category: item.category })),
        { onConflict: 'name' }
      )
      .select();

    if (itemsError) {
      console.warn('packing_items error:', itemsError.message);
      return rowToTrip(trip);
    }

    // 3. Batch insert all trip_packing_items at once
    const links = packingItems.map(pi => ({
      trip_id: trip.id,
      packing_item_id: pi.id,
      status: tripData.packingList.find(i => i.name === pi.name)?.checked ? 'packed' : 'pending'
    }));

    const { error: linkError } = await sb.from('trip_packing_items').insert(links);
    if (linkError) console.warn('trip_packing_items error:', linkError.message);

    return rowToTrip(trip);
  };

  window.getTripsFromSupabase = async function() {
    if (!sb || !window.currentUser) return [];

    const { data, error } = await sb
      .from('trips')
      .select(`
        *,
        trip_packing_items (
          id,
          status,
          packing_items ( name, category )
        )
      `)
      .eq('user_id', window.currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      window.showToast(error.message, 'danger');
      return [];
    }

    return data.map(row => ({
      ...rowToTrip(row),
      packingList: (row.trip_packing_items || []).map(tpi => ({
        name: tpi.packing_items?.name || '',
        category: tpi.packing_items?.category || '',
        checked: tpi.status === 'packed'
      }))
    }));
  };

  window.requestNotificationPermission = function() {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  };

})();
