import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://hwuhzgkhnzvkevpqcarm.supabase.co",
  "YOUR_PUBLIC_ANON_KEY"
);

const resultsDiv = document.getElementById("results");

// 1. Fetch the most recent submission
async function getLatestSubmission() {
  const { data, error } = await supabase
    .from("young_people_finances")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || data.length === 0) return null;
  return data[0];
}

// 2. Fetch averages from the view
async function getAverages() {
  const { data, error } = await supabase
    .from("finance_averages")
    .select("*")
    .single();

  if (error) return null;
  return data;
}

// 3. Generate comparison text
function compare(userValue, avgValue) {
  if (userValue === null || isNaN(userValue)) return "You didn't enter this.";
  if (avgValue === null || isNaN(avgValue)) return "No data yet.";
  if (userValue > avgValue) return `Above average (avg: £${avgValue.toFixed(0)})`;
  if (userValue < avgValue) return `Below average (avg: £${avgValue.toFixed(0)})`;
  return "Exactly average";
}

// 4. Render everything
async function renderComparison() {
  const user = await getLatestSubmission();
  const avg = await getAverages();

  if (!user) {
    resultsDiv.innerHTML = "<p>You have no submissions yet.</p>";
    return;
  }

  resultsDiv.innerHTML = `
    <div class="comparison-box">
      <h2>Salary</h2>
      <p>${compare(user.salary, avg.avg_salary)}</p>

      <h2>Savings</h2>
      <p>${compare(user.savings, avg.avg_savings)}</p>

      <h2>Debt</h2>
      <p>${compare(user.debt, avg.avg_debt)}</p>

      <h2>Mortgage</h2>
      <p>${compare(user.mortgage, avg.avg_mortgage)}</p>

      <h2>Rent</h2>
      <p>${compare(user.rent, avg.avg_rent)}</p>

      <h2>Property Value</h2>
      <p>${compare(user.property_value, avg.avg_property_value)}</p>
    </div>
  `;
}

renderComparison();