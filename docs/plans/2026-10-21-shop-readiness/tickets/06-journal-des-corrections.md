# 06 : Le journal des corrections

**What to build:** Quand le responsable corrige un pointage — il change
l'heure, le type, en ajoute un, en supprime un — l'action est conservée :
qui l'a faite, quand, sur quel pointage, et ce que le pointage est devenu.
Le journal se lit sur la fiche de l'employé, et il ne se modifie pas.

Aujourd'hui, une correction est un changement de plus dans une base de
données. Question posée par un salarié qui conteste ses heures — « qui a
modifié ce pointage ? » — la réponse n'existe pas.

**Blocked by:** 01 — Le module du relevé

**Status:** ready-for-agent

- [ ] Corriger un pointage écrit un acte qui dit qui a corrigé, quand, quel
      pointage, et ce qu'il est devenu.
- [ ] Le journal se lit sur la fiche de l'employé concerné, dans l'ordre
      chronologique.
- [ ] Le journal est en lecture seule : aucun acte ne peut être modifié ni
      supprimé depuis l'application.
- [ ] Le journal survit à la désactivation du compte de l'employé concerné.
- [ ] Un acte ne peut pas être écrit à la main : l'écriture vient du module
      qui effectue la mutation, jamais d'un appelant qui pourrait l'oublier.
- [ ] Un employé ne peut lire ni écrire dans le journal.
- [ ] Les quatre gestes sont journalisés : changer l'heure, changer le type,
      ajouter un pointage, supprimer un pointage.
- [ ] Un pointage supprimé reste décrit dans le journal, même si le pointage
      lui-même n'existe plus.
- [ ] Le test vérifie ce que le responsable voit dans le journal après une
      correction, et non la forme de l'acte enregistré.
