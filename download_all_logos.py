import json
import urllib.request
import urllib.parse
import os
import re
from PIL import Image
from io import BytesIO

with open('public/data/matchups/Matchups_Week04-Mai.json') as f:
    matchups = json.load(f)

teams = set()
for league, matches in matchups.items():
    for match in matches:
        teams.add(match['home'])
        teams.add(match['away'])

os.makedirs('public/logos', exist_ok=True)

def normalize_filename(name):
    import unicodedata
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    return re.sub(r'[^a-zA-Z0-9]', '_', name.lower()) + '.webp'

def search_logo(team_name):
    query = urllib.parse.quote(team_name)
    url = f"https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t={query}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data and data.get('teams'):
                for t in data['teams']:
                    if t.get('strSport') == 'Soccer' and t.get('strTeamBadge'):
                        return t['strTeamBadge']
                return data['teams'][0].get('strTeamBadge')
    except Exception as e:
        pass
    return None

import time

count = 0
for team in teams:
    filename = normalize_filename(team)
    filepath = os.path.join('public/logos', filename)
    if not os.path.exists(filepath):
        logo_url = search_logo(team)
        if logo_url:
            try:
                req = urllib.request.Request(logo_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    img_data = response.read()
                    img = Image.open(BytesIO(img_data))
                    img.save(filepath, "WEBP", quality=80)
                print(f"Downloaded: {team} -> {filename}")
            except Exception as e:
                print(f"Failed to download image for {team}: {e}")
        else:
            print(f"No logo found for: {team}")
        time.sleep(0.5)
print("Finished downloading logos.")

# Create default logo
img = Image.new('RGBA', (100, 100), color=(0,0,0,0))
img.save('public/logos/default.png')
