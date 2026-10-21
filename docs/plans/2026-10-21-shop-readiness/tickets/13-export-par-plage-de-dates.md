# 13 : L'export par plage de dates

**What to build:** Le responsable choisit lui-même les jours qui entrent dans
le fichier de paie. Aujourd'hui l'écran n'offre que deux boutons — « Semaine »
et « Mois » — qui exportent la semaine ou le mois en cours, et rien d'autre.
Une paie qui porte sur les deux dernières semaines de juillet, ou sur une
plage du 28 juillet au 16 août, ne peut pas être exportée : il faut attendre
que le calendrier tombe juste.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Un seul bouton « Exporter (Excel) » ouvre le sélecteur, sur le tableau
      de bord comme sur la fiche d'un employé. Les deux raccourcis « Cette
      semaine » et « Ce mois-ci » remplissent les deux dates, ils n'exportent
      pas d'eux-mêmes : le responsable voit la période avant le fichier.
- [x] L'admin tape deux dates et exporte exactement ces jours, pour tous les
      employés ou pour un seul.
- [x] Il peut aussi cocher une ou plusieurs semaines, mois ou années — dans
      les trois onglets à la fois — et la sélection s'ajoute à la plage dans
      un seul fichier.
- [x] Chaque période proposée vient de pointages qui existent : aucune
      période vide n'est offerte.
- [x] Les bornes d'une période cochée viennent du serveur et ne sont jamais
      recalculées dans le navigateur — lundi premier jour de semaine, mois de
      la bonne longueur, année bissextile comprise.
- [x] Une ligne sous les dates dit ce que la sélection couvre : le nombre de
      jours et l'étendue réelle (« 28 jours couverts · 3 août 2026 – 30 août
      2026 »).
- [x] Le plafond de l'export est celui du forfait : la fenêtre de rétention
      quand elle est fixée, deux ans sinon. Il s'affiche avant le clic, avec
      le nombre de jours à retirer.
- [x] Une plage à l'envers, ou à moitié saisie, n'exporte rien : le bouton
      reste inactif et l'écran dit pourquoi.
- [x] Le refus est le même des deux côtés : l'écran et le serveur jugent la
      sélection avec le même module (`convex/lib/exportRange.ts`), donc un
      client qui ment sur sa sélection est refusé avec les mêmes mots.
- [x] Le fichier est nommé d'après la période réellement exportée
      (`pointages-2026-08-03_2026-08-30.xlsx`) et sa ligne de titre porte la
      même étendue.
- [x] Un forfait sans export le dit à la place du bouton, avant le clic ; le
      serveur refuse toujours.
- [x] L'écran est un composant sans Convex (`ExportPicker`) : il se rend et
      se juge seul — inspecteur de design, 0 échec à 1440, 768 et 390 px,
      trois couleurs (le fond, l'encre, le gris secondaire) — et le dialogue
      ne fait que le câbler.

**Hors périmètre, décidé en revue :**

- L'employé n'exporte pas ses propres heures. C'est une décision de forfait
  (l'export est une option payante), pas une décision d'écran : à ouvrir
  séparément.
- Une plage sans aucun pointage s'exporte quand même. Le fichier n'a
  simplement pas de lignes pour ces jours. Faire figurer les journées vides
  dans le classeur est une question de format de fichier, pas de sélecteur.

**Ce que le ticket laisse en place :** `resolveSelection` accepte encore un
préréglage `period` (« week » / « month ») côté serveur. Plus aucun écran ne
l'envoie — le sélecteur envoie toujours des `spans` — mais il reste couvert
par les tests, et le supprimer est une décision distincte.
