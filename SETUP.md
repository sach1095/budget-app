# Budget App — Setup Guide

## Démarrage rapide

```bash
cd ~/Desktop/gestion/budget-app
rm -rf node_modules          # Supprimer l'ancien node_modules
npm install --legacy-peer-deps
npm start                    # → http://localhost:4200
```

---

## Firebase — configuration requise

### 1. Activer Authentication
https://console.firebase.google.com/project/budget-app-d5fa9/authentication/providers

Activer : **Email/Password** (requis)
Optionnel : **Phone** (nécessite plan Blaze payant)

### 2. Activer Firestore
https://console.firebase.google.com/project/budget-app-d5fa9/firestore
→ Créer une base → Mode production → Région `europe-west1`

### 3. Déployer les règles Firestore
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

---

## Build & Déploiement

```bash
# Build de production
npm run build

# Déployer sur Firebase Hosting
firebase deploy --only hosting
# → https://budget-app-d5fa9.web.app
```

---

## Fonctionnalités

### 🔐 Authentification
- Email / mot de passe
- Téléphone + SMS (plan Blaze requis)
- Mode local sans connexion

### 💾 Stockage (choix au démarrage)
| Mode | Description |
|------|-------------|
| ☁️ Firebase | Cloud, synchro multi-appareils |
| 💾 Local | `budget_data.json` sur votre PC (compatible avec l'app HTML) |

### 📊 Fonctionnalités budget
- Vue globale avec graphiques (Chart.js) — répartition, budget vs réel
- Compte commun + comptes personnels dynamiques
- Import CSV multi-banques (BNP, CA, SG, générique)
- Édition avec option "appliquer à toutes les transactions similaires"
- Catégories avec couleur et budget mensuel
- Suivi salaires et contributions au compte commun
- Navigation mensuelle

### 🛡️ Sécurité
- Headers HTTP stricts (CSP, HSTS, X-Frame-Options…)
- Règles Firestore : chaque utilisateur accède uniquement à ses données
- Validation des données côté Firestore
