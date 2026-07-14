export function Rose({ className = 'rose', bearing = 0 }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <g transform={`rotate(${bearing} 16 16)`}>
        <path d="M16 3.5 L19 16 L16 28.5 L13 16 Z" fill="currentColor" />
        <path d="M16 3.5 L19 16 L16 16 Z" fill="currentColor" opacity="0.45" />
      </g>
      <path d="M3.5 16 H28.5" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const wrap = (children) => (
  <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
    {children}
  </svg>
);

export const icons = {
  pen: wrap(<path d="M4 20l4.5-1.2L20 7.3a2 2 0 0 0-2.8-2.8L5.7 16 4 20z" />),
  line: wrap(<path d="M5 19L19 5" />),
  arrow: wrap(
    <>
      <path d="M5 19L19 5" />
      <path d="M19 11V5h-6" />
    </>
  ),
  rect: wrap(<rect x="4" y="6" width="16" height="12" rx="1" />),
  ellipse: wrap(<ellipse cx="12" cy="12" rx="8" ry="6" />),
  text: wrap(
    <>
      <path d="M5 6h14" />
      <path d="M12 6v13" />
    </>
  ),
  eraser: wrap(
    <>
      <path d="M8 19h11" />
      <path d="M15.5 5.5l3 3a1.6 1.6 0 0 1 0 2.3l-7 7-5.3-5.3 7-7a1.6 1.6 0 0 1 2.3 0z" />
    </>
  ),
  trash: wrap(
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6 7l1 12h10l1-12" />
    </>
  ),
};
