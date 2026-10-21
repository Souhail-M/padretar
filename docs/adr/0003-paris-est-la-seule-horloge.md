# Paris est la seule horloge

Toutes les frontières de journée, de semaine et de mois passent par un seul
module, qui raisonne en Europe/Paris, changements d'heure compris. Convex
tourne en UTC et les pointages sont stockés en UTC, mais aucune autre date
n'est calculée ailleurs : ni dans le navigateur, ni dans le code applicatif.

Une boutique française qui commence sa journée à une heure fixe : le passage
à l'heure d'été ne doit pas déplacer une journée de travail, ni faire glisser
une semaine de paie. Le prix est qu'une boutique hors de France devrait
changer ce module — ce qui n'est pas le cas aujourd'hui.
