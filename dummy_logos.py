import os
import re
import json
from PIL import Image, ImageDraw, ImageFont

def normalize_filename(name):
    import unicodedata
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    return re.sub(r'[^a-zA-Z0-9]', '_', name.lower()) + '.webp'

with open('public/data/matchups/Matchups_Week04-Mai.json') as f:
    matchups = json.load(f)

teams = set()
for league, matches in matchups.items():
    for match in matches:
        teams.add(match['home'])
        teams.add(match['away'])

os.makedirs('public/logos', exist_ok=True)

# generate simple placeholder images with team initials
for team in teams:
    filename = normalize_filename(team)
    filepath = os.path.join('public/logos', filename)
    if not os.path.exists(filepath):
        img = Image.new('RGB', (100, 100), color = (73, 109, 137))
        d = ImageDraw.Draw(img)
        initials = "".join([word[0] for word in team.split() if word])[:2].upper()
        # center text
        # simple text
        d.text((35, 40), initials, fill=(255, 255, 0))
        img.save(filepath, "WEBP")

print("Generated dummy logos for missing ones.")
