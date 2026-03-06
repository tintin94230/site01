import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function formatResponse({ success, data = null, error = null }) {
  return { success, data, error };
}

function buildPayload(b) {
  if (!b.pays_id || !b.categorie) throw new Error("Champs obligatoires manquants");
  return {
    pays_id: Number(b.pays_id),
    categorie: b.categorie,
    texte: b.texte || null,
    date_update: new Date()
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { pays_id, categorie } = req.query;
      let query = supabase.from("infos_pays").select("*");
      if (pays_id) query = query.eq("pays_id", pays_id);
      if (categorie) query = query.eq("categorie", categorie);

      const { data, error } = await query.order("id");
      if (error) throw error;
      return res.json(formatResponse({ success: true, data }));
    }

    if (req.method === "POST") {
      const payload = buildPayload(req.body);

      // Vérifier si une ligne existe déjà pour ce pays/catégorie
      const { data: existing, error: errCheck } = await supabase
        .from("infos_pays")
        .select("*")
        .eq("pays_id", payload.pays_id)
        .eq("categorie", payload.categorie);

      if (errCheck) throw errCheck;

      if (existing?.length > 0) {
        // mettre à jour
        const { data, error } = await supabase
          .from("infos_pays")
          .update(payload)
          .eq("id", existing[0].id)
          .select();
        if (error) throw error;
        return res.json(formatResponse({ success: true, data: data[0] }));
      } else {
        // insérer
        const { data, error } = await supabase.from("infos_pays").insert([payload]).select();
        if (error) throw error;
        return res.json(formatResponse({ success: true, data: data[0] }));
      }
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json(formatResponse({ success: false, error: "ID manquant" }));
      const { error } = await supabase.from("infos_pays").delete().eq("id", id);
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));

  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json(formatResponse({ success: false, error: err.message }));
  }
}