export const SERVICES = [
  "Manutenção de água",
  "Manutenção de esgoto",
  "Reposição de pavimento",
] as const;
export const POSITIONS = ["Terço", "Eixo", "Passeio"] as const;
export const COMPANY =
  "Zigurate Construção Ltda., CNPJ.: 32.836.259/0001-63, eng. º residente Henrique José da Rocha – (11) 9300-5894.";
export const REQUESTERS = {
  "Manutenção de água":
    "Enc. Tania Maximiano Alves – tmalves@sabesp.com.br - (11) 96326-6138.",
  "Manutenção de esgoto":
    "Enc. Fábio Donizete Lemes De Godoi – fgodoi@sabesp.com.br - (11) 98684-7029.",
  "Reposição de pavimento":
    "Enc. Fabiana Da Silva Galvão – fgalvao@sabesp.com.br - (11) 97325-4810.",
};
export type Photo = { id: string; name: string; data: string };
export type MaintenanceReport = {
  kind: "maintenance-auth";
  version: 2;
  id: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  generatedAt: string | null;
  dataRelatorio: string;
  os: string;
  endereco: string;
  numero: string;
  bairro: string;
  servico: (typeof SERVICES)[number] | "";
  largura: string;
  comprimento: string;
  posicaoIntervencao: (typeof POSITIONS)[number] | "";
  fotos: Photo[];
};
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function newReport(): MaintenanceReport {
  const now = new Date().toISOString();
  return {
    kind: "maintenance-auth",
    version: 2,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    generatedAt: null,
    dataRelatorio: localDate(),
    os: "",
    endereco: "",
    numero: "",
    bairro: "",
    servico: SERVICES[0],
    largura: "",
    comprimento: "",
    posicaoIntervencao: "",
    fotos: [],
  };
}
export function decimal(value: string) {
  const s = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw Error("Informe medidas positivas com até duas casas decimais.");
  return Number(s).toFixed(2).replace(".", ",");
}
function validDate(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s
  );
}
export function parseReport(input: unknown): MaintenanceReport {
  if (!input || typeof input !== "object") throw Error("JSON inválido.");
  const v = input as Record<string, unknown>;
  if (v.kind !== "maintenance-auth")
    throw Error(
      "Este JSON não pertence ao módulo de autorização de manutenção.",
    );
  if (![1, 2, 19].includes(Number(v.version)))
    throw Error("Versão de JSON não suportada.");
  if (
    (v.servico !== "" &&
      !SERVICES.includes(v.servico as (typeof SERVICES)[number])) ||
    (v.posicaoIntervencao !== undefined &&
      v.posicaoIntervencao !== "" &&
      !POSITIONS.includes(
        v.posicaoIntervencao as (typeof POSITIONS)[number],
      )) ||
    (Number(v.version) === 2 && typeof v.posicaoIntervencao !== "string")
  )
    throw Error("Serviço ou posição da intervenção inválidos.");
  if (
    typeof v.id !== "string" ||
    !v.id ||
    typeof v.createdAt !== "string" ||
    !Number.isFinite(Date.parse(v.createdAt)) ||
    !validDate(v.dataRelatorio)
  )
    throw Error("Identificação ou data inválida.");
  const result = newReport();
  for (const key of [
    "os",
    "endereco",
    "numero",
    "bairro",
    "largura",
    "comprimento",
  ] as const) {
    if (typeof v[key] !== "string") throw Error(`Campo inválido: ${key}`);
    result[key] = v[key];
  }
  for (const key of ["os", "numero"] as const)
    if (result[key] && !/^\d+$/.test(result[key]))
      throw Error(`Campo inteiro inválido: ${key}`);
  for (const key of ["largura", "comprimento"] as const)
    if (result[key]) result[key] = decimal(result[key]);
  if (!Array.isArray(v.fotos)) throw Error("Lista de fotografias inválida.");
  const photos = v.fotos.map((p: unknown) => {
    if (!p || typeof p !== "object") throw Error("Fotografia inválida.");
    const f = p as Record<string, unknown>;
    if (
      typeof f.data !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(f.data)
    )
      throw Error("Formato de fotografia inválido. Utilize JPEG, PNG ou WebP.");
    return {
      id: typeof f.id === "string" ? f.id : crypto.randomUUID(),
      name: typeof f.name === "string" ? f.name : "Fotografia",
      data: f.data,
    };
  });
  if (new Set(photos.map((p) => p.id)).size !== photos.length)
    throw Error("Fotografias com identificadores duplicados.");
  return {
    ...result,
    id: v.id,
    createdAt: v.createdAt,
    dataRelatorio: v.dataRelatorio,
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : v.createdAt,
    archivedAt: typeof v.archivedAt === "string" ? v.archivedAt : null,
    generatedAt: typeof v.generatedAt === "string" ? v.generatedAt : null,
    servico: v.servico as MaintenanceReport["servico"],
    posicaoIntervencao: (v.posicaoIntervencao ??
      "") as MaintenanceReport["posicaoIntervencao"],
    fotos: photos,
  };
}
export function validate(r: MaintenanceReport) {
  for (const [label, value] of [
    ["Número da OS", r.os],
    ["Endereço", r.endereco],
    ["Número", r.numero],
    ["Bairro", r.bairro],
    ["Largura", r.largura],
    ["Comprimento", r.comprimento],
  ])
    if (!value.trim()) throw Error(`Preencha ${label}.`);
  if (!r.servico || !r.posicaoIntervencao)
    throw Error("Selecione o serviço e a posição da intervenção.");
  parseReport(r);
}
export function fileName(r: MaintenanceReport) {
  return `AUTORIZACAO-MANUTENCAO-OS-${r.os || "rascunho"}-${r.dataRelatorio}`;
}
