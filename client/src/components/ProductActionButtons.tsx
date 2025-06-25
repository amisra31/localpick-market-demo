import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Archive } from 'lucide-react';
import { Product } from '@/types';
import { enhancedDataService } from '@/services/enhancedDataService';
import { toast } from '@/hooks/use-toast';

interface ProductActionButtonsProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onUpdate?: () => void;
  showEdit?: boolean;
  showArchive?: boolean;
  showDelete?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

interface ConfirmDialog {
  open: boolean;
  type: 'archive' | 'delete' | null;
  product: Product | null;
}

export const ProductActionButtons: React.FC<ProductActionButtonsProps> = ({
  product,
  onEdit,
  onUpdate,
  showEdit = true,
  showArchive = true,
  showDelete = true,
  size = 'sm',
  variant = 'outline'
}) => {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    open: false,
    type: null,
    product: null
  });

  const handleArchiveClick = () => {
    setConfirmDialog({
      open: true,
      type: 'archive',
      product
    });
  };

  const handleDeleteClick = () => {
    setConfirmDialog({
      open: true,
      type: 'delete',
      product
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.product || !confirmDialog.type) return;

    try {
      if (confirmDialog.type === 'archive') {
        await enhancedDataService.archiveProduct(confirmDialog.product.id, true);
        toast({
          title: "Product Archived",
          description: `${confirmDialog.product.name} has been archived and is no longer visible to customers.`
        });
      } else if (confirmDialog.type === 'delete') {
        await enhancedDataService.deleteProduct(confirmDialog.product.id);
        toast({
          title: "Product Deleted",
          description: `${confirmDialog.product.name} has been permanently removed.`
        });
      }

      onUpdate?.();
      setConfirmDialog({ open: false, type: null, product: null });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${confirmDialog.type} product: ${error}`,
        variant: "destructive"
      });
    }
  };

  const handleCancelAction = () => {
    setConfirmDialog({ open: false, type: null, product: null });
  };

  const handleEditClick = () => {
    onEdit?.(product);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {showEdit && onEdit && (
          <Button
            size={size}
            variant={variant}
            onClick={handleEditClick}
            className="h-8 w-8 p-0"
            title="Edit product"
          >
            <Edit className="w-3 h-3" />
          </Button>
        )}
        
        {showArchive && (
          <Button
            size={size}
            variant={variant}
            onClick={handleArchiveClick}
            className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
            title="Archive product"
          >
            <Archive className="w-3 h-3" />
          </Button>
        )}
        
        {showDelete && (
          <Button
            size={size}
            variant={variant}
            onClick={handleDeleteClick}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Delete product"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={handleCancelAction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {confirmDialog.type === 'archive' ? 'Archive' : 'Delete'} Product
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'archive' 
                ? 'Are you sure you want to archive this product? It will no longer be visible to customers but can be restored later.'
                : 'Are you sure you want to permanently delete this product? This action cannot be undone.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {confirmDialog.product && (
            <div className="space-y-3 py-4">
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <img 
                    src={confirmDialog.product.image} 
                    alt={confirmDialog.product.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div>
                    <div className="font-medium">{confirmDialog.product.name}</div>
                    <div className="text-sm text-gray-500">${confirmDialog.product.price}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Availability:</span>
                  <Badge variant={confirmDialog.product.stock > 0 ? 'default' : 'destructive'}>
                    {confirmDialog.product.stock > 0 ? 'Available' : 'Out of Stock'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {confirmDialog.product.description}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelAction}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAction}
              variant={confirmDialog.type === 'delete' ? 'destructive' : 'default'}
            >
              {confirmDialog.type === 'archive' ? 'Archive Product' : 'Delete Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};