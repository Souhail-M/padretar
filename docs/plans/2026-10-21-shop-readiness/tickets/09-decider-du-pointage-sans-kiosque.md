# 09 : Décider du pointage sans écran kiosque

**What to build:** Une décision, pas du code. Aujourd'hui, le kiosque est la
seule source d'un code de pointage valide : `kiosk.current` et
`kiosk.rotate` sont réservés au responsable. Une boutique sans écran dédié
— ou qui ne veut pas laisser un écran allumé toute la journée — ne peut
donc pas pointer du tout. Le responsable du produit n'a pas encore tranché
entre les pistes possibles, et chacune a un coût différent.

Ce ticket explore les pistes et produit une décision écrite, avec ses
conséquences. Il ne construit rien.

Les pistes à considérer, au minimum :

- Un code partagé, valable une heure, que le responsable affiche sur son
  téléphone et communique à l'équipe. Un pointage sans écran, mais un code
  que tout le monde se passe.
- Un code par employé, valable une heure. Plus traçable, mais autant de
  codes à distribuer que d'employés.
- L'écran du responsable comme kiosque : le téléphone du responsable fait
  l'écran, et le verrouillage s'y applique aussi. Le kiosque redevient là où
  il est.
- La saisie sur le téléphone du responsable, qui valide lui-même. Simple, mais
  cela veut dire que le responsable valide aussi ses propres heures.
- Le pointage hors connexion, avec synchronisation plus tard. C'est la piste
  la plus coûteuse et la plus risquée : l'heure d'un pointage enregistré
  hors ligne est celle du scan, mais sa validation arrive après, et la règle
  « le serveur déduit l'entrée et la sortie » ne tient plus.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Les pistes sont comparées sur au moins cinq critères : effort
      d'implémentation, sécurité, fonctionnement quand le réseau tombe,
      charge pour le responsable au quotidien, et ce que ça change au
      verrouillage de l'écran.
- [ ] Chaque piste reçoit un coût, pas seulement une description.
- [ ] La piste retenue est écrite, avec sa raison, dans une décision
      d'architecture, au format des autres décisions du projet.
- [ ] La décision dit explicitement ce qui est écarté et pourquoi — pour que
      la piste écartée ne revienne pas dans six mois.
- [ ] La décision dit si le pointage hors ligne est dans le périmètre du
      prochain cycle ou s'il est refusé, et le motif.
- [ ] Aucune modification du comportement de l'application ne sort de ce
      ticket.
