// services/public/paymentService.js
const Payment = require("../../models/admin/Payment");
const Client = require("../../models/admin/Client");
const License = require("../../models/public/License");
const mpesa = require("../../utils/mpesaHelper");
const stripeHelper = require("../../utils/stripeHelper");
const paypalHelper = require("../../utils/paypalHelper");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");
const logger = require("../../config/logger");
const { sendCustomEmail } = require("./emailService");

const initiatePayment = async ({ clientId, amount, currency, method, billingCycle, phone }) => {
  if (!clientId) throw new AppError("Client ID is required", 400);

  const client = await Client.findById(clientId);
  if (!client) throw new AppError("Client not found", 404);

  const payment = await Payment.create({
    client: clientId,
    amount,
    currency: currency || "KES",
    method: method || "mpesa",
    billingCycle: billingCycle || "monthly",
    status: "pending",
  });

  if (method === "mpesa" && phone) {
    try {
      const result = await mpesa.stkPush(phone, amount, `SmartPOS-${billingCycle}`, `${billingCycle} subscription`);
      if (result.success) {
        payment.transactionId = result.checkoutRequestID;
        await payment.save();
      }
    } catch (err) {
      logger.error("M-Pesa push failed", { error: err.message });
    }
  }

  // ===== SEND ADMIN NOTIFICATION =====
  try {
    const Admin = require("../../models/admin/Admin");
    const admin = await Admin.findOne({ role: "super_admin" }).lean();
    const adminEmail = admin?.email || env.ADMIN_EMAIL || "davismcintyre5@gmail.com";
    const adminUrl = env.ADMIN_URL || "https://admin.smartpos.pxxl.click";
    const displayAmount = `${currency || "KES"} ${(amount || 0).toLocaleString()}`;

    await sendCustomEmail({
      to: adminEmail,
      toName: "SmartPOS Admin",
      subject: `💰 New Payment — ${client.businessName} (${billingCycle})`,
      htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="background:#2563eb;padding:16px;text-align:center;border-radius:8px 8px 0 0;margin:-20px -20px 20px -20px;">
          <h2 style="color:#fff;margin:0;font-size:18px;">New Payment Received</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:15px 0;font-size:13px;">
          <tr><td style="padding:6px;font-weight:bold;">Company:</td><td>${client.businessName}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Email:</td><td>${client.email}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Phone:</td><td>${client.phone || 'N/A'}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Plan:</td><td>${billingCycle || 'monthly'}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Amount:</td><td style="font-weight:bold;color:#2563eb;">${displayAmount}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Method:</td><td>${method || 'manual'}</td></tr>
        </table>
        <p style="text-align:center;"><a href="${adminUrl}" style="display:inline-block;background:#2563eb;color:white;padding:8px 20px;text-decoration:none;border-radius:6px;font-size:13px;">View in Admin</a></p>
      </div>`,
    });
    logger.info(`Admin payment notification sent for ${client.businessName}`);
  } catch (e) {
    logger.warn("Admin payment notification failed:", e.message);
  }

  return { success: true, paymentId: payment._id };
};

const handleMpesaCallback = async (body) => {
  logger.info("M-Pesa callback received", { body });

  try {
    const { Body } = body;
    const stkCallback = Body?.stkCallback;
    const checkoutRequestID = stkCallback?.CheckoutRequestID;
    const resultCode = stkCallback?.ResultCode;

    if (checkoutRequestID) {
      const payment = await Payment.findOne({ transactionId: checkoutRequestID });
      if (payment) {
        payment.status = resultCode === 0 ? "completed" : "failed";
        payment.mpesaReceiptNumber = stkCallback?.CallbackMetadata?.Item?.find(i => i.Name === 'MpesaReceiptNumber')?.Value || '';
        await payment.save();

        // If payment completed, activate license
        if (resultCode === 0 && payment.status === "completed") {
          const client = await Client.findById(payment.client);
          if (client) {
            const startDate = new Date();
            let endDate = null;
            if (payment.billingCycle === 'monthly') endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            else if (payment.billingCycle === 'yearly') endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

            client.plan = payment.billingCycle;
            client.status = "active";
            client.subscriptionExpiry = endDate;
            client.trialEndDate = null;
            await client.save();

            // Update license
            const license = await License.findOne({ clientId: client._id, status: "active" });
            if (license) {
              license.expiresAt = endDate;
              license.plan = payment.billingCycle;
              await license.save();
            }

            // Send activation email
            try {
              await sendCustomEmail({
                to: client.email,
                toName: client.businessName,
                subject: `SmartPOS — Payment Confirmed!`,
                htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
                  <div style="background:#10B981;padding:16px;text-align:center;border-radius:8px 8px 0 0;margin:-20px -20px 20px -20px;">
                    <h2 style="color:#fff;margin:0;font-size:18px;">✅ Payment Confirmed</h2>
                  </div>
                  <p>Hello <strong>${client.businessName}</strong>,</p>
                  <p>Your payment has been received and your license is now active.</p>
                  <p>Plan: <strong>${payment.billingCycle}</strong></p>
                  ${endDate ? `<p>Valid until: <strong>${endDate.toLocaleDateString()}</strong></p>` : ''}
                  <div style="text-align:center;margin:20px 0;">
                    <a href="https://smartpos.pxxl.click/login" style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;">Login to Dashboard</a>
                  </div>
                </div>`,
              });
            } catch (e) { logger.warn("Payment confirmation email failed:", e.message); }
          }
        }
      }
    }
  } catch (err) {
    logger.error("M-Pesa callback processing error:", err.message);
  }
};

module.exports = { initiatePayment, handleMpesaCallback };