# 07 : Le journal de la vie des comptes

**What to build:** La vie des comptes est journalisée comme les corrections
de pointages : validation d'un compte en attente, désactivation, réactivation,
changement de rôle, changement de poste, réinitialisation d'un mot de passe,
création d'un compte. Chaque acte dit qui l'a fait et quand, et il se lit
depuis la fiche du compte concerné.

**Blocked by:** 06 — Le journal des corrections

**Status:** ready-for-agent

- [ ] Valider un compte en attente écrit un acte.
- [ ] Désactiver et réactiver un compte écrivent un acte.
- [ ] Changer le rôle, le nom ou le poste d'un compte écrit un acte.
- [ ] Réinitialiser le mot de passe d'un employé écrit un acte — et l'acte ne
      contient pas le mot de passe.
- [ ] Créer un compte (voir le ticket 05) écrit un acte.
- [ ] Le journal se lit depuis la fiche du compte concerné, à côté du
      journal des corrections, dans le même ordre chronologique.
- [ ] Les deux journaux sont lisibles ensemble : le responsable voit la vie
      du compte et le travail qu'il a fait dessus dans un seul endroit.
- [ ] Un acte ne contient jamais de secret : ni mot de passe, ni valeur de
      comparaison de mot de passe.
- [ ] Un employé ne peut lire ni écrire dans le journal.
- [ ] Le compte superadmin n'apparaît dans aucun journal accessible à un
      responsable, sauf à lui-même.
- [ ] Un test vérifie qu'une action de compte produit bien un acte, pour
      chacune des actions listées.
