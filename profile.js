// profile.js – waits for window.currentUser and displays profile
let supabaseClient = null;
let currentUser = null;

// Wait for shared.js to set up window.sb and window.currentUser
let attempts = 0;
const interval = setInterval(async () => {
  attempts++;
  if (window.sb) {
    clearInterval(interval);
    supabaseClient = window.sb;
    // Get fresh session to ensure we have the latest user
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    window.currentUser = currentUser;
    loadProfile();
    attachEventListeners();
  } else if (attempts > 30) {
    clearInterval(interval);
    // Fallback: show guest
    document.getElementById('userName').innerText = 'Guest';
    document.getElementById('userEmail').innerText = 'Not logged in';
    document.getElementById('avatar').innerText = '👤';
  }
}, 200);

function loadProfile() {
  const isLoggedIn = !!(currentUser && supabaseClient);
  const editBtn = document.getElementById('editNameBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (isLoggedIn) {
    const fullName = currentUser.user_metadata?.full_name || 
                     currentUser.user_metadata?.name || 
                     currentUser.email?.split('@')[0] || 
                     'User';
    document.getElementById('userName').innerText = fullName;
    document.getElementById('userEmail').innerText = currentUser.email;
    document.getElementById('avatar').innerText = fullName.charAt(0).toUpperCase();
    if (editBtn) editBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  } else {
    document.getElementById('userName').innerText = 'Guest';
    document.getElementById('userEmail').innerText = 'Not logged in';
    document.getElementById('avatar').innerText = '👤';
    if (editBtn) editBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  }
}

function attachEventListeners() {
  // Edit name button
  const editNameBtn = document.getElementById('editNameBtn');
  const displaySection = document.getElementById('displayNameSection');
  const editSection = document.getElementById('editNameSection');
  const editInput = document.getElementById('editNameInput');
  const saveBtn = document.getElementById('saveNameBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  
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
      if (!supabaseClient || !currentUser) { window.showToast('Not logged in', 'danger'); return; }
      try {
        const { error } = await supabaseClient.auth.updateUser({
          data: { full_name: newName, name: newName }
        });
        if (error) throw error;
        // Update local user object
        currentUser.user_metadata = { ...currentUser.user_metadata, full_name: newName, name: newName };
        window.currentUser = currentUser;
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

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      if (supabaseClient) await supabaseClient.auth.signOut();
      window.location.href = 'index.html';
    };
  }

  // Dark mode toggle
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

  // Export data
  const exportBtn = document.getElementById('exportBtn');
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

  // Delete local data
  const deleteBtn = document.getElementById('deleteAccountBtn');
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      if (confirm('Delete all local trips? (Cloud trips remain)')) {
        localStorage.removeItem('userTrips');
        window.showToast('Local data cleared', 'success');
      }
    };
  }
}
