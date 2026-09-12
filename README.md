# Padretar

Pointage pour la boutique **Dar as Saada**.

Un employé pointe en scannant un QR affiché en boutique et consulte ses heures.
Un responsable voit qui est présent en temps réel, valide les nouveaux comptes
et consulte le relevé de chaque employé. Rien d'autre — et c'est délibéré.

## Démarrer

```bash
npm install
npm run dev          # Convex + Vite ensemble
```

Au premier lancement, `npx convex dev` configure le déploiement et écrit
`.env.local`. La première personne qui s'inscrit sur une instance neuve
devient admin actif automatiquement — rien à configurer. Pour forcer une
adresse précise à la place (ou en ajouter une deuxième), c'est optionnel :

```bash
npx convex env set ADMIN_EMAIL "vous@example.com,autre@example.com"
```

Tout le monde d'autre arrive en `pending` et attend une validation.

Pour que le responsable puisse récupérer son mot de passe seul (voir
« Mot de passe oublié » plus bas), une clé Resend :

```bash
npx convex env set AUTH_RESEND_KEY re_xxxxxxxx
```

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

La fiche d'un employé affiche ses totaux **par semaine** (du lundi) et **par
mois**, calculés côté serveur à partir des mêmes journées que la liste en
dessous — un total ne peut donc pas contredire les pointages affichés. Une
semaine contenant une journée sans sortie est marquée `*` : elle est
sous-évaluée, et le dire vaut mieux qu'un total de paie qui a perdu une
vacation en silence.

## Mot de passe oublié

- **Un employé** : le plus rapide reste le responsable — il ouvre sa fiche,
  saisit un nouveau mot de passe (8 caractères minimum) et le lui donne de
  vive voix. Les sessions ouvertes de cet employé sont fermées. L'employé
  peut aussi utiliser le lien « Mot de passe oublié ? » ci-dessous s'il
  préfère ne pas déranger le responsable.
- **Le responsable lui-même** : personne au-dessus de lui, donc c'est un code
  reçu par email (« Mot de passe oublié ? » sur l'écran de connexion) —
  autonome, aucune intervention du développeur nécessaire. Nécessite
  `AUTH_RESEND_KEY` (voir tableau des variables plus bas).

Filet de sécurité si Resend est en panne ou mal configuré : la fonction CLI
`resetByEmail`, injoignable depuis le navigateur.

```bash
npx convex run password:resetByEmail '{"email":"vous@example.com","password":"…"}' --prod
```

## Déploiement

Le back-end est Convex (hébergé) : il n'y a ni serveur d'API ni base de
données à installer. On ne déploie que le front, un paquet de fichiers
statiques.

**Déploiements Convex :**

| | URL |
|---|---|
| dev | `https://groovy-hare-598.eu-west-1.convex.cloud` |
| **prod** | `https://hardy-dragon-575.eu-west-1.convex.cloud` |

Les deux ont leurs propres `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`,
`ADMIN_EMAIL` (optionnel) et `AUTH_RESEND_KEY` — les clés d'un déploiement ne
valent jamais pour l'autre.

```bash
npx convex deploy            # pousse les fonctions en production
npx convex env list --prod   # vérifie les variables de production
```

**Front — GitHub Actions → GHCR → Coolify**

L'image est construite sur GitHub, pas sur le serveur. Coolify se contente de
tirer l'image et de la lancer : un déploiement ne coûte plus rien au serveur
et ne peut plus mourir en plein build.

```text
push main → Actions (typecheck, tests, docker build) → GHCR → Coolify (pull + run)
```

Image : `ghcr.io/souhail-m/padretar` — tags `latest` et le SHA du commit, pour
savoir exactement ce qui tourne. `linux/amd64`, ~26 Mo, port 80, health check
intégré.

Le paquet GHCR est **public** (il hérite de la visibilité du dépôt) et se tire
sans identifiants — vérifié. Aucun *registry credential* à configurer dans
Coolify. Si le dépôt passe en privé un jour, le paquet suivra et il faudra
ajouter une clé de registre côté Coolify.

*Côté Coolify :*

1. **New Resource → Public Repository** → `Souhail-M/padretar`, branche `main`
2. **Build Pack : `Docker Compose`** — le `docker-compose.yml` du dépôt n'a
   **pas** de clé `build:`, il pointe sur l'image GHCR. C'est ce qui déplace
   le build hors du serveur.
3. **Domaine** : le renseigner dans Coolify, qui obtient le certificat. Le
   compose n'utilise **pas** `SERVICE_FQDN_WEB_80` : cette variable magique ne
   lit pas le domaine, elle en *génère* un, et Coolify en réattribue un
   nouveau à chaque modification du compose — l'app change alors d'adresse et
   l'ancienne renvoie « 503 no available server ».
4. Health check : `/health` (déjà dans le compose et le Dockerfile).
5. **Auto Deploy** : décocher. C'est Actions qui déclenche le redéploiement,
   une fois l'image poussée — sinon Coolify redéploie avant que la nouvelle
   image existe.

*Côté GitHub — `Settings → Secrets and variables → Actions` :*

| Nom | Type | Rôle |
|---|---|---|
| `COOLIFY_WEBHOOK` | Secret | URL de redéploiement de la ressource Coolify |
| `COOLIFY_TOKEN` | Secret | Token API Coolify (`Settings → API Access`) |
| `VITE_CONVEX_URL` | **Variable** | Optionnel — surcharge le déploiement Convex visé |

Tant que les deux secrets sont absents, le workflow pousse l'image et saute
proprement l'étape de déploiement : les premiers runs restent verts pendant
que Coolify se configure.

> ⚠️ **Le piège de la migration.** `VITE_CONVEX_URL` est figé par Vite
> **pendant le build**. Maintenant que le build a quitté Coolify, le régler
> dans Coolify **n'a plus aucun effet** — il doit être fourni à GitHub
> Actions. Il est en dur dans le workflow, avec une variable de dépôt pour le
> surcharger. Ce n'est pas un secret : le navigateur s'y connecte
> directement.

*Hébergement manuel, sans Coolify :*

```bash
docker compose up -d          # tire l'image publiée
# ou en construisant localement :
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
  schema.ts      3 tables : users, badges, kiosk
  auth.ts        Convex Auth (mot de passe) + bootstrap ADMIN_EMAIL
  lib/auth.ts    requireActive / requireAdmin — toute fonction commence par là
  lib/day.ts     fuseau Paris, semaines, durées
  badges.ts      punch, historique, présence, totaux semaine/mois
  kiosk.ts       code tournant
  employees.ts   validation et fiches
  password.ts    réinitialisation (par un admin en personne, ou par email)
  ResendOTPPasswordReset.ts  code de réinitialisation envoyé par email
src/
  pages/         écrans employé puis admin/
  components/    SignIn, Layout, PunchDialog, DayList
```

## Volontairement absent

Congés · planning · export paie ·
notifications email · multi-boutique · correction manuelle des pointages ·
récapitulatif mensuel de toute l'équipe sur un seul écran (les totaux se
lisent employé par employé) · thème clair. À rajouter seulement quand la
boutique le demande vraiment.
