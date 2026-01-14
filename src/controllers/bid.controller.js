const { Bid, BID_STATUS, Gig, GIG_STATUS } = require('../models');

const createBid = async (req, res) => {
  try {
    const { gigId, message, price } = req.body;
    const freelancerId = req.user._id;

    const errors = [];

    if (!gigId || typeof gigId !== 'string' || !gigId.trim()) {
      errors.push('Gig ID is required');
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      errors.push('Message is required');
    }

    if (price === undefined || price === null) {
      errors.push('Price is required');
    } else if (typeof price !== 'number' || price < 1) {
      errors.push('Price must be a positive number');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    const gig = await Gig.findById(gigId);

    if (!gig) {
      return res.status(404).json({
        success: false,
        error: 'Gig not found',
      });
    }

    if (gig.status !== GIG_STATUS.OPEN) {
      return res.status(400).json({
        success: false,
        error: 'Gig is no longer accepting bids',
      });
    }

    if (gig.ownerId.toString() === freelancerId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You cannot bid on your own gig',
      });
    }

    // Use freelancerId from authenticated session, not client input
    const bid = await Bid.create({
      gigId,
      freelancerId,
      message: message.trim(),
      price,
      status: BID_STATUS.PENDING,
    });

    await bid.populate('freelancerId', 'name email');

    return res.status(201).json({
      success: true,
      data: {
        id: bid._id,
        gigId: bid.gigId,
        freelancer: {
          id: bid.freelancerId._id,
          name: bid.freelancerId.name,
          email: bid.freelancerId.email,
        },
        message: bid.message,
        price: bid.price,
        status: bid.status,
        createdAt: bid.createdAt,
        updatedAt: bid.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error creating bid:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'You have already submitted a bid for this gig',
      });
    }

    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details,
      });
    }

    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid gig ID format',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create bid',
    });
  }
};

const getBidsForGig = async (req, res) => {
  try {
    const { gigId } = req.params;
    const userId = req.user._id;

    const gig = await Gig.findById(gigId);

    if (!gig) {
      return res.status(404).json({
        success: false,
        error: 'Gig not found',
      });
    }

    if (gig.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the gig owner can view bids',
      });
    }

    const bids = await Bid.find({ gigId })
      .populate('freelancerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const transformedBids = bids.map((bid) => ({
      id: bid._id,
      gigId: bid.gigId,
      freelancer: bid.freelancerId
        ? {
            id: bid.freelancerId._id,
            name: bid.freelancerId.name,
            email: bid.freelancerId.email,
          }
        : null,
      message: bid.message,
      price: bid.price,
      status: bid.status,
      createdAt: bid.createdAt,
      updatedAt: bid.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: transformedBids,
      count: transformedBids.length,
    });
  } catch (error) {
    console.error('Error fetching bids:', error);

    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid gig ID format',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bids',
      });
  }
};

const getMyBid = async (req, res) => {
  try {
    const { gigId } = req.params;
    const userId = req.user._id;

    const bid = await Bid.findOne({ gigId, freelancerId: userId })
      .populate('freelancerId', 'name email')
      .lean();

    if (!bid) {
      return res.status(404).json({
        success: false,
        error: 'No bid found',
      });
    }

    // Transform response
    const transformedBid = {
      id: bid._id,
      gigId: bid.gigId,
      freelancer: bid.freelancerId
        ? {
            id: bid.freelancerId._id,
            name: bid.freelancerId.name,
            email: bid.freelancerId.email,
          }
        : null,
      message: bid.message,
      price: bid.price,
      status: bid.status,
      createdAt: bid.createdAt,
      updatedAt: bid.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: transformedBid,
    });
  } catch (error) {
    console.error('Error fetching user bid:', error);

    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid gig ID format',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bid',
    });
  }
};

const updateBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { message, price } = req.body;
    const userId = req.user._id;

    const errors = [];

    if (!message || typeof message !== 'string' || !message.trim()) {
      errors.push('Message is required');
    }

    if (price === undefined || price === null) {
      errors.push('Price is required');
    } else if (typeof price !== 'number' || price < 1) {
      errors.push('Price must be a positive number');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // Find the bid
    const bid = await Bid.findById(bidId);

    if (!bid) {
      return res.status(404).json({
        success: false,
        error: 'Bid not found',
      });
    }

    // Verify the bid belongs to the user
    if (bid.freelancerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own bids',
      });
    }

    // Check if bid is still pending
    if (bid.status !== BID_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update a bid that is not pending',
      });
    }

    // Verify gig is still open
    const gig = await Gig.findById(bid.gigId);
    if (!gig) {
      return res.status(404).json({
        success: false,
        error: 'Gig not found',
      });
    }

    if (gig.status !== GIG_STATUS.OPEN) {
      return res.status(400).json({
        success: false,
        error: 'Gig is no longer accepting bids',
      });
    }

    // Update the bid
    bid.message = message.trim();
    bid.price = price;
    await bid.save();

    // Populate freelancer for response
    await bid.populate('freelancerId', 'name email');

    return res.status(200).json({
      success: true,
      data: {
        id: bid._id,
        gigId: bid.gigId,
        freelancer: {
          id: bid.freelancerId._id,
          name: bid.freelancerId.name,
          email: bid.freelancerId.email,
        },
        message: bid.message,
        price: bid.price,
        status: bid.status,
        createdAt: bid.createdAt,
        updatedAt: bid.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating bid:', error);

    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details,
      });
    }

    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid bid ID format',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update bid',
    });
  }
};

const getMyBids = async (req, res) => {
  try {
    const userId = req.user._id;

    const bids = await Bid.find({ freelancerId: userId })
      .populate('gigId', 'title description budget status')
      .populate('freelancerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const transformedBids = bids.map((bid) => ({
      id: bid._id,
      amount: bid.amount,
      proposal: bid.proposal,
      status: bid.status,
      gig: bid.gigId ? {
        id: bid.gigId._id,
        title: bid.gigId.title,
        description: bid.gigId.description,
        budget: bid.gigId.budget,
        status: bid.gigId.status,
      } : null,
      freelancer: {
        id: bid.freelancerId._id,
        name: bid.freelancerId.name,
        email: bid.freelancerId.email,
      },
      createdAt: bid.createdAt,
      updatedAt: bid.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: transformedBids,
      count: transformedBids.length,
    });
  } catch (error) {
    console.error('Error fetching user bids:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch your bids',
    });
  }
};

module.exports = {
  createBid,
  getBidsForGig,
  getMyBid,
  updateBid,
  getMyBids,
};
