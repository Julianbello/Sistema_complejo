const mongoose = require("mongoose");

let connected = false;

async function connectDatabase() {
    if (connected) {
        return;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI no está configurada");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    connected = true;

    console.log("MongoDB conectado correctamente");
}

module.exports = connectDatabase;