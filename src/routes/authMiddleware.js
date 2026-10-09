const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "giate_secreto_largo_cambiar_2026_xyz789";

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Token de autenticación requerido"
        });
    }

    const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token inválido o expirado"
        });
    }
}

module.exports = authenticateToken;