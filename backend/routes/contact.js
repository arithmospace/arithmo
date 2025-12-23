const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// @route   POST /api/contact/send
// @desc    Send email via Gmail (Robust Configuration)
router.post('/send', async (req, res) => {
    const { name, email, message } = req.body;

    // 1. Check Credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("❌ CRITICAL: Missing EMAIL credentials in Render Environment.");
        return res.status(500).json({ success: false, error: 'Server config error: Missing credentials.' });
    }

    // 2. Validate Input
    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: 'Please fill all fields' });
    }

    try {
        // 3. Configure Transporter (The "Sure Shot" Fix)
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Use the built-in gmail service wrapper
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                // This bypasses the specific SSL error often seen on Render/Cloud
                rejectUnauthorized: false
            }
        });

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

        // 4. Send
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully from ${email}`);
        res.status(200).json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error('❌ Email Sending Error:', error);
        // We log the specific error to the console for you to see in Render Logs
        res.status(500).json({ success: false, error: 'Connection failed. Please try again.' });
    }
});

module.exports = router;