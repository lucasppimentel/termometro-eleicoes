import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const BattleArena = dynamic(() => import('../../../components/BattleArena'), { ssr: false });

export default function DiscussionGraphPage() {
  const router = useRouter();
  const { discussionId } = router.query;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!discussionId) return;
    setLoading(true);
    fetch(`/api/v1/discussions/${discussionId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message || String(err)))
      .finally(() => setLoading(false));
  }, [discussionId]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <Link href={`/discussion/${discussionId}`}>← Voltar</Link>
      </div>

      <h2>Visualização em Grafo — Discussão {discussionId}</h2>

      {loading && <div>Carregando discussão…</div>}
      {error && <div style={{ color: 'crimson' }}>Erro: {error}</div>}

      {!loading && !error && data && data.length === 0 && <div>Discussão vazia.</div>}

      {!loading && data && data.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <BattleArena timeline={data} />
        </div>
      )}
    </div>
  );
}
