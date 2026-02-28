import dotenv from 'dotenv';
dotenv.config();
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  authMethod: "LOGIN",
  auth: {
    user: String(process.env.MAIL_USER || process.env.EMAIL_USER),
    pass: String(process.env.MAIL_PASS || process.env.EMAIL_PASS)
  }
});
