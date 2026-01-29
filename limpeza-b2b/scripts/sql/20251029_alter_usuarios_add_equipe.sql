-- Adiciona vínculo de usuário -> equipe
ALTER TABLE usuarios ADD COLUMN equipe_id INT NULL;
CREATE INDEX idx_usuarios_equipe ON usuarios(equipe_id);
ALTER TABLE usuarios
  ADD CONSTRAINT fk_usuarios_equipe FOREIGN KEY (equipe_id)
  REFERENCES equipes(id)
  ON UPDATE RESTRICT ON DELETE SET NULL;