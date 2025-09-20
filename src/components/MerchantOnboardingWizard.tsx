import  { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { LoadingSpinner } from './ui/loading-spinner';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { documentApi } from '../services/api';
import { 
  FileText, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  //Upload,
  Shield,
  Clock,
 // AlertCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface WizardFormData {
  // Registration data
  legalName: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  gstin: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  password: string;
  confirmPassword: string;
  
  // Documents data
  documents: Array<{
    file: File;
    category: string;
    uploaded: boolean;
  }>;
  
  // KYC data
  panNumber: string;
  panName: string;
  aadhaarNumber: string;
  kycCompleted: boolean;
}

const businessTypes = [
  { value: 'Proprietorship', label: 'Proprietorship' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Pvt Ltd', label: 'Private Limited' },
  { value: 'LLP', label: 'Limited Liability Partnership' },
  { value: 'Others', label: 'Others' },
];

const documentCategories = ['KYC', 'CONTRACT', 'INVOICE', 'BANK', 'MISC'];

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

export function MerchantOnboardingWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, setMerchantId] = useState<string>('');
  
  const [formData, setFormData] = useState<WizardFormData>({
    // Registration data
    legalName: '',
    businessType: '',
    contactEmail: '',
    contactPhone: '',
    gstin: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    postalCode: '',
    password: '',
    confirmPassword: '',
    
    // Documents data
    documents: [],
    
    // KYC data
    panNumber: '',
    panName: '',
    aadhaarNumber: '',
    kycCompleted: false,
  });

  const steps = [
    { title: 'Business Registration', description: 'Enter your business details' },
    { title: 'Document Upload', description: 'Upload required documents' },
    { title: 'KYC Verification', description: 'Complete identity verification' },
  ];

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${API_BASE_URL}/merchants/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Registration failed');
      return result;
    },
    onSuccess: (data) => {
      setMerchantId(data.merchantId);
      toast({
        title: 'Registration Successful!',
        description: 'Your merchant account has been created.',
      });
      setCurrentStep(1);
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateFormData = (field: keyof WizardFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      // Registration validation
      if (!formData.legalName.trim()) newErrors.legalName = 'Legal name is required';
      if (!formData.businessType) newErrors.businessType = 'Business type is required';
      if (!formData.contactEmail.trim()) newErrors.contactEmail = 'Contact email is required';
      if (!formData.contactPhone.trim()) newErrors.contactPhone = 'Contact phone is required';
      if (!formData.addressLine1.trim()) newErrors.addressLine1 = 'Address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.state.trim()) newErrors.state = 'State is required';
      if (!formData.country.trim()) newErrors.country = 'Country is required';
      if (!formData.postalCode.trim()) newErrors.postalCode = 'Postal code is required';
      if (!formData.password) newErrors.password = 'Password is required';
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirm password is required';

      // Format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.contactEmail && !emailRegex.test(formData.contactEmail)) {
        newErrors.contactEmail = 'Invalid email format';
      }

      const phoneRegex = /^[0-9]{10,15}$/;
      if (formData.contactPhone && !phoneRegex.test(formData.contactPhone)) {
        newErrors.contactPhone = 'Phone number must be 10-15 digits';
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (formData.password && !passwordRegex.test(formData.password)) {
        newErrors.password = 'Password must contain uppercase, lowercase, number and special character (min 8 chars)';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 0) {
      // Submit registration
      const { confirmPassword, documents, panNumber, panName, aadhaarNumber, kycCompleted, ...registrationData } = formData;
      registerMutation.mutate(registrationData);
    } else if (currentStep === 1) {
      // Move to KYC step
      setCurrentStep(2);
    } else {
      // Final submission
      handleFinalSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalSubmit = () => {
    toast({
      title: 'Onboarding Complete!',
      description: 'Your merchant onboarding has been completed successfully.',
    });
    navigate('/login');
  };

  const handleDocumentUpload = async (file: File, category: string) => {
    try {
      // Calculate checksum
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const checksumSha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Get presigned URL
      const presignData = await documentApi.presign({
        category,
        mimeType: file.type,
        sizeBytes: file.size,
        filename: file.name,
        checksumSha256,
      });

      // Upload to S3
      const uploadResponse = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      // Save metadata
      await documentApi.save({
        storageKey: presignData.storageKey,
        category,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        checksumSha256,
      });

      // Update form data
      const newDocuments = [...formData.documents];
      const existingIndex = newDocuments.findIndex(doc => doc.file.name === file.name);
      if (existingIndex >= 0) {
        newDocuments[existingIndex].uploaded = true;
      } else {
        newDocuments.push({ file, category, uploaded: true });
      }
      updateFormData('documents', newDocuments);

      toast({
        title: 'Upload successful',
        description: 'Your document has been uploaded successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
    }
  };

  const renderRegistrationStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="legalName">Legal Name *</Label>
            <Input
              id="legalName"
              value={formData.legalName}
              onChange={(e) => updateFormData('legalName', e.target.value)}
              placeholder="ABC Enterprises Pvt Ltd"
              className={errors.legalName ? 'border-red-500' : ''}
            />
            {errors.legalName && <p className="text-sm text-red-600 mt-1">{errors.legalName}</p>}
          </div>

          <div>
            <Label htmlFor="businessType">Business Type *</Label>
            <Select value={formData.businessType} onValueChange={(value) => updateFormData('businessType', value)}>
              <SelectTrigger className={errors.businessType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.businessType && <p className="text-sm text-red-600 mt-1">{errors.businessType}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => updateFormData('contactEmail', e.target.value)}
              placeholder="info@abc.com"
              className={errors.contactEmail ? 'border-red-500' : ''}
            />
            {errors.contactEmail && <p className="text-sm text-red-600 mt-1">{errors.contactEmail}</p>}
          </div>

          <div>
            <Label htmlFor="contactPhone">Contact Phone *</Label>
            <Input
              id="contactPhone"
              value={formData.contactPhone}
              onChange={(e) => updateFormData('contactPhone', e.target.value.replace(/\D/g, ''))}
              placeholder="9876543210"
              maxLength={15}
              className={errors.contactPhone ? 'border-red-500' : ''}
            />
            {errors.contactPhone && <p className="text-sm text-red-600 mt-1">{errors.contactPhone}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="gstin">GSTIN (Optional)</Label>
          <Input
            id="gstin"
            value={formData.gstin}
            onChange={(e) => updateFormData('gstin', e.target.value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
        
        <div>
          <Label htmlFor="addressLine1">Address Line 1 *</Label>
          <Input
            id="addressLine1"
            value={formData.addressLine1}
            onChange={(e) => updateFormData('addressLine1', e.target.value)}
            placeholder="123 Main Street"
            className={errors.addressLine1 ? 'border-red-500' : ''}
          />
          {errors.addressLine1 && <p className="text-sm text-red-600 mt-1">{errors.addressLine1}</p>}
        </div>

        <div>
          <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
          <Input
            id="addressLine2"
            value={formData.addressLine2}
            onChange={(e) => updateFormData('addressLine2', e.target.value)}
            placeholder="Near City Mall"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateFormData('city', e.target.value)}
              placeholder="Mumbai"
              className={errors.city ? 'border-red-500' : ''}
            />
            {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city}</p>}
          </div>

          <div>
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => updateFormData('state', e.target.value)}
              placeholder="Maharashtra"
              className={errors.state ? 'border-red-500' : ''}
            />
            {errors.state && <p className="text-sm text-red-600 mt-1">{errors.state}</p>}
          </div>

          <div>
            <Label htmlFor="postalCode">Postal Code *</Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => updateFormData('postalCode', e.target.value.replace(/\D/g, ''))}
              placeholder="400001"
              maxLength={10}
              className={errors.postalCode ? 'border-red-500' : ''}
            />
            {errors.postalCode && <p className="text-sm text-red-600 mt-1">{errors.postalCode}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => updateFormData('country', e.target.value)}
            placeholder="India"
            className={errors.country ? 'border-red-500' : ''}
          />
          {errors.country && <p className="text-sm text-red-600 mt-1">{errors.country}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Account Security</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                placeholder="StrongPass@123"
                className={errors.password ? 'border-red-500' : ''}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
          </div>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Password must contain at least 8 characters with uppercase, lowercase, number, and special character.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Document Upload</h3>
        <p className="text-gray-600">Upload your business documents for verification</p>
      </div>

      <div className="space-y-4">
        {documentCategories.map(category => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base">{category} Documents</CardTitle>
              <CardDescription>
                Upload documents for {category.toLowerCase()} category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleDocumentUpload(file, category);
                    }
                  }}
                />
                <p className="text-xs text-gray-500">
                  Max size: 20MB. Supported: PDF, DOC, DOCX, JPG, PNG
                </p>
                
                {formData.documents
                  .filter(doc => doc.category === category)
                  .map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{doc.file.name}</span>
                      <Badge variant={doc.uploaded ? 'default' : 'secondary'}>
                        {doc.uploaded ? 'Uploaded' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Document upload is optional during onboarding. You can upload documents later from your dashboard.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderKycStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">KYC Verification</h3>
        <p className="text-gray-600">Complete your identity verification</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              PAN Verification
              <Shield className="h-5 w-5 text-gray-400" />
            </CardTitle>
            <CardDescription>
              Enter your PAN card details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={formData.panNumber}
                onChange={(e) => updateFormData('panNumber', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>
            <div>
              <Label htmlFor="panName">Name (as per PAN)</Label>
              <Input
                id="panName"
                value={formData.panName}
                onChange={(e) => updateFormData('panName', e.target.value)}
                placeholder="Full name as per PAN card"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Aadhaar Verification
              <Shield className="h-5 w-5 text-gray-400" />
            </CardTitle>
            <CardDescription>
              Enter your Aadhaar number
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
              <Input
                id="aadhaarNumber"
                value={formData.aadhaarNumber}
                onChange={(e) => updateFormData('aadhaarNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="123456789012"
                maxLength={12}
              />
              <p className="text-xs text-gray-500 mt-1">
                Demo: Use any 12-digit number
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          KYC verification is optional during onboarding. You can complete the full verification process later from your dashboard.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderRegistrationStep();
      case 1:
        return renderDocumentsStep();
      case 2:
        return renderKycStep();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <FileText className="h-12 w-12 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Merchant Onboarding
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Complete your business registration in a few simple steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${index <= currentStep 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {index < currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="ml-2 text-sm">
                <div className={`font-medium ${index <= currentStep ? 'text-indigo-600' : 'text-gray-500'}`}>
                  {step.title}
                </div>
                <div className="text-gray-500 text-xs">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="h-5 w-5 text-gray-400 mx-4" />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Processing...
              </>
            ) : currentStep === steps.length - 1 ? (
              'Complete Onboarding'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}