-- Inserir produtos de exemplo para teste
INSERT INTO produtos (codigo, nome, descricao, unidade_venda, categoria, preco, ativo) VALUES
('LMP001', 'Detergente Neutro 5L', 'Detergente neutro concentrado para limpeza geral. Ideal para pisos, paredes e superfícies diversas.', 'UN', 'Detergentes', 25.90, 1),
('LMP002', 'Desinfetante Hospitalar 1L', 'Desinfetante de uso hospitalar, elimina 99,9% das bactérias e vírus. Aprovado pela ANVISA.', 'UN', 'Desinfetantes', 18.50, 1),
('LMP003', 'Sabão em Pó Industrial 2kg', 'Sabão em pó para roupas profissionais e uniformes. Alta eficiência na remoção de manchas.', 'PC', 'Sabões', 32.00, 1),
('LMP004', 'Álcool Gel 70% - 500ml', 'Álcool gel antisséptico para higienização das mãos. Formato pump para facilitar o uso.', 'UN', 'Antissépticos', 12.90, 1),
('LMP005', 'Papel Higiênico 60m - Fardo 16un', 'Papel higiênico folha dupla, macio e resistente. Fardo com 16 rolos de 60 metros cada.', 'FD', 'Papel', 28.00, 1),
('LMP006', 'Papel Toalha Interfolhado 1000fl', 'Papel toalha interfolhado de alta absorção. Ideal para banheiros e cozinhas comerciais.', 'PC', 'Papel', 35.50, 1),
('LMP007', 'Lustra Móveis Spray 200ml', 'Lustra móveis em spray com cera de carnaúba. Protege e dá brilho a móveis de madeira.', 'UN', 'Ceras', 15.20, 1),
('LMP008', 'Cera Líquida Vermelha 750ml', 'Cera líquida autobrilho para pisos. Secagem rápida e brilho duradouro.', 'UN', 'Ceras', 22.90, 1),
('LMP009', 'Saco para Lixo 100L - Pct 100un', 'Sacos para lixo de 100 litros, cor preta, resistentes. Pacote com 100 unidades.', 'PC', 'Descartáveis', 45.00, 1),
('LMP010', 'Esponja Dupla Face - Pct 10un', 'Esponja dupla face para limpeza geral. Lado verde abrasivo e lado amarelo macio.', 'PC', 'Utensílios', 8.90, 1),
('LMP011', 'Pano de Limpeza Multiuso 40x60cm', 'Pano de microfibra para limpeza a seco e úmido. Não risca superfícies delicadas.', 'UN', 'Utensílios', 11.50, 1),
('LMP012', 'Removedor de Gordura 500ml', 'Removedor de gordura concentrado para cozinhas industriais. Dissolve rapidamente a gordura.', 'UN', 'Desengraxantes', 19.80, 1);

-- Atualizar campo vendedor_email na equipe de exemplo
UPDATE equipes SET vendedor_email = 'vendedor@empresa.com' WHERE id = 1;
UPDATE equipes SET vendedor_email = 'vendedor@empresa.com' WHERE id = 2;