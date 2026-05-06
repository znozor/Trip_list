async function loadProfile() {
  const user = window.currentUser;
  if (user) {
    document.getElementById('userName').innerText = user.user_metadata?.full_name || user.email;
    document.getElementById('userEmail').innerText = user.email;
    document.getElementById('avatar').innerText = (user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase();
  } else {
    document.getElementById('userName').innerText = 'Guest';
    document.getElementById('userEmail').innerText = 'Not logged in';
  }
}
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.onclick = signOut;
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
document.getElementById('exportBtn')?.addEventListener('click', () => {
  const trips = JSON.parse(localStorage.getItem('wanderpack_trips') || '[]');
  const dataStr = JSON.stringify(trips, null, 2);
  const blob = new Blob([dataStr], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'wanderpack-data.json'; a.click(); URL.revokeObjectURL(url);
  showToast('Data exported');
});
document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
  if (confirm('Delete all local trips?')) { localStorage.removeItem('wanderpack_trips'); showToast('Local data cleared'); }
});
initAuth().then(loadProfile);
