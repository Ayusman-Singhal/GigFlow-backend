const mongoose = require('mongoose');

const GIG_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  CLOSED: 'closed',
};

const gigSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    budget: {
      type: Number,
      required: [true, 'Budget is required'],
      min: [1, 'Budget must be at least 1'],
      max: [1000000, 'Budget cannot exceed 1,000,000'],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(GIG_STATUS),
        message: 'Status must be open, assigned, or closed',
      },
      default: GIG_STATUS.OPEN,
      index: true,
    },
    hiredFreelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    hiredBidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for querying open gigs efficiently
gigSchema.index({ status: 1, createdAt: -1 });

// Compound index for user's gigs
gigSchema.index({ ownerId: 1, createdAt: -1 });

// Static method to check if gig is open for bidding
gigSchema.methods.isOpen = function () {
  return this.status === GIG_STATUS.OPEN;
};

// Static method to check if user is the owner
gigSchema.methods.isOwnedBy = function (userId) {
  return this.ownerId.toString() === userId.toString();
};

const Gig = mongoose.model('Gig', gigSchema);

module.exports = { Gig, GIG_STATUS };
