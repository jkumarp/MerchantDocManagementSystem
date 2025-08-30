import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { documentApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { useToast } from '../hooks/use-toast';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Filter,
  Plus
} from 'lucide-react';

export function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', user?.merchantId, selectedCategory, page],
    queryFn: () => documentApi.list({
      merchantId: user?.merchantId,
      category: selectedCategory || undefined,
      page,
      limit: 10,
    }),
    enabled: !!user?.merchantId,
  });

  const deleteMutation = useMutation({
    mutationFn: documentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Document deleted',
        description: 'The document has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'Failed to delete document',
        variant: 'destructive',
      });
    },
  });

  const handleUpload = async () => {
    if (!uploadFile || !uploadCategory) {
      toast({
        title: 'Missing information',
        description: 'Please select a file and category',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Calculate checksum
      const arrayBuffer = await uploadFile.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const checksumSha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Get presigned URL
      const presignData = await documentApi.presign({
        category: uploadCategory,
        mimeType: uploadFile.type,
        sizeBytes: uploadFile.size,
        filename: uploadFile.name,
        checksumSha256,
      });

      // Upload to S3
      const uploadResponse = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        body: uploadFile,
        headers: {
          'Content-Type': uploadFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Save metadata
      await documentApi.save({
        storageKey: presignData.storageKey,
        category: uploadCategory,
        filename: uploadFile.name,
        mimeType: uploadFile.type,
        sizeBytes: uploadFile.size,
        checksumSha256,
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadCategory('');

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
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (documentId: string, filename: string) => {
    try {
      const { downloadUrl } = await documentApi.getDownloadUrl(documentId);
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Download started',
        description: 'Your document download has started.',
      });
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const categories = ['KYC', 'CONTRACT', 'INVOICE', 'BANK', 'MISC'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your business documents</p>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Select a file and category to upload your document.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max size: 20MB. Supported: PDF, DOC, DOCX, JPG, PNG
                </p>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={isUploading || !uploadFile || !uploadCategory}>
                  {isUploading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="category-filter">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            {documentsData?.pagination.total || 0} documents found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : documentsData?.documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-600">Upload your first document to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documentsData?.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.filename}</p>
                      <p className="text-sm text-gray-600">
                        Uploaded by {doc.uploadedBy.name} • {new Date(doc.createdAt).toLocaleDateString()} • {(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{doc.category}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.id, doc.filename)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {documentsData && documentsData.pagination.pages > 1 && (
            <div className="flex justify-center mt-6 space-x-2">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                Page {page} of {documentsData.pagination.pages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === documentsData.pagination.pages}
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