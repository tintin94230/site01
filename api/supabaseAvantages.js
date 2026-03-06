import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY // ← retour à ton ancienne clé
);

export default async function handler(req, res) {
  try {

    /* ================================
       GET
    ================================ */
    if (req.method === "GET") {
      const { simple, transporteur_id, pays_id, beneficiaire_id } = req.query;

      // Mode simple
      if (simple === "1") {
        let query = supabase
          .from("avantages")
          .select("id, transporteur_id, pays_id, beneficiaire_id");

        if (transporteur_id) query = query.eq("transporteur_id", transporteur_id);
        if (pays_id) query = query.eq("pays_id", pays_id);
        if (beneficiaire_id) query = query.eq("beneficiaire_id", beneficiaire_id);

        const { data, error } = await query.order("id", { ascending: true });

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ data });
      }

      // GET complet avec jointures + filtres
      let query = supabase
        .from("avantages")
        .select(`
          *,
          transporteur:transporteur_id(id, nom),
          pays:pays_id(id, code_iso),
          beneficiaire:beneficiaire_id(id, code)
        `);

      if (transporteur_id) query = query.eq("transporteur_id", transporteur_id);
      if (pays_id) query = query.eq("pays_id", pays_id);
      if (beneficiaire_id) query = query.eq("beneficiaire_id", beneficiaire_id);

      const { data, error } = await query.order("id", { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ data });
    }

    /* ================================
       POST
    ================================ */
    if (req.method === "POST") {
      const b = req.body;

      if (!b.transporteur_id || !b.pays_id || !b.beneficiaire_id) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
      }

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
        date_debut: b.date_debut || null,
        date_fin: b.date_fin || null
      };

      const { data, error } = await supabase
        .from("avantages")
        .insert([payload])
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data[0]);
    }

    /* ================================
       PUT
    ================================ */
    if (req.method === "PUT") {
      const b = req.body;
      if (!b.id) return res.status(400).json({ error: "ID manquant" });

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
        date_debut: b.date_debut || null,
        date_fin: b.date_fin || null
      };

      const { data, error } = await supabase
        .from("avantages")
        .update(payload)
        .eq("id", b.id)
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0]);
    }

    /* ================================
       DELETE
    ================================ */
    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID manquant" });

      const { error } = await supabase
        .from("avantages")
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