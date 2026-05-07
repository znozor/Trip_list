// profile.js – works after any login (Google or email)
let supabaseClient = null;
let currentUser = null;

async function getUser() {
  if (!window.sb) return null;
  const { data: { session } } = await window.sb.auth.getSession();
  return session?.user || null;
}

async function loadProfile() {
  const user = await getUser();
  currentUser = user;
  if (user) {
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    document.getElementById('userName').innerText = fullName;
    document.getElementById('userEmail').innerText = user.email;
    document.getElementById('avatar').innerText = fullName.charAt(0).toUpperCase();
    document.getElementById('editNameBtn').style.display = 'inline-flex';
  } else {
    document.getElementById('userName').innerText = 'Guest';
    document.getElementById('userEmail').innerText = 'Not logged in';
    document.getElementById('avatar').innerText = '👤';
    document.getElementById('editNameBtn').style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Supabase client
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    if (window.sb) {
      clearInterval(interval);
      supabaseClient = window.sb;
      await loadProfile();
      attachEventListeners();
    } else if (attempts > 30) {
      clearInterval(interval);
      console.warn('Supabase not ready');
      document.getElementById('userName').innerText = 'Guest';
      document.getElementById('userEmail').innerText = 'Not logged in';
    }
  }, 200);
});

function attachEventListeners() {
  const editBtn = document.getElementById('editNameBtn');
  const displaySection = document.getElementById('displayNameSection');
  const editSection = document.getElementById('editNameSection');
  const editInput = document.getElementById('editNameInput');
  const saveBtn = document.getElementById('saveNameBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (editBtn) {
    editBtn.onclick = () => {
      const currentName = document.getElementById('userName').innerText;
      editInput.value = currentName;
      displaySection.style.display = 'none';
      editSection.style.display = 'block';
    };
  }

  if (saveBtn) {
    saveBtn.onclick = async () => {
      const newName = editInput.value.trim();
      if (!newName) { window.showToast('Name cannot be empty', 'warning'); return; }
      if (!supabaseClient || !currentUser) { window.showToast('Not logged in', 'danger'); return; }
      try {
        const { error } = await supabaseClient.auth.updateUser({
          data: { full_name: newName, name: newName }
        });
        if (error) throw error;
        // Also update local user object
        currentUser.user_metadata = { ...currentUser.user_metadata, full_name: newName, name: newName };
        document.getElementById('userName').innerText = newName;
        document.getElementById('avatar').innerText = newName.charAt(0).toUpperCase();
        window.showToast('Name updated!', 'success');
        displaySection.style.display = 'block';
        editSection.style.display = 'none';
      } catch (err) {
        window.showToast(err.message, 'danger');
      }
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      displaySection.style.display = 'block';
      editSection.style.display = 'none';
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      if (supabaseClient) await supabaseClient.auth.signOut();
      window.location.href = 'index.html';
    };
  }

  const darkToggle = document.getElementById('darkModeToggle');
  if (darkToggle) {
    darkToggle.onchange = (e) => {
      document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : '');
      localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
    };
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      darkToggle.checked = true;
    }
  }

  document.getElementById('exportBtn')?.addEventListener('click', () => {
    const trips = JSON.parse(localStorage.getItem('userTrips') || '[]');
    const dataStr = JSON.stringify(trips, null, 2);
    const blob = new Blob([dataStr], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'wanderpack-data.json'; a.click(); URL.revokeObjectURL(url);
    window.showToast('Data exported', 'success');
  });
  document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
    if (confirm('Delete all local trips?')) { localStorage.removeItem('userTrips'); window.showToast('Local data cleared', 'success'); }
  });
}
