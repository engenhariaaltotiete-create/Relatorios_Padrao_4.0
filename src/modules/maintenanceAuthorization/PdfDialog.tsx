import { useEffect, useId, useRef, useState } from "react";
import { download } from "./images";

export type GeneratedPdf = { blob: Blob; fileName: string };

export function PdfDialog({
  pdf,
  onClose,
}: {
  pdf: GeneratedPdf;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const file = new File([pdf.blob], pdf.fileName, {
      type: "application/pdf",
    });
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    const element = dialog.current!;
    element.showModal();
    return () => {
      if (element.open) element.close();
      // Keep the URL briefly so a newly opened PDF tab can finish loading.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    };
  }, [pdf]);

  const share = async () => {
    const file = new File([pdf.blob], pdf.fileName, {
      type: "application/pdf",
    });
    setMessage("");
    if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
      setMessage(
        "Este navegador não permite compartilhar arquivos. Use Baixar PDF ou Abrir.",
      );
      return;
    }
    setSharing(true);
    try {
      await navigator.share({ files: [file], title: pdf.fileName });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setMessage(
          "Não foi possível compartilhar o arquivo. Use Baixar PDF ou Abrir.",
        );
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="ma-pdf-dialog"
      aria-labelledby={headingId}
      onClose={() => {
        // Ignore a queued cleanup event if StrictMode already reopened the dialog.
        if (!dialog.current?.open) onClose();
      }}
    >
      <h2 id={headingId}>PDF gerado</h2>
      <p>O arquivo foi criado diretamente no navegador.</p>
      <div className="ma-actions">
        <button autoFocus onClick={() => download(pdf.blob, pdf.fileName)}>
          Baixar PDF
        </button>
        <button disabled={sharing} onClick={() => void share()}>
          Compartilhar
        </button>
        <a
          href={url || undefined}
          target="_blank"
          rel="noopener noreferrer"
          title={pdf.fileName}
        >
          Abrir
        </a>
        <button onClick={() => dialog.current?.close()}>Fechar</button>
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </dialog>
  );
}
