const express = require('express');
const { authenticate } = require('../middleware');

const router = express.Router();

/**
 * GET /api/auth/me
 * Get current authenticated user's MongoDB details
 */
router.get('/me', authenticate, (req, res) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        clerkUserId: user.clerkUserId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user data',
    });
  }
});

module.exports = router;
