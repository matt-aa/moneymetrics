import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Your Supabase details
const supabase = createClient(
  "https://hwuhzgkhnzvkevpqcarm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dWh6Z2tobnp2a2V2cHFjYXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjE1NTEsImV4cCI6MjA3OTM5NzU1MX0.vgFOJFN4DxXh98Mv7VmUwLW2BIkBaMctuoCbWOpyDVs"
);

const form = document.getElementById("financeForm");
const message = document.getElementById("message");

// Safely convert inputs to numbers
function toNumber(value) {
  if (!value) return null;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

// Handle form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "Saving...";
  message.className = "ms-3 text-muted";

  const data = new FormData(form);

  const payload = {
    age_range: data.get("age_range"),
    postcode: data.get("postcode").trim().toUpperCase(),
    salary: toNumber(data.get("salary")),
    savings: toNumber(data.get("savings")),
    debt: toNumber(data.get("debt")),
    mortgage_or_rent_monthly: toNumber(data.get("mortgage_or_rent_monthly")),
    property_value: toNumber(data.get("property_value")),
    additional_notes: data.get("additional_notes") || null
  };

  const { error } = await supabase
    .from("young_people_finances")
    .insert([payload]);

  if (error) {
    console.error(error);
    message.textContent = "Error: " + error.message;
    message.className = "ms-3 text-danger";
  } else {
    message.textContent = "Submitted successfully!";
    message.className = "ms-3 text-success";
    form.reset();
  }
});
