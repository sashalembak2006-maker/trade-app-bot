import { motion } from 'framer-motion';
import { RobotAssistant } from '../components/robot/RobotAssistant';
import { CandlestickChart } from '../components/charts/CandlestickChart';
import { ExpandableSection } from '../components/ui/ExpandableSection';
import { ActivesSection } from '../components/sections/ActivesSection';
import { LearningSection } from '../components/sections/LearningSection';
import { CalculatorSection } from '../components/sections/CalculatorSection';
import { NewsSection } from '../components/sections/NewsSection';
import { IndicatorsSection } from '../components/sections/IndicatorsSection';
import { MarketAnalysisSection } from '../components/sections/MarketAnalysisSection';

interface HomePageProps {
  searchQuery: string;
}

export function HomePage({ searchQuery }: HomePageProps) {
  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl border border-neon-purple/20 bg-gradient-to-b from-neon-purple/10 to-transparent p-4"
      >
        <RobotAssistant />
        <div className="mt-2 rounded-xl border border-white/5 bg-black/30 p-2">
          <CandlestickChart height={80} />
        </div>
      </motion.section>

      <div className="space-y-3">
        <ExpandableSection icon="📈" title="Активи" accent="green" delay={0.1}>
          <ActivesSection searchQuery={searchQuery} />
        </ExpandableSection>

        <ExpandableSection icon="🎓" title="Навчання" accent="blue" delay={0.15}>
          <LearningSection />
        </ExpandableSection>

        <ExpandableSection icon="🧮" title="Калькулятор" accent="yellow" delay={0.2}>
          <CalculatorSection />
        </ExpandableSection>

        <ExpandableSection icon="📰" title="Новини" accent="purple" delay={0.25}>
          <NewsSection />
        </ExpandableSection>

        <ExpandableSection icon="📉" title="Індикатори" accent="blue" delay={0.3}>
          <IndicatorsSection />
        </ExpandableSection>

        <ExpandableSection icon="🤖" title="Аналіз ринку" accent="purple" defaultOpen delay={0.35}>
          <MarketAnalysisSection />
        </ExpandableSection>
      </div>
    </div>
  );
}
