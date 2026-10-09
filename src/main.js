// =====================================================
//  GIATE - Front principal
// =====================================================

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';

const DEPARTMENTS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas',
  'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía',
  'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander',
  'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre',
  'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
];

// ---------- Estado ----------
let selectedProduct = null;      // producto que se está comprando
let currentStep = 1;
let payMethod = '';              // 'Tarjeta' | 'PSE' | 'Contraentrega'
let productsCache = {};          // id -> producto (lista pública)
let mineCache = {};              // id -> producto (mis publicaciones)
let heroProducts = [];
let heroIndex = 0;
let seenNotifIds = new Set();
let notifTimer = null;

// ---------- Utilidades ----------
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(n) {
  return '$ ' + Number(n || 0).toLocaleString('es-CO');
}

function toggleModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.toggle('hidden');
    modal.classList.toggle('flex');
  }
}

function openModalById(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeModalById(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
  } catch (e) {
    return null;
  }
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// Aviso emergente. type: 'ok' | 'error' | 'sale' | 'info'
function toast(message, type = 'info', title = '') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const styles = {
    ok:    { icon: 'fa-circle-check',  color: 'text-green-400' },
    error: { icon: 'fa-circle-exclamation', color: 'text-red-400' },
    sale:  { icon: 'fa-sack-dollar',   color: 'text-epicBlueHover' },
    info:  { icon: 'fa-circle-info',   color: 'text-epicMuted' }
  };
  const s = styles[type] || styles.info;

  const el = document.createElement('div');
  el.className = 'bg-epicCard border border-epicLine rounded-xl shadow-2xl p-4 flex gap-3 items-start pop';
  el.innerHTML = `
    <i class="fa-solid ${s.icon} ${s.color} text-xl mt-0.5"></i>
    <div class="min-w-0 flex-1">
      ${title ? `<div class="font-bold text-sm mb-0.5">${esc(title)}</div>` : ''}
      <div class="text-sm text-white/80 break-words">${esc(message)}</div>
    </div>
    <button aria-label="Cerrar" class="text-epicMuted hover:text-white"><i class="fa-solid fa-xmark"></i></button>
  `;
  el.querySelector('button').addEventListener('click', () => el.remove());
  container.appendChild(el);
  setTimeout(() => el.remove(), type === 'sale' ? 12000 : 5000);
}

// ---------- Sesión ----------
function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('currentUser', JSON.stringify(user));
  updateAuthUI();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  seenNotifIds = new Set();
  updateAuthUI();
}

function updateAuthUI() {
  const token = getToken();
  const user = getCurrentUser();
  const guestButtons = document.getElementById('guestButtons');
  const userButtons = document.getElementById('userButtons');
  const userNameLabel = document.getElementById('userNameLabel');

  if (token && user) {
    guestButtons.classList.add('hidden');
    userButtons.classList.remove('hidden');
    userButtons.classList.add('flex');
    userNameLabel.textContent = `Hola, ${user.name}`;
    startNotifications();
  } else {
    guestButtons.classList.remove('hidden');
    userButtons.classList.add('hidden');
    userButtons.classList.remove('flex');
    stopNotifications();
  }
}

// =====================================================
//  NOTIFICACIONES
// =====================================================
function startNotifications() {
  if (notifTimer) return;
  loadNotifications();
  notifTimer = setInterval(loadNotifications, 20000);
}

function stopNotifications() {
  if (notifTimer) clearInterval(notifTimer);
  notifTimer = null;
  const badge = document.getElementById('notifBadge');
  if (badge) {
    badge.classList.add('hidden');
    badge.classList.remove('flex');
  }
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.add('hidden');
}

async function loadNotifications() {
  if (!getToken()) return;

  try {
    const res = await fetch('/api/notifications', { headers: authHeaders() });

    // Sesión vencida: se cierra sola
    if (res.status === 401) {
      logout();
      toast('Tu sesión venció. Inicia sesión de nuevo.', 'info');
      return;
    }

    const data = await res.json();
    if (!res.ok) return;

    const list = data.data || [];

    // Avisar de lo nuevo sin leer (máx. 3 avisos a la vez)
    const fresh = list.filter(n => !n.read && !seenNotifIds.has(n._id)).slice(0, 3);
    fresh.forEach(n => {
      toast(n.message, n.type === 'venta' ? 'sale' : 'info', n.title);
    });
    list.forEach(n => seenNotifIds.add(n._id));

    renderNotifications(list, data.unread || 0);
  } catch (err) {
    console.error('Error cargando notificaciones', err);
  }
}

function renderNotifications(list, unread) {
  const badge = document.getElementById('notifBadge');
  const box = document.getElementById('notifList');

  if (badge) {
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.classList.remove('hidden');
      badge.classList.add('flex');
    } else {
      badge.classList.add('hidden');
      badge.classList.remove('flex');
    }
  }

  if (!box) return;

  if (list.length === 0) {
    box.innerHTML = `<div class="px-4 py-10 text-center text-sm text-epicMuted">
      <i class="fa-regular fa-bell text-2xl mb-2 block"></i>
      Aquí te avisaremos cuando vendas algo.
    </div>`;
    return;
  }

  box.innerHTML = list.map(n => `
    <div class="px-4 py-3 border-b border-epicLine/60 flex gap-3 ${n.read ? 'opacity-60' : 'bg-epicBlue/5'}">
      <div class="w-9 h-9 rounded-full ${n.type === 'venta' ? 'bg-epicBlue' : 'bg-epicPanel'} flex items-center justify-center shrink-0">
        <i class="fa-solid ${n.type === 'venta' ? 'fa-sack-dollar' : 'fa-info'} text-sm"></i>
      </div>
      <div class="min-w-0">
        <div class="text-sm font-bold">${esc(n.title)}</div>
        <div class="text-xs text-white/75 mt-0.5 break-words">${esc(n.message)}</div>
        <div class="text-[11px] text-epicMuted mt-1">${new Date(n.createdAt).toLocaleString('es-CO')}</div>
      </div>
    </div>
  `).join('');
}

function toggleNotifications() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.toggle('hidden');
}

async function markAllRead() {
  try {
    await fetch('/api/notifications/read-all', { method: 'PUT', headers: authHeaders() });
    loadNotifications();
  } catch (err) {
    console.error(err);
  }
}

// Cerrar el panel de notificaciones al hacer clic afuera
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notifPanel');
  if (!panel || panel.classList.contains('hidden')) return;
  const bellWrapper = panel.parentElement;
  if (bellWrapper && !bellWrapper.contains(e.target)) panel.classList.add('hidden');
});

// =====================================================
//  CATÁLOGO + DESTACADO
// =====================================================
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  const countLabel = document.getElementById('productCount');
  if (!grid) return;

  const search = document.getElementById('searchInput')?.value || '';
  const category = document.getElementById('filterCategory')?.value || '';
  const minPrice = document.getElementById('minPrice')?.value || '';
  const maxPrice = document.getElementById('maxPrice')?.value || '';

  let query = `/api/products?limit=24&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`;
  if (minPrice) query += `&minPrice=${minPrice}`;
  if (maxPrice) query += `&maxPrice=${maxPrice}`;

  try {
    const res = await fetch(query);
    const response = await res.json();
    const products = response.data || [];

    productsCache = {};
    products.forEach(p => { productsCache[p._id] = p; });

    grid.innerHTML = '';
    if (countLabel) countLabel.textContent = `${response.total ?? products.length} publicaciones`;

    renderHero(search || category || minPrice || maxPrice ? [] : products);

    if (products.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center py-16 text-epicMuted">
        <i class="fa-regular fa-face-frown text-3xl mb-3 block"></i>
        No encontramos productos con esos filtros. Prueba con otra búsqueda o publica el tuyo.
      </div>`;
      return;
    }

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'group cursor-pointer';
      card.innerHTML = `
        <div class="relative aspect-[3/4] rounded-xl overflow-hidden bg-epicCard">
          <img src="${esc(p.imageUrl || PLACEHOLDER_IMG)}" alt="${esc(p.title)}"
               onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'"
               class="w-full h-full object-cover transition duration-300 group-hover:brightness-110 group-hover:scale-[1.03]" />
        </div>
        <div class="mt-3">
          <div class="text-xs text-epicMuted">${esc(p.category || 'General')}</div>
          <h4 class="font-semibold text-sm leading-snug line-clamp-1 mt-0.5">${esc(p.title)}</h4>
          <div class="text-sm font-bold mt-1.5">${money(p.price)}</div>
        </div>
      `;
      card.addEventListener('click', () => openDetail(p._id));
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="col-span-full text-center py-16 text-red-400 font-medium">No pudimos conectar con el servidor. Intenta recargar la página.</div>`;
  }
}

function renderHero(products) {
  const section = document.getElementById('heroSection');
  if (!section) return;

  heroProducts = products.slice(0, 5);
  heroIndex = 0;

  if (heroProducts.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  paintHero();
}

function paintHero() {
  const p = heroProducts[heroIndex];
  if (!p) return;

  const img = document.getElementById('heroImage');
  img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER_IMG; };
  img.src = p.imageUrl || PLACEHOLDER_IMG;

  document.getElementById('heroCategory').textContent = p.category || 'General';
  document.getElementById('heroTitle').textContent = p.title;
  document.getElementById('heroDesc').textContent = p.description || '';
  document.getElementById('heroPrice').textContent = money(p.price);
  document.getElementById('heroBuy').onclick = () => buyProduct(p._id);

  const list = document.getElementById('heroList');
  list.innerHTML = heroProducts.map((item, i) => `
    <button data-i="${i}" class="flex items-center gap-3 text-left p-3 rounded-xl transition ${i === heroIndex ? 'bg-epicPanel' : 'hover:bg-epicCard'}">
      <img src="${esc(item.imageUrl || PLACEHOLDER_IMG)}" alt="" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-12 h-16 object-cover rounded-md bg-black shrink-0" />
      <span class="text-sm font-semibold line-clamp-2">${esc(item.title)}</span>
    </button>
  `).join('');

  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      heroIndex = parseInt(btn.dataset.i, 10);
      paintHero();
    });
  });
}

// ---------- Detalle de producto ----------
function openDetail(productId) {
  const p = productsCache[productId];
  if (!p) return;

  const img = document.getElementById('detailImage');
  img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER_IMG; };
  img.src = p.imageUrl || PLACEHOLDER_IMG;

  document.getElementById('detailCategory').textContent = p.category || 'General';
  document.getElementById('detailTitle').textContent = p.title;
  document.getElementById('detailPrice').textContent = money(p.price);
  document.getElementById('detailDesc').textContent = p.description || 'Sin descripción';
  document.getElementById('detailBuy').onclick = () => {
    closeModalById('modalDetail');
    buyProduct(p._id);
  };

  openModalById('modalDetail');
}

// =====================================================
//  CHECKOUT POR PASOS (estilo Mercado Libre)
// =====================================================
function buyProduct(productId) {
  const token = getToken();
  if (!token) {
    toast('Inicia sesión para poder comprar.', 'info');
    openModalById('modalLogin');
    return;
  }

  const p = productsCache[productId];
  if (!p) return;

  const user = getCurrentUser();
  if (user && p.seller && String(p.seller) === String(user.id)) {
    toast('Este producto es tuyo, no puedes comprarlo.', 'error');
    return;
  }

  selectedProduct = p;

  // Resumen lateral
  const sumImg = document.getElementById('sumImage');
  sumImg.onerror = () => { sumImg.onerror = null; sumImg.src = PLACEHOLDER_IMG; };
  sumImg.src = p.imageUrl || PLACEHOLDER_IMG;
  document.getElementById('sumCategory').textContent = p.category || 'General';
  document.getElementById('sumTitle').textContent = p.title;
  document.getElementById('sumPrice').textContent = money(p.price);
  document.getElementById('sumTotal').textContent = money(p.price);

  // Reiniciar formulario
  ['coFullName', 'coPhone', 'coDepartment', 'coCity', 'coAddress', 'coNotes',
   'coCardNumber', 'coCardName', 'coCardExp', 'coCardCvv', 'coBank'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (user) {
    document.getElementById('coFullName').value = user.name || '';
    document.getElementById('coPhone').value = user.phone || '';
  }

  buildInstallments(p.price);
  setPayMethod('');
  updateCardPreview();
  showCheckoutError('');

  document.getElementById('checkoutWizard').classList.remove('hidden');
  document.getElementById('checkoutSuccess').classList.add('hidden');

  goStep(1);
  openModalById('modalCheckout');
}

function showCheckoutError(msg) {
  const el = document.getElementById('checkoutError');
  if (!el) return;
  if (!msg) {
    el.classList.add('hidden');
    el.textContent = '';
  } else {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

function goStep(n) {
  currentStep = n;

  [1, 2, 3].forEach(i => {
    document.getElementById('step' + i).classList.toggle('hidden', i !== n);
  });

  // Indicador de pasos
  document.querySelectorAll('.step-item').forEach(item => {
    const step = parseInt(item.dataset.step, 10);
    const dot = item.querySelector('.step-dot');
    dot.className = 'step-dot w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ' +
      (step <= n ? 'bg-epicBlue text-white' : 'bg-epicPanel text-epicMuted');
    dot.innerHTML = step < n ? '<i class="fa-solid fa-check text-[10px]"></i>' : String(step);
  });
  document.querySelectorAll('.step-line').forEach(line => {
    const lineStep = parseInt(line.dataset.line, 10);
    line.className = 'flex-1 h-px step-line ' + (lineStep < n ? 'bg-epicBlue' : 'bg-epicLine');
  });

  const back = document.getElementById('btnBack');
  back.classList.toggle('invisible', n === 1);

  const next = document.getElementById('btnNext');
  next.disabled = false;
  next.classList.remove('opacity-60');
  next.textContent = n === 3 ? `Pagar ${money(selectedProduct ? selectedProduct.price : 0)}` : 'Continuar';

  if (n === 3) fillSummary();
  showCheckoutError('');
}

function prevStep() {
  if (currentStep > 1) goStep(currentStep - 1);
}

function nextStep() {
  showCheckoutError('');

  if (currentStep === 1) {
    const err = validateShipping();
    if (err) return showCheckoutError(err);
    return goStep(2);
  }

  if (currentStep === 2) {
    const err = validatePayment();
    if (err) return showCheckoutError(err);
    return goStep(3);
  }

  if (currentStep === 3) {
    submitOrder();
  }
}

function getShipping() {
  return {
    fullName: document.getElementById('coFullName').value.trim(),
    phone: document.getElementById('coPhone').value.trim(),
    department: document.getElementById('coDepartment').value,
    city: document.getElementById('coCity').value.trim(),
    address: document.getElementById('coAddress').value.trim(),
    notes: document.getElementById('coNotes').value.trim()
  };
}

function validateShipping() {
  const s = getShipping();
  if (!s.fullName) return 'Escribe el nombre de quien recibe el pedido.';
  if (s.phone.replace(/\D/g, '').length < 7) return 'Escribe un teléfono de contacto válido.';
  if (!s.department) return 'Selecciona el departamento.';
  if (!s.city) return 'Escribe la ciudad o municipio.';
  if (s.address.length < 5) return 'Escribe la dirección completa (calle, número y barrio).';
  return '';
}

// ---------- Método de pago ----------
function setPayMethod(method) {
  payMethod = method;

  document.querySelectorAll('.pay-tile').forEach(tile => {
    const active = tile.dataset.method === method;
    tile.classList.toggle('border-epicBlue', active);
    tile.classList.toggle('bg-epicBlue/10', active);
    tile.classList.toggle('border-epicLine', !active);
  });

  document.getElementById('payCard').classList.toggle('hidden', method !== 'Tarjeta');
  document.getElementById('payPse').classList.toggle('hidden', method !== 'PSE');
  document.getElementById('payCod').classList.toggle('hidden', method !== 'Contraentrega');
}

function buildInstallments(price) {
  const select = document.getElementById('coInstallments');
  if (!select) return;
  const options = [1, 3, 6, 12, 24];
  select.innerHTML = options.map(n => {
    const each = Math.ceil(price / n);
    return `<option value="${n}">${n === 1 ? '1 cuota' : `${n} cuotas`}${n > 1 ? ' de ' + money(each) : ''}</option>`;
  }).join('');
}

// ---------- Tarjeta ----------
function detectBrand(digits) {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^(36|38|30[0-5])/.test(digits)) return 'Diners';
  return '';
}

function luhnValid(digits) {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return digits.length > 0 && sum % 10 === 0;
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function updateCardPreview() {
  const numEl = document.getElementById('coCardNumber');
  if (!numEl) return;

  const digits = numEl.value.replace(/\D/g, '');
  const name = document.getElementById('coCardName').value.trim();
  const exp = document.getElementById('coCardExp').value;
  const cvv = document.getElementById('coCardCvv').value;

  const padded = (digits + '################').slice(0, 16).replace(/#/g, '•');
  document.getElementById('cardNumberPreview').textContent = padded.replace(/(.{4})/g, '$1 ').trim();
  document.getElementById('cardNamePreview').textContent = (name || 'NOMBRE APELLIDO').toUpperCase();
  document.getElementById('cardExpPreview').textContent = exp || 'MM/AA';
  document.getElementById('cardCvvPreview').textContent = cvv ? '•'.repeat(cvv.length) : '•••';
  document.getElementById('cardBrandLabel').textContent = (detectBrand(digits) || 'TARJETA').toUpperCase();
}

function getCardData() {
  const digits = document.getElementById('coCardNumber').value.replace(/\D/g, '');
  return {
    digits,
    brand: detectBrand(digits) || 'Tarjeta',
    holder: document.getElementById('coCardName').value.trim(),
    exp: document.getElementById('coCardExp').value,
    cvv: document.getElementById('coCardCvv').value,
    installments: parseInt(document.getElementById('coInstallments').value, 10) || 1
  };
}

function validatePayment() {
  if (!payMethod) return 'Elige un método de pago para continuar.';

  if (payMethod === 'PSE') {
    if (!document.getElementById('coBank').value) return 'Selecciona tu banco para pagar con PSE.';
    return '';
  }

  if (payMethod === 'Tarjeta') {
    const c = getCardData();

    if (c.digits.length < 13 || !luhnValid(c.digits)) {
      return 'El número de tarjeta no es válido. Revísalo e intenta de nuevo.';
    }
    if (c.holder.length < 3) return 'Escribe el nombre como aparece en la tarjeta.';

    const m = c.exp.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return 'Escribe el vencimiento con el formato MM/AA.';
    const month = parseInt(m[1], 10);
    const year = 2000 + parseInt(m[2], 10);
    if (month < 1 || month > 12) return 'El mes de vencimiento no es válido.';
    const now = new Date();
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    if (endOfMonth < now) return 'La tarjeta está vencida.';

    const isAmex = c.brand === 'American Express';
    const cvvLen = isAmex ? 4 : 3;
    if (!/^\d+$/.test(c.cvv) || c.cvv.length !== cvvLen) {
      return `El CVV debe tener ${cvvLen} dígitos.`;
    }
  }

  return '';
}

function fillSummary() {
  const s = getShipping();
  document.getElementById('sumShipping').innerHTML = `
    <div class="font-semibold">${esc(s.fullName)} · ${esc(s.phone)}</div>
    <div class="text-white/75">${esc(s.address)}</div>
    <div class="text-white/75">${esc(s.city)}, ${esc(s.department)}</div>
    ${s.notes ? `<div class="text-epicMuted text-xs mt-1">${esc(s.notes)}</div>` : ''}
  `;

  let payHtml = '';
  if (payMethod === 'Tarjeta') {
    const c = getCardData();
    payHtml = `
      <div class="font-semibold">${esc(c.brand)} terminada en ${esc(c.digits.slice(-4))}</div>
      <div class="text-white/75">${c.installments === 1 ? 'Pago en 1 cuota' : `${c.installments} cuotas de ${money(Math.ceil(selectedProduct.price / c.installments))}`}</div>
    `;
  } else if (payMethod === 'PSE') {
    payHtml = `<div class="font-semibold">PSE</div><div class="text-white/75">${esc(document.getElementById('coBank').value)}</div>`;
  } else {
    payHtml = `<div class="font-semibold">Pago contraentrega</div><div class="text-white/75">Pagas en efectivo al recibir</div>`;
  }
  document.getElementById('sumPayment').innerHTML = payHtml;
}

// ---------- Enviar la orden ----------
async function submitOrder() {
  const token = getToken();
  if (!token || !selectedProduct) {
    toast('Inicia sesión para comprar.', 'error');
    return;
  }

  const payment = { method: payMethod };
  if (payMethod === 'Tarjeta') {
    const c = getCardData();
    // Solo se envían marca y últimos 4 dígitos: nunca el número completo ni el CVV
    payment.brand = c.brand;
    payment.last4 = c.digits.slice(-4);
    payment.holder = c.holder;
    payment.installments = c.installments;
  }

  const btn = document.getElementById('btnNext');
  btn.disabled = true;
  btn.classList.add('opacity-60');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Procesando pago...';
  showCheckoutError('');

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        productId: selectedProduct._id,
        shipping: getShipping(),
        payment
      })
    });

    const data = await res.json();

    if (res.ok) {
      showSuccess(data.order);
      loadProducts();
    } else {
      showCheckoutError(data.message || 'No pudimos procesar la compra.');
      goStep(3);
      if (res.status === 409 || res.status === 400) loadProducts();
    }
  } catch (err) {
    console.error(err);
    showCheckoutError('Error de red al procesar la compra. Intenta de nuevo.');
    goStep(3);
  }
}

function showSuccess(order) {
  const s = getShipping();
  const isCod = payMethod === 'Contraentrega';

  document.getElementById('successText').textContent = isCod
    ? 'Tu pedido quedó reservado. Pagas en efectivo cuando lo recibas.'
    : 'Tu pago fue aprobado. Le avisamos al vendedor para que prepare el envío.';

  document.getElementById('successDetail').innerHTML = `
    <div class="font-bold">${esc(selectedProduct.title)}</div>
    <div class="text-white/75 mt-1">Total: ${money(selectedProduct.price)}</div>
    <div class="text-white/75 mt-1">Envío a: ${esc(s.address)}, ${esc(s.city)}</div>
    <div class="text-white/75 mt-1">Pedido: #${esc(String(order && order._id ? order._id : '').slice(-6).toUpperCase())}</div>
  `;

  document.getElementById('checkoutWizard').classList.add('hidden');
  document.getElementById('checkoutSuccess').classList.remove('hidden');
  selectedProduct = null;
}

// =====================================================
//  MIS PUBLICACIONES + EDITAR
// =====================================================
async function openMine() {
  if (!getToken()) {
    openModalById('modalLogin');
    return;
  }

  const box = document.getElementById('mineList');
  box.innerHTML = '<div class="text-center py-10 text-epicMuted text-sm">Cargando tus publicaciones...</div>';
  openModalById('modalMine');

  try {
    const res = await fetch('/api/products/mine', { headers: authHeaders() });
    const data = await res.json();

    if (!res.ok) {
      box.innerHTML = `<div class="text-center py-10 text-red-400 text-sm">${esc(data.message || 'No se pudieron cargar tus publicaciones')}</div>`;
      return;
    }

    const items = data.data || [];
    mineCache = {};
    items.forEach(p => { mineCache[p._id] = p; });

    if (items.length === 0) {
      box.innerHTML = `<div class="text-center py-12 text-epicMuted text-sm">
        Aún no has publicado nada. Usa el botón <b class="text-white">Publicar</b> para empezar.
      </div>`;
      return;
    }

    box.innerHTML = items.map(p => {
      const sold = p.status === 'Vendido';
      return `
        <div class="flex gap-4 items-center bg-epicBg border border-epicLine rounded-xl p-3">
          <img src="${esc(p.imageUrl || PLACEHOLDER_IMG)}" alt="" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'" class="w-16 h-20 object-cover rounded-lg bg-black shrink-0 ${sold ? 'grayscale opacity-60' : ''}" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold text-sm line-clamp-1">${esc(p.title)}</div>
            <div class="text-xs text-epicMuted mt-0.5">${esc(p.category)}</div>
            <div class="text-sm font-bold mt-1">${money(p.price)}</div>
          </div>
          ${sold
            ? `<span class="text-xs font-bold bg-epicBlue/20 text-epicBlueHover px-3 py-1.5 rounded-full shrink-0"><i class="fa-solid fa-circle-check mr-1"></i>Vendido</span>`
            : `<button data-edit="${p._id}" class="bg-epicPanel hover:bg-epicLine text-white text-sm font-semibold px-4 py-2 rounded-lg transition shrink-0"><i class="fa-solid fa-pen mr-1.5 text-xs"></i>Editar</button>`}
        </div>
      `;
    }).join('');

    box.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openEdit(btn.dataset.edit));
    });
  } catch (err) {
    console.error(err);
    box.innerHTML = '<div class="text-center py-10 text-red-400 text-sm">Error de red al cargar tus publicaciones.</div>';
  }
}

function openEdit(productId) {
  const p = mineCache[productId];
  if (!p) return;

  document.getElementById('editId').value = p._id;
  document.getElementById('editTitle').value = p.title || '';
  document.getElementById('editDesc').value = p.description || '';
  document.getElementById('editPrice').value = p.price ?? '';
  document.getElementById('editCategory').value = p.category || 'Tecnología';
  document.getElementById('editImage').value = p.imageUrl || '';

  openModalById('modalEdit');
}

// =====================================================
//  EVENTOS DE LA PÁGINA
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  // Llenar departamentos
  const dep = document.getElementById('coDepartment');
  if (dep) {
    DEPARTMENTS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      dep.appendChild(opt);
    });
  }

  updateAuthUI();
  loadProducts();

  // ---- Checkout: tarjeta y métodos de pago ----
  document.querySelectorAll('.pay-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      setPayMethod(tile.dataset.method);
      showCheckoutError('');
    });
  });

  const cardNumber = document.getElementById('coCardNumber');
  cardNumber.addEventListener('input', () => {
    cardNumber.value = formatCardNumber(cardNumber.value);
    updateCardPreview();
  });

  const cardName = document.getElementById('coCardName');
  cardName.addEventListener('input', updateCardPreview);

  const cardExp = document.getElementById('coCardExp');
  cardExp.addEventListener('input', () => {
    cardExp.value = formatExpiry(cardExp.value);
    updateCardPreview();
  });

  const cardCvv = document.getElementById('coCardCvv');
  cardCvv.addEventListener('input', () => {
    cardCvv.value = cardCvv.value.replace(/\D/g, '').slice(0, 4);
    updateCardPreview();
  });
  // La tarjeta gira para mostrar el CVV
  cardCvv.addEventListener('focus', () => document.getElementById('cardInner').classList.add('flipped'));
  cardCvv.addEventListener('blur', () => document.getElementById('cardInner').classList.remove('flipped'));

  // Enter avanza al siguiente paso
  document.getElementById('modalCheckout').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      nextStep();
    }
  });

  // ---- 1. REGISTRO ----
  const formRegister = document.getElementById('formRegister');
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userData = {
      name: document.getElementById('regName').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value,
      phone: document.getElementById('regPhone').value
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();

      if (res.ok) {
        saveSession(data.token, data.user);
        toast('Tu cuenta quedó creada. ¡Ya puedes comprar y publicar!', 'ok', 'Bienvenido a GIATE');
        closeModalById('modalRegister');
        formRegister.reset();
      } else {
        toast(data.message || 'Error al registrar el usuario', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Error de red al intentar registrar el usuario', 'error');
    }
  });

  // ---- 2. LOGIN ----
  const formLogin = document.getElementById('formLogin');
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const credentials = {
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value
    };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();

      if (res.ok) {
        saveSession(data.token, data.user);
        toast('Qué bueno verte de nuevo.', 'ok', `Hola, ${data.user.name}`);
        closeModalById('modalLogin');
        formLogin.reset();
      } else {
        toast(data.message || 'Correo o contraseña incorrectos', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Error de red al iniciar sesión', 'error');
    }
  });

  // ---- 3. PUBLICAR PRODUCTO ----
  const formProduct = document.getElementById('formProduct');
  formProduct.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!getToken()) {
      toast('Inicia sesión para publicar un producto', 'info');
      closeModalById('modalProduct');
      openModalById('modalLogin');
      return;
    }

    const productData = {
      title: document.getElementById('prodTitle').value,
      description: document.getElementById('prodDesc').value,
      price: parseFloat(document.getElementById('prodPrice').value),
      category: document.getElementById('prodCategory').value,
      imageUrl: document.getElementById('prodImage').value || ''
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(productData)
      });
      const data = await res.json();

      if (res.ok) {
        toast('Tu producto ya está en la tienda.', 'ok', 'Publicado');
        closeModalById('modalProduct');
        formProduct.reset();
        loadProducts();
      } else {
        toast(data.message || 'Error al publicar el producto', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Error de red al intentar publicar el producto', 'error');
    }
  });

  // ---- 4. EDITAR PRODUCTO ----
  const formEdit = document.getElementById('formEdit');
  formEdit.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const body = {
      title: document.getElementById('editTitle').value,
      description: document.getElementById('editDesc').value,
      price: parseFloat(document.getElementById('editPrice').value),
      category: document.getElementById('editCategory').value,
      imageUrl: document.getElementById('editImage').value || ''
    };

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        toast('Los cambios ya se ven en la tienda.', 'ok', 'Publicación actualizada');
        closeModalById('modalEdit');
        loadProducts();
        openMine();
      } else {
        toast(data.message || 'No se pudo actualizar el producto', 'error');
        // Si ya se vendió mientras editabas, se refresca la lista
        if (res.status === 400) openMine();
      }
    } catch (err) {
      console.error(err);
      toast('Error de red al actualizar el producto', 'error');
    }
  });

  // ---- Buscador y filtros ----
  document.getElementById('btnFilter').addEventListener('click', loadProducts);
  document.getElementById('btnSearch').addEventListener('click', loadProducts);
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadProducts();
  });
});