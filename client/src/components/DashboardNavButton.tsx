import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface DashboardNavButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  className?: string;
  'aria-label'?: string;
}

export const DashboardNavButton: React.FC<DashboardNavButtonProps> = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  badge,
  className,
  'aria-label': ariaLabel,
}) => {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-start gap-3 w-full transition-all duration-200",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isActive && "bg-primary text-primary-foreground shadow-sm",
        className
      )}
      aria-label={ariaLabel || label}
      aria-pressed={isActive}
      tabIndex={0}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium text-left flex-1 min-w-0 truncate">
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          "ml-auto text-xs font-semibold px-2 py-0.5 rounded-full",
          isActive 
            ? "bg-primary-foreground text-primary" 
            : "bg-destructive text-destructive-foreground"
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Button>
  );
};

export default DashboardNavButton;