// Sched — the ScheduleManager mascot: a friendly robot holding a calendar,
// personifying the AI that builds your week. Pure SVG, no dependencies; gently
// bobs (and its antenna + chest light pulse) unless the user prefers reduced
// motion.
export function Mascot({
  size = 96,
  className = "",
  title = "Sched, the ScheduleManager robot",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="sm-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="sm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="sm-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <radialGradient id="sm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.95" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>
      <style>{`
        @keyframes sm-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes sm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        @media (prefers-reduced-motion: no-preference) {
          .sm-bob { animation: sm-bob 3s ease-in-out infinite; transform-box: view-box; transform-origin: center; }
          .sm-pulse { animation: sm-pulse 1.6s ease-in-out infinite; }
        }
      `}</style>
      <g className="sm-bob">
        {/* soft shadow */}
        <ellipse cx="60" cy="115" rx="26" ry="4" fill="#0f172a" opacity="0.12" />

        {/* antenna */}
        <line x1="60" y1="12" x2="60" y2="20" stroke="#4338ca" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="60" cy="8" r="11" fill="url(#sm-glow)" className="sm-pulse" />
        <circle cx="60" cy="8" r="4.5" fill="#22d3ee" />
        <circle cx="58.5" cy="6.5" r="1.4" fill="#cffafe" />

        {/* arms reaching down to hold the calendar (behind head/body) */}
        <path d="M40 60 C 28 70, 28 82, 36 86" stroke="#4f46e5" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M80 60 C 92 70, 92 82, 84 86" stroke="#4f46e5" strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* elbow joints */}
        <circle cx="29" cy="76" r="3.2" fill="url(#sm-metal)" />
        <circle cx="91" cy="76" r="3.2" fill="url(#sm-metal)" />

        {/* ears / side bolts */}
        <rect x="24" y="34" width="8" height="18" rx="4" fill="#4338ca" />
        <rect x="88" y="34" width="8" height="18" rx="4" fill="#4338ca" />
        <circle cx="28" cy="43" r="2" fill="#a5b4fc" />
        <circle cx="92" cy="43" r="2" fill="#a5b4fc" />

        {/* head */}
        <rect x="30" y="16" width="60" height="52" rx="18" fill="url(#sm-head)" />
        <rect x="30" y="16" width="60" height="52" rx="18" fill="none" stroke="#4338ca" strokeWidth="1.5" opacity="0.4" />
        {/* bolts on head corners */}
        <circle cx="38" cy="24" r="1.6" fill="#a5b4fc" />
        <circle cx="82" cy="24" r="1.6" fill="#a5b4fc" />
        {/* face screen */}
        <rect x="37" y="26" width="46" height="30" rx="12" fill="#0f172a" />
        <rect x="37" y="26" width="46" height="30" rx="12" fill="none" stroke="#1e293b" strokeWidth="2" />
        {/* eyebrows */}
        <path d="M44 35 q5 -2 10 0" stroke="#22d3ee" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M66 35 q5 -2 10 0" stroke="#22d3ee" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* eyes */}
        <circle cx="49" cy="40" r="5.5" fill="#22d3ee" />
        <circle cx="71" cy="40" r="5.5" fill="#22d3ee" />
        <circle cx="50.5" cy="38.5" r="1.8" fill="#cffafe" />
        <circle cx="72.5" cy="38.5" r="1.8" fill="#cffafe" />
        {/* smile */}
        <path d="M50 48 q10 6 20 0" stroke="#22d3ee" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* status LEDs */}
        <circle cx="42" cy="50" r="1.3" fill="#34d399" />
        <circle cx="78" cy="50" r="1.3" fill="#f59e0b" />

        {/* neck */}
        <rect x="54" y="66" width="12" height="6" rx="2" fill="#4338ca" />

        {/* torso / body with control panel (behind the calendar's lower half) */}
        <rect x="42" y="70" width="36" height="30" rx="10" fill="url(#sm-body)" />
        <circle cx="60" cy="80" r="4" fill="#0f172a" />
        <circle cx="60" cy="80" r="2.2" fill="#22d3ee" className="sm-pulse" />
        <rect x="50" y="90" width="20" height="4" rx="2" fill="#0f172a" opacity="0.5" />
        <circle cx="52" cy="92" r="1.3" fill="#34d399" />
        <circle cx="60" cy="92" r="1.3" fill="#f59e0b" />
        <circle cx="68" cy="92" r="1.3" fill="#f472b6" />

        {/* calendar being held */}
        <g>
          <rect x="34" y="74" width="52" height="40" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
          {/* red header */}
          <path d="M34 82 a8 8 0 0 1 8 -8 h36 a8 8 0 0 1 8 8 z" fill="#ef4444" />
          <rect x="34" y="80" width="52" height="3" fill="#ef4444" />
          {/* binder rings */}
          <rect x="45" y="69" width="4.5" height="9" rx="2.2" fill="#94a3b8" />
          <rect x="70.5" y="69" width="4.5" height="9" rx="2.2" fill="#94a3b8" />
          {/* grid lines */}
          <line x1="34" y1="94" x2="86" y2="94" stroke="#eef2f7" strokeWidth="1.5" />
          <line x1="34" y1="104" x2="86" y2="104" stroke="#eef2f7" strokeWidth="1.5" />
          <line x1="51" y1="86" x2="51" y2="114" stroke="#eef2f7" strokeWidth="1.5" />
          <line x1="69" y1="86" x2="69" y2="114" stroke="#eef2f7" strokeWidth="1.5" />
          {/* day dots — one highlighted (the scheduled slot) */}
          <circle cx="42.5" cy="90" r="2.6" fill="#cbd5e1" />
          <rect x="57" y="87" width="6" height="6" rx="2" fill="#22d3ee" />
          <circle cx="77.5" cy="90" r="2.6" fill="#cbd5e1" />
          <circle cx="42.5" cy="100" r="2.6" fill="#cbd5e1" />
          <circle cx="60" cy="100" r="2.6" fill="#cbd5e1" />
          <circle cx="77.5" cy="100" r="2.6" fill="#cbd5e1" />
          <circle cx="42.5" cy="109" r="2.6" fill="#cbd5e1" />
          <circle cx="60" cy="109" r="2.6" fill="#cbd5e1" />
          <circle cx="77.5" cy="109" r="2.6" fill="#cbd5e1" />
        </g>

        {/* hands gripping the calendar edges */}
        <circle cx="36" cy="86" r="6" fill="#6366f1" stroke="#4338ca" strokeWidth="1" />
        <circle cx="84" cy="86" r="6" fill="#6366f1" stroke="#4338ca" strokeWidth="1" />
        <circle cx="36" cy="86" r="2" fill="#a5b4fc" />
        <circle cx="84" cy="86" r="2" fill="#a5b4fc" />
      </g>
    </svg>
  );
}
