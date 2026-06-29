const catchAsync = require("../../utils/catchAsync");
const AppError = require("../../utils/AppError");
const AIConfig = require("../../models/admin/AIConfig");
const Subscription = require("../../models/admin/Subscription");
const env = require("../../config/env");
const axios = require("axios");

const getAIConfig = async () => {
  const dbConfig = await AIConfig.findOne().lean();

  const defaultProvider = (dbConfig?.providers || []).find(p => p.name === (dbConfig?.globalDefault || 'hdm') && p.enabled)
    || (dbConfig?.providers || []).find(p => p.enabled);

  return {
    baseUrl: defaultProvider?.baseUrl || dbConfig?.baseUrl || env.HDM_AI_BASE_URL,
    apiKey: defaultProvider?.apiKey || dbConfig?.apiKey || env.HDM_AI_API_KEY,
    landingEnabled: dbConfig?.landingEnabled !== false,
  };
};

const chat = catchAsync(async (req, res) => {
  const config = await getAIConfig();
  if (!config.landingEnabled) throw new AppError("AI chat is currently disabled", 403);
  if (!config.baseUrl || !config.apiKey) throw new AppError("AI not configured", 500);

  const { message } = req.body;
  if (!message) throw new AppError("Message required", 400);

  const plan = await Subscription.findOne().lean();
  const pricing = plan ? {
    trial: `Free ${plan.freeTrialDays || 14} days`,
    monthly: `${plan.currency || "KES"} ${plan.priceMonthly || 500}/month`,
    yearly: `${plan.currency || "KES"} ${plan.priceYearly || 5000}/year`,
    permanent: `${plan.currency || "KES"} ${plan.pricePermanent || 12000} one-time`,
  } : {};

  const { data } = await axios.post(
    `${config.baseUrl}/projects/smartpos/chat`,
    {
      message,
      client_id: "public",
      is_public: true,
      provider: "groq",
      data: {
        features: [
          "Fast barcode scanning",
          "M-Pesa integration (STK Push, Send Money, Till, Paybill)",
          "Multi-currency support (KES, USD, EUR, GBP, UGX, TZS, RWF, BIF, ZAR, NGN, GHS)",
          "Offline-first — works without internet",
          "AI-powered insights and analytics",
          "Staff management with roles and permissions",
          "Customer management with loyalty points",
          "Multi-user support (owner, admin, manager, cashier)",
          "Receipt customization and printing",
          "Tax and discount management",
          "Cloud backups",
        ],
        pricing,
        support: {
          email: "support@smartpos.com",
          phone: "+254768784909",
        },
      },
    },
    {
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 15000
    }
  );
  res.json({ success: true, data: data.data });
});

module.exports = { chat };