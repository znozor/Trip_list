import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let supabase = null;
try { if (window.CONFIG) supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY); } catch(e) { console.warn("No config"); }

let currentUser = null;

function showToast(msg, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerHTML = `<i class="fa-solid ${type==='success'?'fa-circle-check':'fa-circle-info'}"></i> ${msg}`;
  container.appendChild(toast); setTimeout(() => toast.remove(), 3000);
}

async function initAuth() { if(supabase) { const {data:{session}} = await supabase.auth.getSession(); currentUser = session?.user || null; } return currentUser; }
async function signInWithGoogle() { if(!supabase) { showToast('Demo mode','warning'); return; } await supabase.auth.signInWithOAuth({ provider:'google' }); }
async function signUpWithEmail(email, password, fullName) { if(!supabase) { showToast('Demo mode','warning'); return; } await supabase.auth.signUp({ email, password, options:{ data:{ full_name:fullName } } }); showToast('Check email to confirm','success'); }
async function signInWithEmail(email, password) { if(!supabase) { showToast('Demo mode','warning'); return; } const {error} = await supabase.auth.signInWithPassword({ email, password }); if(error) showToast(error.message,'danger'); else window.location.href='plan.html'; }
async function signOut() { if(supabase) await supabase.auth.signOut(); window.location.href='index.html'; }
if(supabase) supabase.auth.onAuthStateChange((e,session) => { currentUser = session?.user || null; if(e==='SIGNED_IN' && location.pathname.includes('index.html')) location.href='plan.html'; });
async function saveTripToSupabase(tripData) { if(!supabase || !currentUser) return null; const {data,error}=await supabase.from('trips').insert({ user_id:currentUser.id, title:tripData.title, start_date:tripData.startDate, end_date:tripData.endDate, travel_reason:tripData.reason, travel_style:tripData.style, travelers_count:tripData.travelersCount||1, luggage_type:tripData.luggage }).select().single(); if(error) showToast(error.message,'danger'); return data; }
async function getTripsFromSupabase() { if(!supabase || !currentUser) return []; const {data,error}=await supabase.from('trips').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}); if(error) showToast(error.message,'danger'); return data||[]; }

window.showToast=showToast; window.initAuth=initAuth; window.signInWithGoogle=signInWithGoogle; window.signUpWithEmail=signUpWithEmail; window.signInWithEmail=signInWithEmail; window.signOut=signOut; window.saveTripToSupabase=saveTripToSupabase; window.getTripsFromSupabase=getTripsFromSupabase;
