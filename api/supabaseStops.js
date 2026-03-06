import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function formatResponse({ success, data = null, error = null }) {
  return { success, data, error };
}

export default async function handler(req, res) {
  try {
    const tableName = "stops";

    if (req.method === "GET") {
      const { search = "", sort = "stop_name", dir = "asc", exportCsv } = req.query;

      if (exportCsv === "1") {
        const { data, error } = await supabase.from(tableName).select("*").order(sort, { ascending: dir === "asc" });
        if (error) throw error;
        const header = Object.keys(data[0] || {}).join(",") + "\n";
        const rows = data.map(r =>
          Object.values(r)
            .map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
            .join(",")
        ).join("\n");
        res.setHeader("Content-Type", "text/csv");
        return res.send(header + rows);
      }

      let query = supabase.from(tableName).select("*", { count: "exact" }).order(sort, { ascending: dir === "asc" });
      if (search) query = query.ilike("stop_name", `%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      return res.json(formatResponse({ success: true, data, total: count }));
    }

    if (req.method === "POST" && req.query.importCsv === "1") {
      const rows = req.body;
      const { error } = await supabase.from(tableName).upsert(rows, { onConflict: "stop_id" });
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    if (req.method === "POST") {
      const { stop_id, stop_name, stop_lat, stop_lon, stop_desc, zone_id, stop_url, location_type, parent_station } = req.body;
      const { data, error } = await supabase.from(tableName).insert([{
        stop_id, stop_name, stop_lat, stop_lon, stop_desc, zone_id, stop_url, location_type, parent_station
      }]).select();
      if (error) throw error;
      return res.json(formatResponse({ success: true, data: data[0] }));
    }

    if (req.method === "PUT") {
      const { stop_id, stop_name, stop_lat, stop_lon, stop_desc, zone_id, stop_url, location_type, parent_station } = req.body;
      const { error } = await supabase.from(tableName)
        .update({ stop_name, stop_lat, stop_lon, stop_desc, zone_id, stop_url, location_type, parent_station, updated_at: new Date() })
        .eq("stop_id", stop_id);
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    if (req.method === "DELETE") {
      const { stop_id } = req.body;
      if (!stop_id) return res.status(400).json(formatResponse({ success: false, error: "stop_id manquant" }));
      await supabase.from(tableName).delete().eq("stop_id", stop_id);
      return res.json(formatResponse({ success: true }));
    }

    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));
  } catch (e) {
    console.error(e);
    return res.status(500).json(formatResponse({ success: false, error: e.message }));
  }
}