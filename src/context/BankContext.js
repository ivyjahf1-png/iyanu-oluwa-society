import React, { createContext, useContext, useState } from 'react';

/**
 * Global Cooperative Bank Account context.
 *
 * The Admin sets these details once in the Admin Settings screen and every
 * contribution / loan repayment screen reads the latest values from here.
 */
const BankContext = createContext({
  bankName: '',
  accountNumber: '',
  accountName: '',
  setBankDetails: () => {},
});

export function BankProvider({ children }) {
  const [bankDetails, setBankDetails] = useState({
    bankName: 'Zenith Bank',
    accountNumber: '1234567890',
    accountName: 'Iyanu Oluwa Society',
  });

  const setBankField = (field, value) => {
    setBankDetails(prev => ({ ...prev, [field]: value }));
  };

  const value = {
    ...bankDetails,
    setBankField,
  };

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

export function useBankDetails() {
  return useContext(BankContext);
}