const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "real-estate-api" });
});

/**
 * POST /api/cap-rate
 * Body: { noi, purchasePrice }
 * Returns: capRate as a percentage
 */
app.post("/api/cap-rate", (req, res) => {
  const { noi, purchasePrice } = req.body;

  if (!noi || !purchasePrice || purchasePrice <= 0) {
    return res.status(400).json({
      error: "noi and purchasePrice are required and purchasePrice must be > 0",
    });
  }

  const capRate = (noi / purchasePrice) * 100;
  res.json({ noi, purchasePrice, capRate });
});

/**
 * POST /api/flip-profit
 * Body: {
 *   purchasePrice,
 *   rehabCost,
 *   arv,
 *   closingCostsBuy,
 *   closingCostsSell,
 *   holdingCosts
 * }
 * Returns: totalCost, grossProfit, netProfit, roi
 */
app.post("/api/flip-profit", (req, res) => {
  const {
    purchasePrice = 0,
    rehabCost = 0,
    arv = 0,
    closingCostsBuy = 0,
    closingCostsSell = 0,
    holdingCosts = 0,
  } = req.body;

  const totalCost =
    purchasePrice + rehabCost + closingCostsBuy + closingCostsSell + holdingCosts;

  const grossProfit = arv - purchasePrice;
  const netProfit = arv - totalCost;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : null;

  res.json({
    purchasePrice,
    rehabCost,
    arv,
    closingCostsBuy,
    closingCostsSell,
    holdingCosts,
    totalCost,
    grossProfit,
    netProfit,
    roi,
  });
});

/**
 * POST /api/rental-cashflow
 * Body: {
 *   monthlyRent,
 *   vacancyRate,      // decimal e.g. 0.05 for 5%
 *   taxes,
 *   insurance,
 *   maintenance,
 *   management,
 *   utilities,
 *   mortgagePayment
 * }
 */
app.post("/api/rental-cashflow", (req, res) => {
  const {
    monthlyRent = 0,
    vacancyRate = 0,
    taxes = 0,
    insurance = 0,
    maintenance = 0,
    management = 0,
    utilities = 0,
    mortgagePayment = 0,
  } = req.body;

  const effectiveRent = monthlyRent * (1 - vacancyRate);
  const operatingExpenses = taxes + insurance + maintenance + management + utilities;
  const noi = effectiveRent - operatingExpenses;
  const cashflow = noi - mortgagePayment;

  res.json({
    monthlyRent,
    vacancyRate,
    taxes,
    insurance,
    maintenance,
    management,
    utilities,
    mortgagePayment,
    effectiveRent,
    operatingExpenses,
    noi,
    cashflow,
  });
});

// Use Railway's PORT if available, otherwise 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Real Estate API listening on port ${PORT}`);
});
