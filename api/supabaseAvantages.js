import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function formatResponse({ success, data = null, error = null }) {
  return { success, data, error };
}

function buildPayload(b) {
  if (!b.transporteur_id || !b.pays_id || !b.beneficiaire_id) throw new Error("Champs obligatoires manquants");

  const payload = {
    transporteur_id: Number(b.transporteur_id),
    pays_id: Number(b.pays_id),
    beneficiaire_id: Number(b.beneficiaire_id),
    nb_coupons_gratuits: b.nb_coupons_gratuits ?? null,
    reduction_percent: b.reduction_percent ?? null,
    prix_forfaitaire_2nde: b.prix_forfaitaire_2nde ?? null,
    prix_forfaitaire_1ere: b.prix_forfaitaire_1ere ?? null,
    conditions: b.conditions || null,
    notes: b.notes || null,
    date_debut: b.date_debut ? new Date(b.date_debut) : null,
    date_fin: b.date_fin ? new Date(b.date_fin) : null
  };
  if ((payload.date_debut && isNaN(payload.date_debut)) || (payload.date_fin && isNaN(payload.date_fin))) throw new Error("Dates invalides");
  return payload;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { simple, transporteur_id, pays_id, beneficiaire_id } = req.query;
      if (simple === "1") {
        let query = supabase.from("avantages").select("id, transporteur_id, pays_id, beneficiaire_id");
        if (transporteur_id) query = query.eq("transporteur_id", transporteur_id);
        if (pays_id) query = query.eq("pays_id", pays_id);
        if (beneficiaire_id) query = query.eq("beneficiaire_id", beneficiaire_id);
        const { data, error } = await query.order("id");
        if (error) throw error;
        return res.json(formatResponse({ success: true, data }));
      }

      let query = supabase.from("avantages").select(`
        *, transporteur:transporteur_id(id, nom), pays:pays_id(id, code_iso), beneficiaire:beneficiaire_id(id, code)
      `);
      if (transporteur_id) query = query.eq("transporteur_id", transporteur_id);
      if (pays_id) query = query.eq("pays_id", pays_id);
      if (beneficiaire_id) query = query.eq("beneficiaire_id", beneficiaire_id);
      const { data, error } = await query.order("id");
      if (error) throw error;
      return res.json(formatResponse({ success: true, data }));
    }

    if (req.method === "POST") {
      const payload = buildPayload(req.body);
      const { data, error } = await supabase.from("avantages").insert([payload]).select();
      if (error) throw error;
      return res.json(formatResponse({ success: true, data: data[0] }));
    }

    if (req.method === "PUT") {
      if (!req.body.id) throw new Error("ID manquant");
      const payload = buildPayload(req.body);
      const { data, error } = await supabase.from("avantages").update(payload).eq("id", req.body.id).select();
      if (error) throw error;
      return res.json(formatResponse({ success: true, data: data[0] }));
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json(formatResponse({ success: false, error: "ID manquant" }));
      const { error } = await supabase.from("avantages").delete().eq("id", id);
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json(formatResponse({ success: false, error: err.message }));
  }
}