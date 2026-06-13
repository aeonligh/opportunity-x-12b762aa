import { type ReactNode } from "react";
import OpportunityCard, { type Opportunity } from "./OpportunityCard";
import { motion } from "motion/react";

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  items: Opportunity[];
  isLoading?: boolean;
  emptyHint?: string;
}

export default function OpportunitySection({
  title,
  subtitle,
  icon,
  items,
  isLoading,
  emptyHint,
}: Props) {
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="text-xs text-text-s mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-flow-col auto-cols-[minmax(280px,320px)] gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-2xl bg-surface/40 animate-pulse border border-border"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-xs text-text-s py-6">
          {emptyHint ?? "No opportunities yet — try Discover."}
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-flow-col auto-cols-[minmax(280px,320px)] gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-px-4 -mx-2 px-2"
        >
          {items.map((o) => (
            <div key={o.id} className="snap-start">
              <OpportunityCard opportunity={o} />
            </div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
