import { useState } from 'react';
import { getKeyword } from '../../shared/taxonomy';

export interface KeywordListProps {
  keywords: { id: string; reason: string }[];
  matchedIds?: string[];
  onRemove?: (id: string) => void;
}

const labelOf = (id: string) => getKeyword(id)?.label ?? id;

export function KeywordList({ keywords, matchedIds = [], onRemove }: KeywordListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = keywords.find((k) => k.id === openId);

  return (
    <div className="keywords">
      <ul className="chips">
        {keywords.map((k) => {
          const matched = matchedIds.includes(k.id);
          const classes = ['chip', matched && 'chip-matched', openId === k.id && 'chip-open'].filter(Boolean).join(' ');
          return (
            <li key={k.id} className={classes}>
              <button
                type="button"
                className="chip-label"
                title={k.reason}
                aria-expanded={openId === k.id}
                onClick={() => setOpenId(openId === k.id ? null : k.id)}
              >
                {matched && <span aria-hidden="true">✓ </span>}
                {labelOf(k.id)}
              </button>
              {onRemove && (
                <button type="button" className="chip-remove" aria-label={`Remove ${labelOf(k.id)}`} onClick={() => onRemove(k.id)}>
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {open && (
        <p className="chip-reason" role="status">
          <strong>{labelOf(open.id)}:</strong> {open.reason}
        </p>
      )}
    </div>
  );
}
