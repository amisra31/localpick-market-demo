import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { 
  Image as ImageIcon, 
  RefreshCw, 
  Download, 
  Upload, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { getStorageStats, processImageFromUrl } from '@/utils/enhancedImageUtils';

interface ImageStats {
  totalImages: number;
  totalSize: number;
  totalSizeMB: string;
  averageSize: number;
  averageSizeMB: string;
  formats: { [format: string]: number };
}

interface BackfillProgress {
  isRunning: boolean;
  processed: number;
  failed: number;
  total: number;
  currentItem?: string;
}

export const ImageManagement: React.FC = () => {
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress>({
    isRunning: false,
    processed: 0,
    failed: 0,
    total: 0
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const result = await getStorageStats();
      if (result.success) {
        setStats(result.stats);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to load stats' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load storage stats' });
    } finally {
      setLoading(false);
    }
  };

  const runBackfill = async (dryRun: boolean = false) => {
    setBackfillProgress({
      isRunning: true,
      processed: 0,
      failed: 0,
      total: 0
    });
    
    try {
      const response = await fetch('/api/admin/image-backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dryRun,
          batchSize: 5,
          maxImages: 50 // Limit for UI demo
        })
      });

      const result = await response.json();

      if (response.ok) {
        setBackfillProgress({
          isRunning: false,
          processed: result.processed || 0,
          failed: result.failed || 0,
          total: result.totalImages || 0
        });

        setMessage({
          type: 'success',
          text: dryRun 
            ? `Dry run completed: ${result.processed} would be processed, ${result.failed} would fail`
            : `Backfill completed: ${result.processed} images processed, ${result.failed} failed`
        });

        // Reload stats after successful backfill
        if (!dryRun) {
          await loadStats();
        }
      } else {
        throw new Error(result.error || 'Backfill failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Backfill failed' });
      setBackfillProgress(prev => ({ ...prev, isRunning: false }));
    }
  };

  const processUrlImage = async (url: string) => {
    if (!url.trim()) return;

    setLoading(true);
    try {
      const result = await processImageFromUrl(url, {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp'
      });

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Image processed successfully: ${result.image?.url}`
        });
        await loadStats();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to process image' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to process image' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Image Management</h2>
        <Button
          onClick={loadStats}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Storage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalImages || 0}</div>
            <p className="text-xs text-muted-foreground">
              Optimized images stored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSizeMB || '0.00'} MB</div>
            <p className="text-xs text-muted-foreground">
              Average: {stats?.averageSizeMB || '0.00'} MB per image
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formats</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats?.formats ? Object.entries(stats.formats).map(([format, count]) => (
                <div key={format} className="flex justify-between text-sm">
                  <span className="uppercase">{format}</span>
                  <span>{count}</span>
                </div>
              )) : (
                <div className="text-sm text-muted-foreground">No data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            multiple={true}
            maxFiles={10}
            quality={85}
            format="webp"
            onMultipleImageUpload={(images) => {
              setMessage({
                type: 'success',
                text: `Successfully uploaded ${images.length} image${images.length !== 1 ? 's' : ''}`
              });
              loadStats();
            }}
          />
        </CardContent>
      </Card>

      {/* Backfill Existing Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Backfill Existing Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Process existing external images (Google Drive, etc.) and convert them to optimized format.
            This will download, compress, and store images locally for faster loading.
          </p>

          {backfillProgress.isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing images...</span>
                <span>{backfillProgress.processed} / {backfillProgress.total}</span>
              </div>
              <Progress 
                value={backfillProgress.total > 0 ? (backfillProgress.processed / backfillProgress.total) * 100 : 0} 
              />
              {backfillProgress.currentItem && (
                <p className="text-xs text-muted-foreground">
                  Current: {backfillProgress.currentItem}
                </p>
              )}
            </div>
          )}

          {!backfillProgress.isRunning && (
            <div className="flex gap-2">
              <Button
                onClick={() => runBackfill(true)}
                disabled={loading}
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Dry Run
              </Button>
              <Button
                onClick={() => runBackfill(false)}
                disabled={loading}
              >
                <Zap className="h-4 w-4 mr-2" />
                Run Backfill
              </Button>
            </div>
          )}

          {backfillProgress.total > 0 && !backfillProgress.isRunning && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{backfillProgress.processed}</div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{backfillProgress.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{backfillProgress.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Single URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Process Image from URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Enter image URL (Google Drive, etc.)"
              className="flex-1 px-3 py-2 border rounded-md"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  processUrlImage((e.target as HTMLInputElement).value);
                }
              }}
            />
            <Button
              onClick={() => {
                const input = document.querySelector('input[type="url"]') as HTMLInputElement;
                if (input) processUrlImage(input.value);
              }}
              disabled={loading}
            >
              Process
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This will download, optimize, and store the image locally.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};