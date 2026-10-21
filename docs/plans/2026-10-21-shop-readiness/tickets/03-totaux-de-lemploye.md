# 03 : Les totaux de l'employé

**What to build:** L'employé voit ses heures de la semaine et du mois, comme
le responsable. Il bascule entre les deux. Une période incomplète est
signalée, pour qu'il sache que son total est sous-estimé. Et ses totaux ne
peuvent pas contredire ses pointages.

Aujourd'hui l'employé voit les sept derniers jours sur son écran d'accueil et
un cumul depuis toujours sur son profil. Ni sa semaine, ni son mois — que le
serveur calcule déjà pour le responsable. Le README promet que l'employé
« consulte ses heures » ; l'écran ne le permet pas.

**Blocked by:** 01 — Le module du relevé

**Status:** ready-for-agent

- [ ] L'écran d'accueil de l'employé affiche ses heures de la semaine en
      cours et du mois en cours, et permet de basculer entre les deux.
- [ ] L'écran de profil de l'employé affiche la même chose, de la même façon —
      le responsable et l'employé lisent leurs heures de la même manière.
- [ ] Une période qui contient une journée incomplète est signalée à
      l'employé, avec l'explication que son total est sous-estimé.
- [ ] Les totaux affichés à l'employé sont exactement ceux que le responsable
      voit pour la même personne sur la même période : une seule règle, deux
      écrans.
- [ ] Le total d'une période ne peut pas dépasser la somme des journées
      affichées en dessous, et ne peut pas non plus lui être inférieur.
- [ ] L'employé continue de voir ses pointages jour par jour, avec les mêmes
      informations qu'avant.
- [ ] Un employé ne peut voir les totaux d'un autre que si l'interface lui
      le demande, et le point d'entrée le refuse comme aujourd'hui.
- [ ] Le test compare les totaux vus par l'employé et ceux vus par le
      responsable pour la même personne, plutôt que de tester une valeur
      codée en dur.
