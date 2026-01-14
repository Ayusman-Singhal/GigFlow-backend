const { Gig, GIG_STATUS } = require('../models');

const listGigs = async (req, res) => {
  try {
    const { search } = req.query;

    const query = { status: GIG_STATUS.OPEN };

    if (search && search.trim()) {
      query.title = {
        $regex: search.trim(),
        $options: 'i',
      };
    }

    const gigs = await Gig.find(query)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const transformedGigs = gigs.map((gig) => ({
      id: gig._id,
      title: gig.title,
      description: gig.description,
      budget: gig.budget,
      status: gig.status,
      owner: gig.ownerId
        ? {
            id: gig.ownerId._id,
            name: gig.ownerId.name,
            email: gig.ownerId.email,
          }
        : null,
      createdAt: gig.createdAt,
      updatedAt: gig.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: transformedGigs,
      count: transformedGigs.length,
    });
  } catch (error) {
    console.error('Error listing gigs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch gigs',
    });
  }
};

const getGigById = async (req, res) => {
  try {
    const { id } = req.params;

    const gig = await Gig.findById(id)
      .populate('ownerId', 'name email')
      .lean();

    if (!gig) {
      return res.status(404).json({
        success: false,
        error: 'Gig not found',
      });
    }

    let highestBidder = null;
    if (gig.status === GIG_STATUS.OPEN) {
      const { Bid } = require('../models');
      const lowestBid = await Bid.findOne({ gigId: id, status: 'pending' })
        .sort({ price: 1 })
        .populate('freelancerId', 'name')
        .lean();
      
      if (lowestBid && lowestBid.freelancerId) {
        highestBidder = {
          name: lowestBid.freelancerId.name,
          price: lowestBid.price,
        };
      }
    }

    // Check if the requesting user is the owner
    const isOwner = req.user && gig.ownerId._id.toString() === req.user._id.toString();

    const data = {
      id: gig._id,
      title: gig.title,
      description: gig.description,
      budget: gig.budget,
      status: gig.status,
      owner: gig.ownerId
        ? {
            id: gig.ownerId._id,
            name: gig.ownerId.name,
            email: gig.ownerId.email,
          }
        : null,
      isOwner,
      highestBidder,
      createdAt: gig.createdAt,
      updatedAt: gig.updatedAt,
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error fetching gig by id:', error);

    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid gig ID format',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch gig',
    });
  }
};

const createGig = async (req, res) => {
  try {
    const { title, description, budget } = req.body;

    const errors = [];

    if (!title || typeof title !== 'string' || !title.trim()) {
      errors.push('Title is required');
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      errors.push('Description is required');
    }

    if (budget === undefined || budget === null) {
      errors.push('Budget is required');
    } else if (typeof budget !== 'number' || budget < 1) {
      errors.push('Budget must be a positive number');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // Create gig with ownerId from authenticated user
    // NEVER accept ownerId from client
    const gig = await Gig.create({
      title: title.trim(),
      description: description.trim(),
      budget,
      ownerId: req.user._id,
      status: GIG_STATUS.OPEN,
    });

    // Populate owner for response
    await gig.populate('ownerId', 'name email');

    return res.status(201).json({
      success: true,
      data: {
        id: gig._id,
        title: gig.title,
        description: gig.description,
        budget: gig.budget,
        status: gig.status,
        owner: {
          id: gig.ownerId._id,
          name: gig.ownerId.name,
          email: gig.ownerId.email,
        },
        createdAt: gig.createdAt,
        updatedAt: gig.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error creating gig:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create gig',
    });
  }
};

const getMyGigs = async (req, res) => {
  try {
    const userId = req.user._id;

    const gigs = await Gig.find({ ownerId: userId })
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const transformedGigs = gigs.map((gig) => ({
      id: gig._id,
      title: gig.title,
      description: gig.description,
      budget: gig.budget,
      status: gig.status,
      owner: {
        id: gig.ownerId._id,
        name: gig.ownerId.name,
        email: gig.ownerId.email,
      },
      createdAt: gig.createdAt,
      updatedAt: gig.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: transformedGigs,
      count: transformedGigs.length,
    });
  } catch (error) {
    console.error('Error fetching user gigs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch your gigs',
    });
  }
};

const closeGig = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const gig = await Gig.findById(id);

    if (!gig) {
      return res.status(404).json({
        success: false,
        error: 'Gig not found',
      });
    }

    // Validate: Only gig owner can close
    if (gig.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only the gig owner can close this gig',
      });
    }

    // Validate: Can only close if open
    if (gig.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'This gig is already closed or assigned',
      });
    }

    // Update gig status to closed
    gig.status = 'closed';
    await gig.save();

    // Reject all pending bids for this gig
    await require('../models').Bid.updateMany(
      { gigId: id, status: 'pending' },
      { status: 'rejected' }
    );

    const updatedGig = await Gig.findById(id)
      .populate('ownerId', 'name email')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        id: updatedGig._id,
        title: updatedGig.title,
        description: updatedGig.description,
        budget: updatedGig.budget,
        status: updatedGig.status,
        owner: {
          id: updatedGig.ownerId._id,
          name: updatedGig.ownerId.name,
          email: updatedGig.ownerId.email,
        },
        createdAt: updatedGig.createdAt,
        updatedAt: updatedGig.updatedAt,
      },
      message: 'Gig closed successfully',
    });
  } catch (error) {
    console.error('Error closing gig:', error);

    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid gig ID format',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to close gig',
    });
  }
};

module.exports = {
  listGigs,
  createGig,
  getGigById,
  getMyGigs,
  closeGig,
};
