// profile.js
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
document.getElementById('logoutBtn').onclick = () => signOut();
document.getElementById('darkToggle').addEventListener('change', e => document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : ''));
function exportData() { alert('Would download trips data – implement if needed'); }
function deleteAllData() { if(confirm('Permanently delete all local trips?')) { localStorage.removeItem('wanderpack_trips'); showToast('Local data cleared'); } }
initAuth().then(loadProfile);
