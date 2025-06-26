import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Upload, 
  X, 
  AlertCircle,
  CheckCircle,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'url' | 'tel' | 'time';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
  description?: string;
  disabled?: boolean;
  rows?: number; // for textarea
}

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: FormField[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
  isDuplicate?: boolean;
  duplicateMessage?: string;
  onMerge?: () => void;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  fields,
  initialData = {},
  onSubmit,
  submitLabel = 'Save',
  isLoading = false,
  isDuplicate = false,
  duplicateMessage,
  onMerge
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Initialize form data when modal opens or initial data changes
  useEffect(() => {
    if (isOpen) {
      const initialFormData: Record<string, any> = {};
      fields.forEach(field => {
        initialFormData[field.name] = initialData[field.name] || '';
      });
      setFormData(initialFormData);
      setErrors({});
      setTouched({});
      
      // Set image preview if there's an initial image URL
      const imageField = fields.find(f => f.type === 'url' && f.name.toLowerCase().includes('image'));
      if (imageField && initialData[imageField.name]) {
        setImagePreview(initialData[imageField.name]);
      } else {
        setImagePreview(null);
      }
    }
  }, [isOpen, initialData, fields]);

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (value && field.validation) {
      const { min, max, pattern, message } = field.validation;
      
      if (field.type === 'number') {
        const numValue = parseFloat(value);
        if (min !== undefined && numValue < min) {
          return `${field.label} must be at least ${min}`;
        }
        if (max !== undefined && numValue > max) {
          return `${field.label} must be no more than ${max}`;
        }
      }

      if (field.type === 'text' || field.type === 'textarea') {
        if (min !== undefined && value.length < min) {
          return `${field.label} must be at least ${min} characters`;
        }
        if (max !== undefined && value.length > max) {
          return `${field.label} must be no more than ${max} characters`;
        }
      }

      if (pattern && !pattern.test(value)) {
        return message || `${field.label} format is invalid`;
      }
    }

    if (field.type === 'email' && value) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    if (field.type === 'url' && value) {
      try {
        new URL(value);
      } catch {
        return 'Please enter a valid URL';
      }
    }

    return null;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    // Validate field
    const field = fields.find(f => f.name === fieldName);
    if (field) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [fieldName]: error || '' }));
    }

    // Handle image preview
    if (fieldName.toLowerCase().includes('image') && value) {
      setImagePreview(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    setTouched(Object.fromEntries(fields.map(f => [f.name, true])));

    if (hasErrors) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];
    const hasError = touched[field.name] && error;

    const fieldId = `field-${field.name}`;

    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>

        {field.type === 'select' ? (
          <Select
            value={value}
            onValueChange={(newValue) => handleFieldChange(field.name, newValue)}
            disabled={field.disabled}
          >
            <SelectTrigger 
              id={fieldId}
              className={cn(hasError && "border-red-500")}
              aria-describedby={hasError ? `${fieldId}-error` : undefined}
            >
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'textarea' ? (
          <Textarea
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            rows={field.rows || 3}
            className={cn(hasError && "border-red-500")}
            aria-describedby={hasError ? `${fieldId}-error` : undefined}
          />
        ) : (
          <Input
            id={fieldId}
            type={field.type}
            value={value}
            onChange={(e) => {
              const newValue = field.type === 'number' 
                ? e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                : e.target.value;
              handleFieldChange(field.name, newValue);
            }}
            placeholder={field.placeholder}
            disabled={field.disabled}
            className={cn(hasError && "border-red-500")}
            aria-describedby={hasError ? `${fieldId}-error` : undefined}
          />
        )}

        {/* Image Preview */}
        {field.type === 'url' && field.name.toLowerCase().includes('image') && imagePreview && (
          <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
            <Avatar className="w-16 h-16">
              <AvatarImage src={imagePreview} alt="Preview" />
              <AvatarFallback>
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Image Preview</p>
              <p className="text-xs text-gray-500 truncate">{imagePreview}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setImagePreview(null);
                handleFieldChange(field.name, '');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Field Description */}
        {field.description && (
          <p className="text-xs text-gray-500">{field.description}</p>
        )}

        {/* Field Error */}
        {hasError && (
          <p id={`${fieldId}-error`} className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Duplicate Warning */}
        {isDuplicate && duplicateMessage && (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{duplicateMessage}</span>
              {onMerge && (
                <Button variant="outline" size="sm" onClick={onMerge}>
                  Merge Changes
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map(renderField)}
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {Object.keys(errors).length > 0 && Object.values(touched).some(Boolean) && (
                <Badge variant="destructive" className="text-xs">
                  {Object.keys(errors).filter(key => errors[key] && touched[key]).length} errors
                </Badge>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || Object.values(errors).some(Boolean)}
                className="min-w-[80px]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};