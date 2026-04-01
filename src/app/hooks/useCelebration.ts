import { useCallback, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

type Note = { frequency: number; duration: number; type: OscillatorType; gain: number };
type CelebrationType = 'completion' | 'levelUp' | 'streak' | 'achievement';

export function useCelebration() {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    useEffect(() => {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        setAudioContext(ctx);
        return () => { ctx.close(); };
    }, []);

    const playSound = useCallback((type: CelebrationType) => {
        if (!audioContext) return;

        const sounds: Record<CelebrationType, Note[]> = {
            completion: [
                { frequency: 523, duration: 0.1, type: 'sine', gain: 0.3 },
                { frequency: 659, duration: 0.1, type: 'sine', gain: 0.3 },
                { frequency: 784, duration: 0.2, type: 'sine', gain: 0.3 },
            ],
            levelUp: [
                { frequency: 392, duration: 0.15, type: 'square', gain: 0.2 },
                { frequency: 523, duration: 0.15, type: 'square', gain: 0.2 },
                { frequency: 659, duration: 0.15, type: 'square', gain: 0.2 },
                { frequency: 784, duration: 0.3, type: 'square', gain: 0.25 },
            ],
            streak: [
                { frequency: 440, duration: 0.1, type: 'triangle', gain: 0.3 },
                { frequency: 554, duration: 0.1, type: 'triangle', gain: 0.3 },
                { frequency: 659, duration: 0.15, type: 'triangle', gain: 0.3 },
            ],
            achievement: [
                { frequency: 262, duration: 0.1, type: 'sine', gain: 0.25 },
                { frequency: 330, duration: 0.1, type: 'sine', gain: 0.25 },
                { frequency: 392, duration: 0.1, type: 'sine', gain: 0.25 },
                { frequency: 523, duration: 0.25, type: 'sine', gain: 0.3 },
            ],
        };

        const notes = sounds[type];
        let startTime = audioContext.currentTime;

        notes.forEach((note: Note) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = note.type;
            oscillator.frequency.setValueAtTime(note.frequency, startTime);

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(note.gain, startTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, startTime + note.duration);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start(startTime);
            oscillator.stop(startTime + note.duration);

            startTime += note.duration;
        });
    }, [audioContext]);

    const fireConfetti = useCallback((type: CelebrationType) => {
        const defaults = {
            spread: 360,
            ticks: 50,
            gravity: 0,
            decay: 0.94,
            startVelocity: 30,
            colors: ['#F97316', '#FBBF24', '#EF4444', '#22C55E'],
            particleCount: 50,
            scalar: 1.2,
        };

        switch (type) {
            case 'completion':
                confetti({
                    ...defaults,
                    particleCount: 60,
                    spread: 70,
                    origin: { y: 0.6 },
                });
                break;

            case 'levelUp':
                confetti({
                    ...defaults,
                    particleCount: 100,
                    spread: 100,
                    origin: { y: 0.5 },
                    colors: ['#F97316', '#FBBF24', '#FFFFFF'],
                });
                setTimeout(() => {
                    confetti({
                        ...defaults,
                        particleCount: 50,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                    });
                    confetti({
                        ...defaults,
                        particleCount: 50,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                    });
                }, 150);
                break;

            case 'streak':
                confetti({
                    ...defaults,
                    particleCount: 80,
                    spread: 80,
                    origin: { y: 0.7 },
                    colors: ['#EF4444', '#F97316'],
                    scalar: 1.5,
                });
                break;

            case 'achievement':
                confetti({
                    ...defaults,
                    particleCount: 100,
                    spread: 180,
                    origin: { y: 0.4 },
                    colors: ['#22C55E', '#3B82F6', '#A855F7'],
                });
                break;
        }
    }, []);

    const celebrate = useCallback((type: CelebrationType) => {
        playSound(type);
        fireConfetti(type);
    }, [playSound, fireConfetti]);

    return {
        celebrate,
        celebrateCompletion: useCallback(() => celebrate('completion'), [celebrate]),
        celebrateLevelUp: useCallback(() => celebrate('levelUp'), [celebrate]),
        celebrateStreak: useCallback(() => celebrate('streak'), [celebrate]),
        celebrateAchievement: useCallback(() => celebrate('achievement'), [celebrate]),
        playSound,
        fireConfetti,
    };
}