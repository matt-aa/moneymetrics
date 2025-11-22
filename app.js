<!-- ============================ -->
<!-- File: app.js -->
<!-- ============================ -->
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// IMPORTANT: replace with your Supabase credentials
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);


// Utility to parse numbers safely
function toNumber(value) {
if (!value) return null;
const num = Number(String(value).replace(/[^0-9.-]/g, ""));
return Number.isFinite(num) ? num : null;
}


const form = document.getElementById("financeForm");
const messageBox = document.getElementById("message");


form.addEventListener("submit", async (e) => {
e.preventDefault();
messageBox.textContent = "";


const formData = new FormData(form);


const payload = {
age_range: formData.get("age_range"),
postcode: formData.get("postcode").trim().toUpperCase(),
salary: toNumber(formData.get("salary")),
savings: toNumber(formData.get("savings")),
debt: toNumber(formData.get("debt")),
mortgage_or_rent_monthly: toNumber(formData.get("mortgage_or_rent_monthly")),
property_value: toNumber(formData.get("property_value")),
};


messageBox.textContent = "Saving...";


const { error } = await supabase
.from("young_people_finances")
.insert([payload]);


if (error) {
messageBox.style.color = "red";
messageBox.textContent = "Error: " + error.message;
} else {
messageBox.style.color = "green";
messageBox.textContent = "Submission saved successfully!";
form.reset();
}
});
