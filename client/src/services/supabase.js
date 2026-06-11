import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signUp(email, password, displayName) {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

export async function upsertPrediction(userId, matchId, pick, scoreHome, scoreAway) {
  if (!supabase) return null;
  return supabase.from('predictions').upsert(
    {
      user_id: userId,
      match_id: matchId,
      pick,
      score_home: scoreHome,
      score_away: scoreAway,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,match_id' }
  );
}

export async function fetchUserPredictions(userId) {
  if (!supabase) return [];
  const { data } = await supabase.from('predictions').select('*').eq('user_id', userId);
  return data || [];
}

export async function fetchLeaderboard() {
  if (!supabase) return [];
  const { data } = await supabase.from('prediction_leaderboard').select('*').limit(50);
  return data || [];
}

export async function upsertFavorite(userId, matchId, teamCode) {
  if (!supabase) return null;
  return supabase.from('user_favorites').upsert(
    { user_id: userId, match_id: matchId, team_code: teamCode },
    { onConflict: 'user_id,match_id' }
  );
}

export async function saveSimulation(userId, name, bracket, champion) {
  if (!supabase) return null;
  return supabase.from('simulations').insert({
    user_id: userId,
    name,
    bracket,
    champion,
  });
}

export async function saveGameScore(userId, gameType, score, metadata = {}) {
  if (!supabase) return null;
  return supabase.from('game_scores').insert({
    user_id: userId,
    game_type: gameType,
    score,
    metadata,
  });
}

export async function saveBingoCard(userId, cells, marked = []) {
  if (!supabase) return null;
  return supabase.from('bingo_cards').insert({
    user_id: userId,
    cells,
    marked,
  });
}

export async function updateBingoCard(cardId, marked, completed) {
  if (!supabase) return null;
  return supabase.from('bingo_cards').update({ marked, completed }).eq('id', cardId);
}
