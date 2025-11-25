import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// -------------------------
// Config
// -------------------------
const SUPABASE_URL = "https://hwuhzgkhnzvkevpqcarm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dWh6Z2tobnp2a2V2cHFjYXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjE1NTEsImV4cCI6MjA3OTM5NzU1MX0.vgFOJFN4DxXh98Mv7VmUwLW2BIkBaMctuoCbWOpyDVs";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Colors: Option 1 (Mint + Blue)
const COLOR_USER = "#4ADE80"; // mint
const COLOR_AVG = "#60A5FA";  // blue

// Metrics
const METRICS = [
  { key: "salary", label: "Salary" },
  { key: "savings", label: "Savings" },
  { key: "debt", label: "Debt" },
  { key: "rent", label: "Rent" },
  { key: "mortgage", label: "Mortgage" },
  { key: "property_value", label: "Property value" }
];

// Load latest submission from localStorage
const user = JSON.parse(localStorage.getItem("latest_submission"));
if (!user) {
  document.getElementById("results").innerHTML = "<p>No recent submission found. Please submit the form first.</p>";
  throw new Error("No latest_submission in localStorage");
}

// RPC to get averages: get_finance_averages()
async function fetchAverages() {
  const { data, error } = await supabase.rpc("get_finance_averages");
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

// Helper to create a single small bar chart for one metric
function createMiniChart(containerEl, id, label, userValue, avgValue) {
  // inject canvas
  containerEl.innerHTML = `
    <div class="mini-card">
      <div class="mini-header">
        <div class="mini-title">${label}</div>
        <div class="mini-values"><span class="val-you">You: £${(userValue||0).toLocaleString()}</span> <span class="val-avg">Avg: £${(avgValue||0).toLocaleString()}</span></div>
      </div>
      <canvas id="${id}" class="mini-canvas" aria-label="${label} chart"></canvas>
    </div>
  `;

  const ctx = containerEl.querySelector("canvas").getContext("2d");

  // determine max for y scale (give some headroom)
  const max = Math.max(userValue || 0, avgValue || 0);
  const suggestedMax = Math.max( (Math.ceil(max / 1000) * 1000) , max) * 1.15 || 1;

  // Create bar chart with two bars (You, Avg)
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["You", "Average"],
      datasets: [{
        label: label,
        data: [userValue || 0, avgValue || 0],
        backgroundColor: [COLOR_USER, COLOR_AVG],
        borderRadius: 8,
        barPercentage: 0.6,
        categoryPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.label}: £${Number(ctx.raw).toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { display: false } // hide X ticks to mimic small cards
        },
        y: {
          beginAtZero: true,
          suggestedMax,
          ticks: {
            callback: v => (v >= 1000 ? "£" + (v/1000) + "k" : "£" + v)
          },
          grid: { color: "#EEF2FF" }
        }
      }
    }
  });
}

// Build the grid of six mini-charts
async function buildCharts() {
  const avg = await fetchAverages();

  const grid = document.getElementById("chartsGrid");
  grid.innerHTML = ""; // clear

METRICS.forEach(m => {
  const rawUserVal = user[m.key];

  // Skip if user left it blank, null, undefined, or non-numeric
  if (rawUserVal === "" || rawUserVal === null || rawUserVal === undefined || isNaN(rawUserVal)) {
    return;
  }

  const col = document.createElement("div");
  col.className = "chart-cell";
  const canvasId = `miniChart_${m.key}`;

  const userVal = Number(user[m.key]);
  const avgVal = Number(avg[`avg_${m.key}`]) || 0;

  createMiniChart(col, canvasId, m.label, userVal, avgVal);

  grid.appendChild(col);
});

if (grid.children.length === 0) {
  grid.innerHTML = "<p class='muted'>No comparison data available — you did not enter any financial values.</p>";
}


  // fill details and health score
  function fillDetailsAndScore(avg) {
  const resultsBox = document.getElementById("results");
  resultsBox.innerHTML = METRICS.map(m => `
      <p><strong>${m.label}:</strong> You: £${(Number(user[m.key])||0).toLocaleString()} — Avg: £${(Number(avg[`avg_${m.key}`])||0).toLocaleString()}</p>
  `).join("");

  const weights = { 
    salary: 0.35, 
    savings: 0.25, 
    debt: 0.20,
    mortgage: 0.10,
    rent: 0.10
  };

  let sum = 0;
  let totalW = 0;

  function applyScore(key) {
    const u = Number(user[key]) || 0;
    const a = Number(avg[`avg_${key}`]) || 0;
    if (u === 0 || a === 0) return; // user didn't enter a value

    let pct = (u / a) * 100;

    // invert for negative metrics
    if (["debt", "rent", "mortgage"].includes(key)) {
      pct = 200 - pct;
    }

    const clamped = Math.max(0, Math.min(200, pct));
    sum += clamped * weights[key];
    totalW += weights[key];
  }

  // Always apply salary/savings/debt
  applyScore("salary");
  applyScore("savings");
  applyScore("debt");

  // Apply *either* rent or mortgage
  if (Number(user.mortgage) > 0) {
    applyScore("mortgage");
  } else if (Number(user.rent) > 0) {
    applyScore("rent");
  }

  const health = totalW ? Math.round(sum / totalW) : null;

  const healthBox = document.getElementById("healthScore");
  const healthText = document.getElementById("healthText");

  if (health !== null) {
    healthBox.textContent = `${health}/100`;

    if (health >= 70) {
      healthText.textContent = "You're above the average overall.";
    } else if (health >= 45) {
      healthText.textContent = "Close to average — some room to improve.";
    } else {
      healthText.textContent = "Below average — consider reviewing budgets.";
    }
  } else {
    healthBox.textContent = "—";
    healthText.textContent = "Enter more values to generate a score.";
  }
}


// Share summary
function prepareShare(avg) {
  const shareTextEl = document.getElementById("shareText");
  const copyBtn = document.getElementById("copyBtn");
  const nativeShareBtn = document.getElementById("nativeShareBtn");

  const lines = METRICS.map(m => {
    const u = Number(user[m.key]) || 0;
    const a = Math.round(Number(avg[`avg_${m.key}`])||0);
    return `${m.label}: You £${u.toLocaleString()} • Avg £${a.toLocaleString()}`;
  });

  const txt = `My financial comparison\n\n${lines.join("\n")}\n\nCompare yours at [your-site]`;
  shareTextEl.textContent = txt;

  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(txt);
      copyBtn.textContent = "Copied!";
      setTimeout(()=> copyBtn.textContent = "Copy", 1400);
    } catch (e) {
      alert("Copy failed — please copy manually.");
    }
  };

  nativeShareBtn.onclick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Financial Comparison", text: txt, url: window.location.href });
      } catch (e) { /* ignore cancel */ }
    } else {
      alert("Share not supported — use Copy instead.");
    }
  };
}

// Back button
document.getElementById("backButton").onclick = () => {
  window.location.href = "index.html";
};

// Initialize
buildCharts().catch(err => {
  console.error("Failed to build charts", err);
  document.getElementById("results").innerHTML = "<p>Error loading comparison — check console.</p>";
});
