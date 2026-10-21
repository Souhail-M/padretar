# 02 : La file des sorties manquantes

**What to build:** Le responsable voit, sur son tableau de bord, la liste des
journées où une sortie manque — pour toute la boutique, pas seulement pour un
employé qu'il aurait à deviner. Chaque ligne dit l'employé et la date, et
mène à sa fiche. La liste se vide quand tout est corrigé.

Aujourd'hui cette information existe : une journée sans sortie est marquée
« incomplète », signalée par une étoile dans les totaux et par une mention
dans l'export. Elle est juste introuvable. Le seul moyen de la découvrir est
d'ouvrir la fiche de chaque employé et de faire défiler son relevé.

**Blocked by:** 01 — Le module du relevé

**Status:** ready-for-agent

- [ ] Le tableau de bord du responsable affiche une section « à corriger »
      qui ne liste que les journées ayant un pointage d'entrée sans sortie
      correspondante.
- [ ] La liste n'affiche aucune journée sans aucun pointage : une journée
      sans pointage n'est pas une journée incomplète, elle n'a jamais existé.
- [ ] La liste est ordonnée de la plus ancienne à la plus récente : ce qui
      bloque la paie d'abord.
- [ ] Chaque ligne indique l'employé concerné et la date de la journée.
- [ ] Chaque ligne mène à la fiche de l'employé, au bon endroit.
- [ ] La section disparaît quand il n'y a rien à corriger, et ne dit pas
      « tout va bien » à sa place.
- [ ] Un employé ne voit pas cette liste, ni par la page ni en lui donnant
      directement l'adresse.
- [ ] Le compte superadmin n'apparaît jamais dans cette liste, même s'il a
      pointé.
- [ ] Une journée corrigée par le responsable disparaît de la liste sans
      qu'aucune action manuelle de rafraîchissement soit nécessaire.
- [ ] Le test vérifie ce que le responsable voit, et non la forme de ce que
      le point d'entrée renvoie.
