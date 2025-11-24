import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://hwuhzgkhnzvkevpqcarm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dWh6Z2tobnp2a2V2cHFjYXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjE1NTEsImV4cCI6MjA3OTM5NzU1MX0.vgFOJFN4DxXh98Mv7VmUwLW2BIkBaMctuoCbWOpyDVs"
);

// Chart rows
const METRICS = [
  { key: "salary", label: "Salary (£)" },
  { key: "savings", label: "Savings (£)" },
  { key: "debt", label: "Debt (£)" },
  { key: "rent", label: "Rent (£)" },
  { key: "mortgage", label: "Mortgage (£)" },
  { key: "property_value", label: "Property Value (£)" }
];

// Load user
const user = JSON.parse(localStorage.getItem("latest_submission"));

if (!user) {
  document.getElementById("results").innerHTML = "<p>No data found. Please return to the form.</p>";
  throw new Error("No submission");
}

// Fetch averages via RPC
async function fetchAverages() {
  const { data, error } = await supabase.rpc("get_finance_averages");
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

// Render dot plot
function createDotPlot(userValues, avgValues) {
  const ctx = document.getElementById("dotPlotChart").getContext("2d");

  const labels = METRICS.map(m => m.label);
  const userData = METRICS.map(m => userValues[m.key] ?? null);
  const avgData = METRICS.map(m => avgValues[`avg_${m.key}`] ?? null);

  const datasets = [
    {
      label: "Average",
      data: METRICS.map((m, i) => ({ x: avgData[i], y: i })),
      pointRadius: 8,
      pointBackgroundColor: "#D1D5DB", // grey
      pointHoverRadius: 10,
    },
    {
      label: "You",
      data: METRICS.map((m, i) => ({ x: userData[i], y: i })),
      pointRadius: 10,
      pointBackgroundColor: "#F59E0B", // orange
      pointBorderWidth: 2,
      pointBorderColor: "#B45309",
      pointHoverRadius: 12,
    }
  ];

  new Chart(ctx, {
    type: "scatter",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: "category",
          labels,
          offset: true,
          grid: { display: false }
        },
        x: {
          title: { display: true, text: "Value (£)" },
          ticks: {
            callback: v => "£" + v.toLocaleString()
          },
          grid: {
            color: "#F3F4F6"
          }
        }
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: £${ctx.parsed.x.toLocaleString()}`
          }
        }
      }
    }
  });
}

async function render() {
  const avg = await fetchAverages();

  const userVals = {};
  const avgVals = {};

  METRICS.forEach(m => {
    userVals[m.key] = Number(user[m.key]) || 0;
    avgVals[`avg_${m.key}`] = Number(avg[`avg_${m.key}`]) || 0;
  });

  createDotPlot(userVals, avgVals);

  // Summary numbers under chart
  const resultsBox = document.getElementById("results");
  resultsBox.innerHTML = METRICS.map(m => `
      <p><strong>${m.label}:</strong> You: £${userVals[m.key].toLocaleString()} —
      Avg: £${avgVals[`avg_${m.key}`].toLocaleString()}</p>
  `).join("");

  document.getElementById("backButton").onclick = () => {
    window.location.href = "index.html";
  };
}

render();
