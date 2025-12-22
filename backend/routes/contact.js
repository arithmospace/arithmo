const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// @route   POST /api/contact/send
// @desc    Send email to admin
// @access  Public
router.post('/send', async (req, res) => {
    const { name, email, message } = req.body;

    // 1. Check Env Vars
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("❌ CRITICAL: Missing credentials in Render Environment.");
        return res.status(500).json({ success: false, error: 'Server config error.' });
    }

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: 'Please fill all fields' });
    }

    try {
        // 2. Configure Transporter (UPDATED FOR RENDER)
        // We use specific host and port to avoid timeouts
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // Use SSL
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            // 3. Add Timeouts to fail faster if stuck
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 10000,
            socketTimeout: 10000
        });

        // 4. Verify Connection First
        await new Promise((resolve, reject) => {
            transporter.verify(function (error, success) {
                if (error) {
                    console.error("❌ SMTP Connection Failed:", error);
                    reject(error);
                } else {
                    console.log("✅ SMTP Connected. Ready to send.");
                    resolve(success);
                }
            });
        });

        // 5. Define Email
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

        // 6. Send
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully from ${email}`);
        res.status(200).json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error('❌ Final Send Error:', error);
        res.status(500).json({ success: false, error: 'Connection failed. Please try again.' });
    }
});

module.exports = router;