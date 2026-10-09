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

    const mongoUri =
        process.env.MONGODB_URI ||
        "mongodb+srv://julianbellotiven_db_user:Jul14nb3ll0@cluster0.ltmtv9n.mongodb.net/giate?retryWrites=true&w=majority&appName=Cluster0";

    if (mongoUri.includes("Jul14nb3ll0")) {
        throw new Error("Falta poner la contraseña de MongoDB en src/config/database.js");
    }

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