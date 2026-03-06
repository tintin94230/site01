import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ISO_REGEX = /^[A-Z]{2}$/;

function formatResponse({ success, data = null, error = null }) {
  return { success, data, error };
}

function validateCodeISO(code_iso) {
  if (!ISO_REGEX.test(code_iso)) throw new Error("Code ISO = 2 lettres A-Z");
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { simple, search = "", sort = "nom", dir = "asc", exportCsv, used } = req.query;

      // Mode simple dropdowns (tous les pays, pas de pagination)
      if (simple === "1" && used === "1") {
        const { data: tpData, error: tpError } = await supabase
          .from("transporteurs_pays")
          .select("pays_id", { distinct: true });
        if (tpError) throw tpError;

        const idsUtilises = tpData.map(t => t.pays_id);
        if (!idsUtilises.length) return res.json(formatResponse({ success: true, data: [] }));

        const { data, error } = await supabase
          .from("pays")
          .select("id, code_iso, nom")
          .in("id", idsUtilises)
          .order("nom"); // ← Récupère tous les pays utilisés, sans limite
        if (error) throw error;
        return res.json(formatResponse({ success: true, data }));
      }

      // Export CSV
      if (exportCsv === "1") {
        const { data, error } = await supabase
          .from("pays")
          .select("nom,code_iso,notes")
          .order("nom");
        if (error) throw error;
        const header = "nom,code_iso,notes\n";
        const rows = data.map(r => `"${r.nom}","${r.code_iso}","${(r.notes ?? "").replace(/"/g,'""')}"`).join("\n");
        res.setHeader("Content-Type", "text/csv");
        return res.send(header + rows);
      }

      // Liste avec pagination/recherche (optionnelle)
      let query = supabase
        .from("pays")
        .select("*", { count: "exact" })
        .order(sort, { ascending: dir === "asc" });
      if (search) query = query.ilike("nom", `%${search}%`);

      const { data, count, error } = await query; // ← plus de range(), récupère tout
      if (error) throw error;
      return res.json(formatResponse({ success: true, data, total: count }));
    }

    // POST CSV bulk
    if (req.method === "POST" && req.query.importCsv === "1") {
      const rows = req.body;
      rows.forEach(r => validateCodeISO(r.code_iso));
      const { error } = await supabase.from("pays").upsert(rows, { onConflict: "code_iso" });
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    // POST single
    if (req.method === "POST") {
      let { nom, code_iso, notes } = req.body;
      code_iso = code_iso?.toUpperCase().trim();
      validateCodeISO(code_iso);

      const { data, error } = await supabase.from("pays").insert([{ nom, code_iso, notes }]).select();
      if (error) throw error;
      return res.json(formatResponse({ success: true, data: data[0] }));
    }

    // PUT
    if (req.method === "PUT") {
      let { id, nom, code_iso, notes } = req.body;
      code_iso = code_iso?.toUpperCase().trim();
      validateCodeISO(code_iso);

      const { error } = await supabase
        .from("pays")
        .update({ nom, code_iso, notes, updated_at: new Date() })
        .eq("id", id);
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    // DELETE
    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json(formatResponse({ success: false, error: "ID manquant" }));
      await supabase.from("pays").delete().eq("id", id);
      return res.json(formatResponse({ success: true }));
    }

    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));
  } catch (e) {
    console.error(e);
    return res.status(500).json(formatResponse({ success: false, error: e.message }));
  }
}