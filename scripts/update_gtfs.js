import 'dotenv/config'
import fs from "fs"
import path from "path"
import unzipper from "unzipper"
import csv from "csv-parser"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
const GTFS_URL = "https://eu.ftp.opendatasoft.com/sncf/plandata/Export_OpenData_SNCF_GTFS_NewTripId.zip"
const TEMP_DIR = path.join(process.cwd(), "gtfs_temp")
const CHUNK_SIZE = 1000
const RETRY_LIMIT = 5
const PAUSE_MS = 200

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function downloadGTFS(url, dest) {
  console.log("Téléchargement GTFS...")
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Erreur téléchargement : ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buffer)
  console.log("Téléchargement terminé :", dest)
}

async function unzipGTFS(zipPath, outDir) {
  console.log("Décompression...")
  await fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: outDir })).promise()
  console.log("Décompression terminée")
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const rows = []
    fs.createReadStream(file).pipe(csv())
      .on("data", row => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject)
  })
}

function cleanData(rows, schema) {
  return rows.map(row => {
    const cleaned = {}
    for (const key in row) {
      let value = row[key]
      if (value === "" || value === undefined) { cleaned[key] = null; continue }
      if (schema[key] === "int") { const v = parseInt(value); cleaned[key] = isNaN(v) ? null : v }
      else if (schema[key] === "float") { const v = parseFloat(value); cleaned[key] = isNaN(v) ? null : v }
      else { cleaned[key] = value }
    }
    return cleaned
  })
}

async function upsertChunk(table, rows, conflict) {
  const total = rows.length
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    let retry = 0
    while (retry < RETRY_LIMIT) {
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflict })
      if (!error) break
      retry++
      console.log(`Retry ${retry}/${RETRY_LIMIT} sur ${table}`)
      await sleep(1000)
      if (retry === RETRY_LIMIT) { console.error("Erreur Supabase :", error); throw error }
    }
    console.log(`${table} : ${Math.min(i + CHUNK_SIZE, total)}/${total}`)
    await sleep(PAUSE_MS)
  }
}

async function main() {
  try {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR)
    const zipPath = path.join(TEMP_DIR, "gtfs.zip")
    await downloadGTFS(GTFS_URL, zipPath)
    await unzipGTFS(zipPath, TEMP_DIR)

    console.log("Parsing CSV...")
    const agency = await parseCSV(path.join(TEMP_DIR, "agency.txt"))
    const stops = await parseCSV(path.join(TEMP_DIR, "stops.txt"))
    const routes = await parseCSV(path.join(TEMP_DIR, "routes.txt"))
    const trips = await parseCSV(path.join(TEMP_DIR, "trips.txt"))
    const stopTimes = await parseCSV(path.join(TEMP_DIR, "stop_times.txt"))
    const calendarDates = await parseCSV(path.join(TEMP_DIR, "calendar_dates.txt"))

    const stopsClean = cleanData(stops, { stop_lat: "float", stop_lon: "float" })
    const routesClean = cleanData(routes, { route_type: "int" })
    const tripsClean = cleanData(trips, { direction_id: "int" })
    const stopTimesClean = cleanData(stopTimes, { stop_sequence: "int" })
    const calendarClean = cleanData(calendarDates, { exception_type: "int" })

    // ---------------- INSERTIONS ----------------
    await upsertChunk("agency", agency, "agency_id")
    await upsertChunk("stops", stopsClean, "stop_id")
    await upsertChunk("routes", routesClean, "route_id")

    // Créer tous les service_id avant trips / calendar_dates
    const serviceIds = [
      ...new Set([
        ...tripsClean.map(t => t.service_id).filter(Boolean),
        ...calendarClean.map(c => c.service_id).filter(Boolean)
      ])
    ]
    const { data: existingServices } = await supabase
      .from("services").select("service_id").in("service_id", serviceIds)
    const existing = new Set((existingServices || []).map(s => s.service_id))
    const missing = serviceIds.filter(id => !existing.has(id)).map(id => ({ service_id: id }))
    if (missing.length) {
      console.log("Création services manquants :", missing.length)
      await upsertChunk("services", missing, "service_id")
    }

    // trips après services
    await upsertChunk("trips", tripsClean, "trip_id")

    // calendar_dates après services et trips
    await upsertChunk("calendar_dates", calendarClean, "service_id,date")

    // stop_times après trips et stops
    console.log("Import stop_times (peut prendre plusieurs minutes)...")
    await upsertChunk("stop_times", stopTimesClean, "trip_id,stop_sequence")

    console.log("GTFS import terminé")
    fs.rmSync(TEMP_DIR, { recursive: true, force: true })
    console.log("Temp supprimé")

  } catch (err) {
    console.error("Erreur update GTFS :", err)
  }
}

main()