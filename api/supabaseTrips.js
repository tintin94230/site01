import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function formatResponse({ success, data = null, error = null }) {
  return { success, data, error };
}

export default async function handler(req, res) {
  try {
    const tableName = "trips";

    // --- GET ---
    if (req.method === "GET") {
      const { search = "", sort = "trip_id", dir = "asc", exportCsv } = req.query;

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
      if (search) query = query.ilike("trip_id", `%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      return res.json(formatResponse({ success: true, data, total: count }));
    }

    // --- POST CSV bulk ---
    if (req.method === "POST" && req.query.importCsv === "1") {
      const rows = req.body;

      // Vérifie FK routes
      const routeIds = [...new Set(rows.map(r => r.route_id))];
      const { data: existingRoutes, error: routeError } = await supabase
        .from("routes")
        .select("route_id")
        .in("route_id", routeIds);
      if (routeError) throw routeError;
      const existingRouteIds = existingRoutes.map(r => r.route_id);
      const invalidRouteIds = routeIds.filter(id => !existingRouteIds.includes(id));
      if (invalidRouteIds.length)
        return res.status(400).json(formatResponse({ success: false, error: `route_id(s) invalid: ${invalidRouteIds.join(", ")}` }));

      // Vérifie FK services
      const serviceIds = [...new Set(rows.map(r => r.service_id))];
      const { data: existingServices, error: svcError } = await supabase
        .from("services")
        .select("service_id")
        .in("service_id", serviceIds);
      if (svcError) throw svcError;
      const existingServiceIds = existingServices.map(s => s.service_id);
      const invalidServiceIds = serviceIds.filter(id => !existingServiceIds.includes(id));
      if (invalidServiceIds.length)
        return res.status(400).json(formatResponse({ success: false, error: `service_id(s) invalid: ${invalidServiceIds.join(", ")}` }));

      const { error } = await supabase.from(tableName).upsert(rows, { onConflict: ["trip_id"] });
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    // --- POST single ---
    if (req.method === "POST") {
      const { trip_id, route_id, service_id, trip_headsign, direction_id, block_id, shape_id } = req.body;

      // Vérifie FK
      const { data: routeData } = await supabase.from("routes").select("route_id").eq("route_id", route_id).single();
      if (!routeData) throw new Error(`route_id invalide: ${route_id}`);
      const { data: serviceData } = await supabase.from("services").select("service_id").eq("service_id", service_id).single();
      if (!serviceData) throw new Error(`service_id invalide: ${service_id}`);

      const { data, error } = await supabase
        .from(tableName)
        .insert([{ trip_id, route_id, service_id, trip_headsign, direction_id, block_id, shape_id }])
        .select();
      if (error) throw error;
      return res.json(formatResponse({ success: true, data: data[0] }));
    }

    // --- PUT ---
    if (req.method === "PUT") {
      const { trip_id, trip_headsign, direction_id, block_id, shape_id } = req.body;

      const { error } = await supabase
        .from(tableName)
        .update({ trip_headsign, direction_id, block_id, shape_id, updated_at: new Date() })
        .eq("trip_id", trip_id);
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    // --- DELETE ---
    if (req.method === "DELETE") {
      const { trip_id } = req.body;
      if (!trip_id) return res.status(400).json(formatResponse({ success: false, error: "trip_id manquant" }));
      await supabase.from(tableName).delete().eq("trip_id", trip_id);
      return res.json(formatResponse({ success: true }));
    }

    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));
  } catch (e) {
    console.error(e);
    return res.status(500).json(formatResponse({ success: false, error: e.message }));
  }
}