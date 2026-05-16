import { useChatStore, useAuthStore } from "@/stores";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatTypingIndicator() {
  const typingUsers = useChatStore((s) => s.typingUsers);
  const user = useAuthStore((s) => s.user);

  // Exclude self from typing display
  const others = typingUsers.filter((u) => u.userId !== user?._id);

  if (others.length === 0) return null;

  const text =
    others.length === 1
      ? `${others[0].userName} is typing`
      : others.length === 2
        ? `${others[0].userName} and ${others[1].userName} are typing`
        : `${others[0].userName} and ${others.length - 1} others are typing`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 px-3 py-1.5 mb-1"
      >
        {/* Animated dots */}
        <div className="flex gap-0.5 items-center h-5 px-2.5 py-1.5 bg-muted rounded-2xl rounded-tl-sm">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground font-semibold">
          {text}...
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
