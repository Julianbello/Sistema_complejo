const mongoose = require("mongoose");

// Cache global: en Vercel (serverless) evita abrir una conexión nueva en cada petición
let cached = global._mongooseCache;
if (!cached) {
    cached = global._mongooseCache = { conn: null, promise: null };
}

async function connectDatabase() {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    // Si la conexión se cayó, se obliga a crear una nueva
    if (cached.conn && mongoose.connection.readyState !== 1) {
        cached.conn = null;
        cached.promise = null;
    }

    // Prioridad: variable de entorno MONGODB_URI (Vercel -> Settings -> Environment Variables).
    // Si no existe, usa esta URI. Cambia Jul14nb3ll0 por tu contraseña original de Mongo.
    const mongoUri =
        process.env.MONGODB_URI ||
        "mongodb+srv://julianbellotiven_db_user:Jul14nb3ll0@cluster0.ltmtv9n.mongodb.net/giate?retryWrites=true&w=majority&appName=Cluster0";

    if (!cached.promise) {
        cached.promise = mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 8000
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        cached.conn = null;
        throw error;
    }

    return cached.conn;
}

module.exports = connectDatabase;