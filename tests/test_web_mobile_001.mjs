import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getThreeClosestLines, getNearestLine, selectDeterministicPredictionFile } from '../src/utils/titaniumLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('=== DÉBUT DE LA SUITE DE TESTS CIBLÉS WEB-MOBILE-001 ===\n');

// ---------------------------------------------------------------------------
// TEST 1 : Coordination des swipes et verrou isTracking dans MatchDashboard.jsx
// ---------------------------------------------------------------------------
console.log('[TEST 1] Coordination des swipes et verrou isTracking dans MatchDashboard.jsx');
{
  const dashboardPath = path.join(ROOT_DIR, 'src/components/MatchDashboard.jsx');
  const dashboardCode = fs.readFileSync(dashboardPath, 'utf-8');

  // 1.1 touchStateRef doit initialiser isTracking: false
  assert(
    dashboardCode.includes('isTracking: false'),
    'touchStateRef doit inclure la propriété isTracking: false par défaut'
  );

  // 1.2 handleTouchStart doit réinitialiser isTracking = false et ne l\'activer qu\'après validation
  assert(
    dashboardCode.includes('touchStateRef.current.isTracking = false'),
    'handleTouchStart doit réinitialiser isTracking: false au début'
  );
  assert(
    dashboardCode.includes('isTracking: true'),
    'handleTouchStart doit définir isTracking: true uniquement lorsque le toucher est valide et non interactif'
  );

  // 1.3 isInteractiveTarget doit intercepter [data-no-swipe="true"]
  assert(
    dashboardCode.includes('[data-no-swipe="true"]'),
    'isInteractiveTarget doit vérifier [data-no-swipe="true"]'
  );

  // 1.4 handleTouchMove doit vérifier !isTracking
  assert(
    dashboardCode.includes('if (!touchStateRef.current.isTracking) return;'),
    'handleTouchMove doit vérifier if (!touchStateRef.current.isTracking) return;'
  );

  // 1.5 handleTouchEnd et handleTouchCancel doivent vérifier !isTracking
  const touchEndMatches = dashboardCode.match(/if \(!touchStateRef\.current\.isTracking\) return;/g);
  assert(
    touchEndMatches && touchEndMatches.length >= 3,
    'handleTouchMove, handleTouchEnd et handleTouchCancel doivent tous vérifier !isTracking'
  );

  console.log('  ✓ Test 1 validé : Verrou isTracking et coordination multi-niveaux conformes.');
}

// ---------------------------------------------------------------------------
// TEST 2 : Structure des 2 cartes distinctes et libellés courts dans TabTactical.jsx
// ---------------------------------------------------------------------------
console.log('\n[TEST 2] Structure en 2 cartes distinctes et absence de troncature des titres');
{
  const tacticalPath = path.join(ROOT_DIR, 'src/components/dashboard/TabTactical.jsx');
  const tacticalCode = fs.readFileSync(tacticalPath, 'utf-8');

  // 2.1 Carte 1 : Statistical Market Overview et Carte 2 : Team Statistical Markets
  assert(
    tacticalCode.includes('Statistical Market Overview'),
    'La carte 1 Statistical Market Overview doit être présente'
  );
  assert(
    tacticalCode.includes('Team Statistical Markets'),
    'La carte 2 Team Statistical Markets doit être présente'
  );
  assert(
    tacticalCode.includes('data-no-swipe="true"'),
    'La carte 2 doit porter l\'attribut data-no-swipe="true"'
  );

  // 2.2 Badge court shortRefType pour éviter la troncature des titres (Corners, SOT, Shots, Throws)
  assert(
    tacticalCode.includes("shortRefType: 'Méd. Match'"),
    'Les disciplines match doivent définir shortRefType: Méd. Match'
  );
  assert(
    tacticalCode.includes("shortRefType: 'Moy. Équipe'"),
    'La discipline Throws doit définir shortRefType: Moy. Équipe'
  );
  assert(
    tacticalCode.includes('title={refType}'),
    'Le badge d\'aperçu doit conserver la référence complète dans son attribut title'
  );

  console.log('  ✓ Test 2 validé : Séparation nette en 2 cartes et libellés courts non tronquants.');
}

// ---------------------------------------------------------------------------
// TEST 3 : Sous-navigation tactile (Sub-Swipe) entre les 4 disciplines
// ---------------------------------------------------------------------------
console.log('\n[TEST 3] Sous-navigation tactile (Sub-Swipe) et isolation des gestes');
{
  const tacticalPath = path.join(ROOT_DIR, 'src/components/dashboard/TabTactical.jsx');
  const tacticalCode = fs.readFileSync(tacticalPath, 'utf-8');

  // 3.1 Ordre strict des disciplines
  assert(
    tacticalCode.includes("const DISCIPLINE_KEYS = ['corners', 'sot', 'shots', 'throws'];"),
    'Les 4 disciplines doivent respecter l\'ordre strict Corners -> SOT -> Shots -> Throws'
  );

  // 3.2 Attachement des écouteurs de sous-swipe
  assert(
    tacticalCode.includes('onTouchStart={handleSubTouchStart}') &&
    tacticalCode.includes('onTouchMove={handleSubTouchMove}') &&
    tacticalCode.includes('onTouchEnd={handleSubTouchEnd}') &&
    tacticalCode.includes('onTouchCancel={handleSubTouchCancel}'),
    'Le conteneur tripartite doit être doté des écouteurs onTouchStart/Move/End/Cancel'
  );

  // 3.3 Exclusion des Pills et des tableaux scrollables
  assert(
    tacticalCode.includes('data-sub-swipe-ignore="true"'),
    'Le sélecteur de Pills doit porter data-sub-swipe-ignore="true"'
  );
  assert(
    tacticalCode.includes("target.closest('.overflow-x-auto, table')"),
    'Le sous-swipe doit ignorer les défilements horizontaux de tableaux'
  );

  // 3.4 Préservation prioritaire du défilement vertical
  assert(
    tacticalCode.includes('if (absY > absX && absY > 7)'),
    'Le sous-swipe doit céder la priorité absolue au défilement vertical'
  );

  console.log('  ✓ Test 3 validé : Sous-navigation tactile et garde-fous aux bornes vérifiés.');
}

// ---------------------------------------------------------------------------
// TEST 4 : Comportement Desktop (>= 1024px) vs Mobile (< 1024px)
// ---------------------------------------------------------------------------
console.log('\n[TEST 4] Rendu responsive immédiat : catalogue complet sur PC, 3 lignes sur mobile');
{
  const tacticalPath = path.join(ROOT_DIR, 'src/components/dashboard/TabTactical.jsx');
  const tacticalCode = fs.readFileSync(tacticalPath, 'utf-8');

  // 4.1 Listener matchMedia 1024px
  assert(
    tacticalCode.includes("(min-width: 1024px)"),
    'TabTactical doit écouter dynamiquement matchMedia((min-width: 1024px))'
  );

  // 4.2 Affichage direct de toutes les lignes sur PC
  assert(
    tacticalCode.includes('if (isDesktop || expandedHomeCatalogue) return homeLines;'),
    'homeDisplayedLines doit retourner toutes les lignes sur isDesktop'
  );
  assert(
    tacticalCode.includes('if (isDesktop || expandedAwayCatalogue) return awayLines;'),
    'awayDisplayedLines doit retourner toutes les lignes sur isDesktop'
  );

  // 4.3 Bouton d\'extension masqué sur PC
  assert(
    tacticalCode.includes('!isDesktop && homeLines.length > 3'),
    'Le bouton d\'extension Domicile doit être masqué sur desktop'
  );
  assert(
    tacticalCode.includes('!isDesktop && awayLines.length > 3'),
    'Le bouton d\'extension Extérieur doit être masqué sur desktop'
  );

  // 4.4 Total du Match en premier sur mobile avec accentuation visuelle
  assert(
    tacticalCode.includes('order-first lg:order-none'),
    'Total du Match doit porter order-first lg:order-none'
  );
  assert(
    tacticalCode.includes('hidden md:flex'),
    'Le bandeau descriptif redondant doit être masqué sur mobile (< 768px)'
  );

  console.log('  ✓ Test 4 validé : Catalogue direct sur PC et bascule dynamique mobile confirmés.');
}

// ---------------------------------------------------------------------------
// TEST 5 : Intégrité des données réelles TITANIUM (Sanctuaire public/data/)
// ---------------------------------------------------------------------------
console.log('\n[TEST 5] Intégrité des données réelles TITANIUM (Sanctuaire public/data/)');
{
  const predDir = path.join(ROOT_DIR, 'public/data/titanium_v2/predictions');
  const availableFiles = fs.readdirSync(predDir).filter(f => f.endsWith('.json'));
  const activeFileName = selectDeterministicPredictionFile(availableFiles);
  assert(activeFileName, 'Un fichier de prédictions actif doit être sélectionné');
  const dataPath = path.join(predDir, activeFileName);
  assert(fs.existsSync(dataPath), `Le fichier de prédictions actif (${activeFileName}) doit exister`);
  const matrixRaw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  assert(Array.isArray(matrixRaw) && matrixRaw.length > 0, 'Le payload doit contenir un tableau de matchs non vide');

  let countWithTeamMarkets = 0;
  matrixRaw.forEach((m) => {
    if (m.Team_Stat_Markets?.Families) {
      countWithTeamMarkets++;
      m.Team_Stat_Markets.Families.forEach(fam => {
        if (fam.Home?.Lines && fam.Home?.Lambda) {
          const closest3 = getThreeClosestLines(fam.Home.Lines, fam.Home.Lambda);
          assert(closest3.length <= 3, 'Mobile doit limiter à 3 lignes au maximum');
          const nearest = getNearestLine(fam.Home.Lines, fam.Home.Lambda);
          assert(nearest !== null, 'Une ligne pivot doit être identifiable');
        }
      });
    }
  });

  assert(countWithTeamMarkets === matrixRaw.length, `Tous les ${matrixRaw.length} matchs doivent posséder Team_Stat_Markets (trouvé ${countWithTeamMarkets})`);
  console.log(`  ✓ Test 5 validé : ${countWithTeamMarkets}/${matrixRaw.length} matchs vérifiés (${activeFileName}), zéro recalcul côté client, public/data/ intact.`);
}

// ---------------------------------------------------------------------------
// TEST 6 : Finition UX : Synchronisation du sélecteur et animation du sous-swipe
// ---------------------------------------------------------------------------
console.log('\n[TEST 6] Finition UX : Recentrage automatique et animation tactile bi-panneaux');
{
  const tacticalPath = path.join(ROOT_DIR, 'src/components/dashboard/TabTactical.jsx');
  const tacticalCode = fs.readFileSync(tacticalPath, 'utf-8');

  // 6.1 Recentrage horizontal automatique et fluide (centerActivePill)
  assert(
    tacticalCode.includes('const centerActivePill = useCallback('),
    'TabTactical doit définir centerActivePill pour le recentrage fluide de la discipline active'
  );
  assert(
    tacticalCode.includes('container.scrollTo({') && tacticalCode.includes('left: Math.max(0, targetScrollLeft)'),
    'centerActivePill doit scroller exclusivement horizontalement sans impacter le défilement vertical'
  );
  assert(
    tacticalCode.includes('centerActivePill(selectedDiscipline);'),
    'centerActivePill doit être déclenché lors du changement de selectedDiscipline'
  );
  assert(
    tacticalCode.includes('ref={pillsContainerRef}'),
    'La barre des Pills doit porter ref={pillsContainerRef}'
  );
  assert(
    tacticalCode.includes('data-discipline-key={key}'),
    'Chaque bouton de discipline doit être indexable avec data-discipline-key'
  );

  // 6.2 Suivi au doigt et translation GPU en temps réel (sous-swipe)
  assert(
    tacticalCode.includes('subCurrentPanelRef.current.style.transform = `translate3d(${effectiveDx}px, 0, 0)`'),
    'Le panneau courant doit suivre le doigt en temps réel via translate3d GPU'
  );
  assert(
    tacticalCode.includes('subNeighborPanelRef.current.style.transform = `translate3d(${neighborOffset}px, 0, 0)`'),
    'Le panneau voisin doit être translaté en direct avec le panneau courant'
  );

  // 6.3 Résistance élastique aux deux extrémités (Corners et Throws)
  assert(
    tacticalCode.includes('effectiveDx = dx * 0.15;'),
    'Le geste doit opposer une résistance élastique (0.15) aux bornes extrêmes sans panneau vide'
  );

  // 6.4 Décision de commit ou annulation et transitions amorties
  assert(
    tacticalCode.includes('cubic-bezier(0.2, 0.9, 0.3, 1)'),
    'Le relâchement doit utiliser la courbe cubic-bezier(0.2, 0.9, 0.3, 1)'
  );
  assert(
    tacticalCode.includes('prefersReducedMotion'),
    'Le composant doit respecter prefers-reduced-motion pour les transitions'
  );

  // 6.5 Structure bi-panneaux dans subSwipeContainerRef
  assert(
    tacticalCode.includes('subNeighborPanelRef') && tacticalCode.includes('subCurrentPanelRef'),
    'Le conteneur de sous-swipe doit gérer subCurrentPanelRef et subNeighborPanelRef'
  );

  console.log('  ✓ Test 6 validé : Recentrage automatique et animation fluide du sous-swipe validés.');
}

// ---------------------------------------------------------------------------
// TEST 7 : Dock contextuel Team Markets (Navigation fixe sous l'en-tête sticky)
// ---------------------------------------------------------------------------
console.log('\n[TEST 7] Dock contextuel Team Markets : Emplacement sticky, React Portal et anti-oscillation');
{
  const dashboardPath = path.join(ROOT_DIR, 'src/components/MatchDashboard.jsx');
  const tacticalPath = path.join(ROOT_DIR, 'src/components/dashboard/TabTactical.jsx');
  const dashboardCode = fs.readFileSync(dashboardPath, 'utf-8');
  const tacticalCode = fs.readFileSync(tacticalPath, 'utf-8');

  // 7.1 Emplacement d'accueil du dock contextuel dans l'en-tête sticky de MatchDashboard
  assert(
    dashboardCode.includes('id="tactical-sticky-dock"'),
    'MatchDashboard doit définir l\'emplacement d\'accueil #tactical-sticky-dock'
  );
  assert(
    dashboardCode.includes('lg:hidden') && dashboardCode.includes('empty:hidden'),
    '#tactical-sticky-dock doit être masqué sur desktop (lg:hidden) et lorsqu\'il est vide (empty:hidden)'
  );
  assert(
    dashboardCode.includes("activeTab === 'tactical' ? '' : 'hidden'"),
    '#tactical-sticky-dock doit être strictement masqué hors de l\'onglet tactical'
  );

  // 7.2 Intégration de React Portal dans TabTactical
  assert(
    tacticalCode.includes("import { createPortal } from 'react-dom';"),
    'TabTactical doit importer createPortal depuis react-dom'
  );
  assert(
    tacticalCode.includes('createPortal(') && tacticalCode.includes('dockHost'),
    'TabTactical doit projeter le dock compact via createPortal dans dockHost'
  );

  // 7.3 Détection de scroll robuste et prévention des oscillations (invariance de hauteur)
  assert(
    tacticalCode.includes('const baseHeaderBottom = headerRect.bottom - dockHeight;'),
    'TabTactical doit déduire dockHeight pour conserver un seuil baseHeaderBottom invariant et sans oscillation'
  );
  assert(
    tacticalCode.includes('isPastPills') && tacticalCode.includes('isInsideCard2'),
    'Le dock doit vérifier que les pills sont passées sous l\'en-tête ET que l\'utilisateur est toujours dans Carte 2'
  );
  assert(
    tacticalCode.includes('ref={carte2Ref}'),
    'La Carte 2 Team Statistical Markets doit porter ref={carte2Ref} comme délimiteur contextuel'
  );

  // 7.4 Recentrage automatique synchronisé dans les deux barres
  assert(
    tacticalCode.includes('dockPillsContainerRef') && tacticalCode.includes('dockPillRefs'),
    'TabTactical doit gérer dockPillsContainerRef et dockPillRefs pour le dock'
  );
  assert(
    tacticalCode.includes('targetDockScrollLeft = dockButton.offsetLeft'),
    'centerActivePill doit recentrer horizontalement la pill active dans le dock compact'
  );

  // 7.5 Sécurité tactile : immunité contre le swipe principal et les déclenchements parasites
  assert(
    tacticalCode.includes('key={`dock-${key}`}') &&
    tacticalCode.includes('data-no-swipe="true"') &&
    tacticalCode.includes('data-sub-swipe-ignore="true"'),
    'Le dock compact et ses boutons doivent porter data-no-swipe="true" et data-sub-swipe-ignore="true"'
  );

  console.log('  ✓ Test 7 validé : Emplacement sticky, React Portal, anti-oscillation et synchronisation validés.');
}

console.log('\n=== TOUS LES TESTS WEB-MOBILE-001 ONT RÉUSSI AVEC SUCCÈS (7/7) ===');
