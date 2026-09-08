import { useMemo, useState } from 'react';
import { DIAGNOSIS_PRICE_CATALOG } from '../data/diagnosisPriceCatalog';
import { normalizeText } from '../lib/helpers';

type CatalogItem = {
  descricao: string;
  preco: string;
  unid: string;
  precoUnit: number;
};

type Props = {
  value: string;
  onSelect: (item: CatalogItem) => void;
  onQueryChange: (text: string) => void;
};

// Lista pesquisável vinculada ao mesmo Catálogo de Preços utilizado
// no bloco "Orçamento da solução proposta" do relatório de Diagnóstico.
// A pesquisa considera qualquer trecho digitado dentro da descrição.
export function ServiceSearch({ value, onSelect, onQueryChange }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = normalizeText(query.trim());
    const rows = q
      ? DIAGNOSIS_PRICE_CATALOG.filter((item) =>
          normalizeText(item.descricao).includes(q)
        )
      : DIAGNOSIS_PRICE_CATALOG;

    return rows.slice(0, 50);
  }, [query]);

  const choose = (item: CatalogItem) => {
    setQuery(item.descricao);
    setOpen(false);
    onSelect(item);
  };

  return (
    <div className="service-search">
      <input
        value={query}
        placeholder="Digite qualquer parte do serviço..."
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const text = e.target.value;

          setQuery(text);
          setOpen(true);

          // Enquanto o usuário pesquisa, os campos vinculados ficam vazios.
          // Nº do Preço, Unid. e Preço Unit. somente são preenchidos quando
          // uma descrição real do Catálogo de Preços é selecionada.
          onQueryChange(text);
        }}
        onBlur={() =>
          window.setTimeout(() => setOpen(false), 150)
        }
      />

      {open && (
        <div className="service-menu">
          {results.length ? (
            results.map((item) => (
              <button
                type="button"
                key={`${item.descricao}-${item.preco}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(item)}
              >
                <strong>{item.descricao}</strong>

                <small>
                  Preço {item.preco} · {item.unid} ·{' '}
                  {item.precoUnit.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </small>
              </button>
            ))
          ) : (
            <div className="service-empty">
              Nenhum serviço encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
