import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { 
  Building2, 
  Users, 
  FileText, 
  Shield, 
  Activity,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';

export function AdminDashboardPage() {
  const [auditPage, setAuditPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
  });

  const { data: merchantsData, isLoading: merchantsLoading } = useQuery({
    queryKey: ['admin', 'merchants'],
    queryFn: () => adminApi.getMerchants(1, 10),
  });

  const { data: verificationQueue, isLoading: queueLoading } = useQuery({
    queryKey: ['admin', 'verification-queue'],
    queryFn: adminApi.getVerificationQueue,
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['admin', 'audit', auditPage],
    queryFn: () => adminApi.getAuditLogs({ page: auditPage, limit: 20 }),
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">System overview and management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMerchants || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active businesses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              System users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDocuments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Stored securely
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Merchants</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.verifiedMerchants || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.verificationRate?.toFixed(1) || 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentActivity || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="merchants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="merchants">Merchants</TabsTrigger>
          <TabsTrigger value="verifications">Verification Queue</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="merchants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Merchants</CardTitle>
              <CardDescription>
                Latest registered merchants
              </CardDescription>
            </CardHeader>
            <CardContent>
              {merchantsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : merchantsData?.merchants.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No merchants yet</h3>
                  <p className="text-gray-600">Merchants will appear here once they register.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {merchantsData?.merchants.map((merchant: any) => (
                    <div key={merchant.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-8 w-8 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{merchant.legalName}</p>
                          <p className="text-sm text-gray-600">
                            {merchant.contactEmail} • {merchant._count.users} users • {merchant._count.documents} docs
                          </p>
                          <p className="text-xs text-gray-500">
                            Created {new Date(merchant.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{merchant.businessType}</Badge>
                        {merchant.kyc?.panStatus === 'VERIFIED' && merchant.kyc?.aadhaarStatus === 'VERIFIED' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verifications</CardTitle>
              <CardDescription>
                KYC verifications awaiting review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : verificationQueue?.verifications.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                  <p className="text-gray-600">No pending verifications at the moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {verificationQueue?.verifications.map((verification: any) => (
                    <div key={verification.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{verification.merchant.legalName}</p>
                        <p className="text-sm text-gray-600">{verification.merchant.contactEmail}</p>
                        <div className="flex space-x-2 mt-2">
                          <Badge variant={verification.panStatus === 'PENDING' ? 'secondary' : 'outline'}>
                            PAN: {verification.panStatus || 'PENDING'}
                          </Badge>
                          <Badge variant={verification.aadhaarStatus === 'PENDING' ? 'secondary' : 'outline'}>
                            Aadhaar: {verification.aadhaarStatus || 'PENDING'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Updated {new Date(verification.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                System activity and security events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : auditLogs?.logs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs</h3>
                  <p className="text-gray-600">System activity will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs?.logs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded text-sm">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{log.action}</Badge>
                        <span className="text-gray-900">
                          {log.actor?.name || 'System'}
                        </span>
                        <span className="text-gray-600">
                          {log.merchant?.legalName && `• ${log.merchant.legalName}`}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}