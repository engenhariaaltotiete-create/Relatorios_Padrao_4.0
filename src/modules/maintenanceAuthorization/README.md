# Autorização de manutenção

Implementação independente sobre o ZIP fornecido pelo usuário. Fora desta pasta, somente `App.tsx` e `components/Portal.tsx` integram entrada/saída. Nenhum componente, tipo, estilo ou gerador dos outros relatórios é importado.

- `Module.tsx`: lista, editor, navegação interna e ações de relatórios/fotos.
- `model.ts`: tipos exclusivos, constantes institucionais, datas e validação JSON.
- `storage.ts`: IndexedDB próprio `maintenance-authorization-v1`, store `reports`; conclusão das transações antes de indicar sucesso.
- `images.ts`: leitura, orientação pelo decodificador do navegador, conversão JPEG, miniaturas e downloads. Fotos maiores são reduzidas proporcionalmente até 2400 pixels no lado maior.
- `pdf.ts`: A4, margens laterais 15 mm, áreas de cabeçalho/rodapé 30 mm, corpo 11,5 pt e entrelinha 1,5; quebra medida e paginação automática, uma foto por página, numeração final.
- `styles.css`: seletores limitados a `.ma-module`.
- `logo.jpg`: imagem extraída do Word fornecido, correspondente ao logotipo enviado.
- `tests/`: smoke test real no navegador e verificação geométrica/textual dos PDFs.

## Dados anteriores

Importa JSON individual do formato anterior (`kind: maintenance-auth`, versão 19), além do formato anterior versão 1 e do atual versão 2. Campos antigos de agentes de trânsito, data de execução, prazo e interdição são descartados. A posição da intervenção (Terço, Eixo ou Passeio) permanece vazia nos registros antigos até seleção explícita; não é deduzida da antiga interdição. Preserva data original, identificadores, ordem das fotos e arquivamento. Rascunhos com seleções vazias podem ser importados; PDF exige preenchimento.

O botão **Recuperar registros da versão anterior** lê exclusivamente registros `maintenance-auth` do banco legado, quando existente, e copia os que não existem neste módulo. Não altera nem remove registros originais. A recuperação depende de o mesmo navegador/origem ainda possuir esses dados. Não faz migração automática dos demais relatórios. Formatos de imagem aceitos: JPEG, PNG e WebP; arquivos incompatíveis geram mensagem e permanecem intactos na origem.

## Limitações

Tahoma não estava disponível com licença de distribuição; o PDF usa Helvetica, alternativa sans-serif, sem redistribuir fontes proprietárias. O texto e os contatos institucionais vêm do Word. Endereço e bairro recebem apenas inicial maiúscula na apresentação; o conteúdo armazenado é preservado para evitar modificar nomes e siglas. Textos extensos continuam na página seguinte sem reduzir fonte/margens. Dados são locais; exporte JSON para backup. JSON acima de 100 MB é recusado com aviso.

## Validação

Com Node.js 24, execute `npm run build` na raiz. Para smoke test, inicie `npm run dev -- --port 5173 --strictPort` e um Chromium de testes com perfil descartável e porta de depuração 9222. Execute, na raiz:

```sh
node src/modules/maintenanceAuthorization/tests/browser-smoke.mjs
python3 src/modules/maintenanceAuthorization/tests/check-pdf.py
```

O segundo comando requer PyMuPDF. Artefatos vão para `/tmp/maintenance-authorization-tests` (ou `MA_TEST_ARTIFACTS`). O navegador deve ser descartável: o teste interage com a interface, usa registros sintéticos e limpa seus próprios registros no final. Não use perfil com alterações não salvas.

Valida: sete cards, entrada/retorno, solicitante automático, data somente leitura, decimais, rejeição de JSON inválido, compatibilidade v19 e rascunhos, CRUD e arquivamento, imagens e JSON, ações das fotos, largura móvel e abertura dos seis painéis originais. Gera PDFs com 0/1/2/5 fotografias e endereço de 7000 caracteres; verifica A4, margens, cabeçalho/rodapé, imagem proporcional por página, numeração e textos exigidos. Os seis outros painéis são um teste de navegação, não uma suíte completa dos PDFs desses módulos.

## Formatação e ações atuais

O formulário termina com Salvar e voltar (salva e retorna à listagem) e Gerar PDF. A exportação JSON fica na listagem. Não há data de execução, prazo ou interdição. Logotipo à direita em todas as páginas; título fotográfico centralizado. Corpo 11,5 pt, entrelinha 1,5 e uma linha adicional entre os blocos combinados; data, assinatura e destinatário à direita. SAMUEL DE OLIVEIRA em maiúsculas, negrito e 11,5 pt. Numeração em 10 pt, alinhada a 15 mm da direita e com linha de base a 15 mm da borda inferior; rodapé institucional preservado com espaço lateral para a numeração.

## Janela do PDF

Gerar PDF, tanto no formulário quanto na listagem, abre a janela “PDF gerado”, com o texto “O arquivo foi criado diretamente no navegador.” e as ações Baixar PDF, Compartilhar, Abrir e Fechar. Não há download automático. A janela é modal, recebe foco e pode ser fechada por Esc. Abrir exibe o PDF em outra aba. Compartilhar usa um arquivo PDF pela Web Share API quando disponível; cancelamento não gera erro, e navegadores incompatíveis recebem orientação para usar Baixar PDF ou Abrir.

Nome do PDF: `[ENDEREÇO], [NÚMERO], [BAIRRO] – [SERVIÇO] - OS[NÚMERO DA OS].pdf`. Caracteres incompatíveis com nomes de arquivos são substituídos por hífen. O título interno do PDF também usa esse nome. O comportamento de exibição/salvamento da aba aberta depende do visualizador do navegador. O nome dos backups JSON permanece inalterado.

`PdfDialog.tsx` contém a janela e suas ações. Com o servidor e o Chromium de testes iniciados, execute também `node src/modules/maintenanceAuthorization/tests/pdf-dialog.mjs`. Esse teste verifica a geração pela lista e pelo editor, as quatro ações, nome, PDF real no download e na aba aberta, foco, fechamento e largura móvel. Os resultados de compartilhamento são simulados, sem enviar arquivos a terceiros.
