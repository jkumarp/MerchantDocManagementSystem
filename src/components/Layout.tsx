import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { 
  FileText, 
  Users, 
  Building2, 
  //Shield, 
  LayoutDashboard, 
  Settings,
  LogOut,
  UserPlus,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_MANAGER', 'MERCHANT_USER', 'READ_ONLY'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['ADMIN', 'MERCHANT_ADMIN', 'MERCHANT_MANAGER'] },
    { name: 'Profile', href: `/merchant/${user?.merchantId}/profile`, icon: Building2, roles: ['MERCHANT_ADMIN', 'MERCHANT_MANAGER'] },
    { name: 'Admin', href: '/admin', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMerchantRegistration = () => {
    navigate('/register');
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Document Management System
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.merchant?.legalName || 'System Admin'}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  {user?.role === 'ADMIN' && (
                    <DropdownMenuItem onClick={handleMerchantRegistration}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Register Merchant</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <div className="space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href.includes('/merchant/') && location.pathname.includes('/merchant/'));
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* Admin-only Merchant Registration Link */}
              {user?.role === 'ADMIN' && (
                <Link
                  to="/register"
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${location.pathname === '/register'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <UserPlus className="mr-3 h-5 w-5" />
                  Merchant Registration
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}