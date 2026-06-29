require("../dnsSet");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const env = require("../config/env");
const Client = require("../models/admin/Client");
const License = require("../models/public/License");

mongoose.connect(env.MONGO_URI).then(async () => {
  console.log("Connected. Backfilling trial dates...\n");

  // 1. Fix Clients
  const clients = await Client.find({ plan: "trial", trialEndDate: { $exists: false } });
  for (const c of clients) {
    c.trialEndDate = new Date(c.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    await c.save();
    console.log(`  [Client] ${c.businessName}: trial ends ${c.trialEndDate.toLocaleDateString()}`);
  }

  // 2. Fix Licenses
  const licenses = await License.find({ plan: "trial", status: "active", expiresAt: { $exists: false } }).populate("clientId");
  for (const l of licenses) {
    const client = l.clientId;
    const baseDate = client?.createdAt || l.createdAt;
    l.expiresAt = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    await l.save();
    console.log(`  [License] ${client?.businessName || l.licenseKey}: expires ${l.expiresAt.toLocaleDateString()}`);
  }

  console.log(`\nDone. Updated ${clients.length} clients and ${licenses.length} licenses.`);
  mongoose.disconnect();
}).catch(err => {
  console.error("Error:", err.message);
  mongoose.disconnect();
});