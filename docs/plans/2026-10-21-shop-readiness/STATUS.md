# Où en est Padretar

Relevé au 21 octobre 2026, sur `main` (32 commits, du 9 août au 25 septembre).
`npm run typecheck` passe, `npm test` passe (68 tests, 3 fichiers),
`npx oxlint` donne 4 avertissements et 0 erreur.

## Où en est le sprint

Le dépôt ne suit **aucun** traceur : pas de `.planning/`, pas de tickets,
pas de `CHANGELOG`, pas d'étiquettes, une seule branche `main`. Le sprint se
reconstitue donc par l'histoire git, en grappes de commits.

| Sprint | Période | Sujet | Livré |
|---|---|---|---|
| 0 | 9 août | Rendre déployable | Docker, nginx, GHCR, Coolify, HTTPS, caméra, rotation du code |
| 1 | 10–18 août | Rendre juste | Un scan = un pointage, relevé en lignes, verrou du kiosque, mot de passe oublié, totaux semaine/mois |
| 2 | 30 août – 14 sept | Rendre exploitable | Mot de passe du kiosque, amorçage admin, forfait, export paie Excel, bannière de reconnexion, corrections par le responsable |
| 3 | 25 sept | Rendre vendable et resserrer | Export de périodes choisies, budget de lecture, superadmin invisible, prénom + nom exigés, suppression du reset par email |
| **4** | **à faire** | **Rendre livrable à une boutique** | **le plan de ce dossier** |

L'état est donc : **sprint 3 clos, sprint 4 à démarrer**. Quatre semaines se
sont écoulées depuis le dernier commit.

Ce que le sprint 3 dit bien : la dernière modification est une **suppression**
(l'effacement du reset par email et du module Resend). Le produit se resserre,
il ne s'étend pas. Le périmètre « volontairement absent » du README — congés,
planning, notifications, multi-boutique, récapitulatif d'équipe, thème clair —
n'est pas un oubli, c'est une décision assumée et documentée.

## Ce que le sprint 4 doit réparer

Le sprint 3 a rendu le produit **correct pour une boutique**. Il ne l'a pas
rendu **livrable**. L'écart se situe sur deux plans.

### 1. L'accueil n'existe pas, ni pour la boutique ni pour l'employé

Trois accueils distincts, trois maturités différentes.

**Le responsable de la boutique** — c'est l'accueil commercial, et c'est le
plus important. Le chemin existe et fonctionne : premier compte = admin actif
automatiquement, ou `ADMIN_EMAIL` forcé ; ensuite mot de passe de sortie du
kiosque, ouverture du kiosque, validation des employés, définition de leur
poste. Mais **tout ce chemin n'existe que dans le README**, que le responsable
n'a jamais lu. Il arrive sur un tableau de bord vide : zéro employé, zéro
kiosque, aucune indication de ce qu'il doit faire ensuite. L'application ne
lui dit rien.

**L'employé** — il s'inscrit lui-même avec son prénom, son nom et son email,
arrive sur l'écran « en attente », attend que le responsable le valide. Ça
marche, et la validation le chasse de l'écran tout seul. Deux trous :
- `poste` n'est jamais demandé à l'inscription ; c'est le responsable qui doit
  ouvrir chaque fiche après coup, une par une.
- L'écran d'attente est un cul-de-sac : il n'affiche ni l'état de la
  demande, ni qui doit agir, ni quoi faire ensuite. L'employé ne peut pas
  non plus corriger son propre nom — la fiche le lui dit « demandez à un
  responsable ».

**La nouvelle boutique** — c'est l'accueil opérationnel, et c'est le plus
coûteux. Le README le décrit : un déploiement Convex par boutique, des
variables `JWT_PRIVATE_KEY` / `JWKS` / `SITE_URL` / `ADMIN_EMAIL`, une image
Docker reconstruite avec le `VITE_CONVEX_URL` de la nouvelle boutique, une
ressource Coolify, un domaine, un certificat, les variables du forfait. Rien
de tout cela n'est scripté ni vérifié. Chaque vente est une rituelle manuelle
d'une vingtaine d'étapes, dont une partie se passe dans des tableaux de bord
tiers. **C'est le frein le plus concret à la vente du produit** — et il est
entièrement contenu dans de la prose.

### 2. Des fonctions annoncées ne sont pas finies

L'écart le plus visible est entre le README et l'écran.

**« L'employé pointe et consulte ses heures. »** L'employé ne voit ni sa
semaine ni son mois. Le serveur sait déjà les calculer — `badges.forEmployee`
renvoie jours, semaines et mois — mais `badges.mine` ne renvoie que les jours.
Du côté employé, la page d'accueil affiche les **7 derniers jours** et le
profil affiche un **cumul depuis toujours**. Le responsable, lui, voit bien
les semaines et les mois. Le même calcul, deux écrans, deux niveaux de
détail, et le screen le plus pauvre est celui qui a le plus besoin de vérifier
sa paie.

**« Une sortie oubliée laisse la journée marquée "sortie manquante". »** La
journée est bien marquée, et même signalée d'une étoile dans les totaux, et
l'export la signale aussi. Mais **personne ne la voit venir** : il n'existe
aucune liste des journées à corriger. Pour trouver une sortie manquante, le
responsable doit ouvrir la fiche de chaque employé et faire défiler son
relevé. La file de travail la plus importante de la paie n'existe pas.

**« L'employé change son mot de passe s'il le souhaite. »** Le texte de la
fiche le promet — « vous donnez le nouveau mot de passe à l'employé, qui le
change ensuite s'il le souhaite » — et **aucun écran ne le permet**. Ni
l'employé, ni le responsable ne peut changer un mot de passe autrement qu'en
le réinitialisant. La promesse de l'interface n'est pas tenue.

**« Un employé crée son compte lui-même. »** Vrai, et c'est bien. Mais c'est
la seule voie : **le responsable ne peut pas créer un compte**. Une boutique
dont le personnel n'a pas d'email personnel, ou dont le téléphone de travail
est verrouillé, ne peut pas être mise en service du tout.

## Les autres trous, par ordre de gravité

| # | Trou | Où | Gravité |
|---|---|---|---|
| 1 | Aucune trace des actions du responsable | `convex/schema.ts` — pas de table d'audit | Élevée : « qui a corrigé ce pointage ? » est sans réponse |
| 2 | La file « sorties manquantes » n'existe pas | `convex/badges.ts` | Élevée : la paie dépend d'une donnée invisible |
| 3 | Pointage impossible sans écran kiosque | `convex/kiosk.ts` — `rotate` et `current` sont admin | Élevée : une boutique sans écran dédié ne peut pas pointer |
| 4 | L'employé ne peut pas changer son mot de passe | aucun écran | Moyenne : promesse non tenue |
| 5 | Le responsable ne peut pas créer un compte | `convex/employees.ts` | Moyenne : bloque une boutique entière |
| 6 | La purge de rétention sature en silence | `convex/badges.ts` `purgeOld` — 500 par jour | Moyenne : au-delà de ~250 employés la rétention cesse de fonctionner |
| 7 | Le lint ne tourne pas en CI | `.github/workflows/build-and-deploy.yml` | Faible : 4 avertissements attendent, aucun garde-fou |
| 8 | Le forfait n'est jamais expliqué | `convex/plan.ts` | Faible : `MAX_EMPLOYEES` échoue sans dire comment résoudre |

## Ce qui est explicitement hors périmètre

Le README le dit, et c'est bien dit : congés, planning, notifications email,
multi-boutique, récapitulatif mensuel de toute l'équipe sur un seul écran,
thème clair. Rien de tout cela n'est dans le plan du sprint 4, et le
« récapitulatif d'équipe » en particulier reste un choix : les totaux se lisent
employé par employé, l'export fait le tour.

## Ce que le plan du sprint 4 change

Douze tickets, dans `tickets/` (format « tracer bullet » : chaque ticket
traverse toutes les couches et se livre seul). Un préfacteur d'abord, puis
deux correctifs de l'accueil, deux briques de compte, le journal d'audit, la
file de correction, l'accueil de première utilisation, et la mise en service
d'une nouvelle boutique.

Le point le plus structurant : le **préfacteur** qui sort le calcul des
journées, des semaines et des mois de `convex/badges.ts` vers un module
propre. C'est ce qui rend possibles d'un coup la file des sorties manquantes,
les totaux de l'employé et le journal d'audit, sans que trois copies de la
même règle de regroupement coexistent.
