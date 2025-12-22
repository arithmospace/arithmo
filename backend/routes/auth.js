// ============================================================
// TOKEN REFRESH ENDPOINT
// ============================================================
router.post('/refresh-token', async (req, res) => {
    try {
        const oldToken = req.headers.authorization?.replace('Bearer ', '');

        if (!oldToken) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        // Verify old token (allow expired tokens for refresh)
        let decoded;
        try {
            decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
        } catch (error) {
            // If token is expired but otherwise valid, proceed
            if (error.name === 'TokenExpiredError') {
                decoded = jwt.decode(oldToken);
            } else {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token'
                });
            }
        }

        // Check if user still exists
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Generate new token (7 days)
        const newToken = jwt.sign(
            {
                userId: user._id,
                username: user.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token: newToken,
            username: user.username,
            userId: user._id.toString(),
            expiresIn: 604800 // 7 days in seconds
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'Token refresh failed'
        });
    }
});