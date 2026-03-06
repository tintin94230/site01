import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function formatResponse({ success, data = null, error = null }) {
  return { success, data, error };
}

export default async function handler(req, res) {
  try {
    const tableName = "stop_times";

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

      // Vérifie FK trips
      const tripIds = [...new Set(rows.map(r => r.trip_id))];
      const { data: existingTrips, error: tripError } = await supabase
        .from("trips")
        .select("trip_id")
        .in("trip_id", tripIds);
      if (tripError) throw tripError;
      const existingTripIds = existingTrips.map(r => r.trip_id);
      const invalidTripIds = tripIds.filter(id => !existingTripIds.includes(id));
      if (invalidTripIds.length)
        return res.status(400).json(formatResponse({ success: false, error: `trip_id(s) invalid: ${invalidTripIds.join(", ")}` }));

      // Vérifie FK stops
      const stopIds = [...new Set(rows.map(r => r.stop_id))];
      const { data: existingStops, error: stopError } = await supabase
        .from("stops")
        .select("stop_id")
        .in("stop_id", stopIds);
      if (stopError) throw stopError;
      const existingStopIds = existingStops.map(s => s.stop_id);
      const invalidStopIds = stopIds.filter(id => !existingStopIds.includes(id));
      if (invalidStopIds.length)
        return res.status(400).json(formatResponse({ success: false, error: `stop_id(s) invalid: ${invalidStopIds.join(", ")}` }));

      const { error } = await supabase.from(tableName).upsert(rows, { onConflict: ["trip_id", "stop_sequence"] });
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    // --- POST single ---
    if (req.method === "POST") {
      const { trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled } = req.body;

      // Vérifie FK
      const { data: tripData } = await supabase.from("trips").select("trip_id").eq("trip_id", trip_id).single();
      if (!tripData) throw new Error(`trip_id invalide: ${trip_id}`);
      const { data: stopData } = await supabase.from("stops").select("stop_id").eq("stop_id", stop_id).single();
      if (!stopData) throw new Error(`stop_id invalide: ${stop_id}`);

      const { data, error } = await supabase
        .from(tableName)
        .insert([{ trip_id, arrival_time, departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled }])
        .select();
      if (error) throw error;
      return res.json(formatResponse({ success: true, data: data[0] }));
    }

    // --- PUT ---
    if (req.method === "PUT") {
      const { trip_id, stop_sequence, arrival_time, departure_time, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled } = req.body;

      const { error } = await supabase
        .from(tableName)
        .update({ arrival_time, departure_time, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, updated_at: new Date() })
        .eq("trip_id", trip_id)
        .eq("stop_sequence", stop_sequence);
      if (error) throw error;
      return res.json(formatResponse({ success: true }));
    }

    // --- DELETE ---
    if (req.method === "DELETE") {
      const { trip_id, stop_sequence } = req.body;
      if (!trip_id || stop_sequence == null) return res.status(400).json(formatResponse({ success: false, error: "trip_id ou stop_sequence manquant" }));
      await supabase.from(tableName).delete().eq("trip_id", trip_id).eq("stop_sequence", stop_sequence);
      return res.json(formatResponse({ success: true }));
    }

    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));
  } catch (e) {
    console.error(e);
    return res.status(500).json(formatResponse({ success: false, error: e.message }));
  }
}