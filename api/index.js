const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Base de datos temporal en memoria
let products = [
  {
    id: 1,
    title: "iPhone 13 128GB",
    description: "Excelente estado, incluye cargador.",
    price: 1800000,
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500"
  },
  {
    id: 2,
    title: "Chaqueta Oversize Streetwear",
    description: "Talla XL, poco uso, estilo urbano.",
    price: 120000,
    category: "Ropa",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500"
  }
];

let users = [];
let orders = [];

// Rutas de Usuarios
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }
  const newUser = { id: Date.now(), name, email, password, phone };
  users.push(newUser);
  res.status(201).json({ message: 'Usuario registrado', user: newUser });
});

// Rutas de Productos
app.get('/api/products', (req, res) => {
  const { search, category, minPrice, maxPrice } = req.query;
  let filtered = [...products];

  if (search) {
    filtered = filtered.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
  }
  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }
  if (minPrice) {
    filtered = filtered.filter(p => p.price >= parseFloat(minPrice));
  }
  if (maxPrice) {
    filtered = filtered.filter(p => p.price <= parseFloat(maxPrice));
  }

  res.json(filtered);
});

app.post('/api/products', (req, res) => {
  const { title, description, price, category, image } = req.body;
  if (!title || !price) {
    return res.status(400).json({ error: 'Título y precio son obligatorios' });
  }
  const newProduct = {
    id: Date.now(),
    title,
    description: description || '',
    price: parseFloat(price),
    category: category || 'General',
    image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'
  };
  products.unshift(newProduct);
  res.status(201).json(newProduct);
});

// Rutas de Órdenes
app.post('/api/orders', (req, res) => {
  const { productId, quantity } = req.body;
  const newOrder = { id: Date.now(), productId, quantity: quantity || 1, date: new Date() };
  orders.push(newOrder);
  res.status(201).json({ message: 'Orden generada con éxito', order: newOrder });
});

module.exports = app;