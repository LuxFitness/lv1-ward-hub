import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Member } from '@/types';

interface MemberComboboxProps {
  value: Member | null;
  onChange: (m: Member | null) => void;
  placeholder?: string;
  className?: string;
}

export function MemberCombobox({
  value,
  onChange,
  placeholder = 'Search for a member…',
  className,
}: MemberComboboxProps) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const inputRef          = useRef<HTMLInputElement>(null);
  const dropdownRef       = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => apiFetch<Member[]>('/api/members'),
  });

  const filtered = open
    ? members.filter(m => !query || m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : [];

  useEffect(() => {
    if (open && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 2, left: r.left, width: r.width });
    }
  }, [open]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const inInput = inputRef.current?.contains(e.target as Node);
      const inDrop  = dropdownRef.current?.contains(e.target as Node);
      if (!inInput && !inDrop) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <>
      {!open ? (
        <button
          onClick={() => { setQuery(''); setOpen(true); }}
          className={cn(
            'w-full text-left text-sm px-3 py-2 rounded-lg border border-border bg-background',
            'hover:bg-muted/40 transition-colors',
            value ? 'text-foreground' : 'text-muted-foreground italic',
            className,
          )}
        >
          {value?.name ?? placeholder}
        </button>
      ) : (
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search members…"
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setQuery(''); }
            if (e.key === 'Enter' && filtered[0]) { onChange(filtered[0]); setOpen(false); setQuery(''); }
          }}
          className={cn(
            'w-full text-sm px-3 py-2 rounded-lg border border-primary/40 bg-primary/5 outline-none focus:ring-2 focus:ring-primary/30',
            className,
          )}
        />
      )}
      {open && filtered.length > 0 && dropPos && (
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-card border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto"
        >
          {filtered.map(m => (
            <button
              key={m.id}
              onMouseDown={() => { onChange(m); setOpen(false); setQuery(''); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
