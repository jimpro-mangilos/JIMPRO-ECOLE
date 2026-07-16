ALTER TABLE paiements
  DROP CONSTRAINT paiements_eleve_id_fkey,
  ADD CONSTRAINT paiements_eleve_id_fkey
    FOREIGN KEY (eleve_id) REFERENCES eleves(id) ON DELETE CASCADE;
