// server.js
import express from "express";
import cors from "cors";

import supabase001 from "./api/supabase001.js"; // handler API blog
import supabase002 from "./api/supabase002.js"; // handler API admin
import supabase003 from "./api/supabase003.js"; // handler API itinéraires
import supabasePays from "./api/supabasePays.js"; // handler API pays
import supabaseTransporteurs from "./api/supabaseTransporteurs.js"; // handler API pays
import supabaseBeneficiaires from "./api/supabaseBeneficiaires.js"; // handler API pays
import supabaseAvantages from "./api/supabaseAvantages.js"; // handler API pays

const app = express();

app.use(cors());
app.use(express.json());

// Servir tout le dossier public comme racine
app.use(express.static('public'));

// 🔥 ROUTES API
app.all("/api/supabase001", supabase001); // blog.html
app.all("/api/supabase002", supabase002); // admin.html
app.all("/api/supabase003", supabase003); // admin-itinéraires.html
app.all("/api/supabasePays", supabasePays); // admin-pays.html
app.all("/api/supabaseTransporteurs", supabaseTransporteurs); // admin-transporteurs.html
app.all("/api/supabaseBeneficiaires", supabaseBeneficiaires); // admin-beneficiaires.html
app.all("/api/supabaseAvantages", supabaseAvantages); // admin-avantages.html

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
