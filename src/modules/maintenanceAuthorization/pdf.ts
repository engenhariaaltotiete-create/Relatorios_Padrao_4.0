import { jsPDF } from "jspdf";
import { PDFDocument, StandardFonts } from "pdf-lib";
import logoUrl from "./logo.jpg";
import {
  COMPANY,
  REQUESTERS,
  decimal,
  pdfFileName,
  validate,
  type MaintenanceReport,
} from "./model";
import { loadImage } from "./images";
export const PDF_LAYOUT = {
  width: 210,
  height: 297,
  margin: 15,
  top: 40,
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
  doc.setProperties({ title: pdfFileName(r) });
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
  // Use exact standard-font metrics; jsPDF's rounded widths can shift right-aligned text past the margin.
  const metrics = await PDFDocument.create();
  const regularMetrics = await metrics.embedFont(StandardFonts.Helvetica);
  const boldMetrics = await metrics.embedFont(StandardFonts.HelveticaBold);
  const textWidth = (text: string) =>
    (Array.from(text).reduce(
      (width, char) =>
        width +
        (doc.getFont().fontStyle === "bold"
          ? boldMetrics
          : regularMetrics
        ).widthOfTextAtSize(char, doc.getFontSize()),
      0,
    ) *
      25.4) /
    72;
  function header(photo = false) {
    doc.addImage(logo, "JPEG", 195 - logoWidth, 10, logoWidth, logoHeight);
    if (photo) {
      font(true, 12);
      doc.text(`Relatório Fotográfico - OS ${r.os}`, 105, 17, {
        align: "center",
        maxWidth: width - 2 * (logoWidth + 8),
      });
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
          if (used > 0 && used + textWidth(" ") <= width) {
            result.at(-1)!.push({ ...run, text: " " });
            used += textWidth(" ");
          }
          continue;
        }
        if (used > 0 && used + textWidth(word) > width) {
          result.push([]);
          used = 0;
        }
        let part = "";
        for (const char of word) {
          const w = textWidth(char);
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
  function paragraph(
    runs: Run[],
    gap = 0,
    keep = false,
    align: "left" | "right" = "left",
  ) {
    const wrapped = lines(runs);
    if (keep && y + (wrapped.length - 1) * lineHeight > lastBaseline)
      nextPage();
    for (const line of wrapped) {
      if (y > lastBaseline) nextPage();
      const lineWidth = line.reduce((sum, run) => {
        font(run.bold);
        return sum + textWidth(run.text);
      }, 0);
      let x = align === "right" ? 195 - lineWidth : margin;
      for (const run of line) {
        font(run.bold);
        doc.text(run.text, x, y);
        x += textWidth(run.text);
      }
      y += lineHeight;
    }
    y += gap;
  }
  const p = (text: string, gap = 0, align: "left" | "right" = "left") =>
    paragraph([normal(text)], gap, false, align);
  const field = (label: string, value: string, gap = lineHeight) =>
    paragraph([normal(label), bold(value)], gap);
  paragraph([bold(`OLMS – OS ${r.os}`)], lineHeight);
  paragraph(
    [
      normal("Suzano, "),
      bold(
        `${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${r.dataRelatorio}T12:00:00`))}.`,
      ),
    ],
    lineHeight * 2,
    false,
    "right",
  );
  paragraph(
    [
      bold(
        "Ref.: Autorização para execução de serviço de manutenção emergencial",
      ),
    ],
    lineHeight,
  );
  p("Senhor secretário,", lineHeight);
  paragraph([
    normal("Solicitamos autorização para execução da "),
    bold(r.servico.charAt(0).toLocaleLowerCase("pt-BR") + r.servico.slice(1)),
    normal("."),
  ]);
  paragraph([
    normal("Endereço: "),
    bold(
      `${displayText(r.endereco)}, ${r.numero}, ${displayText(r.bairro)} – SUZANO/SP`,
    ),
  ]);
  field(
    "Medidas aproximadas: ",
    `${decimal(r.largura)}m x ${decimal(r.comprimento)}m`,
    0,
  );
  field("Posição da intervenção na via: ", r.posicaoIntervencao);
  field("Empresa responsável pela execução: ", COMPANY);
  field("Solicitante: ", r.servico ? REQUESTERS[r.servico] : "");
  paragraph(
    [
      bold(
        "Abaixo, segue o Relatório Fotográfico, que apresenta a situação do local antes da execução do serviço.",
      ),
    ],
    lineHeight,
  );
  p(
    "Aproveitamos a oportunidade para apresentar nossos protestos de consideração.",
    lineHeight,
  );
if (y + lineHeight * 3 > lastBaseline) nextPage();

y += lineHeight * 2;

paragraph([bold("JOCELMA GONÇALVES DA SILVA")], 0, false, "right");
p("Coordenadora", lineHeight, "right");
  if (y + lineHeight * 6 > lastBaseline) nextPage();

y += lineHeight * 2;

p("Excelentíssimo Senhor", 0, "left");
  paragraph([bold("SAMUEL DE OLIVEIRA")], 0, false, "left");
  p("Secretaria Municipal de Manutenção e Serviços Urbanos", 0, "left");
  p("Prefeitura Municipal de Suzano", 0, "left");
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
      doc.text(text, margin, 275 + i * 3.8, { maxWidth: width - 14 });
    font(false, 10);
    doc.text(`${page}/${total}`, 195, 282, { align: "right" });
  }
  return doc.output("blob");
}
