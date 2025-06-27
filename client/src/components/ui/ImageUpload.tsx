import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import { uploadImage, uploadMultipleImages, validateImage } from '@/utils/enhancedImageUtils';

interface ImageUploadProps {
  onImageUpload?: (imageData: {
    id: string;
    url: string;
    webpUrl: string;
    jpegUrl: string;
    width: number;
    height: number;
    size: number;
  }) => void;
  onMultipleImageUpload?: (images: any[]) => void;
  maxFiles?: number;
  accept?: string;
  maxSizeMB?: number;
  quality?: number;
  width?: number;
  height?: number;
  format?: 'webp' | 'jpeg';
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  preview?: boolean;
}

interface UploadedImage {
  id: string;
  url: string;
  webpUrl: string;
  jpegUrl: string;
  originalName: string;
  size: number;
  width: number;
  height: number;
  metadata?: any;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  onMultipleImageUpload,
  maxFiles = 5,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  maxSizeMB = 10,
  quality = 85,
  width,
  height,
  format = 'webp',
  className = '',
  disabled = false,
  multiple = false,
  preview = true
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const validationErrors: string[] = [];

    // Validate files
    for (const file of fileArray) {
      const validation = validateImage(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        validationErrors.push(`${file.name}: ${validation.error}`);
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
    }

    if (validFiles.length === 0) return;

    // Check max files limit
    if (uploadedImages.length + validFiles.length > maxFiles) {
      setErrors(prev => [...prev, `Maximum ${maxFiles} files allowed`]);
      return;
    }

    setUploading(true);
    setProgress(0);
    setErrors([]);

    try {
      if (multiple) {
        // Upload multiple files
        const result = await uploadMultipleImages(validFiles, {
          width,
          height,
          quality,
          format
        });

        if (result.success && result.images.length > 0) {
          const newImages = result.images.map(img => ({
            id: img.id,
            url: img.url,
            webpUrl: img.webpUrl,
            jpegUrl: img.jpegUrl,
            originalName: img.originalName,
            size: img.size,
            width: img.width,
            height: img.height,
            metadata: img.metadata
          }));

          setUploadedImages(prev => [...prev, ...newImages]);
          onMultipleImageUpload?.(newImages);
        }

        if (result.errors.length > 0) {
          setErrors(result.errors.map(err => err.error));
        }
      } else {
        // Upload single file
        const file = validFiles[0];
        const result = await uploadImage(file, {
          width,
          height,
          quality,
          format
        });

        if (result.success && result.image) {
          const newImage = {
            id: result.image.id,
            url: result.image.url,
            webpUrl: result.image.webpUrl,
            jpegUrl: result.image.jpegUrl,
            originalName: file.name,
            size: result.image.size,
            width: result.image.width,
            height: result.image.height,
            metadata: result.image.metadata
          };

          setUploadedImages([newImage]);
          onImageUpload?.(newImage);
        } else {
          setErrors([result.error || 'Upload failed']);
        }
      }
    } catch (error) {
      setErrors([error.message || 'Upload failed']);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [disabled, multiple, maxFiles, uploadedImages.length, width, height, quality, format, onImageUpload, onMultipleImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || uploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, uploading, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  }, [disabled, uploading]);

  const removeImage = useCallback((imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  const clearAll = useCallback(() => {
    setUploadedImages([]);
    setErrors([]);
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          disabled || uploading 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <CardContent className="p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            disabled={disabled || uploading}
          />

          {uploading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div>
                <p className="text-sm font-medium">Uploading and optimizing...</p>
                <Progress value={progress} className="mt-2" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {multiple ? 'Upload Images' : 'Upload Image'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Drag and drop {multiple ? 'images' : 'an image'} here, or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supports JPEG, PNG, WebP, GIF • Max {maxSizeMB}MB per file
                  {multiple && ` • Up to ${maxFiles} files`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Preview Area */}
      {preview && uploadedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Uploaded Images ({uploadedImages.length})
            </h3>
            {multiple && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={uploading}
              >
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages.map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <div className="relative">
                  <OptimizedImage
                    src={image.url}
                    alt={image.originalName}
                    width={200}
                    height={200}
                    size="small"
                    className="w-full aspect-square object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => removeImage(image.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="absolute bottom-2 left-2">
                    <CheckCircle className="h-4 w-4 text-green-500 bg-white rounded-full" />
                  </div>
                </div>
                <CardContent className="p-2">
                  <p className="text-xs text-gray-600 truncate" title={image.originalName}>
                    {image.originalName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(image.size / 1024).toFixed(1)}KB • {image.width}×{image.height}
                  </p>
                  {image.metadata?.compressionRatio && (
                    <p className="text-xs text-green-600">
                      -{image.metadata.compressionRatio}% size
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Stats */}
      {uploadedImages.length > 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''}
            </span>
            <span>
              Total: {(uploadedImages.reduce((sum, img) => sum + img.size, 0) / 1024).toFixed(1)}KB
            </span>
            {uploadedImages[0]?.metadata?.compressionRatio && (
              <span className="text-green-600">
                Avg compression: -{Math.round(
                  uploadedImages.reduce((sum, img) => sum + parseFloat(img.metadata?.compressionRatio || '0'), 0) / uploadedImages.length
                )}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};