import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LogIn, 
  LogOut, 
  User, 
  Settings, 
  Store, 
  ShoppingBag,
  Shield,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleLandingPage } from '@/utils/roleNavigation';

interface LoginButtonProps {
  variant?: 'default' | 'compact' | 'header';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showRole?: boolean;
  showAvatar?: boolean;
}

export const LoginButton: React.FC<LoginButtonProps> = ({
  variant = 'default',
  size = 'md',
  className,
  showRole = true,
  showAvatar = true
}) => {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3 h-3" />;
      case 'merchant':
        return <Store className="w-3 h-3" />;
      case 'user':
        return <ShoppingBag className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'merchant':
        return 'Merchant';
      case 'user':
        return 'Customer';
      default:
        return 'User';
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'merchant':
        return 'secondary';
      case 'user':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg'
  };

  // Not authenticated - show login button
  if (!isAuthenticated || !user) {
    return (
      <Link to="/login">
        <Button 
          className={cn(
            "bg-brand-gradient hover:opacity-90 text-white shadow-sm transition-all duration-200",
            sizeClasses[size],
            className
          )}
        >
          <LogIn className={cn(
            "mr-2",
            size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
          )} />
          Sign In
        </Button>
      </Link>
    );
  }

  // Authenticated - show user menu
  const userInitials = user.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || 'U';

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("p-2", className)}>
            <Avatar className="w-6 h-6">
              {showAvatar && <AvatarImage src={user.name} />}
              <AvatarFallback className="text-xs bg-brand-primary text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
            <LogOut className="w-4 h-4 mr-2" />
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "flex items-center space-x-2 hover:bg-muted/50 transition-colors",
            sizeClasses[size],
            className
          )}
        >
          {showAvatar && (
            <Avatar className={cn(
              size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'
            )}>
              <AvatarImage src={user.name} />
              <AvatarFallback className="bg-brand-primary text-white text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className="flex flex-col items-start min-w-0">
            <span className={cn(
              "font-medium truncate max-w-32",
              size === 'sm' ? 'text-sm' : 'text-base'
            )}>
              {user.name || 'User'}
            </span>
            {showRole && (
              <div className="flex items-center space-x-1">
                {getRoleIcon(user.role)}
                <span className="text-xs text-muted-foreground">
                  {getRoleLabel(user.role)}
                </span>
              </div>
            )}
          </div>
          
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.name} />
                <AvatarFallback className="bg-brand-primary text-white text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Badge variant={getRoleVariant(user.role)} className="w-fit">
              {getRoleIcon(user.role)}
              <span className="ml-1">{getRoleLabel(user.role)}</span>
            </Badge>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link to={getRoleLandingPage(user.role)} className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut} 
          disabled={isSigningOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {isSigningOut ? 'Signing out...' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};