# 🚗 i10 Diag Pro v2.0 — Guide d'Installation

## Application Android — DeepSeek IA + Diagnostic Complet G4HG

---

## 📱 FONCTIONNALITÉS

### 🤖 Intelligence Artificielle — DeepSeek
- Analyse complète des données OBD2 en temps réel
- Diagnostic injecteurs, régulateur, RPM, O2, LTFT
- Plan de correction prioritaire automatique
- Réponses techniques précises avec valeurs constructeur

### 🔌 Connexion OBD2 ELM327 Bluetooth
- Lecture de 14 PIDs OBD2 standard
- Lecture temps d'injection par cylindre (PIDs propriétaires Hyundai)
- Connexion automatique au dernier adaptateur

### 🩺 Rapport de Santé — 4 modes
1. **📋 Liste** — Tous les 35 capteurs/connecteurs avec état OK/FAIL
2. **📊 Temps réel** — Comparaison valeur réelle vs plage constructeur avec barre visuelle
3. **🔌 Câblage** — Schéma câblage interactif G4HG Bosch M7.9.8
4. **🩺 Rapport auto** — Score santé global + plan de correction prioritaire

### 🔧 Correction & Reset Valeurs Constructeur
- **Injecteurs** : Correction IQA individuelle (offsets mg/coup) + reset usine
- **Régulateur pression** : Ajustement cible kPa + reset 350kPa constructeur
- **RPM ralenti** : Fixation à la valeur constructeur 750rpm
- **LTFT/STFT** : Reset adaptations carburant
- **Reset complet** : Tout remettre aux valeurs d'origine en un clic

### ⚠️ Codes DTC
- Lecture et effacement des codes défaut
- Base de données 18 codes G4HG avec causes et tests

---

## 🛠️ INSTALLATION SANS PC (EAS Build Cloud)

### Étape 1 — Créer un compte GitHub
1. https://github.com → Sign up
2. Créer un repository `i10-diag-pro` (Private)
3. Uploader tous les fichiers de ce dossier (respecter la structure)

### Étape 2 — Créer un compte Expo
1. https://expo.dev → Sign up (avec GitHub)
2. Projects → Create → `i10-diag-pro`
3. Copier le **Project ID** (format UUID)

### Étape 3 — Mettre à jour app.json
Dans `app.json`, remplacer :
```json
"projectId": "VOTRE-PROJECT-ID-ICI"
```
Par votre vrai Project ID Expo.

### Étape 4 — Builder l'APK (cloud)
1. expo.dev → votre projet → Builds → New build
2. Sélectionner Android → profile "preview" → Start build
3. Attendre 15-25 minutes
4. Télécharger le fichier `.apk`

### Étape 5 — Installer sur Android 13/14
1. Transférer l'APK sur le téléphone
2. Paramètres → Sécurité → Autoriser sources inconnues
3. Ouvrir l'APK → Installer

### Étape 6 — Configurer DeepSeek IA
1. https://platform.deepseek.com → Créer un compte
2. API Keys → Create → Copier la clé (sk-...)
3. App → ⚙️ Réglages → Coller la clé DeepSeek → Sauvegarder

---

## 🔌 UTILISATION

### Connexion ELM327
1. Brancher ELM327 sur prise OBD2 (sous tableau de bord, côté conducteur)
2. Contact voiture en position ON
3. Activer Bluetooth Android
4. Appairer l'ELM327 dans Paramètres Bluetooth Android (PIN: 1234)
5. App → 🔌 Connexion → Rechercher → Sélectionner

### Diagnostic injecteurs
1. Connecter ELM327 moteur en marche
2. App → ⚡ Tableau → Section Injecteurs
3. Vérifier que tous sont entre 2.0-3.5ms
4. Si déséquilibre → 🔧 Correction → Injecteurs → Appliquer offset

### Reset valeurs constructeur
- 🔧 Correction → "TOUT REMETTRE AUX VALEURS CONSTRUCTEUR"
- Effectuer un cycle de conduite après le reset

---

## 📊 VALEURS CONSTRUCTEUR G4HG

| Capteur | Valeur normale |
|---------|----------------|
| RPM ralenti chaud | 700-850 rpm |
| ECT moteur chaud | 80-95°C |
| MAP IG ON repos | 3.8-4.2 V |
| IAT à 20°C | 3.3-3.7 V |
| O2 Amont | 0.2-0.8 V oscillant |
| TPS fermé / plein | 0.5V / 4.5V |
| Batterie marche | 13.5-14.5 V |
| LTFT/STFT | -5% à +5% |
| Pression carbu. | 330-370 kPa |
| Injecteurs résistance | 12-16 Ω |
| Injecteurs débit | 152 cc/min |
| Injecteurs temps ralenti | 2.0-3.5 ms |
| Thermostat ouverture | 82°C → 95°C |
| ISA fréquence | 250 Hz |
| Bobine primaire | 0.82 Ω ±10% |
| Bobine secondaire | 15.5 kΩ ±10% |
| Compression | 11-13 bar/cyl. |

---

*i10 Diag Pro v2.0 — Hyundai i10 2008 G4HG 1.1L — Usage personnel*
