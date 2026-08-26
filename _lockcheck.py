import json, re

s = open('package-lock.json', encoding='utf-8', errors='replace').read()

# Stale high-version (57.x-era) expo entries
stale = re.findall(r'"node_modules/(expo[a-z0-9-]*)": \{[^{}]*?"version": "(5\d\.[^"]+)"', s)
print('stale 5x-version entries:', stale[:10] if stale else 'NONE')

for p in ['expo', 'expo-modules-core', 'expo-location', 'expo-local-authentication', 'expo-image-picker']:
    m = re.search(r'"node_modules/' + re.escape(p) + r'": \{"[^"]*?"version": "([^"]+)"', s)
    if not m:
        m = re.search(r'"node_modules/' + re.escape(p) + r'": \{\s*"version": "([^"]+)"', s)
    print(p, 'lockfile:', m.group(1) if m else 'NOT IN LOCKFILE')
