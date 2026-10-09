const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return null;
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    return transporter;
}

// Si no hay SMTP configurado, no envía nada (la notificación dentro de la app igual se guarda)
async function sendMail({ to, subject, text }) {
    const t = getTransporter();
    if (!t) {
        console.warn("SMTP no configurado: correo no enviado");
        return;
    }
    await t.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text
    });
}

module.exports = { sendMail };