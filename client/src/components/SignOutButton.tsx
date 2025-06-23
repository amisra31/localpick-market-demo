import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';

interface SignOutButtonProps {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
}

export const SignOutButton: React.FC<SignOutButtonProps> = ({ 
  variant = 'outline', 
  size = 'default',
  className = '',
  showText = true 
}) => {
  const { signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button 
      onClick={handleSignOut}
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
    >
      <LogOut className="w-4 h-4" />
      {showText && 'Sign Out'}
    </Button>
  );
};