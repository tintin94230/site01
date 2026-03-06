import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function formatResponse({ success, data = null, error = null }) {
  return { success, data, error };
}

function validateBeneficiaire(body) {
  if (!body.code || !body.libelle) throw new Error("Champs obligatoires manquants");
  if (body.age_max && isNaN(Number(body.age_max))) throw new Error("age_max doit être un nombre");
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase.from("beneficiaires").select("*").order("id");
      if (error) throw error;
      return res.json(formatResponse({ success: true, data }));
    }

    if (req.method === "POST") {
      validateBeneficiaire(req.body);
      const { code, libelle, age_max, notes } = req.body;
      const { data, error } = await supabase.from("beneficiaires").insert([{ code, libelle, age_max, notes }]).select();
      if (error) throw error;
      return res.json(formatResponse({ success: true, data: data[0] }));
    }

    if (req.method === "PUT") {
      if (!req.body.id) throw new Error("ID manquant");
      validateBeneficiaire(req.body);
      const { id, code, libelle, age_max, notes } = req.body;
      const { data, error } = await supabase.from("beneficiaires").update({ code, libelle, age_max, notes }).eq("id", id).select();
      if (error) throw error;
      return res.json(formatResponse({ success: true, data: data[0] }));
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json(formatResponse({ success: false, error: "ID manquant" }));
      const { error } = await supabase.from("beneficiaires").delete().eq("id", id);
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json(formatResponse({ success: false, error: err.message }));
  }
}