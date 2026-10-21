# Mise en service d'une nouvelle boutique

Padretar est vendu **une boutique par déploiement Convex** (voir
`docs/adr/0001-un-deploiement-convex-par-boutique.md`). Ce document est la
procédure : il part d'une boutique qui a signé et va jusqu'à la boutique qui
pointe. Le README résume le produit ; ce document fait la mise en service.

Il est écrit dans l'ordre réel des opérations. Les étapes marquées
**⟨à confirmer⟩** n'ont pas été rejouées depuis la création du projet : à
valider une fois sur une vraie boutique, puis à marquer comme faites.

---

## Ce qui se fait une fois par projet, une fois par boutique

| Tâche | Par projet | Par boutique |
|---|---|---|
| Code, image Docker, workflow GitHub | ✅ une fois | — |
| Dépôt Convex | — | ✅ nouveau dépôt |
| `JWT_PRIVATE_KEY`, `JWKS` | — | ✅ nouvelle paire de clés |
| `CONVEX_SITE_URL`, `SITE_URL` | — | ✅ nouveau domaine |
| `ADMIN_EMAIL` | — | ✅ adresse du responsable |
| `RETENTION_MONTHS`, `MAX_EMPLOYEES`, `CSV_EXPORT` | — | ✅ forfait vendu |
| `VITE_CONVEX_URL` (à la construction de l'image) | — | ✅ nouveau dépôt |
| Ressource Coolify, domaine, certificat | — | ✅ nouvelle ressource |

Le code est **le même** pour toutes les boutiques. Il n'y a rien à compiler
par boutique, seulement à pointer vers le bon déploiement.

---

## Étape 1 — Le dépôt Convex de la boutique

```bash
npx convex dev --once --configure=new <nom-boutique>
```

Convex crée un déploiement et affiche son URL, de la forme
`https://<nom>-<xxxx>.eu-west-1.convex.cloud`. **Noter l'URL** : c'est le
`VITE_CONVEX_URL` de l'étape 5.

Le dépôt doit être **séparé** de celui de la boutique existante : un
déploiement = un espace de données = une boutique. Ne jamais pointer deux
boutiques vers le même dépôt.

## Étape 2 — Les clés d'authentification

Le fournisseur de mot de passe a besoin de sa propre paire de clés, propre à
ce déploiement.

```bash
npx @convex-dev/auth
```

⟨à confirmer⟩ — l'outil affiche les commandes exactes à exécuter. Les
deux variables attendues par le déploiement sont :

```bash
npx convex env set JWT_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n"
npx convex env set JWKS '{"keys":[…]}'
```

> Les deux déploiements ont **leurs propres** clés. Une clé d'un déploiement ne
> vaut jamais pour l'autre : les copier d'un déploiement à l'autre casse
> l'authentification de façon difficile à diagnostiquer.

## Étape 3 — Les variables de la boutique

```bash
# L'adresse qui sert d'origine à l'authentification (le domaine de l'étape 6).
npx convex env set CONVEX_SITE_URL https://<domaine-boutique>
npx convex env set SITE_URL https://<domaine-boutique>

# Le responsable. Facultatif : le tout premier compte créé sur un
# déploiement neuf devient admin actif tout seul. À poser pour forcer une
# adresse précise, ou en إضافة une deuxième.
npx convex env set ADMIN_EMAIL "responsable@boutique.fr"

# Le forfait vendu.
npx convex env set RETENTION_MONTHS 6
npx convex env set MAX_EMPLOYEES 8
npx convex env set CSV_EXPORT true
```

`RETENTION_MONTHS`, `MAX_EMPLOYEES` et `CSV_EXPORT` sont **absents = illimité /
désactivé**. Ce ne sont pas des valeurs par défaut : une boutique sans
rétention garde tous ses pointages indéfiniment.

`CONVEX_SITE_URL` est lue par l'application (`convex/auth.config.ts`) :
c'est elle qui décide de quel domaine l'authentification accepte. Un
`SITE_URL` mal posé se voit à l'inscription, pas avant.

## Étape 4 — Pousser les fonctions

```bash
npx convex deploy
npx convex env list --prod   # relire : c'est la vérification, pas le déploiement
```

`npx convex env list` est le contrôle de l'étape 3 : si une variable manque
ou porte la valeur d'une autre boutique, c'est ici qu'on le voit.

## Étape 5 — Construire l'image pour cette boutique

Le front est une image Docker statique, publiée sur GHCR. Le
`VITE_CONVEX_URL` est **figé par Vite pendant la construction** : le changer
demande de reconstruire, pas de redémarrer.

La construction se fait dans GitHub Actions, pas sur le serveur. Il faut donc
que le workflow sache quelle URL builder. Deux possibilités :

- **Un seul dépôt pour toutes les boutiques** : la variable de dépôt
  `VITE_CONVEX_URL` ne peut servir qu'à une boutique à la fois. Il faut une
  branche par boutique, ou reconstruire à la demande.
- **Une variable par branche** : `vars.VITE_CONVEX_URL` est lisible par le
  workflow, mais la variable de dépôt est globale. ⟨à confirmer⟩ — vérifier
  comment le workflow est paramétré pour une deuxième boutique avant de
  lancer la construction.

Pousser sur `main` déclenche la construction et la publication :

```text
push main → Actions (typecheck, tests, docker build) → GHCR
```

L'image est `ghcr.io/souhail-m/padretar`, tag `latest` et tag du commit. Le
paquet est public : il se tire sans identifiants.

## Étape 6 — La ressource Coolify et le domaine

Dans Coolify : **New Resource → Public Repository** →
`Souhail-M/padretar`, branche `main`.

| Réglage | Valeur | Pourquoi |
|---|---|---|
| Build Pack | **Docker Compose** | le `docker-compose.yml` du dépôt n'a **pas** de clé `build:` — il pointe sur l'image GHCR. Remettre `build:` renverrait la construction sur le serveur. |
| Domaine | le domaine de la boutique | à renseigner **explicitement** sur la ressource. |
| Auto Deploy | **décoché** | c'est Actions qui déclenche le redéploiement, une fois l'image poussée. Sinon Coolify redémarre avant que la nouvelle image existe. |
| Health check | `/health` | déjà dans le compose et le Dockerfile. |

> ⚠️ **Le piège du domaine.** Le compose n'utilise pas `SERVICE_FQDN_WEB_80`.
> Cette variable magique ne lit pas le domaine, elle en *génère* un : à chaque
> modification du compose, Coolify lui attribue un nouveau sous-domaine et
> l'ancienne adresse répond « 503 no available server ». Le domaine se règle
> sur la ressource, pas dans le compose.

> ⚠️ **Le piège de la construction.** Poser `VITE_CONVEX_URL` dans les
> variables d'environnement de la ressource Coolify **n'a plus aucun effet** :
> le build a quitté le serveur. Il doit être fourni à GitHub Actions. Ce
> n'est pas un secret — le navigateur s'y connecte directement.

## Étape 7 — Lancer et contrôler

```bash
docker compose up -d      # ou laisser Coolify faire le tirage
curl -I https://<domaine-boutique>/health
```

Le contrôle final, dans l'ordre, sur le vrai domaine :

1. La page d'accueil s'ouvre, elle n'est pas blanche.
2. L'inscription fonctionne : **prénom**, **nom**, **email**, mot de passe.
3. Le premier compte créé devient **responsable** (admin actif) sans aucune
   configuration.
4. Le tableau de bord s'affiche : présence vide, « 0 employé actif ».
5. Un pointage fonctionne : ouvrir le kiosque, scanner le QR, lire l'heure.
6. Un export Excel se télécharge (si le forfait l'inclut) et s'ouvre.

### Le test HTTPS

`getUserMedia` n'existe que dans un **contexte sécurisé** : HTTPS, ou
`localhost`. Sur `http://192.168.x.x`, le navigateur ne refuse pas la caméra —
**l'API est absente**, donc aucune demande d'autorisation n'apparaît et le
scan semble cassé. L'application le dit et bascule sur la saisie du code.
Coolify fournit le TLS : tant que le certificat n'est pas actif, la caméra ne
marchera pas, et c'est normal.

---

## Les pièges, tous

| Piège | Symptôme | Cause |
|---|---|---|
| `VITE_CONVEX_URL` posé dans Coolify | l'app se connecte à rien | le build a quitté le serveur : c'est Actions qu'il faut alimenter |
| `SERVICE_FQDN_WEB_80` dans le compose | l'app change d'adresse à chaque modification | cette variable *génère* un domaine, elle ne le lit pas |
| `build:` remis dans le compose | la construction repart sur le serveur | le build se fait dans Actions |
| Auto Deploy laissé actif | un déploiement vert sert l'ancienne image | Coolify redémarre avant que l'image existe |
| `SITE_URL` en placeholder | l'authentification se plaint de l'origine | c'est `CONVEX_SITE_URL` que l'application lit |
| Clés JWT copiées d'un autre déploiement | l'inscription échoue de façon obscure | chaque déploiement a ses propres clés |
| `RETENTION_MONTHS` non posé | les pointages s'accumulent indéfiniment | l'absence de variable = illimité, pas = 6 mois |
| `CSV_EXPORT` non posé | l'export est refusé | l'absence = désactivé |
| Scan sur une IP en HTTP | « la caméra ne marche pas », sans invite | pas de contexte sécurisé : saisir le code à la main |

## Revenir en arrière

Si la mise en service échoue à mi-parcours :

- **Avant le premier compte créé** : supprimer le dépôt Convex et la ressource
  Coolify, et recommencer. Rien n'est perdu.
- **Après le premier compte créé** : ce compte est le responsable. Pour
  repartir de zéro en gardant une adresse précise :

  ```bash
  npx convex export --path avant-reset.zip --prod
  npx convex run superadmin:resetKeeping '{"keepEmail":"responsable@boutique.fr"}' --prod
  ```

  C'est **irréversible** : tous les autres comptes, leurs pointages, leurs
  sessions et leurs identifiants sont supprimés, et le mot de passe de sortie
  du kiosque avec. Exporter d'abord.

Le compte `superadmin` est au-dessus des responsables : il voit tout et
n'apparaît nulle part. Aucun responsable ne peut l'ouvrir, le modifier, le
désactiver ni changer son mot de passe. Il s'obtient uniquement par cette
commande, qui remet la boutique à zéro.

## Ce qui manque encore

Ce document est la procédure. Il n'est pas encore :

- **accompagné d'un script** qui pose les questions et écrit les valeurs au
  bon endroit (ticket 10 du plan du sprint 4) ;
- ** vérifié en entier** sur une boutique neuve, étape par étape, avec le temps
  réel mesuré ;
- **résolu** pour le cas de plusieurs boutiques sur un seul dépôt GitHub, où
  la variable `VITE_CONVEX_URL` est globale (étape 5).
