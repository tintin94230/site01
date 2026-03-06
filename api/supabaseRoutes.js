// supabaseRoutes.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function formatResponse({ success, data = null, error = null, total = null }) {
  return { success, data, error, total };
}

export default async function handler(req, res) {
  try {
    const table = "routes";

    if (req.method === "GET") {
      let {
        page = "1",
        limit = "100",
        search = "",
        sort = "route_short_name",
        dir = "asc",
        exportCsv,
      } = req.query;

      page = parseInt(page);
      limit = parseInt(limit);
      const offset = (page - 1) * limit;

      // ================= CSV Export =================
      if (exportCsv === "1") {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order(sort, { ascending: dir === "asc" });
        if (error) throw error;

        const header = Object.keys(data[0] || {}).join(",") + "\n";
        const rows = (data || [])
          .map(r => Object.values(r).map(v => `"${v ?? ""}"`).join(","))
          .join("\n");

        res.setHeader("Content-Type", "text/csv");
        return res.send(header + rows);
      }

      // ================= Pagination + Recherche =================
      let query = supabase
        .from(table)
        .select("*", { count: "exact" })
        .order(sort, { ascending: dir === "asc" })
        .range(offset, offset + limit - 1);

      if (search) {
        // Recherche sur route_short_name OU route_long_name
        query = query.or(
          `route_short_name.ilike.%${search}%,route_long_name.ilike.%${search}%`
        );
      }

      const { data, count, error } = await query;
      if (error) throw error;

      return res.json(formatResponse({ success: true, data, total: count }));
    }

    // ================= POST =================
    if (req.method === "POST") {
      const newRoute = req.body;
      const { data, error } = await supabase.from(table).insert([newRoute]).select();
      if (error) throw error;
      return res.json(formatResponse({ success: true, data: data[0] }));
    }

    // ================= PUT =================
    if (req.method === "PUT") {
      const { route_id, ...updateFields } = req.body;
      if (!route_id) return res.status(400).json(formatResponse({ success: false, error: "route_id manquant" }));

      updateFields.updated_at = new Date();
      const { error } = await supabase.from(table).update(updateFields).eq("route_id", route_id);
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    // ================= DELETE =================
    if (req.method === "DELETE") {
      const { route_id } = req.body;
      if (!route_id) return res.status(400).json(formatResponse({ success: false, error: "route_id manquant" }));

      const { error } = await supabase.from(table).delete().eq("route_id", route_id);
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));
  } catch (e) {
    console.error(e);
    return res.status(500).json(formatResponse({ success: false, error: e.message }));
  }
}