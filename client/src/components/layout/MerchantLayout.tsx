import React from 'react';
import { AppLayout } from './AppLayout';

interface MerchantLayoutProps {
  children: React.ReactNode;
  onSearch?: (query: string) => void;
  className?: string;
}

export const MerchantLayout: React.FC<MerchantLayoutProps> = ({
  children,
  onSearch,
  className
}) => {
  const headerActions = (
    <>
      {/* Navigation buttons hidden as requested */}
    </>
  );

  return (
    <AppLayout
      variant="merchant"
      showSearch={true}
      searchPlaceholder="Search your products, orders..."
      onSearch={onSearch}
      headerActions={headerActions}
      className={className}
    >
      {children}
    </AppLayout>
  );
};