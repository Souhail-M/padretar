# 12 : Le lint devient un garde-fou en CI

**What to build:** La chaîne de livraison refuse une version qui casse une
règle de style. Aujourd'hui, la vérification automatique en CI lance le
typecheck et les tests, mais pas le linter, qui existe pourtant dans le
projet et trouve déjà quatre avertissements sur `main`. Personne ne les voit
passer.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] La vérification automatique lance le linter, à côté du typecheck et
      des tests.
- [ ] Les quatre avertissements actuellement présents sont corrigés, ou
      explicitement acceptés s'ils sont justifiés — un avertissement
      accepté porte une raison écrite.
- [ ] L'étape de lint échoue la chaîne quand elle trouve un problème, et
      le message dit lequel.
- [ ] Le linter passe sur l'ensemble du code du projet, pas seulement sur
      les fichiers modifiés.
- [ ] Les règles de linter qui interdisent certains schémas React sont
      appliquées : les hooks ne peuvent pas être appelés conditionnellement,
      et un fichier ne peut pas mélanger un composant et une constante
      exportée.
- [ ] Le typecheck et les tests passent toujours, sans changement de
      comportement.
