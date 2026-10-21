# 05 : Créer le compte d'un employé

**What to build:** Le responsable peut créer lui-même le compte d'un employé
— son email, son nom, son poste — et lui donner un mot de passe initial que
l'employé pourra changer ensuite. Le compte est utilisable immédiatement :
pas de validation à faire, pas de fiche à compléter après coup.

Aujourd'hui, un employé crée son compte lui-même. C'est bien, mais c'est la
seule voie : une boutique dont le personnel n'a pas d'email personnel, ou dont
le téléphone de travail est verrouillé, ne peut pas être mise en service du
tout. Le responsable n'a aucun moyen de lui faire un compte.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Le responsable peut créer un compte depuis la liste des employés, en
      donnant l'email, le nom et le poste.
- [ ] Le compte créé est utilisable immédiatement : l'employé se connecte
      avec le mot de passe donné, sans passer par une validation.
- [ ] La fiche du compte créé est complète dès le départ : le poste est
      renseigné, il n'y a rien à revenir remplir après coup.
- [ ] Le compte créé apparaît dans la liste des employés, avec le même
      statut et la même présentation qu'un compte validé normalement.
- [ ] Un email déjà utilisé est refusé, avec un message qui le dit.
- [ ] La limite du forfait s'applique à la création comme elle s'applique à
      la validation : au-delà du plafond, la création est refusée et le
      message dit pourquoi.
- [ ] Le compte superadmin reste invisible et ne peut pas être créé ni
      modifié par cette voie.
- [ ] Un employé ne peut pas créer de compte, ni appeler la création
      directement.
- [ ] La création est écrite dans le journal (voir le ticket suivant) dès
      que ce journal existe.
