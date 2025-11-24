import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- CONFIG ----------
const SUPABASE_URL = "https://hwuhzgkhnzvkevpqcarm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dWh6Z2tobnp2a2V2cHFjYXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjE1NTEsImV4cCI6MjA3OTM5NzU1MX0.vgFOJFN4DxXh98Mv7VmUwLW2BIkBaMctuoCbWOpyDVs";
// --------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const resultsBox = document.getElementById("results");
const chartsContainer = document.getElementById("charts");
const healthScoreBox = document.getElementById("healthScore");
const healthText = document.getElementById("healthText");
const shareText = document.getElementById("shareText");
const copyBtn = document.getElementById("copyBtn");
const nativeShareBtn = document.getElementById("nativeShareBtn");
const backButton = document.getElementById("backButton");

// Fields to compare
const METRICS = [
  { key: "salary", label: "Salary" },
  { key: "savings", label: "Savings" },
  { key: "debt", label: "Debt" },
  { key: "mortgage", label: "Mortgage" },
  { key: "rent", label: "Rent" },
  { key: "property_value", label: "Property value" }
];

// Load user submission from localStorage
const user = JSON.parse(localStorage.getItem("latest_submission"));

if (!user) {
  resultsBox.innerHTML = `<p>No recent submission found. Please go back and submit your details.</p>`;
  // disable buttons
  copyBtn.disabled = true;
  nativeShareBtn.disabled = true;
  throw new Error("No stored submission");
}

backButton.addEventListener("click", () => {
  window.location.href = "index.html";
});

// helper: fetch averages via RPC (get_finance_averages)
async function fetchAverages() {
  const { data, error } = await supabase.rpc("get_finance_averages");
  if (error) throw error;
  // data can be object or array; normalize:
  return Array.isArray(data) ? data[0] : data;
}

// helper: fetch the population arrays for each metric (non-null)
async function fetchAllValues() {
  // build select list: salary, savings...
  const cols = METRICS.map(m => m.key).join(",");
  // fetch all rows but only the specified columns (limit to 10000 for safety)
  const { data, error } = await supabase
    .from("young_people_finances")
    .select(cols)
    .limit(10000);

  if (error) throw error;
  return data;
}

// compute percentile of value in arr (arr may contain numbers and nulls)
function percentile(arr, value) {
  const nums = arr.filter(v => v !== null && v !== undefined && !isNaN(v)).map(Number).sort((a,b)=>a-b);
  if (nums.length === 0 || value === null || value === undefined || isNaN(value)) return null;
  // count how many <= value
  let count = 0;
  for (let n of nums) {
    if (n <= value) count++;
    else break;
  }
  return (count / nums.length) * 100; // percentile 0-100
}

// compute a normalized metric score 0..100 where higher is better
// For most fields higher is better (salary, savings, property); for debt/mortgage/rent, lower is better
function metricScore(metricKey, userVal, pct) {
  if (userVal === null || userVal === undefined || isNaN(userVal) || pct === null) return null;
  // For debt-like metrics, invert percentile
  const invertFor = ["debt", "mortgage", "rent"];
  const raw = invertFor.includes(metricKey) ? (100 - pct) : pct;
  return Math.round(raw);
}

// Compose health score as weighted average of metric scores
const WEIGHTS = {
  salary: 0.30,
  savings: 0.20,
  debt: 0.20,
  mortgage: 0.10,
  rent: 0.10,
  property_value: 0.10
};

// Build charts, details and score
async function renderComparison() {
  try {
    // 1) fetch averages and all values
    const [avg, allRows] = await Promise.all([fetchAverages(), fetchAllValues()]);

    // create arrays per metric
    const perMetricArrays = {};
    METRICS.forEach(m => perMetricArrays[m.key] = allRows.map(r => r[m.key]));

    // 2) build details and percentiles
    let html = `<div class="detail-grid">`;
    const scores = {};
    METRICS.forEach(m => {
      const userVal = user[m.key] ?? null;
      const avgVal = avg && avg[`avg_${m.key}`] ? Number(avg[`avg_${m.key}`]) : null;
      const pct = percentile(perMetricArrays[m.key] || [], userVal);
      const sc = metricScore(m.key, userVal, pct);
      scores[m.key] = sc;

      html += `
        <div class="detail-item">
          <h3>${m.label}</h3>
          <p class="muted">You: <strong>£${userVal ?? "—"}</strong></p>
          <p class="muted">Average: <strong>${avgVal ? "£" + Math.round(avgVal) : "—"}</strong></p>
          <p class="muted">Percentile: <strong>${pct === null ? "—" : pct.toFixed(0) + "th"}</strong></p>
          <div class="small-bar">
            <div class="small-bar-fill" style="width:${pct === null ? 0 : pct}%"></div>
          </div>
        </div>`;
    });
    html += `</div>`;
    resultsBox.innerHTML = html;

    // 3) overall health score (weighted)
    let totalWeight = 0;
    let weightedSum = 0;
    for (const key of Object.keys(WEIGHTS)) {
      const w = WEIGHTS[key];
      const sc = scores[key];
      if (sc !== null && sc !== undefined) {
        weightedSum += sc * w;
        totalWeight += w;
      }
    }
    const healthScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
    healthScoreBox.textContent = healthScore === null ? "No score" : `${healthScore}/100`;
    healthText.textContent = healthScore === null
      ? "Not enough data to compute health score."
      : (healthScore >= 75 ? "Great — you're above average!" : healthScore >= 50 ? "Fair — some room to improve." : "Below average — some opportunities to improve.");

    // 4) Build small bar charts (user vs average) for each metric
    chartsContainer.innerHTML = ""; // clear
    METRICS.forEach((m, idx) => {
      const key = m.key;
      const avgVal = avg && avg[`avg_${key}`] ? Number(avg[`avg_${key}`]) : 0;
      const userVal = user[key] ?? 0;

      // canvas wrapper
      const wrapper = document.createElement("div");
      wrapper.className = "chart-card";
      wrapper.innerHTML = `
        <h3>${m.label}</h3>
        <canvas id="chart-${key}" width="400" height="140"></canvas>
        <div class="chart-values">
          <span class="muted">You: £${userVal}</span>
          <span class="muted">Avg: £${Math.round(avgVal)}</span>
        </div>
      `;
      chartsContainer.appendChild(wrapper);

      // create Chart.js bar
      const ctx = wrapper.querySelector(`#chart-${key}`);
      // scale labels: if values are large, show in thousands
      const labels = ["You", "Average"];
      const dataVals = [Number(userVal) || 0, Math.round(avgVal) || 0];
      new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: m.label,
            data: dataVals,
            backgroundColor: ["rgba(54,162,235,0.7)", "rgba(200,200,200,0.6)"],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  // show thousands abbreviation
                  if (value >= 1000) return "£" + (value/1000) + "k";
                  return "£" + value;
                }
              }
            }
          }
        }
      });
    });

    // 5) Prepare share text
    const shareSummary = [
      `Salary: £${user.salary ?? "—"} vs avg £${Math.round(avg.avg_salary) || "—"}`,
      `Savings: £${user.savings ?? "—"} vs avg £${Math.round(avg.avg_savings) || "—"}`,
      `Debt: £${user.debt ?? "—"} vs avg £${Math.round(avg.avg_debt) || "—"}`,
      `Mortgage: £${user.mortgage ?? "—"} vs avg £${Math.round(avg.avg_mortgage) || "—"}`,
      `Rent: £${user.rent ?? "—"} vs avg £${Math.round(avg.avg_rent) || "—"}`,
      `Property: £${user.property_value ?? "—"} vs avg £${Math.round(avg.avg_property_value) || "—"}`
    ].join("\n");

    const summaryText = `My Financial Health: ${healthScore}/100\n\n${shareSummary}\n\nCompare yours at [your-site]`;
    shareText.textContent = summaryText;

    // copy/share handlers
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(summaryText);
        copyBtn.textContent = "Copied!";
        setTimeout(()=> copyBtn.textContent = "Copy", 1500);
      } catch (err) {
        console.error("Copy failed", err);
        alert("Copy failed. You can manually copy the text shown.");
      }
    });

    nativeShareBtn.addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "My Financial Comparison",
            text: summaryText,
            url: window.location.origin + window.location.pathname
          });
        } catch (err) {
          console.error("Share cancelled or failed", err);
        }
      } else {
        alert("Sharing is not available on this device. Please copy the summary instead.");
      }
    });

  } catch (err) {
    console.error(err);
    resultsBox.innerHTML = `<p>Error loading comparison. See console for details.</p>`;
  }
}

renderComparison();
