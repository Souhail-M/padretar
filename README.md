# Padretar

Pointage et planning pour la boutique **Dar as Saada**.

Un employé pointe en scannant un QR affiché en boutique et consulte ses heures.
Un responsable voit qui est présent, valide les nouveaux comptes et pose les
créneaux de la semaine. Rien d'autre — et c'est délibéré.

## Démarrer

```bash
npm install
npm run dev          # Convex + Vite ensemble
```

Au premier lancement, `npx convex dev` configure le déploiement et écrit
`.env.local`. Ensuite, désigner le premier administrateur :

```bash
npx convex env set ADMIN_EMAIL vous@example.com
```

La personne qui s'inscrit avec cette adresse devient admin actif immédiatement.
Tout le monde d'autre arrive en `pending` et attend une validation.

| Commande | Rôle |
|---|---|
| `npm run dev` | Convex + Vite |
| `npm run build` | typecheck + build de production |
| `npm run typecheck` | app + fonctions Convex |
| `npm test` | tests des pointages et des dates |

## Comment marche le pointage

L'écran `/admin/kiosque` affiche un QR **et** les six caractères qu'il encode.
Le code est régénéré toutes les 30 secondes et expire au bout de 60 : prendre
le QR en photo ne sert donc à rien. L'employé scanne avec son téléphone, ou
tape le code s'il n'a pas de caméra — c'est la même chaîne et la même
mutation.

L'employé ne choisit jamais entrée ou sortie : le serveur la déduit de son
dernier pointage **du jour**. Une sortie oubliée laisse la journée marquée
« sortie manquante » plutôt que d'être fermée à une heure inventée.

Toutes les frontières de journée passent par `convex/lib/day.ts` (fuseau
Europe/Paris, changements d'heure compris). Convex tourne en UTC : ne pas
calculer de date ailleurs.

## Déploiement

Le back-end est Convex (hébergé) : il n'y a ni serveur d'API ni base de
données à installer. On ne déploie que le front, un paquet de fichiers
statiques.

**Déploiements Convex :**

| | URL |
|---|---|
| dev | `https://groovy-hare-598.eu-west-1.convex.cloud` |
| **prod** | `https://hardy-dragon-575.eu-west-1.convex.cloud` |

Les deux ont leurs propres `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` et
`ADMIN_EMAIL` — les clés d'un déploiement ne valent jamais pour l'autre.

```bash
npx convex deploy            # pousse les fonctions en production
npx convex env list --prod   # vérifie les variables de production
```

**Front — Coolify :**

1. **New Resource → Public/Private Repository** → `Souhail-M/padretar`, branche `main`.
2. **Build Pack : `Dockerfile`.** (Pas Nixpacks, pas Docker Compose — le
   `docker-compose.yml` du dépôt ne sert qu'à un hébergement manuel.)
3. **Environment Variables** — ajouter, et **cocher « Build Variable »** :

   ```
   VITE_CONVEX_URL=https://hardy-dragon-575.eu-west-1.convex.cloud
   ```

   C'est le point qui casse tout si on l'oublie : Vite fige cette valeur
   **au moment du build**, donc une variable seulement runtime n'a aucun
   effet. Le build échoue exprès dans ce cas, avec le message qui explique
   quoi cocher, plutôt que de livrer une app qui ne se connecte à rien.
4. **Port : `80`.** Health check : `/health`.
5. **Domaine** — renseigner le domaine dans Coolify, qui obtient le
   certificat Let's Encrypt tout seul.
6. Déployer. Puis pointer `SITE_URL` sur ce domaine :
   `npx convex env set --prod SITE_URL https://votre-domaine`

Hébergement manuel, sans Coolify :

```bash
docker compose up -d --build       # lit VITE_CONVEX_URL de l'environnement
# ou :
docker build --build-arg VITE_CONVEX_URL=https://hardy-dragon-575.eu-west-1.convex.cloud -t padretar .
docker run -d -p 8080:80 padretar
```

> ⚠️ **HTTPS obligatoire pour le scan.** `getUserMedia` n'existe que dans un
> *secure context* : HTTPS, ou `localhost`. Sur `http://192.168.x.x`, le
> navigateur ne refuse pas la caméra — **l'API est absente**, donc aucune
> demande d'autorisation n'apparaît et le scan semble cassé. L'app le dit
> maintenant explicitement et bascule sur la saisie du code. Coolify fournit
> le TLS : une fois déployé derrière son domaine, la caméra s'ouvre.

> ⚠️ `SITE_URL` en production vaut `https://padretar.local`, un
> **placeholder**. Une fois le vrai domaine connu :
> `npx convex env set --prod SITE_URL https://votre-domaine`

## Structure

```
convex/
  schema.ts      4 tables : users, badges, shifts, kiosk
  auth.ts        Convex Auth (mot de passe) + bootstrap ADMIN_EMAIL
  lib/auth.ts    requireActive / requireAdmin — toute fonction commence par là
  lib/day.ts     fuseau Paris, semaines, durées
  badges.ts      punch, historique, présence
  kiosk.ts       code tournant
  shifts.ts      créneaux
  employees.ts   validation et fiches
src/
  pages/         écrans employé puis admin/
  components/    SignIn, Layout, PunchDialog, DayList
```

## Volontairement absent

Réinitialisation de mot de passe · congés · planning récurrent · export paie ·
notifications email · multi-boutique · correction manuelle des pointages ·
thème clair. À rajouter seulement quand la boutique le demande vraiment.
