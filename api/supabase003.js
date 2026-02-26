// /pages/api/supabase003.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    // --- GET : récupérer tous les itinéraires
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("itineraires")
        .select("*")
        .order("nom", { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    // --- POST : ajouter un itinéraire
    if (req.method === "POST") {
      const { nom, lieu_depart_id, lieu_arrivee_id, type_voyage, description, lien_http } = req.body;
      if (!nom || !lieu_depart_id)
        return res.status(400).json({ error: "Nom et lieu de départ obligatoires" });

      const { data, error } = await supabase
        .from("itineraires")
        .insert([{
          nom,
          lieu_depart_id,
          lieu_arrivee_id: lieu_arrivee_id || null,
          type_voyage,
          description,
          lien_http
        }])
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0]);
    }

    // --- PUT : modifier un itinéraire
    if (req.method === "PUT") {
      const { id, nom, lieu_depart_id, lieu_arrivee_id, type_voyage, description, lien_http } = req.body;
      if (!id || !nom || !lieu_depart_id)
        return res.status(400).json({ error: "ID, nom et lieu de départ obligatoires" });

      const { data, error } = await supabase
        .from("itineraires")
        .update({
          nom,
          lieu_depart_id,
          lieu_arrivee_id: lieu_arrivee_id || null,
          type_voyage,
          description,
          lien_http
        })
        .eq("id", id)
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0]);
    }

    // --- DELETE : supprimer un itinéraire
    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID manquant" });

      const { error } = await supabase
        .from("itineraires")
        .delete()
        .eq("id", id);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(204).end();
    }

    return res.status(405).json({ error: "Méthode non autorisée" });

  } catch (err) {
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}