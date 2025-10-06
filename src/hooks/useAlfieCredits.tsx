import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

const CREDITS_KEY = 'alfie_ai_credits';
const DEFAULT_CREDITS = 10;

export function useAlfieCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(DEFAULT_CREDITS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCredits();
  }, [user]);

  const loadCredits = () => {
    try {
      const stored = localStorage.getItem(`${CREDITS_KEY}_${user?.id || 'guest'}`);
      if (stored) {
        setCredits(parseInt(stored, 10));
      } else {
        setCredits(DEFAULT_CREDITS);
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const decrementCredit = () => {
    const newCredits = Math.max(0, credits - 1);
    localStorage.setItem(`${CREDITS_KEY}_${user?.id || 'guest'}`, newCredits.toString());
    setCredits(newCredits);
    return newCredits;
  };

  const addCredits = (amount: number) => {
    const newCredits = credits + amount;
    localStorage.setItem(`${CREDITS_KEY}_${user?.id || 'guest'}`, newCredits.toString());
    setCredits(newCredits);
    return newCredits;
  };

  const hasCredits = () => credits > 0;

  return {
    credits,
    loading,
    decrementCredit,
    addCredits,
    hasCredits
  };
}
