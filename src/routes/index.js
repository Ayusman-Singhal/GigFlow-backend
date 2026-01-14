const express = require('express');
const gigRoutes = require('./gig.routes');
const bidRoutes = require('./bid.routes');
const authRoutes = require('./auth.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/gigs', gigRoutes);
router.use('/bids', bidRoutes);

module.exports = router;
