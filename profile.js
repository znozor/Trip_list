// profile.js – full version with edit name for logged-in users
let supabaseClient = null;
let currentUser = null;

// Wait for shared.js to set up window.sb
let attempts = 0;
const interval = setInterval(async () => {
  attempts++;
  if (window.sb) {
    clearInterval(interval);
    supabaseClient = window.sb;
    // Get fresh session
    const { data: { session } } = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    loadProfile();
    setupEventListeners();
  } else if (attempts > 25) {
    clearInterval(interval);
    console.warn('Supabase not ready');
    // Fallback: display as guest
    document.getElementById('userName').innerText = 'Guest';
    document.getElementById('userEmail').innerText = 'Not logged in';
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

function setupEventListeners() {
  // Edit name button
  const editNameBtn = document.getElementById('editNameBtn');
  const displaySection = document.getElementById('displayNameSection');
  const editSection = document.getElementById('editNameSection');
  const editInput = document.getElementById('editNameInput');
  const saveBtn = document.getElementById('saveNameBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  
  if (editNameBtn) {
    editNameBtn.addEventListener('click', () => {
      // Pre-fill input with current name
      const currentName = document.getElementById('userName').innerText;
      editInput.value = currentName;
      displaySection.style.display = 'none';
      editSection.style.display = 'block';
    });
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const newName = editInput.value.trim();
      if (!newName) {
        showToast('Name cannot be empty', 'warning');
        return;
      }
      if (!supabaseClient || !currentUser) {
        showToast('Not logged in', 'danger');
        return;
      }
      try {
        // Update user metadata in Supabase Auth
        const { error } = await supabaseClient.auth.updateUser({
          data: { full_name: newName, name: newName }
        });
        if (error) throw error;
        
        // Also update public.users table if you have one (optional but good)
        if (window.currentUser?.id) {
          await supabaseClient
            .from('users')
            .update({ full_name: newName })
            .eq('id', window.currentUser.id);
        }
        
        // Update local currentUser object
        currentUser.user_metadata = { ...currentUser.user_metadata, full_name: newName, name: newName };
        window.currentUser = currentUser;
        
        // Update displayed name
        document.getElementById('userName').innerText = newName;
        document.getElementById('avatar').innerText = newName.charAt(0).toUpperCase();
        
        showToast('Name updated!', 'success');
        
        // Return to display mode
        displaySection.style.display = 'block';
        editSection.style.display = 'none';
      } catch (err) {
        showToast('Error: ' + err.message, 'danger');
      }
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      displaySection.style.display = 'block';
      editSection.style.display = 'none';
    });
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (supabaseClient) await supabaseClient.auth.signOut();
      window.location.href = 'index.html';
    });
  }
  
  // Dark mode toggle
  const darkToggle = document.getElementById('darkModeToggle');
  if (darkToggle) {
    darkToggle.addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : '');
      localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
    });
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      darkToggle.checked = true;
    }
  }
  
  // Export data
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const trips = JSON.parse(localStorage.getItem('userTrips') || '[]');
      const dataStr = JSON.stringify(trips, null, 2);
      const blob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wanderpack-data.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported', 'success');
    });
  }
  
  // Delete local data (guest trips)
  const deleteBtn = document.getElementById('deleteAccountBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('Delete all local trips? (Cloud trips remain)')) {
        localStorage.removeItem('userTrips');
        showToast('Local data cleared', 'success');
      }
    });
  }
}
