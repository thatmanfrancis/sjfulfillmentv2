import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true for 465, false for other ports (587)
    auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS?.replace(/\s/g, ''), // Remove any spaces from password
    },
    tls: {
        rejectUnauthorized: false // Allow self-signed certificates if needed
    }
})

export async function sendMail({ to, subject, html }: { to: string, subject: string, html: string }) {
    try {
        const info = await transport.sendMail({
            from: process.env.SMTP_FROM!,
            to,
            subject,
            html
        });
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}