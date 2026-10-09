let selectedProductId = null;

// Alternar visibilidad de modales
function toggleModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.toggle('hidden');
    modal.classList.toggle('flex');
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('currentUser', JSON.stringify(user));
  updateAuthUI();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  updateAuthUI();
}

function updateAuthUI() {
  const token = getToken();
  const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
  const guestButtons = document.getElementById('guestButtons');
  const userButtons = document.getElementById('userButtons');
  const userNameLabel = document.getElementById('userNameLabel');

  if (token && user) {
    guestButtons.classList.add('hidden');
    userButtons.classList.remove('hidden');
    userButtons.classList.add('flex');
    userNameLabel.textContent = `Hola, ${user.name}`;
  } else {
    guestButtons.classList.remove('hidden');
    userButtons.classList.add('hidden');
    userButtons.classList.remove('flex');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadProducts();

  // 1. REGISTRO DE USUARIO
  const formRegister = document.getElementById('formRegister');
  if (formRegister) {
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
          alert('¡Usuario registrado con éxito!');
          toggleModal('modalRegister');
          formRegister.reset();
        } else {
          alert(data.message || 'Error al registrar el usuario');
        }
      } catch (err) {
        console.error(err);
        alert('Error de red al intentar registrar el usuario');
      }
    });
  }

  // 2. INICIO DE SESIÓN
  const formLogin = document.getElementById('formLogin');
  if (formLogin) {
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
          alert('¡Bienvenido de nuevo!');
          toggleModal('modalLogin');
          formLogin.reset();
        } else {
          alert(data.message || 'Correo o contraseña incorrectos');
        }
      } catch (err) {
        console.error(err);
        alert('Error de red al iniciar sesión');
      }
    });
  }

  // 3. PUBLICAR PRODUCTO
  const formProduct = document.getElementById('formProduct');
  if (formProduct) {
    formProduct.addEventListener('submit', async (e) => {
      e.preventDefault();

      const token = getToken();
      if (!token) {
        alert('Debes iniciar sesión para publicar un producto');
        toggleModal('modalProduct');
        toggleModal('modalLogin');
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(productData)
        });

        const data = await res.json();

        if (res.ok) {
          alert('¡Producto publicado con éxito!');
          toggleModal('modalProduct');
          formProduct.reset();
          loadProducts();
        } else {
          alert(data.message || 'Error al publicar el producto');
        }
      } catch (err) {
        console.error(err);
        alert('Error de red al intentar publicar el producto');
      }
    });
  }

  // 4. CONFIRMAR COMPRA (dirección + método de pago)
  const formCheckout = document.getElementById('formCheckout');
  if (formCheckout) {
    formCheckout.addEventListener('submit', async (e) => {
      e.preventDefault();

      const token = getToken();
      if (!token || !selectedProductId) {
        alert('Debes iniciar sesión para comprar');
        return;
      }

      const orderData = {
        productId: selectedProductId,
        address: document.getElementById('checkoutAddress').value,
        paymentMethod: document.getElementById('checkoutPayment').value
      };

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(orderData)
        });

        const data = await res.json();

        if (res.ok) {
          alert('¡Orden de compra generada con éxito en GIATE!');
          toggleModal('modalCheckout');
          formCheckout.reset();
          selectedProductId = null;
          loadProducts();
        } else {
          alert(data.message || 'Error al generar la orden');
        }
      } catch (err) {
        console.error(err);
        alert('Error al procesar la compra');
      }
    });
  }

  // Filtros de búsqueda
  const btnFilter = document.getElementById('btnFilter');
  if (btnFilter) btnFilter.addEventListener('click', loadProducts);

  const btnSearch = document.getElementById('btnSearch');
  if (btnSearch) btnSearch.addEventListener('click', loadProducts);
});

// 5. CARGAR PRODUCTOS DESDE LA API
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  const countLabel = document.getElementById('productCount');
  if (!grid) return;

  const search = document.getElementById('searchInput')?.value || '';
  const category = document.getElementById('filterCategory')?.value || '';
  const minPrice = document.getElementById('minPrice')?.value || '';
  const maxPrice = document.getElementById('maxPrice')?.value || '';

  let query = `/api/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`;
  if (minPrice) query += `&minPrice=${minPrice}`;
  if (maxPrice) query += `&maxPrice=${maxPrice}`;

  try {
    const res = await fetch(query);
    const response = await res.json();
    const products = response.data || [];

    grid.innerHTML = '';
    if (countLabel) countLabel.textContent = `${response.total ?? products.length} publicaciones`;

    if (products.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center py-12 text-spotTextMuted">No se encontraron productos. ¡Sé el primero en publicar uno!</div>`;
      return;
    }

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = "bg-spotCard rounded-2xl border border-white/5 overflow-hidden shadow-xl hover:border-spotGreen/30 transition duration-300 flex flex-col justify-between group";
      card.innerHTML = `
        <div>
          <div class="relative overflow-hidden h-48 bg-black">
            <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            <span class="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-spotGreen text-xs font-bold px-2.5 py-1 rounded-full border border-spotGreen/20">
              ${p.category || 'General'}
            </span>
          </div>
          <div class="p-5">
            <h4 class="font-bold text-white text-base line-clamp-1">${p.title}</h4>
            <p class="text-xs text-spotTextMuted mt-1 line-clamp-2">${p.description || 'Sin descripción'}</p>
            <div class="text-2xl font-black text-spotGreen mt-4">$ ${Number(p.price || 0).toLocaleString()}</div>
          </div>
        </div>
        <div class="p-5 pt-0">
          <button onclick="buyProduct('${p._id}')" class="w-full bg-spotGreen text-black hover:bg-spotGreenHover font-bold py-2.5 rounded-full text-sm transition transform active:scale-95 shadow-md shadow-spotGreen/10">
            Comprar Ahora
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-red-400 font-medium">Error al conectar con la API de Vercel.</div>`;
  }
}

// 6. INICIAR COMPRA (abre el modal de checkout)
function buyProduct(productId) {
  const token = getToken();
  if (!token) {
    alert('Debes iniciar sesión para comprar');
    toggleModal('modalLogin');
    return;
  }
  selectedProductId = productId;
  toggleModal('modalCheckout');
}