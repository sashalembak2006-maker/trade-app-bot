interface Props {
  flags: [string, string?];
  size?: 'sm' | 'md';
}

export function AssetIcon({ flags, size = 'md' }: Props) {
  const box = size === 'sm' ? 'h-8 w-10' : 'h-9 w-11';
  const circle = size === 'sm' ? 'h-6 w-6 text-sm' : 'h-7 w-7 text-base';

  return (
    <div className={`relative shrink-0 ${box}`}>
      <span
        className={`absolute left-0 top-1 flex ${circle} items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-md ring-2 ring-[#0a0a0f]`}
      >
        {flags[0]}
      </span>
      {flags[1] && (
        <span
          className={`absolute right-0 top-0 flex ${circle} items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-md ring-2 ring-[#0a0a0f]`}
        >
          {flags[1]}
        </span>
      )}
    </div>
  );
}
