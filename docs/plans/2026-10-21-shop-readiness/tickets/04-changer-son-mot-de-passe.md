# 04 : Changer son mot de passe

**What to build:** Un employé connecté peut changer son propre mot de passe
depuis son profil. Il doit connaître l'ancien mot de passe. Une fois le
changement fait, les sessions ouvertes avec l'ancien mot de passe sont
fermées, et l'ancien mot de passe ne fonctionne plus.

Aujourd'hui, personne ne peut changer son propre mot de passe : seul le
responsable peut le réinitialiser depuis une fiche. La fiche employé promet
 pourtant explicitement à l'employé qu'il pourra « le changer ensuite s'il le
souhaite » — une promesse que l'application ne tient pas.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Un employé connecté trouve, sur son profil, un moyen de changer son
      mot de passe, et le changement réussit.
- [ ] L'ancien mot de passe ne fonctionne plus après le changement, et le
      nouveau fonctionne.
- [ ] Les sessions ouvertes avec l'ancien mot de passe sont fermées : une
      personne qui a vu l'ancien mot de passe ne peut plus entrer.
- [ ] Changer son mot de passe exige l'ancien : quelqu'un qui a ouvert la
      session sur un poste laissé ouvert ne peut pas prendre le compte.
- [ ] Un mot de passe trop court est refusé, avec la même règle que celle
      appliquée par le responsable et que celle appliquée à l'inscription.
- [ ] Un employé ne peut pas changer le mot de passe d'un autre, et le
      responsable ne peut pas changer le sien par cette voie — il garde la
      réinitialisation en main, qui lui donne le mot de passe de l'employé.
- [ ] L'écran d'accueil du responsable n'est pas modifié par ce ticket.
- [ ] Le test vérifie qu'une session ouverte avant le changement ne permet
      plus d'agir ensuite.
