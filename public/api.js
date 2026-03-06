export async function getPays() {
  return (await (await fetch('/api/supabasePays?simple=1')).json()).data;
}

export async function getBeneficiaires() {
  return (await (await fetch('/api/supabaseBeneficiaires')).json()).data;
}

export async function getAvantages(paysId) {
  return (await (await fetch(`/api/supabaseAvantages?pays_id=${paysId}`)).json()).data || [];
}