const API_BASE = '/api';
let authToken = sessionStorage.getItem('printzooToken');

async function apiRequest(path, options = {}){
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

async function signIn(){
  const inputs = document.querySelectorAll('#s-login input');
  try {
    const result = await apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ mobile: inputs[0].value, password: inputs[1].value })
    });
    authToken = result.token;
    sessionStorage.setItem('printzooToken', authToken);
    go('s-home');
    showToast('✓ Signed in and ready for orders');
  } catch (error) {
    showToast(`✕ ${error.message}`);
  }
}

function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const nav = document.getElementById('navbar');
  nav.style.display = (id==='s-login') ? 'none' : 'flex';
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.t===id));
  window.scrollTo(0,0);
}
function nav(el){ go(el.dataset.t); }
async function toggleOnline(){
  const sw=document.getElementById('sw');
  sw.classList.toggle('on');
  const on = sw.classList.contains('on');
  document.getElementById('onlineLbl').textContent = on ? "You're Online 🟢" : "You're Offline 🔴";
  document.getElementById('onlineSub').textContent = on ? "Receiving orders near Anna Nagar" : "You won't receive new orders";
  try {
    await apiRequest('/availability', { method: 'POST', body: JSON.stringify({ online: on }) });
  } catch (error) {
    sw.classList.toggle('on');
    document.getElementById('onlineLbl').textContent = sw.classList.contains('on') ? "You're Online 🟢" : "You're Offline 🔴";
    document.getElementById('onlineSub').textContent = sw.classList.contains('on') ? "Receiving orders near Anna Nagar" : "You won't receive new orders";
    showToast(`✕ ${error.message}`);
  }
}
async function acceptOrder(btn){
  const card = btn.closest('.order-card');
  try {
    await apiRequest(`/orders/${card.dataset.orderId}/accept`, { method: 'POST' });
  } catch (error) {
    showToast(`✕ ${error.message}`);
    return;
  }
  card.querySelector('.pill').className='pill pickup';
  card.querySelector('.pill').textContent='GO TO PICKUP';
  btn.parentElement.innerHTML = '<button class="btn-sm call">📞 Call Shop</button><button class="btn-sm go">Navigate →</button>';
  showToast('✓ Order accepted! Head to pickup 🛵');
}
async function pickedUp(){
  try {
    await apiRequest('/orders/PZ-2847/pickup', { method: 'POST' });
    showToast('✓ Parcel picked up! Deliver to Rahul K. 🏠');
  } catch (error) {
    showToast(`✕ ${error.message}`);
  }
}
async function delivered(){
  try {
    await apiRequest('/orders/PZ-2847/deliver', { method: 'POST' });
    showToast('🎉 Order delivered! +₹42 earned');
  } catch (error) {
    showToast(`✕ ${error.message}`);
  }
}
function showToast(msg){
  const t=document.getElementById('toast');
  t.querySelector('div:nth-child(2)').innerHTML='<b>'+msg+'</b>';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2600);
}
setTimeout(()=>{ if(document.getElementById('s-login').classList.contains('active')) return; },100);
