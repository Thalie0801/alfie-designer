import React, { useState } from 'react';
import PremiumModal from '../examples/ui/PremiumModal';

type Props = {
  woofCost?: number;
  onConfirm: () => void;
  onUseEco: () => void;
  children: (open: () => void) => React.ReactNode;
};

export default function PremiumConfirmGate({ woofCost = 1, onConfirm, onUseEco, children }: Props) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      {children(() => setOpen(true))}
      <PremiumModal
        open={open}
        woofsCost={woofCost}
        onConfirm={() => {
          close();
          onConfirm();
        }}
        onUseEco={() => {
          close();
          onUseEco();
        }}
        onClose={close}
      />
    </>
  );
}
