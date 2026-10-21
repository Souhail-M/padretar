# Sprint 4 — Rendre Padretar livrable à une boutique

Spécification écrite le 21 octobre 2026, à partir de l'état de `main` au
commit `f612719`. Vocabulaire : voir `GLOSSARY.md` à la racine. Décisions
structurantes : voir `docs/adr/`.

## Problem Statement

Padretar fonctionne. Il est déployé, testé, et il calcule des heures justes.
Mais il n'est **pas livrable**.

Pour une seule boutique, à qui l'on donne accès aujourd'hui, tout va bien.
Pour une deuxième boutique, ou pour une boutique dont le personnel n'a pas
d'email, Padretar ne sait pas faire.

Trois familles de problèmes, du plus grave au moins grave.

**La mise en service d'une boutique est un rituel oral.** Le README décrit une
vingtaine d'étapes — variables Convex, clés JWT, `SITE_URL`, image Docker
reconstruite avec le bon `VITE_CONVEX_URL`, ressource Coolify, domaine,
certificat, variables du forfait — mais rien n'est scripté, rien n'est vérifié,
et rien n'est dans l'application. Le responsable qui a développé Padretar
connaît la marche ; celui qui reprend le projet, ou qui vend une deuxième
boutique, ne l'a pas. C'est le frein le plus concret à la vente.

**Le responsable ne voit pas ce qu'il doit corriger.** Une sortie oubliée
produit une journée incomplète, signalée par une étoile dans les totaux et
par une mention dans l'export — mais introuvable. Le seul moyen de la
découvrir est d'ouvrir la fiche de chaque employé et de faire défiler son
relevé. La file de travail la plus importante de la paie n'existe pas à l'écran.

**L'employé ne peut pas vérifier sa paie.** Le README promet que l'employé
« consulte ses heures ». Il voit les sept derniers jours et un cumul depuis
toujours. Ni sa semaine, ni son mois — que le serveur calcule déjà pour le
responsable. Et il ne peut pas changer son mot de passe, alors que la fiche
employé lui promet explicitement qu'il le pourra.

S'y ajoutent trois manques qui ne sont pas des forgets mais des décisions
jamais prises : le responsable ne peut pas créer le compte d'un employé, le
pointage n'est possible qu'avec un écran kiosque, et aucune trace ne conserve
qui a corrigé quel pointage.

## Solution

Fermer l'écart entre « ça marche » et « c'est livrable », sur les trois axes.

**Un chemin de mise en service écrit, scripté et vérifiable.** Un document de
mise en service qui suit l'ordre réel des opérations, avec les commandes
exactes et les points de contrôle, plus un script interactif qui accompany
l'opérateur — il ouvre les bonnes URL, lui demande les valeurs, les écrit au
bon endroit. Le README cesse d'être le seul document qui décrit la mise en
service : il devient un résumé, et le document devient la procédure.

**Un accueil dans l'application.** Un responsable qui arrive sur un tableau
de bord vide voit ce qu'il reste à faire, dans l'ordre, et la liste disparaît
quand la boutique tourne. L'employé qui attend une validation voit qui doit
agir. Le rapport entre le README et l'écran cesse d'exister.

**Les heures visibles là où elles se lisent.** L'employé voit sa semaine et
son mois, comme le responsable. Le responsable voit la file des journées à
compléter, et sait qui a corrigé quoi.

## User Stories

### Mise en service d'une boutique

1. En tant qu'opérateur, je veux une procédure de mise en service qui suit
   l'ordre réel des opérations, afin de ne pas dépendre de la mémoire de
   quelqu'un.
2. En tant qu'opérateur, je veux un script qui me pose les questions et écrit
   les valeurs au bon endroit, afin de ne pas copier-coller entre quatre
   consoles.
3. En tant qu'opérateur, je veux que le script refuse de continuer tant que
   les prérequis ne sont pas posés, afin de ne pas découvrir l'erreur au
   moment de la mise en production.
4. En tant qu'opérateur, je veux la liste exacte des variables d'environnement
   d'un déploiement, afin de ne rien inventer.
5. En tant qu'opérateur, je veux savoir quelle valeur le système attend à
   chaque étape, afin de ne pas inverser deux clés.
6. En tant qu'opérateur, je veux un contrôle final qui vérifie que la
   boutique répond sur son domaine, afin de valider la mise en service sans
   ouvrir l'application à la main.
7. En tant que vendeur, je veux connaître le temps réel de mise en service
   d'une nouvelle boutique, afin de chiffrer une vente honnêtement.
8. En tant qu'opérateur, je veux que la documentation distingue ce qui se fait
   une fois par boutique de ce qui se fait une fois par projet, afin de
   recommencer le même travail deux fois.
9. En tant qu'opérateur, je veux un moyen de revenir en arrière si la mise en
   service échoue à mi-parcours, afin de ne pas laisser une boutique à moitié
   configurée.
10. En tant qu'opérateur, je veux que la procédure mentionne les pièges
    connus, afin de ne pas les redécouvrir.

### Accueil du responsable

11. En tant que responsable, je veux voir, à mon arrivée, la liste des étapes
    restantes pour que ma boutique soit opérationnelle, afin de ne pas avoir à
    demander de l'aide.
12. En tant que responsable, je veux que cette liste disparaisse quand tout
    est en place, afin de savoir que je peux laisser l'application tranquille.
13. En tant que responsable, je veux que la liste me dise où aller pour chaque
    étape, afin de ne pas chercher.
14. En tant que responsable, je veux savoir si mon mot de passe de sortie de
    kiosque est actif, afin de ne pas laisser mon mot de passe de compte
    protéger un écran de boutique.
15. En tant que responsable, je veux être averti quand un compte attend ma
    validation, afin de ne pas bloquer un employé.
16. En tant que responsable, je veux créer le compte d'un employé qui n'a pas
    d'email, afin de pouvoir équiper toute mon équipe.
17. En tant que responsable, je veux donner un mot de passe initial à cet
    employé, afin qu'il puisse se connecter tout de suite.
18. En tant que responsable, je veux que le compte créé soit déjà validé, afin
    de ne pas avoir à le valider moi-même juste après l'avoir créé.
19. En tant que responsable, je veux que la fiche de l'employé créé soit
    complète dès le départ, afin de ne pas y revenir.
20. En tant que responsable, je veux une limite claire sur le nombre de
    comptes que je peux créer, afin de comprendre pourquoi une création est
    refusée.
21. En tant que responsable, je veux voir le journal des actions sur la vie
    des comptes, afin de savoir qui a validé, désactivé ou modifié quoi.
22. En tant que responsable, je veux que le journal soit en lecture seule,
    afin qu'il serve de preuve et non d'outil.

### Accueil de l'employé

23. En tant qu'employé, je veux que l'écran d'attente me dise qui doit agir,
    afin de savoir que ma demande est reçue.
24. En tant qu'employé, je veux que l'écran d'attente me dise ce que je peux
    faire en attendant, afin de ne pas rester bloqué.
25. En tant qu'employé, je veux que mon compte soit validé sans que j'aie à
    rafraîchir la page, afin de ne pas croire à un échec.
26. En tant qu'employé, je veux choisir mon poste à l'inscription, afin que
    le responsable n'ait pas à le demander.
27. En tant qu'employé, je veux pouvoir corriger mon nom moi-même, afin de
    ne pas dépendre du responsable pour une faute de frappe.
28. En tant qu'employé, je veux changer mon propre mot de passe, afin que
    celui que le responsable m'a donné ne reste pas actif.
29. En tant qu'employé, je veux que changer mon mot de passe ferme mes autres
    sessions, afin qu'une personne qui a vu l'ancien mot de passe n'y entre
    plus.
30. En tant qu'employé, je veux qu'un mot de passe trop court soit refusé
    avec une raison claire, afin de savoir quoi corriger.
31. En tant qu'employé, je veux que la liste de mes pointages se mette à jour
    quand je pointe, afin de ne pas avoir à recharger.

### Les heures

32. En tant qu'employé, je veux voir mes heures de la semaine en cours, afin
    de vérifier ma paie.
33. En tant qu'employé, je veux voir mes heures du mois en cours, afin de
    vérifier ma paie.
34. En tant qu'employé, je veux basculer entre semaine et mois, comme le
    responsable, afin de lire mes heures de la même façon que lui.
35. En tant qu'employé, je veux qu'une période incomplète soit signalée, afin
    de savoir que mon total est sous-estimé.
36. En tant qu'employé, je veux que mes totaux et mes pointages ne puissent
    pas se contredire, afin de faire confiance à l'écran.
37. En tant que responsable, je veux voir la liste des journées où une sortie
    manque, pour toute la boutique, afin de savoir ce qu'il reste à corriger.
38. En tant que responsable, je veux que cette liste soit ordonnée de la plus
    ancienne à la plus récente, afin de traiter d'abord ce qui bloque la paie.
39. En tant que responsable, je veux que cette liste indique l'employé et la
    date, afin de savoir qui et quand.
40. En tant que responsable, je veux aller de cette liste à la fiche de
    l'employé, afin de corriger sans chercher.
41. En tant que responsable, je veux que la liste se vide quand j'ai tout
    corrigé, afin de savoir que c'est fini.
42. En tant que responsable, je veux qu'une journée incomplète soit distinguée
    d'une journée sans aucun pointage, afin de ne pas chercher du travail
    inexistant.
43. En tant que responsable, je veux un relevé mensuel de toute l'équipe sur
    un seul écran, afin de préparer la paie, et je l'ai refusé parce que je
    lis les totaux employé par employé.

### Le journal

44. En tant que responsable, je veux voir qui a corrigé un pointage, quand, et
    vers quoi, afin de répondre à une contestation.
45. En tant que responsable, je veux voir les actions de la vie des comptes,
    afin de savoir qui a validé ou désactivé un compte.
46. En tant que responsable, je veux que le journal soit consultable depuis la
    fiche de l'employé concerné, afin de ne pas chercher ailleurs.
47. En tant que responsable, je veux que le journal ne soit jamais modifiable,
    afin qu'il soit une preuve.
48. En tant que responsable, je veux que le journal survive à la désactivation
    d'un compte, afin que l'historique reste complet.
49. En tant que responsable, je veux pas avoir à me soucier de qui écrit dans
    le journal, parce que l'écriture est automatique et ne peut pas être
    oubliée.

### Pointage

50. En tant qu'employé d'une boutique sans écran kiosque dédié, je veux
    pouvoir pointer quand même, afin de ne pas être bloqué par du matériel.
51. En tant que responsable d'une boutique sans écran kiosque dédié, je veux
    un moyen de mettre le pointage à disposition de mes employés, afin que le
    kiosque ne soit pas obligatoire.
52. En tant qu'employé, je veux que le pointage fonctionne sans connexion
    réseau puis se synchronise, afin de pointer dans une boutique au réseau
    instable.
53. En tant que responsable, je veux qu'un pointage hors connexion soit
    horodaté au moment du scan et non à la synchronisation, afin que l'heure
    soit juste.

## Implementation Decisions

### Un module unique pour la lecture du relevé

Le regroupement des pointages en journées, le calcul des semaines et des
mois, et la détection des journées incomplètes forment **un seul module**,
hors des points d'entrée Convex. Il expose une interface courte : un groupe
de pointages en entrée, des journées, des périodes et un signal
« incomplet » en sortie.

Pourquoi : aujourd'hui la règle de regroupement vit dans le fichier des points
d'entrée, où elle est inaccessible aux autres appelants. C'est pourquoi
l'employé ne voit pas ses totaux, et pourquoi il n'existe pas de file des
sorties manquantes — non pas parce que la règle est difficile, mais parce que
personne d'autre ne peut l'appeler. En la sortant, trois fonctionnalités
deviennent des appels et non des réécritures.

Le module vit avec les autres modules purs déjà présents dans le projet, à côté
de celui qui porte l'horloge de Paris et de celui qui porte les périodes
d'export.

### L'invariant : un total ne contredit jamais un pointage

Toute période affichée est dérivée des mêmes journées que la liste affichée
en dessous. Une période qui contient une journée incomplète est marquée comme
sous-évaluée, et l'écart est visible. Un total qui contredit ses pointages
est un bug, pas un cas limite.

### Le pointage est un enregistrement, pas un état

Un pointage est un fait daté, jamais un booléen « présent ». L'état de
présence est une lecture des derniers pointages du jour. Un jour qui se
termine sans sortie reste un jour incomplet — il n'est jamais refermé à une
heure inventée.

### Un seul point d'entrée pour créer un compte

Le responsable peut créer un compte, et le système en crée deux : un compte en
attente, et un compte validé. La validation d'un compte créé par le
responsable est immédiate, sinon le mécanisme de validation n'aurait plus de
sens. L'email reste obligatoire comme identifiant de connexion : c'est lui qui
porte le mot de passe dans le système d'authentification, et inventer un
identifiant de substitution rendrait la connexion moins lisible, pas plus.

### Le changement de mot de passe par soi-même passe par une action

Changer son propre mot de passe exige de connaître l'ancien. La vérification
vient du fournisseur d'authentification, pas d'une comparaison de texte. Les
sessions ouvertes par l'ancien mot de passe sont fermées, comme lors d'une
réinitialisation par le responsable.

### Le journal est écrit par le module, jamais par l'appelant

Un module d'écriture unique reçoit un acte et l'enregistre. Aucun point
d'entrée ne se contente d'appeler « journaliser » : c'est le module de la
mutation qui le fait, avant de rendre la main. Une action qu'on oublie
d'enregistrer est donc impossible, et le journal ne peut pas être désactivé.

### Le journal est append-only

Un acte est écrit, jamais modifié ni supprimé. Il survit à la désactivation
du compte concerné. Aucun de ses champs n'est modifiable par l'interface.

### L'accueil est un état dérivé, pas une liste saisie

L'écran d'accueil calcule ce qui manque à partir de l'état réel : un mot de
passe de sortie de kiosque est-il actif, y a-t-il au moins un employé validé,
y a-t-il eu un pointage. Il n'est rien stocké, et il ne peut pas mentir sur
l'état de la boutique.

### L'accueil disparaît

Quand plus rien ne manque, l'écran ne montre plus rien. Une liste de
toujours visible apprend au responsable à l'ignorer.

### Le pointage hors ligne est une décision, pas une implémentation

Le pointage hors connexion n'est pas dans le périmètre de ce sprint. Il pose
une question qui engage la règle même du produit : l'heure d'un pointage
enregistré hors ligne est celle du scan, mais sa validation par le serveur
arrive plus tard. C'est l'objet du ticket de décision, pas du ticket
d'implémentation.

### La mise en service est documentée avant d'être scriptée

Le document de mise en service est la source de vérité. Le script l'exécute.
Dans cet ordre, parce qu'un script écrit avant la procédure encode une
procédure qui n'existe pas encore.

## Testing Decisions

**Ce qui fait un bon test ici** : il vérifie un comportement observable par
la personne qui utilise l'application — ce qu'elle voit, ce qu'elle peut
faire, ce qu'elle ne peut pas faire. Il ne vérifie ni le nom d'une fonction
interne, ni la forme d'un objet retourné, ni le nombre de requêtes faites.

**Ce qui est déjà la référence** : le dépôt teste déjà largement par le
comportement, à travers les points d'entrée Convex, avec un vrai contexte
Convex de test. Les scénarios existants — un compte en attente ne peut rien
faire, une sortie manquante est signalée et non inventée, un employé ne peut
pas lire le relevé d'un autre, un compte désactivé n'a pas de session — sont
la norme à reproduire, pas un style différent à inventer.

**Ce qui sera testé** :

- *Le module du relevé* : une journée sans sortie est incomplète ; deux
  pointages le même jour s'additionnent ; une semaine à cheval sur deux mois
  est comptée entière ; une journée incomplette rend sa semaine et son mois
  sous-estimés ; un pointage juste après minuit à Paris appartient à son
  propre jour et pas à son jour UTC.
- *La file des sorties manquantes* : elle ne liste que des journées ayant un
  pointage d'entrée sans sortie correspondante ; elle ne liste pas une
  journée sans aucun pointage ; elle est ordonnée ; elle ne montre pas le
  superadmin ; elle est vide quand tout est correct.
- *Les totaux de l'employé* : la semaine et le mois renvoyés par le point
  d'entrée de l'employé sont les mêmes que ceux du responsable pour la même
  personne ; un total ne dépasse jamais la somme des journées affichées.
- *La création de compte par le responsable* : le compte créé est validé
  immédiatement ; il peut se connecter avec le mot de passe donné ; le
  responsable ne peut pas créer plus de comptes que le forfait n'en autorise ;
  un employé ne peut pas créer de compte ; le superadmin reste invisible.
- *Le changement de mot de passe par soi-même* : l'ancien mot de passe
  cesse de fonctionner ; le nouveau fonctionne ; les sessions ouvertes par
  l'ancien sont fermées ; un mot de passe trop court est refusé ; un employé
  ne peut pas changer le mot de passe d'un autre.
- *Le journal* : corriger un pointage écrit un acte ; l'acte dit qui, quand,
  et quoi ; valider, désactiver, changer un rôle ou réinitialiser un mot de
  passe écrivent un acte ; un acte ne peut être ni modifié ni supprimé ; le
  journal reste lisible après la désactivation du compte concerné.
- *L'accueil* : une boutique vide affiche toutes les étapes ; une boutique
  en place n'affiche rien ; chaque étape mène à l'écran concerné.
- *La purge de rétention* : une boutique très peuplée ne laisse pas de
  backlog — la purge traite un lot borné mais répété, et une journée entière
  de pointages disparaît en un passage.

**Ce qui ne sera pas testé** : l'interface visuelle elle-même, au-delà de ce
qui est vérifiable sans navigateur. Le rendu des écrans reste couvert par la
relecture ; le comportement qu'ils exposent est couvert par les tests des
points d'entrée.

## Out of Scope

- **Les congés.** Le README les exclut, la boutique ne les a pas demandés.
- **Le planning.** Idem, et il a été retiré du produit en cours de route.
- **Les notifications.** Aucun email, aucune notification poussée. Un compte
  en attente apparaît sur le tableau de bord du responsable, rien de plus.
- **Le multi-boutique.** Une boutique, un déploiement. Voir l'ADR 0001.
- **Le récapitulatif mensuel de toute l'équipe sur un seul écran.** Les
  totaux se lisent employé par employé, et l'export fait le tour. C'est un
  choix, pas un oubli.
- **Le thème clair.** L'application est sombre, en monochrome, la couleur
  n'ayant droit qu'à l'entrée et à la sortie.
- **La réinitialisation de mot de passe par email.** Voir l'ADR 0002. Elle
  est explicitement refusée, pas repoussée.
- **Le pointage hors connexion.** Le ticket de décision de ce sprint prépare
  le sujet ; l'implémentation n'est pas dans ce sprint.
- **La refonte du kiosque.** L'écran kiosque reste ce qu'il est : un écran
  verrouillé qui affiche un QR et un code.
- **Le multi-tenant.** Une boutique, un déploiement.

## Further Notes

**Ce qui a été vérifié avant d'écrire cette spécification** : le typecheck
passe, les 68 tests passent, et le lint donne quatre avertissements sans
erreur. Aucun fichier applicatif n'a été modifié pour l'écrire.

**La suite du plan** : douze tickets, un par fichier, dans `tickets/`, chacun
traversant toutes les couches et livrable seul. Le premier est un
préfacteur : il ne change aucun comportement visible, il rend possible que
les trois tickets suivants tiennent debout sans dupliquer la règle de
regroupement.

**Le glossaire** a été écrit en même temps, parce que plusieurs de ces
tickets butent sur des mots que le code et l'interface utilisaient
diversement — « vacation », « sortie manquante », « poste », « responsable ».
