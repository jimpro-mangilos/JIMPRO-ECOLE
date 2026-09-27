-- Corrige les paiements encaissés dès leur création (case « encaisser » cochée)
-- qui n'ont pas reçu le statut 'encaisse' : est_encaisse = true mais statut = 'en_attente'.
-- Réaligne statut sur est_encaisse, comme lors de l'ajout initial de la colonne statut.
UPDATE public.paiements
SET statut = 'encaisse'
WHERE est_encaisse = true AND statut = 'en_attente';
