# JobEtu — Backend

API REST Express + TypeScript, persistance **PostgreSQL** via **Sequelize**.

## Configuration

Fichiers d’environnement à la racine du projet (`src/config/loadEnv.ts`) :

| Fichier chargé | Quand |
|----------------|--------|
| `.env.test` | `MODE_CONFIG.current === 'test'` dans `Constants/mode.constant.ts` |
| `.env.prod` | `MODE_CONFIG.current === 'production'` |

Modèles versionnés : **`.env.test.example`**, **`.env.prod.example`** → copier vers `.env.test` / `.env.prod` (ignorés par Git).

Sur Vercel et assimilés, le fichier peut être absent : les variables injectées par la plateforme suffisent (dotenv ne les écrase pas si déjà définies).

Résolution des clés (`Constants/envResolve.ts`) :

- **production** : uniquement les variables **sans** suffixe `_TEST`.
- **test** : **`FOO_TEST`** puis **`FOO`** (dans `.env.test` tu peux n’utiliser que `FOO` ; `_TEST` sert de surcharge dans le même fichier).

| Variable | Rôle |
|----------|------|
| `STORAGE_DRIVER` / `STORAGE_DRIVER_TEST` | `postgres`, `memory` ou `json` (défaut test sans valeur : mémoire) |
| `JSON_STORE_PATH` / `JSON_STORE_PATH_TEST` | Fichier JSON si `STORAGE_DRIVER=json` |
| `DATABASE_URL`, `POSTGRES_URL`, … (+ `_TEST`) | PostgreSQL si `STORAGE_DRIVER=postgres` : `src/config/database.ts` |
| `JWT_SECRET` / `JWT_SECRET_TEST`, etc. | Secrets et réglages : même convention `_TEST` en mode test |
| `CORS_ORIGIN` / `CORS_ORIGIN_TEST` | Origine CORS (défaut `http://localhost:5173` si absent) |
| `DB_SYNC` / `DB_SYNC_TEST` | `sync` Sequelize en dev |
| `PAYDUNYA_CALLBACK_URL` / `PAYDUNYA_CALLBACK_URL_TEST` | URL complète IPN PayDunya (`callback_url`). Si vide : `{API_PUBLIC_URL}/api/webhooks/paydunya` |

### Mode test sans PostgreSQL

**Mémoire (défaut si `MODE_CONFIG.current === 'test'` et aucun `STORAGE_DRIVER` / `STORAGE_DRIVER_TEST`)** — idéal pour tester les API, données effacées au redémarrage :

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
