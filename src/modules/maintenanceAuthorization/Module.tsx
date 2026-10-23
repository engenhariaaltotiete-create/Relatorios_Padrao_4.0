import { useEffect, useState } from "react";
import {
  COMPANY,
  POSITIONS,
  REQUESTERS,
  SERVICES,
  decimal,
  fileName,
  pdfFileName,
  newReport,
  parseReport,
  type MaintenanceReport,
} from "./model";
import { legacyReports, storage } from "./storage";
import { download, readPhoto } from "./images";
import { generatePdf } from "./pdf";
import { PdfDialog, type GeneratedPdf } from "./PdfDialog";
import "./styles.css";
export function MaintenanceAuthorization({ onBack }: { onBack: () => void }) {
  const [reports, setReports] = useState<MaintenanceReport[]>([]),
    [current, setCurrent] = useState<MaintenanceReport | null>(null),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [generatedPdf, setGeneratedPdf] = useState<GeneratedPdf | null>(null);
  const refresh = async () => setReports(await storage.all());
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setStatus("");
    try {
      await action();
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir a operação.",
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void run(refresh);
  }, []);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const leave = () => {
    if (busy) return;
    if (dirty && !confirm("Descartar alterações não salvas?")) return;
    setDirty(false);
    if (current) setCurrent(null);
    else onBack();
  };
  const update = (patch: Partial<MaintenanceReport>) => {
    setCurrent((r) => (r ? { ...r, ...patch } : r));
    setDirty(true);
  };
  const save = () =>
    run(async () => {
      if (!current) return;
      await storage.put(current);
      setCurrent(null);
      setDirty(false);
      await refresh();
      setStatus("Relatório salvo neste navegador.");
    });
  const pdf = (r: MaintenanceReport) =>
    run(async () => {
      const blob = await generatePdf(r);
      setGeneratedPdf({ blob, fileName: pdfFileName(r) });
      const saved = await storage.put({
        ...r,
        generatedAt: new Date().toISOString(),
      });
      if (current) {
        setCurrent(saved);
        setDirty(false);
      }
      await refresh();
      setStatus("PDF gerado e relatório salvo.");
    });
  const importFile = (file: File) =>
    run(async () => {
      if (file.size > 100 * 1024 * 1024)
        throw Error("O arquivo JSON excede 100 MB.");
      const r = parseReport(JSON.parse(await file.text()));
      if (
        reports.some((x) => x.id === r.id) &&
        !confirm(
          "Já existe um relatório com este identificador. Substituir somente o registro deste módulo?",
        )
      )
        return;
      await storage.put(r);
      await refresh();
      setStatus("Relatório importado.");
    });
  const exportFile = (r: MaintenanceReport) =>
    download(
      new Blob([JSON.stringify(r, null, 2)], { type: "application/json" }),
      `${fileName(r)}.json`,
    );
  const photos = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    void run(async () => {
      const added = await Promise.all(selected.map(readPhoto));
      setCurrent((r) => (r ? { ...r, fotos: [...r.fotos, ...added] } : r));
      setDirty(true);
    });
  };
  const move = (index: number, delta: number) => {
    if (!current) return;
    const fotos = [...current.fotos];
    [fotos[index], fotos[index + delta]] = [fotos[index + delta], fotos[index]];
    update({ fotos });
  };
  const integer = (key: "os" | "numero", label: string) => (
    <label className="ma-field">
      {label}
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={current?.[key] || ""}
        onChange={(e) => {
          if (/^\d*$/.test(e.target.value)) update({ [key]: e.target.value });
        }}
      />
    </label>
  );
  const text = (key: "endereco" | "bairro", label: string) => (
    <label className="ma-field">
      {label}
      <input
        value={current?.[key] || ""}
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </label>
  );
  const filtered = reports.filter((r) =>
    `${r.os} ${r.endereco} ${r.numero} ${r.bairro} ${r.servico}`
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  return (
    <main className="ma-module">
      <div className="ma-heading">
        <h1>Relatório Fotográfico Manutenção – Autorização</h1>
        <button disabled={busy} onClick={leave}>
          ← {current ? "Voltar à lista" : "Voltar à tela principal"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="ma-status">
        {busy ? "Processando…" : status}
      </p>
      <fieldset disabled={busy} className="ma-controls">
        {!current ? (
          <>
            <div className="ma-actions">
              <button
                onClick={() => {
                  setCurrent(newReport());
                  setDirty(false);
                  setStatus("");
                }}
              >
                + Novo relatório
              </button>
              <label className="ma-file">
                Importar JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={() =>
                  void run(async () => {
                    const old = await legacyReports();
                    const existing = new Set(reports.map((r) => r.id));
                    let count = 0;
                    for (const r of old)
                      if (!existing.has(r.id)) {
                        await storage.put(r);
                        count++;
                      }
                    await refresh();
                    setStatus(
                      `${count} relatório(s) anterior(es) recuperado(s), sem alterar os originais.`,
                    );
                  })
                }
              >
                Recuperar registros da versão anterior
              </button>
            </div>
            <label className="ma-field">
              Pesquisar relatórios
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {[false, true].map((archived) => (
              <section key={String(archived)}>
                <h2>{archived ? "Arquivados" : "Em andamento"}</h2>
                {filtered
                  .filter((r) => Boolean(r.archivedAt) === archived)
                  .map((r) => (
                    <article className="ma-row" key={r.id}>
                      <div>
                        <strong>
                          OS {r.os || "Não informada"} —{" "}
                          {r.endereco || "Rascunho"}
                        </strong>
                        <p>
                          {r.servico} ·{" "}
                          {r.dataRelatorio.split("-").reverse().join("/")} ·{" "}
                          {r.fotos.length} foto(s)
                        </p>
                      </div>
                      <div className="ma-actions">
                        <button
                          onClick={() => {
                            setCurrent(structuredClone(r));
                            setDirty(false);
                            setStatus("");
                          }}
                        >
                          Abrir
                        </button>
                        <button onClick={() => exportFile(r)}>JSON</button>
                        <button onClick={() => void pdf(r)}>PDF</button>
                        <button
                          onClick={() =>
                            void run(async () => {
                              await storage.put({
                                ...r,
                                archivedAt: archived
                                  ? null
                                  : new Date().toISOString(),
                              });
                              await refresh();
                            })
                          }
                        >
                          {archived ? "Desarquivar" : "Arquivar"}
                        </button>
                        <button
                          className="ma-danger"
                          onClick={() => {
                            if (
                              confirm(
                                `Excluir definitivamente o relatório OS ${r.os || "rascunho"} e suas fotografias?`,
                              )
                            )
                              void run(async () => {
                                await storage.remove(r.id);
                                await refresh();
                              });
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </article>
                  ))}
                {!filtered.some((r) => Boolean(r.archivedAt) === archived) && (
                  <p>Nenhum relatório.</p>
                )}
              </section>
            ))}
          </>
        ) : (
          <>
            <section>
              <h2>1. Dados da solicitação</h2>
              <div className="ma-grid">
                <label className="ma-field">
                  Data do relatório
                  <input type="date" value={current.dataRelatorio} readOnly />
                </label>
                {integer("os", "Número da OS")}
                {text("endereco", "Endereço")}
                {integer("numero", "Número")}
                {text("bairro", "Bairro")}
              </div>
            </section>
            <section>
              <h2>2. Dados da intervenção</h2>
              <div className="ma-grid">
                <label className="ma-field">
                  Serviço solicitado
                  <select
                    value={current.servico}
                    onChange={(e) =>
                      update({
                        servico: e.target.value as MaintenanceReport["servico"],
                      })
                    }
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {SERVICES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="ma-field">
                  Posição da intervenção na via
                  <select
                    value={current.posicaoIntervencao}
                    onChange={(e) =>
                      update({
                        posicaoIntervencao: e.target
                          .value as MaintenanceReport["posicaoIntervencao"],
                      })
                    }
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {POSITIONS.map((position) => (
                      <option key={position}>{position}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
            <section>
              <h2>3. Dimensões da Vala</h2>
              <div className="ma-grid">
                {(["largura", "comprimento"] as const).map((key) => (
                  <label className="ma-field" key={key}>
                    {key === "largura" ? "Largura (m)" : "Comprimento (m)"}
                    <input
                      inputMode="decimal"
                      value={current[key]}
                      onChange={(e) => {
                        if (/^\d*([,.]\d{0,2})?$/.test(e.target.value))
                          update({ [key]: e.target.value });
                      }}
                      onBlur={() => {
                        if (current[key])
                          try {
                            update({ [key]: decimal(current[key]) });
                          } catch (e) {
                            setStatus((e as Error).message);
                          }
                      }}
                    />
                  </label>
                ))}
              </div>
            </section>
            <section>
              <h2>4. Responsáveis</h2>
              <label className="ma-field">
                Empresa responsável
                <textarea readOnly value={COMPANY} rows={3} />
              </label>
              <label className="ma-field">
                Solicitante
                <textarea
                  readOnly
                  value={current.servico ? REQUESTERS[current.servico] : ""}
                  rows={3}
                />
              </label>
            </section>
            <section>
              <h2>5. Relatório Fotográfico</h2>
              <div className="ma-actions">
                <label className="ma-file">
                  Adicionar da galeria
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      photos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <label className="ma-file">
                  Tirar fotografia
                  <input
                    type="file"
                    capture="environment"
                    accept="image/*"
                    onChange={(e) => {
                      photos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p>
                Uma fotografia por página no PDF, na ordem abaixo. JPEG, PNG e
                WebP.
              </p>
              <div className="ma-photos">
                {current.fotos.map((photo, i) => (
                  <article className="ma-photo" key={photo.id}>
                    <img src={photo.data} alt={`Fotografia ${i + 1}`} />
                    <span>Fotografia {i + 1}</span>
                    <div className="ma-actions">
                      <button
                        disabled={i === 0}
                        aria-label={`Mover fotografia ${i + 1} para cima`}
                        onClick={() => move(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        disabled={i === current.fotos.length - 1}
                        aria-label={`Mover fotografia ${i + 1} para baixo`}
                        onClick={() => move(i, 1)}
                      >
                        ↓
                      </button>
                      <button
                        className="ma-danger"
                        aria-label={`Excluir fotografia ${i + 1}`}
                        onClick={() =>
                          update({
                            fotos: current.fotos.filter(
                              (p) => p.id !== photo.id,
                            ),
                          })
                        }
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <div className="ma-actions ma-form-actions">
              <button onClick={() => void save()}>Salvar e voltar</button>
              <button onClick={() => void pdf(current)}>Gerar PDF</button>
              <span>
                {dirty ? "Alterações não salvas" : "Sem alterações pendentes"}
              </span>
            </div>
          </>
        )}
      </fieldset>
      {generatedPdf && (
        <PdfDialog pdf={generatedPdf} onClose={() => setGeneratedPdf(null)} />
      )}
      <p className="ma-note">
        Os relatórios ficam neste navegador/dispositivo. Exporte JSON para
        backup ou transferência. PDF: fonte Helvetica como alternativa à Tahoma
        indisponível.
      </p>
    </main>
  );
}
