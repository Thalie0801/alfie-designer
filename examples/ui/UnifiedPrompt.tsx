import React, { useState } from 'react';

type Props = {
  onCreate: (payload: {
    format: 'image' | 'carousel' | 'reel';
    objective: string;
    styleChoice: 'template_canva' | 'ia';
    premiumT2VRequested: boolean;
  }) => Promise<void> | void;
};

export default function UnifiedPrompt({ onCreate }: Props) {
  const [format, setFormat] = useState<'image' | 'carousel' | 'reel'>('image');
  const [objective, setObjective] = useState('');
  const [styleChoice, setStyleChoice] = useState<'template_canva' | 'ia'>('template_canva');
  const [premium, setPremium] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFormatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormat(event.target.value as 'image' | 'carousel' | 'reel');
  };

  const handleStyleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStyleChoice(event.target.value as 'template_canva' | 'ia');
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await onCreate({
        format,
        objective,
        styleChoice,
        premiumT2VRequested: premium
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ad-unified">
      <label htmlFor="format">Format</label>
      <select id="format" value={format} onChange={handleFormatChange} disabled={submitting}>
        <option value="image">Image</option>
        <option value="carousel">Carrousel</option>
        <option value="reel">Reel 9:16</option>
      </select>

      <label htmlFor="objective">Objectif</label>
      <input
        id="objective"
        value={objective}
        onChange={(event) => setObjective(event.target.value)}
        placeholder="Teaser octobre, promo -20 %, etc."
        disabled={submitting}
      />

      <label htmlFor="style">Style</label>
      <select id="style" value={styleChoice} onChange={handleStyleChange} disabled={submitting}>
        <option value="template_canva">Template Canva</option>
        <option value="ia">IA (Nano-Banana / Éco T2V)</option>
      </select>

      {format === 'reel' && (
        <label className="premium">
          <input
            type="checkbox"
            checked={premium}
            onChange={(event) => setPremium(event.target.checked)}
            disabled={submitting}
          />
          Demander un plan Premium (Woofs)
        </label>
      )}

      <button onClick={submit} disabled={submitting}>
        {submitting ? 'Création…' : 'Créer'}
      </button>

      <style jsx>{`
        .ad-unified {
          display: grid;
          gap: 8px;
          max-width: 420px;
          background: var(--surface, #fff);
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(14, 23, 38, 0.08);
        }
        label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-strong, #1b263b);
        }
        label.premium {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        input,
        select,
        button {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(27, 38, 59, 0.16);
          font-size: 14px;
        }
        button {
          margin-top: 4px;
          cursor: pointer;
          background: #1b7fff;
          color: #fff;
          border: none;
          font-weight: 600;
        }
        button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
