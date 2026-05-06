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

// Logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        if (window.signOut) window.signOut();
        else alert('Sign out function not available');
    };
}

// Dark mode toggle
const darkToggle = document.getElementById('darkModeToggle');
if (darkToggle) {
    // Load saved preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkToggle.checked = true;
    }
    darkToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
        // Optional: show a small toast
        if (window.showToast) window.showToast(`Dark mode ${e.target.checked ? 'on' : 'off'}`, 'info');
    });
}

// Export All Data (from localStorage)
const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
    exportBtn.onclick = () => {
        // Collect both userTrips and currentTripMetadata
        const userTrips = localStorage.getItem('userTrips');
        const currentTrip = localStorage.getItem('currentTripMetadata');
        const exportData = {
            userTrips: userTrips ? JSON.parse(userTrips) : [],
            currentTrip: currentTrip ? JSON.parse(currentTrip) : null,
            version: '1.0',
            exportedAt: new Date().toISOString()
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wanderpack_backup_${new Date().toISOString().slice(0,19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        if (window.showToast) window.showToast('Data exported!', 'success');
        else alert('Data exported');
    };
}

// Delete Local Data (clear all localStorage)
const deleteBtn = document.getElementById('deleteAccountBtn');
if (deleteBtn) {
    deleteBtn.onclick = () => {
        if (confirm('⚠️ Delete ALL local trips? This cannot be undone. Your cloud data (if logged in) will remain.')) {
            // Remove only app‑specific keys, not theme or others
            localStorage.removeItem('userTrips');
            localStorage.removeItem('currentTripMetadata');
            localStorage.removeItem('currentPackingList');
            localStorage.removeItem('wanderpack_trips'); // older key
            if (window.showToast) window.showToast('Local data cleared', 'danger');
            else alert('Local data cleared');
            // Optionally reload the trips page or refresh
            setTimeout(() => {
                if (confirm('Refresh the page to see changes?')) window.location.reload();
            }, 500);
        }
    };
}

// Load user info
window.initAuth().then(loadProfile);
