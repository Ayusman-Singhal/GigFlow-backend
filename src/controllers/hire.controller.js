const mongoose = require('mongoose');
const { Bid, BID_STATUS, Gig, GIG_STATUS } = require('../models');

const hireBid = async (req, res) => {
  // Use transactions to prevent race conditions during concurrent hire attempts
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { bidId } = req.params;
    const userId = req.user._id;

    const bid = await Bid.findById(bidId).session(session);

    if (!bid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        error: 'Bid not found',
      });
    }

    const gig = await Gig.findById(bid.gigId).session(session);

    if (!gig) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        error: 'Gig not found',
      });
    }

    if (gig.ownerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        error: 'Only the gig owner can hire a freelancer',
      });
    }

    if (gig.status !== GIG_STATUS.OPEN) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        error: 'This gig has already been assigned',
      });
    }

    if (bid.status !== BID_STATUS.PENDING) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        error: 'This bid is no longer available for hiring',
      });
    }

    await Gig.findByIdAndUpdate(
      gig._id,
      {
        status: GIG_STATUS.ASSIGNED,
        hiredFreelancerId: bid.freelancerId,
        hiredBidId: bid._id,
      },
      { session }
    );

    await Bid.findByIdAndUpdate(
      bid._id,
      { status: BID_STATUS.HIRED },
      { session }
    );

    // Reject other pending bids
    await Bid.updateMany(
      {
        gigId: gig._id,
        _id: { $ne: bid._id },
        status: BID_STATUS.PENDING,
      },
      { status: BID_STATUS.REJECTED },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const updatedGig = await Gig.findById(gig._id)
      .populate('ownerId', 'name email')
      .populate('hiredFreelancerId', 'name email')
      .lean();

    const updatedBid = await Bid.findById(bid._id)
      .populate('freelancerId', 'name email')
      .lean();

    try {
      const socketUtil = require('../utils/socket');
      if (socketUtil && socketUtil.emitToUser) {
        const freelancerMongoId = bid.freelancerId.toString();
        console.log('Attempting to emit bid:hired to user:', freelancerMongoId);
        socketUtil.emitToUser(freelancerMongoId, 'bid:hired', {
          gigId: gig._id,
          gigTitle: updatedGig.title,
          bidId: bid._id,
        });
        console.log('Successfully emitted bid:hired event');
      }
    } catch (socketError) {
      console.error('Socket notification error:', socketError);
    }

    return res.status(200).json({
      success: true,
      data: {
        gig: {
          id: updatedGig._id,
          title: updatedGig.title,
          description: updatedGig.description,
          budget: updatedGig.budget,
          status: updatedGig.status,
          owner: updatedGig.ownerId
            ? {
                id: updatedGig.ownerId._id,
                name: updatedGig.ownerId.name,
                email: updatedGig.ownerId.email,
              }
            : null,
          hiredFreelancer: updatedGig.hiredFreelancerId
            ? {
                id: updatedGig.hiredFreelancerId._id,
                name: updatedGig.hiredFreelancerId.name,
                email: updatedGig.hiredFreelancerId.email,
              }
            : null,
        },
        bid: {
          id: updatedBid._id,
          message: updatedBid.message,
          price: updatedBid.price,
          status: updatedBid.status,
          freelancer: updatedBid.freelancerId
            ? {
                id: updatedBid.freelancerId._id,
                name: updatedBid.freelancerId.name,
                email: updatedBid.freelancerId.email,
              }
            : null,
        },
      },
      message: 'Freelancer hired successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error hiring freelancer:', error);

    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid bid ID format',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to hire freelancer',
    });
  }
};

module.exports = {
  hireBid,
};
