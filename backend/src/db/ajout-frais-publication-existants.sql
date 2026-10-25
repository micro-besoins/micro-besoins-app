-- Complète les annonces déjà validées qui n'ont pas encore de frais de publication
-- et confirme les frais restés en attente sur les anciennes données.
-- Le script peut être relancé sans créer de doublon.
UPDATE paiement p
   SET statuspaiement = 'REUSSI',
       datepaiement = COALESCE(p.datepaiement, g.datemodification, g.datepublication, NOW())
  FROM gig g
 WHERE p.idgig = g.idgig
   AND p.idreponse IS NULL
   AND g.statusgig = 'VALIDE'
   AND p.statuspaiement = 'EN_ATTENTE';

INSERT INTO paiement (idgig, idutilisateur, methode, statuspaiement, montant, datepaiement)
SELECT g.idgig,
       g.idutilisateur,
       'mcb',
       'REUSSI',
       75,
       COALESCE(g.datemodification, g.datepublication, NOW())
  FROM gig g
 WHERE g.statusgig = 'VALIDE'
   AND NOT EXISTS (
     SELECT 1
       FROM paiement p
      WHERE p.idgig = g.idgig
        AND p.idreponse IS NULL
   );
