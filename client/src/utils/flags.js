const FLAG_MAP = {
  USA: '🇺🇸', MEX: '🇲🇽', CAN: '🇨🇦', BRA: '🇧🇷', ARG: '🇦🇷', GER: '🇩🇪',
  FRA: '🇫🇷', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP: '🇪🇸', POR: '🇵🇹', NED: '🇳🇱', BEL: '🇧🇪',
  ITA: '🇮🇹', CRO: '🇭🇷', URU: '🇺🇾', COL: '🇨🇴', JPN: '🇯🇵', KOR: '🇰🇷',
  AUS: '🇦🇺', GHA: '🇬🇭', SEN: '🇸🇳', MAR: '🇲🇦', TUN: '🇹🇳', CIV: '🇨🇮',
  CM: '🇨🇲', NGA: '🇳🇬', RSA: '🇿🇦', EGY: '🇪🇬', IRN: '🇮🇷', KSA: '🇸🇦',
  QAT: '🇶🇦', CRC: '🇨🇷', ECU: '🇪🇨', PER: '🇵🇪', CHI: '🇨🇱', PAR: '🇵🇾',
  SUI: '🇨🇭', POL: '🇵🇱', SRB: '🇷🇸', DEN: '🇩🇰', SWE: '🇸🇪', WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', AUT: '🇦🇹', HUN: '🇭🇺', CZE: '🇨🇿', UKR: '🇺🇦', TUR: '🇹🇷',
  NZL: '🇳🇿', PAN: '🇵🇦', HAI: '🇭🇹', CPV: '🇨🇻', ALG: '🇩🇿', TBD: '❓',
  UEFA_A: '🇪🇺', UEFA_B: '🇪🇺', UEFA_C: '🇪🇺', UEFA_D: '🇪🇺',
  UEFA_E: '🇪🇺', UEFA_F: '🇪🇺', UEFA_G: '🇪🇺', UEFA_H: '🇪🇺',
  UEFA_I: '🇪🇺', UEFA_J: '🇪🇺', UEFA_K: '🇪🇺', UEFA_L: '🇪🇺',
};

export function getFlag(code) {
  return FLAG_MAP[code] || '🏳️';
}

export function getTeamLabel(code) {
  if (code?.startsWith('UEFA')) return 'UEFA Playoff';
  if (code === 'TBD') return 'TBD';
  return code;
}
