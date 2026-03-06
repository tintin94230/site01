import fitz
import csv
import math
import os

PDF_FILE = ("interrail_map_2026spain.pdf")
CSV_FILE = "reseau_interrail.csv"

# -----------------------------
# Fonction de couleur avec tolérance
# -----------------------------
def classify_color(rgb, tol=50):
    r, g, b = rgb
    if g > r + tol and g > b + tol:
        return "vert"
    if r > g + tol and r > b + tol:
        return "rouge"
    if b > r + tol and b > g + tol:
        return "violet"
    return None

# -----------------------------
# Charger les lignes existantes
# -----------------------------
existing_rows = set()
if os.path.exists(CSV_FILE):
    with open(CSV_FILE, newline='', encoding='utf8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            existing_rows.add((row["origine"], row["destination"], row["couleur"]))

# -----------------------------
# Ouvrir le PDF
# -----------------------------
doc = fitz.open(PDF_FILE)
page = doc[0]

# -----------------------------
# Extraire les villes
# -----------------------------
cities = []

for block in page.get_text("blocks"):
    if len(block) < 5:
        continue
    x0, y0, x1, y1, text, *rest = block
    name = text.strip().replace("\n", " ")
    if 2 < len(name) < 40:
        cities.append(((x0 + x1) / 2, (y0 + y1) / 2, name))

print(f"{len(cities)} villes détectées")

# -----------------------------
# Fonction nearest_city
# -----------------------------
def nearest_city(x, y):
    best = None
    best_dist = 1e9
    for cx, cy, name in cities:
        d = math.hypot(cx - x, cy - y)
        if d < best_dist:
            best_dist = d
            best = name
    return best

# -----------------------------
# Extraire les lignes
# -----------------------------
new_rows = set()

for drawing in page.get_drawings():
    color = drawing.get("color")
    if color is None:
        continue
    couleur = classify_color(color)
    if not couleur:
        continue
    for item in drawing["items"]:
        if item[0] == "l":
            if len(item[1]) != 4:
                continue
            x1, y1, x2, y2 = item[1]
            c1 = nearest_city(x1, y1)
            c2 = nearest_city(x2, y2)
            if c1 and c2 and c1 != c2:
                row = tuple(sorted((c1, c2))) + (couleur,)
                new_rows.add(row)

# -----------------------------
# Fusionner avec les lignes existantes
# -----------------------------
all_rows = existing_rows.union(new_rows)

# -----------------------------
# Export CSV
# -----------------------------
with open(CSV_FILE, "w", newline="", encoding="utf8") as f:
    writer = csv.writer(f)
    writer.writerow(["origine", "destination", "couleur"])
    for row in sorted(all_rows):
        writer.writerow(row)

print(f"CSV mis à jour : {CSV_FILE} ({len(all_rows)} lignes)")