const AISettings = require("../../models/client/AISettings");
const AIConfig = require("../../models/admin/AIConfig");
const env = require("../../config/env");
const logger = require("../../config/logger");
const axios = require("axios");
const Sale = require("../../models/client/Sale");
const Product = require("../../models/client/Product");
const Customer = require("../../models/client/Customer");

let cachedConfig = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

const getAIConfig = async () => {
  if (cachedConfig && (Date.now() - cacheTime) < CACHE_TTL) {
    return cachedConfig;
  }

  const dbConfig = await AIConfig.findOne().lean();

  const defaultProvider = (dbConfig?.providers || []).find(p => p.name === (dbConfig?.globalDefault || 'hdm') && p.enabled)
    || (dbConfig?.providers || []).find(p => p.enabled);

  cachedConfig = {
    baseUrl: defaultProvider?.baseUrl || dbConfig?.baseUrl || env.HDM_AI_BASE_URL,
    apiKey: defaultProvider?.apiKey || dbConfig?.apiKey || env.HDM_AI_API_KEY,
    provider: defaultProvider?.name || "groq",
    clientEnabled: dbConfig?.clientEnabled !== false,
  };
  cacheTime = Date.now();
  return cachedConfig;
};

const callAI = async (endpoint, payload) => {
  try {
    const config = await getAIConfig();
    const { data } = await axios.post(`${config.baseUrl}${endpoint}`, {
      ...payload,
      provider: payload.provider || config.provider,
    }, {
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      timeout: 15000,
    });
    return data;
  } catch (err) {
    logger.error("AI call failed", { endpoint, error: err.message, status: err.response?.status });
    return { success: false, message: "AI service unavailable" };
  }
};

const gatherBusinessData = async (clientId, message) => {
  const msg = (message || "").toLowerCase();
  const data = {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const broadKeywords = ["recommend", "suggest", "advice", "improve", "grow", "business", "overview", "summary", "report", "performance", "help", "hi", "hello", "hey", "how is", "doing"];
  const isBroadQuery = broadKeywords.some((kw) => msg.includes(kw)) || msg.length < 10;

  const stockKeywords = ["stock", "inventory", "product", "low", "item"];
  const shouldIncludeInventory = isBroadQuery || stockKeywords.some((kw) => msg.includes(kw));

  if (shouldIncludeInventory) {
    const products = await Product.find({ clientId }).lean();
    data.inventory = products.map((p) => ({
      name: p.name,
      stock: p.stock,
      price: p.price,
      category: p.category || "Uncategorized",
      reorder_level: p.lowStockThreshold || 10,
    }));
  }

  const salesKeywords = ["sale", "revenue", "today", "report", "month", "selling", "top", "best", "popular", "transaction", "profit", "income", "earn", "performance", "growth", "trend", "summary", "overview", "dashboard", "doing", "business"];
  const shouldIncludeSales = isBroadQuery || salesKeywords.some((kw) => msg.includes(kw)) || msg.length < 10;

  if (shouldIncludeSales) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sales = await Sale.find({
      clientId,
      status: "completed",
      createdAt: { $gte: thirtyDaysAgo },
    }).lean();

    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const paymentMethods = {};
    sales.forEach((s) => {
      paymentMethods[s.paymentMethod] = (paymentMethods[s.paymentMethod] || 0) + s.total;
    });

    const productSales = {};
    sales.forEach((s) => {
      s.items.forEach((item) => {
        productSales[item.name] = (productSales[item.name] || 0) + (item.total || item.price * item.quantity);
      });
    });
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, sales: total }));

    const todaySalesList = sales.filter((s) => new Date(s.createdAt) >= today);
    const todayRev = todaySalesList.reduce((sum, s) => sum + s.total, 0);

    data.sales = {
      total_sales: totalSales,
      transactions: sales.length,
      today_revenue: todayRev,
      today_transactions: todaySalesList.length,
      top_products: topProducts,
      payment_methods: paymentMethods,
    };

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthSales = sales.filter((s) => new Date(s.createdAt) >= startOfMonth);

    data.monthly = {
      total_sales: monthSales.reduce((sum, s) => sum + s.total, 0),
      transactions: monthSales.length,
      avg_transaction: monthSales.length > 0
        ? Math.round((monthSales.reduce((sum, s) => sum + s.total, 0) / monthSales.length) * 100) / 100
        : 0,
    };
  }

  if (isBroadQuery || msg.includes("customer") || msg.includes("loyalty") || msg.includes("client") || msg.includes("buyer")) {
    const customers = await Customer.find({ clientId }).lean();
    data.customers = customers.map((c) => ({
      name: c.name,
      phone: c.phone,
      loyaltyPoints: c.loyaltyPoints || 0,
      totalSpent: c.totalSpent || 0,
      visitCount: c.visitCount || 0,
    }));
  }

  return data;
};

const chat = async (clientId, message, userId) => {
  const config = await getAIConfig();
  if (!config.clientEnabled) {
    return "AI features are currently disabled by the administrator.";
  }

  const settings = await AISettings.findOne({ clientId }).lean();
  if (!settings?.enabledFeatures?.posCommands && !settings?.useGlobalAI) {
    return "AI features are disabled. Enable them in Settings.";
  }

  const businessData = await gatherBusinessData(clientId, message);

  const payload = {
    message,
    client_id: clientId,
    business_id: clientId,
    provider: config.provider,
    data: businessData,
  };

  const res = await callAI("/projects/smartpos/chat", payload);

  return res?.data?.reply || res?.reply || "I couldn't process that request. Please try again.";
};

const executeCommand = async (clientId, command) => {
  return chat(clientId, command);
};

const getSalesAnalytics = async (clientId) => {
  const businessData = await gatherBusinessData(clientId, "sales analytics this month");
  const payload = {
    message: "Show me my sales analytics for this month",
    client_id: clientId,
    business_id: clientId,
    provider: "groq",
    data: businessData,
  };
  const res = await callAI("/projects/smartpos/analytics/sales", payload);
  return res?.data?.reply || res?.reply || "Analytics unavailable.";
};

const getRestockForecast = async (clientId) => {
  const businessData = await gatherBusinessData(clientId, "restock forecast");
  const payload = {
    message: "What products need restocking?",
    client_id: clientId,
    business_id: clientId,
    provider: "groq",
    data: businessData,
  };
  const res = await callAI("/projects/smartpos/forecast/restock", payload);
  return res?.data?.reply || res?.reply || "Forecast unavailable.";
};

const checkAlerts = async (clientId) => {
  const businessData = await gatherBusinessData(clientId, "check alerts");
  const payload = {
    message: "Check for business alerts",
    client_id: clientId,
    business_id: clientId,
    provider: "groq",
    data: businessData,
  };
  const res = await callAI("/projects/smartpos/alerts/check", payload);
  return res?.data?.reply || res?.reply || "No alerts found.";
};

const detectAnomalies = async (clientId) => {
  const businessData = await gatherBusinessData(clientId, "detect anomalies");
  const payload = {
    message: "Detect anomalies in sales data",
    client_id: clientId,
    business_id: clientId,
    provider: "groq",
    data: businessData,
  };
  const res = await callAI("/projects/smartpos/anomaly/detect", payload);
  return res?.data?.reply || res?.reply || "No anomalies detected.";
};

const generateReport = async (clientId, reportType, period) => {
  const businessData = await gatherBusinessData(clientId, `${reportType} report ${period}`);
  const payload = {
    message: `Generate ${reportType} report for ${period}`,
    client_id: clientId,
    business_id: clientId,
    provider: "groq",
    data: businessData,
  };
  const res = await callAI("/projects/smartpos/report/generate", payload);
  return res?.data?.reply || res?.reply || "Report generation failed.";
};

const semanticSearch = async (clientId, query, limit = 10) => {
  const businessData = await gatherBusinessData(clientId, query);
  const payload = {
    message: query,
    client_id: clientId,
    business_id: clientId,
    provider: "groq",
    data: { ...businessData, limit },
  };
  const res = await callAI("/projects/smartpos/search/semantic", payload);
  return res?.data?.reply || res?.reply || "No results found.";
};

module.exports = { chat, executeCommand, getSalesAnalytics, getRestockForecast, checkAlerts, detectAnomalies, generateReport, semanticSearch };