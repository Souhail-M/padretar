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
