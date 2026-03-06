// supabaseTransport.js (ESM)
import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// ===============================
// CONFIGURATION SUPABASE
// ===============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ============================================
// 1. Recherche de gare par nom
// GET /stops/search?q=nom
// ============================================
router.get("/stops/search", async (req, res) => {
  const q = req.query.q || req.query.search;
  if (!q) return res.status(400).json({ error: "missing query" });

  try {
    const { data, error } = await supabase
      .from("stops")
      .select("stop_id, stop_name, stop_lat, stop_lon, location_type")
      .ilike("stop_name", `%${q}%`)
      .limit(20);

    if (error) return res.status(500).json({ error });
    res.json({ data });
  } catch (err) {
    console.error("Erreur stops/search:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 2. Prochains départs d'une gare (StopArea inclus)
// GET /station/trips-expanded?stop_id=XXX
// ============================================
router.get("/station/trips-expanded", async (req, res) => {
  const stop_id = req.query.stop_id;
  if (!stop_id) return res.status(400).json({ error: "missing stop_id" });

  try {
    async function expandStop(id) {
      if (id.startsWith("StopArea:")) {
        const { data, error } = await supabase
          .from("stops")
          .select("stop_id")
          .or(`stop_id.eq.${id},parent_station.eq.${id}`);
        if (error) throw error;
        return data.map((d) => d.stop_id);
      }
      return [id];
    }

    const stopIds = await expandStop(stop_id);

    let trips = [];
    for (const s of stopIds) {
      const { data, error } = await supabase
        .from("stop_times")
        .select(`
          trip_id,
          departure_time,
          arrival_time,
          trips (
            trip_headsign,
            route_id,
            routes (
              route_short_name
            )
          )
        `)
        .eq("stop_id", s)
        .order("departure_time");
      if (!error) trips.push(...(data || []));
    }

    // Supprime doublons
    const uniqueTrips = Object.values(
      trips.reduce((acc, t) => {
        if (!acc[t.trip_id]) acc[t.trip_id] = t;
        return acc;
      }, {})
    );

    res.json({ data: uniqueTrips });
  } catch (err) {
    console.error("Erreur station/trips-expanded:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 3. Recherche trajet A -> B (StopArea inclus)
// GET /journey/search?from=XXX&to=YYY
// ============================================
router.get("/journey/search", async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  if (!from || !to) return res.status(400).json({ error: "missing from/to" });

  try {
    async function expandStop(id) {
      if (id.startsWith("StopArea:")) {
        const { data, error } = await supabase
          .from("stops")
          .select("stop_id")
          .or(`stop_id.eq.${id},parent_station.eq.${id}`);
        if (error) throw error;
        return data.map((d) => d.stop_id);
      }
      return [id];
    }

    const fromStops = await expandStop(from);
    const toStops = await expandStop(to);

    const { data: fromData, error: fromError } = await supabase
      .from("stop_times")
      .select("trip_id, departure_time, stop_id, trips(route_id)")
      .in("stop_id", fromStops);

    if (fromError) throw fromError;

    const { data: toData, error: toError } = await supabase
      .from("stop_times")
      .select("trip_id, arrival_time, stop_id")
      .in("stop_id", toStops);

    if (toError) throw toError;

    const fromTripIds = new Set(fromData.map((t) => t.trip_id));
    const toTripMap = toData.reduce((acc, t) => {
      if (fromTripIds.has(t.trip_id)) acc[t.trip_id] = t;
      return acc;
    }, {});

    const trips = fromData
      .filter((t) => toTripMap[t.trip_id])
      .map((t) => ({
        trip_id: t.trip_id,
        route_id: t.trips?.route_id || "",
        departure_time: t.departure_time,
        arrival_time: toTripMap[t.trip_id].arrival_time,
      }));

    res.json({ data: trips });
  } catch (err) {
    console.error("Erreur journey/search:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 4. Stops d'une route
// GET /route/stops?route_id=XXX
// ============================================
router.get("/route/stops", async (req, res) => {
  const route_id = req.query.route_id || req.query.route;
  if (!route_id) return res.status(400).json({ error: "missing route_id" });

  try {
    const { data, error } = await supabase
      .from("trips")
      .select(`
        trip_id,
        stop_times (
          stop_sequence,
          stops ( stop_id, stop_name, stop_lat, stop_lon )
        )
      `)
      .eq("route_id", route_id)
      .limit(1);

    if (error) return res.status(500).json({ error });
    res.json({ data });
  } catch (err) {
    console.error("Erreur route/stops:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// 5. Stops pour carte
// GET /map/stops
// ============================================
router.get("/map/stops", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("stops")
      .select("stop_name, stop_lat, stop_lon")
      .limit(10000);

    if (error) return res.status(500).json({ error });
    res.json({ data });
  } catch (err) {
    console.error("Erreur map/stops:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;