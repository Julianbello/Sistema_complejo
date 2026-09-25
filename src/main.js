// src/main.js
const API_URL = '/api';
let jwtToken = localStorage.getItem('token') || '';

function toggleModal(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

document.getElementById('reg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const telefono = document.getElementById('reg-tel').value;

    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, telefono })
    });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        jwtToken = data.token;
        alert('Usuario registrado con éxito');
        toggleModal('modal-reg');
    } else {
        document.getElementById('reg-error').innerText = data.error;
    }
});

async function loadProducts() {
    const search = document.getElementById('search-input').value;
    const cat = document.getElementById('cat-select').value;
    const min = document.getElementById('min-price').value;
    const max = document.getElementById('max-price').value;

    const query = new URLSearchParams({ search, category: cat, minPrice: min, maxPrice: max });
    const res = await fetch(`${API_URL}/products?${query}`);
    const { data } = await res.json();

    const container = document.getElementById('product-list');
    container.innerHTML = (data && data.length) ? data.map(p => `
        <div class="prod-card">
            <h4>${p.titulo}</h4>
            <p>$${p.precio}</p>
            <button class="btn btn-success" onclick="buyProduct('${p.id}')">Comprar Ahora</button>
        </div>
    `).join('') : '<p>No hay productos disponibles.</p>';
}

async function buyProduct(productoId) {
    if (!jwtToken) return alert('Debes registrarte o iniciar sesión');

    const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ productoId, direccionEntrega: 'Dirección de prueba', metodoPago: 'Tarjeta' })
    });
    const data = await res.json();
    if (res.ok) {
        alert('¡Compra realizada con éxito!');
        loadProducts();
    } else {
        alert(data.error);
    }
}

document.getElementById('btn-filter').addEventListener('click', loadProducts);
loadProducts();