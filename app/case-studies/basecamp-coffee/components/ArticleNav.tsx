'use client';

import { useEffect, useState } from 'react';

export interface ArticleSection {
  id: string;
  number: string;
  title: string;
}

interface ArticleNavProps {
  sections: ArticleSection[];
  /** Offset from viewport top for both scroll-spy and click-to-jump. */
  topOffset?: number;
}

export function ArticleNav({ sections, topOffset = 120 }: ArticleNavProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    let rafId: number | null = null;

    function update() {
      rafId = null;
      let current = sections[0]?.id ?? '';
      for (const { id } of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - topOffset <= 0) current = id;
      }
      setActiveId(current);
    }

    function onScroll() {
      if (rafId === null) rafId = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [sections, topOffset]);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - topOffset + 1;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  return (
    <nav
      aria-label="Article sections"
      className="hidden xl:block fixed top-32 left-4 w-[140px] 2xl:left-8 2xl:w-[200px] z-30"
    >
      <p
        className="m-0 mb-3 text-[10px] uppercase tracking-[0.22em] text-[var(--cream-dim)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
      >
        Contents
      </p>
      <ul className="m-0 p-0 list-none flex flex-col">
        {sections.map(({ id, number, title }) => {
          const isActive = id === activeId;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => jumpTo(id)}
                aria-current={isActive ? 'true' : undefined}
                className={[
                  'group w-full text-left flex items-baseline gap-2.5 py-1.5 pl-2.5 cursor-pointer bg-transparent',
                  'border-l border-transparent transition-colors',
                  isActive ? 'border-[var(--gold)]' : 'hover:border-[rgba(212,165,116,0.35)]',
                ].join(' ')}
              >
                <span
                  className={[
                    'text-[10px] tracking-[0.12em] transition-colors',
                    isActive
                      ? 'text-[var(--gold-bright)]'
                      : 'text-[var(--cream-dim)] group-hover:text-[var(--cream-muted)]',
                  ].join(' ')}
                  style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
                >
                  {number}
                </span>
                <span
                  className={[
                    'text-[13px] leading-[1.3] transition-colors',
                    isActive
                      ? 'text-[var(--cream)] font-medium'
                      : 'text-[var(--cream-dim)] group-hover:text-[var(--cream-muted)]',
                  ].join(' ')}
                >
                  {title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
