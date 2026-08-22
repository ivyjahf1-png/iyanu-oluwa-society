import { useState, useMemo } from 'react';

/**
 * Configurable simple-interest loan engine.
 *
 * Default rate: r = 2.5% per month (simple interest).
 * Tenure is expressed in months; repayment frequency can be weekly or monthly.
 *
 * Returns the current form values, setters, and a memoised breakdown:
 *   { interestAmount, totalRepayment, perInstallment, installments }
 */
export default function useLoanInterest({ monthlyRate = 0.025 } = {}) {
  const [amount, setAmount] = useState('');
  const [tenureMonths, setTenureMonths] = useState(3);
  const [frequency, setFrequency] = useState('monthly'); // 'monthly' | 'weekly'

  const breakdown = useMemo(() => {
    const principal = parseFloat(amount) || 0;
    const interestAmount = principal * monthlyRate * tenureMonths;
    const totalRepayment = principal + interestAmount;

    // Weekly frequency splits the tenure into ~4.33 weeks per month.
    const installments =
      frequency === 'weekly' ? Math.max(1, Math.round(tenureMonths * 4.33)) : Math.max(1, tenureMonths);

    const perInstallment = installments > 0 ? totalRepayment / installments : 0;

    return {
      principal,
      interestAmount,
      totalRepayment,
      perInstallment,
      installments,
    };
  }, [amount, tenureMonths, frequency, monthlyRate]);

  return {
    amount,
    setAmount,
    tenureMonths,
    setTenureMonths,
    frequency,
    setFrequency,
    monthlyRate,
    breakdown,
  };
}