import { createClient } from "@supabase/supabase-js";

const envInfo = {
  env: process.env.VERCEL_ENV || "local",
  supabaseUrlStart: process.env.SUPABASE_URL?.slice(0, 30),
  supabaseKeyStart: process.env.SUPABASE_KEY?.slice(0, 8),
};
console.log("🔍 ENV CHECK", envInfo);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {

    // ===============================
    // GET (AVEC PAGINATION RÉELLE)
    // ===============================
    if (req.method === "GET") {

      let { page, limit } = req.query;

      page = parseInt(page) || 0;
      limit = parseInt(limit) || 500;

      const from = page * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from("lieux")
        .select("*", { count: "exact" })   // 👈 récupère le total
        .order("nom", { ascending: true })
        .range(from, to);

      if (error) {
        console.error("Erreur GET:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        data,
        total: count,
        page,
        limit
      });
    }

    // ===============================
    // POST
    // ===============================
    if (req.method === "POST") {

      const { nom, latitude, longitude } = req.body;

      if (!nom || latitude == null || longitude == null)
        return res.status(400).json({ error: "Champs manquants" });

      const { data, error } = await supabase
        .from("lieux")
        .insert([{ nom, latitude, longitude }])
        .select();

      if (error) {
        console.error("Erreur POST:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data[0]);
    }

    // ===============================
    // PUT
    // ===============================
    if (req.method === "PUT") {

      const { id, nom, latitude, longitude } = req.body;

      if (!id || !nom || latitude == null || longitude == null)
        return res.status(400).json({ error: "Champs manquants" });

      const { data, error } = await supabase
        .from("lieux")
        .update({ nom, latitude, longitude })
        .eq("id", id)
        .select();

      if (error) {
        console.error("Erreur PUT:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data[0]);
    }

    // ===============================
    // DELETE
    // ===============================
    if (req.method === "DELETE") {

      const { id } = req.body;

      if (!id)
        return res.status(400).json({ error: "ID manquant" });

      const { error } = await supabase
        .from("lieux")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erreur DELETE:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(204).end();
    }

    return res.status(405).json({ error: "Méthode non autorisée" });

  } catch (err) {
    console.error("Erreur serveur:", err);
    return res.status(500).json({
      error: "Erreur serveur",
      details: err.message
    });
  }
}