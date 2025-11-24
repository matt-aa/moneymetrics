import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://hwuhzgkhnzvkevpqcarm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dWh6Z2tobnp2a2V2cHFjYXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjE1NTEsImV4cCI6MjA3OTM5NzU1MX0.vgFOJFN4DxXh98Mv7VmUwLW2BIkBaMctuoCbWOpyDVs"
);

const resultsBox = document.getElementById("results");

// 1. Load the user's latest submission from localStorage
const user = JSON.parse(localStorage.getItem("latest_submission"));

if (!user) {
  resultsBox.innerHTML = `<p>No recent submission found. Please go back and submit your details.</p>`;
  throw new Error("No stored submission");
}

// 2. Fetch averages using your new RPC function
async function loadAverages() {
  const { data, error } = await supabase.rpc("get_finance_averages");

  if (error) {
    console.error(error);
    resultsBox.innerHTML = `<p>Error loading averages. Check console.</p>`;
    return;
  }

  const a = data[0]; // Supabase RPC returns an array

  // 3. Build comparison output
  const comparisonHTML = `
    <h2>Your Results</h2>

    <div class="comparison-grid">

      <div class="compare-item">
        <h3>Salary</h3>
        <p>You: £${user.salary ?? 0}</p>
        <p>Average: £${Math.round(a.avg_salary)}</p>
      </div>

      <div class="compare-item">
        <h3>Savings</h3>
        <p>You: £${user.savings ?? 0}</p>
        <p>Average: £${Math.round(a.avg_savings)}</p>
      </div>

      <div class="compare-item">
        <h3>Debt</h3>
        <p>You: £${user.debt ?? 0}</p>
        <p>Average: £${Math.round(a.avg_debt)}</p>
      </div>

      <div class="compare-item">
        <h3>Mortgage</h3>
        <p>You: £${user.mortgage ?? 0}</p>
        <p>Average: £${Math.round(a.avg_mortgage)}</p>
      </div>

      <div class="compare-item">
        <h3>Rent</h3>
        <p>You: £${user.rent ?? 0}</p>
        <p>Average: £${Math.round(a.avg_rent)}</p>
      </div>

      <div class="compare-item">
        <h3>Property Value</h3>
        <p>You: £${user.property_value ?? 0}</p>
        <p>Average: £${Math.round(a.avg_property_value)}</p>
      </div>

    </div>
  `;

  resultsBox.innerHTML = comparisonHTML;
}

loadAverages();