import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase connection
const supabase = createClient(
  "https://hwuhzgkhnzvkevpqcarm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dWh6Z2tobnp2a2V2cHFjYXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjE1NTEsImV4cCI6MjA3OTM5NzU1MX0.vgFOJFN4DxXh98Mv7VmUwLW2BIkBaMctuoCbWOpyDVs"
);

const form = document.getElementById("financeForm");
const message = document.getElementById("message");
const rentInput = document.getElementById("rent");
const mortgageInput = document.getElementById("mortgage");

/**
 * Enforce that ONLY one of rent or mortgage can be filled
 */
function enforceHousingRule() {
  const rentFilled = rentInput.value.trim() !== "";
  const mortgageFilled = mortgageInput.value.trim() !== "";

  // If rent has value → disable mortgage
  mortgageInput.disabled = rentFilled;

  // If mortgage has value → disable rent
  rentInput.disabled = mortgageFilled;

  // If both are empty → enable both
  if (!rentFilled && !mortgageFilled) {
    rentInput.disabled = false;
    mortgageInput.disabled = false;
  }
}

// Run on every change AND blur (covers all cases)
rentInput.addEventListener("input", enforceHousingRule);
mortgageInput.addEventListener("input", enforceHousingRule);
rentInput.addEventListener("blur", enforceHousingRule);
mortgageInput.addEventListener("blur", enforceHousingRule);

function toNumber(v) {
  if (!v) return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Final safety check before submit
  if (
    rentInput.value.trim() !== "" &&
    mortgageInput.value.trim() !== ""
  ) {
    message.textContent = "Please enter rent OR mortgage, not both.";
    message.className = "ms-3 text-danger";
    return;
  }

  message.textContent = "Saving...";
  message.className = "ms-3 text-muted";

  const data = new FormData(form);

  const payload = {
    age_range: data.get("age_range"),
    postcode: data.get("postcode").trim().toUpperCase(),
    salary: toNumber(data.get("salary")),
    savings: toNumber(data.get("savings")),
    debt: toNumber(data.get("debt")),
    rent_monthly: toNumber(data.get("rent_monthly")),
    mortgage_monthly: toNumber(data.get("mortgage_monthly")),
    property_value: toNumber(data.get("property_value"))
  };

  const { error } = await supabase
    .from("young_people_finances")
    .insert([payload]);

  if (error) {
    message.textContent = "Error: " + error.message;
    message.className = "ms-3 text-danger";
  } else {
    message.textContent = "Submitted successfully!";
    message.className = "ms-3 text-success";
    form.reset();
    rentInput.disabled = false;
    mortgageInput.disabled = false;
  }
});
