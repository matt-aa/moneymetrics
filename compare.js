import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ------------------------------------
// Supabase client
// ------------------------------------
const supabase = createClient(
  "https://hwuhzgkhnzvkevpqcarm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dWh6Z2tobnp2a2V2cHFjYXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjE1NTEsImV4cCI6MjA3OTM5NzU1MX0.vgFOJFN4DxXh98Mv7VmUwLW2BIkBaMctuoCbWOpyDVs"
);

// ------------------------------------
// Metrics used in both the chart + summary
// ------------------------------------
const METRICS = [
  { key: "salary", label: "Salary (£)" },
  { key: "savings", label: "Savings (£)" },
  { key: "debt", label: "Debt (£)" },
  { key: "rent", label: "Rent (£)" },
  { key: "mortgage", label: "Mortgage (£)" },
  { key: "property_value", label: "Property Value (£)" }
];

// ------------------------------------
// Load latest user submission
// ------------------------------------
const user = JSON.parse(localStorage.getItem("latest_submission"));

if (!user) {
  document.getElementById("results").innerHTML =
    "<p>No data found. Please return to the form.</p>";
  throw new Error("No submission found in localStorage");
}

// ------------------------------------
// Fetch averages (RPC function)
// ------------------------------------
async function fetchAverages() {
  const { data, error } = await supabase.rpc("get_finance_averages");
  if (error) throw error;

  return Array.isArray(data) ? data[0] : data;
}

// ------------------------------------
// Create dot plot (inverted percentage axis)
// ------------------------------------
function createDotPlot(userValues, avgValues) {
  const ctx = document.getElementById("dotPlotChart").getContext("2d");

  const labels = METRICS.map(m => m.label);

  // Convert to percentage of average
  const userPercent = METRICS.map(m => {
    const avg = avgValues[`avg_${m.key}`] || 1;
    const user = userValues[m.key] || 0;
    return {
      x: m.label,
      y: (user / avg) * 100
    };
  });

  const avgPercent = METRICS.map(m => ({
    x: m.label,
    y: 100
  }));

  new Chart(ctx, {
    type: "scatter",
    data: {
      labels,
      datasets: [
        {
          label: "Average (100%)",
          data: avgPercent,
          pointRadius: 8,
          pointBackgroundColor: "#D1D5DB",
          pointHoverRadius: 10
        },
        {
          label: "You",
          data: userPercent,
          pointRadius: 10,
          pointBackgroundColor: "#F59E0B",
          pointBorderWidth: 2,
          pointBorderColor: "#B45309",
          pointHoverRadius: 12
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      scales: {
        x: {
          type: "category",
          labels,
          title: { display: true, text: "Metric" },
          grid: { display: false }
        },

        y: {
          beginAtZero: false,

          // ★ INVERTED PERCENT AXIS ★
          reverse: true,

          title: { display: true, text: "% of Average (Inverted)" },

          ticks: {
            callback: v => v + "%"
          },

          // Sensible range: 0% → 200%
          suggestedMin: 200,
          suggestedMax: 0
        }
      },

      plugins: {
        legend: { display: true },

        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`
          }
        }
      }
    }
  });
}

// ------------------------------------
// Main render flow
// ------------------------------------
async function render() {
  const avg = await fetchAverages();

  const userVals = {};
  const avgVals = {};

  METRICS.forEach(m => {
    userVals[m.key] = Number(user[m.key]) || 0;
    avgVals[`avg_${m.key}`] = Number(avg[`avg_${m.key}`]) || 0;
  });

  // Render chart
  createDotPlot(userVals, avgVals);

  // Summary results
  const resultsBox = document.getElementById("results");
  resultsBox.innerHTML = METRICS.map(m => `
      <p><strong>${m.label}:</strong> 
        You: £${userVals[m.key].toLocaleString()} — 
        Avg: £${avgVals[`avg_${m.key}`].toLocaleString()}
      </p>
  `).join("");

  // Back button
  document.getElementById("backButton").onclick = () => {
    window.location.href = "index.html";
  };
}

render();