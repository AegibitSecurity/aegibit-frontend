import { useEffect, useState } from 'react';

// AEGIBIT shield — matches brand logo: orange shield, white inner cutout, V at bottom
const ShieldLogo = () => (
  <svg viewBox="0 0 80 92" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Outer shield body */}
    <path
      d="M40 4L72 16V46C72 66 58 78 40 88C22 78 8 66 8 46V16L40 4Z"
      fill="#F05228"
    />
    {/* White inner area — C-shape opening top-right */}
    <path
      d="M40 20C40 20 60 28 60 28V48C60 60 52 68 40 74C28 68 20 60 20 48V28Z"
      fill="white"
      opacity="0.92"
    />
    {/* Orange V fill at bottom of inner — creates the shield check motif */}
    <path
      d="M28 36L40 52L52 36V28H28Z"
      fill="#F05228"
    />
    {/* Top-right gap — the open "C" at the top of the inner white area */}
    <path
      d="M52 20C56 22 60 25 60 28L52 28Z"
      fill="#F05228"
    />
  </svg>
);

export default function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1800);
    const doneTimer = setTimeout(() => onDone?.(), 2200);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  return (
    <div className={`splash-screen${fading ? ' fade-out' : ''}`}>
      <div className="splash-logo-wrap">
        <ShieldLogo />
        <div>
          <div className="splash-wordmark">AEGIBIT</div>
          <div className="splash-tagline">Securing Tomorrow, Today</div>
        </div>
        <div className="splash-pulse" />
      </div>
    </div>
  );
}
