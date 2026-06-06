import { useEffect, useState } from 'react';
import { adminApi } from '../services/api';

interface UserRow {
  id: number;
  telegramId: string;
  username?: string;
  firstName?: string;
  status: string;
  isVip: boolean;
  isInvited: boolean;
  isBanned: boolean;
  signalCount?: number;
  createdAt: string;
}

interface Analytics {
  totalUsers: number;
  deposited: number;
  vip: number;
  totalSignals: number;
  invited?: number;
  pendingInvite?: number;
}

export function AdminDashboard() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') ?? '');
  const [email, setEmail] = useState('admin@primetrade.bot');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError('');
    try {
      const res = await adminApi.login(email.trim(), password);
      localStorage.setItem('admin_token', res.token);
      setToken(res.token);
    } catch {
      setError('Невірний email або пароль. За замовчуванням: admin@primetrade.bot / admin123');
    }
  };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const u = await adminApi.getUsers(token, params.toString()) as UserRow[];
      setUsers(u);
      try {
        const a = await adminApi.getAnalytics(token) as Analytics;
        setAnalytics(a);
      } catch {
        setAnalytics(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Помилка завантаження';
      if (msg === 'SESSION_EXPIRED') {
        localStorage.removeItem('admin_token');
        setToken('');
        setError('Сесія закінчилась. Увійдіть знову (після перезапуску API).');
        return;
      }
      setError(`${msg}. Перевірте npm run server`);
    } finally {
      setLoading(false);
    }
  };

  const act = async (action: () => Promise<unknown>, msg: string) => {
    if (!selected) return;
    const id = selected.id;
    setError('');
    setSuccess('');
    try {
      await action();
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const [u, a] = await Promise.all([
        adminApi.getUsers(token, params.toString()),
        adminApi.getAnalytics(token),
      ]);
      setUsers(u as UserRow[]);
      setAnalytics(a as Analytics);
      setSelected((u as UserRow[]).find((x) => x.id === id) ?? null);
      setSuccess(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    }
  };

  useEffect(() => { load(); }, [token]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-8">
          <h1 className="mb-2 text-2xl font-bold text-white">PRIME TRADE BOT</h1>
          <p className="mb-6 text-sm text-slate-500">Admin Panel</p>
          {error && <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mb-3 w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} className="mb-4 w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white" />
          <button type="button" onClick={login} className="w-full rounded-lg bg-amber-500 py-3 font-bold text-black">Увійти</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <header className="border-b border-white/10 bg-[#111118] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">PRIME TRADE BOT — Admin</h1>
            <p className="text-xs text-slate-500">Керування доступом користувачів</p>
          </div>
          <button type="button" onClick={() => { localStorage.removeItem('admin_token'); setToken(''); }} className="rounded-lg border border-white/10 px-4 py-2 text-sm">Вийти</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">⚠️ {error}</div>}
        {success && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">✅ {success}</div>}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Всього', value: analytics?.totalUsers ?? 0 },
            { label: 'З доступом', value: analytics?.deposited ?? 0 },
            { label: 'Запрошені', value: analytics?.invited ?? 0 },
            { label: 'Очікують invite', value: analytics?.pendingInvite ?? 0 },
            { label: 'VIP', value: analytics?.vip ?? 0 },
            { label: 'Сигналів', value: analytics?.totalSignals ?? 0 },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-[#14141c] p-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-amber-400">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#14141c] p-5">
            <div className="mb-4 flex gap-2">
              <input
                placeholder="Пошук: Telegram ID, username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                className="flex-1 rounded-lg border border-white/10 bg-black px-3 py-2 text-sm"
              />
              <button type="button" onClick={load} disabled={loading} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black">
                {loading ? '...' : 'Знайти'}
              </button>
            </div>

            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-500">
                  <th className="p-2">Telegram ID</th>
                  <th className="p-2">Імʼя</th>
                  <th className="p-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelected(u)}
                    className={`cursor-pointer border-b border-white/5 hover:bg-white/5 ${selected?.id === u.id ? 'bg-amber-500/10' : ''}`}
                  >
                    <td className="p-2 font-mono text-amber-400">{u.telegramId}</td>
                    <td className="p-2">{u.firstName ?? u.username ?? '—'}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          u.isBanned ? 'bg-red-500/20 text-red-400' :
                          u.status === 'vip' ? 'bg-amber-500/20 text-amber-400' :
                          u.status === 'deposited' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-white/10 text-slate-400'
                        }`}>
                          {u.isBanned ? 'banned' : u.status}
                        </span>
                        {u.isInvited && (
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                            invited
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={3} className="p-6 text-center text-slate-500">Користувачів немає. Відкрийте Mini App — вони зʼявляться тут.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#14141c] p-5">
            {selected ? (
              <>
                <h3 className="font-bold">Керування доступом</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <p><span className="text-slate-500">Telegram ID:</span> <span className="font-mono text-amber-400">{selected.telegramId}</span></p>
                  <p><span className="text-slate-500">Імʼя:</span> {selected.firstName ?? '—'}</p>
                  <p><span className="text-slate-500">Username:</span> {selected.username ? `@${selected.username.replace(/^@/, '')}` : '—'}</p>
                  <p><span className="text-slate-500">Статус:</span> {selected.status}</p>
                </div>

                <div className="mt-5 space-y-2">
                  <button
                    type="button"
                    onClick={() => act(() => adminApi.inviteUser(token, selected.id), `Запрошено ${selected.telegramId}`)}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500"
                  >
                    ➕ Запросити (whitelist)
                  </button>
                  <button
                    type="button"
                    onClick={() => act(() => adminApi.grantAccess(token, selected.id, 'registered'), `Реєстрацію дозволено для ${selected.telegramId}`)}
                    className="w-full rounded-xl border border-blue-500/30 py-3 text-sm text-blue-300 hover:bg-blue-500/10"
                  >
                    📝 Дозволити реєстрацію
                  </button>
                  <button
                    type="button"
                    onClick={() => act(() => adminApi.grantAccess(token, selected.id, 'basic'), `Доступ відкрито для ${selected.telegramId}`)}
                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500"
                  >
                    ✅ Відкрити доступ
                  </button>
                  <button
                    type="button"
                    onClick={() => act(() => adminApi.grantAccess(token, selected.id, 'vip'), `VIP видано для ${selected.telegramId}`)}
                    className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-black hover:bg-amber-400"
                  >
                    👑 Видати VIP
                  </button>
                  <button
                    type="button"
                    onClick={() => act(() => adminApi.grantAccess(token, selected.id, 'revoke'), `Доступ забрано у ${selected.telegramId}`)}
                    className="w-full rounded-xl border border-white/10 py-3 text-sm hover:bg-white/5"
                  >
                    ↩️ Забрати доступ
                  </button>
                  <button
                    type="button"
                    onClick={() => act(() => adminApi.banUser(token, selected.id), `Заблоковано ${selected.telegramId}`)}
                    className="w-full rounded-xl border border-red-500/30 py-3 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    🚫 Заблокувати
                  </button>
                </div>
              </>
            ) : (
              <p className="text-slate-500">Оберіть користувача зі списку</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
