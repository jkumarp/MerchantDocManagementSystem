import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import type { UserListResponse, UserItem, CreateUserResponse } from '../types/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { useToast } from '../hooks/use-toast';
import { Users, Plus, Mail, Shield, UserCheck, UserX } from 'lucide-react';

export function UsersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('');

  const { data: usersData, isLoading } = useQuery<UserListResponse>({
    queryKey: ['users', user?.merchantId, page],
    queryFn: () => userApi.list(user!.merchantId!, page, 10),
    enabled: !!user?.merchantId,
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => userApi.create(data),
    onSuccess: (data: CreateUserResponse) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('');
      
      toast({
        title: 'User invited',
        description: `Invitation sent to ${data.email}. Temp password: ${data.tempPassword}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Invitation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      userApi.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User updated',
        description: 'User has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUserEmail || !newUserName || !newUserRole) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    createUserMutation.mutate({
      email: newUserEmail,
      name: newUserName,
      role: newUserRole,
      merchantId: user!.merchantId!,
    });
  };

  const toggleUserStatus = (userId: string, currentStatus: boolean) => {
    updateUserMutation.mutate({
      userId,
      data: { isActive: !currentStatus },
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'MERCHANT_ADMIN': return 'bg-purple-100 text-purple-800';
      case 'MERCHANT_MANAGER': return 'bg-blue-100 text-blue-800';
      case 'MERCHANT_USER': return 'bg-green-100 text-green-800';
      case 'READ_ONLY': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const roles = [
    { value: 'MERCHANT_ADMIN', label: 'Merchant Admin' },
    { value: 'MERCHANT_MANAGER', label: 'Manager' },
    { value: 'MERCHANT_USER', label: 'User' },
    { value: 'READ_ONLY', label: 'Read Only' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">Manage team members and their access</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
              <DialogDescription>
                Send an invitation to a new team member.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {usersData?.pagination.total || 0} users in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersData?.users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
              <p className="text-gray-600">Invite your first team member to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {usersData?.users.map((userItem: UserItem) => (
                <div key={userItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {userItem.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{userItem.name}</p>
                      <p className="text-sm text-gray-600">{userItem.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getRoleBadgeColor(userItem.role)}>
                          {userItem.role.replace('MERCHANT_', '')}
                        </Badge>
                        {userItem.has2FA && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            2FA
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={userItem.isActive ? 'default' : 'secondary'}>
                      {userItem.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserStatus(userItem.id, userItem.isActive)}
                      disabled={updateUserMutation.isPending}
                    >
                      {userItem.isActive ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {usersData && usersData.pagination.pages > 1 && (
            <div className="flex justify-center mt-6 space-x-2">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Page {page} of {usersData.pagination.pages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === usersData.pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}