import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedKnot = ({ className = "w-32 h-32" }) => {
    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <motion.svg
                viewBox="0 0 200 200"
                className="w-full h-full"
                initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: 360 }}
                transition={{
                    opacity: { duration: 1 },
                    scale: { duration: 1 },
                    rotate: { duration: 120, repeat: Infinity, ease: "linear" } // Slow overall rotation
                }}
            >
                <defs>
                    <linearGradient id="scribbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />    {/* Cyan */}
                        <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />    {/* Blue */}
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />   {/* Indigo */}
                    </linearGradient>
                    <filter id="glow-scribble">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* 
            The "Ball of Yarn" effect:
            Multiple elliptical paths rotated at different angles to create a sphere.
            Thinner stroke for density.
        */}

                {/* Group 1: Core Sphere (Dense) */}
                <g stroke="url(#scribbleGradient)" strokeWidth="1" fill="none" filter="url(#glow-scribble)" strokeOpacity="0.6">
                    {/* Main loops - Rotated X/Y/Z approximated by SVG path rotation */}
                    {[0, 45, 90, 135].map((angle, i) => (
                        <motion.ellipse
                            key={i}
                            cx="100" cy="100" rx="45" ry="85"
                            initial={{ rotate: angle, scale: 0.9 }}
                            animate={{
                                rotate: [angle, angle + 360],
                                scale: [0.9, 1.0, 0.9]
                            }}
                            transition={{
                                rotate: { duration: 45 + (i * 5), repeat: Infinity, ease: "linear" }, // vary speeds slightly
                                scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                            }}
                        />
                    ))}

                    {/* Cross loops - Horizontal-ish */}
                    {[20, 65, 110, 155].map((angle, i) => (
                        <motion.ellipse
                            key={`cross-${i}`}
                            cx="100" cy="100" rx="85" ry="45"
                            initial={{ rotate: angle, scale: 0.95 }}
                            animate={{ rotate: [angle, angle - 360] }}
                            transition={{
                                rotate: { duration: 55 + (i * 5), repeat: Infinity, ease: "linear" }
                            }}
                        />
                    ))}
                </g>

                {/* Group 2: The "Loose End" / Chaos Lines */}
                <motion.path
                    d="M100,20 C130,20 160,50 180,80 C190,100 195,120 160,140 C130,160 100,180 60,160 C30,140 10,100 30,60 C50,20 80,10 120,5"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeOpacity="0.8"
                    strokeDasharray="200 1000" // Create a "drawing" effect or segment
                    strokeLinecap="round"
                    filter="url(#glow-scribble)"
                    animate={{
                        strokeDashoffset: [0, 1000], // Simulates thread moving along the path
                        rotate: [0, 10, -10, 0]
                    }}
                    transition={{
                        strokeDashoffset: { duration: 20, repeat: Infinity, ease: "linear" },
                        rotate: { duration: 10, repeat: Infinity, ease: "easeInOut" }
                    }}
                />

                {/* Group 3: Stray Thread flying out */}
                <motion.path
                    d="M150,150 Q180,180 220,160" // Path going out of bounds slightly
                    stroke="#818cf8"
                    strokeWidth="0.8"
                    fill="none"
                    strokeDasharray="5 5"
                    animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                />

            </motion.svg>
        </div>
    );
};

export default AnimatedKnot;
