
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Store, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const AuthHeader = () => {
  const { user, signOut, hasRole } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.'
      });
    } catch (error) {
      toast({
        title: 'Error signing out',
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getRoleIcon = () => {
    if (hasRole('admin')) return <Shield className="w-4 h-4" />;
    if (hasRole('merchant')) return <Store className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const getRoleName = () => {
    if (hasRole('admin')) return 'Admin';
    if (hasRole('merchant')) return 'Merchant';
    return 'Customer';
  };

  if (user) {
    return (
      <Button variant="outline" size="default" onClick={handleSignOut} className="gap-2">
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Link to="/login">
        <Button variant="outline">Sign In</Button>
      </Link>
      <Link to="/register">
        <Button>Sign Up</Button>
      </Link>
    </div>
  );
};
