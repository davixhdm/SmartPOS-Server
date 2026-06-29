const AppError = require("../../utils/AppError");
const Client = require("../../models/admin/Client");

const licenseCheck = async (req, res, next) => {
  try {
    if (!req.clientId) {
      throw new AppError("Client context missing", 401);
    }

    const client = await Client.findById(req.clientId).lean();

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    if (client.status === "suspended") {
      throw new AppError("Account is suspended. Contact support.", 403);
    }

    if (client.status === "inactive") {
      throw new AppError("Account is inactive. Please activate your license.", 403);
    }

    // Check trial expiry
    if (client.plan === "trial" && client.trialEndDate && new Date(client.trialEndDate) < new Date()) {
      throw new AppError("Your free trial has ended. Please upgrade to a paid plan to continue.", 403);
    }

    // Check subscription expiry for paid plans
    if (client.plan !== "trial" && client.plan !== "permanent" && client.subscriptionExpiry && new Date(client.subscriptionExpiry) < new Date()) {
      throw new AppError("Your subscription has expired. Please renew to continue.", 403);
    }

    req.client = client;
    next();
  } catch (err) {
    if (err.isOperational) return next(err);
    next(new AppError("License validation failed", 403));
  }
};

module.exports = licenseCheck;