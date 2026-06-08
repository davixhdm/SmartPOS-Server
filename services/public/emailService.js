// services/public/emailService.js
const { sendEmail } = require("../../utils/hdmBridgeHelper");
const Communication = require("../../models/admin/Communication");
const logger = require("../../config/logger");

const sendTrialLicenseEmail = async (to, businessName, licenseKey) => {
  try {
    const comm = await Communication.findOne().lean();
    let html = `<h1>Welcome to SmartPOS, ${businessName}!</h1>
                <p>Your trial license key: <strong>${licenseKey}</strong></p>
                <p>Valid for 14 days. Activate now.</p>`;
    let text = `Welcome to SmartPOS, ${businessName}!\nYour trial license key: ${licenseKey}\nValid for 14 days. Activate now.`;
    
    if (comm?.emailTemplates?.trialLicense) {
      html = comm.emailTemplates.trialLicense
        .replace(/{{licenseKey}}/g, licenseKey)
        .replace(/{{businessName}}/g, businessName);
      text = html.replace(/<[^>]*>/g, '');
    }
    
    await sendEmail({ 
      to, 
      subject: "Your SmartPOS Trial License", 
      htmlContent: html,
      textContent: text
    });
    return true;
  } catch (err) {
    logger.error("Failed to send trial license email", { error: err.message, to });
    return false;
  }
};

const sendPaymentApproved = async (to, businessName, licenseKey) => {
  try {
    const comm = await Communication.findOne().lean();
    let html = `<h1>Payment Approved, ${businessName}!</h1>
                <p>Your license key: <strong>${licenseKey}</strong></p>
                <p>You can now activate your full SmartPOS license.</p>`;
    let text = `Payment Approved, ${businessName}!\nYour license key: ${licenseKey}\nYou can now activate your full SmartPOS license.`;
    
    if (comm?.emailTemplates?.paymentApproved) {
      html = comm.emailTemplates.paymentApproved
        .replace(/{{licenseKey}}/g, licenseKey)
        .replace(/{{businessName}}/g, businessName);
      text = html.replace(/<[^>]*>/g, '');
    }
    
    await sendEmail({ 
      to, 
      subject: "SmartPOS - Payment Approved", 
      htmlContent: html,
      textContent: text
    });
    return true;
  } catch (err) {
    logger.error("Failed to send payment approved email", { error: err.message, to });
    return false;
  }
};

const sendPaymentRejected = async (to, businessName, reason) => {
  try {
    const comm = await Communication.findOne().lean();
    let html = `<h1>Payment Rejected, ${businessName}</h1>
                <p>Reason: ${reason}</p>
                <p>Please contact support or try again with a different payment method.</p>`;
    let text = `Payment Rejected, ${businessName}\nReason: ${reason}\nPlease contact support or try again.`;
    
    if (comm?.emailTemplates?.paymentRejected) {
      html = comm.emailTemplates.paymentRejected
        .replace(/{{reason}}/g, reason)
        .replace(/{{businessName}}/g, businessName);
      text = html.replace(/<[^>]*>/g, '');
    }
    
    await sendEmail({ 
      to, 
      subject: "SmartPOS - Payment Rejected", 
      htmlContent: html,
      textContent: text
    });
    return true;
  } catch (err) {
    logger.error("Failed to send payment rejected email", { error: err.message, to });
    return false;
  }
};



const sendPasswordResetEmail = async (to, resetToken, userName) => {
  try {
    const comm = await Communication.findOne().lean();
    const resetUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/reset-password?token=${resetToken}`;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 500px;
            margin: 50px auto;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background-color: #2563eb;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 30px;
            text-align: center;
          }
          .content p {
            color: #333333;
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
          }
          .note {
            font-size: 12px;
            color: #64748b;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${userName || 'User'}</strong>,</p>
            <p>We received a request to reset your password for your SmartPOS account.</p>
            <p>Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p class="note">This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>SmartPOS - Point of Sale System</p>
            <p>© ${new Date().getFullYear()} SmartPOS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    let text = `Password Reset Request\n\nHello ${userName || 'User'},\n\nYou requested to reset your password. Use this link:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\nSmartPOS Team`;
    
    if (comm?.emailTemplates?.passwordReset) {
      html = comm.emailTemplates.passwordReset
        .replace(/{{resetUrl}}/g, resetUrl)
        .replace(/{{userName}}/g, userName || 'User');
      text = html.replace(/<[^>]*>/g, '');
    }
    
    await sendEmail({ 
      to, 
      subject: "SmartPOS - Password Reset Request", 
      htmlContent: html,
      textContent: text
    });
    return true;
  } catch (err) {
    logger.error("Failed to send password reset email", { error: err.message, to });
    return false;
  }
};

const sendWelcomeEmail = async (to, userName, businessName) => {
  try {
    const comm = await Communication.findOne().lean();
    const loginUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/login`;
    
    let html = `
      <h1>Welcome to SmartPOS, ${userName || 'User'}!</h1>
      <p>Your business account "${businessName}" has been successfully created.</p>
      <p>You can now log in to start managing your business:</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
      <p>If you have any questions, contact our support team.</p>
      <br/>
      <p>SmartPOS Team</p>
    `;
    let text = `Welcome to SmartPOS, ${userName || 'User'}!\n\nYour business account "${businessName}" has been successfully created.\n\nYou can now log in at: ${loginUrl}\n\nIf you have any questions, contact our support team.\n\nSmartPOS Team`;
    
    if (comm?.emailTemplates?.welcome) {
      html = comm.emailTemplates.welcome
        .replace(/{{userName}}/g, userName || 'User')
        .replace(/{{businessName}}/g, businessName)
        .replace(/{{loginUrl}}/g, loginUrl);
      text = html.replace(/<[^>]*>/g, '');
    }
    
    await sendEmail({ 
      to, 
      subject: `Welcome to SmartPOS, ${businessName}!`, 
      htmlContent: html,
      textContent: text
    });
    return true;
  } catch (err) {
    logger.error("Failed to send welcome email", { error: err.message, to });
    return false;
  }
};

const sendReceiptEmail = async (to, customerName, saleData) => {
  try {
    const comm = await Communication.findOne().lean();
    
    let itemsHtml = '';
    let itemsText = '';
    saleData.items.forEach(item => {
      itemsHtml += `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.price}</td><td>${item.price * item.quantity}</td></tr>`;
      itemsText += `${item.name} x${item.quantity} - ${item.price} = ${item.price * item.quantity}\n`;
    });
    
    let html = `
      <h2>Thank you for your purchase!</h2>
      <p>Dear ${customerName || "Customer"},</p>
      <p>Your transaction has been completed successfully.</p>
      <h3>Receipt #${saleData.receiptNumber}</h3>
      <table border="1" cellpadding="5">
        <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        ${itemsHtml}
      </table>
      <p><strong>Total: ${saleData.total}</strong></p>
      <p>Payment Method: ${saleData.paymentMethod}</p>
      <br/>
      <p>${comm?.emailTemplates?.receiptFooter || "Thank you for shopping with SmartPOS!"}</p>
    `;
    
    let text = `Thank you for your purchase!\n\nDear ${customerName || "Customer"},\n\nReceipt #${saleData.receiptNumber}\n\n${itemsText}\nTotal: ${saleData.total}\nPayment: ${saleData.paymentMethod}\n\n${comm?.emailTemplates?.receiptFooter || "Thank you for shopping with SmartPOS!"}`;
    
    await sendEmail({ 
      to, 
      subject: `Receipt #${saleData.receiptNumber} - SmartPOS`, 
      htmlContent: html,
      textContent: text
    });
    return true;
  } catch (err) {
    logger.error("Failed to send receipt email", { error: err.message, to });
    return false;
  }
};

// ============================================================
// TRIAL REMINDER EMAILS (New)
// ============================================================

const sendTrialReminder5Days = async (to, businessName, daysLeft) => {
  try {
    const comm = await Communication.findOne().lean();
    const upgradeUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/pricing`;
    
    let html = `
      <h1>Your Trial Ends in ${daysLeft} Days!</h1>
      <p>Dear ${businessName},</p>
      <p>Your SmartPOS trial will expire in ${daysLeft} days.</p>
      <p>Upgrade now to continue using all features:</p>
      <p><a href="${upgradeUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upgrade Now</a></p>
      <p>If you have any questions, contact our support team.</p>
      <br/>
      <p>SmartPOS Team</p>
    `;
    let text = `Your Trial Ends in ${daysLeft} Days!\n\nDear ${businessName},\n\nYour SmartPOS trial will expire in ${daysLeft} days.\n\nUpgrade at: ${upgradeUrl}\n\nSmartPOS Team`;
    
    if (comm?.emailTemplates?.trialReminder5Days) {
      html = comm.emailTemplates.trialReminder5Days
        .replace(/{{daysLeft}}/g, daysLeft)
        .replace(/{{businessName}}/g, businessName)
        .replace(/{{upgradeUrl}}/g, upgradeUrl);
      text = html.replace(/<[^>]*>/g, '');
    }
    
    await sendEmail({ 
      to, 
      subject: `SmartPOS Trial: ${daysLeft} Days Remaining`, 
      htmlContent: html,
      textContent: text
    });
    return true;
  } catch (err) {
    logger.error("Failed to send 5-day reminder", { error: err.message, to });
    return false;
  }
};

const sendTrialReminder1Day = async (to, businessName, daysLeft) => {
  try {
    const comm = await Communication.findOne().lean();
    const upgradeUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/pricing`;
    
    let html = `
      <h1>Your Trial Ends Tomorrow!</h1>
      <p>Dear ${businessName},</p>
      <p>Your SmartPOS trial expires in ${daysLeft} day.</p>
      <p>Upgrade now to avoid service interruption:</p>
      <p><a href="${upgradeUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upgrade Now</a></p>
      <p>If you have any questions, contact our support team.</p>
      <br/>
      <p>SmartPOS Team</p>
    `;
    let text = `Your Trial Ends Tomorrow!\n\nDear ${businessName},\n\nYour SmartPOS trial expires tomorrow.\n\nUpgrade at: ${upgradeUrl}\n\nSmartPOS Team`;
    
    if (comm?.emailTemplates?.trialReminder1Day) {
      html = comm.emailTemplates.trialReminder1Day
        .replace(/{{daysLeft}}/g, daysLeft)
        .replace(/{{businessName}}/g, businessName)
        .replace(/{{upgradeUrl}}/g, upgradeUrl);
      text = html.replace(/<[^>]*>/g, '');
    }
    
    await sendEmail({ 
      to, 
      subject: "SmartPOS Trial: Last Day Remaining", 
      htmlContent: html,
      textContent: text
    });
    return true;
  } catch (err) {
    logger.error("Failed to send 1-day reminder", { error: err.message, to });
    return false;
  }
};

const sendTrialExpired = async (to, businessName) => {
  try {
    const comm = await Communication.findOne().lean();
    const contactUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/contact`;
    const pricingUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/pricing`;
    
    let html = `
      <h1>Your Trial Has Expired</h1>
      <p>Dear ${businessName},</p>
      <p>Your SmartPOS trial has expired. You can no longer access your account.</p>
      <p>To continue using SmartPOS, please upgrade to a paid plan:</p>
      <p><a href="${pricingUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Plans</a></p>
      <p>Need help? <a href="${contactUrl}">Contact Support</a></p>
      <br/>
      <p>SmartPOS Team</p>
    `;
    let text = `Your Trial Has Expired\n\nDear ${businessName},\n\nYour SmartPOS trial has expired.\n\nUpgrade at: ${pricingUrl}\n\nContact support: ${contactUrl}\n\nSmartPOS Team`;
    
    if (comm?.emailTemplates?.trialExpired) {
      html = comm.emailTemplates.trialExpired
        .replace(/{{businessName}}/g, businessName)
        .replace(/{{pricingUrl}}/g, pricingUrl)
        .replace(/{{contactUrl}}/g, contactUrl);
      text = html.replace(/<[^>]*>/g, '');
    }
    
    await sendEmail({ 
      to, 
      subject: "SmartPOS Trial Has Expired", 
      htmlContent: html,
      textContent: text
    });
    return true;
  } catch (err) {
    logger.error("Failed to send trial expired email", { error: err.message, to });
    return false;
  }
};

module.exports = { 
  sendTrialLicenseEmail, 
  sendPaymentApproved, 
  sendPaymentRejected,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendReceiptEmail,
  sendTrialReminder5Days,
  sendTrialReminder1Day,
  sendTrialExpired
};