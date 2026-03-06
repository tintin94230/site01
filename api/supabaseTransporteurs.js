import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const URL_REGEX = /^https?:\/\/.+/i;

function formatResponse({ success, data = null, error = null }) {
  return { success, data, error };
}

function validateTransporteur(body) {
  if (!body.nom || !body.pays || !body.pays.length) throw new Error("Nom et au moins un pays obligatoires");
  if (body.site_web && !URL_REGEX.test(body.site_web)) throw new Error("URL invalide");
}

export default async function handler(req, res) {
  try {
    const { simple, pays_id, page = 0, limit = 25, search = "", sort = "nom", dir = "asc", exportCsv } = req.query;
    const p = parseInt(page);
    const l = parseInt(limit);
    const from = p * l;
    const to = from + l - 1;

    // GET
    if (req.method === "GET") {
      if (simple === "1" && pays_id) {
        const { data: tpData, error: tpError } = await supabase.from("transporteurs_pays").select("transporteur_id").eq("pays_id", pays_id);
        if (tpError) throw tpError;
        const transporteurIds = tpData.map(tp => tp.transporteur_id);
        if (!transporteurIds.length) return res.json(formatResponse({ success: true, data: [] }));

        const { data, error } = await supabase.from("transporteurs").select("id, nom").in("id", transporteurIds).order("nom");
        if (error) throw error;
        return res.json(formatResponse({ success: true, data }));
      }

      // Export CSV
      if (exportCsv === "1") {
        const { data, error } = await supabase.from("transporteurs")
          .select("id, nom, type, site_web, notes, transporteurs_pays(pays(code_iso))").order("nom");
        if (error) throw error;
        const header = "nom,type,site_web,notes,pays\n";
        const rows = data.map(r => {
          const paysCodes = r.transporteurs_pays.map(tp => tp.pays.code_iso).join(";");
          return `"${r.nom}","${r.type ?? ""}","${r.site_web ?? ""}","${(r.notes ?? "").replace(/"/g,'""')}","${paysCodes}"`;
        }).join("\n");
        res.setHeader("Content-Type", "text/csv");
        return res.send(header + rows);
      }

      let query = supabase.from("transporteurs")
        .select("id, nom, type, site_web, notes, transporteurs_pays(pays(id,code_iso))", { count: "exact" })
        .order(sort, { ascending: dir === "asc" });
      if (search) query = query.ilike("nom", `%${search}%`);
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return res.json(formatResponse({ success: true, data, total: count }));
    }

    // POST
    if (req.method === "POST") {
      validateTransporteur(req.body);
      const { nom, type, site_web, notes, pays } = req.body;
      const { data: newT, error } = await supabase.from("transporteurs").insert([{ nom, type, site_web, notes }]).select();
      if (error) throw error;

      const transporteur_id = newT[0].id;
      const tpRows = pays.map(pid => ({ transporteur_id, pays_id: pid }));
      const { error: tpError } = await supabase.from("transporteurs_pays").insert(tpRows);
      if (tpError) throw tpError;

      return res.json(formatResponse({ success: true, data: newT[0] }));
    }

    // PUT
    if (req.method === "PUT") {
      validateTransporteur(req.body);
      const { id, nom, type, site_web, notes, pays } = req.body;
      if (!id) return res.status(400).json(formatResponse({ success: false, error: "ID manquant" }));

      const { error } = await supabase.from("transporteurs").update({ nom, type, site_web, notes, updated_at: new Date() }).eq("id", id);
      if (error) throw error;

      await supabase.from("transporteurs_pays").delete().eq("transporteur_id", id);
      const tpRows = pays.map(pid => ({ transporteur_id: id, pays_id: pid }));
      const { error: tpError } = await supabase.from("transporteurs_pays").insert(tpRows);
      if (tpError) throw tpError;

      return res.json(formatResponse({ success: true }));
    }

    // DELETE
    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) return res.status(400).json(formatResponse({ success: false, error: "ID manquant" }));

      await supabase.from("transporteurs_pays").delete().eq("transporteur_id", id);
      await supabase.from("transporteurs").delete().eq("id", id);
      return res.json(formatResponse({ success: true }));
    }

    return res.status(405).json(formatResponse({ success: false, error: "Méthode non autorisée" }));
  } catch (e) {
    console.error(e);
    return res.status(500).json(formatResponse({ success: false, error: e.message }));
  }
}