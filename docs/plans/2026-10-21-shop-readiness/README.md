# Sprint 4 — Rendre Padretar livrable à une boutique

Plan du 21 octobre 2026, sur l'état de `main` au commit `f612719`.

| Document | Ce qu'il contient |
|---|---|
| [`STATUS.md`](./STATUS.md) | Où en est le produit : position dans le sprint, état des accueils, trou restants |
| [`SPEC.md`](./SPEC.md) | La spécification du sprint : problème, solution, histoires d'utilisateur, décisions |
| [`tickets/`](./tickets) | Les treize tickets, un par fichier, avec leurs dépendances |
| [`docs/ONBOARDING.md`](../../ONBOARDING.md) | La mise en service d'une nouvelle boutique (déjà écrite) |
| [`GLOSSARY.md`](../../GLOSSARY.md) | Le vocabulaire du domaine |
| [`docs/adr/`](../../adr) | Les décisions qui ne se défont pas |

## Le plan en une phrase

Le produit est **juste** pour une boutique et **pas livrable** : la mise en
service d'une nouvelle boutique est un rituel oral, le responsable ne voit pas
les sorties manquantes à corriger, et l'employé ne peut pas vérifier sa paie.

## Les treize tickets

| # | Ticket | Dépend de |
|---|---|---|
| 01 | Le module du relevé (préfacteur) | — |
| 02 | La file des sorties manquantes | 01 |
| 03 | Les totaux de l'employé | 01 |
| 04 | Changer son mot de passe | — |
| 05 | Créer le compte d'un employé | — |
| 06 | Le journal des corrections | 01 |
| 07 | Le journal de la vie des comptes | 06 |
| 08 | L'accueil de la boutique | 02, 05 |
| 09 | Décider du pointage sans écran kiosque | — |
| 10 | La mise en service d'une nouvelle boutique | 08 |
| 11 | La purge de rétention tient la charge | — |
| 12 | Le lint devient un garde-fou en CI | — |
| 13 | L'export par plage de dates | — |

## Par où commencer

**Le front de travail est large** : cinq tickets (01, 04, 05, 09, 11, 12)
ne dépendent de rien et peuvent partir en parallèle. Le 01 d'abord, parce
que les tickets 02, 03 et 06 en dépendent tous les trois.

**Le plus urgent** est le 10 : sans mise en service écrite, une deuxième
boutique coûte une journée entière. Le document existe déjà ; il reste le
script et la vérification.

**Le plus rentable** est le 03 : le calcul des totaux existe déjà côté
serveur, l'employé ne le voit simplement pas. C'est quelques lignes.

**Le plus risqué** est le 09 : il ne produit pas de code, il produit une
décision. Il faut le trancher avant d'engager quoi que ce soit sur le
pointage hors connexion.
