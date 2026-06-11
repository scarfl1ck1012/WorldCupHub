import { Link } from 'react-router-dom';
import './Games.css';

const GAMES = [
  {
    path: '/games/perfect-run',
    title: 'Perfect Run',
    icon: '7️⃣',
    desc: 'Draft legends and chase a flawless 7-0 group campaign — inspired by 38-0 Game.',
  },
  {
    path: '/games/bingo',
    title: 'World Cup Bingo',
    icon: '🎱',
    desc: 'Mark off match events on your 5×5 card during live games.',
  },
  {
    path: '/games/streak',
    title: 'Knockout Streak',
    icon: '🔥',
    desc: 'Daily pick\'em — survive the knockout rounds as long as you can.',
  },
  {
    path: '/games/bracket-battle',
    title: 'Bracket Battle',
    icon: '⚔️',
    desc: 'Challenge a friend to bracket prediction showdown.',
  },
];

export default function GamesHub() {
  return (
    <div className="page-container">
      <h1 className="page-title">Games</h1>
      <p className="page-subtitle">Fun mini-games for World Cup fans</p>
      <div className="games-grid">
        {GAMES.map((g) => (
          <Link key={g.path} to={g.path} className="game-card glass-card">
            <span className="game-icon">{g.icon}</span>
            <h3>{g.title}</h3>
            <p>{g.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
