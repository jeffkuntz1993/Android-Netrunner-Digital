// Official Netrunner game symbols from the Null Signal Games Visual Assets pack v1.5
// (NSG_CREDIT.svg, NSG_RECURRING_CREDIT.svg). Licensed CC BY-ND 4.0: the paths are
// used unmodified, only the fill colour changes (it follows the CSS text colour).
// https://creativecommons.org/licenses/by-nd/4.0/

const CREDIT_VIEWBOX = '0 0 32595 32595';
const CREDIT_PATH =
  'M16296.3,0.006l8549.41,8549.41l0,15493.8l-8549.41,8549.41l-8549.41,-8549.41l-0,-15493.8l8549.41,-8549.41Zm-6059.93,23027.7l6059.93,6059.93l-0,-12709.5l6059.92,-6059.92l-0,-753.396l-6059.92,-6059.93l-6059.93,6059.93l0,13462.9Z';

const RECURRING_CREDIT_VIEWBOX = '0 0 5867 5867';
const RECURRING_CREDIT_PATH =
  'M3838.39,143.024c617.13,165.092 1200.85,530.653 1751.16,1096.68l-253.535,247.638c-503.138,-518.861 -1033.79,-851.01 -1591.96,-996.449c-444.177,-117.923 -896.215,-113.992 -1356.11,11.793c-373.423,98.269 -737.019,273.188 -1090.79,524.757l489.381,229.95l-1509.41,383.249l636.784,-1420.97l147.404,536.549c43.238,-31.446 84.511,-58.961 123.819,-82.546c357.699,-239.777 727.191,-412.73 1108.48,-518.861c522.792,-141.508 1037.72,-145.438 1544.79,-11.792Zm-2099.03,1774.74l1373.8,-1379.7l1379.7,1379.7l0,2523.55l-1379.7,1379.7l-1373.8,-1379.7l0,-2523.55Zm2399.73,253.534l0,-106.13l-1025.93,-1020.03l-1020.03,1020.03l0,2228.74l1020.03,1025.93l-0,-2128.51l1025.93,-1020.03Z';

// Sized to the surrounding text by default so it can sit inline like the "c" it replaces.
const DEFAULT_CLASS = 'inline-block w-[1em] h-[1em] align-[-0.125em] shrink-0';

export function CreditIcon({ className = DEFAULT_CLASS, title = 'credit' }: { className?: string; title?: string }) {
  return (
    <svg viewBox={CREDIT_VIEWBOX} fill="currentColor" fillRule="nonzero" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <path d={CREDIT_PATH} />
    </svg>
  );
}

export function RecurringCreditIcon({ className = DEFAULT_CLASS, title = 'recurring credit' }: { className?: string; title?: string }) {
  return (
    <svg viewBox={RECURRING_CREDIT_VIEWBOX} fill="currentColor" fillRule="nonzero" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <path d={RECURRING_CREDIT_PATH} />
    </svg>
  );
}

/** A number of credits, written the way cards print it: "3" followed by the credit symbol. */
export function Credits({ amount, className = '' }: { amount: number | string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.15em] whitespace-nowrap ${className}`}>
      {amount}
      <CreditIcon />
    </span>
  );
}

// HTML versions for card text rendered through dangerouslySetInnerHTML.
const svgHtml = (viewBox: string, path: string, label: string) =>
  `<svg viewBox="${viewBox}" fill="currentColor" fill-rule="nonzero" class="${DEFAULT_CLASS}" role="img" aria-label="${label}"><path d="${path}"/></svg>`;

export const CREDIT_ICON_HTML = svgHtml(CREDIT_VIEWBOX, CREDIT_PATH, 'credit');
export const RECURRING_CREDIT_ICON_HTML = svgHtml(RECURRING_CREDIT_VIEWBOX, RECURRING_CREDIT_PATH, 'recurring credit');
