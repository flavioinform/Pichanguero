import { useEffect, useState } from 'react';
import { colors, fonts } from '../../theme';
import { fetchAvatarCandidate, fetchClubsByCountry, fetchCompetitionContext, type CompetitionContext } from '../../lib/careerData';
import { loadCareerSave, saveCareer, clearCareer } from '../../lib/careerSave';
import {
  createInitialState,
  requestLoan,
  requestTransfer,
  rollInitialClubOffers,
  rollTransferOffers,
  simulateSeason,
} from '../../lib/careerEngine';
import type {
  CareerDifficulty,
  CareerEvent,
  CareerIdentity,
  CareerPlayerState,
  ClubOfferOption,
} from '../../lib/careerTypes';
import { CareerDifficultyStep } from './CareerDifficultyStep';
import { CareerIdentityStep } from './CareerIdentityStep';
import { ClubOfferList } from './ClubOfferCard';
import { CareerDashboardScreen } from './CareerDashboardScreen';
import { EventSceneModal } from './EventSceneModal';
import { CareerRetiredScreen } from './CareerRetiredScreen';

interface CareerScreenProps {
  onBack: () => void;
}

type Step = 'resume' | 'difficulty' | 'identity' | 'offer' | 'transferOffer' | 'dashboard' | 'retired';

const NOTABLE_EVENT_TYPES: CareerEvent['type'][] = ['trophy', 'call_up', 'retirement', 'debut'];

function filterEventsForDifficulty(events: CareerEvent[], difficulty: CareerDifficulty): CareerEvent[] {
  if (difficulty === 'intensa') return events;
  return events.filter((e) => NOTABLE_EVENT_TYPES.includes(e.type) || (e.type === 'injury' && e.severity === 'major'));
}

export function CareerScreen({ onBack }: CareerScreenProps) {
  const [step, setStep] = useState<Step>('difficulty');
  const [careerState, setCareerState] = useState<CareerPlayerState | null>(null);
  const [pendingIdentity, setPendingIdentity] = useState<CareerIdentity | null>(null);
  const [difficulty, setDifficulty] = useState<CareerDifficulty>('intensa');
  const [clubPool, setClubPool] = useState<ClubOfferOption[]>([]);
  const [competitionContext, setCompetitionContext] = useState<CompetitionContext | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [offerOptions, setOfferOptions] = useState<ClubOfferOption[]>([]);
  const [eventQueue, setEventQueue] = useState<CareerEvent[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadCareerSave();
    if (saved && !saved.retired) {
      setCareerState(saved);
      setStep('resume');
    }
  }, []);

  async function ensureClubPool(nationalityName: string, pool: ClubOfferOption[]): Promise<ClubOfferOption[]> {
    if (pool.length > 0) return pool;
    const fetched = await fetchClubsByCountry(nationalityName);
    setClubPool(fetched);
    return fetched;
  }

  async function ensureCompetitionContext(
    nationalityName: string,
    context: CompetitionContext | null
  ): Promise<CompetitionContext> {
    if (context) return context;
    const fetched = await fetchCompetitionContext(nationalityName);
    setCompetitionContext(fetched);
    return fetched;
  }

  async function handleIdentitySubmit(identity: CareerIdentity) {
    setDataError(null);
    setLoadingClubs(true);
    try {
      const [pool, avatar] = await Promise.all([
        ensureClubPool(identity.nationality.name, clubPool),
        fetchAvatarCandidate(identity.position, identity.nationality.name),
        ensureCompetitionContext(identity.nationality.name, competitionContext),
      ]);
      setPendingIdentity(identity);
      setAvatarUrl(avatar);
      setOfferOptions(rollInitialClubOffers(pool));
      setStep('offer');
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'No se pudieron cargar los clubes.');
    } finally {
      setLoadingClubs(false);
    }
  }

  function handleInitialOfferChosen(option: ClubOfferOption) {
    if (!pendingIdentity) return;
    const state = createInitialState(pendingIdentity, difficulty, avatarUrl);
    state.status = 'contratado';
    state.currentClubId = option.clubId;
    state.currentClubName = option.clubName;
    state.currentCompetitionName = option.competitionName;
    setCareerState(state);
    saveCareer(state);
    setStep('dashboard');
  }

  function currentClubAsOption(state: CareerPlayerState): ClubOfferOption | null {
    if (!state.currentClubId || !state.currentClubName) return null;
    const match = clubPool.find((c) => c.clubId === state.currentClubId);
    return (
      match ?? {
        clubId: state.currentClubId,
        clubName: state.currentClubName,
        competitionName: state.currentCompetitionName,
        countryName: null,
      }
    );
  }

  function resolvePostSeason(state: CareerPlayerState) {
    if (state.retired) setStep('retired');
    else if (state.pendingDecision) setStep('transferOffer');
    else setStep('dashboard');
  }

  async function handleSimulate() {
    if (!careerState) return;
    setSimulating(true);
    setDataError(null);
    try {
      const pool = await ensureClubPool(careerState.identity.nationality.name, clubPool);
      const context = await ensureCompetitionContext(careerState.identity.nationality.name, competitionContext);

      if (careerState.difficulty !== 'expres') {
        const result = simulateSeason(careerState, currentClubAsOption(careerState), context);
        const next = result.state;
        if (next.pendingDecision) {
          const offers = rollTransferOffers(pool, next.currentClubId);
          setOfferOptions(offers.length ? offers : pool.slice(0, 3));
        }
        setCareerState(next);
        saveCareer(next);
        const toShow = filterEventsForDifficulty(result.events, next.difficulty);
        if (toShow.length > 0) setEventQueue(toShow);
        else resolvePostSeason(next);
      } else {
        let state = careerState;
        const batchEvents: CareerEvent[] = [];
        for (let i = 0; i < 3 && !state.retired; i++) {
          const result = simulateSeason(state, currentClubAsOption(state), context);
          state = result.state;
          batchEvents.push(...result.events);
          if (state.pendingDecision) {
            const offers = rollTransferOffers(pool, state.currentClubId);
            const auto = offers[0];
            if (auto) {
              state.currentClubId = auto.clubId;
              state.currentClubName = auto.clubName;
              state.currentCompetitionName = auto.competitionName;
              state.status = 'contratado';
            }
            state.pendingDecision = null;
          }
        }
        setCareerState(state);
        saveCareer(state);
        const toShow = filterEventsForDifficulty(batchEvents, 'normal');
        if (toShow.length > 0) setEventQueue(toShow);
        else resolvePostSeason(state);
      }
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'No se pudo simular la temporada.');
    } finally {
      setSimulating(false);
    }
  }

  async function handleRequestTransfer() {
    if (!careerState || careerState.status !== 'contratado') return;
    setSimulating(true);
    setDataError(null);
    try {
      const pool = await ensureClubPool(careerState.identity.nationality.name, clubPool);
      const result = requestTransfer(careerState, pool);
      setCareerState(result.state);
      saveCareer(result.state);
      if (result.offers.length > 0) {
        setOfferOptions(result.offers);
        setStep('transferOffer');
      } else if (result.event) {
        setEventQueue([result.event]);
      }
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'No se pudo pedir la salida.');
    } finally {
      setSimulating(false);
    }
  }

  async function handleRequestLoan() {
    if (!careerState || careerState.status !== 'contratado') return;
    setSimulating(true);
    setDataError(null);
    try {
      const pool = await ensureClubPool(careerState.identity.nationality.name, clubPool);
      const result = requestLoan(careerState, pool);
      setCareerState(result.state);
      saveCareer(result.state);
      if (result.event) setEventQueue([result.event]);
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'No se pudo pedir el préstamo.');
    } finally {
      setSimulating(false);
    }
  }

  function handleEventContinue() {
    setEventQueue((q) => {
      const rest = q.slice(1);
      if (rest.length === 0 && careerState) resolvePostSeason(careerState);
      return rest;
    });
  }

  function handleTransferOfferChosen(option: ClubOfferOption | null) {
    if (!careerState) return;
    const next = structuredClone(careerState);
    if (option) {
      next.currentClubId = option.clubId;
      next.currentClubName = option.clubName;
      next.currentCompetitionName = option.competitionName;
      next.status = 'contratado';
    }
    next.pendingDecision = null;
    setCareerState(next);
    saveCareer(next);
    setStep('dashboard');
  }

  function handleNewCareer() {
    clearCareer();
    setCareerState(null);
    setPendingIdentity(null);
    setAvatarUrl(null);
    setClubPool([]);
    setCompetitionContext(null);
    setOfferOptions([]);
    setEventQueue([]);
    setStep('difficulty');
  }

  const errorBanner = dataError && (
    <div
      onClick={() => setDataError(null)}
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        padding: '10px 20px',
        background: '#4a1414',
        border: `1px solid ${colors.danger}`,
        color: '#fff',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {dataError} (click para cerrar)
    </div>
  );

  if (step === 'resume' && careerState) {
    return (
      <>
        {errorBanner}
        <ResumeChoice
          state={careerState}
          onContinue={() => setStep('dashboard')}
          onNew={handleNewCareer}
          onBack={onBack}
        />
      </>
    );
  }

  if (step === 'difficulty') {
    return (
      <>
        {errorBanner}
        <CareerDifficultyStep
          onChoose={(d) => {
            setDifficulty(d);
            setStep('identity');
          }}
          onBack={onBack}
        />
      </>
    );
  }

  if (step === 'identity') {
    return (
      <>
        {errorBanner}
        <CareerIdentityStep onSubmit={handleIdentitySubmit} onBack={() => setStep('difficulty')} />
        {loadingClubs && <LoadingOverlay label="Buscando clubes…" />}
      </>
    );
  }

  if (step === 'offer') {
    return (
      <>
        {errorBanner}
        <ClubOfferList
          title="Oferta de cantera"
          description="Tres clubes quieren sumarte a su proyecto juvenil. Elegí dónde empieza tu carrera."
          options={offerOptions}
          onChoose={handleInitialOfferChosen}
          extraAction={{ label: 'Volver', onClick: () => setStep('identity') }}
          avatar={pendingIdentity ? { imageUrl: avatarUrl, lastName: pendingIdentity.lastName } : undefined}
        />
      </>
    );
  }

  if (step === 'transferOffer' && careerState) {
    return (
      <>
        {errorBanner}
        <ClubOfferList
          title="Llegaron ofertas"
          description={careerState.pendingDecision?.prompt ?? 'Elegí tu próximo destino.'}
          options={offerOptions}
          onChoose={(o) => handleTransferOfferChosen(o)}
          extraAction={{ label: 'Seguir en el club actual', onClick: () => handleTransferOfferChosen(null) }}
          avatar={{ imageUrl: careerState.avatarImageUrl, lastName: careerState.identity.lastName }}
        />
      </>
    );
  }

  if (step === 'dashboard' && careerState) {
    return (
      <>
        {errorBanner}
        <CareerDashboardScreen
          state={careerState}
          onSimulate={handleSimulate}
          onRequestTransfer={handleRequestTransfer}
          onRequestLoan={handleRequestLoan}
          onBack={onBack}
          simulating={simulating}
        />
        {eventQueue[0] && (
          <EventSceneModal
            event={eventQueue[0]}
            countryName={careerState.identity.nationality.name}
            onContinue={handleEventContinue}
          />
        )}
      </>
    );
  }

  if (step === 'retired' && careerState) {
    return <CareerRetiredScreen state={careerState} onNewCareer={handleNewCareer} onBack={onBack} />;
  }

  return null;
}

function ResumeChoice({
  state,
  onContinue,
  onNew,
  onBack,
}: {
  state: CareerPlayerState;
  onContinue: () => void;
  onNew: () => void;
  onBack: () => void;
}) {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      <h1 style={{ fontFamily: fonts.display, fontSize: 32, margin: 0, color: '#fff', textTransform: 'uppercase' }}>
        Carrera en curso
      </h1>
      <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0, textAlign: 'center', maxWidth: 420 }}>
        Tenés una carrera guardada: {state.identity.lastName}, {state.age} años, OVR {state.ovr}.
      </p>
      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        <button
          onClick={onContinue}
          style={{
            padding: '14px 34px',
            borderRadius: 999,
            background: colors.accent,
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Continuar carrera
        </button>
        <button
          onClick={onNew}
          style={{
            padding: '14px 24px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: colors.textSecondary,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Nueva carrera
        </button>
      </div>
      <button
        onClick={onBack}
        style={{
          marginTop: 6,
          padding: '8px 18px',
          background: 'none',
          border: 'none',
          color: colors.textMuted,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Volver a juegos
      </button>
    </div>
  );
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        color: colors.textSecondary,
        fontSize: 14,
      }}
    >
      {label}
    </div>
  );
}
