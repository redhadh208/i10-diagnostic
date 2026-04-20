// ================================================================
// BASE DE DONNÉES COMPLÈTE — Hyundai i10 G4HG 1.1L / Bosch M7.9.8
// ================================================================

// --- Valeurs de référence constructeur pour chaque capteur ---
export const SENSOR_REF = {
  RPM:   { name:'Régime moteur',         unit:'rpm', normalMin:700,  normalMax:850,  coldMin:1000, coldMax:1300, pid:'010C' },
  ECT:   { name:'Temp. liquide refroid.',unit:'°C',  normalMin:80,   normalMax:95,   pid:'0105' },
  IAT:   { name:'Temp. air admission',   unit:'°C',  normalMin:-20,  normalMax:60,   pid:'010F' },
  MAP:   { name:'Pression admission',    unit:'kPa', normalMin:25,   normalMax:45,   pid:'010B' },
  O2:    { name:'Sonde O2 amont',        unit:'V',   normalMin:0.2,  normalMax:0.8,  pid:'0114' },
  O2B:   { name:'Sonde O2 aval',         unit:'V',   normalMin:0.2,  normalMax:0.8,  pid:'0115' },
  TPS:   { name:'Position papillon',     unit:'%',   normalMin:0,    normalMax:100,  pid:'0111' },
  BATT:  { name:'Tension batterie',      unit:'V',   normalMin:13.5, normalMax:14.5, pid:'0142' },
  LTFT:  { name:'Correction LT carbu.', unit:'%',   normalMin:-5,   normalMax:5,    pid:'0107' },
  STFT:  { name:'Correction CT carbu.', unit:'%',   normalMin:-5,   normalMax:5,    pid:'0106' },
  LOAD:  { name:'Charge moteur',         unit:'%',   normalMin:15,   normalMax:35,   pid:'0104' },
  SPEED: { name:'Vitesse véhicule',      unit:'km/h',normalMin:0,    normalMax:180,  pid:'010D' },
  TIMING:{ name:'Avance allumage',       unit:'°',   normalMin:5,    normalMax:25,   pid:'010E' },
  MAF:   { name:'Débit masse air',       unit:'g/s', normalMin:2,    normalMax:6,    pid:'0110' },
  FUEL_P:{ name:'Pression carburant',    unit:'kPa', normalMin:330,  normalMax:370,  pid:'010A' },
};

// --- Injecteurs — Valeurs constructeur G4HG ---
export const INJECTOR_SPECS = {
  resistance: { min: 12, max: 16, unit: 'Ω', label: 'Résistance bobine' },
  openTime:   { min: 2.0, max: 3.5, unit: 'ms', label: 'Temps ouverture ralenti' },
  balance:    { maxDiff: 1.5, unit: 'ms', label: 'Équilibre inter-injecteurs (max écart)' },
  iqa:        { label: 'IQA (Injector Quantity Adjustment)', range: { min: -4, max: 4, unit: 'mg/coup' } },
  flowRate:   { nominal: 152, unit: 'cc/min', label: 'Débit nominal' },
  corrections: [
    { id: 'inj1', name: 'Injecteur 1 (Cyl.1)', defaultOffset: 0, minOffset: -4, maxOffset: 4 },
    { id: 'inj2', name: 'Injecteur 2 (Cyl.2)', defaultOffset: 0, minOffset: -4, maxOffset: 4 },
    { id: 'inj3', name: 'Injecteur 3 (Cyl.3)', defaultOffset: 0, minOffset: -4, maxOffset: 4 },
    { id: 'inj4', name: 'Injecteur 4 (Cyl.4)', defaultOffset: 0, minOffset: -4, maxOffset: 4 },
  ],
};

// --- Régulateur pression carburant ---
export const FUEL_REGULATOR = {
  name: 'Régulateur pression carburant',
  type: 'Return-less (intégré pompe)',
  nominalPressure: 350,   // kPa
  idlePressure:    330,   // kPa avec dépression
  maxPressure:     380,   // kPa
  minPressure:     300,   // kPa (seuil défaut)
  testProcedure: [
    'Contact ON (pompe amorce 2s)',
    'Brancher manomètre sur rampe injection',
    'Démarrer → mesurer : doit être 330-370 kPa',
    'Couper moteur → pression doit rester > 280 kPa après 5 min',
    'Si chute rapide → injecteur ou clapet anti-retour fuyant',
  ],
};

// --- Liste COMPLÈTE des capteurs et connecteurs du G4HG ---
export const ALL_SENSORS_CONNECTORS = [
  // ===== CAPTEURS MOTEUR =====
  { id:'ckp',  cat:'Moteur', name:'CKP — Capteur vilebrequin',      type:'Hall IC',       pins:'ECM 15,16',   normal:'Signal carré 0-5V', testMethod:'Oscillo ou fréquence-mètre', pid:null },
  { id:'cmp',  cat:'Moteur', name:'CMP — Capteur arbre à cames',    type:'Hall IC',       pins:'ECM 13,14',   normal:'Signal carré 0-5V', testMethod:'Oscillo, comparer avec CKP',  pid:null },
  { id:'map',  cat:'Moteur', name:'T_MAP — Pression + Temp. air',   type:'Analogique',    pins:'ECM 78,79,80',normal:'IG ON: 3.8-4.2V',  testMethod:'Voltmètre', pid:'010B' },
  { id:'ect',  cat:'Moteur', name:'ECT — Temp. liquide refroid.',   type:'NTC',           pins:'ECM 45,46',   normal:'80°C = 0.95-1.55V',testMethod:'Voltmètre/ohmmètre', pid:'0105' },
  { id:'iat',  cat:'Moteur', name:'IAT — Temp. air admission',      type:'NTC (dans MAP)',pins:'Intégré MAP', normal:'20°C = 3.3-3.7V',  testMethod:'Voltmètre', pid:'010F' },
  { id:'tps',  cat:'Moteur', name:'TPS — Position papillon',        type:'Potentiomètre', pins:'ECM 54,55,56',normal:'Fermé: 0.4-0.6V',  testMethod:'Voltmètre scope', pid:'0111' },
  { id:'o2up', cat:'Moteur', name:'O2 Amont — Sonde lambda',        type:'Zirconie chauffée',pins:'ECM 36,5,37',normal:'0.2-0.8V oscillant',testMethod:'Voltmètre/oscillo', pid:'0114' },
  { id:'o2dn', cat:'Moteur', name:'O2 Aval — Sonde lambda',         type:'Zirconie chauffée',pins:'ECM 38,6,39',normal:'0.2-0.8V stable', testMethod:'Voltmètre/oscillo', pid:'0115' },
  { id:'knock',cat:'Moteur', name:'Knock — Capteur cliquetis',      type:'Piézoélectrique',pins:'ECM 18,19',  normal:'Signal variable',   testMethod:'Oscillo, frapper bloc', pid:null },
  { id:'maf',  cat:'Moteur', name:'MAF — Débitmètre air',           type:'Fil chaud',     pins:'ECM 22,23',  normal:'Ralenti: 2-6 g/s',  testMethod:'Données OBD2', pid:'0110' },

  // ===== ALLUMAGE =====
  { id:'coil', cat:'Allumage', name:'DLI — Bobine allumage (×4)',   type:'Bobine mold',   pins:'ECM 60-63',  normal:'Primaire 0.82Ω±10%',testMethod:'Ohmmètre', pid:null },
  { id:'ckpw', cat:'Allumage', name:'CKP — Roue 30-2 dents',       type:'Cible magnétique',pins:'Côté CKP', normal:'Entrefer 0.5-1.5mm', testMethod:'Jauge entrefer', pid:null },

  // ===== INJECTION =====
  { id:'inj1', cat:'Injection', name:'Injecteur 1 — Cylindre 1',   type:'Solénoïde',     pins:'ECM 91',     normal:'12-16Ω / 2-3.5ms',  testMethod:'Ohmmètre + stéthoscope', pid:null },
  { id:'inj2', cat:'Injection', name:'Injecteur 2 — Cylindre 2',   type:'Solénoïde',     pins:'ECM 92',     normal:'12-16Ω / 2-3.5ms',  testMethod:'Ohmmètre + stéthoscope', pid:null },
  { id:'inj3', cat:'Injection', name:'Injecteur 3 — Cylindre 3',   type:'Solénoïde',     pins:'ECM 93',     normal:'12-16Ω / 2-3.5ms',  testMethod:'Ohmmètre + stéthoscope', pid:null },
  { id:'inj4', cat:'Injection', name:'Injecteur 4 — Cylindre 4',   type:'Solénoïde',     pins:'ECM 94',     normal:'12-16Ω / 2-3.5ms',  testMethod:'Ohmmètre + stéthoscope', pid:null },
  { id:'freg', cat:'Injection', name:'Régulateur pression carbu.',  type:'Électronique',  pins:'Pompe/Rampe',normal:'330-370 kPa ralenti',testMethod:'Manomètre carburant', pid:'010A' },
  { id:'pump', cat:'Injection', name:'Pompe carburant (in-tank)',   type:'Électrique',    pins:'Relais pompe',normal:'11.5-13V, 3-5A',     testMethod:'Voltmètre + ampèremètre', pid:null },

  // ===== ADMISSION / GESTION AIR =====
  { id:'isa',  cat:'Admission', name:'ISA — Actuateur ralenti',     type:'Double bobine', pins:'ECM 70,71',  normal:'250Hz, 10-14Ω',     testMethod:'Fréquencemètre + ohmmètre', pid:null },
  { id:'pcsv', cat:'Admission', name:'PCSV — Purge canister',       type:'Solénoïde',     pins:'ECM 52',     normal:'Résistance 20-30Ω',  testMethod:'Ohmmètre', pid:null },
  { id:'egr',  cat:'Admission', name:'EGR — Vanne recyclage gaz',   type:'Solénoïde',     pins:'ECM 53',     normal:'7-10Ω',              testMethod:'Ohmmètre + fumigène', pid:null },

  // ===== ÉLECTRICITÉ / ALIMENTATION =====
  { id:'batt', cat:'Électrique', name:'Batterie — Tension',         type:'Mesure directe',pins:'ECM 1,2',    normal:'Marche: 13.5-14.5V', testMethod:'Voltmètre', pid:'0142' },
  { id:'altr', cat:'Électrique', name:'Alternateur — Charge',       type:'Électrique',    pins:'Borne B+',   normal:'13.8-14.8V @ 2000rpm',testMethod:'Voltmètre', pid:null },
  { id:'grnd1',cat:'Électrique', name:'Masse moteur → carrosserie', type:'Câble masse',   pins:'Tresse moteur',normal:'< 0.1V de chute',  testMethod:'Voltmètre (chute tension)', pid:null },
  { id:'grnd2',cat:'Électrique', name:'Masse ECM → carrosserie',    type:'Câble masse',   pins:'ECM 25,26',  normal:'< 0.05V de chute',   testMethod:'Voltmètre (chute tension)', pid:null },
  { id:'grnd3',cat:'Électrique', name:'Masse capteurs (réf. 5V)',   type:'Masse signal',  pins:'ECM 79,56',  normal:'< 0.05V de chute',   testMethod:'Voltmètre (chute tension)', pid:null },
  { id:'vref', cat:'Électrique', name:'Tension référence 5V',       type:'Alimentation',  pins:'ECM 55,80',  normal:'4.9-5.1V',           testMethod:'Voltmètre', pid:null },

  // ===== SYSTÈME REFROIDISSEMENT =====
  { id:'tstat',cat:'Refroid.', name:'Thermostat',                   type:'Mécanique',     pins:'Sortie moteur',normal:'Ouverture 82°C',   testMethod:'Casserole eau + thermomètre', pid:null },
  { id:'radi', cat:'Refroid.', name:'Ventilateur radiateur',        type:'Électrique',    pins:'Relais venti',normal:'Décl. 95-100°C',    testMethod:'Vérifier relais + moteur', pid:null },

  // ===== CONNECTEURS ECM =====
  { id:'ecmA', cat:'ECM', name:'Connecteur ECM — Nappe A (48 voies)',type:'Connecteur',   pins:'A1-A48',     normal:'Voir schéma ECM',    testMethod:'Test continuité fil par fil', pid:null },
  { id:'ecmB', cat:'ECM', name:'Connecteur ECM — Nappe B (48 voies)',type:'Connecteur',   pins:'B1-B48',     normal:'Voir schéma ECM',    testMethod:'Test continuité fil par fil', pid:null },
  { id:'obdP', cat:'ECM', name:'Prise OBD2 — 16 broches',           type:'Connecteur',   pins:'Pin 4,5,7,16',normal:'Voir norme OBD2',    testMethod:'Vérifier tension + masse', pid:null },
];

// --- Catégories de capteurs ---
export const SENSOR_CATEGORIES = ['Tous', 'Moteur', 'Allumage', 'Injection', 'Admission', 'Électrique', 'Refroid.', 'ECM'];

// --- Codes DTC complets G4HG ---
export const DTC_DB = {
  P0105: { desc:'Circuit capteur MAP/Baro',          sev:'high',   causes:['MAP défectueux','Fuite dépression','Câblage'],     tests:['IG ON: 3.8-4.2V','Continuité ECM pin 78','Fuite dépression'] },
  P0110: { desc:'Circuit capteur IAT',               sev:'medium', causes:['IAT défectueux','Connexion','ECM utilise -40°C'],  tests:['20°C = 2.3-2.7kΩ','Câblage ECM'] },
  P0115: { desc:'Circuit capteur ECT',               sev:'medium', causes:['ECT défectueux','Câblage coupé','Masse'],          tests:['80°C = 0.30-0.32kΩ','Tension 1.25V±0.3V à 80°C'] },
  P0120: { desc:'Circuit capteur TPS',               sev:'high',   causes:['TPS défectueux','Câblage','Alimentation 5V'],      tests:['Fermé=0.5V, plein=4.5V','Comparer TPS+MAP'] },
  P0130: { desc:'Sonde O2 amont hors plage',         sev:'high',   causes:['O2 morte','Fuite échappement','Mélange incorrect'],tests:['0.2-0.8V oscillant','Résistance chauffage 5-7Ω'] },
  P0171: { desc:'Système trop pauvre (Bank 1)',       sev:'high',   causes:["Fuite air admission","O2 défect.","Pression carbu basse","Injecteur bouché"], tests:['LTFT > +10%','Fumigène admission','Pression carbu 3.5 bar'] },
  P0172: { desc:'Système trop riche (Bank 1)',        sev:'high',   causes:['Injecteur fuyard','Pression carbu haute','Filtre air bouché'],                  tests:['LTFT < -10%','Résistance injecteurs 12-16Ω'] },
  P0201: { desc:'Circuit injecteur cylindre 1',      sev:'high',   causes:['Injecteur HS','Câblage','ECM'],                   tests:['Résistance 12-16Ω','Son clic à oscillo'] },
  P0202: { desc:'Circuit injecteur cylindre 2',      sev:'high',   causes:['Injecteur HS','Câblage','ECM'],                   tests:['Résistance 12-16Ω','Son clic à oscillo'] },
  P0203: { desc:'Circuit injecteur cylindre 3',      sev:'high',   causes:['Injecteur HS','Câblage','ECM'],                   tests:['Résistance 12-16Ω','Son clic à oscillo'] },
  P0204: { desc:'Circuit injecteur cylindre 4',      sev:'high',   causes:['Injecteur HS','Câblage','ECM'],                   tests:['Résistance 12-16Ω','Son clic à oscillo'] },
  P0300: { desc:'Ratés allumage aléatoires',         sev:'high',   causes:['Bougies usées','Bobine défect.','Injecteurs'],    tests:['Bougies OK?','Résistance bobine 0.82Ω primaire'] },
  P0335: { desc:'Circuit CKP — Pas de signal',       sev:'critical',causes:['CKP défect.','Entrefer','Câblage'],              tests:['Résistance 800-1200Ω','Entrefer 0.5-1.5mm'] },
  P0340: { desc:'Circuit CMP — Pas de signal',       sev:'high',   causes:['CMP défect.','Câblage','Roue cible'],             tests:['Comparer formes CKP+CMP','Alimentation 12V'] },
  P0480: { desc:'Circuit commande ventilateur',      sev:'medium', causes:['Relais venti HS','Câblage','Moteur venti'],        tests:['Tester relais','Alimentation moteur venti'] },
  P0505: { desc:'Système contrôle ralenti (ISA)',    sev:'medium', causes:['ISA encrassé','Bobine HS','Fuite air'],            tests:['250Hz PWM','Résistance 10-14Ω','Nettoyer canal'] },
  P0560: { desc:'Tension système OBD hors plage',    sev:'medium', causes:['Alternateur','Batterie','Câblage'],                tests:['Marche: 13.5-14.5V','Test alternateur'] },
  P0A0F: { desc:'Circuit régulateur pression carbu.',sev:'high',   causes:['Régulateur HS','Pompe faible','Fuite rampe'],     tests:['Pression ralenti 330-370kPa','Tenir coupé 5min >280kPa'] },
};

// --- Procédures de reset valeurs constructeur ---
export const RESET_PROCEDURES = {
  fuelAdaptations: {
    name: 'Reset adaptations carburant (LTFT/STFT)',
    cmd: '04',
    steps: [
      'Brancher ELM327, contact ON',
      'Envoyer commande 04 (efface codes + adaptations)',
      'Couper contact 30 secondes',
      'Démarrer sans appuyer sur accélérateur',
      'Laisser ralenti 10 minutes',
      'Rouler 20km en variant les régimes',
      'Vérifier LTFT revient entre -5% et +5%',
    ],
    warning: 'Le moteur devra réapprendre ses adaptations. Conduite légèrement instable pendant ~50km.',
  },
  throttleAdaptation: {
    name: 'Réapprentissage papillon (TPS reset)',
    steps: [
      'Contact ON (moteur arrêté)',
      'Attendre 10 secondes sans toucher pédale',
      'Appuyer lentement sur accélérateur à fond (3-4s)',
      'Relâcher lentement (3-4s)',
      'Contact OFF',
      'Attendre 30 secondes',
      'Démarrer et laisser ralenti 5 minutes',
    ],
  },
  idleRpmReset: {
    name: 'Reset RPM ralenti (valeur constructeur: 750 rpm)',
    targetRpm: 750,
    steps: [
      'Moteur chaud (ECT > 80°C)',
      'Toutes charges électriques OFF (clim, ventil...)',
      'Transmission au point mort',
      'Débrancher connecteur ISA 30 secondes',
      'Rebrancher',
      'Couper contact 10s puis redémarrer',
    ],
  },
  injectorBalance: {
    name: 'Équilibrage injecteurs (reset valeurs IQA)',
    steps: [
      'Effacer les codes DTC',
      'Réinitialiser les adaptations LTFT (commande 04)',
      'Effectuer 3 cycles de conduite complets',
      'Vérifier LTFT et STFT de chaque banque',
      'Si déséquilibre > 5% → nettoyage ultrasons ou remplacement injecteur',
    ],
  },
};

// --- Points de masse G4HG ---
export const GROUND_POINTS = [
  { id:'g1', name:'Batt(−) → Carrosserie',  max:0.1,  location:'Aile gauche avant' },
  { id:'g2', name:'Batt(−) → Bloc moteur',  max:0.1,  location:'Support démarreur' },
  { id:'g3', name:'Bloc → Carrosserie',      max:0.1,  location:'Tresse de masse' },
  { id:'g4', name:'ECM → Carrosserie',       max:0.05, location:'Boîtier ECM (pin 25,26)' },
  { id:'g5', name:'Masse capteurs (5V ref)', max:0.05, location:'Collecteur admission' },
];
