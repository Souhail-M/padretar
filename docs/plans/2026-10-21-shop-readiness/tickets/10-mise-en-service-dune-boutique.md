# 10 : La mise en service d'une nouvelle boutique

**What to build:** Une procédure écrite et un script qui conduit l'opérateur
depuis « une boutique a signé » jusqu'à « la boutique pointe ». Le script
pose les questions, récupère les valeurs, écrit les fichiers au bon endroit,
et refuse de continuer tant qu'un prérequis manque.

Aujourd'hui, la mise en service d'une boutique est une vingtaine d'étapes
décrites en prose dans le README, réparties entre la ligne de commande, le
tableau de bord Convex, GitHub, Coolify et un registrar de domaine. Le README
décrit la marche ; il ne la fait pas. C'est le frein le plus concret à la
vente d'une deuxième boutique.

Un premier jet de la procédure existe déjà dans `docs/ONBOARDING.md` : il
donne l'ordre des étapes, les commandes exactes et les pièges. Ce ticket le
complète — il ne part pas de zéro.

**Blocked by:** 08 — L'accueil de la boutique

**Status:** ready-for-agent

- [ ] Un document de mise en service existe, hors du README, qui suit
      l'ordre réel des opérations et donne la commande exacte de chaque
      étape. — *déjà écrit dans `docs/ONBOARDING.md` ; à compléter par les
      étapes marquées « à confirmer » et par le temps réel mesuré.*
- [ ] Le document distingue ce qui se fait une fois par projet de ce qui se
      fait une fois par boutique, et le dit explicitement.
- [ ] Le document liste les variables d'environnement attendues par le
      déploiement, avec la valeur que chacune doit prendre.
- [ ] Le document signale les pièges déjà connus : la variable figée au
      moment de la construction de l'image, le domaine régénéré à chaque
      modification, la bascule automatique à décocher, et le rappel que la
      seule voie de secours d'un responsable est l'accès shell au
      déploiement.
- [ ] Un script interactif accompagne l'opérateur : il ouvre les bonnes
      adresses, pose les questions une par une, et écrit les valeurs dans le
      bon fichier ou le bon emplacement.
- [ ] Le script refuse de continuer tant qu'un prérequis n'est pas posé, et
      dit lequel.
- [ ] Le script ne réécrit jamais une valeur par-dessus une autre sans
      confirmation explicite.
- [ ] Le script ne contient aucun secret en clair : les valeurs sensibles
      sont lues et stockées, jamais écrites dans un fichier versionné.
- [ ] Un contrôle final vérifie que la boutique répond : la page s'ouvre, la
      connexion fonctionne, un pointage peut être enregistré et relu.
- [ ] Le README renvoie vers ce document au lieu de le dupliquer, pour qu'il
      n'y ait qu'une source de vérité.
- [ ] Le temps réel de mise en service est mesuré sur une boutique réelle
      et écrit dans le document.
