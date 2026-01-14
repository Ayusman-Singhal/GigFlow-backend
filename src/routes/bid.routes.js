const express = require('express');
const bidController = require('../controllers/bid.controller');
const hireController = require('../controllers/hire.controller');
const { authenticate } = require('../middleware');

const router = express.Router();

// POST /api/bids - Create bid (auth required)
router.post('/', authenticate, bidController.createBid);

// GET /api/bids/my - Get all user's bids (auth required) - MUST be before /my/:gigId
router.get('/my', authenticate, bidController.getMyBids);

// GET /api/bids/my/:gigId - Get user's own bid for a gig (auth required)
router.get('/my/:gigId', authenticate, bidController.getMyBid);

// PUT /api/bids/:bidId - Update user's own bid (auth required)
router.put('/:bidId', authenticate, bidController.updateBid);

// GET /api/bids/:gigId - Get bids for gig (auth required, owner only)
router.get('/:gigId', authenticate, bidController.getBidsForGig);

// PATCH /api/bids/:bidId/hire - Hire freelancer (auth required, gig owner only)
router.patch('/:bidId/hire', authenticate, hireController.hireBid);

module.exports = router;
