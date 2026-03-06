// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ----------------- IMPORT API -----------------
import supabase001 from "./api/supabase001.js"; 
import supabase002 from "./api/supabase002.js"; 
import supabase003 from "./api/supabase003.js"; 
import supabasePays from "./api/supabasePays.js"; 
import supabaseTransporteurs from "./api/supabaseTransporteurs.js"; 
import supabaseBeneficiaires from "./api/supabaseBeneficiaires.js"; 
import supabaseAvantages from "./api/supabaseAvantages.js"; 
import supabaseInfoPays from "./api/supabaseInfoPays.js"; 

// ✅ API GTFS (tables brutes)
import supabaseAgency from "./api/supabaseAgency.js";
import supabaseRoutes from "./api/supabaseRoutes.js";
import supabaseServices from "./api/supabaseServices.js";
import supabaseCalendarDates from "./api/supabaseCalendarDates.js";
import supabaseTrips from "./api/supabaseTrips.js";
import supabaseStopTimes from "./api/supabaseStopTimes.js";
import supabaseStops from "./api/supabaseStops.js";

// 🚆 API TRANSPORT (couteau suisse GTFS)
import supabaseTransport from "./api/supabaseTransport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Servir les fichiers publics
app.use(express.static(path.join(__dirname, "public")));

// =====================================================
// API EXISTANTES
// =====================================================
app.all("/api/supabase001", supabase001);
app.all("/api/supabase002", supabase002);
app.all("/api/supabase003", supabase003);
app.all("/api/supabasePays", supabasePays);
app.all("/api/supabaseTransporteurs", supabaseTransporteurs);
app.all("/api/supabaseBeneficiaires", supabaseBeneficiaires);
app.all("/api/supabaseAvantages", supabaseAvantages);
app.all("/api/supabaseInfoPays", supabaseInfoPays);

// =====================================================
// API GTFS (données brutes)
// =====================================================
app.all("/api/supabaseAgency", supabaseAgency);
app.all("/api/supabaseRoutes", supabaseRoutes);
app.all("/api/supabaseServices", supabaseServices);
app.all("/api/supabaseCalendarDates", supabaseCalendarDates);
app.all("/api/supabaseTrips", supabaseTrips);
app.all("/api/supabaseStopTimes", supabaseStopTimes);
app.all("/api/supabaseStops", supabaseStops);

// =====================================================
// 🚆 API TRANSPORT (métier)
// =====================================================
app.use("/api/transport", supabaseTransport);

// =====================================================
// ROUTE HTML PRINCIPALE
// =====================================================
app.get("*", (req, res) => {
  if (
    req.path.startsWith("/api") ||
    req.path.endsWith(".css") ||
    req.path.endsWith(".js") ||
    req.path.endsWith(".ico") ||
    req.path.endsWith(".png") ||
    req.path.endsWith(".jpg") ||
    req.path.endsWith(".svg")
  ) {
    return res.status(404).send("Not found");
  }

  res.sendFile(
    path.join(__dirname, "public/voyager-en-train.html"),
    (err) => {
      if (err) console.error("Erreur HTML:", err);
    }
  );
});

// =====================================================
// LANCEMENT SERVEUR
// =====================================================
app.listen(3000, () => {
  console.log("🚆 Server running on http://localhost:3000");
  console.log("API transport : http://localhost:3000/api/transport");
});