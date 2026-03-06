import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const URL_REGEX = /^https?:\/\/.+/i;

export default async function handler(req, res) {
  try {
    // ================= GET =================
    if (req.method === "GET") {
      const { simple, pays_id, page = 0, limit = 25, search = "", sort = "nom", dir = "asc", exportCsv } = req.query;
      const p = parseInt(page); const l = parseInt(limit);

      // --- Mode simple : dropdowns ---
      if(simple === "1" && pays_id){
        // Récupérer les IDs des transporteurs pour ce pays
        const { data: tpData, error: tpError } = await supabase
          .from("transporteurs_pays")
          .select("transporteur_id")
          .eq("pays_id", pays_id);
        if(tpError) throw tpError;

        const transporteurIds = tpData.map(tp => tp.transporteur_id);
        if(transporteurIds.length === 0) return res.json({ data: [] });

        // Récupérer les transporteurs correspondants
        const { data, error } = await supabase
          .from("transporteurs")
          .select("id, nom")
          .in("id", transporteurIds)
          .order("nom", { ascending: true });

        if(error) throw error;
        return res.json({ data });
      }

      // ---- Export CSV ----
      if (exportCsv === "1") {
        const { data, error } = await supabase
          .from("transporteurs")
          .select(`
            id, nom, type, site_web, notes,
            transporteurs_pays(pays(code_iso))
          `)
          .order("nom");
        if (error) throw error;

        const header = "nom,type,site_web,notes,pays\n";
        const rows = data.map(r => {
          const paysCodes = r.transporteurs_pays.map(tp => tp.pays.code_iso).join(";");
          return `"${r.nom}","${r.type ?? ""}","${r.site_web ?? ""}","${(r.notes ?? "").replace(/"/g,'""')}","${paysCodes}"`;
        }).join("\n");

        res.setHeader("Content-Type", "text/csv");
        return res.send(header + rows);
      }

      // ---- Liste normale avec pagination ----
      const from = p * l;
      const to = from + l - 1;

      let query = supabase
        .from("transporteurs")
        .select(`
          id, nom, type, site_web, notes,
          transporteurs_pays(pays(id,code_iso))
        `, { count: "exact" })
        .order(sort, { ascending: dir==="asc" });

      if (search) query = query.ilike("nom", `%${search}%`);

      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return res.json({ data, total: count });
    }

    // ================= POST =================
    if (req.method === "POST") {
      const { nom, type, site_web, notes, pays } = req.body;
      if (!nom || !pays || pays.length === 0) return res.status(400).json({ error: "Nom et au moins un pays obligatoires" });
      if (site_web && !URL_REGEX.test(site_web)) return res.status(400).json({ error: "URL invalide" });

      const { data: newT, error } = await supabase
        .from("transporteurs")
        .insert([{ nom, type, site_web, notes }])
        .select();
      if (error) throw error;
      const transporteur_id = newT[0].id;

      const tpRows = pays.map(pid => ({ transporteur_id, pays_id: pid }));
      const { error: tpError } = await supabase.from("transporteurs_pays").insert(tpRows);
      if (tpError) throw tpError;

      return res.json(newT[0]);
    }

    // ================= PUT =================
    if (req.method === "PUT") {
      const { id, nom, type, site_web, notes, pays } = req.body;
      if (!id || !nom || !pays || pays.length === 0) return res.status(400).json({ error: "Nom + au moins un pays obligatoires" });
      if (site_web && !URL_REGEX.test(site_web)) return res.status(400).json({ error: "URL invalide" });

      const { error } = await supabase
        .from("transporteurs")
        .update({ nom, type, site_web, notes, updated_at: new Date() })
        .eq("id", id);
      if (error) throw error;

      await supabase.from("transporteurs_pays").delete().eq("transporteur_id", id);
      const tpRows = pays.map(pid => ({ transporteur_id: id, pays_id: pid }));
      const { error: tpError } = await supabase.from("transporteurs_pays").insert(tpRows);
      if (tpError) throw tpError;

      return res.json({ success: true });
    }

    // ================= DELETE =================
    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID manquant" });
      await supabase.from("transporteurs_pays").delete().eq("transporteur_id", id);
      await supabase.from("transporteurs").delete().eq("id", id);
      return res.end();
    }

    return res.status(405).json({ error: "Méthode non autorisée" });

  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}