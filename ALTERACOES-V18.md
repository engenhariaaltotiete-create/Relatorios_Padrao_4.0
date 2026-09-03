# Alterações V18

## PDFs — regra geral de tabelas
- Removida a regra de redução fixa de 40% da altura das linhas.
- As linhas passam a ter altura dinâmica, calculada pelo conteúdo da célula que exigir maior altura.
- Mantido espaçamento vertical interno fixo entre o texto e as bordas superior e inferior.
- Textos com múltiplas linhas passam a aumentar a altura da linha sem corte ou sobreposição.

## PDFs — textos, data e assinatura
- Campos de texto longo são apresentados justificados, utilizando a largura disponível do box/célula.
- Antes dos anexos é inserida a linha `[MUNICÍPIO], [DIA] de [MÊS] de [ANO]`, alinhada à direita.
- A assinatura é apresentada abaixo, com o nome do responsável em negrito e fonte maior e o Cargo/Função na linha seguinte, alinhados à esquerda.

## Anexos
- Padronizados os blocos de anexos dos quatro relatórios conforme o padrão do Relatório de Diagnóstico.
- Inclusão de Título e Descrição para anexos.
- No PDF: barra `Anexo N: Título – página de total` e descrição acima do conteúdo.
- A palavra `Descrição:` é apresentada em negrito.
- Mantido suporte a imagens, PDF e TIFF.

## Memória e listas
- Mantida memória para campos de texto de uma linha.
- Campos do tipo lista não utilizam memória de textos digitados.
- Listas continuam filtrando opções por qualquer trecho digitado.

## Relatório de Recebimento de Obras
- Legenda do resumo de apontamentos alterada para apresentação direta, sem tabela.
- Mantidos Leve, Moderado e Grave com destaque de cor nos respectivos termos.

## Diagnóstico e Solução de Problemas Operacionais
- Inclusão de exclusão de linhas no bloco dos 5 Porquês, preservando ao menos uma linha.
- Orçamento alterado para selecionar Descrição diretamente do Catálogo de Preços.
- Nº Preço, Unid. e Preço Unit. são preenchidos pela correlação com a descrição selecionada.
- Quantidade utiliza valor decimal com duas casas e torna-se obrigatória quando houver Descrição.
- Total calculado automaticamente por Quantidade × Preço Unitário.
- Inclusão de exclusão individual das linhas do orçamento.

## Relatório Fotográfico
- A descrição da foto é apresentada acima da imagem.
- Formato no PDF: `Descrição: texto`, com apenas `Descrição:` em negrito.
