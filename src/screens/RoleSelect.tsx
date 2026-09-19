import type { Mode } from '../state/demo';

export interface RoleSelectProps {
  onChoose: (mode: Mode) => void;
}

const OPTIONS: { mode: Mode; title: string; detail: string }[] = [
  { mode: 'founder', title: "I'm a founder", detail: 'Create your startup profile' },
  { mode: 'investor', title: "I'm an investor", detail: 'Build your investor profile and swipe matched startups' },
  { mode: 'skip', title: 'Skip to swiping', detail: 'Browse startups in random order' },
];

export function RoleSelect({ onChoose }: RoleSelectProps) {
  return (
    <main className="screen role-select">
      <header>
        <p className="muted">Slush matchmaking</p>
        <h1>Blendr</h1>
        <p>Meet the right founders and investors before the doors open.</p>
      </header>
      <div className="role-options">
        {OPTIONS.map((o) => (
          <button key={o.mode} type="button" className="role-option" onClick={() => onChoose(o.mode)}>
            <span className="role-title">{o.title}</span>
            <span className="muted">{o.detail}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
