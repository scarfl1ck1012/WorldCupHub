import { useState } from 'react';
import { Link } from 'react-router-dom';
import { saveBingoCard, updateBingoCard } from '../../services/supabase';
import useAuth from '../../hooks/useAuth';
import './Games.css';
import './Bingo.css';

const EVENTS = [
  'Penalty scored', 'VAR review', '90+ minute goal', 'Underdog wins',
  'Hat-trick', 'Red card', 'Free kick goal', 'Header goal',
  'Goalkeeper save', 'Offside goal disallowed', 'Substitute scores',
  'Own goal', 'Comeback win', '0-0 draw', '5+ total goals',
  'Last-minute winner', 'Captain scores', 'Corner goal', 'Yellow card flurry',
  'Clean sheet', 'Long-range goal', 'Missed penalty', 'Extra time',
  'Fan invasion', 'Manager celebration',
];

function generateCard() {
  const shuffled = [...EVENTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 24);
}

export default function WorldCupBingo() {
  const { user } = useAuth();
  const [cells, setCells] = useState(() => generateCard());
  const [marked, setMarked] = useState([]);
  const [cardId, setCardId] = useState(null);
  const [bingo, setBingo] = useState(false);

  const checkBingo = (markedSet) => {
    const lines = [
      [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
      [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
      [0,6,12,18,24],[4,8,12,16,20],
    ];
    return lines.some((line) => line.every((i) => markedSet.has(i)));
  };

  const toggleCell = async (idx) => {
    if (idx === 12) return; // FREE space
    const newMarked = marked.includes(idx)
      ? marked.filter((i) => i !== idx)
      : [...marked, idx];
    setMarked(newMarked);

    const hasBingo = checkBingo(new Set([...newMarked, 12]));
    if (hasBingo && !bingo) setBingo(true);

    if (user && cardId) {
      await updateBingoCard(cardId, newMarked, hasBingo);
    }
  };

  const newCard = async () => {
    const newCells = generateCard();
    setCells(newCells);
    setMarked([]);
    setBingo(false);
    if (user) {
      const { data } = await saveBingoCard(user.id, newCells, []);
      if (data?.[0]) setCardId(data[0].id);
    }
  };

  const grid = [...cells.slice(0, 12), 'FREE', ...cells.slice(12)];

  return (
    <div className="page-container">
      <Link to="/games" className="back-link">← All Games</Link>
      <h1 className="page-title">World Cup Bingo</h1>
      <p className="page-subtitle">Mark events as they happen during matches</p>

      {bingo && <div className="bingo-win">🎉 BINGO! You win!</div>}

      <div className="bingo-grid">
        {grid.map((cell, i) => (
          <button
            key={i}
            className={`bingo-cell ${i === 12 ? 'free' : ''} ${marked.includes(i) || i === 12 ? 'marked' : ''}`}
            onClick={() => toggleCell(i)}
            disabled={i === 12}
          >
            {cell}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" onClick={newCard}>New Card</button>
    </div>
  );
}
