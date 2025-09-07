import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { merchantApi } from '../services/api';
import type { Merchant } from '../types/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { useToast } from '../hooks/use-toast';
import { Building2, Save } from 'lucide-react';

export function MerchantProfilePage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    legalName: '',
    businessType: '',
    gstin: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    contactEmail: '',
    contactPhone: '',
  });

  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ['merchant', merchantId],
    queryFn: () => merchantApi.get(merchantId!),
    enabled: !!merchantId,
  });

  React.useEffect(() => {
    if (merchant) {
      setFormData({
        legalName: merchant.legalName || '',
        businessType: merchant.businessType || '',
        gstin: merchant.gstin || '',
        addressLine1: merchant.addressLine1 || '',
        addressLine2: merchant.addressLine2 || '',
        city: merchant.city || '',
        state: merchant.state || '',
        country: merchant.country || '',
        postalCode: merchant.postalCode || '',
        contactEmail: merchant.contactEmail || '',
        contactPhone: merchant.contactPhone || '',
      });
    }
  }, [merchant]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Merchant>) => merchantApi.update(merchantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant', merchantId] });
      setIsEditing(false);
      toast({
        title: 'Profile updated',
        description: 'Your merchant profile has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (merchant) {
      setFormData({
        legalName: merchant.legalName || '',
        businessType: merchant.businessType || '',
        gstin: merchant.gstin || '',
        addressLine1: merchant.addressLine1 || '',
        addressLine2: merchant.addressLine2 || '',
        city: merchant.city || '',
        state: merchant.state || '',
        country: merchant.country || '',
        postalCode: merchant.postalCode || '',
        contactEmail: merchant.contactEmail || '',
        contactPhone: merchant.contactPhone || '',
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Merchant not found</h3>
        <p className="text-gray-600">The requested merchant profile could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Merchant Profile</h1>
          <p className="text-gray-600">Manage your business information</p>
        </div>

        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Basic business details and registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="businessType">Business Type</Label>
              <Input
                id="businessType"
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="gstin">GSTIN (Optional)</Label>
              <Input
                id="gstin"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                disabled={!isEditing}
                placeholder="29ABCDE1234F1Z5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Business contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                disabled={!isEditing}
                placeholder="+91-9876543210"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
            <CardDescription>
              Business address details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}