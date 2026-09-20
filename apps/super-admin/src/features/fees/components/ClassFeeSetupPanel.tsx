'use client';

import FeeSetupScreen from '@/features/fees/components/FeeSetupScreen';

interface ClassFeeSetupPanelProps {
  onMessage?: (text: string, type?: 'success' | 'error') => void;
}

/** @deprecated Use FeeSetupScreen directly */
export default function ClassFeeSetupPanel(props: ClassFeeSetupPanelProps) {
  return <FeeSetupScreen {...props} />;
}
