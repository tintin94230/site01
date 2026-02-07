import { createClient } from "@supabase/supabase-js";

console.log("💡 DEBUG ENV - SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("💡 DEBUG ENV - SUPABASE_KEY =", process.env.SUPABASE_KEY?.slice(0, 4) + "…"); // on masque le reste

console.log("API appelée");
console.log("process.env.SUPABASE_KEY:", process.env.SUPABASE_KEY?.slice(0,5));


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("mots")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const { mot } = req.body;
      if (!mot) return res.status(400).json({ error: "Mot manquant" });

      const { data, error } = await supabase
        .from("mots")
        .insert([{ mot }])
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0]);
    }

    return res.status(405).json({ error: "Méthode non autorisée" });

  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}
