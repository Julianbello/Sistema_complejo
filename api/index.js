const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

let users = [];
let products = [
  {
    id: 1,
    title: "iPhone 13 128GB",
    description: "Excelente estado, incluye cargador.",
    price: 1800000,
    category: "Tecnología",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500"
  }
];
let orders = [];

// Middleware o manejador para adaptar prefijo /api si llega con o sin él
const registerHandler = (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }
  const newUser = { id: Date.now(), name, email, password, phone };
  users.push(newUser);
  return res.status(200).json({ message: 'Usuario registrado con éxito', user: newUser });
};

// Se soportan ambas variaciones de ruta por compatibilidad
app.post('/api/auth/register', registerHandler);
app.post('/auth/register', registerHandler);

// Productos
app.get(['/api/products', '/products'], (req, res) => {
  res.json(products);
});

app.post(['/api/products', '/products'], (req, res) => {
  const { title, description, price, category, image } = req.body;
  const newProduct = {
    id: Date.now(),
    title: title || 'Producto sin título',
    description: description || '',
    price: parseFloat(price) || 0,
    category: category || 'General',
    image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'
  };
  products.unshift(newProduct);
  res.status(200).json(newProduct);
});

// Ordenes
app.post(['/api/orders', '/orders'], (req, res) => {
  res.status(200).json({ message: 'Orden generada con éxito' });
});

module.exports = app;