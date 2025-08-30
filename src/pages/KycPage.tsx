import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { kycApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { useToast } from '../hooks/use-toast';
import { Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function KycPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // PAN verification state
  const [panNumber, setPanNumber] = useState('');
  const [panName, setPanName] = useState('');

  // Aadhaar verification state
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otpTxnId, setOtpTxnId] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  const { data: kycStatus, isLoading } = useQuery({
    queryKey: ['kyc', 'status', user?.merchantId],
    queryFn: () => kycApi.getStatus(user!.merchantId!),
    enabled: !!user?.merchantId,
  });

  const panVerifyMutation = useMutation({
    mutationFn: (data: { panNumber: string; name: string; merchantId: string }) =>
      kycApi.verifyPan(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      toast({
        title: 'PAN Verification',
        description: data.message,
        variant: data.status === 'VERIFIED' ? 'default' : 'destructive',
      });
      setPanNumber('');
      setPanName('');
    },
    onError: (error: any) => {
      toast({
        title: 'PAN verification failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const aadhaarInitMutation = useMutation({
    mutationFn: (data: { aadhaarNumber: string; merchantId: string }) =>
      kycApi.initAadhaarOtp(data),
    onSuccess: (data) => {
      setOtpTxnId(data.txnId);
      setShowOtpInput(true);
      toast({
        title: 'OTP Sent',
        description: `OTP sent to your registered mobile number. Use 123456 for demo.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'OTP send failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const aadhaarVerifyMutation = useMutation({
    mutationFn: (data: { txnId: string; otp: string; merchantId: string }) =>
      kycApi.verifyAadhaarOtp(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      toast({
        title: 'Aadhaar Verification',
        description: data.message,
        variant: data.status === 'VERIFIED' ? 'default' : 'destructive',
      });
      setAadhaarNumber('');
      setOtp('');
      setOtpTxnId('');
      setShowOtpInput(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Aadhaar verification failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handlePanVerify = () => {
    if (!panNumber || !panName) {
      toast({
        title: 'Missing information',
        description: 'Please enter both PAN number and name',
        variant: 'destructive',
      });
      return;
    }

    panVerifyMutation.mutate({
      panNumber,
      name: panName,
      merchantId: user!.merchantId!,
    });
  };

  const handleAadhaarInit = () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      toast({
        title: 'Invalid Aadhaar',
        description: 'Please enter a valid 12-digit Aadhaar number',
        variant: 'destructive',
      });
      return;
    }

    aadhaarInitMutation.mutate({
      aadhaarNumber,
      merchantId: user!.merchantId!,
    });
  };

  const handleAadhaarVerify = () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a valid 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    aadhaarVerifyMutation.mutate({
      txnId: otpTxnId,
      otp,
      merchantId: user!.merchantId!,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'PENDING': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'FAILED': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">KYC Verification</h1>
        <p className="text-gray-600">Complete your identity verification</p>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-6 w-6 mr-2" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge className={getStatusColor(kycStatus?.overallStatus || 'PENDING')}>
                {kycStatus?.overallStatus || 'PENDING'}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">
                {kycStatus?.overallStatus === 'COMPLETE' 
                  ? 'All verifications completed successfully'
                  : 'Complete all verifications to unlock full access'
                }
              </p>
            </div>
            {getStatusIcon(kycStatus?.overallStatus || 'PENDING')}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PAN Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              PAN Verification
              {getStatusIcon(kycStatus?.panStatus || 'PENDING')}
            </CardTitle>
            <CardDescription>
              Verify your PAN card details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {kycStatus?.panStatus === 'VERIFIED' ? (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">PAN Verified</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  PAN: {kycStatus.panNumber}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="pan">PAN Number</Label>
                  <Input
                    id="pan"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label htmlFor="panName">Name (as per PAN)</Label>
                  <Input
                    id="panName"
                    value={panName}
                    onChange={(e) => setPanName(e.target.value)}
                    placeholder="Full name as per PAN card"
                  />
                </div>
                <Button 
                  onClick={handlePanVerify}
                  disabled={panVerifyMutation.isPending || !panNumber || !panName}
                  className="w-full"
                >
                  {panVerifyMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify PAN'
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Aadhaar Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Aadhaar Verification
              {getStatusIcon(kycStatus?.aadhaarStatus || 'PENDING')}
            </CardTitle>
            <CardDescription>
              Verify your Aadhaar card with OTP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {kycStatus?.aadhaarStatus === 'VERIFIED' ? (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">Aadhaar Verified</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Last 4 digits: {kycStatus.aadhaarLast4}
                </p>
              </div>
            ) : (
              <>
                {!showOtpInput ? (
                  <>
                    <div>
                      <Label htmlFor="aadhaar">Aadhaar Number</Label>
                      <Input
                        id="aadhaar"
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456789012"
                        maxLength={12}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Demo: Use any 12-digit number
                      </p>
                    </div>
                    <Button 
                      onClick={handleAadhaarInit}
                      disabled={aadhaarInitMutation.isPending || aadhaarNumber.length !== 12}
                      className="w-full"
                    >
                      {aadhaarInitMutation.isPending ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Sending OTP...
                        </>
                      ) : (
                        'Send OTP'
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        OTP sent to your registered mobile number
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Demo OTP: 123456
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleAadhaarVerify}
                        disabled={aadhaarVerifyMutation.isPending || otp.length !== 6}
                        className="flex-1"
                      >
                        {aadhaarVerifyMutation.isPending ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Verifying...
                          </>
                        ) : (
                          'Verify OTP'
                        )}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowOtpInput(false);
                          setOtp('');
                          setOtpTxnId('');
                        }}
                      >
                        Back
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Timeline</CardTitle>
          <CardDescription>
            Track your verification progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(kycStatus?.panStatus || 'PENDING')}
              <div className="flex-1">
                <p className="font-medium">PAN Verification</p>
                <p className="text-sm text-gray-600">
                  {kycStatus?.panStatus === 'VERIFIED' 
                    ? `Verified: ${kycStatus.panNumber}`
                    : 'Verify your PAN card details'
                  }
                </p>
              </div>
              <Badge className={getStatusColor(kycStatus?.panStatus || 'PENDING')}>
                {kycStatus?.panStatus || 'PENDING'}
              </Badge>
            </div>

            <div className="flex items-center space-x-3">
              {getStatusIcon(kycStatus?.aadhaarStatus || 'PENDING')}
              <div className="flex-1">
                <p className="font-medium">Aadhaar Verification</p>
                <p className="text-sm text-gray-600">
                  {kycStatus?.aadhaarStatus === 'VERIFIED' 
                    ? `Verified: XXXX-XXXX-${kycStatus.aadhaarLast4}`
                    : 'Verify your Aadhaar card with OTP'
                  }
                </p>
              </div>
              <Badge className={getStatusColor(kycStatus?.aadhaarStatus || 'PENDING')}>
                {kycStatus?.aadhaarStatus || 'PENDING'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}