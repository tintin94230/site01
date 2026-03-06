import json

features = []

def hub(name, lon, lat):
    return {
        "type": "Feature",
        "properties": {
            "type": "hub",
            "name": name
        },
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        }
    }

def corridor(name, coords):
    return {
        "type": "Feature",
        "properties": {
            "type": "corridor",
            "name": name
        },
        "geometry": {
            "type": "LineString",
            "coordinates": coords
        }
    }

def border(name, lon, lat):
    return {
        "type": "Feature",
        "properties": {
            "type": "border_crossing",
            "name": name
        },
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        }
    }


# -----------------------
# HUBS (extrait des 180)
# -----------------------

cities = {

"Paris": (2.3522,48.8566),
"Lyon": (4.8357,45.7640),
"Marseille": (5.3698,43.2965),
"Nice": (7.2619,43.7102),
"Bordeaux": (-0.5792,44.8378),
"Toulouse": (1.4442,43.6047),
"Nantes": (-1.5536,47.2184),
"Rennes": (-1.6778,48.1173),
"Strasbourg": (7.7521,48.5734),
"Rouen": (1.0993,49.4431),
"Amiens": (2.2957,49.8941),
"Dijon": (5.0415,47.3220),
"Clermont-Ferrand": (3.0870,45.7772),

"London": (-0.1276,51.5072),
"Edinburgh": (-3.1883,55.9533),
"Brighton": (-0.1406,50.8225),
"Cardiff": (-3.1791,51.4816),
"Norwich": (1.2974,52.6309),

"Brussels": (4.3517,50.8503),
"Bruges": (3.2247,51.2093),

"Amsterdam": (4.9041,52.3676),
"Rotterdam": (4.4777,51.9244),

"Berlin": (13.4050,52.5200),
"Hamburg": (9.9937,53.5511),
"Frankfurt": (8.6821,50.1109),
"Cologne": (6.9603,50.9375),
"Munich": (11.5820,48.1351),

"Zurich": (8.5417,47.3769),
"Basel": (7.5886,47.5596),
"Bern": (7.4474,46.9480),
"Lausanne": (6.6323,46.5197),
"Geneva": (6.1432,46.2044),

"Vienna": (16.3738,48.2082),
"Salzburg": (13.0458,47.8095),
"Innsbruck": (11.4041,47.2692),

"Milan": (9.1900,45.4642),
"Venice": (12.3155,45.4408),
"Bologna": (11.3426,44.4949),
"Florence": (11.2558,43.7696),
"Rome": (12.4964,41.9028),
"Naples": (14.2681,40.8518),
"Genoa": (8.9463,44.4056),
"Bari": (16.8719,41.1171),
"Palermo": (13.3613,38.1157),
"Catania": (15.0873,37.5027),
"Messina": (15.5557,38.1938),
"Salerno": (14.7681,40.6824),

"Madrid": (-3.7038,40.4168),
"Barcelona": (2.1734,41.3851),
"Seville": (-5.9845,37.3891),
"Cordoba": (-4.7794,37.8882),
"Malaga": (-4.4214,36.7213),
"Valladolid": (-4.7286,41.6523),
"Santander": (-3.8044,43.4623),
"San Sebastian": (-1.9812,43.3183),
"Irun": (-1.7888,43.3390),

"Lisbon": (-9.1393,38.7223),
"Porto": (-8.6291,41.1579),

"Prague": (14.4378,50.0755),
"Warsaw": (21.0122,52.2297),
"Budapest": (19.0402,47.4979),

"Copenhagen": (12.5683,55.6761),
"Stockholm": (18.0686,59.3293),
"Oslo": (10.7522,59.9139),

"Athens": (23.7275,37.9838),
"Sofia": (23.3219,42.6977),
"Bucharest": (26.1025,44.4268),
"Belgrade": (20.4573,44.7872),
"Zagreb": (15.9819,45.8150),
"Split": (16.4402,43.5081),

"Luxembourg": (6.1319,49.6116)

}

for c in cities:
    lon,lat = cities[c]
    features.append(hub(c,lon,lat))

# -----------------------
# CORRIDORS MAJEURS
# -----------------------

corridors = [

("Paris-Brussels",[cities["Paris"],cities["Brussels"]]),
("Paris-Lyon",[cities["Paris"],cities["Lyon"]]),
("Lyon-Marseille",[cities["Lyon"],cities["Marseille"]]),
("Marseille-Nice",[cities["Marseille"],cities["Nice"]]),
("Paris-Bordeaux",[cities["Paris"],cities["Bordeaux"]]),
("Bordeaux-Irun",[cities["Bordeaux"],cities["Irun"]]),
("Paris-Strasbourg",[cities["Paris"],cities["Strasbourg"]]),
("Strasbourg-Munich",[cities["Strasbourg"],cities["Munich"]]),
("Munich-Vienna",[cities["Munich"],cities["Vienna"]]),
("Vienna-Budapest",[cities["Vienna"],cities["Budapest"]]),
("Milan-Rome",[cities["Milan"],cities["Rome"]]),
("Rome-Naples",[cities["Rome"],cities["Naples"]]),
("Barcelona-Marseille",[cities["Barcelona"],cities["Marseille"]]),
("Madrid-Barcelona",[cities["Madrid"],cities["Barcelona"]]),
("Berlin-Warsaw",[cities["Berlin"],cities["Warsaw"]]),
("Hamburg-Copenhagen",[cities["Hamburg"],cities["Copenhagen"]]),
("Copenhagen-Stockholm",[cities["Copenhagen"],cities["Stockholm"]]),
("Stockholm-Oslo",[cities["Stockholm"],cities["Oslo"]]),
]

for name,coords in corridors:
    features.append(corridor(name,coords))

# -----------------------
# PASSAGES FRONTIERES
# -----------------------

borders = {

"Lille-Brussels":(3.0573,50.6292),
"Strasbourg-Offenburg":(7.94,48.47),
"Mulhouse-Basel":(7.5886,47.5596),
"Menton-Ventimiglia":(7.6149,43.7912),
"Hendaye-Irun":(-1.7816,43.3713),
"Latour-Puigcerda":(1.9394,42.4590),
"Forbach-Saarbrucken":(6.9010,49.1897),
"Kehl-Strasbourg":(7.8167,48.5667),
"Wissembourg-Germany":(7.9450,49.0370),
"Basel-Bad":(7.6070,47.5670),
"Kufstein-Germany":(12.1695,47.5820),
"Salzburg-Germany":(13.0458,47.8095),
"FrankfurtOder-Slubice":(14.5506,52.3471),
"Zgorzelec-Gorlitz":(15.0070,51.1500),
"Chiasso-Como":(9.0310,45.8320),
"BrennerPass":(11.5070,47.0030)

}

for b in borders:
    lon,lat = borders[b]
    features.append(border(b,lon,lat))


geojson = {
"type":"FeatureCollection",
"features":features
}

with open("europe_rail_atlas.geojson","w") as f:
    json.dump(geojson,f,indent=2)