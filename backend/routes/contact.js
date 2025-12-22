const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// @route   POST /api/contact/send
// @desc    Send email to admin
// @access  Public
router.post('/send', async (req, res) => {
    const { name, email, message } = req.body;

    // 1. Check if Env Vars are loaded
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("❌ CRITICAL: Missing EMAIL_USER or EMAIL_PASS in environment variables.");
        return res.status(500).json({ success: false, error: 'Server configuration error: Missing email credentials.' });
    }

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: 'Please fill all fields' });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Verify connection configuration
        await new Promise((resolve, reject) => {
            transporter.verify(function (error, success) {
                if (error) {
                    console.error("❌ Transporter Verification Failed:", error);
                    reject(error);
                } else {
                    console.log("✅ Server is ready to take our messages");
                    resolve(success);
                }
            });
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

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully from ${email}`);
        res.status(200).json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error('❌ Email Sending Error:', error);
        // Send the specific error message back to frontend (for debugging only)
        // In production, you might want to hide this, but for now it helps.
        res.status(500).json({ success: false, error: `Failed to send: ${error.message}` });
    }
});

module.exports = router;