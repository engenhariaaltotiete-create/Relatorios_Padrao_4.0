import type { StoredFile } from '../types';
import { MemoryTextInput } from './MemoryTextInput';

type Props = {
  files: StoredFile[];
  onDescription: (index: number, text: string) => void;
  onRemove: (index: number) => void;
  onTitle?: (index: number, text: string) => void;
  titleRequired?: boolean;
  descriptionRequired?: boolean;
};

export function FileCards({ files, onDescription, onRemove, onTitle, titleRequired, descriptionRequired }: Props) {
  if (!files.length) return <div className="empty">Nenhum arquivo adicionado.</div>;
  return (
    <div className="file-grid">
      {files.map((f, i) => {
        const canPreview = f.type.startsWith('image/') && !/tiff?/i.test(f.type);
        return (
          <article className="file-card" key={f.id}>
            {canPreview ? <img src={f.data} alt={f.titulo || f.name} /> : <div className="file-placeholder">{f.name}<small>{f.type || 'arquivo'}</small></div>}
            <div className="file-name">{f.name}</div>
            {onTitle && <MemoryTextInput label="Título" value={f.titulo || ''} required={titleRequired} memoryKey="anexo_titulo" onChange={(text) => onTitle(i, text)} />}
            <label className="field"><span>Descrição{descriptionRequired && <b className="required"> *</b>}</span><textarea required={descriptionRequired} value={f.descricao} onChange={(e) => onDescription(i, e.target.value)} /></label>
            <button type="button" className="ghost danger-text" onClick={() => onRemove(i)}>Remover</button>
          </article>
        );
      })}
    </div>
  );
}
