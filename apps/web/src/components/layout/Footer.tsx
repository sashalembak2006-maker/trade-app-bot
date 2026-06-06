import { motion } from 'framer-motion';
import { RobotAssistant } from '../robot/RobotAssistant';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? '@primetradebot';

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="relative mx-auto max-w-[430px]">
        <div className="absolute bottom-16 left-0 right-0 flex justify-center">
          <RobotAssistant compact />
        </div>
        <div className="glass-strong border-t border-prime-gold/10 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center">
          <motion.p
            className="text-[10px] text-prime-gold/60"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {BOT_USERNAME}
          </motion.p>
          <p className="disclaimer mt-0.5">© Prime Trade Bot — Premium Trading Solutions</p>
        </div>
      </div>
    </footer>
  );
}
