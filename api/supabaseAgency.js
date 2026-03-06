import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function formatResponse({ success, data = null, error = null }) {
  return { success, data, error };
}

export default async function handler(req, res) {
  try {
    const tableName = "agency";
    if (req.method === "GET") {
      const { search = "", sort = "agency_name", dir = "asc", exportCsv } = req.query;
      if (exportCsv === "1") {
        const { data, error } = await supabase.from(tableName).select("*").order(sort, { ascending: dir === "asc" });
        if (error) throw error;
        const header = Object.keys(data[0] || {}).join(",") + "\n";
        const rows = data.map(r => Object.values(r).map(v => `"${(v ?? "").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
        res.setHeader("Content-Type", "text/csv"); return res.send(header + rows);
      }
      let query = supabase.from(tableName).select("*", { count: "exact" }).order(sort, { ascending: dir === "asc" });
      if (search) query = query.ilike("agency_name", `%${search}%`);
      const { data, count, error } = await query; if (error) throw error;
      return res.json(formatResponse({ success: true, data, total: count }));
    }
    if (req.method === "POST" && req.query.importCsv === "1") {
      const rows = req.body;
      const { error } = await supabase.from(tableName).upsert(rows, { onConflict: "agency_id" });
      if (error) throw error; return res.json(formatResponse({ success: true }));
    }
    if (req.method === "POST") {
      const { agency_id, agency_name, agency_url, agency_timezone, agency_lang } = req.body;
      const { data, error } = await supabase.from(tableName).insert([{ agency_id, agency_name, agency_url, agency_timezone, agency_lang }]).select();
      if (error) throw error; return res.json(formatResponse({ success: true, data: data[0] }));
    }
    if (req.method === "PUT") {
      const { agency_id, agency_name, agency_url, agency_timezone, agency_lang } = req.body;
      const { error } = await supabase.from(tableName).update({ agency_name, agency_url, agency_timezone, agency_lang, updated_at: new Date() }).eq("agency_id", agency_id);
      if (error) throw error; return res.json(formatResponse({ success: true }));
    }
    if (req.method === "DELETE") {
      const { agency_id } = req.body;
      if (!agency_id) return res.status(400).json(formatResponse({ success: false, error: "agency_id manquant" }));
      await supabase.from(tableName).delete().eq("agency_id", agency_id);
      return res.json(formatResponse({ success: true }));
    }
    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));
  } catch (e) { console.error(e); return res.status(500).json(formatResponse({ success: false, error: e.message })); }
}