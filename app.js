const API_URL = location.protocol === "file:"
  ? "https://tipodecambio.cr/api/v1/tipo-cambio/hoy"
  : "/api/rate";
const STORAGE_KEY = "cr-price-calculator-v2";

const form = document.querySelector("#calculatorForm");
const fields = {
  cost: document.querySelector("#cost"),
  costCurrency: document.querySelector("#costCurrency"),
  quantity: document.querySelector("#quantity"),
  profitPercent: document.querySelector("#profitPercent"),
  includeVat: document.querySelector("#includeVat"),
  rateSource: document.querySelector("#rateSource"),
  exchangeRate: document.querySelector("#exchangeRate")
};

const output = {
  totalWithVat: document.querySelector("#totalWithVat"),
  priceWithoutVat: document.querySelector("#priceWithoutVat"),
  costInCrc: document.querySelector("#costInCrc"),
  profitAmount: document.querySelector("#profitAmount"),
  marginPercent: document.querySelector("#marginPercent"),
  rateDisplay: document.querySelector("#rateDisplay"),
  rateDate: document.querySelector("#rateDate"),
  rateStatus: document.querySelector("#rateStatus"),
  sourceHint: document.querySelector("#sourceHint"),
  costHint: document.querySelector("#costHint"),
  totalLabel: document.querySelector("#totalLabel"),
  costTotalLabel: document.querySelector("#costTotalLabel")
};

let bccrRates = null;

const money = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  minimumFractionDigits: 2
});

function numberFrom(input) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) ? value : 0;
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function saveState() {
  const data = Object.fromEntries(Object.entries(fields).map(([key, field]) => {
    return [key, field.type === "checkbox" ? field.checked : field.value];
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    Object.entries(saved).forEach(([key, value]) => {
      if (fields[key] && value !== undefined) {
        if (fields[key].type === "checkbox") fields[key].checked = Boolean(value);
        else fields[key].value = value;
      }
    });
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function setRateStatus(text, state = "") {
  output.rateStatus.textContent = text;
  output.rateStatus.className = `status-dot ${state}`.trim();
}

function setExchangeRateFromSource() {
  if (!bccrRates) return;

  if (fields.rateSource.value === "bccr-sale") {
    fields.exchangeRate.value = bccrRates.venta.toFixed(2);
    output.sourceHint.textContent = `Sincronizado con BCCR al ${bccrRates.fecha}.`;
  } else if (fields.rateSource.value === "bccr-buy") {
    fields.exchangeRate.value = bccrRates.compra.toFixed(2);
    output.sourceHint.textContent = `Sincronizado con BCCR al ${bccrRates.fecha}.`;
  } else if (fields.rateSource.value === "bac-manual") {
    output.sourceHint.textContent = "Tipo de cambio BAC ingresado manualmente.";
  } else {
    output.sourceHint.textContent = "Tipo de cambio manual.";
  }
}

function updateCurrencyUi() {
  const isUsd = fields.costCurrency.value === "USD";
  fields.cost.placeholder = isUsd ? "$0.00" : "0.00";
  output.costHint.textContent = isUsd
    ? "El costo esta en dolares; se convierte a colones con el tipo de cambio."
    : "El costo esta en colones.";
  output.costTotalLabel.textContent = isUsd ? "Costo total en colones" : "Costo total";
}

async function refreshRate() {
  setRateStatus("Sincronizando", "");

  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    if (!payload.ok || !payload.data) throw new Error("Respuesta incompleta");

    bccrRates = payload.data;
    output.rateDisplay.textContent = `CRC ${bccrRates.venta.toFixed(2)} venta`;
    output.rateDate.textContent = `BCCR ${bccrRates.fecha}`;
    setRateStatus("Actualizado", "ok");
    setExchangeRateFromSource();
  } catch (error) {
    setRateStatus("Manual", "error");
    output.rateDate.textContent = "No se pudo conectar";
    output.rateDisplay.textContent = fields.exchangeRate.value ? `CRC ${Number(fields.exchangeRate.value).toFixed(2)}` : "--";
    output.sourceHint.textContent = "Sin conexion. Ingresa el tipo de cambio manualmente.";
  }

  calculate();
  saveState();
}

function calculate() {
  const cost = numberFrom(fields.cost);
  const quantity = numberFrom(fields.quantity) || 1;
  const exchangeRate = numberFrom(fields.exchangeRate) || 1;
  const profitPercent = numberFrom(fields.profitPercent);
  const vatPercent = fields.includeVat.checked ? 13 : 0;
  const unitCostInCrc = fields.costCurrency.value === "USD" ? cost * exchangeRate : cost;
  const costInCrc = unitCostInCrc * quantity;
  const unitSalePrice = calculateUnitSalePrice(unitCostInCrc, profitPercent);
  const priceWithoutVat = unitSalePrice * quantity;
  const totalWithVat = priceWithoutVat * (1 + vatPercent / 100);
  const profitAmount = priceWithoutVat - costInCrc;
  const marginPercent = priceWithoutVat > 0 ? (profitAmount / priceWithoutVat) * 100 : 0;

  output.totalWithVat.textContent = money.format(totalWithVat);
  output.priceWithoutVat.textContent = money.format(priceWithoutVat);
  output.costInCrc.textContent = money.format(costInCrc);
  output.profitAmount.textContent = money.format(profitAmount);
  output.marginPercent.textContent = formatPercent(marginPercent);
  output.totalLabel.textContent = fields.includeVat.checked ? "Precio final con IVA" : "Precio final sin IVA";

  if (fields.rateSource.value.includes("manual")) {
    output.rateDisplay.textContent = exchangeRate > 1 ? `CRC ${exchangeRate.toFixed(2)}` : "--";
  }

  saveState();
}

function calculateUnitSalePrice(unitCostInCrc, profitPercent) {
  const margin = Math.min(profitPercent, 99.99) / 100;
  return unitCostInCrc / (1 - margin);
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", calculate);
  field.addEventListener("change", calculate);
});

fields.rateSource.addEventListener("change", () => {
  setExchangeRateFromSource();
  calculate();
});

fields.costCurrency.addEventListener("change", () => {
  updateCurrencyUi();
  calculate();
});

document.querySelector("#refreshRate").addEventListener("click", refreshRate);

form.addEventListener("reset", () => {
  setTimeout(() => {
    fields.profitPercent.value = "30";
    fields.includeVat.checked = true;
    fields.quantity.value = "1";
    fields.costCurrency.value = "CRC";
    fields.rateSource.value = "bccr-sale";
    setExchangeRateFromSource();
    updateCurrencyUi();
    calculate();
  }, 0);
});

loadState();
updateCurrencyUi();
refreshRate();
