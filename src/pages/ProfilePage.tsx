import { motion } from 'framer-motion';
import { useTelegram } from '../hooks/useTelegram';
import { isTelegramEnvironment } from '../services/telegram';
import { GlassCard } from '../components/ui/GlassCard';

export function ProfilePage() {
  const { user } = useTelegram();
  const isTelegram = isTelegramEnvironment();

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ');
  const initials = user.firstName.charAt(0) + (user.lastName?.charAt(0) ?? '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex flex-col items-center py-6">
        <motion.div
          className="relative mb-4"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={displayName}
              className="h-24 w-24 rounded-full border-2 border-neon-purple/50 object-cover shadow-[0_0_30px_rgba(168,85,247,0.3)]"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-neon-purple/50 bg-gradient-to-br from-neon-purple to-neon-blue text-3xl font-bold text-white shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              {initials}
            </div>
          )}
          {user.isPremium && (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-neon-yellow px-2 py-0.5 text-[10px] font-bold text-black">
              ⭐
            </span>
          )}
        </motion.div>

        <h2 className="text-xl font-bold text-white">{displayName}</h2>
        {user.username && (
          <p className="text-sm text-neon-blue">@{user.username}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">ID: {user.id}</p>
      </div>

      <GlassCard neon="purple">
        <h3 className="mb-3 font-semibold text-white">Інформація Telegram</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-400">Середовище</span>
            <span className={isTelegram ? 'text-neon-green' : 'text-neon-yellow'}>
              {isTelegram ? 'Telegram Mini App' : 'Браузер (демо)'}
            </span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-400">Мова</span>
            <span className="text-white">🇺🇦 Українська</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-400">Telegram ID</span>
            <span className="font-mono text-neon-purple">{user.id}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-slate-400">Username</span>
            <span className="text-white">{user.username ? `@${user.username}` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Telegram Premium</span>
            <span className={user.isPremium ? 'text-neon-yellow' : 'text-slate-500'}>
              {user.isPremium ? 'Так ⭐' : 'Ні'}
            </span>
          </div>
        </div>
      </GlassCard>

      <GlassCard neon="blue" delay={0.1}>
        <h3 className="mb-3 font-semibold text-white">Статистика</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Сигналів', value: '47', color: 'text-neon-green' },
            { label: 'Точність', value: '82%', color: 'text-neon-purple' },
            { label: 'Днів', value: '12', color: 'text-neon-blue' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-black/30 p-3">
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard neon="green" delay={0.2}>
        <h3 className="mb-2 font-semibold text-white">Про додаток</h3>
        <p className="text-xs leading-relaxed text-slate-400">
          TRADE APP BOT — преміум торговий асистент для користувачів Pocket Option.
          AI-аналіз ринку, сигнали, навчальні матеріали та інструменти для успішного трейдингу.
        </p>
        <p className="mt-2 text-[10px] text-slate-600">Версія 1.0.0</p>
      </GlassCard>
    </motion.div>
  );
}
