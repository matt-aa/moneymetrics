import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Your Supabase details
const supabase = createClient(
  "https://hwuhzgkhnzvkevpqcarm.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dWh6Z2tobnp2a2V2cHFjYXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjE1NTEsImV4cCI6MjA3OTM5NzU1MX0.vgFOJFN4DxXh98Mv7VmUwLW2BIkBaMctuoCbWOpyDVs"
);

const form = document.getElementById("financeForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = Object.fromEntries(new FormData(form));

  // Convert numeric fields
  const numericFields = [
    "salary",
    "savings",
    "debt",
    "mortgage",
    "rent",
    "property_value"
  ];

  numericFields.forEach(field => {
    formData[field] = formData[field] ? Number(formData[field]) : null;
  });

  formData.created_at = new Date().toISOString();

  // Insert into Supabase
  const { data, error } = await supabase
    .from("young_people_finances")
    .insert([formData]);

  if (error) {
    console.error(error);
    message.textContent = "❌ Something went wrong — see console.";
    message.style.color = "red";
  } else {
    message.textContent = "✅ Thank you! Your submission has been saved.";
    message.style.color = "green";
    form.reset();
  }
});