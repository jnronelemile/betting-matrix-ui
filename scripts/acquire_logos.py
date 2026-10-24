#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
TITANIUM WEB — WEB-001 | Acquisition & Validation des Logos (Clubs & Compétitions)
Couvre les 29 ligues opérationnelles de TITANIUM (516 clubs + 29 compétitions).
Génère public/logos/manifest.json et src/data/teamLogosRegistry.json.
"""

import os
import sys
import json
import time
import re
import unicodedata
import hashlib
import urllib.request
import concurrent.futures
from PIL import Image
import io

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_PATH = "/home/neldrox/.gemini/antigravity-cli/brain/d928cc02-e6e1-4b05-b730-3a06ce72247b/scratch/complete_clubs_catalog.json"
TEAMS_DIR = os.path.join(PROJECT_ROOT, "public", "logos", "teams")
LEAGUES_DIR = os.path.join(PROJECT_ROOT, "public", "logos", "leagues")
MANIFEST_PATH = os.path.join(PROJECT_ROOT, "public", "logos", "manifest.json")
REGISTRY_PATH = os.path.join(PROJECT_ROOT, "src", "data", "teamLogosRegistry.json")

os.makedirs(TEAMS_DIR, exist_ok=True)
os.makedirs(LEAGUES_DIR, exist_ok=True)
os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)

# 29 Ligues Opérationnelles TITANIUM (Exclut Liga Profesional / ID 305 conformément aux audits R2B)
OPERATIONAL_LEAGUES_META = {
    "PremierLeague": {"code": "PL", "titanium_id": 47, "fotmob_id": 47, "name": "Premier League", "country": "ENG"},
    "LaLiga": {"code": "LIGA", "titanium_id": 87, "fotmob_id": 87, "name": "La Liga", "country": "ESP"},
    "SerieA": {"code": "SERIEA", "titanium_id": 55, "fotmob_id": 55, "name": "Serie A", "country": "ITA"},
    "Ligue1": {"code": "LIG1", "titanium_id": 53, "fotmob_id": 53, "name": "Ligue 1", "country": "FRA"},
    "Bundesliga": {"code": "BUND", "titanium_id": 54, "fotmob_id": 54, "name": "Bundesliga", "country": "GER"},
    "LigaPortugal": {"code": "POR1", "titanium_id": 61, "fotmob_id": 61, "name": "Liga Portugal", "country": "POR"},
    "Eredivisie": {"code": "EDV", "titanium_id": 57, "fotmob_id": 57, "name": "Eredivisie", "country": "NED"},
    "Championship": {"code": "CHAM", "titanium_id": 101, "fotmob_id": 48, "name": "Championship", "country": "ENG"},
    "2Bundesliga": {"code": "BUND2", "titanium_id": 102, "fotmob_id": 146, "name": "2. Bundesliga", "country": "GER"},
    "SerieB": {"code": "SERIEB", "titanium_id": 103, "fotmob_id": 86, "name": "Serie B", "country": "ITA"},
    "LaLiga2": {"code": "LIGA2", "titanium_id": 104, "fotmob_id": 140, "name": "LaLiga2", "country": "ESP"},
    "Ligue2": {"code": "LIG2", "titanium_id": 105, "fotmob_id": 110, "name": "Ligue 2", "country": "FRA"},
    "ScottishPremiership": {"code": "PREM", "titanium_id": 201, "fotmob_id": 64, "name": "Scottish Premiership", "country": "SCO"},
    "SperLig": {"code": "TUR1", "titanium_id": 202, "fotmob_id": 71, "name": "Süper Lig", "country": "TUR"},
    "RussianPremierLeague": {"code": "RUS1", "titanium_id": 203, "fotmob_id": 63, "name": "Russian Premier League", "country": "RUS"},
    "BelgianProLeague": {"code": "BEL1", "titanium_id": 204, "fotmob_id": 40, "name": "Belgian Pro League", "country": "BEL"},
    "SwissSuperLeague": {"code": "SUI1", "titanium_id": 205, "fotmob_id": 69, "name": "Swiss Super League", "country": "SUI"},
    "AustrianBundesliga": {"code": "AUT1", "titanium_id": 206, "fotmob_id": 38, "name": "Austrian Bundesliga", "country": "AUT"},
    "SuperLeagueGreece": {"code": "GRE1", "titanium_id": 207, "fotmob_id": 135, "name": "Super League Greece", "country": "GRE"},
    "Ekstraklasa": {"code": "POL1", "titanium_id": 209, "fotmob_id": 196, "name": "Ekstraklasa", "country": "POL"},
    "Superligaen": {"code": "DEN1", "titanium_id": 211, "fotmob_id": 46, "name": "Superligaen", "country": "DEN"},
    "Eliteserien": {"code": "NOR1", "titanium_id": 301, "fotmob_id": 59, "name": "Eliteserien", "country": "NOR"},
    "Allsvenskan": {"code": "SWE1", "titanium_id": 302, "fotmob_id": 67, "name": "Allsvenskan", "country": "SWE"},
    "BrazilianSerieA": {"code": "BRA1", "titanium_id": 303, "fotmob_id": 268, "name": "Brazilian Serie A", "country": "BRA"},
    "MajorLeagueSoccer": {"code": "MLS", "titanium_id": 304, "fotmob_id": 130, "name": "Major League Soccer", "country": "USA"},
    "SaudiProLeague": {"code": "SAUDI", "titanium_id": 306, "fotmob_id": 536, "name": "Saudi Pro League", "country": "KSA"},
    "KLeague1": {"code": "KOR1", "titanium_id": 307, "fotmob_id": 9080, "name": "K League 1", "country": "KOR"},
    "J1League": {"code": "JAP1", "titanium_id": 308, "fotmob_id": 223, "name": "J1 League", "country": "JPN"},
    "LigaMX": {"code": "MEX1", "titanium_id": 230, "fotmob_id": 230, "name": "Liga MX", "country": "MEX"},
}

def clean_key(name: str) -> str:
    """Normalise un nom de club pour le registre déterministe (parité stricte avec teamDisplayNames.js)."""
    if not name:
        return ""
    import unicodedata
    import re
    s = name.lower().replace('ø', 'o').replace('æ', 'ae').replace('ß', 'ss').replace('ı', 'i').replace('ł', 'l')
    nfkd = unicodedata.normalize('NFKD', s)
    no_accents = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return re.sub(r'[^a-z0-9]', '', no_accents)

def create_default_svgs():
    """Crée les fallbacks SVG élégants pour clubs et ligues."""
    team_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <path d="M50 8 C68 8 86 16 86 36 C86 64 50 92 50 92 C50 92 14 64 14 36 C14 16 32 8 50 8 Z" fill="url(#shieldGrad)" stroke="#64748b" stroke-width="3" />
  <circle cx="50" cy="46" r="16" fill="none" stroke="#94a3b8" stroke-width="2.5" />
  <path d="M50 30 L50 62 M34 46 L66 46" stroke="#94a3b8" stroke-width="2" />
</svg>'''
    league_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="80" height="80" rx="20" fill="#0f172a" stroke="#334155" stroke-width="2" />
  <path d="M35 30 L65 30 L60 55 C60 62 55 68 50 68 C45 68 40 62 40 55 Z" fill="url(#trophyGrad)" />
  <path d="M50 68 L50 78 M40 78 L60 78" stroke="#10b981" stroke-width="3" stroke-linecap="round" />
  <path d="M35 34 C28 34 26 44 34 48" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" />
  <path d="M65 34 C72 34 74 44 66 48" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" />
</svg>'''
    with open(os.path.join(TEAMS_DIR, "default.svg"), "w", encoding="utf-8") as f:
        f.write(team_svg)
    with open(os.path.join(LEAGUES_DIR, "default.svg"), "w", encoding="utf-8") as f:
        f.write(league_svg)
    print("✅ Fallbacks SVG créés dans public/logos/teams/ et public/logos/leagues/")

def download_image(url, dest_path, timeout=10):
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        with open(dest_path, "rb") as f:
            return f.read()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP {resp.status}")
        content = resp.read()
        with open(dest_path, "wb") as f:
            f.write(content)
        return content

def verify_png(path):
    with Image.open(path) as img:
        img.verify()
    with Image.open(path) as img:
        dim = img.size
        mode = img.mode
        has_alpha = ("A" in img.getbands()) or (mode == "P" and "transparency" in img.info)
    return dim, mode, has_alpha

def main():
    print("🚀 Début de l'acquisition des logos pour TITANIUM WEB (29 Ligues, 516 Clubs)...")

    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    create_default_svgs()

    manifest_clubs = []
    manifest_leagues = []
    registry_teams = {}
    registry_name_to_id = {}
    registry_compound_to_id = {}
    registry_leagues = {}

    # 1. Traitement des Ligues (29 ligues)
    print("\n📦 Téléchargement des 29 logos de championnats...")
    for lkey, meta in OPERATIONAL_LEAGUES_META.items():
        fotmob_id = meta["fotmob_id"]
        titanium_id = meta["titanium_id"]
        code = meta["code"]
        name = meta["name"]

        # Logo light
        light_url = f"https://images.fotmob.com/image_resources/logo/leaguelogo/{fotmob_id}.png"
        light_filename = f"{fotmob_id}.png"
        light_path = os.path.join(LEAGUES_DIR, light_filename)

        # Logo dark
        dark_url = f"https://images.fotmob.com/image_resources/logo/leaguelogo/dark/{fotmob_id}.png"
        dark_filename = f"{fotmob_id}_dark.png"
        dark_path = os.path.join(LEAGUES_DIR, dark_filename)

        try:
            content = download_image(light_url, light_path)
            dim, mode, alpha = verify_png(light_path)
            sha256 = hashlib.sha256(content).hexdigest()
            status_light = "OK"
        except Exception as e:
            status_light = f"ERROR: {e}"
            dim, mode, alpha, sha256 = (0, 0), "UNKNOWN", False, ""

        has_dark = False
        try:
            dark_content = download_image(dark_url, dark_path)
            verify_png(dark_path)
            has_dark = True
        except Exception:
            # Fallback direct au logo light
            has_dark = False

        manifest_entry = {
            "name": name,
            "league_key": lkey,
            "competition_code": code,
            "titanium_league_id": titanium_id,
            "fotmob_league_id": fotmob_id,
            "file_light": f"/logos/leagues/{light_filename}",
            "file_dark": f"/logos/leagues/{dark_filename}" if has_dark else f"/logos/leagues/{light_filename}",
            "dimensions": f"{dim[0]}x{dim[1]}",
            "file_size": len(content) if status_light == "OK" else 0,
            "sha256": sha256,
            "source_url": light_url,
            "status": status_light
        }
        manifest_leagues.append(manifest_entry)

        league_reg_data = {
            "name": name,
            "code": code,
            "titanium_id": titanium_id,
            "fotmob_id": fotmob_id,
            "logo": f"/logos/leagues/{light_filename}",
            "logoDark": f"/logos/leagues/{dark_filename}" if has_dark else f"/logos/leagues/{light_filename}",
            "country": meta["country"]
        }
        # Multi-indexation pour résolution ultra-rapide
        for alias in [lkey, code, name, str(titanium_id), str(fotmob_id), clean_key(lkey), clean_key(name), clean_key(code)]:
            if alias:
                registry_leagues[alias] = league_reg_data
                registry_leagues[alias.upper()] = league_reg_data
                registry_leagues[alias.lower()] = league_reg_data

        # Cas spécifiques pour ligues avec ponctuations ou caractères spéciaux
        if lkey == "2Bundesliga" or code == "BUND2":
            for extra in ["2.Bundesliga", "2. Bundesliga", "2Bundesliga", "2bundesliga", "bundesliga2"]:
                registry_leagues[extra] = league_reg_data
                registry_leagues[extra.lower()] = league_reg_data
                registry_leagues[extra.upper()] = league_reg_data
        elif lkey == "SperLig" or code == "TUR1":
            for extra in ["SüperLig", "Süper Lig", "SuperLig", "Super Lig", "SperLig", "sperlig", "superlig"]:
                registry_leagues[extra] = league_reg_data
                registry_leagues[extra.lower()] = league_reg_data
                registry_leagues[extra.upper()] = league_reg_data

    print(f"✅ {len(manifest_leagues)} logos de ligues traités.")

    # 2. Traitement des 516 Clubs
    print("\n📦 Téléchargement des 516 écussons de clubs...")
    clubs_to_fetch = []
    for lkey, meta in OPERATIONAL_LEAGUES_META.items():
        if lkey not in catalog:
            print(f"⚠️ Ligue absente du catalogue : {lkey}")
            continue
        teams = catalog[lkey]["teams"]
        for t in teams:
            clubs_to_fetch.append((lkey, meta, t))

    print(f"Total clubs dans le catalogue opérationnel : {len(clubs_to_fetch)}")

    def fetch_club_logo(item):
        lkey, meta, t = item
        tid = t["team_id"]
        tname = t["team_name"]
        pos = t.get("position", 0)
        url = f"https://images.fotmob.com/image_resources/logo/teamlogo/{tid}.png"
        filename = f"{tid}.png"
        dest_path = os.path.join(TEAMS_DIR, filename)

        try:
            content = download_image(url, dest_path)
            dim, mode, alpha = verify_png(dest_path)
            sha256 = hashlib.sha256(content).hexdigest()
            status = "OK"
            size = len(content)
        except Exception as e:
            status = f"ERROR: {e}"
            dim, mode, alpha, sha256, size = (0, 0), "UNKNOWN", False, "", 0

        return {
            "team_id": tid,
            "team_name": tname,
            "league_key": lkey,
            "competition_code": meta["code"],
            "league_name": meta["name"],
            "titanium_league_id": meta["titanium_id"],
            "fotmob_league_id": meta["fotmob_id"],
            "position": pos,
            "file": f"/logos/teams/{filename}",
            "dimensions": f"{dim[0]}x{dim[1]}",
            "mode": mode,
            "has_alpha": alpha,
            "file_size": size,
            "sha256": sha256,
            "source_url": url,
            "status": status
        }

    start_time = time.time()
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=14) as executor:
        results = list(executor.map(fetch_club_logo, clubs_to_fetch))
    elapsed = time.time() - start_time
    print(f"Téléchargement et vérification terminés en {elapsed:.1f}s.")

    # Détection des doublons ou anomalies
    hashes = {}
    success_count = 0
    for r in results:
        manifest_clubs.append(r)
        if r["status"] == "OK":
            success_count += 1
            h = r["sha256"]
            if h in hashes:
                print(f"⚠️ Attention : Hash identique pour {r['team_name']} ({r['team_id']}) et {hashes[h]['team_name']} ({hashes[h]['team_id']})")
            else:
                hashes[h] = r

            # Peuplement du registre
            tid_str = str(r["team_id"])
            registry_teams[tid_str] = {
                "id": r["team_id"],
                "name": r["team_name"],
                "league": r["league_key"],
                "leagueCode": r["competition_code"],
                "logo": r["file"]
            }
            # Clés normalisées
            ck = clean_key(r["team_name"])
            registry_name_to_id[ck] = r["team_id"]
            # Clé composée (league:clean_name) pour garantie absolue de désambiguïsation
            compound_key = f"{r['league_key'].lower()}:{ck}"
            registry_compound_to_id[compound_key] = r["team_id"]
            compound_code_key = f"{r['competition_code'].lower()}:{ck}"
            registry_compound_to_id[compound_code_key] = r["team_id"]

            # Clé coeur nettoyée des affixes standards (fc, cf, calcio, etc.)
            affixes = {'fc', 'cf', 'sc', 'fk', 'ac', 'rc', 'afc', 'if', 'ff', 'sv', 'de', 'la', 'el', 'club', 'calcio', 'cfc', 'ssc', 'as', 'us', 'uanl', 'unam'}
            tokens = [t for t in re.sub(r'[^a-z0-9\s]', ' ', r["team_name"].lower()).split() if t not in affixes]
            core_ck = "".join(tokens)
            if core_ck and core_ck != ck:
                if core_ck not in registry_name_to_id:
                    registry_name_to_id[core_ck] = r["team_id"]
                registry_compound_to_id[f"{r['league_key'].lower()}:{core_ck}"] = r["team_id"]
                registry_compound_to_id[f"{r['competition_code'].lower()}:{core_ck}"] = r["team_id"]

    # Table des alias reconnus pour les variantes de libellés rencontrées dans les tickets/sélections
    EXTRA_ALIASES = {
        # --- 2. BUNDESLIGA ---
        ('2bundesliga', '1. fc heidenheim'): 94937,
        ('2bundesliga', 'fc heidenheim'): 94937,
        ('2bundesliga', 'heidenheim'): 94937,
        ('2bundesliga', '1. fc nürnberg'): 8165,
        ('2bundesliga', 'nürnberg'): 8165,
        ('2bundesliga', 'nuernberg'): 8165,
        ('2bundesliga', 'sv darmstadt 98'): 8262,
        ('2bundesliga', 'darmstadt'): 8262,
        ('2bundesliga', 'vfl bochum'): 9911,
        ('2bundesliga', 'bochum'): 9911,
        ('2bundesliga', 'vfl wolfsburg'): 8721,
        ('2bundesliga', 'wolfsburg'): 8721,
        ('2bundesliga', 'arminia bielefeld'): 9912,
        ('2bundesliga', 'vfl osnabrück'): 9775,
        ('2bundesliga', 'vfl osnabruck'): 9775,
        ('2bundesliga', 'hannover 96'): 9904,
        ('2bundesliga', 'fc st. pauli'): 8152,
        ('2bundesliga', 'st. pauli'): 8152,
        ('2bundesliga', 'st pauli'): 8152,

        # --- LIGUE 1 ---
        ('ligue1', 'aj auxerre'): 8583,
        ('ligue1', 'auxerre'): 8583,
        ('ligue1', 'stade rennais'): 9851,
        ('ligue1', 'rennes'): 9851,
        ('ligue1', 'lille osc'): 8639,
        ('ligue1', 'lille'): 8639,
        ('ligue1', 'ogc nice'): 9831,
        ('ligue1', 'nice'): 9831,
        ('ligue1', 'olympique de marseille'): 8592,
        ('ligue1', 'olympique marseille'): 8592,
        ('ligue1', 'marseille'): 8592,
        ('ligue1', 'olympique lyonnais'): 9748,
        ('ligue1', 'lyon'): 9748,
        ('ligue1', 'angers sco'): 8121,
        ('ligue1', 'angers'): 8121,
        ('ligue1', 'stade brestois 29'): 8521,
        ('ligue1', 'brest'): 8521,
        ('ligue1', 'estac troyes'): 10242,
        ('ligue1', 'troyes'): 10242,
        ('ligue1', 'rc strasbourg'): 9848,
        ('ligue1', 'strasbourg'): 9848,
        ('ligue1', 'rc lens'): 8588,
        ('ligue1', 'lens'): 8588,
        ('ligue1', 'paris saint-germain'): 9847,
        ('ligue1', 'psg'): 9847,

        # --- LIGUE 2 ---
        ('ligue2', 'as nancy lorraine'): 8481,
        ('ligue2', 'nancy'): 8481,
        ('ligue2', 'dijon fco'): 9836,
        ('ligue2', 'dijon'): 9836,
        ('ligue2', 'ea guingamp'): 9747,
        ('ligue2', 'guingamp'): 9747,
        ('ligue2', 'grenoble foot 38'): 9855,
        ('ligue2', 'grenoble'): 9855,
        ('ligue2', 'stade lavallois'): 7853,
        ('ligue2', 'laval'): 7853,
        ('ligue2', 'stade de reims'): 9837,
        ('ligue2', 'reims'): 9837,
        ('ligue2', 'rodez af'): 4120,
        ('ligue2', 'rodez'): 4120,
        ('ligue2', 'as saint-etienne'): 9853,
        ('ligue2', 'saint-etienne'): 9853,
        ('ligue2', 'montpellier hsc'): 10249,
        ('ligue2', 'montpellier'): 10249,
        ('ligue2', 'red star fc'): 6390,
        ('ligue2', 'red star'): 6390,

        # --- LALIGA ---
        ('laliga', 'ca osasuna'): 8371,
        ('laliga', 'osasuna'): 8371,
        ('laliga', 'deportivo la coruña'): 9783,
        ('laliga', 'deportivo a coruña'): 9783,
        ('laliga', 'deportivo la coruna'): 9783,
        ('laliga', 'rcd espanyol'): 8558,
        ('laliga', 'espanyol'): 8558,
        ('laliga', 'levante ud'): 8581,
        ('laliga', 'levante'): 8581,
        ('laliga', 'málaga cf'): 9864,
        ('laliga', 'málaga'): 9864,
        ('laliga', 'malaga'): 9864,
        ('laliga', 'real betis'): 8603,
        ('laliga', 'betis'): 8603,
        ('laliga', 'athletic club'): 8315,
        ('laliga', 'athletic bilbao'): 8315,
        ('laliga', 'atletico madrid'): 9906,
        ('laliga', 'atlético madrid'): 9906,
        ('laliga', 'fc barcelona'): 8634,
        ('laliga', 'barcelona'): 8634,

        # --- LALIGA 2 ---
        ('laliga2', 'cd castellón'): 10279,
        ('laliga2', 'cd castellon'): 10279,
        ('laliga2', 'castellón'): 10279,
        ('laliga2', 'castellon'): 10279,
        ('laliga2', 'rcd mallorca'): 8661,
        ('laliga2', 'mallorca'): 8661,
        ('laliga2', 'ud almería'): 9865,
        ('laliga2', 'ud almeria'): 9865,
        ('laliga2', 'almería'): 9865,
        ('laliga2', 'almeria'): 9865,
        ('laliga2', 'cd tenerife'): 9867,
        ('laliga2', 'tenerife'): 9867,
        ('laliga2', 'cd leganes'): 7854,
        ('laliga2', 'cd leganés'): 7854,
        ('laliga2', 'leganés'): 7854,
        ('laliga2', 'leganes'): 7854,
        ('laliga2', 'córdoba cf'): 7869,
        ('laliga2', 'cordoba cf'): 7869,
        ('laliga2', 'córdoba'): 7869,
        ('laliga2', 'cordoba'): 7869,
        ('laliga2', 'sporting gijón'): 9869,
        ('laliga2', 'sporting gijon'): 9869,
        ('laliga2', 'ud las palmas'): 8306,
        ('laliga2', 'las palmas'): 8306,
        ('laliga2', 'girona fc'): 7732,
        ('laliga2', 'girona'): 7732,
        ('laliga2', 'granada cf'): 7878,
        ('laliga2', 'granada'): 7878,

        # --- LIGA PORTUGAL ---
        ('ligaportugal', 'estoril praia'): 7842,
        ('por1', 'estoril praia'): 7842,
        ('ligaportugal', 'cd nacional'): 10214,
        ('por1', 'cd nacional'): 10214,
        ('ligaportugal', 'cd santa clara'): 1567,
        ('por1', 'cd santa clara'): 1567,
        ('ligaportugal', 'sl benfica'): 9772,
        ('por1', 'sl benfica'): 9772,

        # --- SERIE A ---
        ('seriea', 'parma calcio 1913'): 10167,
        ('seriea', 'parma'): 10167,
        ('seriea', 'inter milan'): 8636,
        ('seriea', 'inter'): 8636,
        ('seriea', 'ac milan'): 8564,
        ('seriea', 'milan'): 8564,
        ('seriea', 'ss lazio'): 8543,
        ('seriea', 'lazio'): 8543,
        ('seriea', 'as roma'): 8686,
        ('seriea', 'roma'): 8686,
        ('seriea', 'atalanta bc'): 8524,
        ('seriea', 'atalanta'): 8524,
        ('seriea', 'bologna fc'): 9857,
        ('seriea', 'bologna'): 9857,
        ('seriea', 'cagliari calcio'): 8529,
        ('seriea', 'cagliari'): 8529,
        ('seriea', 'genoa cfc'): 10233,
        ('seriea', 'genoa'): 10233,
        ('seriea', 'como 1907'): 10171,
        ('seriea', 'como'): 10171,

        # --- SERIE B ---
        ('serieb', 'fc südtirol'): 189475,
        ('serieb', 'fc sudtirol'): 189475,
        ('serieb', 'südtirol'): 189475,
        ('serieb', 'sudtirol'): 189475,

        # --- ALLSVENSKAN ---
        ('allsvenskan', 'aik solna'): 8349,
        ('allsvenskan', 'aik'): 8349,
        ('allsvenskan', 'halmstads bk'): 8310,
        ('allsvenskan', 'halmstad'): 8310,
        ('allsvenskan', 'västerås sk'): 6194,
        ('allsvenskan', 'västerås'): 6194,
        ('allsvenskan', 'vasteras'): 6194,

        # --- RUSSIAN PREMIER LEAGUE ---
        ('russianpremierleague', 'dinamo moscow'): 9763,
        ('russianpremierleague', 'dynamo moscow'): 9763,
        ('russianpremierleague', 'cska moscow'): 9760,
        ('russianpremierleague', 'zenit st. petersburg'): 8698,
        ('russianpremierleague', 'zenit'): 8698,
        ('russianpremierleague', 'fc krasnodar'): 168719,
        ('russianpremierleague', 'krasnodar'): 168719,
        ('russianpremierleague', 'spartak moscow'): 8643,
        ('russianpremierleague', 'rubin kazan'): 8683,
        ('russianpremierleague', 'rubin'): 8683,
        ('russianpremierleague', 'fc orenburg'): 132286,
        ('russianpremierleague', 'orenburg'): 132286,
        ('russianpremierleague', 'baltika kaliningrad'): 49694,
        ('russianpremierleague', 'baltika'): 49694,
        ('russianpremierleague', 'dynamo makhachkala'): 1068353,
        ('russianpremierleague', 'krylya sovetov samara'): 8709,
        ('russianpremierleague', 'krylya sovetov'): 8709,
        ('russianpremierleague', 'fk akhmat'): 8708,
        ('russianpremierleague', 'akhmat grozny'): 8708,
        ('russianpremierleague', 'akhmat'): 8708,
        ('russianpremierleague', 'fc rostov'): 8705,
        ('russianpremierleague', 'rostov'): 8705,
        ('russianpremierleague', 'lokomotiv moscow'): 8710,
        ('russianpremierleague', 'akron togliatti'): 1068364,
        ('russianpremierleague', 'rodina'): 1066681,
        ('russianpremierleague', 'fakel voronezh'): 1692,
        ('russianpremierleague', 'fakel'): 1692,

        # --- MAJOR LEAGUE SOCCER ---
        ('majorleaguesoccer', 'inter miami cf'): 960720,
        ('majorleaguesoccer', 'inter miami'): 960720,
        ('majorleaguesoccer', 'fc dallas'): 6399,
        ('majorleaguesoccer', 'dallas'): 6399,
        ('majorleaguesoccer', 'san jose earthquakes'): 6603,
        ('majorleaguesoccer', 'earthquakes'): 6603,
        ('majorleaguesoccer', 'houston dynamo fc'): 8259,
        ('majorleaguesoccer', 'houston dynamo'): 8259,
        ('majorleaguesoccer', 'los angeles fc'): 867280,
        ('majorleaguesoccer', 'lafc'): 867280,
        ('majorleaguesoccer', 'fc cincinnati'): 722265,
        ('majorleaguesoccer', 'cincinnati'): 722265,
        ('majorleaguesoccer', 'new york city fc'): 546238,
        ('majorleaguesoccer', 'nycfc'): 546238,
        ('majorleaguesoccer', 'cf montréal'): 161195,
        ('majorleaguesoccer', 'cf montreal'): 161195,
        ('majorleaguesoccer', 'montreal'): 161195,
        ('majorleaguesoccer', 'chicago fire fc'): 6397,
        ('majorleaguesoccer', 'chicago fire'): 6397,
        ('majorleaguesoccer', 'seattle sounders fc'): 130394,
        ('majorleaguesoccer', 'seattle sounders'): 130394,
        ('majorleaguesoccer', 'red bull new york'): 6514,
        ('majorleaguesoccer', 'new york red bulls'): 6514,
        ('majorleaguesoccer', 'sporting kc'): 6604,
        ('majorleaguesoccer', 'sporting kansas city'): 6604,
        ('majorleaguesoccer', 'nashville sc'): 915807,
        ('majorleaguesoccer', 'vancouver whitecaps'): 307691,
        ('majorleaguesoccer', 'st. louis city'): 1427963,
        ('majorleaguesoccer', 'new england revolution'): 6580,
        ('majorleaguesoccer', 'charlotte fc'): 1323940,
        ('majorleaguesoccer', 'philadelphia union'): 191716,
        ('majorleaguesoccer', 'la galaxy'): 6637,
        ('majorleaguesoccer', 'colorado rapids'): 8314,
        ('majorleaguesoccer', 'orlando city'): 267810,
        ('majorleaguesoccer', 'portland timbers'): 307690,
        ('majorleaguesoccer', 'real salt lake'): 6606,
        ('majorleaguesoccer', 'san diego fc'): 1701119,
        ('majorleaguesoccer', 'toronto fc'): 56453,
        ('majorleaguesoccer', 'dc united'): 6602,
        ('majorleaguesoccer', 'columbus crew'): 6001,
        ('majorleaguesoccer', 'minnesota united'): 207242,
        ('majorleaguesoccer', 'austin fc'): 1218886,
        ('majorleaguesoccer', 'atlanta united'): 773958,

        # --- SÜPER LIG ---
        ('sperlig', 'kasimpasa'): 4685,
        ('sperlig', 'kasımpaşa'): 4685,
        ('sperlig', 'istanbul basaksehir'): 1933,
        ('sperlig', 'istanbul başakşehir'): 1933,
        ('sperlig', 'başakşehir'): 1933,
        ('sperlig', 'basaksehir'): 1933,
        ('sperlig', 'fenerbahce'): 8695,
        ('sperlig', 'alanyaspor'): 4678,
        ('sperlig', 'gaziantep fk'): 4081,
        ('sperlig', 'besiktas'): 10188,
        ('sperlig', 'galatasaray'): 8637,
        ('sperlig', 'trabzonspor'): 9752,
        ('superlig', 'kasimpasa'): 4685,
        ('superlig', 'kasımpaşa'): 4685,
        ('superlig', 'istanbul basaksehir'): 1933,
        ('superlig', 'istanbul başakşehir'): 1933,
        ('superlig', 'başakşehir'): 1933,
        ('superlig', 'basaksehir'): 1933,
        ('superlig', 'fenerbahce'): 8695,
        ('superlig', 'alanyaspor'): 4678,
        ('superlig', 'gaziantep fk'): 4081,
        ('superlig', 'besiktas'): 10188,
        ('superlig', 'galatasaray'): 8637,
        ('superlig', 'trabzonspor'): 9752,

        # --- BRAZILIAN SERIE A ---
        ('brazilianseriea', 'bragantino'): 109705,
        ('brazilianseriea', 'rb bragantino'): 109705,
        ('brazilianseriea', 'red bull bragantino'): 109705,
        ('brazilianseriea', 'atlético mineiro'): 10272,
        ('brazilianseriea', 'atletico mineiro'): 10272,
        ('brazilianseriea', 'atletico mg'): 10272,
        ('brazilianseriea', 'athletico-pr'): 10273,
        ('brazilianseriea', 'athletico pr'): 10273,
        ('brazilianseriea', 'athletico paranaense'): 10273,
        ('brazilianseriea', 'ec vitória'): 7733,
        ('brazilianseriea', 'ec vitoria'): 7733,
        ('brazilianseriea', 'vitória'): 7733,
        ('brazilianseriea', 'santos fc'): 8514,
        ('brazilianseriea', 'santos'): 8514,

        # --- EREDIVISIE ---
        ('eredivisie', 'excelsior rotterdam'): 10218,
        ('eredivisie', 'excelsior'): 10218,
        ('eredivisie', 'feyenoord rotterdam'): 10235,
        ('eredivisie', 'feyenoord'): 10235,
        ('eredivisie', 'afc ajax'): 8593,
        ('eredivisie', 'ajax'): 8593,

        # --- ELITESERIEN ---
        ('eliteserien', 'hamkam'): 8448,
        ('eliteserien', 'hamarkameratene'): 8448,
        ('eliteserien', 'sarpsborg 08'): 8509,
        ('eliteserien', 'sarpsborg'): 8509,

        # --- SUPERLIGAEN ---
        ('superligaen', 'odense boldklub'): 8414,
        ('superligaen', 'ob'): 8414,
        ('superligaen', 'fc copenhagen'): 8391,
        ('superligaen', 'copenhagen'): 8391,

        # --- AUSTRIAN BUNDESLIGA ---
        ('austrianbundesliga', 'lask linz'): 9977,
        ('austrianbundesliga', 'lask'): 9977,

        # --- K LEAGUE 1 ---
        ('kleague1', 'bucheon fc'): 429441,
        ('kleague1', 'bucheon fc 1995'): 429441,
        ('kleague1', 'jeju united'): 133898,
        ('kleague1', 'jeju'): 133898,
        ('kleague1', 'jeju sk'): 133898,
        ('kleague1', 'jeonbuk hyundai motors'): 46038,
        ('kleague1', 'jeonbuk'): 46038,

        # --- J1 LEAGUE ---
        ('j1league', 'urawa reds'): 6244,
        ('j1league', 'urawa red diamonds'): 6244,

        # --- LIGA MX ---
        ('ligamx', 'atletico san luis'): 6358,
        ('ligamx', 'atlético de san luis'): 6358,
        ('ligamx', 'guadalajara'): 7807,
        ('ligamx', 'chivas'): 7807,
        ('ligamx', 'club america'): 6576,
        ('ligamx', 'cf américa'): 6576,
        ('ligamx', 'queretaro'): 1943,
        ('ligamx', 'querétaro fc'): 1943,
        ('ligamx', 'tigres uanl'): 8561,
        ('ligamx', 'tigres'): 8561,
        ('ligamx', 'pumas unam'): 1946,
        ('ligamx', 'pumas'): 1946
    }

    for (lg, alias_name), tid in EXTRA_ALIASES.items():
        ck_alias = clean_key(alias_name)
        if ck_alias not in registry_name_to_id:
            registry_name_to_id[ck_alias] = tid
        compound_key = f"{lg}:{ck_alias}"
        registry_compound_to_id[compound_key] = tid

    print(f"Résultat clubs : {success_count} / {len(results)} écussons validés.")

    # 3. Export du Manifeste
    manifest = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "perimeter": "TITANIUM_OPERATIONAL_29_DOMESTIC_LEAGUES",
        "total_leagues": len(manifest_leagues),
        "total_clubs": len(manifest_clubs),
        "successful_clubs": success_count,
        "clubs": manifest_clubs,
        "leagues": manifest_leagues
    }
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"✅ Manifeste sauvegardé dans {MANIFEST_PATH}")

    # 4. Export du Registre Frontend Déterministe
    registry = {
        "_version": "1.0.0",
        "teamsById": registry_teams,
        "teamNameToId": registry_name_to_id,
        "compoundKeyToId": registry_compound_to_id,
        "leagues": registry_leagues,
        "defaultTeamLogo": "/logos/teams/default.svg",
        "defaultLeagueLogo": "/logos/leagues/default.svg"
    }
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2, ensure_ascii=False)
    print(f"✅ Registre frontend exporté dans {REGISTRY_PATH}")

if __name__ == "__main__":
    main()
