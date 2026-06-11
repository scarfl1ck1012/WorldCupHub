import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import dayjs from 'dayjs';
import { fetchMatches, fetchOdds } from '../../services/api';
import { upsertFavorite } from '../../services/supabase';
import useNotifications from '../../hooks/useNotifications';
import useAuth from '../../hooks/useAuth';
import MatchCard from '../../components/MatchCard/MatchCard';
import './MatchSchedule.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'group', label: 'Groups' },
  { id: 'knockout', label: 'Knockout' },
];

function getCheers() {
  try { return JSON.parse(localStorage.getItem('wc_cheers') || '{}'); }
  catch { return {}; }
}

export default function MatchSchedule() {
  const [filter, setFilter] = useState('all');
  const [cheers, setCheers] = useState(getCheers);
  const [toast, setToast] = useState(null);
  const { requestPermission, scheduleKickoffReminder, notifyCheer } = useNotifications();
  const { user } = useAuth();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['matches', '2026'],
    queryFn: () => fetchMatches({ year: '2026' }),
  });

  const { data: odds = [] } = useQuery({
    queryKey: ['odds'],
    queryFn: fetchOdds,
  });

  const oddsMap = useMemo(() => Object.fromEntries(odds.map((o) => [o.matchId, o])), [odds]);

  const filtered = useMemo(() => {
    let list = matches;
    if (filter === 'today') {
      const today = dayjs().format('YYYY-MM-DD');
      list = list.filter((m) => dayjs(m.date).format('YYYY-MM-DD') === today);
    } else if (filter === 'group') {
      list = list.filter((m) => m.group);
    } else if (filter === 'knockout') {
      list = list.filter((m) => !m.group);
    }
    return list;
  }, [matches, filter]);

  const grouped = useMemo(() => {
    const groups = {};
    for (const m of filtered) {
      const key = dayjs(m.date).format('YYYY-MM-DD');
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCheer = useCallback(async (match, teamCode, teamName) => {
    await requestPermission();

    const updated = { ...cheers, [match.id]: teamCode };
    setCheers(updated);
    localStorage.setItem('wc_cheers', JSON.stringify(updated));

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#00c853', '#ffd700', '#ffffff'],
    });

    scheduleKickoffReminder(match.id, teamName, match.date);
    notifyCheer(teamName);

    if (user) {
      await upsertFavorite(user.id, match.id, teamCode);
    }

    showToast(`You're cheering for ${teamName}! We'll notify you before kickoff.`);
  }, [cheers, requestPermission, scheduleKickoffReminder, notifyCheer, user]);

  return (
    <div className="page-container">
      <h1 className="page-title">Match Schedule</h1>
      <p className="page-subtitle">WC 2026 — Tap cheer to support your team</p>

      <div className="tab-bar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`tab-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <>
          <div className="skeleton-line" style={{ height: 100 }} />
          <div className="skeleton-line" style={{ height: 100 }} />
        </>
      ) : grouped.length === 0 ? (
        <p className="empty-state">No matches for this filter.</p>
      ) : (
        grouped.map(([date, dayMatches]) => (
          <div key={date} className="schedule-day">
            <h3 className="day-header">{dayjs(date).format('dddd, MMMM D, YYYY')}</h3>
            {dayMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                odds={oddsMap[m.id]}
                cheeredTeam={cheers[m.id]}
                onCheer={handleCheer}
              />
            ))}
          </div>
        ))
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
