import { useState, useEffect } from 'react';
import { Key, Plus, Copy, Trash2, Zap, Shield, Clock, Check, AlertTriangle } from 'lucide-react';
import apiClient from '../services/apiClient';

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  createdAt: string;
  lastUsed: string | null;
  active: boolean;
}

interface NewKey extends ApiKey {
  key: string;
}

export function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const { data } = await apiClient.get('/keys');
      setKeys(data);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { data } = await apiClient.post<NewKey>('/keys', { name: newKeyName });
      setNewKey(data);
      setNewKeyName('');
      setShowForm(false);
      fetchKeys();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create API key. Check backend connection.';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Revoke this key? Apps using it will stop working immediately.')) return;
    try { await apiClient.delete(`/keys/${id}`); } catch {}
    setKeys(k => k.filter(key => key.id !== id));
  };

  const copyKey = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never';
    const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">API Keys</h1>
          <p className="text-eco-text-secondary text-sm mt-1">Manage access credentials for the FairRelay v1 API</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-orange-600/30 transition-all"
        >
          <Plus size={14} /> New API Key
        </button>
      </div>

      {/* Revealed key banner */}
      {newKey && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
          <Shield size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white mb-0.5">Key created: <span className="text-emerald-400">{newKey.name}</span></div>
            <div className="text-xs text-eco-text-secondary mb-2">⚠ Copy this now — you won't see it again.</div>
            <div className="flex items-center gap-2 bg-eco-dark rounded-lg px-3 py-2 border border-eco-card-border">
              <code className="text-emerald-300 font-mono text-xs flex-1 truncate">{newKey.key}</code>
              <button
                onClick={() => copyKey(newKey.key)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-eco-secondary text-eco-text-secondary hover:text-white transition-colors"
              >
                {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
              </button>
            </div>
          </div>
          <button onClick={() => setNewKey(null)} className="text-eco-text-secondary hover:text-white text-sm transition-colors">✕</button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/5 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 transition-colors text-sm">✕</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 flex gap-3 items-center">
          <input
            className="flex-1 bg-eco-dark border border-eco-card-border rounded-lg px-3 py-2 text-sm text-white placeholder-eco-text-secondary focus:outline-none focus:border-orange-500/50 transition-colors"
            placeholder="Key name (e.g. Production, Development)"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createKey()}
            autoFocus
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button onClick={() => { setShowForm(false); setNewKeyName(''); }} className="px-3 py-2 text-sm text-eco-text-secondary hover:text-white border border-eco-card-border rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* Keys list */}
      <div className="rounded-xl border border-eco-card-border bg-eco-dark overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-eco-card-border flex items-center gap-2">
          <Key size={14} className="text-orange-400" />
          <span className="text-sm font-semibold text-white">{keys.length} active key{keys.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-eco-text-secondary text-sm">Loading keys…</div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4">
            <Key size={36} strokeWidth={1} className="text-eco-text-secondary/40" />
            <p className="text-eco-text-secondary text-sm">No API keys yet.</p>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white rounded-lg text-sm font-semibold">
              <Plus size={14} /> Create your first key
            </button>
          </div>
        ) : keys.map((k, i) => (
          <div key={k.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-eco-secondary/30 transition-colors ${i > 0 ? 'border-t border-eco-card-border/50' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Key size={14} className="text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{k.name}</div>
              <code className="text-xs text-eco-text-secondary font-mono">{k.keyPreview}</code>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-xs text-eco-text-secondary">
              <div className="flex items-center gap-1"><Clock size={10} /> Created {formatDate(k.createdAt)}</div>
              <div className={`flex items-center gap-1 ${k.lastUsed ? 'text-emerald-400' : ''}`}>
                <Zap size={10} /> {k.lastUsed ? `Used ${formatDate(k.lastUsed)}` : 'Never used'}
              </div>
            </div>
            <button
              onClick={() => revokeKey(k.id)}
              className="p-1.5 rounded-lg text-eco-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Revoke key"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Usage snippet */}
      <div className="rounded-xl border border-eco-card-border bg-eco-dark p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
          <Zap size={14} className="text-orange-400" /> Quick start
        </div>
        <pre className="bg-eco-secondary/50 rounded-lg p-3 text-xs font-mono text-orange-300 overflow-x-auto mb-3">{`curl -X POST http://localhost:3000/v1/allocate \\
  -H "x-api-key: YOUR_FAIRRELAY_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "drivers": [...], "routes": [...] }'`}</pre>
        <div className="flex items-center gap-2 text-xs text-eco-text-secondary">
          <span>Demo key (no auth required):</span>
          <code className="bg-eco-secondary px-2 py-0.5 rounded text-orange-300 font-mono">fr_demo_key</code>
          <button onClick={() => copyKey('fr_demo_key')} className="flex items-center gap-1 text-xs text-eco-text-secondary hover:text-white transition-colors">
            <Copy size={10} /> Copy
          </button>
        </div>
      </div>
    </div>
  );
}
