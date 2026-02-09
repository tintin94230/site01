// server.js
import express from "express";
import cors from "cors";

import supabase001 from "./api/supabase001.js"; // handler API blog
import supabase002 from "./api/supabase002.js"; // handler API admin

const app = express();

app.use(cors());
app.use(express.json());

// Servir tout le dossier public comme racine
app.use(express.static('public'));

// 🔥 ROUTES API
app.all("/api/supabase001", supabase001); // blog.html
app.all("/api/supabase002", supabase002); // admin.html

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
