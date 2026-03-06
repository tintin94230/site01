import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const ISO_REGEX = /^[A-Z]{2}$/;

export default async function handler(req, res) {
  try {
    // ===============================
    // GET
    // ===============================
    if (req.method === "GET") {
      const { simple, page = 0, limit = 25, search = "", sort = "nom", dir = "asc", exportCsv, used } = req.query;

      // --- Mode simple pour dropdowns (tous les pays utilisés dans transporteurs_pays) ---
      if(simple === "1" && used === "1") {
        // 1️⃣ Récupérer les IDs de pays utilisés
        const { data: tpData, error: tpError } = await supabase
          .from("transporteurs_pays")
          .select("pays_id", { distinct: true });
        if(tpError) throw tpError;

        const idsUtilises = tpData.map(t => t.pays_id);
        if(idsUtilises.length === 0) return res.json({ data: [] });

        // 2️⃣ Récupérer les pays correspondants
        const { data, error } = await supabase
          .from("pays")
          .select("id, code_iso, nom")
          .in("id", idsUtilises)
          .order("nom", { ascending: true });
        if(error) throw error;

        return res.json({ data });
      }

      // --- Pagination normale ---
      let p = parseInt(page);
      let l = parseInt(limit);
      const from = p * l;
      const to = from + l - 1;

      // -------- EXPORT CSV --------
      if (exportCsv === "1") {
        const { data, error } = await supabase
          .from("pays")
          .select("nom,code_iso,notes")
          .order("nom");
        if (error) throw error;
        const header = "nom,code_iso,notes\n";
        const rows = data.map(r =>
          `"${r.nom}","${r.code_iso}","${(r.notes ?? "").replace(/"/g,'""')}"`
        ).join("\n");
        res.setHeader("Content-Type", "text/csv");
        return res.send(header + rows);
      }

      // -------- Liste complète avec pagination et recherche --------
      let query = supabase
        .from("pays")
        .select("*", { count: "exact" })
        .order(sort, { ascending: dir === "asc" });

      if (search) query = query.ilike("nom", `%${search}%`);

      const { data, count, error } = await query.range(from, to);
      if (error) throw error;

      return res.json({ data, total: count });
    }

    // ===============================
    // POST CSV bulk
    // ===============================
    if (req.method === "POST" && req.query.importCsv === "1") {
      const rows = req.body;
      rows.forEach(r => {
        if (!ISO_REGEX.test(r.code_iso))
          throw new Error(`Code ISO invalide : ${r.code_iso}`);
      });
      const { error } = await supabase
        .from("pays")
        .upsert(rows, { onConflict: "code_iso" });
      if (error) throw error;
      return res.json({ success: true });
    }

    // ===============================
    // POST single
    // ===============================
    if (req.method === "POST") {
      let { nom, code_iso, notes } = req.body;
      code_iso = code_iso?.toUpperCase().trim();
      if (!ISO_REGEX.test(code_iso))
        return res.status(400).json({ error: "Code ISO = 2 lettres A-Z" });
      const { data, error } = await supabase
        .from("pays")
        .insert([{ nom, code_iso, notes }])
        .select();
      if (error) throw error;
      return res.json(data[0]);
    }

    // ===============================
    // PUT (mise à jour)
    // ===============================
    if (req.method === "PUT") {
      let { id, nom, code_iso, notes } = req.body;
      code_iso = code_iso?.toUpperCase().trim();
      if (!ISO_REGEX.test(code_iso))
        return res.status(400).json({ error: "Code ISO = 2 lettres A-Z" });
      const { error } = await supabase
        .from("pays")
        .update({ nom, code_iso, notes, updated_at: new Date() })
        .eq("id", id);
      if (error) throw error;
      return res.json({ success: true });
    }

    // ===============================
    // DELETE
    // ===============================
    if (req.method === "DELETE") {
      const { id } = req.body;
      await supabase.from("pays").delete().eq("id", id);
      return res.end();
    }

    return res.status(405).end();

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}