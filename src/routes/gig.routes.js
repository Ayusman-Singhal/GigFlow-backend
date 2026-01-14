const express = require('express');
const gigController = require('../controllers/gig.controller');
const { authenticate, optionalAuthenticate } = require('../middleware');

const router = express.Router();

// GET /api/gigs - List open gigs (public)
router.get('/', gigController.listGigs);

// GET /api/gigs/my - Get user's own gigs (auth required) - MUST be before /:id
router.get('/my', authenticate, gigController.getMyGigs);

// GET /api/gigs/:id - Get gig by id (public, but checks auth if present for ownership)
router.get('/:id', optionalAuthenticate, gigController.getGigById);

// POST /api/gigs - Create gig (auth required)
router.post('/', authenticate, gigController.createGig);

// PATCH /api/gigs/:id/close - Close gig without selecting anyone (auth required, owner only)
router.patch('/:id/close', authenticate, gigController.closeGig);

module.exports = router;
