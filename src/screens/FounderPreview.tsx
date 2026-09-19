import { useEffect, useState } from 'react';
import type { Profile } from '../../shared/types';
import { CompanyCard } from '../components/CompanyCard';
import { companyFromFounderProfile } from '../lib/founderCard';
import { loadPitchVideo } from '../lib/videoStore';

export interface FounderPreviewProps {
  profile: Profile;
  onStartOver: () => void;
  loadVideo?: () => Promise<Blob | null>;
}

export function FounderPreview({ profile, onStartOver, loadVideo = loadPitchVideo }: FounderPreviewProps) {
  const pitchVideo = profile.answers.pitchVideo;
  const hasVideo = typeof pitchVideo === 'string' && pitchVideo.trim() !== '';
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // The founder's own video, kept on this phone. No answer, or no kept video: no video section.
  useEffect(() => {
    if (!hasVideo) return;
    let cancelled = false;
    let url: string | null = null;
    void loadVideo().then((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setVideoUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setVideoUrl(null);
    };
  }, [hasVideo, loadVideo]);

  const company = companyFromFounderProfile(profile);
  return (
    <main className="screen">
      <header>
        <p className="muted">Profile submitted</p>
        <h1>You're live!</h1>
        <p className="muted">This is how investors will see your card. Tap a keyword to see why it was chosen.</p>
      </header>
      <CompanyCard company={videoUrl ? { ...company, videoUrl } : company} allKeywords showContact />
      <button type="button" className="btn btn-ghost" onClick={onStartOver}>
        Start over
      </button>
    </main>
  );
}
