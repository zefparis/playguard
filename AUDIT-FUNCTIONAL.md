# PlayGuard — Audit fonctionnel

**Date :** 2026-09-17
**Périmètre :** SPA (`src/`), proxy Vercel Edge (`api/`), backend de production `hybrid-vector-api` (`src/routes/playguard.ts`, Supabase + AWS Rekognition).
**Méthode :** revue de code statique + alignement des contrats frontend ↔ backend réel. Pas de test e2e sur données réelles.

> ⚠️ Le backend documenté dans le README (`backend/server.js`, Fastify + DynamoDB) n'est **pas** celui en production. La prod passe par `hybrid-vector-api` sur Render (Express + Supabase). Tous les constats ci-dessous sont évalués contre le backend réel.

---

## Synthèse

| # | Gravité | Constat | Statut |
|---|---------|---------|--------|
| 1 | Critique | Page Events crashée (snake_case vs camelCase) | ✅ Corrigé |
| 2 | Critique | BannedList vide + Unban envoie `DELETE /ban/undefined` | ✅ Corrigé |
| 3 | Critique | Fail-open : panne Rekognition → joueur banni ALLOWED | ✅ Corrigé |
| 4 | Critique | Verdicts VERIFY_AGE silencieusement exclus de l'audit trail | ✅ Corrigé |
| 5 | Élevé | Double capture : Confirm soumettait une frame non previewée + double billing | ✅ Corrigé |
| 6 | Moyen | Verdict BANNED n'affichait pas l'identité du joueur matché | ✅ Corrigé |
| 7 | Moyen | `result.quality` absent du backend réel → jamais affiché | ⏳ Ouvert |
| 8 | Moyen | Aucun `player_id` collecté au scan → events anonymes | ⏳ Ouvert |
| 9 | Moyen | `DELETE /ban` renvoie `success:true` même si Rekognition échoue | ⏳ Ouvert |
| 10 | Faible | Icônes PWA `/icons/*` absentes → install cassée | ⏳ Ouvert |
| 11 | Faible | `useCamera` fige l'UI 2s au mount (double getUserMedia + setTimeout) | ⏳ Ouvert |
| 12 | Faible | `getStatus()` mort, pas de page Status ni refresh sur Events | ⏳ Ouvert |
| 13 | Faible | Injection `tenant_id` du proxy = dead code | ⏳ Ouvert |

---

## Détail des constats

### 1. Page Events — crash complet ✅ corrigé

Les lignes `playguard_events` remontent en snake_case (`id`, `scanned_at`, `age_low`, `ban_detected`, `face_confidence`…). Le front attendait du camelCase (`scanId`, `timestamp`, `age.range.Low`, `faceConfidence`). `ev.age.range.Low` sur `undefined` → `TypeError` → crash React de toute la liste ; `key={ev.scanId}` était `undefined` pour chaque ligne.

**Fix :** `mapEvent()` dans `src/services/api.ts` normalise les lignes vers le shape `BackendEvent` — le composant est inchangé.

### 2. BannedList — cartes vides, Unban cassé ✅ corrigé

`playguard_bans` renvoie `face_id`, `external_id`, `banned_at` ; le front lisait `faceId`/`externalId`/`bannedAt` → affichage vide, et `unbanPlayer(b.faceId)` envoyait `DELETE /playguard/ban/undefined` — ne supprimait rien.

**Fix :** `mapBan()` dans `src/services/api.ts`.

### 3. Fail-open sur le contrôle principal ✅ corrigé

`POST /playguard/scan` encapsulait la recherche de bannis dans `Promise.allSettled` et traitait un rejet comme « pas de match ». Une panne Rekognition (throttling, collection absente, timeout) transformait un joueur banni en `ALLOWED` — sans aucun signal à l'opérateur. Le backend local fait l'inverse (fail-closed → 500).

**Fix :** nouveau verdict `BAN_CHECK_FAILED` (prioritaire sur tout le reste), `access: false`, `ban.checkFailed: true`, erreur loguée côté serveur. L'UI affiche : *« Banned-registry check unavailable — deny access or verify manually. »*

### 4. VERIFY_AGE absent de l'audit trail ✅ corrigé

La contrainte `CHECK (verdict IN ('ALLOWED','MINOR','BANNED'))` sur `playguard_events` rejetait les inserts `VERIFY_AGE` — verdict émis par le backend depuis le relevé du seuil d'âge à 21. L'erreur n'était qu'un `console.error` → trou silencieux dans le journal de compliance, précisément sur le cas exigeant une vérification manuelle.

**Fix :** migration `20260918_playguard_events_verdict_check.sql` — CHECK élargi à `ALLOWED, MINOR, BANNED, VERIFY_AGE, BAN_CHECK_FAILED`.

### 5. SelfieCapture — double capture ✅ corrigé

`handleCapture` était appelé par « Scan » **et** « Confirm », et re-capturait une frame live à chaque fois. Dans Scan, `onCapture` soumettait à l'API dès le premier clic → Confirm déclenchait un **second scan facturé** avec une frame différente de la preview. Dans AddBan, Confirm écrasait `capturedB64` avec une photo jamais montrée.

**Fix :** « Capture » fige la preview ; « Confirm » soumet la frame previewée. Un seul appel Rekognition par scan.

### 6. Identité du match BANNED ✅ corrigé

Le backend renvoie `ban.externalId` (ID registre du joueur banni) mais l'UI n'affichait que la similarité. La carte résultat montre maintenant **Matched Player: `<externalId>`**.

---

## Constats ouverts (non corrigés)

### 7. `result.quality` inexistant en prod — *moyen*
Le backend réel ne renvoie pas `quality.Brightness/Sharpness`. La ligne « Image Quality » est masquée (`result.quality &&`). Soit ajouter le champ au backend (les FaceDetails sont disponibles), soit retirer l'affichage.

### 8. Scans anonymes — *moyen*
`player_id`/`board_id`/`platform` sont acceptés par l'API et stockés en base, mais l'UI ne les collecte jamais. Le journal d'audit destiné aux gaming boards ne peut pas relier un scan à un joueur.

### 9. `DELETE /playguard/ban/:faceId` ment — *moyen*
`deleteFaceFromCollection` avale ses erreurs (`catch → return false`). La réponse est `success: true` même si le visage reste dans la collection Rekognition → le « débanni » sera encore matché au prochain scan.

### 10. Icônes PWA manquantes — *faible*
`manifest.webmanifest` et `index.html` référencent `/icons/icon-192.png`, `/icons/icon-512.png`, `apple-touch-icon.png` — `public/icons/` n'existe pas → 404, install PWA dégradée.

### 11. Caméra figée 2s — *faible*
`useCamera` fait un `getUserMedia` de probe puis un second, puis attend un `setTimeout(2000)` avant `ready`. Incompressible perçu à chaque ouverture de Scan/AddBan.

### 12. Features mortes — *faible*
`getStatus()` n'est appelé par aucune page (pas d'écran Status malgré l'endpoint) ; `mode`/`queueSize` n'existent pas dans la réponse réelle ; Events n'a ni refresh ni pagination.

### 13. `tenant_id` injecté par le proxy — *faible*
`api/proxy.ts` merge `tenant_id` dans le body JSON, mais le backend lit `req.tenant_id` (posé par le middleware d'auth) — dead code trompeur.

---

## Divergences de contrat documentées

| Aspect | Backend local (`backend/server.js`) | Backend prod (`hybrid-vector-api`) |
|---|---|---|
| Scan input | multipart OU JSON | JSON uniquement |
| `quality` dans la réponse | oui | non |
| Persistance | DynamoDB + queue fichier (COLLECT/UPLOAD, `/sync`) | Supabase |
| `GET /playguard/bans` | **absent** | existe |
| Échec recherche bannis | fail-closed (500) | `BAN_CHECK_FAILED` (depuis cedfdbd) |

## Commits associés

- `hybrid-vector-api` `cedfdbd` — fail-closed + migration CHECK
- `playguard` `57360d3` — mappers, single-capture, verdict BAN_CHECK_FAILED, Matched Player
- `playguard` `0997ff8` — (audit sécurité précédent) gate PIN + session token + restriction `/playguard/*`
