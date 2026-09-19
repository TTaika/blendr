import type { Profile } from '../../shared/types';
import { CompanyCard } from '../components/CompanyCard';
import { companyFromFounderProfile } from '../lib/founderCard';

export interface FounderPreviewProps {
  profile: Profile;
  onStartOver: () => void;
}

export function FounderPreview({ profile, onStartOver }: FounderPreviewProps) {
  return (
    <main className="screen">
      <header>
        <p className="muted">Profile submitted</p>
        <h1>You're live!</h1>
        <p className="muted">This is how investors will see your card. Tap a keyword to see why it was chosen.</p>
      </header>
      <CompanyCard company={companyFromFounderProfile(profile)} allKeywords />
      <button type="button" className="btn btn-ghost" onClick={onStartOver}>
        Start over
      </button>
    </main>
  );
}
