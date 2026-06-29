const catchAsync = require("../../utils/catchAsync");
const { success } = require("../../utils/apiResponse");
const AppError = require("../../utils/AppError");
const Client = require("../../models/admin/Client");
const Payment = require("../../models/admin/Payment");
const { sendCustomEmail } = require("../../services/public/emailService");
const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const logger = require("../../config/logger");

const getRenewInfo = catchAsync(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError("Token required", 401);
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { ignoreExpiration: true });
  } catch {
    throw new AppError("Invalid token", 401);
  }

  const client = await Client.findById(decoded.clientId || decoded.id);
  if (!client) throw new AppError("Account not found", 404);

  const plans = [
    { name: 'monthly', displayName: 'Monthly', pricing: { monthly: env.PRICE_MONTHLY || 500 } },
    { name: 'yearly', displayName: 'Yearly', pricing: { yearly: env.PRICE_YEARLY || 5000 } },
    { name: 'permanent', displayName: 'Permanent', pricing: { permanent: env.PRICE_PERMANENT || 12000 } },
  ];

  success(res, {
    businessName: client.businessName,
    email: client.email,
    phone: client.phone,
    currentPlan: client.plan,
    subscriptionExpiry: client.subscriptionExpiry,
    trialEndDate: client.trialEndDate,
    currency: client.currency || 'KES',
    availablePlans: plans,
  });
});

const processRenew = catchAsync(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError("Token required", 401);
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { ignoreExpiration: true });
  } catch {
    throw new AppError("Invalid token", 401);
  }

  const { plan, cycle, method } = req.body;
  if (!plan || !cycle) throw new AppError("Plan and cycle required", 400);

  const client = await Client.findById(decoded.clientId || decoded.id);
  if (!client) throw new AppError("Account not found", 404);

  const amount = cycle === 'monthly' ? (env.PRICE_MONTHLY || 500)
    : cycle === 'yearly' ? (env.PRICE_YEARLY || 5000)
    : (env.PRICE_PERMANENT || 12000);

  const currency = client.currency || 'KES';
  const displayAmount = `${currency} ${amount.toLocaleString()}`;
  const reference = `RNW-${Date.now().toString(36).toUpperCase()}`;
  const cycleLabel = cycle === 'monthly' ? 'Monthly' : cycle === 'yearly' ? 'Yearly' : 'Permanent';

  await Payment.create({
    client: client._id,
    amount,
    currency,
    method: method || 'manual',
    billingCycle: cycle,
    status: 'pending',
    reference,
  });

  // Email user
  try {
    await sendCustomEmail({
      to: client.email,
      toName: client.businessName,
      subject: `SmartPOS — Renewal Submitted (${cycleLabel})`,
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="background:#F59E0B;padding:16px;text-align:center;border-radius:8px 8px 0 0;margin:-20px -20px 20px -20px;">
          <h2 style="color:#fff;margin:0;font-size:18px;">📋 Renewal Submitted</h2>
        </div>
        <p style="font-size:14px;">Hello <strong>${client.businessName}</strong>,</p>
        <p style="font-size:13px;color:#4b5563;">Your renewal request has been submitted and is pending admin approval.</p>
        <table style="width:100%;border-collapse:collapse;margin:15px 0;font-size:13px;">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">New Plan</td><td style="padding:8px;border:1px solid #e5e7eb;">${cycleLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Amount</td><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;color:#F59E0B;">${displayAmount}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Reference</td><td style="padding:8px;border:1px solid #e5e7eb;">${reference}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">Status</td><td style="padding:8px;border:1px solid #e5e7eb;color:#F59E0B;">Pending Approval</td></tr>
        </table>
        <p style="font-size:13px;color:#4b5563;">You will receive another email once your renewal is approved.</p>
        <p style="color:#9ca3af;font-size:11px;margin-top:20px;text-align:center;">Thank you for choosing SmartPOS</p>
      </div>`,
    });
  } catch (e) { logger.warn('Renew email failed:', e.message); }

  // Email admin
  try {
    const Admin = require('../../models/admin/Admin');
    const admin = await Admin.findOne({ role: 'super_admin' }).lean();
    const adminEmail = admin?.email || 'davismcintyre5@gmail.com';
    const adminUrl = env.ADMIN_URL || 'https://admin.smartpos.pxxl.click';

    await sendCustomEmail({
      to: adminEmail,
      toName: 'SmartPOS Admin',
      subject: `🔔 Renewal — ${client.businessName} (${cycleLabel})`,
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="background:#F59E0B;padding:16px;text-align:center;border-radius:8px 8px 0 0;margin:-20px -20px 20px -20px;">
          <h2 style="color:#fff;margin:0;font-size:18px;">Renewal Approval Needed</h2>
        </div>
        <p style="font-size:14px;">A renewal request needs your approval:</p>
        <table style="width:100%;border-collapse:collapse;margin:15px 0;font-size:13px;">
          <tr><td style="padding:6px;font-weight:bold;">Company:</td><td>${client.businessName}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Email:</td><td>${client.email}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Current Plan:</td><td>${client.plan}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">New Plan:</td><td>${cycleLabel}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Amount:</td><td style="font-weight:bold;">${displayAmount}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Reference:</td><td>${reference}</td></tr>
        </table>
        <p style="text-align:center;margin:20px 0;">
          <a href="${adminUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Go to Admin Panel</a>
        </p>
      </div>`,
    });
  } catch (e) { logger.warn('Admin renew email failed:', e.message); }

  success(res, { reference, amount, currency, plan: cycleLabel, cycle, message: 'Renewal submitted for approval.' });
});
module.exports = { getRenewInfo, processRenew };