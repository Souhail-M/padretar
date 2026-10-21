# Pas de réinitialisation de mot de passe par email

Le flux `reset` du fournisseur de mot de passe n'est pas configuré : l'endpoint
d'authentification refuse la demande au lieu d'envoyer quoi que ce soit. Un
employé qui a oublié son mot de passe voit le responsable le réinitialiser
depuis sa fiche, et le responsable le lui dit de vive voix ; le responsable
lui-même n'a personne au-dessus de lui, et la seule porte de secours est la
ligne de commande, qui exige déjà l'accès au déploiement.

La raison n'est pas technique : une boutique partage une pièce, donc une
remise en main propre vaut mieux qu'un email. Le prix est qu'un responsable
qui perd son mot de passe sans accès à la console Convex a perdu son entrée
dans l'application — c'est explicite dans la documentation et dans l'écran de
connexion, qui n'affiche aucun lien « mot de passe oublié » qui ne pourrait
pas fonctionner.
