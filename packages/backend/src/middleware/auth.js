const mongoose = require("mongoose");

// Every write route below goes through here, so the handlers can assume
// req.userId is a valid ObjectId and stop repeating the session check.
function requireAuth(req, res, next) {
  const id = req.session?.user?.id;

  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  req.userId = new mongoose.Types.ObjectId(id);
  next();
}

// Same, but does not reject — used by read routes that show extra fields
// (isFriend, hasAttended, myReview) when someone is logged in.
function optionalAuth(req, res, next) {
  const id = req.session?.user?.id;

  if (id && mongoose.isValidObjectId(id)) {
    req.userId = new mongoose.Types.ObjectId(id);
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
