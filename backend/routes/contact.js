const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// @route   POST /api/contact/send
// @desc    Send email to admin
// @access  Public
router.post('/send', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, error: 'Please fill all fields' });
    }

    try {
        // 1. Configure the Transporter (Your Gmail)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail
                pass: process.env.EMAIL_PASS  // Your App Password
            }
        });

        // 2. Define the Email
        const mailOptions = {
            from: `"${name}" <${process.env.EMAIL_USER}>`, // Shows as "John Doe" <your-email>
            replyTo: email, // Clicking reply replies to the user
            to: process.env.EMAIL_USER, // Sends TO you
            subject: `🚀 New Arithmo Contact: ${name}`,
            text: `
You have a new message from the Arithmo Contact Form:

Name: ${name}
Email: ${email}

Message:
${message}
            `,
            html: `
<h3>🚀 New Contact Message</h3>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<br>
<p><strong>Message:</strong></p>
<div style="background:#f4f4f4; padding:15px; border-radius:10px;">
    ${message.replace(/\n/g, '<br>')}
</div>
            `
        };

        // 3. Send
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent from ${email}`);
        res.status(200).json({ success: true, message: 'Email sent successfully' });

    } catch (error) {
        console.error('Email Error:', error);
        res.status(500).json({ success: false, error: 'Failed to send email. Server error.' });
    }
});

module.exports = router;