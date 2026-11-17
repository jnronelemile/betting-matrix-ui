# WEB-FI-001 — Football Intelligence Web

Le registre Web reconnaît 29 ligues et contrôle les profils, scopes, noms de fichiers et identités de match autorisés. Les classements de Super League Greece (207) et Saudi Pro League (306) utilisent les effectifs qualifiés pour 2026–2027 ; les autres saisons restent indéterminées.

Le dataset publié au commit `8445eaa29a8d576df8a152249863f0b31b434d9e` a validé 27 ligues et 241 associations réelles. Les ligues 207 et 306 sont couvertes par une fixture synthétique, sans validation d'artefact producteur réel. Les fixtures historiques et leur provenance sont décrites dans `tests/fixtures/web_fi_001/README.md`.

Validations : `node tests/test_web_fi_001.mjs`, `node tests/test_web_fi_current_dataset.mjs`, `node tests/test_web_fi_29.mjs` et `npm run build` dans une copie isolée pour préserver `public/data/`.
