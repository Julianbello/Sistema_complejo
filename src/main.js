// Funciones globales para modales
function toggleModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.toggle('hidden');
    modal.classList.toggle('flex');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();

  // Registro de usuario
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
          alert('¡Usuario registrado con éxito!');
          toggleModal('modalRegister');
          formRegister.reset();
        } else {
          alert(data.error || 'Error al registrar usuario');
        }
      } catch (err) {
        alert('Error de conexión con el servidor');
      }
    });
  }

  // Publicar producto
  const formProduct = document.getElementById('formProduct');
  if (formProduct) {
    formProduct.addEventListener('submit', async (e) => {
      e.preventDefault();
      const productData = {
        title: document.getElementById('prodTitle').value,
        description: document.getElementById('prodDesc').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        category: document.getElementById('prodCategory').value,
        image: document.getElementById('prodImage').value || 'https://via.placeholder.com/300'
      };

      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
        if (res.ok) {
          alert('¡Producto publicado con éxito!');
          toggleModal('modalProduct');
          formProduct.reset();
          loadProducts();
        } else {
          alert('Error al publicar el producto');
        }
      } catch (err) {
        alert('Error de conexión con la API');
      }
    });
  }

  // Filtros de Búsqueda
  document.getElementById('btnFilter').addEventListener('click', loadProducts);
  document.getElementById('btnSearch').addEventListener('click', loadProducts);
});

// Función para obtener y renderizar productos desde Vercel API
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  const countLabel = document.getElementById('productCount');
  
  const search = document.getElementById('searchInput').value;
  const category = document.getElementById('filterCategory').value;
  const minPrice = document.getElementById('minPrice').value;
  const maxPrice = document.getElementById('maxPrice').value;

  let query = `/api/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`;
  if (minPrice) query += `&minPrice=${minPrice}`;
  if (maxPrice) query += `&maxPrice=${maxPrice}`;

  try {
    const res = await fetch(query);
    const products = await res.json();

    grid.innerHTML = '';
    countLabel.textContent = `${products.length} productos encontrados`;

    if (products.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">No se encontraron productos que coincidan.</div>`;
      return;
    }

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = "bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between";
      card.innerHTML = `
        <div>
          <img src="${p.image || 'https://via.placeholder.com/300'}" alt="${p.title}" class="w-full h-48 object-cover border-b" />
          <div class="p-4">
            <span class="text-xs bg-orange-100 text-temuOrange font-bold px-2 py-0.5 rounded">${p.category || 'General'}</span>
            <h4 class="font-bold text-gray-800 text-base mt-2 line-clamp-1">${p.title}</h4>
            <p class="text-xs text-gray-500 mt-1 line-clamp-2">${p.description}</p>
            <div class="text-2xl font-black text-gray-900 mt-3">$ ${Number(p.price).toLocaleString()}</div>
            <span class="text-xs text-green-600 font-semibold">Envío Gratis</span>
          </div>
        </div>
        <div class="p-4 pt-0">
          <button onclick="buyProduct(${p.id})" class="w-full bg-mlBlue hover:bg-blue-600 text-white py-2 rounded font-bold text-sm transition">Comprar Ahora</button>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-red-500 font-semibold">Error al cargar productos desde la API de Vercel.</div>`;
  }
}

// Función de Compra Directa
async function buyProduct(productId) {
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    if (res.ok) {
      alert('¡Orden registrada e iniciada con éxito!');
    } else {
      alert('Error al generar la orden');
    }
  } catch (err) {
    alert('Error al procesar la compra');
  }
}