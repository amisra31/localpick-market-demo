import React, { useState } from 'react';
import { AppLayout } from './AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Store, 
  Package, 
  Users, 
  Settings, 
  BarChart3,
  Upload,
  Shield,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: 'shops' | 'products' | 'customers';
  onTabChange?: (tab: 'shops' | 'products' | 'customers') => void;
  onSearch?: (query: string) => void;
  className?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onSearch,
  className
}) => {
  const [notificationCount] = useState(3); // Mock notification count

  const navigationItems = [
    {
      id: 'shops' as const,
      label: 'Shops',
      icon: Store,
      description: 'Manage marketplace shops'
    },
    {
      id: 'products' as const,
      label: 'Products',
      icon: Package,
      description: 'Manage all products'
    },
    {
      id: 'customers' as const,
      label: 'Customers',
      icon: Users,
      description: 'Manage user accounts'
    }
  ];

  const headerActions = (
    <>
      {/* Quick Stats */}
      <div className="hidden xl:flex items-center space-x-4 mr-4">
        <div className="text-center">
          <div className="text-sm font-semibold text-brand-primary">24</div>
          <div className="text-xs text-muted-foreground">Shops</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-brand-secondary">156</div>
          <div className="text-xs text-muted-foreground">Products</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-brand-accent">89</div>
          <div className="text-xs text-muted-foreground">Users</div>
        </div>
      </div>

      {/* Analytics */}
      <Button variant="ghost" size="sm" className="flex items-center space-x-1">
        <BarChart3 className="w-4 h-4" />
        <span className="hidden lg:inline">Analytics</span>
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="sm" className="relative">
        <Bell className="w-4 h-4" />
        {notificationCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center"
          >
            {notificationCount}
          </Badge>
        )}
        <span className="sr-only">Notifications</span>
      </Button>

      {/* Settings */}
      <Button variant="ghost" size="sm" className="flex items-center space-x-1">
        <Settings className="w-4 h-4" />
        <span className="hidden lg:inline">Settings</span>
      </Button>
    </>
  );

  return (
    <AppLayout
      variant="admin"
      showSearch={true}
      searchPlaceholder="Search shops, products, customers..."
      onSearch={onSearch}
      headerActions={headerActions}
      className={className}
    >
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-white border-r border-border flex-shrink-0 hidden lg:block">
          <div className="p-6">
            {/* Admin Badge */}
            <div className="flex items-center space-x-2 mb-6 p-3 bg-brand-primary-light rounded-lg">
              <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-primary">Admin Panel</h3>
                <p className="text-sm text-muted-foreground">LocalPick</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange?.(item.id)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 group",
                      isActive
                        ? "bg-brand-primary text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-100 hover:text-brand-primary"
                    )}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Navigate to ${item.label} management`}
                  >
                    <Icon className={cn(
                      "w-5 h-5 flex-shrink-0 transition-colors",
                      isActive ? "text-white" : "text-gray-400 group-hover:text-brand-primary"
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className={cn(
                        "text-xs truncate",
                        isActive ? "text-white/80" : "text-gray-500"
                      )}>
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Quick Actions */}
            <div className="mt-8 pt-6 border-t border-border">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {/* Mobile Tab Navigation */}
          {onTabChange && (
            <div className="lg:hidden bg-white border-b border-border p-4">
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-white text-brand-primary shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Page Content */}
          <div className="h-full overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </AppLayout>
  );
};