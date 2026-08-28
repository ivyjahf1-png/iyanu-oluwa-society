import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { storage } from '../lib/storage';

/**
 * Global savings-plan store.
 *
 * Holds every cooperative target / goal the co-op runs (weekly, monthly and
 * annual Cooperative Targets) plus any goals the member creates on the
 * "+ New Goal" screen. Plans are persisted to AsyncStorage (via the
 * crash-proof `storage` adapter) so they survive app restarts.
 *
 * Persistence contract: the default plans are only written once the member
 * creates/edits a goal, at which point the whole list (defaults + their
 * plans) is snapshotted under @ius_savings_plans_v1.
 */

const PLANS_KEY = '@ius_savings_plans_v1';

/** Minutes-of-days frequency metadata used across Savings UI. */
export const FREQUENCY_META = {
  weekly: { label: 'Weekly', cycle: '/ week', badge: 'WEEKLY' },
  monthly: { label: 'Monthly', cycle: '/ month', badge: 'MONTHLY' },
  annual: { label: 'Annual', cycle: '/ year', badge: 'ANNUAL' },
};

/** Default co-op target plans across all three frequencies. */
export const DEFAULT_PLANS = [
  {
    id: 'weekly-coop',
    planId: 'weekly-coop',
    title: 'Weekly Cooperative Target',
    frequency: 'weekly',
    targetAmount: 120000,
    currentProgress: 40000,
    contributionPerCycle: 10000,
    totalCycles: 12,
    currentCycle: 4,
    nextDeduction: 'Every Monday • 9:00 AM',
    autoDebit: true,
    locked: false,
    lockUntil: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'monthly-coop',
    planId: 'monthly-coop',
    title: 'Monthly Cooperative Target',
    frequency: 'monthly',
    targetAmount: 600000,
    currentProgress: 150000,
    contributionPerCycle: 50000,
    totalCycles: 12,
    currentCycle: 3,
    nextDeduction: '1st of next month • 9:00 AM',
    autoDebit: true,
    locked: false,
    lockUntil: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'annual-coop',
    planId: 'annual-coop',
    title: 'Annual Cooperative Target',
    frequency: 'annual',
    targetAmount: 1200000,
    currentProgress: 240000,
    contributionPerCycle: 100000,
    totalCycles: 12,
    currentCycle: 3,
    nextDeduction: '1st of each month • 9:00 AM',
    autoDebit: false,
    locked: true,
    lockUntil: 'Dec 2026',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emergency-reserve',
    planId: 'emergency-reserve',
    title: 'Fixed Emergency Reserve',
    frequency: 'monthly',
    targetAmount: 500000,
    currentProgress: 500000,
    contributionPerCycle: 0,
    totalCycles: 0,
    currentCycle: 0,
    nextDeduction: '—',
    autoDebit: false,
    locked: true,
    lockUntil: 'Dec 2026',
    createdAt: new Date().toISOString(),
  },
];

const SavingsPlansContext = createContext(null);

export function SavingsPlansProvider({ children }) {
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  // Restore the member's snapshot (defaults + their goals) once on mount.
  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(PLANS_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (Array.isArray(saved) && saved.length) setPlans(saved);
        }
      } catch (e) {
        // Corrupt / unavailable — keep the defaults.
      }
    })();
  }, []);

  const persist = useCallback((next) => {
    setPlans(next);
    storage.setItem(PLANS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  /** Add a freshly-created goal to the store (and persist the snapshot). */
  const addPlan = useCallback(
    (plan) => {
      const newPlan = {
        planId: plan.planId || `goal-${Date.now()}`,
        id: plan.id || `goal-${Date.now()}`,
        title: plan.title || 'New Savings Goal',
        frequency: plan.frequency || 'monthly',
        targetAmount: Number(plan.targetAmount) || 0,
        currentProgress: Number(plan.currentProgress) || 0,
        contributionPerCycle: Number(plan.contributionPerCycle) || 0,
        totalCycles: Number(plan.totalCycles) || 12,
        currentCycle: 0,
        nextDeduction: plan.nextDeduction || '1st of next month • 9:00 AM',
        autoDebit: Boolean(plan.autoDebit),
        locked: Boolean(plan.locked),
        lockUntil: plan.lockUntil || '',
        createdAt: new Date().toISOString(),
        ...plan,
      };
      setPlans((prev) => {
        const next = [...prev, newPlan];
        storage.setItem(PLANS_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      return newPlan;
    },
    [],
  );

  /** Merge a partial update into an existing plan and persist. */
  const updatePlan = useCallback((idOrPlanId, patch) => {
    setPlans((prev) => {
      const next = prev.map((p) =>
        (p.id === idOrPlanId || p.planId === idOrPlanId)
          ? { ...p, ...patch }
          : p,
      );
      storage.setItem(PLANS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  /** Remove a goal from the store and persist. */
  const removePlan = useCallback((idOrPlanId) => {
    setPlans((prev) => {
      const next = prev.filter((p) => p.id !== idOrPlanId && p.planId !== idOrPlanId);
      storage.setItem(PLANS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <SavingsPlansContext.Provider value={{ plans, addPlan, updatePlan, removePlan }}>
      {children}
    </SavingsPlansContext.Provider>
  );
}

export function useSavingsPlans() {
  const ctx = useContext(SavingsPlansContext);
  if (!ctx) {
    // Safe fallback so consumers never crash when rendered outside the provider.
    return { plans: DEFAULT_PLANS, addPlan: () => {}, updatePlan: () => {}, removePlan: () => {} };
  }
  return ctx;
}