import type { Variants, Transition } from "framer-motion";

/* Framer Motion presety Simon Says.
   Odpovídají vzorům z webu: vstup opacity 0 + y:20 -> 1/0, duration 0.6,
   stagger 0.1, scroll-reveal jen jednou. Reduced-motion respektuje sám
   prohlížeč přes nastavení uživatele (framer-motion to ctí automaticky). */

export const easeOut: Transition = { duration: 0.6, ease: [0.16, 1, 0.3, 1] };

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: easeOut },
};

/** Rodič pro postupné naskakování dětí (grid karet apod.). */
export const staggerContainer = (stagger = 0.1, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

/** Standardní viewport pro scroll-reveal: spustí se jen jednou. */
export const viewportOnce = { once: true, margin: "-80px" } as const;

/* Použití:
   <motion.section variants={staggerContainer()} initial="hidden"
     whileInView="show" viewport={viewportOnce}>
     <motion.div variants={fadeInUp}>…</motion.div>
   </motion.section>
*/
