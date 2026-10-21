# Un déploiement Convex par boutique

Padretar n'a pas de table « boutique » et ne partage aucune donnée entre
clients : chaque boutique a son propre déploiement Convex, ses propres
variables d'environnement et son propre forfait. Le prix, l'isolation des
données et la suppression de la boutique sont alors des propriétés du
déploiement, pas du code — et il n'y a rien à faire pour qu'une boutique voie
les pointages d'une autre.

Le coût est assumé : plus aucune vue d'ensemble entre boutiques, et chaque
vente exige un nouveau déploiement à poser à la main. C'est le sujet du
ticket « mise en service ».
