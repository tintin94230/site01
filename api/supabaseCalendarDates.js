import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function formatResponse({ success, data = null, error = null }) {
  return { success, data, error };
}

export default async function handler(req, res) {
  try {
    const tableName = "calendar_dates";

    // --- GET ---
    if (req.method === "GET") {
      const { search = "", sort = "service_id", dir = "asc", exportCsv } = req.query;

      // Export CSV
      if (exportCsv === "1") {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .order(sort, { ascending: dir === "asc" });
        if (error) throw error;

        const header = Object.keys(data[0] || {}).join(",") + "\n";
        const rows = data
          .map(r => Object.values(r).map(v => `"${(v ?? "").toString().replace(/"/g,'""')}"`).join(","))
          .join("\n");
        res.setHeader("Content-Type", "text/csv");
        return res.send(header + rows);
      }

      // GET avec recherche et tri
      let query = supabase
        .from(tableName)
        .select("*", { count: "exact" })
        .order(sort, { ascending: dir === "asc" });
      if (search) query = query.ilike("service_id", `%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      return res.json(formatResponse({ success: true, data, total: count }));
    }

    // --- POST CSV bulk ---
    if (req.method === "POST" && req.query.importCsv === "1") {
      const rows = req.body;

      // Vérifie que tous les service_id existent dans services
      const serviceIds = [...new Set(rows.map(r => r.service_id))];
      const { data: existingServices, error: svcError } = await supabase
        .from("services")
        .select("service_id")
        .in("service_id", serviceIds);
      if (svcError) throw svcError;

      const existingIds = existingServices.map(s => s.service_id);
      const invalidIds = serviceIds.filter(id => !existingIds.includes(id));
      if (invalidIds.length)
        return res.status(400).json(formatResponse({ success: false, error: `service_id(s) invalid: ${invalidIds.join(", ")}` }));

      const { error } = await supabase.from(tableName).upsert(rows, { onConflict: ["service_id", "date"] });
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    // --- POST single ---
    if (req.method === "POST") {
      const { service_id, date, exception_type } = req.body;

      // Vérifie FK
      const { data: svcData, error: svcError } = await supabase
        .from("services")
        .select("service_id")
        .eq("service_id", service_id)
        .single();
      if (svcError || !svcData) throw new Error(`service_id invalide: ${service_id}`);

      const { data, error } = await supabase
        .from(tableName)
        .insert([{ service_id, date, exception_type }])
        .select();
      if (error) throw error;
      return res.json(formatResponse({ success: true, data: data[0] }));
    }

    // --- PUT ---
    if (req.method === "PUT") {
      const { service_id, date, exception_type } = req.body;

      const { error } = await supabase
        .from(tableName)
        .update({ exception_type, updated_at: new Date() })
        .eq("service_id", service_id)
        .eq("date", date);
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    // --- DELETE ---
    if (req.method === "DELETE") {
      const { service_id, date } = req.body;
      if (!service_id || !date)
        return res.status(400).json(formatResponse({ success: false, error: "service_id et date requis" }));

      await supabase.from(tableName).delete().eq("service_id", service_id).eq("date", date);
      return res.json(formatResponse({ success: true }));
    }

    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));
  } catch (e) {
    console.error(e);
    return res.status(500).json(formatResponse({ success: false, error: e.message }));
  }
}