// services/public/emailService.js
const { sendEmail } = require("../../utils/hdmBridgeHelper");
const Communication = require("../../models/admin/Communication");
const logger = require("../../config/logger");

// ============================================================
// TRIAL LICENSE EMAIL
// ============================================================
const sendTrialLicenseEmail = async (to, businessName, licenseKey) => {
  try {
    const comm = await Communication.findOne().lean();
    const activationUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/activate`;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your SmartPOS Trial License</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 50px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #2563eb; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; text-align: center; }
          .license-box { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .license-key { font-family: monospace; font-size: 18px; font-weight: bold; color: #2563eb; letter-spacing: 2px; word-break: break-all; }
          .button { display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to SmartPOS!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${businessName}</strong>,</p>
            <p>Your free trial license is ready!</p>
            <div class="license-box">
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #1e40af;">Your Trial License Key:</p>
              <p class="license-key">${licenseKey}</p>
            </div>
            <p><strong>Trial Period:</strong> 14 days</p>
            <p>Click the button below to activate your license and start using SmartPOS:</p>
            <a href="${activationUrl}" class="button">Activate Your License</a>
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
              Need help? Contact us at <a href="mailto:support@smartpos.com" style="color: #2563eb;">support@smartpos.com</a>
            </p>
          </div>
          <div class="footer">
            <p>SmartPOS - Point of Sale System</p>
            <p>© ${new Date().getFullYear()} SmartPOS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    let text = `Welcome to SmartPOS!\n\nDear ${businessName},\n\nYour free trial license key: ${licenseKey}\nTrial Period: 14 days\n\nActivate here: ${activationUrl}\n\nSmartPOS Team`;
    
    if (comm?.emailTemplates?.trialLicense) {
      html = comm.emailTemplates.trialLicense
        .replace(/{{licenseKey}}/g, licenseKey)
        .replace(/{{businessName}}/g, businessName)
        .replace(/{{activationUrl}}/g, activationUrl);
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

// ============================================================
// PAYMENT APPROVED EMAIL (with license key and details)
// ============================================================
const sendPaymentApproved = async (to, businessName, licenseKey, plan, expiryDate) => {
  try {
    const comm = await Communication.findOne().lean();
    const loginUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/login`;
    const activationUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/activate`;
    
    const formatExpiryDate = expiryDate ? new Date(expiryDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'N/A';
    
    let planDisplay = '';
    switch(plan) {
      case 'monthly': planDisplay = 'Monthly Subscription'; break;
      case 'yearly': planDisplay = 'Yearly Subscription'; break;
      case 'permanent': planDisplay = 'Permanent License'; break;
      case 'trial': planDisplay = 'Trial License'; break;
      default: planDisplay = plan || 'Standard Plan';
    }
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Approved - License Active</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 50px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #10b981; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; text-align: center; }
          .license-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; borderRadius: 8px; padding: 15px; margin: 20px 0; }
          .license-key { font-family: monospace; font-size: 18px; font-weight: bold; color: #10b981; letter-spacing: 2px; word-break: break-all; }
          .info-box { background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left; }
          .button { display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Approved!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${businessName}</strong>,</p>
            <p>Your payment has been approved. Your SmartPOS license is now <strong>ACTIVE</strong>.</p>
            
            <div class="license-box">
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #166534;">Your License Key:</p>
              <p class="license-key">${licenseKey}</p>
            </div>
            
            <div class="info-box">
              <p style="margin: 0 0 10px 0; font-weight: bold;">📋 License Details:</p>
              <p style="margin: 5px 0;">• Plan: <strong>${planDisplay}</strong></p>
              <p style="margin: 5px 0;">• Expires: <strong>${plan === 'permanent' ? 'Never (Permanent)' : formatExpiryDate}</strong></p>
              <p style="margin: 5px 0;">• Status: <strong style="color: #10b981;">Active</strong></p>
            </div>
            
            <p>Click the button below to activate your license and start using SmartPOS:</p>
            
            <a href="${activationUrl}" class="button">Activate Your License</a>
            
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
              Need help? Contact us at <a href="mailto:support@smartpos.com" style="color: #2563eb;">support@smartpos.com</a>
            </p>
          </div>
          <div class="footer">
            <p>SmartPOS - Point of Sale System</p>
            <p>© ${new Date().getFullYear()} SmartPOS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    let text = `Payment Approved!\n\nDear ${businessName},\n\nYour payment has been approved.\n\nLicense Key: ${licenseKey}\nPlan: ${planDisplay}\nExpires: ${plan === 'permanent' ? 'Never (Permanent)' : formatExpiryDate}\nStatus: Active\n\nActivate here: ${activationUrl}\n\nSmartPOS Team`;
    
    if (comm?.emailTemplates?.paymentApproved) {
      html = comm.emailTemplates.paymentApproved
        .replace(/{{licenseKey}}/g, licenseKey)
        .replace(/{{businessName}}/g, businessName)
        .replace(/{{plan}}/g, planDisplay)
        .replace(/{{expiryDate}}/g, formatExpiryDate)
        .replace(/{{activationUrl}}/g, activationUrl);
      text = html.replace(/<[^>]*>/g, '');
    }
    
    await sendEmail({ 
      to, 
      subject: `SmartPOS - License Activated (${planDisplay})`, 
      htmlContent: html,
      textContent: text
    });
    return true;
  } catch (err) {
    logger.error("Failed to send payment approved email", { error: err.message, to });
    return false;
  }
};

// ============================================================
// PAYMENT REJECTED EMAIL
// ============================================================
const sendPaymentRejected = async (to, businessName, reason) => {
  try {
    const comm = await Communication.findOne().lean();
    const contactUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/contact`;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Update</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 50px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #ef4444; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; text-align: center; }
          .button { display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Payment Status Update</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${businessName}</strong>,</p>
            <p>We regret to inform you that your payment has been <strong>rejected</strong>.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>Please contact our support team for assistance or try again with a different payment method.</p>
            <a href="${contactUrl}" class="button">Contact Support</a>
          </div>
          <div class="footer">
            <p>SmartPOS - Point of Sale System</p>
            <p>© ${new Date().getFullYear()} SmartPOS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    let text = `Payment Status Update\n\nDear ${businessName},\n\nYour payment has been rejected.\nReason: ${reason}\n\nContact us at: ${contactUrl}\n\nSmartPOS Team`;
    
    if (comm?.emailTemplates?.paymentRejected) {
      html = comm.emailTemplates.paymentRejected
        .replace(/{{reason}}/g, reason)
        .replace(/{{businessName}}/g, businessName)
        .replace(/{{contactUrl}}/g, contactUrl);
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

// ============================================================
// PASSWORD RESET EMAIL
// ============================================================
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
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 50px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #2563eb; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; text-align: center; }
          .button { display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
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
            <p>If you didn't request this, please ignore this email.</p>
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

// ============================================================
// WELCOME EMAIL (After Registration)
// ============================================================
const sendWelcomeEmail = async (to, userName, businessName) => {
  try {
    const comm = await Communication.findOne().lean();
    const loginUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/login`;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SmartPOS</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 50px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #2563eb; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; text-align: center; }
          .info-box { background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left; }
          .button { display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to SmartPOS!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${businessName}</strong>,</p>
            <p>Thank you for registering with SmartPOS! Your account has been successfully created.</p>
            
            <div class="info-box">
              <p style="margin: 0 0 10px 0; font-weight: bold;">📋 Registration Details:</p>
              <p style="margin: 5px 0;">• Business Name: <strong>${businessName}</strong></p>
              <p style="margin: 5px 0;">• Owner: <strong>${userName || 'User'}</strong></p>
              <p style="margin: 5px 0;">• Email: <strong>${to}</strong></p>
              <p style="margin: 10px 0 0 0; color: #d97706;">⏳ Status: <strong>Pending Payment Approval</strong></p>
            </div>
            
            <p>Your license key will be sent to you via email once your payment is <strong>approved</strong>.</p>
            <p>You will receive:</p>
            <ul style="text-align: left; color: #64748b;">
              <li>✓ Your unique license key</li>
              <li>✓ Subscription plan details</li>
              <li>✓ Expiration date</li>
              <li>✓ Activation instructions</li>
            </ul>
            
            <a href="${loginUrl}" class="button">Login to Your Account</a>
            
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
              Need help? Contact us at <a href="mailto:support@smartpos.com" style="color: #2563eb;">support@smartpos.com</a>
            </p>
          </div>
          <div class="footer">
            <p>SmartPOS - Point of Sale System</p>
            <p>© ${new Date().getFullYear()} SmartPOS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    let text = `Welcome to SmartPOS!\n\nRegistration Details:\nBusiness: ${businessName}\nOwner: ${userName || 'User'}\nEmail: ${to}\nStatus: Pending Payment Approval\n\nYour license key will be sent once payment is approved.\n\nLogin: ${loginUrl}\n\nSmartPOS Team`;
    
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

// ============================================================
// RECEIPT EMAIL
// ============================================================
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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 50px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #10b981; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧾 Payment Receipt</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${customerName || "Customer"}</strong>,</p>
            <p>Thank you for your purchase!</p>
            <h3>Receipt #${saleData.receiptNumber}</h3>
            <table>
              <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              ${itemsHtml}
            </table>
            <div class="total">
              <p>Total: <strong>${saleData.total}</strong></p>
              <p>Payment Method: ${saleData.paymentMethod}</p>
            </div>
            <p>${comm?.emailTemplates?.receiptFooter || "Thank you for shopping with SmartPOS!"}</p>
          </div>
          <div class="footer">
            <p>SmartPOS - Point of Sale System</p>
            <p>© ${new Date().getFullYear()} SmartPOS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    let text = `Payment Receipt\n\nDear ${customerName || "Customer"},\n\nReceipt #${saleData.receiptNumber}\n\n${itemsText}\nTotal: ${saleData.total}\nPayment: ${saleData.paymentMethod}\n\n${comm?.emailTemplates?.receiptFooter || "Thank you for shopping with SmartPOS!"}`;
    
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
// TRIAL REMINDER EMAILS
// ============================================================
const sendTrialReminder5Days = async (to, businessName, daysLeft) => {
  try {
    const comm = await Communication.findOne().lean();
    const upgradeUrl = `${process.env.CLIENT_URL || 'https://smartpos.pxxl.click'}/pricing`;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Trial Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 50px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #d97706; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; text-align: center; }
          .button { display: inline-block; background-color: #d97706; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏳ Your Trial Ends in ${daysLeft} Days</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${businessName}</strong>,</p>
            <p>Your SmartPOS trial will expire in <strong>${daysLeft} days</strong>.</p>
            <p>Upgrade now to continue using all features without interruption.</p>
            <a href="${upgradeUrl}" class="button">Upgrade Now</a>
          </div>
          <div class="footer">
            <p>SmartPOS - Point of Sale System</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    let text = `Trial Reminder\n\nDear ${businessName},\n\nYour SmartPOS trial will expire in ${daysLeft} days.\n\nUpgrade at: ${upgradeUrl}\n\nSmartPOS Team`;
    
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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Final Trial Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 50px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #ef4444; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; text-align: center; }
          .button { display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Your Trial Ends Tomorrow!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${businessName}</strong>,</p>
            <p>Your SmartPOS trial expires <strong>tomorrow</strong>.</p>
            <p>Upgrade now to avoid service interruption.</p>
            <a href="${upgradeUrl}" class="button">Upgrade Now</a>
          </div>
          <div class="footer">
            <p>SmartPOS - Point of Sale System</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    let text = `Final Trial Reminder\n\nDear ${businessName},\n\nYour SmartPOS trial expires tomorrow.\n\nUpgrade at: ${upgradeUrl}\n\nSmartPOS Team`;
    
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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Trial Expired</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 50px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: #6b7280; padding: 30px 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px; text-align: center; }
          .button { display: inline-block; background-color: #6b7280; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-size: 16px; font-weight: bold; margin: 20px 0; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 Your Trial Has Expired</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${businessName}</strong>,</p>
            <p>Your SmartPOS trial has expired. You can no longer access your account.</p>
            <p>To continue using SmartPOS, please upgrade to a paid plan:</p>
            <a href="${pricingUrl}" class="button">View Plans</a>
            <p>Need help? <a href="${contactUrl}">Contact Support</a></p>
          </div>
          <div class="footer">
            <p>SmartPOS - Point of Sale System</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    let text = `Trial Expired\n\nDear ${businessName},\n\nYour SmartPOS trial has expired.\n\nUpgrade at: ${pricingUrl}\n\nContact support: ${contactUrl}\n\nSmartPOS Team`;
    
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

// ============================================================
// MODULE EXPORTS
// ============================================================
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