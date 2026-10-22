import { jsPDF } from "jspdf";
import logoUrl from "./logo.jpg";
import {
  COMPANY,
  EXECUTION,
  REQUESTERS,
  decimal,
  validate,
  type MaintenanceReport,
} from "./model";
import { loadImage } from "./images";
export const PDF_LAYOUT = {
  width: 210,
  height: 297,
  margin: 15,
  top: 30,
  bottom: 267,
  fontSize: 11.5,
  lineHeight: ((11.5 * 25.4) / 72) * 1.5,
};
type Run = { text: string; bold?: boolean };
const displayText = (text: string) =>
  text.trim().replace(/^./u, (c) => c.toLocaleUpperCase("pt-BR"));
const normal = (text: string): Run => ({ text });
const bold = (text: string): Run => ({ text, bold: true });
export async function generatePdf(r: MaintenanceReport): Promise<Blob> {
  validate(r);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logo = await loadImage(logoUrl);
  const logoHeight = 23,
    logoWidth = (logoHeight * logo.naturalWidth) / logo.naturalHeight;
  const { margin, top, bottom, fontSize, lineHeight } = PDF_LAYOUT;
  const width = 210 - 2 * margin;
  const firstBaseline = top + (fontSize * 25.4 * 1.1) / 72;
  const lastBaseline = bottom - (fontSize * 25.4 * 0.31) / 72;
  let y = firstBaseline;
  const font = (b = false, size = fontSize) => {
    doc.setFont("helvetica", b ? "bold" : "normal");
    doc.setFontSize(size);
  };
  function header(photo = false) {
    doc.addImage(logo, "JPEG", margin, 3, logoWidth, logoHeight);
    if (photo) {
      font(true, 12);
      doc.text(
        `Relatório Fotográfico - OS${r.os}`,
        margin + logoWidth + 8,
        17,
        { maxWidth: width - logoWidth - 8 },
      );
    }
  }
  header();
  function nextPage() {
    doc.addPage();
    header();
    y = firstBaseline;
  }
  // Mede cada palavra com a fonte efetiva. Palavras sem espaços também são quebradas.
  function lines(runs: Run[]): Run[][] {
    const result: Run[][] = [[]];
    let used = 0;
    for (const run of runs) {
      font(run.bold);
      for (const word of run.text.split(/(\s+)/).filter(Boolean)) {
        if (/^\s+$/.test(word)) {
          if (used > 0 && used + doc.getTextWidth(" ") <= width) {
            result.at(-1)!.push({ ...run, text: " " });
            used += doc.getTextWidth(" ");
          }
          continue;
        }
        if (used > 0 && used + doc.getTextWidth(word) > width) {
          result.push([]);
          used = 0;
        }
        let part = "";
        for (const char of word) {
          const w = doc.getTextWidth(char);
          if (used + w > width) {
            if (part) result.at(-1)!.push({ ...run, text: part });
            result.push([]);
            used = 0;
            part = "";
          }
          part += char;
          used += w;
        }
        if (part) result.at(-1)!.push({ ...run, text: part });
      }
    }
    return result;
  }
  function paragraph(runs: Run[], gap = 1.6, keep = false) {
    const wrapped = lines(runs);
    if (keep && y + (wrapped.length - 1) * lineHeight > lastBaseline)
      nextPage();
    for (const line of wrapped) {
      if (y > lastBaseline) nextPage();
      let x = margin;
      for (const run of line) {
        font(run.bold);
        doc.text(run.text, x, y);
        x += doc.getTextWidth(run.text);
      }
      y += lineHeight;
    }
    y += gap;
  }
  const p = (s: string, gap = 1.6) => paragraph([normal(s)], gap);
  const field = (label: string, value: string, gap = 1.6) =>
    paragraph([normal(label), bold(value)], gap);
  field("OLMS – OS ", r.os, 2.5);
  field(
    "Suzano, ",
    `${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${r.dataRelatorio}T12:00:00`))}.`,
    3,
  );
  p("Ref.: Autorização para execução de serviço de manutenção emergencial", 3);
  p("Senhor secretário,", 2.5);
  paragraph([
    normal("Solicitamos autorização para execução da "),
    bold(r.servico.charAt(0).toLocaleLowerCase("pt-BR") + r.servico.slice(1)),
    normal("."),
  ]);
  paragraph([
    normal("Endereço: "),
    bold(displayText(r.endereco)),
    normal(", "),
    bold(r.numero),
    normal(", "),
    bold(displayText(r.bairro)),
    normal(" – SUZANO/SP"),
  ]);
  field("Data: ", EXECUTION);
  paragraph([
    normal("Prazo aproximado para execução: "),
    bold(r.prazoExecucao),
    normal(" horas"),
  ]);
  paragraph([
    normal("Medidas aproximadas: "),
    bold(decimal(r.largura)),
    normal("m x "),
    bold(decimal(r.comprimento)),
    normal("m"),
  ]);
  field("Interdição da via: ", r.interdicao);
  field("Empresa responsável pela execução: ", COMPANY);
  field("Solicitante: ", r.servico ? REQUESTERS[r.servico] : "", lineHeight);
  paragraph(
    [
      bold(
        "Abaixo, segue o Relatório Fotográfico, que apresenta a situação do local antes da execução do serviço.",
      ),
    ],
    3,
  );
  p(
    "Aproveitamos a oportunidade para apresentar nossos protestos de consideração.",
    4,
  );
  if (y + lineHeight * 2 + 3 > lastBaseline) nextPage();
  p("JOCELMA GONÇALVES DA SILVA", 0);
  p("Coordenadora", 3);
  if (y + lineHeight * 3 > lastBaseline) nextPage();
  paragraph([normal("Excelentíssimo Senhor")], 0, true);
  p("Samuel de Oliveira", 0);
  p("Secretaria Municipal de Manutenção e Serviços Urbanos", 0);
  p("Prefeitura Municipal de Suzano", 0);
  for (const photo of r.fotos) {
    const image = await loadImage(photo.data);
    doc.addPage();
    header(true);
    const scale = Math.min(
      width / image.naturalWidth,
      (bottom - top) / image.naturalHeight,
    );
    const w = image.naturalWidth * scale,
      h = image.naturalHeight * scale;
    doc.addImage(
      image,
      photo.data.startsWith("data:image/png")
        ? "PNG"
        : photo.data.startsWith("data:image/webp")
          ? "WEBP"
          : "JPEG",
      margin + (width - w) / 2,
      top + (bottom - top - h) / 2,
      w,
      h,
    );
  }
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(150);
    doc.line(margin, 270, 195, 270);
    font(false, 8);
    for (const [i, text] of [
      "Divisão de Manutenção e Serviços Operacionais Suzano – OLMS",
      "Companhia de Saneamento Básico do Estado de São Paulo - Sabesp",
      "Rua Benjamin Constant, 1980 – Centro – CEP 08674-178 – Suzano – SP – Tel. 55 (11) 4746-5300",
      "www.sabesp.com.br",
    ].entries())
      doc.text(text, margin, 275 + i * 3.8, { maxWidth: width });
    font(false, 8);
    doc.text(`${page}/${total}`, 195, 293, { align: "right" });
  }
  return doc.output("blob");
}
