import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLandingPage } from '@/utils/roleNavigation';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoHeaderProps {
  variant?: 'full' | 'compact';
  className?: string;
  showTagline?: boolean;
}

export const LogoHeader: React.FC<LogoHeaderProps> = ({
  variant = 'full',
  className,
  showTagline = true
}) => {
  const { user, isAuthenticated } = useAuth();
  
  const getHomeLink = () => {
    if (isAuthenticated && user) {
      return getRoleLandingPage(user.role);
    }
    return '/';
  };

  const isCompact = variant === 'compact';

  return (
    <Link 
      to={getHomeLink()} 
      className={cn(
        "flex items-center space-x-2 hover:opacity-80 transition-opacity group",
        className
      )}
      aria-label="LocalPick - Go to home"
    >
      {/* Logo Icon */}
      <div className={cn(
        "rounded-lg bg-brand-gradient flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-shadow",
        isCompact ? "w-6 h-6" : "w-8 h-8"
      )}>
        <Store className={cn(
          "text-white",
          isCompact ? "w-3 h-3" : "w-5 h-5"
        )} />
      </div>

      {/* Text Content */}
      {!isCompact && (
        <div className="flex flex-col">
          <h1 className={cn(
            "font-bold text-brand-gradient leading-tight",
            "text-xl"
          )}>
            LocalPick
          </h1>
          {showTagline && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-tight">
              Discover Local Treasures
            </p>
          )}
        </div>
      )}

      {/* Mobile: Show just icon on small screens, full on larger */}
      <div className={cn(
        "sm:hidden flex flex-col",
        isCompact && "hidden"
      )}>
        <h1 className="font-bold text-brand-gradient text-xl leading-tight">
          LocalPick
        </h1>
      </div>
    </Link>
  );
};