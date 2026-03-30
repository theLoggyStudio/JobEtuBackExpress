# JobEtu — Backend

API REST Express + TypeScript, persistance **PostgreSQL** via **Sequelize**.

## Configuration

Copiez `.env.example` vers `.env`. Variables importantes :

| Variable | Rôle |
|----------|------|
| `STORAGE_DRIVER` | `postgres` (hors test), `memory` (défaut en mode test : RAM, reset au redémarrage), ou `json` (fichier) |
| `JSON_STORE_PATH` | Chemin du fichier JSON si `STORAGE_DRIVER=json` (défaut : `data/jobetu-test-store.json`) |
| `DATABASE_URL` | Connexion PostgreSQL (obligatoire si `STORAGE_DRIVER=postgres`) |
| `JWT_SECRET` | Signature des JWT |
| `DB_SYNC` | `true` en dev pour `sync` Sequelize (désactiver en prod) |
| `CORS_ORIGIN` | Origine du front (ex. `http://localhost:5173`) |

### Mode test sans PostgreSQL

**Mémoire (défaut si `MODE_CONFIG.current === 'test'` et aucun `STORAGE_DRIVER` dans `.env`)** — idéal pour tester les API, données effacées au redémarrage :

```bash
npm run dev:memory
```

**Fichier JSON** — persistance locale dans un fichier :

```bash
npm run dev:json
```

Les deux modes démarrent avec un admin + 2 questionnaires d’exemple. Identifiants par défaut : constante `TEST_DEFAULT_ADMIN_CONFIG` dans `Constants/mode.constant.ts` (affichés aussi au démarrage en dev / mode test).

`npm run seed:admin` fonctionne aussi en mode `memory` ou `json` (ajoute un admin si absent).

Pour des mises à jour immuables du store RAM (spread), voir `src/repositories/memoryStore.ts` (`setMemoryStore`, `resetMemoryStore`).

## Constantes

Port, sécurité, pagination, messages, chemins d’API : `Constants/variable.constant.ts`  
Types : `Constants/types.constant.ts`

## Scripts

- `npm run dev` — API avec rechargement (`tsx watch`)
- `npm run build` — compilation vers `dist/`
- `npm run start` — exécution `node dist/server.js`
- `npm run seed:admin` — création d’un compte administrateur (tables synchronisées)
- `npm run build:obfuscate` — build TS puis obfuscation optionnelle de `dist/`

## Endpoints principaux (préfixe `/api`)

- `GET /health` — statut
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /questionnaires` — liste (admin : tous ; sinon actifs + filtre `?target=`)
- `GET /questionnaires/by-slug/:slug`
- `POST /questionnaires` — création (admin), corps `{ definition }` JSON validé
- `PUT /questionnaires/:id` — mise à jour (admin)
- `PATCH /questionnaires/:id/toggle` — actif / inactif (admin)
- `POST /submissions` — soumission (utilisateur authentifié, rôle = cible du questionnaire)
- `GET /submissions` — liste admin (`?target=`, `?search=`, `?limit=`)
- `POST /matches`, `GET /matches` — admin

## Sécurité

Helmet, CORS, rate limiting global et renforcé sur l’auth, JWT, bcrypt, validation Zod, gestion d’erreurs centralisée, limite de taille du body.
