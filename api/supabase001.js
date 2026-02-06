import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default async function handler(req, res) {

  // 🔹 LISTER LES MOTS
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('mots')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(data)
  }

  // 🔹 AJOUTER UN MOT
  if (req.method === 'POST') {
    const { mot } = req.body

    if (!mot) {
      return res.status(400).json({ error: "Mot manquant" })
    }

    const { data, error } = await supabase
      .from('mots')
      .insert([{ mot }])
      .select()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(data[0])
  }

  res.status(405).json({ error: 'Méthode non autorisée' })
}