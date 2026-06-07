import type { ReactNode, SVGProps } from 'react';

type SectionIconId =
  | 'assets'
  | 'learning'
  | 'calculator'
  | 'news'
  | 'indicators'
  | 'analysis';

interface Props {
  id: SectionIconId;
  className?: string;
}

function IconShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-prime-gold/25 bg-gradient-to-br from-prime-gold/[0.14] to-transparent shadow-[inset_0_1px_0_rgba(245,215,110,0.12),0_0_18px_rgba(212,175,55,0.08)] ${className}`}
    >
      {children}
    </span>
  );
}

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden {...props}>
      {children}
    </svg>
  );
}

export function SectionIcon({ id, className }: Props) {
  const stroke = 'text-prime-gold-light';

  switch (id) {
    case 'assets':
      return (
        <IconShell className={className}>
          <Svg className={`h-[18px] w-[18px] ${stroke}`}>
            <path d="M4 18V8l8-4 8 4v10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 14l3-2 3 2 4-3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none" className="text-prime-gold" />
          </Svg>
        </IconShell>
      );
    case 'learning':
      return (
        <IconShell className={className}>
          <Svg className={`h-[18px] w-[18px] ${stroke}`}>
            <path d="M12 4L4 8v8l8 4 8-4V8l-8-4z" strokeLinejoin="round" />
            <path d="M12 12l8-4M12 12v8M12 12L4 8" strokeLinecap="round" />
          </Svg>
        </IconShell>
      );
    case 'calculator':
      return (
        <IconShell className={className}>
          <Svg className={`h-[18px] w-[18px] ${stroke}`}>
            <rect x="5" y="3" width="14" height="18" rx="2.5" />
            <path d="M8 8h8M8 12h3M13 12h3M8 16h3M13 16h3" strokeLinecap="round" />
          </Svg>
        </IconShell>
      );
    case 'news':
      return (
        <IconShell className={className}>
          <Svg className={`h-[18px] w-[18px] ${stroke}`}>
            <path d="M6 5h12v14H6z" strokeLinejoin="round" />
            <path d="M9 9h6M9 12h6M9 15h4" strokeLinecap="round" />
            <path d="M18 7v12" strokeLinecap="round" className="text-prime-gold" strokeWidth={2} />
          </Svg>
        </IconShell>
      );
    case 'indicators':
      return (
        <IconShell className={className}>
          <Svg className={`h-[18px] w-[18px] ${stroke}`}>
            <path d="M4 18V6M4 18h16" strokeLinecap="round" />
            <path d="M8 14V10M12 14V7M16 14v-5" strokeLinecap="round" />
          </Svg>
        </IconShell>
      );
    case 'analysis':
    default:
      return (
        <IconShell className={className}>
          <Svg className={`h-[18px] w-[18px] ${stroke}`}>
            <circle cx="12" cy="12" r="7" />
            <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 5l2 2M19 5l-2 2" strokeLinecap="round" className="text-prime-gold/80" />
          </Svg>
        </IconShell>
      );
  }
}

export type { SectionIconId };
