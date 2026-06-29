const cron = require("node-cron");
const Client = require("../models/admin/Client");
const { sendCustomEmail } = require("./public/emailService");
const logger = require("../config/logger");

let expiryTask = null;

const startExpiryChecker = () => {
  if (expiryTask) expiryTask.stop();
  expiryTask = cron.schedule("0 8 * * *", checkExpiry);
  logger.info("Expiry checker started (daily at 8 AM)");
};

const stopExpiryChecker = () => {
  if (expiryTask) expiryTask.stop();
};

const checkExpiry = async () => {
  try {
    const now = new Date();
    const alerts = [
      { days: 7, label: "7 Days" },
      { days: 3, label: "3 Days" },
      { days: 1, label: "1 Day" },
    ];

    // ============================================================
    // SEND REMINDER EMAILS
    // ============================================================
    for (const { days, label } of alerts) {
      const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Trial clients
      const trialClients = await Client.find({
        plan: "trial",
        status: "active",
        trialEndDate: { $gte: startOfDay, $lt: endOfDay },
      });

      for (const client of trialClients) {
        try {
          await sendCustomEmail({
            to: client.email,
            toName: client.businessName,
            subject: `SmartPOS — Trial Expires in ${label}`,
            htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
              <div style="background:#2563eb;padding:16px;text-align:center;border-radius:8px 8px 0 0;margin:-20px -20px 20px -20px;">
                <h2 style="color:#fff;margin:0;font-size:18px;">⏰ Trial Ending in ${label}</h2>
              </div>
              <p style="font-size:14px;">Hello <strong>${client.businessName}</strong>,</p>
              <p style="font-size:13px;color:#4b5563;">Your free trial expires in <strong>${label}</strong> on <strong>${client.trialEndDate.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>.</p>
              <p style="font-size:13px;color:#4b5563;">Upgrade now to keep access to your data and features.</p>
              <div style="text-align:center;margin:20px 0;">
                <a href="https://smartpos.pxxl.click/pricing" style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Upgrade Now</a>
              </div>
              <p style="color:#9ca3af;font-size:11px;margin-top:20px;text-align:center;">Questions? Contact support@smartpos.com</p>
            </div>`,
          });
          logger.info(`Trial expiry email sent to ${client.businessName} (${label})`);
        } catch (e) {
          logger.warn(`Trial expiry email failed for ${client.businessName}:`, e.message);
        }
      }

      // Paid clients
      const paidClients = await Client.find({
        plan: { $in: ["monthly", "yearly"] },
        status: "active",
        subscriptionExpiry: { $gte: startOfDay, $lt: endOfDay },
      });

      for (const client of paidClients) {
        try {
          const planLabel = client.plan.charAt(0).toUpperCase() + client.plan.slice(1);
          await sendCustomEmail({
            to: client.email,
            toName: client.businessName,
            subject: `SmartPOS — ${planLabel} Subscription Expires in ${label}`,
            htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
              <div style="background:#2563eb;padding:16px;text-align:center;border-radius:8px 8px 0 0;margin:-20px -20px 20px -20px;">
                <h2 style="color:#fff;margin:0;font-size:18px;">📅 Subscription Expiring in ${label}</h2>
              </div>
              <p style="font-size:14px;">Hello <strong>${client.businessName}</strong>,</p>
              <p style="font-size:13px;color:#4b5563;">Your <strong>${planLabel}</strong> subscription expires in <strong>${label}</strong> on <strong>${client.subscriptionExpiry.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>.</p>
              <p style="font-size:13px;color:#4b5563;">Renew now to avoid service interruption.</p>
              <div style="text-align:center;margin:20px 0;">
                <a href="https://smartpos.pxxl.click/login" style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Renew Now</a>
              </div>
              <p style="color:#9ca3af;font-size:11px;margin-top:20px;text-align:center;">Questions? Contact support@smartpos.com</p>
            </div>`,
          });
          logger.info(`Subscription expiry email sent to ${client.businessName} (${label})`);
        } catch (e) {
          logger.warn(`Subscription expiry email failed for ${client.businessName}:`, e.message);
        }
      }
    }

    // ============================================================
    // AUTO-EXPIRE OVERDUE TRIALS
    // ============================================================
    const expiredTrials = await Client.find({
      plan: "trial",
      status: "active",
      trialEndDate: { $lt: now },
    });

    for (const client of expiredTrials) {
      client.status = "inactive";
      await client.save();
      
      try {
        await sendCustomEmail({
          to: client.email,
          toName: client.businessName,
          subject: "SmartPOS — Trial Has Expired",
          htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
            <div style="background:#dc2626;padding:16px;text-align:center;border-radius:8px 8px 0 0;margin:-20px -20px 20px -20px;">
              <h2 style="color:#fff;margin:0;font-size:18px;">⚠️ Trial Expired</h2>
            </div>
            <p style="font-size:14px;">Hello <strong>${client.businessName}</strong>,</p>
            <p style="font-size:13px;color:#4b5563;">Your free trial ended on <strong>${client.trialEndDate.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>.</p>
            <p style="font-size:13px;color:#4b5563;">Your account is now inactive. Upgrade to a paid plan to regain access.</p>
            <div style="text-align:center;margin:20px 0;">
              <a href="https://smartpos.pxxl.click/pricing" style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">View Plans & Upgrade</a>
            </div>
            <p style="color:#9ca3af;font-size:11px;margin-top:20px;text-align:center;">Questions? Contact support@smartpos.com</p>
          </div>`,
        });
        logger.info(`Trial expired email sent to ${client.businessName}`);
      } catch (e) {
        logger.warn(`Trial expired email failed for ${client.businessName}:`, e.message);
      }
    }

    if (expiredTrials.length > 0) {
      logger.info(`Auto-expired ${expiredTrials.length} trial clients`);
    }

    // ============================================================
    // AUTO-EXPIRE OVERDUE PAID SUBSCRIPTIONS
    // ============================================================
    const expiredPaid = await Client.find({
      plan: { $in: ["monthly", "yearly"] },
      status: "active",
      subscriptionExpiry: { $lt: now },
    });

    for (const client of expiredPaid) {
      client.status = "inactive";
      await client.save();
      
      try {
        await sendCustomEmail({
          to: client.email,
          toName: client.businessName,
          subject: "SmartPOS — Subscription Expired",
          htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
            <div style="background:#dc2626;padding:16px;text-align:center;border-radius:8px 8px 0 0;margin:-20px -20px 20px -20px;">
              <h2 style="color:#fff;margin:0;font-size:18px;">⚠️ Subscription Expired</h2>
            </div>
            <p style="font-size:14px;">Hello <strong>${client.businessName}</strong>,</p>
            <p style="font-size:13px;color:#4b5563;">Your subscription expired on <strong>${client.subscriptionExpiry.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>.</p>
            <p style="font-size:13px;color:#4b5563;">Your account is now inactive. Renew to regain access.</p>
            <div style="text-align:center;margin:20px 0;">
              <a href="https://smartpos.pxxl.click/login" style="display:inline-block;background:#2563eb;color:white;padding:12px 30px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">Renew Now</a>
            </div>
            <p style="color:#9ca3af;font-size:11px;margin-top:20px;text-align:center;">Questions? Contact support@smartpos.com</p>
          </div>`,
        });
        logger.info(`Subscription expired email sent to ${client.businessName}`);
      } catch (e) {
        logger.warn(`Subscription expired email failed for ${client.businessName}:`, e.message);
      }
    }

    if (expiredPaid.length > 0) {
      logger.info(`Auto-expired ${expiredPaid.length} paid clients`);
    }

  } catch (err) {
    logger.error("Expiry check error:", err.message);
  }
};

module.exports = { startExpiryChecker, stopExpiryChecker, checkExpiry };