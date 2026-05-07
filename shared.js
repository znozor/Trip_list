// shared.js – safe version with error logging to debug area
(function() {
  // Helper to show debug messages (if debugArea exists)
  function debug(msg, isError = false) {
    const area = document.getElementById('debugArea');
    const span = document.getElementById('debugMsg');
    if (area && span) {
      span.innerText = msg;
      area.style.display = 'block';
      if (isError) area.style.background = '#ffcccc';
      setTimeout(() => { area.style.display = 'none'; }, 8000);
    }
    console.log(msg);
  }

  debug('shared.js started');

  let supabaseClient = null;
  let currentUser = null;

  // Initialize Supabase using the global supabase object (from CDN)
  try {
    if (window.CONFIG && window.CONFIG.SUPABASE_URL && window.supabase) {
      supabaseClient = window.supabase.createClient(
        window.CONFIG.SUPABASE_URL,
        window.CONFIG.SUPABASE_ANON_KEY
      );
      debug('Supabase client created');
    } else if (!window.supabase) {
      debug('ERROR: Supabase CDN not loaded', true);
    } else if (!window.CONFIG) {
      debug('ERROR: config.js not loaded or missing CONFIG', true);
    } else {
      debug('Supabase not configured (guest mode)');
    }
  } catch (e) {
    debug('Supabase init error: ' + e.message, true);
  }

  window.supabase = supabaseClient;
  window.currentUser = currentUser;

  // Toast function (unchanged)
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

  window.initAuth = async function() {
    if (window.supabase) {
      const { data: { session } } = await window.supabase.auth.getSession();
      window.currentUser = session?.user || null;
      currentUser = window.currentUser;
    }
    return window.currentUser;
  };

  // ========== GOOGLE SIGN-IN (now always defined) ==========
  window.signInWithGoogle = async function() {
    debug('signInWithGoogle called');
    if (!window.supabase) {
      const msg = 'Supabase not ready. Check config.js and internet connection.';
      debug(msg, true);
      window.showToast(msg, 'danger');
      return;
    }
    try {
      const { error } = await window.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/plan.html' }
      });
      if (error) {
        debug('Google login error: ' + error.message, true);
        window.showToast(error.message, 'danger');
      } else {
        debug('Google OAuth started – redirecting');
      }
    } catch (err) {
      debug('Unexpected error: ' + err.message, true);
      window.showToast(err.message, 'danger');
    }
  };

  // Email signup / login
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

  // Auth state change listener
  if (window.supabase) {
    window.supabase.auth.onAuthStateChange((event, session) => {
      window.currentUser = session?.user || null;
      currentUser = window.currentUser;
      if (event === 'SIGNED_IN' && window.location.pathname.includes('index.html')) {
        window.location.href = 'plan.html';
      }
    });
  }

  // Trip helpers (unchanged, keep them)
  function rowToTrip(row) { /* same as before */ }
  window.saveTripToSupabase = async function(tripData) { /* same */ };
  window.getTripsFromSupabase = async function() { /* same */ };
  window.requestNotificationPermission = function() { /* same */ };

  debug('shared.js finished – signInWithGoogle is now ' + (typeof window.signInWithGoogle));
})();
