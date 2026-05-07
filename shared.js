// shared.js – fixed full version with safe Supabase handling
(function () {

  // ================= DEBUG =================
  function debug(msg, isError = false) {
    const area = document.getElementById('debugArea');
    const span = document.getElementById('debugMsg');

    if (area && span) {
      span.innerText = msg;
      area.style.display = 'block';

      if (isError) {
        area.style.background = '#ffcccc';
      } else {
        area.style.background = '#ffe0e0';
      }

      setTimeout(() => {
        area.style.display = 'none';
      }, 8000);
    }

    console.log(msg);
  }

  debug('shared.js started');

  // ================= SUPABASE =================

  let sb = null;
  let currentUser = null;

  try {

    // Check CONFIG
    if (!window.CONFIG) {
      debug('ERROR: config.js not loaded', true);
    }

    // Check CDN
    else if (!window.supabase) {
      debug('ERROR: Supabase CDN not loaded', true);
    }

    // Check keys
    else if (
      !window.CONFIG.SUPABASE_URL ||
      !window.CONFIG.SUPABASE_ANON_KEY
    ) {
      debug('ERROR: Missing Supabase URL or ANON KEY', true);
    }

    // Create client
    else {

      sb = window.supabase.createClient(
        window.CONFIG.SUPABASE_URL,
        window.CONFIG.SUPABASE_ANON_KEY
      );

      window.sb = sb;

      debug('Supabase client created successfully');

    }

  } catch (e) {
    debug('Supabase init error: ' + e.message, true);
  }

  window.currentUser = currentUser;

  // ================= TOAST =================

  window.showToast = function (msg, type = 'info') {

    let container = document.getElementById('toastContainer');

    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');

    toast.className = `toast ${type}`;

    toast.innerHTML = `
      <i class="fa-solid ${
        type === 'success'
          ? 'fa-circle-check'
          : 'fa-circle-info'
      }"></i>
      ${msg}
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  // ================= INIT AUTH =================

  window.initAuth = async function () {

    if (window.sb) {

      const {
        data: { session }
      } = await window.sb.auth.getSession();

      window.currentUser = session?.user || null;
      currentUser = window.currentUser;
    }

    return window.currentUser;
  };

  // ================= GOOGLE SIGN IN =================

  window.signInWithGoogle = async function () {

    debug('signInWithGoogle called');

    if (!window.sb) {

      const msg =
        'Supabase not ready. Check CDN, config.js and internet connection.';

      debug(msg, true);
      window.showToast(msg, 'danger');

      return;
    }

    try {

      const redirectUrl =
        window.location.origin + '/plan.html';

      debug('Redirect URL: ' + redirectUrl);

      const { data, error } =
        await window.sb.auth.signInWithOAuth({

          provider: 'google',

          options: {
            redirectTo: redirectUrl
          }

        });

      if (error) {

        debug('Google login error: ' + error.message, true);
        window.showToast(error.message, 'danger');

      } else {

        debug('Google OAuth started');
        console.log(data);

      }

    } catch (err) {

      debug('Unexpected error: ' + err.message, true);
      window.showToast(err.message, 'danger');

    }

  };

  // ================= EMAIL SIGNUP =================

  window.signUpWithEmail = async function (
    email,
    password,
    fullName
  ) {

    if (!window.sb) {
      window.showToast(
        'Demo mode – signup disabled',
        'warning'
      );
      return;
    }

    const { error } = await window.sb.auth.signUp({

      email,
      password,

      options: {
        data: {
          full_name: fullName
        }
      }

    });

    if (error) {

      window.showToast(error.message, 'danger');

    } else {

      window.showToast(
        'Check your email to confirm',
        'success'
      );

    }

  };

  // ================= EMAIL LOGIN =================

  window.signInWithEmail = async function (
    email,
    password
  ) {

    if (!window.sb) {

      window.showToast(
        'Demo mode – login disabled',
        'warning'
      );

      return;
    }

    const { error } =
      await window.sb.auth.signInWithPassword({

        email,
        password

      });

    if (error) {

      window.showToast(error.message, 'danger');

    } else {

      window.location.href = 'plan.html';

    }

  };

  // ================= SIGN OUT =================

  window.signOut = async function () {

    if (window.sb) {
      await window.sb.auth.signOut();
    }

    window.location.href = 'index.html';

  };

  // ================= AUTH STATE =================

  if (window.sb) {

    window.sb.auth.onAuthStateChange(

      (event, session) => {

        window.currentUser = session?.user || null;
        currentUser = window.currentUser;

        console.log('Auth Event:', event);

        // Redirect after login
        if (
          event === 'SIGNED_IN' &&
          (
            window.location.pathname.includes('index.html') ||
            window.location.pathname === '/'
          )
        ) {

          window.location.href = 'plan.html';

        }

      }

    );

  }

  // ================= PLACEHOLDERS =================

  function rowToTrip(row) {
    return row;
  }

  window.saveTripToSupabase = async function (
    tripData
  ) {

    if (!window.sb) return null;

    return tripData;
  };

  window.getTripsFromSupabase = async function () {

    if (!window.sb) return [];

    return [];

  };

  window.requestNotificationPermission = function () {

    if ('Notification' in window) {

      Notification.requestPermission()
        .then(permission => {

          debug(
            'Notification permission: ' + permission
          );

        });

    }

  };

  // ================= FINAL =================

  debug(
    'shared.js finished – signInWithGoogle type: ' +
    typeof window.signInWithGoogle
  );

})();
