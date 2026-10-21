# 11 : La purge de rétention tient la charge

**What to build:** La purge quotidienne supprime tous les pointages plus
vieux que la rétention du forfait, quelle que soit la taille de la boutique.
Aujourd'hui, elle supprime un lot borné de cinq cents pointages par passage,
une fois par jour. En dessous de deux cent cinquante employés, ça suffit. Au
dessus, le retard s'accumule : la rétention cesse de fonctionner sans jamais
dire qu'elle a échoué — le pointage le plus ancien reste dans l'export et
dans les relevés, indéfiniment.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] La purge traite une journée entière de pointages d'une boutique très
      peuplée, sans qu'aucun pointage ne survive au passage.
- [ ] La purge reste bornée : elle ne peut pas faire tomber la fonction en
      dépassant la limite de lecture, quel que soit le nombre de pointages
      à supprimer.
- [ ] La purge est un lot répété tant qu'il reste des pointages à supprimer,
      avec un plafond de lots qui empêche une exécution de durer indéfiniment.
- [ ] Une boutique dont le forfait n'a pas de rétention n'est pas affectée :
      la purge ne supprime rien, comme aujourd'hui.
- [ ] La purge ne supprime jamais un pointage plus récent que la limite de
      rétention, même en cas de lot répété.
- [ ] Le test utilise une boutique à forte densité de pointages et vérifie
      qu'il ne reste rien au-delà de la limite.
- [ ] Le test vérifie aussi que la borne est respectée : le lot ne dépasse
      jamais la limite de lecture.
