// profile.js – always uses window.refreshSession to get the latest user
let currentUser = null;

async function loadProfile() {
  // Force refresh from Supabase (ensures after Google login we have the user)
  if (window.refreshSession) {
    currentUser = await window.refreshSession();
  } else if (window.sb) {
    const { data: { session } } = await window.sb.auth.getSession();
    currentUser = session?.user || null;
  } else {
    currentUser = null;
  }
  window.currentUser = currentUser;

  const editBtn = document.getElementById('editNameBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const displaySection = document.getElementById('displayNameSection');
  const editSection = document.getElementById('editNameSection');
  const editInput = document.getElementById('editNameInput');

  if (currentUser) {
    const fullName = currentUser.user_metadata?.full_name ||
                     currentUser.user_metadata?.name ||
                     currentUser.email?.split('@')[0] ||
                     'User';
    document.getElementById('userName').innerText = fullName;
    document.getElementById('userEmail').innerText = currentUser.email;
    document.getElementById('avatar').innerText = fullName.charAt(0).toUpperCase();
    if (editBtn) editBtn.style.display = 'inline-flex';
    if (displaySection) displaySection.style.display = 'block';
    if (editSection) editSection.style.display = 'none';
  } else {
    document.getElementById('userName').innerText = 'Guest';
    document.getElementById('userEmail').innerText = 'Not logged in';
    document.getElementById('avatar').innerText = '👤';
    if (editBtn) editBtn.style.display = 'none';
  }
  if (logoutBtn) logoutBtn.style.display = 'inline-flex';
}

function attachEventListeners() {
  // Edit name, save, cancel, logout, dark mode, export, delete – same as before
  // (keep your existing attachEventListeners function – it’s fine)
  const editNameBtn = document.getElementById('editNameBtn');
  const displaySection = document.getElementById('displayNameSection');
  const editSection = document.getElementById('editNameSection');
  const editInput = document.getElementById('editNameInput');
  const saveBtn = document.getElementById('saveNameBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const darkToggle = document.getElementById('darkModeToggle');
  const exportBtn = document.getElementById('exportBtn');
  const deleteBtn = document.getElementById('deleteAccountBtn');

  if (editNameBtn) {
    editNameBtn.onclick = () => {
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
      if (!window.sb) { window.showToast('Not connected', 'danger'); return; }
      try {
        const { error } = await window.sb.auth.updateUser({
          data: { full_name: newName, name: newName }
        });
        if (error) throw error;
        window.showToast('Name updated!', 'success');
        await loadProfile(); // refresh
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
      if (window.sb) await window.sb.auth.signOut();
      window.location.href = 'index.html';
    };
  }

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

  if (exportBtn) {
    exportBtn.onclick = () => {
      const trips = JSON.parse(localStorage.getItem('userTrips') || '[]');
      const dataStr = JSON.stringify(trips, null, 2);
      const blob = new Blob([dataStr], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'wanderpack-data.json'; a.click(); URL.revokeObjectURL(url);
      window.showToast('Data exported', 'success');
    };
  }

  if (deleteBtn) {
    deleteBtn.onclick = () => {
      if (confirm('Delete all local trips? (Cloud trips remain)')) {
        localStorage.removeItem('userTrips');
        window.showToast('Local data cleared', 'success');
      }
    };
  }
}

// Load profile when DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
  await loadProfile();
  attachEventListeners();
});
