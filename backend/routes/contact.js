const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// @route   POST /api/contact/send
// @desc    Send email via Gmail (Port 587)
router.post('/send', async (req, res) => {
    const { name, email, message } = req.body;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("❌ CRITICAL: Missing credentials in Render Environment.");
        return res.status(500).json({ success: false, error: 'Server config error.' });
    }

    try {
        // 1. Configure Transporter (Switched to Port 587)
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,              // <--- CHANGED from 465
            secure: false,          // <--- CHANGED to false (required for 587)
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // Increase timeouts to prevent "ETIMEDOUT"
            connectionTimeout: 20000, // 20 seconds
            socketTimeout: 20000,
            tls: {
                ciphers: 'SSLv3'    // Helps compatibility
            }
        });

        // 2. Define Email
        const mailOptions = {
            from: `"${name}" <${process.env.EMAIL_USER}>`,
            replyTo: email,
            to: process.env.EMAIL_USER,
            subject: `🚀 New Arithmo Contact: ${name}`,
            text: `Message from: ${name} (${email})\n\n${message}`,
            html: `
                <h3>🚀 New Contact Message</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <div style="background:#f4f4f4; padding:15px; border-radius:10px;">
                    ${message.replace(/\n/g, '<br>')}
                </div>
            `
        };

        // 3. Send
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully from ${email}`);
        res.status(200).json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error('❌ Email Error:', error);
        res.status(500).json({ success: false, error: 'Connection failed. Please try again.' });
    }
});

module.exports = router;