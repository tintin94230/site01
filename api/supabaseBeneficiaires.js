import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("beneficiaires")
        .select("*")
        .order("id", { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    if (req.method === "POST") {
      const { code, libelle, age_max, notes } = req.body;
      if (!code || !libelle) return res.status(400).json({ error: "Champs obligatoires manquants" });

      const { data, error } = await supabase
        .from("beneficiaires")
        .insert([{ code, libelle, age_max, notes }])
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data[0]);
    }

    if (req.method === "PUT") {
      const { id, code, libelle, age_max, notes } = req.body;
      if (!id || !code || !libelle) return res.status(400).json({ error: "Champs obligatoires manquants" });

      const { data, error } = await supabase
        .from("beneficiaires")
        .update({ code, libelle, age_max, notes })
        .eq("id", id)
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0]);
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID manquant" });

      const { error } = await supabase
        .from("beneficiaires")
        .delete()
        .eq("id", id);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Méthode non autorisée" });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({ error: "Erreur serveur interne" });
  }
}