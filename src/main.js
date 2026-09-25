// Alternar visibilidad de modales
function toggleModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.toggle('hidden');
    modal.classList.toggle('flex');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  // 1. REGISTRO DE USUARIO
  const formRegister = document.getElementById('formRegister');
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();

      const userData = {
        name: document.getElementById('regName').value,
        nombre: document.getElementById('regName').value, // Compatibilidad con ambas claves
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        phone: document.getElementById('regPhone').value,
        telefono: document.getElementById('regPhone').value
      };

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });

        const data = await res.json();

        if (res.ok) {
          // Guardar usuario simulado en almacenamiento local
          const userObj = data.user || { id: Date.now(), name: userData.name };
          localStorage.setItem('currentUser', JSON.stringify(userObj));

          alert('¡Usuario registrado con éxito!');
          toggleModal('modalRegister');
          formRegister.reset();
        } else {
          alert(data.error || data.message || 'Error al registrar el usuario');
        }
      } catch (err) {
        console.error(err);
        alert('Error de red al intentar registrar el usuario');
      }
    });
  }

  // 2. PUBLICAR PRODUCTO
  const formProduct = document.getElementById('formProduct');
  if (formProduct) {
    formProduct.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Obtener usuario guardado o usar ID predeterminado (1)
      const savedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const userId = savedUser.id || 1;

      const productData = {
        title: document.getElementById('prodTitle').value,
        titulo: document.getElementById('prodTitle').value,
        description: document.getElementById('prodDesc').value,
        descripcion: document.getElementById('prodDesc').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        precio: parseFloat(document.getElementById('prodPrice').value),
        category: document.getElementById('prodCategory').value,
        categoria: document.getElementById('prodCategory').value,
        image: document.getElementById('prodImage').value || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        usuario_id: userId,
        vendedor_id: userId
      };

      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });

        const data = await res.json();

        if (res.ok) {
          alert('¡Producto publicado con éxito!');
          toggleModal('modalProduct');
          formProduct.reset();
          loadProducts();
        } else {
          alert(data.error || data.message || 'Error al publicar el producto');
        }
      } catch (err) {
        console.error(err);
        alert('Error de red al intentar publicar el producto');
      }
    });
  }

  // Filtros de búsqueda
  const btnFilter = document.getElementById('btnFilter');
  if (btnFilter) btnFilter.addEventListener('click', loadProducts);

  const btnSearch = document.getElementById('btnSearch');
  if (btnSearch) btnSearch.addEventListener('click', loadProducts);
});

// 3. CARGAR PRODUCTOS DESDE LA API
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
    const products = await res.json();

    grid.innerHTML = '';
    if (countLabel) countLabel.textContent = `${products.length || 0} publicaciones`;

    if (!Array.isArray(products) || products.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center py-12 text-spotTextMuted">No se encontraron productos. ¡Sé el primero en publicar uno!</div>`;
      return;
    }

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = "bg-spotCard rounded-2xl border border-white/5 overflow-hidden shadow-xl hover:border-spotGreen/30 transition duration-300 flex flex-col justify-between group";
      card.innerHTML = `
        <div>
          <div class="relative overflow-hidden h-48 bg-black">
            <img src="${p.image || p.imagen || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'}" alt="${p.title || p.titulo}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            <span class="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-spotGreen text-xs font-bold px-2.5 py-1 rounded-full border border-spotGreen/20">
              ${p.category || p.categoria || 'General'}
            </span>
          </div>
          <div class="p-5">
            <h4 class="font-bold text-white text-base line-clamp-1">${p.title || p.titulo}</h4>
            <p class="text-xs text-spotTextMuted mt-1 line-clamp-2">${p.description || p.descripcion || 'Sin descripción'}</p>
            <div class="text-2xl font-black text-spotGreen mt-4">$ ${Number(p.price || p.precio || 0).toLocaleString()}</div>
          </div>
        </div>
        <div class="p-5 pt-0">
          <button onclick="buyProduct(${p.id})" class="w-full bg-spotGreen text-black hover:bg-spotGreenHover font-bold py-2.5 rounded-full text-sm transition transform active:scale-95 shadow-md shadow-spotGreen/10">
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

// 4. COMPRA DE PRODUCTO
async function buyProduct(productId) {
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    if (res.ok) {
      alert('¡Orden de compra generada con éxito en GIATE!');
    } else {
      alert('Error al generar la orden');
    }
  } catch (err) {
    alert('Error al procesar la compra');
  }
}