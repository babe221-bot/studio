'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useDeferredValue,
  useCallback,
} from 'react';
import type { CanvasHandle } from '@/components/VisualizationCanvas';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  initialMaterials,
  initialSurfaceFinishes,
  initialEdgeProfiles,
} from '@/lib/data';
import { constructionElements } from '@/lib/constructionElements';
import { useCadContext } from '@/contexts/CadContext';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CalculationsResult } from '@/lib/calculations';
import {
  PlusIcon,
  Trash2,
  RefreshCw,
  FileDown,
  Loader2,
  Ruler,
  CreditCard,
  Mic,
  MicOff,
  Share2,
  Folder,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ErrorBoundary } from './ErrorBoundary';
import { useOrderCalculations } from '@/hooks/useOrderCalculations';
import { useElementConfiguration } from '@/hooks/useElementConfiguration';
import { useSupabasePersistence } from '@/hooks/useSupabasePersistence';
import { useDesignAnalysis } from '@/hooks/useDesignAnalysis';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import {
  fetchMaterials,
  fetchSurfaceFinishes,
  fetchEdgeProfiles,
} from '@/services/api';
import { VersionHistoryDialog } from './history/VersionHistoryDialog';
import { TemplateManager } from './history/TemplateManager';
import { ARPreview } from './ARPreview';
import { GrainAlignmentTool } from './GrainAlignmentTool';
import { useCollaboration } from '@/hooks/useCollaboration';
import { PresenceAvatars } from './collaboration/PresenceAvatars';
import { ConnectionStatus } from './collaboration/ConnectionStatus';
import { InviteCollaboratorModal } from './modals/InviteCollaboratorModal';
import { ActiveSelectionIndicator } from './collaboration/ActiveSelectionIndicator';

const VisualizationCanvas = dynamic(
  () => import('@/components/VisualizationCanvas'),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> }
);

import MaterialModal from '@/components/modals/MaterialModal';
import FinishModal from '@/components/modals/FinishModal';
import ProfileModal from '@/components/modals/ProfileModal';
import type {
  Material,
  SurfaceFinish,
  EdgeProfile,
  OrderItem,
  ModalType,
  EditableItem,
  ProcessedEdges,
  ConstructionElement,
} from '@/types';
import { usePostHog } from 'posthog-js/react';

import { ExportModal } from '@/components/modals/ExportModal';
import { exportConfig, ExportFormat } from '@/lib/export/exportService';
import * as THREE from 'three';

// ... (Keep all the memoized sub-components like OrderEntryForm, etc. as they are) ...

export function Lab() {
  const posthog = usePostHog();
  const { toast } = useToast();
  const { setCadData } = useCadContext();
  const searchParams = useSearchParams();
  const configId = searchParams.get('configId');

  const { updatePresence } = useCollaboration(configId);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [finishes, setFinishes] = useState<SurfaceFinish[]>([]);
  const [profiles, setProfiles] = useState<EdgeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [projectNotes, setProjectNotes] = useState('');

  // ... (rest of the state and hooks from the original component)
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [announcement, setAnnouncement] = useState<string>('');
  const [showDimensions, setShowDimensions] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all data in parallel
        const [materialsData, finishesData, profilesData] = await Promise.all([
          fetchMaterials(),
          fetchSurfaceFinishes(),
          fetchEdgeProfiles(),
        ]);

        // Use fetched data if available, otherwise fallback to hardcoded data
        setMaterials(
          materialsData.length > 0 ? materialsData : initialMaterials
        );
        setFinishes(
          finishesData.length > 0 ? finishesData : initialSurfaceFinishes
        );
        setProfiles(
          profilesData.length > 0 ? profilesData : initialEdgeProfiles
        );
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load configuration data. Using default values.');
        // Fallback to hardcoded data on error
        setMaterials(initialMaterials);
        setFinishes(initialSurfaceFinishes);
        setProfiles(initialEdgeProfiles);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty deps array means run once on mount

  const config = useElementConfiguration(materials, finishes, profiles);
  const {
    selectedElement,
    length,
    setLength,
    width,
    setWidth,
    height,
    setHeight,
    quantity,
    setQuantity,
    specimenId,
    setSpecimenId,
    selectedMaterialId,
    setSelectedMaterialId,
    selectedFinishId,
    setSelectedFinishId,
    selectedProfileId,
    setSelectedProfileId,
    processedEdges,
    updateProcessedEdge,
    okapnikEdges,
    updateOkapnikEdge,
    bunjaEdgeStyle,
    setBunjaEdgeStyle,
    grainOffset,
    setGrainOffset,
    grainRotation,
    setGrainRotation,
    handleElementTypeChange,
  } = config;

  // Focus handlers for collaboration
  const handleFocus = (fieldName: string) => {
    if (configId) updatePresence({ selectedField: fieldName });
  };
  const handleBlur = () => {
    if (configId) updatePresence({ selectedField: undefined });
  };

  // ... (all other hooks and handlers from the original Lab component)
  const handleAddToOrder = () => {
    /* ... */
  };
  const handleDownloadPdf = () => {
    /* ... */
  };
  const handleRemoveOrderItem = (id: number) => {
    /* ... */
  };
  const handleCheckout = () => {
    /* ... */
  };
  const handleOpenModal = (type: ModalType, item?: EditableItem) => {
    /* ... */
  };
  const handleSaveItem = (item: EditableItem, type: ModalType) => {
    /* ... */
  };

  const handleExportAction = async (
    format: ExportFormat,
    filename: string,
    quality: 'draft' | 'standard' | 'high'
  ) => {
    // In a real application, you would get the actual mesh from the VisualizationCanvas.
    // Here we create a dummy mesh for demonstration purposes to satisfy the exportService signature.
    const geometry = new THREE.BoxGeometry(length, height, width);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const dummyMesh = new THREE.Mesh(geometry, material);

    try {
      const blob = await exportConfig(dummyMesh, format, filename);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: 'Export Successful',
        description: `File saved as ${filename}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'An error occurred during export.',
        variant: 'destructive',
      });
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      {loading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-center">Loading configuration data...</p>
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      <InviteCollaboratorModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        configId={configId}
      />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportAction}
      />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 xl:grid-cols-4">
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* All the form cards go here, wrapped with ActiveSelectionIndicator */}
          <Card>
            <CardHeader>
              <CardTitle>Konfiguracija</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActiveSelectionIndicator fieldName="length">
                <div className="space-y-2">
                  <Label htmlFor="length">Dužina (cm)</Label>
                  <Input
                    id="length"
                    type="number"
                    value={length}
                    onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                    onFocus={() => handleFocus('length')}
                    onBlur={handleBlur}
                  />
                </div>
              </ActiveSelectionIndicator>
              <ActiveSelectionIndicator fieldName="width">
                <div className="space-y-2">
                  <Label htmlFor="width">Širina (cm)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                    onFocus={() => handleFocus('width')}
                    onBlur={handleBlur}
                  />
                </div>
              </ActiveSelectionIndicator>
              <ActiveSelectionIndicator fieldName="height">
                <div className="space-y-2">
                  <Label htmlFor="height">Debljina (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                    onFocus={() => handleFocus('height')}
                    onBlur={handleBlur}
                  />
                </div>
              </ActiveSelectionIndicator>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 xl:col-span-3">
          <Card className="h-full min-h-[500px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle>3D Vizualizacija</CardTitle>
                {configId && <ConnectionStatus />}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExportModalOpen(true)}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export CAD
                </Button>
                {/* Material Library Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Implement material library modal
                    console.log('Material library button clicked');
                  }}
                >
                  <Layout className="h-4 w-4 mr-2" />
                  Materials
                </Button>
                {configId && <PresenceAvatars />}
                {configId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsInviteModalOpen(true)}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRefreshKey((k) => k + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="h-[600px]">
              <ErrorBoundary>
                <VisualizationCanvas
                  ref={canvasRef}
                  key={refreshKey}
                  dims={{ length, width, height }}
                  processedEdges={processedEdges}
                  okapnikEdges={okapnikEdges}
                  showDimensions={showDimensions}
                  // ... other props
                />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
