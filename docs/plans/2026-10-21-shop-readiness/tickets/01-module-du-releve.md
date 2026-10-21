# 01 : Le module du relevé

**What to build:** Un seul endroit du code sait regrouper des pointages en
journées, en semaines et en mois, et dire si une journée est incomplète.
Aujourd'hui cette règle vit à l'intérieur du fichier des points d'entrée
Convex, où personne d'autre que le responsable ne peut l'appeler : c'est
pourquoi l'employé ne voit pas ses totaux, et pourquoi il n'existe pas de
liste des journées à corriger. Après ce ticket, d'autres appelants —
l'écran de l'employé, la file des corrections, le journal —
//appellent cette règle au lieu de la réécrire.

Ce ticket ne change **aucun** comportement visible. L'application doit
fonctionner exactement comme avant, avec les mêmes chiffres au même endroit.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Le regroupement des pointages en journées, le calcul des semaines et des
      mois, et la détection des journées incomplètes sont regroupés dans un
      module unique, distinct des points d'entrée Convex.
- [ ] Le module est utilisable sans Convex : il prend un groupe de pointages
      et rend des journées, des périodes et un signal d'incomplétude.
- [ ] Il est placé avec les autres modules purs du projet, à côté de celui
      qui porte l'horloge de Paris et de celui qui porte les périodes
      d'export.
- [ ] Les points d'entrée existants continuent de produire exactement les
      mêmes résultats qu'avant : mêmes journées, mêmes totaux, mêmes
      signalements d'incomplétude.
- [ ] Le regroupement n'est plus défini qu'à un seul endroit : une recherche
      du code de regroupement ne trouve plus de second exemplaire.
- [ ] Les tests existants passent sans être réécrits, et le typecheck passe.
- [ ] Un test du module couvre le regroupement lui-même, appelé depuis les
      tests, et non seulement à travers un point d'entrée Convex.
- [ ] Un nouveau module est ajouté au lieu d'être déplacé : l'ancien
      emplacement continue de fonctionner, et la suppression de l'ancien code
      est faite dans le même ticket, pour qu'aucune duplication ne subsiste.
