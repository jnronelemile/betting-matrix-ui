/**
 * Registre canonique des noms d'affichage des clubs pour TITANIUM (WEB-P3-C)
 * 
 * Fournit des libellés courts, modernes et immédiatement identifiables sur mobile
 * sans altérer les noms originaux des JSON, les identifiants Match_ID ou les jointures.
 * 
 * Règles :
 * 1. Préservation absolue des discriminants des équipes réserves / jeunes / féminines (B, II, Fortuna, etc.).
 * 2. Désambiguïsation stricte des clubs partageant une même racine (Manchester, Sheffield, Milan, etc.).
 * 3. Ne pas créer d'abréviations cryptiques pour les clubs ayant déjà un nom court.
 * 4. Fallback strict et sûr vers le nom original si aucun alias n'est validé.
 */

// Fonctions pures de normalisation autonomes (garantit l'absence de dépendance cyclique)
export function normalizeBase(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/ı/g, 'i')
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanStr(str) {
  if (!str) return '';
  return normalizeBase(str).replace(/[^a-z0-9]/g, '');
}

// Mots-clés discriminants qui différencient strictement une entité spécifique (réserve, âge, genre)
export const TEAM_DISCRIMINATORS = new Set([
  'b', 'ii', 'iii', 'c', 'u19', 'u20', 'u21', 'u23', 'women', 'feminas', 'feminino', 'amateur', 'youth', 'reserves', 'fortuna', 'castilla'
]);

/**
 * Registre déterministe et versionné des correspondances vers les noms courts.
 * Clés normalisées via cleanStr() (minuscules, sans accents, alphanumérique pur).
 */
export const TEAM_DISPLAY_REGISTRY = {
  // === PREMIER LEAGUE & CHAMPIONSHIP ===
  'wolverhamptonwanderers': { short: 'Wolves', status: 'VERIFIED' },
  'wolverhampton': { short: 'Wolves', status: 'VERIFIED' },
  'brightonhovealbion': { short: 'Brighton', status: 'VERIFIED' },
  'brighton': { short: 'Brighton', status: 'VERIFIED' },
  'nottinghamforest': { short: "Nott'm Forest", status: 'VERIFIED' },
  'forest': { short: "Nott'm Forest", status: 'VERIFIED' },
  'manchesterunited': { short: 'Man United', status: 'VERIFIED' },
  'manutd': { short: 'Man United', status: 'VERIFIED' },
  'manchestercity': { short: 'Man City', status: 'VERIFIED' },
  'mancity': { short: 'Man City', status: 'VERIFIED' },
  'tottenhamhotspur': { short: 'Tottenham', status: 'VERIFIED' },
  'tottenham': { short: 'Tottenham', status: 'VERIFIED' },
  'westhamunited': { short: 'West Ham', status: 'VERIFIED' },
  'westham': { short: 'West Ham', status: 'VERIFIED' },
  'newcastleunited': { short: 'Newcastle', status: 'VERIFIED' },
  'crystalpalace': { short: 'Crystal Palace', status: 'VERIFIED' },
  'afcbournemouth': { short: 'Bournemouth', status: 'VERIFIED' },
  'bournemouth': { short: 'Bournemouth', status: 'VERIFIED' },
  'astonvilla': { short: 'Aston Villa', status: 'VERIFIED' },
  'leedsunited': { short: 'Leeds', status: 'VERIFIED' },
  'sunderlandafc': { short: 'Sunderland', status: 'VERIFIED' },
  'sunderland': { short: 'Sunderland', status: 'VERIFIED' },
  'sheffieldunited': { short: 'Sheff Utd', status: 'VERIFIED' },
  'sheffieldwednesday': { short: 'Sheff Wed', status: 'VERIFIED' },
  'westbromwichalbion': { short: 'West Brom', status: 'VERIFIED' },
  'westbrom': { short: 'West Brom', status: 'VERIFIED' },
  'queensparkrangers': { short: 'QPR', status: 'VERIFIED' },
  'qpr': { short: 'QPR', status: 'VERIFIED' },
  'prestonnorthend': { short: 'Preston', status: 'VERIFIED' },
  'preston': { short: 'Preston', status: 'VERIFIED' },
  'blackburnrovers': { short: 'Blackburn', status: 'VERIFIED' },
  'blackburn': { short: 'Blackburn', status: 'VERIFIED' },
  'boltonwanderers': { short: 'Bolton', status: 'VERIFIED' },
  'bolton': { short: 'Bolton', status: 'VERIFIED' },
  'charltonathletic': { short: 'Charlton', status: 'VERIFIED' },
  'charlton': { short: 'Charlton', status: 'VERIFIED' },
  'bristolcity': { short: 'Bristol City', status: 'VERIFIED' },
  'swanseacity': { short: 'Swansea', status: 'VERIFIED' },
  'norwichcity': { short: 'Norwich', status: 'VERIFIED' },
  'birminghamcity': { short: 'Birmingham', status: 'VERIFIED' },
  'cardiffcity': { short: 'Cardiff', status: 'VERIFIED' },
  'stokecity': { short: 'Stoke', status: 'VERIFIED' },
  'derbycounty': { short: 'Derby', status: 'VERIFIED' },
  'millwallfc': { short: 'Millwall', status: 'VERIFIED' },
  'millwall': { short: 'Millwall', status: 'VERIFIED' },
  'lincolncity': { short: 'Lincoln', status: 'VERIFIED' },
  'watfordfc': { short: 'Watford', status: 'VERIFIED' },
  'watford': { short: 'Watford', status: 'VERIFIED' },
  'southamptonfc': { short: 'Southampton', status: 'VERIFIED' },
  'southampton': { short: 'Southampton', status: 'VERIFIED' },
  'portsmouthfc': { short: 'Portsmouth', status: 'VERIFIED' },
  'portsmouth': { short: 'Portsmouth', status: 'VERIFIED' },

  // === 2. BUNDESLIGA & BUNDESLIGA ===
  'eintrachtbraunschweig': { short: 'Braunschweig', status: 'VERIFIED' },
  'holsteinkiel': { short: 'Holstein Kiel', status: 'VERIFIED' },
  '1fcheidenheim': { short: 'Heidenheim', status: 'VERIFIED' },
  'fcheidenheim': { short: 'Heidenheim', status: 'VERIFIED' },
  'heidenheim': { short: 'Heidenheim', status: 'VERIFIED' },
  'kaiserslautern': { short: 'Kaiserslautern', status: 'VERIFIED' },
  '1fckaiserslautern': { short: 'Kaiserslautern', status: 'VERIFIED' },
  'svdarmstadt98': { short: 'Darmstadt', status: 'VERIFIED' },
  'darmstadt': { short: 'Darmstadt', status: 'VERIFIED' },
  'energiecottbus': { short: 'Cottbus', status: 'VERIFIED' },
  'fcmagdeburg': { short: 'Magdeburg', status: 'VERIFIED' },
  'hannover96': { short: 'Hannover', status: 'VERIFIED' },
  'vflosnabruck': { short: 'Osnabrück', status: 'VERIFIED' },
  'osnabruck': { short: 'Osnabrück', status: 'VERIFIED' },
  'dynamodresden': { short: 'Dynamo Dresden', status: 'VERIFIED' },
  '1fcnurnberg': { short: 'Nürnberg', status: 'VERIFIED' },
  'nurnberg': { short: 'Nürnberg', status: 'VERIFIED' },
  'vflwolfsburg': { short: 'Wolfsburg', status: 'VERIFIED' },
  'wolfsburg': { short: 'Wolfsburg', status: 'VERIFIED' },
  'vflbochum': { short: 'Bochum', status: 'VERIFIED' },
  'bochum': { short: 'Bochum', status: 'VERIFIED' },
  'arminiabielefeld': { short: 'Bielefeld', status: 'VERIFIED' },
  'bielefeld': { short: 'Bielefeld', status: 'VERIFIED' },
  'herthabsc': { short: 'Hertha Berlin', status: 'VERIFIED' },
  'hertha': { short: 'Hertha Berlin', status: 'VERIFIED' },
  'greutherfurth': { short: 'Fürth', status: 'VERIFIED' },
  'spvgggreutherfurth': { short: 'Fürth', status: 'VERIFIED' },
  'fcstpauli': { short: 'St. Pauli', status: 'VERIFIED' },
  'stpauli': { short: 'St. Pauli', status: 'VERIFIED' },
  'karlsruhersc': { short: 'Karlsruhe', status: 'VERIFIED' },
  'karlsruhe': { short: 'Karlsruhe', status: 'VERIFIED' },
  'borussiamonchengladbach': { short: "M'gladbach", status: 'VERIFIED' },
  'monchengladbach': { short: "M'gladbach", status: 'VERIFIED' },
  'borussiadortmund': { short: 'Dortmund', status: 'VERIFIED' },
  'dortmund': { short: 'Dortmund', status: 'VERIFIED' },
  'bayernmunchen': { short: 'Bayern', status: 'VERIFIED' },
  'bayern': { short: 'Bayern', status: 'VERIFIED' },
  'bayerleverkusen': { short: 'Leverkusen', status: 'VERIFIED' },
  'leverkusen': { short: 'Leverkusen', status: 'VERIFIED' },
  'eintrachtfrankfurt': { short: 'Frankfurt', status: 'VERIFIED' },
  'vfbgtuttgart': { short: 'Stuttgart', status: 'VERIFIED' },

  // === LALIGA & LALIGA 2 ===
  'malagacf': { short: 'Málaga', status: 'VERIFIED' },
  'malaga': { short: 'Málaga', status: 'VERIFIED' },
  'rcdespanyol': { short: 'Espanyol', status: 'VERIFIED' },
  'espanyol': { short: 'Espanyol', status: 'VERIFIED' },
  'rayovallecano': { short: 'Rayo Vallecano', status: 'VERIFIED' },
  'athleticclub': { short: 'Athletic Club', status: 'VERIFIED' },
  'deportivoalaves': { short: 'Alavés', status: 'VERIFIED' },
  'alaves': { short: 'Alavés', status: 'VERIFIED' },
  'atleticomadrid': { short: 'Atlético', status: 'VERIFIED' },
  'fcbarcelona': { short: 'Barcelona', status: 'VERIFIED' },
  'getafecf': { short: 'Getafe', status: 'VERIFIED' },
  'getafe': { short: 'Getafe', status: 'VERIFIED' },
  'realmadrid': { short: 'Real Madrid', status: 'VERIFIED' },
  'villarrealcf': { short: 'Villarreal', status: 'VERIFIED' },
  'villarreal': { short: 'Villarreal', status: 'VERIFIED' },
  'elchecf': { short: 'Elche', status: 'VERIFIED' },
  'elche': { short: 'Elche', status: 'VERIFIED' },
  'celtavigo': { short: 'Celta Vigo', status: 'VERIFIED' },
  // Réserves / Discriminants stricts
  'celtafortuna': { short: 'Celta Fortuna', discriminator: 'Fortuna', status: 'VERIFIED' },
  'realsociedadb': { short: 'Real Sociedad B', discriminator: 'B', status: 'VERIFIED' },
  'realsociedad': { short: 'Real Sociedad', status: 'VERIFIED' },
  'deportivolacoruna': { short: 'Deportivo', status: 'VERIFIED' },
  'deportivocoruna': { short: 'Deportivo', status: 'VERIFIED' },
  'deportivoacoruna': { short: 'Deportivo', status: 'VERIFIED' },
  'realbetis': { short: 'Betis', status: 'VERIFIED' },
  'betis': { short: 'Betis', status: 'VERIFIED' },
  'caosasuna': { short: 'Osasuna', status: 'VERIFIED' },
  'osasuna': { short: 'Osasuna', status: 'VERIFIED' },
  'racingsantander': { short: 'Racing Santander', status: 'VERIFIED' },
  'valenciacf': { short: 'Valencia', status: 'VERIFIED' },
  'valencia': { short: 'Valencia', status: 'VERIFIED' },
  'levanteud': { short: 'Levante', status: 'VERIFIED' },
  'levante': { short: 'Levante', status: 'VERIFIED' },
  'sevillafc': { short: 'Sevilla', status: 'VERIFIED' },
  'sevilla': { short: 'Sevilla', status: 'VERIFIED' },
  'adceutafc': { short: 'Ceuta', status: 'VERIFIED' },
  'ceuta': { short: 'Ceuta', status: 'VERIFIED' },
  'cordobacf': { short: 'Córdoba', status: 'VERIFIED' },
  'cordoba': { short: 'Córdoba', status: 'VERIFIED' },
  'fcandorra': { short: 'Andorra', status: 'VERIFIED' },
  'cdcastellon': { short: 'Castellón', status: 'VERIFIED' },
  'castellon': { short: 'Castellón', status: 'VERIFIED' },
  'udalmeria': { short: 'Almería', status: 'VERIFIED' },
  'almeria': { short: 'Almería', status: 'VERIFIED' },
  'cdleganes': { short: 'Leganés', status: 'VERIFIED' },
  'leganes': { short: 'Leganés', status: 'VERIFIED' },
  'rcdmallorca': { short: 'Mallorca', status: 'VERIFIED' },
  'mallorca': { short: 'Mallorca', status: 'VERIFIED' },
  'udlaspalmas': { short: 'Las Palmas', status: 'VERIFIED' },
  'laspalmas': { short: 'Las Palmas', status: 'VERIFIED' },
  'sportinggijon': { short: 'Sporting Gijón', status: 'VERIFIED' },
  'realvalladolid': { short: 'Valladolid', status: 'VERIFIED' },
  'burgoscf': { short: 'Burgos', status: 'VERIFIED' },
  'granadacf': { short: 'Granada', status: 'VERIFIED' },
  'realoviedo': { short: 'Real Oviedo', status: 'VERIFIED' },
  'cdtenerife': { short: 'Tenerife', status: 'VERIFIED' },
  'gironafc': { short: 'Girona', status: 'VERIFIED' },

  // === SERIE A & SERIE B ===
  'intermilan': { short: 'Inter', status: 'VERIFIED' },
  'inter': { short: 'Inter', status: 'VERIFIED' },
  'acmilan': { short: 'Milan', status: 'VERIFIED' },
  'milan': { short: 'Milan', status: 'VERIFIED' },
  'asroma': { short: 'Roma', status: 'VERIFIED' },
  'roma': { short: 'Roma', status: 'VERIFIED' },
  'sslazio': { short: 'Lazio', status: 'VERIFIED' },
  'lazio': { short: 'Lazio', status: 'VERIFIED' },
  'sscnapoli': { short: 'Napoli', status: 'VERIFIED' },
  'napoli': { short: 'Napoli', status: 'VERIFIED' },
  'atalantabc': { short: 'Atalanta', status: 'VERIFIED' },
  'atalanta': { short: 'Atalanta', status: 'VERIFIED' },
  'acfiorentina': { short: 'Fiorentina', status: 'VERIFIED' },
  'fiorentina': { short: 'Fiorentina', status: 'VERIFIED' },
  'bolognafc': { short: 'Bologna', status: 'VERIFIED' },
  'bologna': { short: 'Bologna', status: 'VERIFIED' },
  'torinofc': { short: 'Torino', status: 'VERIFIED' },
  'torino': { short: 'Torino', status: 'VERIFIED' },
  'hellasverona': { short: 'Verona', status: 'VERIFIED' },
  'verona': { short: 'Verona', status: 'VERIFIED' },
  'udinesecalcio': { short: 'Udinese', status: 'VERIFIED' },
  'udinese': { short: 'Udinese', status: 'VERIFIED' },
  'uslecce': { short: 'Lecce', status: 'VERIFIED' },
  'lecce': { short: 'Lecce', status: 'VERIFIED' },
  'genoacfc': { short: 'Genoa', status: 'VERIFIED' },
  'genoa': { short: 'Genoa', status: 'VERIFIED' },
  'cagliaricalcio': { short: 'Cagliari', status: 'VERIFIED' },
  'cagliari': { short: 'Cagliari', status: 'VERIFIED' },
  'uscremonese': { short: 'Cremonese', status: 'VERIFIED' },
  'cremonese': { short: 'Cremonese', status: 'VERIFIED' },
  'como1907': { short: 'Como', status: 'VERIFIED' },
  'como': { short: 'Como', status: 'VERIFIED' },
  'parmacalcio1913': { short: 'Parma', status: 'VERIFIED' },
  'parma': { short: 'Parma', status: 'VERIFIED' },
  'ussassuolo': { short: 'Sassuolo', status: 'VERIFIED' },
  'sassuolo': { short: 'Sassuolo', status: 'VERIFIED' },
  'pisasc': { short: 'Pisa', status: 'VERIFIED' },
  'pisa': { short: 'Pisa', status: 'VERIFIED' },

  // === LIGUE 1 & LIGUE 2 ===
  'parissaintgermain': { short: 'PSG', status: 'VERIFIED' },
  'psg': { short: 'PSG', status: 'VERIFIED' },
  'olympiquedemarseille': { short: 'Marseille', status: 'VERIFIED' },
  'marseille': { short: 'Marseille', status: 'VERIFIED' },
  'olympiquelyonnais': { short: 'Lyon', status: 'VERIFIED' },
  'lyon': { short: 'Lyon', status: 'VERIFIED' },
  'usdunkerque': { short: 'Dunkerque', status: 'VERIFIED' },
  'annecyfc': { short: 'Annecy', status: 'VERIFIED' },
  'montpellierhsc': { short: 'Montpellier', status: 'VERIFIED' },
  'grenoblefoot38': { short: 'Grenoble', status: 'VERIFIED' },
  'asnancylorraine': { short: 'Nancy', status: 'VERIFIED' },
  'asancylorraine': { short: 'Nancy', status: 'VERIFIED' },
  'eaguingamp': { short: 'Guingamp', status: 'VERIFIED' },
  'paufc': { short: 'Pau', status: 'VERIFIED' },
  'stadelavallois': { short: 'Laval', status: 'VERIFIED' },
  'clermontfoot': { short: 'Clermont', status: 'VERIFIED' },
  'redstarfc': { short: 'Red Star', status: 'VERIFIED' },
  'fcnantes': { short: 'Nantes', status: 'VERIFIED' },
  'stadedereims': { short: 'Reims', status: 'VERIFIED' },
  'assaintetienne': { short: 'Saint-Étienne', status: 'VERIFIED' },
  'rodezaf': { short: 'Rodez', status: 'VERIFIED' },
  'dijonfco': { short: 'Dijon', status: 'VERIFIED' },
  'fcmetz': { short: 'Metz', status: 'VERIFIED' },

  // === EREDIVISIE ===
  'psveindhoven': { short: 'PSV', status: 'VERIFIED' },
  'scheerenveen': { short: 'Heerenveen', status: 'VERIFIED' },
  'goaheadeagles': { short: 'Go Ahead Eagles', status: 'VERIFIED' },
  'spartarotterdam': { short: 'Sparta Rotterdam', status: 'VERIFIED' },
  'feyenoordrotterdam': { short: 'Feyenoord', status: 'VERIFIED' },
  'feyenoord': { short: 'Feyenoord', status: 'VERIFIED' },
  'azalkmaar': { short: 'AZ', status: 'VERIFIED' },
  'fortunasittard': { short: 'Fortuna Sittard', status: 'VERIFIED' },
  'fctwente': { short: 'Twente', status: 'VERIFIED' },
  'afcajax': { short: 'Ajax', status: 'VERIFIED' },
  'necnijmegen': { short: 'NEC Nijmegen', status: 'VERIFIED' },
  'fcutrecht': { short: 'Utrecht', status: 'VERIFIED' },
  'willemii': { short: 'Willem II', status: 'VERIFIED' },
  'peczwolle': { short: 'PEC Zwolle', status: 'VERIFIED' },
  'sctelstar': { short: 'Telstar', status: 'VERIFIED' },
  'adodenhaag': { short: 'ADO Den Haag', status: 'VERIFIED' },
  'excelsiorrotterdam': { short: 'Excelsior', status: 'VERIFIED' },
  'fcgroningen': { short: 'Groningen', status: 'VERIFIED' },

  // === BELGIAN PRO LEAGUE ===
  'skbeveren': { short: 'Beveren', status: 'VERIFIED' },
  'raallalouviere': { short: 'La Louvière', status: 'VERIFIED' },
  'cerclebrugge': { short: 'Cercle Brugge', status: 'VERIFIED' },
  'clubbrugge': { short: 'Club Brugge', status: 'VERIFIED' },
  'zultewaregem': { short: 'Zulte Waregem', status: 'VERIFIED' },
  'standardliege': { short: 'Standard Liège', status: 'VERIFIED' },
  'unionsaintgilloise': { short: 'Union SG', status: 'VERIFIED' },
  'unionstgilloise': { short: 'Union SG', status: 'VERIFIED' },
  'unionsg': { short: 'Union SG', status: 'VERIFIED' },
  'sportingcharleroi': { short: 'Charleroi', status: 'VERIFIED' },
  'ohleuven': { short: 'OH Leuven', status: 'VERIFIED' },

  // === SCOTTISH PREMIERSHIP ===
  'dundeeunitedfc': { short: 'Dundee Utd', status: 'VERIFIED' },
  'dundeefc': { short: 'Dundee', status: 'VERIFIED' },
  'hibernianfc': { short: 'Hibernian', status: 'VERIFIED' },
  'falkirkfc': { short: 'Falkirk', status: 'VERIFIED' },
  'heartofmidlothianfc': { short: 'Hearts', status: 'VERIFIED' },
  'heartofmidlothian': { short: 'Hearts', status: 'VERIFIED' },
  'hearts': { short: 'Hearts', status: 'VERIFIED' },
  'stmirrenfc': { short: 'St Mirren', status: 'VERIFIED' },
  'rangersfc': { short: 'Rangers', status: 'VERIFIED' },
  'kilmarnockfc': { short: 'Kilmarnock', status: 'VERIFIED' },
  'motherwellfc': { short: 'Motherwell', status: 'VERIFIED' },
  'celticfc': { short: 'Celtic', status: 'VERIFIED' },
  'aberdeenfc': { short: 'Aberdeen', status: 'VERIFIED' },
  'stjohnstonefc': { short: 'St Johnstone', status: 'VERIFIED' },

  // === BRAZILIAN SERIE A ===
  'vascodagama': { short: 'Vasco da Gama', status: 'VERIFIED' },
  'saopaulo': { short: 'São Paulo', status: 'VERIFIED' },
  'ecvitoria': { short: 'Vitória', status: 'VERIFIED' },
  'atleticomineiro': { short: 'Atlético-MG', status: 'VERIFIED' },
  'atleticomg': { short: 'Atlético-MG', status: 'VERIFIED' },
  'santosfc': { short: 'Santos', status: 'VERIFIED' },
  'athleticopr': { short: 'Athletico-PR', status: 'VERIFIED' },
  'athleticoparanaense': { short: 'Athletico-PR', status: 'VERIFIED' },

  // === ALLSVENSKAN ===
  'ifbrommapojkarna': { short: 'Brommapojkarna', status: 'VERIFIED' },
  'aiksolna': { short: 'AIK', status: 'VERIFIED' },
  'malmoff': { short: 'Malmö', status: 'VERIFIED' },
  'degerforsif': { short: 'Degerfors', status: 'VERIFIED' },

  // === MAJOR LEAGUE SOCCER ===
  'newenglandrevolution': { short: 'New England', status: 'VERIFIED' },
  'newyorkredbulls': { short: 'NY Red Bulls', status: 'VERIFIED' },
  'redbullnewyork': { short: 'NY Red Bulls', status: 'VERIFIED' },
  'philadelphiaunion': { short: 'Philadelphia', status: 'VERIFIED' },
  'vancouverwhitecaps': { short: 'Vancouver', status: 'VERIFIED' },
  'sandiegofc': { short: 'San Diego', status: 'VERIFIED' },
  'stlouiscity': { short: 'St. Louis City', status: 'VERIFIED' },
  'realsaltlake': { short: 'Real Salt Lake', status: 'VERIFIED' },
  'sportingkc': { short: 'Sporting KC', status: 'VERIFIED' },
  'sportingkansascity': { short: 'Sporting KC', status: 'VERIFIED' },
  'chicagofire': { short: 'Chicago Fire', status: 'VERIFIED' },
  'chicagofirefc': { short: 'Chicago Fire', status: 'VERIFIED' },
  'atlantanited': { short: 'Atlanta United', status: 'VERIFIED' },
  'atlantaunited': { short: 'Atlanta United', status: 'VERIFIED' },
  'intermiami': { short: 'Inter Miami', status: 'VERIFIED' },
  'newyorkcityfc': { short: 'NYCFC', status: 'VERIFIED' },
  'seattlesoundersfc': { short: 'Seattle Sounders', status: 'VERIFIED' },
  'seattlesounders': { short: 'Seattle Sounders', status: 'VERIFIED' },
  'minnesotaunited': { short: 'Minnesota United', status: 'VERIFIED' },
  'houstondynamofc': { short: 'Houston Dynamo', status: 'VERIFIED' },
  'houstondynamo': { short: 'Houston Dynamo', status: 'VERIFIED' },
  'portlandtimbers': { short: 'Portland Timbers', status: 'VERIFIED' },
  'coloradorapids': { short: 'Colorado Rapids', status: 'VERIFIED' },
  'sanjoseearthquakes': { short: 'SJ Earthquakes', status: 'VERIFIED' },

  // === K-LEAGUE & J-LEAGUE ===
  'daejeonhanacitizen': { short: 'Daejeon', status: 'VERIFIED' },
  'jeonbukhyundaimotors': { short: 'Jeonbuk', status: 'VERIFIED' },
  'jeonbukhyundaimotorsfc': { short: 'Jeonbuk', status: 'VERIFIED' },
  'bucheonfc1995': { short: 'Bucheon FC', status: 'VERIFIED' },
  'pohangsteelers': { short: 'Pohang Steelers', status: 'VERIFIED' },
  'sanfreccehiroshima': { short: 'S. Hiroshima', status: 'VERIFIED' },
  'yokohamafmarinos': { short: 'Y. Marinos', status: 'VERIFIED' },
  'fagianookayamafc': { short: 'Fagiano Okayama', status: 'VERIFIED' },
  'kyotosangafc': { short: 'Kyoto Sanga', status: 'VERIFIED' },
  'jefunitedchiba': { short: 'JEF United', status: 'VERIFIED' },
  'kawasakifrontale': { short: 'Kawasaki', status: 'VERIFIED' },
  'gimcheonsangmu': { short: 'Gimcheon Sangmu', status: 'VERIFIED' },
  'kashimaantlers': { short: 'Kashima Antlers', status: 'VERIFIED' },
  'urawareddiamonds': { short: 'Urawa Reds', status: 'VERIFIED' },
  'vvarennagasaki': { short: 'V-Varen Nagasaki', status: 'VERIFIED' },
  'shimizuspulse': { short: 'Shimizu S-Pulse', status: 'VERIFIED' },

  // === EKSTRAKLASA & RUSSIAN PREMIER LEAGUE ===
  'jagielloniabialystok': { short: 'Jagiellonia', status: 'VERIFIED' },
  'jagielloniabiaystok': { short: 'Jagiellonia', status: 'VERIFIED' },
  'rakowczestochowa': { short: 'Raków', status: 'VERIFIED' },
  'wieczystakrakow': { short: 'Wieczysta', status: 'VERIFIED' },
  'legiawarszawa': { short: 'Legia', status: 'VERIFIED' },
  'zenitstpetersburg': { short: 'Zenit', status: 'VERIFIED' },
  'baltikakaliningrad': { short: 'Baltika', status: 'VERIFIED' },
  'fakelvoronezh': { short: 'Fakel', status: 'VERIFIED' },
  'dynamomakhachkala': { short: 'Makhachkala', status: 'VERIFIED' },
  'akhmatgrozny': { short: 'Akhmat', status: 'VERIFIED' },
  'lokomotivmoscow': { short: 'Lokomotiv', status: 'VERIFIED' },
  'akrontogliatti': { short: 'Akron Togliatti', status: 'VERIFIED' },
  'krylyasovetovsamara': { short: 'Krylya Sovetov', status: 'VERIFIED' },
  'hamarkameratene': { short: 'HamKam', status: 'VERIFIED' },

  // === LIGA PORTUGAL & LIGA MX ===
  'vitoriadeguimaraes': { short: 'Vitória SC', status: 'VERIFIED' },
  'estreladaamadora': { short: 'Estrela Amadora', status: 'VERIFIED' },
  'academicoviseu': { short: 'Académico Viseu', status: 'VERIFIED' },
  'tigresuanl': { short: 'Tigres', status: 'VERIFIED' },
  'pumasunam': { short: 'Pumas', status: 'VERIFIED' },
  'atleticosanluis': { short: 'San Luis', status: 'VERIFIED' },
  'atleticodesanluis': { short: 'San Luis', status: 'VERIFIED' },
  'clubleon': { short: 'León', status: 'VERIFIED' },
  'clubamerica': { short: 'América', status: 'VERIFIED' },

  // === AUSTRIAN BUNDESLIGA & SUPERLIGAEN & SWISS SUPER LEAGUE ===
  'lasklinz': { short: 'LASK', status: 'VERIFIED' },
  'wolfsbergerac': { short: 'Wolfsberg', status: 'VERIFIED' },
  'austrialustenau': { short: 'Austria Lustenau', status: 'VERIFIED' },
  'fcnordsjaelland': { short: 'Nordsjælland', status: 'VERIFIED' },
  'odenseboldklub': { short: 'OB', status: 'VERIFIED' },
  'achorsens': { short: 'Horsens', status: 'VERIFIED' },
  'fcmidtjylland': { short: 'Midtjylland', status: 'VERIFIED' },
  'fccopenhagen': { short: 'Copenhagen', status: 'VERIFIED' },
  'lausannesport': { short: 'Lausanne', status: 'VERIFIED' },
  'istanbulbasaksehir': { short: 'Başakşehir', status: 'VERIFIED' }
};

/**
 * Résout le nom d'affichage court et lisible pour une équipe donnée.
 * 
 * @param {string} rawName Nom brut issu de TITANIUM ou de la fixture
 * @param {string} [leagueContext] Contexte de ligue optionnel pour désambiguïsation
 * @returns {string} Nom court validé ou le nom original nettoyé en fallback
 */
export function getTeamDisplayName(rawName, leagueContext = null) {
  if (!rawName || typeof rawName !== 'string') return '';
  const trimmed = rawName.trim();
  if (!trimmed) return '';

  const cleanKey = cleanStr(trimmed);

  // 1. Recherche directe dans le registre vérifié
  const entry = TEAM_DISPLAY_REGISTRY[cleanKey];
  if (entry && entry.short) {
    return entry.short;
  }

  // 2. Préservation stricte des discriminants (B, II, Women, Fortuna, etc.)
  // Si le nom contient un mot-clé discriminant mais n'est pas dans le registre,
  // on conserve STRICTEMENT le nom complet pour éviter de renommer "Celta Fortuna" en "Celta" !
  const tokens = trimmed.toLowerCase().split(/[\s\-_.]+/);
  const hasDiscriminator = tokens.some(t => TEAM_DISCRIMINATORS.has(t));
  if (hasDiscriminator) {
    return trimmed;
  }

  // 3. Fallback déterministe et sûr vers le nom original non altéré
  return trimmed;
}

/**
 * Retourne les noms d'affichage résolus pour une rencontre donnée.
 * 
 * @param {Object} match Objet match TITANIUM
 * @returns {{ displayHome: string, displayAway: string }}
 */
export function getMatchDisplayNames(match) {
  if (!match) return { displayHome: '', displayAway: '' };

  // Priorité : displayHome/displayAway déjà résolus sur l'objet
  if (match.displayHome && match.displayAway) {
    return {
      displayHome: match.displayHome,
      displayAway: match.displayAway
    };
  }

  // Dérivation à partir des champs du match
  const parts = (match.Matchup || '').split(' vs ');
  const homeRaw = match.shortHome || parts[0] || '';
  const awayRaw = match.shortAway || parts[1] || '';

  return {
    displayHome: getTeamDisplayName(homeRaw, match.League),
    displayAway: getTeamDisplayName(awayRaw, match.League)
  };
}
