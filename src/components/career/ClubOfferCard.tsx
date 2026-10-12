import { colors, fonts } from '../../theme';
import { ClubCrest } from './ClubCrest';
import { FlagBadge } from './FlagBadge';
import { PlayerAvatar } from './PlayerAvatar';
import type { ClubOfferOption } from '../../lib/careerTypes';

interface ClubOfferCardProps {
  option: ClubOfferOption;
  onChoose: () => void;
}

export function ClubOfferCard({ option, onChoose }: ClubOfferCardProps) {
  return (
    <button
      onClick={onChoose}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
        width: 220,
        padding: '18px 18px 20px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 4,
        color: '#fff',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: colors.accentLight, textTransform: 'uppercase' }}>
        Fichar por
      </div>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#f2f2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ClubCrest clubId={option.clubId} name={option.clubName} size={38} />
      </div>
      <div style={{ fontFamily: fonts.display, fontSize: 17, lineHeight: 1.1 }}>{option.clubName}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: colors.textMuted }}>
        {option.countryName && <FlagBadge countryName={option.countryName} width={20} />}
        {[option.competitionName, option.countryName].filter(Boolean).join(' · ') || 'Liga local'}
      </div>
    </button>
  );
}

interface ClubOfferListProps {
  title: string;
  description: string;
  options: ClubOfferOption[];
  onChoose: (option: ClubOfferOption) => void;
  extraAction?: { label: string; onClick: () => void };
  avatar?: { imageUrl: string | null; lastName: string };
}

export function ClubOfferList({ title, description, options, onChoose, extraAction, avatar }: ClubOfferListProps) {
  return (
    <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
      {avatar && <PlayerAvatar imageUrl={avatar.imageUrl} lastName={avatar.lastName} size={88} />}
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: 28, margin: '0 0 10px 0', color: '#fff', textTransform: 'uppercase' }}>
          {title}
        </h2>
        <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0 }}>{description}</p>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {options.map((o) => (
          <ClubOfferCard key={o.clubId} option={o} onChoose={() => onChoose(o)} />
        ))}
      </div>
      {extraAction && (
        <button
          onClick={extraAction.onClick}
          style={{
            padding: '10px 24px',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.25)',
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.5,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          {extraAction.label}
        </button>
      )}
    </div>
  );
}
