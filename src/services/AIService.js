// ================================================================
// SERVICE IA — DeepSeek + Gemini (double fournisseur)
// ================================================================

const SYSTEM_PROMPT = `Tu es un expert diagnostiqueur automobile spécialisé UNIQUEMENT sur la Hyundai i10 2008-2013 moteur G4HG 1.1L, système ECM Bosch M7.9.8.

DONNÉES TECHNIQUES CONSTRUCTEUR:
- T_MAP: IG ON repos = 3.8-4.2V. Signal total 0.3-4.8V
- IAT (intégré MAP): 0°C=4.0-4.4V | 20°C=3.3-3.7V | 40°C=2.5-2.9V | 80°C=1.0-1.4V → Défaut: ECM utilise -40°C = surconsommation
- ECT (4 fils, 2 dorés=ECT): 0°C=4.27V/5.18kΩ | 20°C=3.44V/2.27kΩ | 80°C=1.25V/0.30kΩ
- O2 Zirconie: 0.2-0.8V oscillant 1-3Hz moteur chaud. Fixe <0.2V = pauvre, >0.8V = riche
- TPS lever: repos=0.5V, plein=4.5V. Comparer TOUJOURS TPS + MAP ensemble
- CKP: Hall IC, 30 dents (2 manquantes), ECM pin 15
- ISA: 250Hz, double bobine, résistance 10-14Ω
- Injecteurs G4HG: résistance 12-16Ω, débit 152cc/min, temps ouverture ralenti 2-3.5ms
- Régulateur pression carburant (return-less): ralenti 330-370kPa, tenir >280kPa 5min après coupure
- Pression compression: 11-13 bar par cylindre
- LTFT normal: -5% à +5%. >+10% = mélange trop pauvre. <-10% = trop riche
- Batterie marche: 13.5-14.5V
- Thermostat: ouverture 82°C, plein 95°C
- Bobine primaire: 0.82Ω±10%. Secondaire: 15.5kΩ±10%

RÈGLES:
1. Réponds UNIQUEMENT en français
2. Sois précis et technique, donne des valeurs exactes
3. Propose toujours: diagnostic → cause probable → procédure de test → solution → comment remettre en valeur constructeur
4. Si LTFT élevé, lie-le à O2, MAP, IAT, injecteurs
5. Pour les injecteurs: donne les corrections IQA et comment équilibrer
6. Pour le régulateur: donne la pression cible et comment tester`;

// Construire le contexte OBD2 à inclure
export function buildOBDContext(liveData) {
  if (!liveData || Object.values(liveData).every(v => v === 0)) {
    return '\n\n[Aucune donnée OBD2 disponible]';
  }
  const d = liveData;
  const alerts = [];

  if (d.o2 < 0.2 && d.o2 > 0)           alerts.push('🚨 O2 TROP BAS = mélange pauvre');
  if (d.ltft > 10)                        alerts.push(`🚨 LTFT +${d.ltft?.toFixed(1)}% = ECM corrige mélange pauvre`);
  if (d.ltft < -10)                       alerts.push(`🚨 LTFT ${d.ltft?.toFixed(1)}% = ECM corrige mélange riche`);
  if (d.batt < 13.0 && d.batt > 5)       alerts.push(`⚠️ TENSION BASSE ${d.batt?.toFixed(1)}V`);
  if (d.ect > 100)                        alerts.push(`🚨 SURCHAUFFE ${d.ect?.toFixed(0)}°C`);
  if (d.rpm < 650 && d.rpm > 100)        alerts.push(`⚠️ RPM BAS: ${d.rpm?.toFixed(0)} rpm`);
  if (d.fuelPressure < 300 && d.fuelPressure > 0) alerts.push(`🚨 PRESSION CARBU BASSE: ${d.fuelPressure?.toFixed(0)}kPa`);

  return `\n\nDONNÉES OBD2 TEMPS RÉEL:
• RPM: ${d.rpm?.toFixed(0)||'N/A'} rpm | ECT: ${d.ect?.toFixed(0)||'N/A'}°C | IAT: ${d.iat?.toFixed(0)||'N/A'}°C
• MAP: ${d.map?.toFixed(1)||'N/A'} kPa | TPS: ${d.tps?.toFixed(1)||'N/A'}%
• O2 amont: ${d.o2?.toFixed(3)||'N/A'}V | O2 aval: ${d.o2b?.toFixed(3)||'N/A'}V
• LTFT: ${d.ltft?.toFixed(1)||'N/A'}% | STFT: ${d.stft?.toFixed(1)||'N/A'}%
• Batterie: ${d.batt?.toFixed(1)||'N/A'}V | Charge: ${d.load?.toFixed(0)||'N/A'}%
• Pression carbu: ${d.fuelPressure?.toFixed(0)||'N/A'} kPa
• Inj.1: ${d.inj1?.toFixed(2)||'N/A'}ms | Inj.2: ${d.inj2?.toFixed(2)||'N/A'}ms | Inj.3: ${d.inj3?.toFixed(2)||'N/A'}ms | Inj.4: ${d.inj4?.toFixed(2)||'N/A'}ms
${alerts.length ? '\n🚨 ALERTES:\n' + alerts.join('\n') : ''}`;
}

// ---- DEEPSEEK ----
async function callDeepSeek(apiKey, messages, liveData) {
  if (!apiKey) throw new Error('Clé DeepSeek non configurée → Allez dans Réglages');

  const context = buildOBDContext(liveData);
  const lastMsg = messages[messages.length - 1];
  const enriched = [
    ...messages.slice(0, -1),
    { role: lastMsg.role, content: lastMsg.content + context },
  ];

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 1200,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...enriched,
      ],
    }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `DeepSeek erreur ${resp.status}`);
  return data.choices[0]?.message?.content || '';
}

// ---- GEMINI ----
async function callGemini(apiKey, messages, liveData) {
  if (!apiKey) throw new Error('Clé Gemini non configurée → Allez dans Réglages');

  const context = buildOBDContext(liveData);
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMsg = messages[messages.length - 1];
  const userText = SYSTEM_PROMPT + '\n\n' + lastMsg.content + context;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userText }] },
        ],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.3 },
      }),
    }
  );

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `Gemini erreur ${resp.status}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ---- POINT D'ENTRÉE PRINCIPAL ----
export async function sendToAI({ provider, deepseekApiKey, geminiApiKey, messages, liveData }) {
  try {
    if (provider === 'gemini') {
      return { success: true, text: await callGemini(geminiApiKey, messages, liveData) };
    } else {
      return { success: true, text: await callDeepSeek(deepseekApiKey, messages, liveData) };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ---- Réponses locales de secours (mode sans clé) ----
export function localFallback(question, liveData) {
  const q = question.toLowerCase();
  const d = liveData || {};

  if (q.includes('injecteur') || q.includes('injection') || q.includes('iqa')) {
    return `📊 Diagnostic Injecteurs G4HG

Valeurs de référence constructeur:
• Résistance bobine: 12-16 Ω (mesurer à froid)
• Débit nominal: 152 cc/min
• Temps ouverture ralenti: 2.0-3.5 ms
• Équilibre inter-injecteurs: écart max 1.5 ms

État actuel:
• Inj.1: ${d.inj1?.toFixed(2)||'N/A'}ms | Inj.2: ${d.inj2?.toFixed(2)||'N/A'}ms
• Inj.3: ${d.inj3?.toFixed(2)||'N/A'}ms | Inj.4: ${d.inj4?.toFixed(2)||'N/A'}ms

Si un injecteur est > 1.5ms différent des autres:
1. Nettoyer aux ultrasons
2. Corriger via offset IQA dans l'onglet Correction
3. Si résistance hors plage → remplacer

Pour remettre aux valeurs constructeur:
→ Onglet Correction → Injecteurs → Bouton "Reset usine"`;
  }

  if (q.includes('pression') || q.includes('régulateur') || q.includes('carburant')) {
    return `📊 Diagnostic Régulateur Pression Carburant

Valeurs constructeur (return-less):
• Pression ralenti: 330-370 kPa (3.3-3.7 bar)
• Pression coupure moteur: > 280 kPa pendant 5 min
• Chute rapide → injecteur ou clapet anti-retour fuyant

Pression actuelle OBD2: ${d.fuelPressure?.toFixed(0)||'N/A'} kPa

Test manomètre:
1. Brancher manomètre sur rampe injection
2. Contact ON → doit monter à 350 kPa en 2s
3. Démarrer → 330-370 kPa au ralenti
4. Couper → doit rester > 280 kPa après 5 min

Si pression basse → pompe affaiblie ou régulateur HS
Pour remettre à la valeur cible constructeur (350 kPa):
→ Onglet Correction → Régulateur → "Reset 350 kPa"`;
  }

  if (q.includes('rpm') || q.includes('ralenti')) {
    return `📊 Diagnostic RPM Ralenti G4HG

Valeur constructeur: 750 rpm (±50 rpm)
Valeur actuelle: ${d.rpm?.toFixed(0)||'N/A'} rpm

Causes RPM anormal:
• ISA encrassé → nettoyer canal d'air
• Fuite dépression → vérifier durites
• ECT défectueux → ECM utilise mauvaise compensation
• Corps papillon sale → nettoyer à la bombe

Procédure reset RPM valeur constructeur:
1. Moteur chaud (ECT > 80°C)
2. Toutes charges OFF
3. Débrancher ISA 30s, rebrancher
4. Contact OFF 10s, redémarrer
→ Ou utiliser: Correction → RPM → "Fixer 750 rpm"`;
  }

  if (q.includes('consommation') || q.includes('ltft')) {
    return `📊 Diagnostic Surconsommation G4HG

LTFT actuel: ${d.ltft?.toFixed(1)||'N/A'}% (Normal: -5% à +5%)
O2 amont: ${d.o2?.toFixed(3)||'N/A'}V (Normal: 0.2-0.8V oscillant)

Checklist prioritaire:
1. O2 oscille-t-elle entre 0.2-0.8V ? ${d.o2 < 0.2 ? '❌ TROP BAS' : '✅ OK'}
2. LTFT entre -5 et +5% ? ${Math.abs(d.ltft||0) > 5 ? '❌ HORS PLAGE' : '✅ OK'}
3. IAT correcte ? (20°C = 3.3-3.7V)
4. Fuite au collecteur admission ?
5. Pression carburant 330-370 kPa ?
6. Injecteurs équilibrés ?

Solution:
→ Onglet IA → Analyse complète pour diagnostic précis
→ Onglet Correction → Reset adaptations carburant`;
  }

  return `🔧 Assistant G4HG (Mode local)

Je peux analyser:
• Injecteurs et corrections IQA
• Régulateur pression carburant
• RPM ralenti et fixation valeur constructeur
• Surconsommation (O2, LTFT, MAP, IAT)
• Parasites électriques et masses
• Tous les capteurs et connecteurs

⚠️ Configurez une clé API DeepSeek ou Gemini dans Réglages pour l'IA complète.`;
}

export const QUICK_PROMPTS = [
  { label:'🔥 Surconso',    q:'Analyse ma surconsommation. LTFT, O2, injecteurs — quelles corrections faire ?' },
  { label:'💉 Injecteurs',  q:'Diagnostic complet des 4 injecteurs. Corrections IQA et comment équilibrer pour revenir aux valeurs constructeur.' },
  { label:'⛽ Régulateur',  q:'Diagnostic régulateur pression carburant. Valeur cible constructeur et procédure de correction.' },
  { label:'🔄 RPM Ralenti', q:'Mon RPM de ralenti est incorrect. Comment le fixer à la valeur constructeur 750 rpm ?' },
  { label:'🔬 O2 Sensor',   q:'Analyse ma sonde O2. Est-elle en bon état ? Valeurs attendues et test à faire.' },
  { label:'🔌 Masses',      q:'Guide test masses électriques G4HG et parasites des accessoires installés.' },
  { label:'📊 Scan complet',q:'Lance un diagnostic complet. Identifie toutes les anomalies et donne un plan de correction prioritaire.' },
  { label:'🔧 Reset usine', q:'Quelles valeurs dois-je remettre aux valeurs constructeur en priorité sur mon G4HG ?' },
];
