# Padretar

Le pointage d'un commerce de proximité : un employé enregistre ses entrées et
ses sorties, un responsable suit la présence et prépare la paie.

Ce glossaire fixe le vocabulaire du domaine. Le code et l'interface speak
français ; ces mots sont ceux qu'on doit employer dans le code, les écrans, les
exports et les tickets.

## Les gens

**Boutique** :
Le commerce qui utilise Padretar. C'est le client, et c'est aussi l'unité de
déploiement : une boutique, un déploiement, un forfait.
_Avoid_ : magasin, commerce, enseigne

**Responsable** :
La personne qui dirige la boutique et qui valide les comptes, corrige les
pointages et prépare la paie. Dans le code, c'est un compte de rôle
« admin ».
_Avoid_ : administrateur (le rôle technique n'est pas la personne),
gérant, patron, manager

**Employé** :
Une personne de la boutique qui pointe ses entrées et ses sorties. Le compte
est de rôle « employé ».
_Avoid_ : utilisateur, membre, salarié, agent

**Superadmin** :
Le compte du développeur, au-dessus du responsable : il voit tout et
n'apparaît nulle part. Il n'est jamais assignable depuis l'application.
_Avoid_ : administrateur système, root, propriétaire

## Les comptes

**Compte en attente** :
Un compte créé, jamais validé par un responsable. Il peut se connecter mais
n'obtient rien du back-end : c'est ce qui l'amène à l'écran « en attente ».
_Avoid_ : compte inactif, compte bloqué, invitation

**Compte validé** :
Un compte en attente qu'un responsable a approuvé. C'est le seul état qui
donne accès aux pointages.
_Avoid_ : compte actif (l'« actif » d'après validation est un état distinct),
compte approuvé

**Compte désactivé** :
Un compte dont l'accès a été retiré. Le compte et ses pointages sont
conservés : un salarié qui part laisse une trace de travail.
_Avoid_ : compte supprimé, compte effacé, compte archivé

**Poste** :
La fonction de l'employé dans la boutique (vendeur, responsable…). Ce n'est
pas le rôle du compte, qui ne décrit qu'une permission.
_Avoid_ : rôle, fonction, métier

## Le pointage

**Pointage** :
Un enregistrement d'entrée ou de sortie. C'est la donnée la plus
importante de Padretar.
_Avoid_ : badge, passage, scan, ticket

**Entrée** :
Un pointage d'arrivée. Le premier pointage d'une journée est toujours une
entrée.
_Avoid_ : arrivée, prise de poste, pointage « in »

**Sortie** :
Un pointage de départ. La sortie qui suit une entrée forme une vacation.
_Avoid_ : départ, fin de service, pointage « out »

**Vacation** :
Une entrée et la sortie qui la suit, sur une même journée. C'est l'unité de
l'export : une ligne par vacation.
_Avoid_ : shift, service, poste de travail, créneau

**Journée incomplète** :
Une journée dont la sortie n'a jamais été enregistrée. Elle est signalée
comme telle partout — jamais refermée à une heure inventée.
_Avoid_ : sortie manquante (c'est la conséquence, pas le mot de l'état),
journée invalide, journée cassée

**Période** :
Un découpage du temps servant à lire des totaux : semaine (lundi-premier),
mois, ou année. Une période peut être incomplète si elle contient une
journée incomplète.
_Avoid_ : intervalle, tranche, fenêtre

**Relevé** :
La liste des pointages d'un employé, groupés en journées, avec les totaux par
période.
_Avoid_ : historique, journal, feuille de temps, timesheet

**Pointage en double** :
Deux pointages du même geste à moins de quinze secondes d'écart. Ce n'est pas
un pointage, c'est le même geste décodé deux fois.
_Avoid_ : doublon, double scan, bug de scan

## La boutique en fonctionnement

**Kiosque** :
L'écran de la boutique qui affiche le QR et le code. C'est un écran
verrouillé, pas une page de navigation.
_Avoid_ : borne, terminal, page QR

**Code de pointage** :
Les six caractères affichés sous le QR, changés toutes les trente secondes.
Photographier le QR ne sert à rien.
_Avoid_ : code QR (c'est l'image), PIN, code secret

**Mot de passe de sortie** :
Le mot de passe qui libère l'écran du kiosque. Distinct du mot de passe du
compte responsable, qui protège bien plus.
_Avoid_ : mot de passe du kiosque, code du kiosque

**Validation** :
L'action du responsable qui transforme un compte en attente en compte validé.
_Avoid_ : approbation, activation

**Correction** :
L'action du responsable qui réécrit un pointage enregistré : changer l'heure,
changer le type, en ajouter un, en supprimer un.
_Avoid_ : édition, modification, back-office

**Forfait** :
Ce que la boutique a acheté : rétention, nombre d'employés, export. Il est
posé une fois, à la vente, et la boutique ne le change pas elle-même.
_Avoid_ : plan, abonnement, offre, tier, pricing

**Purge de rétention** :
La suppression automatique des pointages plus vieux que la rétention du
forfait. Elle ne se voit pas : elle se constate par l'absence.
_Avoid_ : nettoyage, purge de données, TTL

## Le produit

**Déploiement** :
Une instance de Convex, avec ses données et ses variables. Une boutique en a
exactement une.
_Avoid_ : environnement, instance, serveur

**Mise en service** :
Le chemin qui mène d'un déploiement vide à une boutique qui pointe : variables
posées, image publiée, domaine branché, premier responsable validé.
_Avoid_ : onboarding (le mot anglais est réservé au produit lui-même),
installation, déploiement, provisionnement
