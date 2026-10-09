const Notification = require("../models/notification");
const connectDatabase = require("../config/database");

async function getMyNotifications(req, res) {
    try {
        await connectDatabase();

        const [data, unreadCount] = await Promise.all([
            Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(20),
            Notification.countDocuments({ user: req.user.id, read: false })
        ]);

        return res.json({ success: true, unreadCount, data });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error al obtener las notificaciones" });
    }
}

async function markAllRead(req, res) {
    try {
        await connectDatabase();
        await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
        return res.json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error al marcar las notificaciones" });
    }
}

module.exports = { getMyNotifications, markAllRead };   