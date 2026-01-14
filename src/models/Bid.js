const mongoose = require('mongoose');

const BID_STATUS = {
  PENDING: 'pending',
  HIRED: 'hired',
  REJECTED: 'rejected',
};

const bidSchema = new mongoose.Schema(
  {
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: [true, 'Gig ID is required'],
      index: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Freelancer ID is required'],
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be at least 1'],
      max: [1000000, 'Price cannot exceed 1,000,000'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(BID_STATUS),
        message: 'Status must be pending, hired, or rejected',
      },
      default: BID_STATUS.PENDING,
      index: true,
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

// Compound unique index: one bid per freelancer per gig
bidSchema.index({ gigId: 1, freelancerId: 1 }, { unique: true });

// Compound index for querying bids on a gig
bidSchema.index({ gigId: 1, status: 1, createdAt: -1 });

// Compound index for user's bids
bidSchema.index({ freelancerId: 1, createdAt: -1 });

// Instance method to check if bid is pending
bidSchema.methods.isPending = function () {
  return this.status === BID_STATUS.PENDING;
};

// Instance method to check if user owns this bid
bidSchema.methods.isOwnedBy = function (userId) {
  return this.freelancerId.toString() === userId.toString();
};

const Bid = mongoose.model('Bid', bidSchema);

module.exports = { Bid, BID_STATUS };
