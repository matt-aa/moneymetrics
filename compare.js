import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// -------------------------
// Config
// -------------------------
const SUPABASE_URL = "https://hwuhzgkhnzvkevpqcarm.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dWh6Z2tobnp2a2V2cHFjYXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjE1NTEsImV4cCI6MjA3OTM5NzU1MX0.vgFOJFN4DxXh98Mv7VmUwLW2BIkBaMctuoCbWOpyDVs";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Colors
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

// Load user
const user = JSON.parse(localStorage.getItem("latest_submission"));
if (!user) {
  document.getElementById("results").innerHTML =
    "<p>No recent submission found. Please submit the form first.</p>";
  throw new Error("No latest_submission in localStorage");
}

// Fetch averages
async function fetchAverages() {
  const { data, error } = await supabase.rpc("get_finance_averages");
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

// -------------------------
// Create a Mini Column Chart
// -------------------------
function createMiniChart(containerEl, id, label, userValue, avgValue) {
  containerEl.innerHTML = `
    <div class="mini-card">
      <div class="mini-header">
        <div class="mini-title">${label}</div>
        <div class="mini-values">
          <span>You: £${(userValue || 0).toLocaleString()}</span>
          <span>Avg: £${(avgValue || 0).toLocaleString()}</span>
        </div>
      </div>
      <canvas id="${id}" class="mini-canvas"></canvas>
    </div>
  `;

  const ctx = containerEl.querySelector("canvas").getContext("2d");

  const maxVal = Math.max(userValue || 0, avgValue || 0);
  const suggestedMax = (Math.ceil(maxVal / 1000) * 1000) * 1.2;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["You", "Avg"],
      datasets: [{
        data: [userValue || 0, avgValue || 0],
        backgroundColor: [COLOR_USER, COLOR_AVG],
        borderRadius: 8,
        barPercentage: 0.6,
        categoryPercentage: 0.6
      }]
    },
    options: {
      maintainAspectRatio: false,
      animation: { duration: 700 },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          suggestedMax,
          ticks: {
            callback: v => (v >= 1000 ? "£" + v / 1000 + "k" : "£" + v)
          }
        }
      }
    }
  });
}

// -------------------------
// Breakdown Table
// -------------------------
function buildBreakdownTable(avg) {
  const container = document.getElementById("breakdownTableContainer");

  const rows = METRICS.map(m => {
    const userVal = Number(user[m.key]) || 0;
    const avgVal = Number(avg[`avg_${m.key}`]) || 0;

    if (!userVal) return ""; // skip missing fields

    let statusClass = "status-warn";
    let statusText = "Similar";

    if (["debt", "rent", "mortgage"].includes(m.key)) {
      if (userVal < avgVal * 0.8) {
        statusClass = "status-good";
        statusText = "Better (Lower)";
      } else if (userVal > avgVal * 1.2) {
        statusClass = "status-bad";
        statusText = "Worse (Higher)";
      }
    } else {
      if (userVal > avgVal * 1.2) {
        statusClass = "status-good";
        statusText = "Above Average";
      } else if (userVal < avgVal * 0.8) {
        statusClass = "status-bad";
        statusText = "Below Average";
      }
    }

    return `
      <tr>
        <td>${m.label}</td>
        <td>£${userVal.toLocaleString()}</td>
        <td>£${avgVal.toLocaleString()}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <h2>Detailed Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>You (£)</th>
          <th>Average (£)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// -------------------------
// Build All Charts
// -------------------------
async function buildCharts() {
  const avg = await fetchAverages();
  const grid = document.getElementById("chartsGrid");
  grid.innerHTML = "";

  METRICS.forEach(m => {
    const raw = user[m.key];

    if (raw === "" || raw === null || raw === undefined || isNaN(raw)) return;

    const cell = document.createElement("div");
    cell.className = "chart-cell";

    const canvasId = `miniChart_${m.key}`;
    createMiniChart(cell, canvasId, m.label, Number(user[m.key]), Number(avg[`avg_${m.key}`]));

    grid.appendChild(cell);
  });

  if (grid.children.length === 0) {
    grid.innerHTML = `<p class="muted">No comparison data — you did not enter any financial values.</p>`;
  }

  buildBreakdownTable(avg);
  fillDetailsAndScore(avg);
  prepareShare(avg);
}

// -------------------------
// Health Score
// -------------------------
function fillDetailsAndScore(avg) {
  const resultsBox = document.getElementById("results");
  resultsBox.innerHTML = METRICS.map(m => `
      <p><strong>${m.label}:</strong>
      You: £${(Number(user[m.key]) || 0).toLocaleString()} —
      Avg: £${(Number(avg[`avg_${m.key}`]) || 0).toLocaleString()}</p>
  `).join("");

  const weights = {
    salary: 0.35,
    savings: 0.25,
    debt: 0.20,
    mortgage: 0.10,
    rent: 0.10
  };

  let sum = 0, totalW = 0;

  function applyScore(key) {
    const u = Number(user[key]) || 0;
    const a = Number(avg[`avg_${key}`]) || 0;
    if (u === 0 || a === 0) return;

    let pct = (u / a) * 100;
    if (["debt", "rent", "mortgage"].includes(key)) pct = 200 - pct;

    const clamped = Math.max(0, Math.min(200, pct));
    sum += clamped * weights[key];
    totalW += weights[key];
  }

  applyScore("salary");
  applyScore("savings");
  applyScore("debt");

  if (Number(user.mortgage) > 0) applyScore("mortgage");
  else if (Number(user.rent) > 0) applyScore("rent");

  const score = totalW ? Math.round(sum / totalW) : null;

  const healthBox = document.getElementById("healthScore");
  const healthText = document.getElementById("healthText");

  if (score !== null) {
    healthBox.textContent = `${score}/100`;
    if (score >= 70) healthText.textContent = "You're above the average overall.";
    else if (score >= 45) healthText.textContent = "Close to average — some room to improve.";
    else healthText.textContent = "Below average — consider reviewing budgets.";
  } else {
    healthBox.textContent = "—";
    healthText.textContent = "Enter more values to generate a score.";
  }
}

// -------------------------
// Share Text
// -------------------------
function prepareShare(avg) {
  const shareTextEl = document.getElementById("shareText");
  const copyBtn = document.getElementById("copyBtn");
  const nativeShareBtn = document.getElementById("nativeShareBtn");

  const lines = METRICS.map(m => {
    const u = Number(user[m.key]) || 0;
    const a = Number(avg[`avg_${m.key}`]) || 0;
    return `${m.label}: You £${u.toLocaleString()} — Avg £${a.toLocaleString()}`;
  });

  const text = `My Financial Comparison:\n\n${lines.join("\n")}`;
  shareTextEl.textContent = text;

  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
  };

  nativeShareBtn.onclick = async () => {
    if (navigator.share) {
      await navigator.share({ title: "My Financial Comparison", text });
    } else {
      alert("Sharing not supported on this device.");
    }
  };
}

// -------------------------
// Back
// -------------------------
document.getElementById("backButton").onclick = () => {
  window.location.href = "index.html";
};

// Init
buildCharts().catch(err => {
  console.error(err);
  document.getElementById("results").innerHTML = "<p>Error loading comparison. Check console.</p>";
});
