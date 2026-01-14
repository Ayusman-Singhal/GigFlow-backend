const { listGigs, createGig } = require('./gig.controller');
const { createBid, getBidsForGig } = require('./bid.controller');
const { hireBid } = require('./hire.controller');

module.exports = {
  gigController: {
    listGigs,
    createGig,
  },
  bidController: {
    createBid,
    getBidsForGig,
  },
  hireController: {
    hireBid,
  },
};
