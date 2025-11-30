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
// =========================
// DSCR Calculation
// =========================
app.post("/api/dscr", (req, res) => {
  const { noi, annualDebtService } = req.body;

  if (!noi || !annualDebtService) {
    return res.status(400).json({ error: "Missing required fields (noi, annualDebtService)" });
  }

  const dscr = noi / annualDebtService;

  res.json({
    noi,
    annualDebtService,
    dscr: Number(dscr.toFixed(2))
  });
});


// =========================
// Cash-on-Cash Return
// =========================
app.post("/api/cash-on-cash", (req, res) => {
  const { annualCashflow, totalCashInvested } = req.body;

  if (!annualCashflow || !totalCashInvested) {
    return res.status(400).json({ error: "Missing required fields (annualCashflow, totalCashInvested)" });
  }

  const coc = (annualCashflow / totalCashInvested) * 100;

  res.json({
    annualCashflow,
    totalCashInvested,
    cashOnCashReturnPercent: Number(coc.toFixed(2))
  });
});


// =========================
// BRRRR Calculator
// =========================
// Inputs: purchasePrice, rehabCost, arv, refiLTV (0.75 default), rent, expenses, debtService
// Outputs: equity, cash-out amount, cash left in deal, cashflow, CoC, DSCR
app.post("/api/brrrr", (req, res) => {
  const {
    purchasePrice,
    rehabCost,
    arv,
    refiLTV = 0.75,
    rent,
    expenses,
    annualDebtService
  } = req.body;

  if (!purchasePrice || !rehabCost || !arv || !rent || !expenses) {
    return res.status(400).json({ error: "Missing required BRRRR inputs" });
  }

  const totalCost = purchasePrice + rehabCost;
  const newLoan = arv * refiLTV;
  const equity = arv - newLoan;
  const cashOut = newLoan - totalCost;
  const noi = rent * 12 - expenses * 12;
  const cashflow = noi - (annualDebtService || 0);
  const coc = cashOut < 0 ? (cashflow / Math.abs(cashOut)) * 100 : 0;
  const dscr = annualDebtService ? noi / annualDebtService : null;

  res.json({
    purchasePrice,
    rehabCost,
    arv,
    totalCost,
    refiLTV,
    newLoan,
    equity,
    cashOut,
    noi,
    cashflow,
    cashOnCashReturnPercent: Number(coc.toFixed(2)),
    dscr: dscr ? Number(dscr.toFixed(2)) : null
  });
});


// =========================
// Loan Amortization
// =========================
app.post("/api/amortization", (req, res) => {
  const { loanAmount, annualRate, termYears } = req.body;

  if (!loanAmount || !annualRate || !termYears) {
    return res.status(400).json({ error: "Missing required fields (loanAmount, annualRate, termYears)" });
  }

  const months = termYears * 12;
  const monthlyRate = annualRate / 12 / 100;

  const monthlyPayment =
    (loanAmount * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -months));

  let balance = loanAmount;
  const schedule = [];

  for (let i = 1; i <= months; i++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance -= principal;
    schedule.push({
      month: i,
      principal: Number(principal.toFixed(2)),
      interest: Number(interest.toFixed(2)),
      payment: Number(monthlyPayment.toFixed(2)),
      balance: Number(Math.max(balance, 0).toFixed(2))
    });
  }

  res.json({
    loanAmount,
    annualRate,
    termYears,
    monthlyPayment: Number(monthlyPayment.toFixed(2)),
    schedule
  });
});


// =========================
// Yield on Cost
// =========================
app.post("/api/yield-on-cost", (req, res) => {
  const { stabilizedNOI, totalProjectCost } = req.body;

  if (!stabilizedNOI || !totalProjectCost) {
    return res.status(400).json({ error: "Missing fields (stabilizedNOI, totalProjectCost)" });
  }

  const yoc = stabilizedNOI / totalProjectCost;

  res.json({
    stabilizedNOI,
    totalProjectCost,
    yieldOnCostPercent: Number((yoc * 100).toFixed(2))
  });
});


// =========================
// LTV
// =========================
app.post("/api/ltv", (req, res) => {
  const { loanAmount, propertyValue } = req.body;

  if (!loanAmount || !propertyValue) {
    return res.status(400).json({ error: "Missing fields (loanAmount, propertyValue)" });
  }

  const ltv = loanAmount / propertyValue * 100;

  res.json({
    loanAmount,
    propertyValue,
    ltvPercent: Number(ltv.toFixed(2))
  });
});


// =========================
// LTC
// =========================
app.post("/api/ltc", (req, res) => {
  const { loanAmount, totalCost } = req.body;

  if (!loanAmount || !totalCost) {
    return res.status(400).json({ error: "Missing fields (loanAmount, totalCost)" });
  }

  const ltc = loanAmount / totalCost * 100;

  res.json({
    loanAmount,
    totalCost,
    ltcPercent: Number(ltc.toFixed(2))
  });
});