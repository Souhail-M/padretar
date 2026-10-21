# 08 : L'accueil de la boutique

**What to build:** Un responsable qui arrive sur un tableau de bord vide voit
la liste de ce qu'il reste à faire pour que sa boutique tourne, dans l'ordre,
chaque étape menant à l'écran concerné. La liste disparaît quand plus rien
ne manque. Et un employé en attente voit que sa demande est bien reçue et qui
doit agir.

Aujourd'hui, le chemin d'arrivée du responsable n'existe que dans le README,
que le responsable n'a jamais lu : il arrive devant un tableau de bord vide
et rien ne lui dit quoi faire ensuite.

**Blocked by:** 02 — La file des sorties manquantes ; 05 — Créer le compte
d'un employé

**Status:** ready-for-agent

- [ ] Le tableau de bord d'un responsable dont la boutique n'est pas encore
      prête affiche les étapes restantes, dans l'ordre, chacune avec un lien
      vers l'écran qui la traite.
- [ ] Les étapes couvrent au minimum : le mot de passe de sortie du kiosque
      est-il actif, y a-t-il au moins un employé, y a-t-il eu un pointage.
- [ ] Le mot de passe de sortie du kiosque est signalé comme en place quand
      un mot de passe dédié est actif, et comme absent sinon — l'absence
      n'est jamais déduite.
- [ ] Quand plus rien ne manque, la liste disparaît entièrement : elle ne
      reste pas affichée, vide, « tout va bien ».
- [ ] La liste est un état dérivé de l'état réel de la boutique, pas une
      liste saisie : elle ne peut pas dire faux.
- [ ] Un employé ne voit jamais cette liste.
- [ ] L'écran d'attente d'un employé en attente dit qui doit agir et ce que
      l'employé peut faire en attendant, au lieu d'être une phrase et un
      bouton de déconnexion.
- [ ] L'écran d'attente se met à jour de lui-même quand la validation a lieu.
- [ ] L'écran d'accueil du responsable n'affiche pas d'étape qui ne
      concerne pas sa boutique.
- [ ] Un test vérifie qu'une boutique vide affiche toutes les étapes et
      qu'une boutique en place n'en affiche aucune.
