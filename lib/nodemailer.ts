import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS,
    }
})

export async function sendMail({ to, subject, html }: { to: string, subject: string, html: string }) {
    await transport.sendMail({
        from: process.env.SMTP_FROM!,
        to,
        subject,
        html
    })
}