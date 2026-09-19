export interface MySlushProps {
  onRestart: () => void;
}

/** The end of the investor path: only the look of a hand-off to My Slush. It never resolves. */
export function MySlush({ onRestart }: MySlushProps) {
  return (
    <main className="screen my-slush">
      <div className="my-slush-body">
        <h1>Redirecting you to My Slush</h1>
        <div className="spinner" role="status" aria-label="Loading" />
      </div>
      <div className="step-actions">
        <button type="button" className="btn btn-primary" onClick={onRestart}>
          Restart the demo
        </button>
      </div>
    </main>
  );
}
