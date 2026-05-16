import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-background">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large orb 1 - top left */}
        <motion.div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl"
          animate={{
            x: [0, 60, -40, 0],
            y: [0, -50, 30, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Large orb 2 - bottom right */}
        <motion.div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/8 blur-3xl"
          animate={{
            x: [0, -70, 50, 0],
            y: [0, 60, -40, 0],
            scale: [1, 0.8, 1.1, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Large orb 3 - center right */}
        <motion.div
          className="absolute top-1/3 -right-60 w-[400px] h-[400px] rounded-full bg-primary/6 blur-3xl"
          animate={{
            x: [0, -40, 60, 0],
            y: [0, 30, -50, 0],
            scale: [1, 1.1, 0.85, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        {/* Large orb 4 - bottom left */}
        <motion.div
          className="absolute bottom-1/3 -left-60 w-[450px] h-[450px] rounded-full bg-primary/5 blur-3xl"
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 60, 0],
            scale: [1, 0.9, 1.15, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        {/* Medium orb - top right */}
        <motion.div
          className="absolute top-20 right-20 w-[300px] h-[300px] rounded-full bg-primary/7 blur-3xl"
          animate={{
            x: [0, -30, 40, 0],
            y: [0, 40, -20, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />

        {/* Medium orb - bottom center */}
        <motion.div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-primary/15 blur-3xl"
          animate={{
            scale: [1, 1.2, 0.8, 1],
            opacity: [0.4, 0.7, 0.3, 0.4],
            y: [0, -20, 30, 0],
          }}
          transition={{
            duration: 19,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.8,
          }}
        />

        {/* Center ambient glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/20 blur-3xl"
          animate={{
            scale: [1, 1.3, 0.9, 1],
            opacity: [0.3, 0.6, 0.2, 0.3],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm p-6 bg-muted/80 backdrop-blur-sm rounded-lg shadow-2xl border border-primary/10"
        >
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-semibold">
              {subtitle}
            </p>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}
