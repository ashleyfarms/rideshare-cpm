const STRIPE_LINK = '';
const STRIPE_PORTAL = '';
const LICENSE_KEY = '';
const SUB_LABEL = 'Free · supported by sponsors';
const KEY = 'rscpm_v1';
const defaults = {
  mpg: 28, fuelPrice: 3.29, ins: 160, pay: 380, phone: 40, moMiles: 2500,
  maint: 0.08, dep: 0.12, thinFloor: 18,
  needNet: 200, needHrs: 8,
  paid: false, subStatus: '', subSince: '',
  shifts: [], live: { trips: [], gasDollars: 0, gasGal: 0 }
};
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults, live: { trips: [], gasDollars: 0, gasGal: 0 } };
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed, live: { ...defaults.live, ...(parsed.live || {}) } };
  } catch { return { ...defaults, live: { trips: [], gasDollars: 0, gasGal: 0 } }; }
}
let S = load();
function isPro() { return true; /* free + ads — all features unlocked */ }
function persist() {
  S.mpg = num('mpg', S.mpg); S.fuelPrice = num('fuelPrice', S.fuelPrice);
  S.ins = num('ins', S.ins); S.pay = num('pay', S.pay); S.phone = num('phone', S.phone);
  S.moMiles = num('moMiles', S.moMiles); S.maint = num('maint', S.maint);
  S.dep = num('dep', S.dep); S.thinFloor = num('thinFloor', S.thinFloor);
  S.needNet = num('needNet', S.needNet); S.needHrs = num('needHrs', S.needHrs);
  S.live.gasDollars = num('gasDollars', S.live.gasDollars);
  S.live.gasGal = num('gasGal', S.live.gasGal);
  localStorage.setItem(KEY, JSON.stringify(S));
}
function num(id, fallback=0) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = parseFloat(el.value);
  return Number.isFinite(v) ? v : fallback;
}
function setVal(id, v) { const el = document.getElementById(id); if (el && v !== undefined && v !== null && document.activeElement !== el) el.value = v; }
function costs() {
  const fuel = S.mpg > 0 ? S.fuelPrice / S.mpg : 0;
  const fixed = S.moMiles > 0 ? (S.ins + S.pay + S.phone) / S.moMiles : 0;
  const loaded = fuel + S.maint + S.dep + fixed;
  return { fuel, fixed, maint: S.maint, dep: S.dep, loaded };
}
function irsRate(d = new Date()) {
  const y = d.getFullYear(), m = d.getMonth();
  if (y < 2026) return 0.70;
  if (y === 2026 && m < 6) return 0.725;
  return 0.76;
}
function flash(msg, warn) {
  const el = document.getElementById('flash');
  el.className = warn ? 'banner warn' : 'banner';
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 6000);
}
function applyGates() {
  const pill = document.getElementById('proPill');
  pill.textContent = 'FREE';
  pill.classList.remove('pro');
  document.getElementById('offerLock').classList.add('hidden');
  document.getElementById('addTripBtn').disabled = false;
  document.getElementById('logLock').classList.add('hidden');
  document.getElementById('logForm').classList.remove('hidden');
  document.getElementById('histLock').classList.add('hidden');
  document.getElementById('histWrap').classList.remove('hidden');
}
function fillSetup() {
  ['mpg','fuelPrice','ins','pay','phone','moMiles','maint','dep','thinFloor'].forEach(k => setVal(k, S[k]));
  const c = costs();
  document.getElementById('setupMetrics').innerHTML = metric('Loaded $/mi', money(c.loaded))
    + metric('Fuel only $/mi', money(c.fuel))
    + metric('Fixed spread $/mi', money(c.fixed))
    + metric('Maint+dep $/mi', money(c.maint + c.dep))
    + metric('IRS 2026 now', money(irsRate()))
    + metric('vs IRS', (c.loaded - irsRate()) >= 0 ? ('+' + money(c.loaded - irsRate())) : money(c.loaded - irsRate()));
  renderPay(); applyGates();
}
function fillOffer() {
  setVal('needNet', S.needNet); setVal('needHrs', S.needHrs);
  setVal('gasDollars', S.live.gasDollars); setVal('gasGal', S.live.gasGal);
  const hint = S.needHrs > 0 ? `Target ${money(S.needNet / S.needHrs)} net/hr after the car.` : 'Add hours to compare against your thin floor.';
  document.getElementById('targetHint').textContent = hint;
  renderShift(); applyGates();
}
function metric(label, val) { return `<div class="metric"><b>${val}</b><span>${label}</span></div>`; }
function money(n) { return (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2); }
function milesFromForm() {
  const tot = num('totMi', 0);
  if (tot > 0) return tot;
  return Math.max(0, num('puMi', 0) + num('tripMi', 0));
}
function scoreOffer(offer, miles, mins, tolls) {
  const c = costs();
  const carCost = c.loaded * miles;
  const net = offer - carCost - tolls;
  const hrs = mins > 0 ? mins / 60 : 0;
  const nph = hrs > 0 ? net / hrs : null;
  const ppm = miles > 0 ? offer / miles : 0;
  const npm = miles > 0 ? net / miles : 0;
  const targetHr = S.needHrs > 0 ? S.needNet / S.needHrs : S.thinFloor;
  const floor = S.thinFloor;
  let tag = 'THIN', why = '';
  if (miles <= 0 || offer <= 0) { tag = 'SKIP'; why = 'Need miles and an offer amount.'; }
  else if (net <= 0) { tag = 'SKIP'; why = 'Does not cover loaded car cost + tolls.'; }
  else if (nph !== null && nph < floor * 0.65) { tag = 'SKIP'; why = 'Net per hour is well below your thin floor.'; }
  else if (nph !== null && nph >= Math.max(floor, targetHr)) { tag = 'TAKE'; why = 'Clears thin floor and shift-target hourly rate.'; }
  else if (nph === null && npm >= Math.max(0.15, c.loaded * 0.25)) { tag = 'TAKE'; why = 'No time entered; net per mile looks solid vs loaded cost.'; }
  else if (nph !== null && nph >= floor) { tag = 'TAKE'; why = 'Clears your thin floor. Watch remaining shift target.'; }
  else { tag = 'THIN'; why = nph !== null ? 'Positive, but under your target hourly rate.' : 'Thin without time data — add minutes for a better call.'; }
  return { carCost, net, hrs, nph, ppm, npm, tag, why, miles, offer, tolls, mins, fuelGuess: c.fuel * miles };
}
let lastScore = null;
function checkOffer() {
  persist();
  lastScore = scoreOffer(num('offerPay'), milesFromForm(), num('mins'), num('tolls'));
  const s = lastScore;
  document.getElementById('verdictBox').innerHTML = `<div class="verdict"><span class="badge ${s.tag}">${s.tag}</span><p class="muted">${s.why}</p></div><div class="metrics">${metric('Loaded car $', money(s.carCost))}${metric('Net after car', money(s.net))}${metric('Pay / mi', money(s.ppm))}${metric('Net / mi', money(s.npm))}${metric('Net / hr', s.nph === null ? '—' : money(s.nph))}${metric('Fuel guess', money(s.fuelGuess))}</div>`;
}
function acceptTrip() {
  if (!isPro()) { showTab('setup'); flash('Add to shift is Pro. Subscribe or enter your license key.', true); return; }
  if (!lastScore) checkOffer();
  if (!lastScore || lastScore.miles <= 0) return alert('Enter miles and an offer first.');
  S.live.trips.push({ ...lastScore, at: Date.now() }); persist(); renderShift();
}
function undoTrip() { if (!isPro()) return; S.live.trips.pop(); persist(); renderShift(); }
function shiftTotals() {
  const t = S.live.trips;
  const miles = t.reduce((a,x)=>a+x.miles,0);
  const pay = t.reduce((a,x)=>a+x.offer,0);
  const tolls = t.reduce((a,x)=>a+x.tolls,0);
  const mins = t.reduce((a,x)=>a+x.mins,0);
  const fuelGuess = t.reduce((a,x)=>a+x.fuelGuess,0);
  const fuel = S.live.gasDollars > 0 ? S.live.gasDollars : fuelGuess;
  const nonFuel = costs().loaded * miles - fuelGuess;
  const net = pay - (nonFuel + fuel) - tolls;
  return { miles, pay, tolls, mins, fuelGuess, fuel, net, trips: t.length, hrs: mins/60 };
}
function renderShift() {
  persist();
  const st = shiftTotals();
  const remain = S.needNet - st.net;
  document.getElementById('shiftMetrics').innerHTML = metric('Trips', st.trips) + metric('Miles', st.miles.toFixed(1)) + metric('Gross', money(st.pay)) + metric('Shift net', money(st.net)) + metric('Hours (trip clock)', st.hrs ? st.hrs.toFixed(2) : '—') + metric('Still need', money(remain));
  document.getElementById('shiftTrips').innerHTML = S.live.trips.map((x,i)=>`<div class="trip">#${i+1} ${x.miles.toFixed(1)} mi · ${money(x.offer)} · <b class="${x.tag}">${x.tag}</b> · net ${money(x.net)}</div>`).join('') || '<p class="muted">No trips yet.</p>';
}
function endShift() {
  if (!isPro()) { showTab('setup'); flash('Logging a shift is Pro.', true); return; }
  persist();
  const st = shiftTotals();
  if (st.trips === 0 && st.miles === 0) return alert('Nothing to log.');
  S.shifts.unshift({ date: new Date().toISOString().slice(0,10), miles: st.miles, pay: st.pay, hours: st.hrs, fuel: st.fuel, extras: st.tolls, net: st.net, notes: 'Live shift', source: 'offer' });
  S.live = { trips: [], gasDollars: 0, gasGal: 0 };
  setVal('gasDollars', ''); setVal('gasGal', '');
  persist(); renderShift(); showTab('dash'); fillDash();
}
function logShift() {
  if (!isPro()) return;
  persist();
  const miles = num('logMi'), pay = num('logPay'), hours = num('logHrs');
  const fuel = num('logFuel'), extras = num('logX');
  const fuelUsed = fuel > 0 ? fuel : costs().fuel * miles;
  const nonFuel = costs().loaded * miles - costs().fuel * miles;
  const net = pay - nonFuel - fuelUsed - extras;
  S.shifts.unshift({ date: document.getElementById('logDate').value || new Date().toISOString().slice(0,10), miles, pay, hours, fuel: fuelUsed, extras, net, notes: document.getElementById('logNotes').value || '', source: 'log' });
  persist(); fillDash(); showTab('dash');
}
function fillDash() {
  persist();
  const sh = isPro() ? S.shifts : [];
  const miles = sh.reduce((a,x)=>a+x.miles,0);
  const pay = sh.reduce((a,x)=>a+x.pay,0);
  const net = sh.reduce((a,x)=>a+x.net,0);
  const hrs = sh.reduce((a,x)=>a+(x.hours||0),0);
  const c = costs(); const irs = irsRate();
  document.getElementById('dashMetrics').innerHTML = metric('Loaded $/mi', money(c.loaded)) + metric('Pay / mi', miles ? money(pay/miles) : '—') + metric('Net / mi', miles ? money(net/miles) : '—') + metric('IRS $/mi', money(irs)) + metric('Logged miles', isPro() ? miles.toFixed(0) : 'Pro') + metric('Logged net', isPro() ? money(net) : 'Pro') + metric('Net / hr', hrs ? money(net/hrs) : '—') + metric('Shifts', isPro() ? sh.length : 'Pro');
  document.getElementById('irsNote').textContent = `2026 IRS business mileage: $0.725 (Jan–Jun) and $0.76 (Jul–Dec). Deadhead to a pickup counts as business miles. Planning only — not tax advice. Current rate used here: ${money(irs)}.`;
  const tb = document.querySelector('#histTable tbody');
  if (tb) tb.innerHTML = sh.map(x => `<tr><td>${x.date}</td><td>${(+x.miles).toFixed(1)}</td><td>${money(x.pay)}</td><td class="${x.net>=0?'ok':'bad'}">${money(x.net)}</td><td>${x.miles?money(x.net/x.miles):'—'}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No shifts yet.</td></tr>';
  renderPay(); applyGates();
}
function saveSetup() { persist(); fillSetup(); flash('Setup saved on this device.'); }
function resetSetup() {
  const keep = S.shifts;
  const paid = { paid: S.paid, subStatus: S.subStatus, subSince: S.subSince };
  S = { ...defaults, shifts: keep, live: S.live, ...paid }; persist(); fillSetup();
}
function clearHistory() {
  if (!isPro()) return;
  if (!confirm('Clear all saved shifts on this device?')) return;
  S.shifts = []; persist(); fillDash();
}
function exportJson() {
  if (!isPro()) { flash('Export is Pro.', true); return; }
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rideshare-cpm-data.json'; a.click();
}
function importJson(ev) {
  if (!isPro()) return;
  const file = ev.target.files && ev.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object') throw new Error('bad');
      const paid = { paid: S.paid, subStatus: S.subStatus, subSince: S.subSince };
      S = { ...defaults, ...data, ...paid, live: { ...defaults.live, ...(data.live || {}) } };
      persist(); fillSetup(); fillOffer(); fillDash();
      flash('Import complete. Subscription status on this device was kept.');
    } catch { alert('Could not read that JSON file.'); }
  };
  reader.readAsText(file); ev.target.value = '';
}
function stripeConfigured() { return STRIPE_LINK && !STRIPE_LINK.includes('REPLACE_ME'); }
function portalConfigured() { return !!(STRIPE_PORTAL && STRIPE_PORTAL.indexOf('http') === 0); }

/** GA4 purchase+subscribe once per successful checkout (no price constant in this app — value omitted). */
function trackSubscriptionPurchase(transactionId) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  var tid = String(transactionId || '').trim() || ('local-rideshare-cpm-' + Date.now());
  var key = 'ga-sub-rideshare-cpm-' + tid;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch (e) {}
  var payload = {
    transaction_id: tid,
    currency: 'USD',
    items: [{ item_name: 'RideShare CPM subscription', item_category: 'subscription' }]
  };
  window.gtag('event', 'purchase', payload);
  window.gtag('event', 'subscribe', { app: 'rideshare-cpm', currency: 'USD' });
}

function markPaidFromUrl() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('paid') === '1' || q.get('sub') === 'active') {
      S.paid = true; S.subStatus = 'active'; S.subSince = S.subSince || new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(S));
      history.replaceState({}, '', location.pathname);
      trackSubscriptionPurchase(q.get('session_id') || 'paid-1');
      flash('Pro unlocked on this device. Manage billing in Stripe to cancel.');
    }
    if (q.get('sub') === 'canceled') {
      S.paid = false; S.subStatus = 'canceled';
      localStorage.setItem(KEY, JSON.stringify(S));
      history.replaceState({}, '', location.pathname);
      flash('This device is marked unpaid.', true);
    }
  } catch {}
}
function unlockWithKey() {
  const raw = (document.getElementById('unlockKey').value || '').trim().toUpperCase();
  if (!LICENSE_KEY) { alert('Set LICENSE_KEY first.'); return; }
  if (raw === LICENSE_KEY.toUpperCase()) {
    S.paid = true; S.subStatus = 'active'; S.subSince = S.subSince || new Date().toISOString();
    persist(); applyGates(); renderPay(); fillDash(); flash('Pro restored on this device.');
  } else flash('That key does not match.', true);
}
function lockDevice() {
  if (!confirm('Mark this device as unpaid? Use this after you cancel in Stripe.')) return;
  S.paid = false; S.subStatus = 'canceled'; persist(); applyGates(); renderPay(); fillDash();
}
function renderPay() {
  const a = document.getElementById('payNow');
  const m = document.getElementById('manageSub');
  const status = document.getElementById('payStatus');
  const box = document.getElementById('stripeBox');
  if (a) { a.href = '#'; a.classList.add('off'); a.textContent = 'Free · supported by sponsors'; }
  if (m) { m.style.display = 'none'; }
  if (status) status.textContent = 'Free on this device. Quiet ads keep RideShare CPM free — no subscription.';
  if (box) box.textContent = 'Free with ads. Stripe checkout is paused.';
}

function goPay(ev) {
  if (ev) ev.preventDefault();
  flash('RideShare CPM is free with ads — no checkout needed.');
  return false;
}
function goPortal(ev) {
  if (ev) ev.preventDefault();
  flash('No billing portal — app is free with ads.');
  return false;
}
function showTab(name) {
  ['setup','offer','log','dash'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('hidden', t !== name);
    document.getElementById('n-' + t).classList.toggle('on', t === name);
  });
  persist();
  if (name === 'setup') fillSetup();
  if (name === 'offer') fillOffer();
  if (name === 'dash') fillDash();
  applyGates();
}
document.getElementById('logDate').value = new Date().toISOString().slice(0,10);
['needNet','needHrs','gasDollars','gasGal'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => { persist(); fillOffer(); });
});
markPaidFromUrl(); fillSetup(); fillOffer(); fillDash(); renderPay(); applyGates();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
