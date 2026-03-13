'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useDeferredValue,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { Loader2, RefreshCw, Ruler, FileDown } from 'lucide-react';

// UI Components
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

// Custom Lab Components
import { OrderForm } from './lab/OrderForm';
import { MaterialSelection } from './lab/MaterialSelection';
import { ProcessingConfig } from './lab/ProcessingConfig';
import { OrderSummary } from './lab/OrderSummary';
import { GrainAlignmentTool } from './GrainAlignmentTool';
import VisualizationCanvas, { type CanvasHandle } from './VisualizationCanvas';
import { ARPreview } from './ARPreview';
import { ErrorBoundary } from './ErrorBoundary';
import MaterialModal from './modals/MaterialModal';
import FinishModal from './modals/FinishModal';
import ProfileModal from './modals/ProfileModal';
import { TemplateManager } from './history/TemplateManager';
import { VersionHistoryDialog } from './history/VersionHistoryDialog';

// Hooks & Libs
import { useLabData } from '@/hooks/useLabData';
import { useElementConfiguration } from '@/hooks/useElementConfiguration';
import { useOrderCalculations } from '@/hooks/useOrderCalculations';
import { useDesignAnalysis } from '@/hooks/useDesignAnalysis';
import { useHistory } from '@/hooks/useHistory';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useCadContext } from '@/contexts/CadContext';
import { generateTechnicalDrawing } from '@/ai/flows/imageGenerationFlow';
import type {
  OrderItem,
  Material,
  SurfaceFinish,
  EdgeProfile,
  ModalType,
  EditableItem,
  ProjectVersion,
  ProjectTemplate,
} from '@/types';

export function Lab() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const { setCadData } = useCadContext();

  // 1. Data Loading
  const {
    materials,
    setMaterials,
    finishes,
    setFinishes,
    profiles,
    setProfiles,
    isLoading: isLoadingData,
  } = useLabData();

  // 2. State & Store Integration
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [projectNotes, setProjectNotes] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDimensions, setShowDimensions] = useState(false);
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [announcement] = useState('');

  const canvasRef = useRef<CanvasHandle>(null);

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
    grainRotation,
    handleElementTypeChange,
  } = config;

  // 3. Persistence & Shared Projects
  const {
    versions,
    templates,
    isLoading: isLoadingHistory,
    saveVersion,
    deleteVersion,
    saveTemplate,
    deleteTemplate,
    shareProject,
    fetchSharedProject,
  } = useHistory();

  const openVersion = useCallback(
    (v: ProjectVersion) => {
      setOrderItems(v.items);
      toast({
        title: 'Verzija učitana',
        description: `Učitana je verzija: ${v.name}`,
      });
    },
    [toast]
  );

  const openTemplate = useCallback(
    (t: ProjectTemplate) => {
      setOrderItems(t.items);
      toast({
        title: 'Predložak učitan',
        description: `Učitan je predložak: ${t.name}`,
      });
    },
    [toast]
  );

  useEffect(() => {
    const versionId = searchParams.get('version');
    const templateId = searchParams.get('template');
    const sharedToken = searchParams.get('share');

    if (versionId) {
      const version = versions.find((v) => v.id === versionId);
      if (version) {
        openVersion(version);
      }
    } else if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        openTemplate(template);
      }
    } else if (sharedToken) {
      (async () => {
        try {
          const project = await fetchSharedProject(sharedToken);
          if (project) {
            setOrderItems(project.items);
            if (project.notes) setProjectNotes(project.notes);
            toast({
              title: 'Dijeljeni projekt učitan',
              description: `Učitan projekt: ${project.name}`,
            });
          }
        } catch (err) {
          console.error('Failed to load shared project:', err);
        }
      })();
    }
  }, [
    searchParams,
    versions,
    templates,
    fetchSharedProject,
    toast,
    openVersion,
    openTemplate,
  ]);

  // 4. Calculations & Analysis
  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === selectedMaterialId),
    [materials, selectedMaterialId]
  );
  const selectedFinish = useMemo(
    () => finishes.find((f) => f.id === selectedFinishId),
    [finishes, selectedFinishId]
  );
  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId),
    [profiles, selectedProfileId]
  );

  const setMaterial = useCallback(
    (m: Material) => {
      setSelectedMaterialId(m.id);
    },
    [setSelectedMaterialId]
  );

  const setFinish = useCallback(
    (f: SurfaceFinish) => {
      setSelectedFinishId(f.id);
    },
    [setSelectedFinishId]
  );

  const setProfile = useCallback(
    (p: EdgeProfile) => {
      setSelectedProfileId(p.id);
    },
    [setSelectedProfileId]
  );

  const calculations = useOrderCalculations({
    length,
    width,
    height,
    selectedMaterial,
    selectedFinish,
    selectedProfile,
    processedEdges,
    okapnikEdges,
    selectedElement,
    quantity,
    bunjaEdgeStyle,
  });

  const { warnings } = useDesignAnalysis(
    length,
    width,
    height,
    selectedMaterial,
    selectedElement
  );

  // Sync CAD Context
  useEffect(() => {
    setCadData({
      currentItems: orderItems,
      selectedMaterial,
      selectedFinish,
      selectedProfile,
      activeDimensions: { length, width, height },
      safetyWarnings: warnings,
    });
  }, [
    orderItems,
    selectedMaterial,
    selectedFinish,
    selectedProfile,
    length,
    width,
    height,
    warnings,
    setCadData,
  ]);

  // 5. Voice & Collaboration
  const { updatePresence } = useCollaboration('main-lab-config');

  const handleFocus = useCallback(
    (fieldName: string) => {
      updatePresence({ selectedField: fieldName });
    },
    [updatePresence]
  );

  const handleBlur = useCallback(() => {
    updatePresence({ selectedField: undefined });
  }, [updatePresence]);

  const handleAddToOrder = useCallback(async () => {
    if (
      !selectedMaterial ||
      !selectedFinish ||
      !selectedProfile ||
      !specimenId ||
      !selectedElement
    ) {
      toast({
        title: 'Greška',
        description: 'Molimo popunite sva polja.',
        variant: 'destructive',
      });
      return;
    }

    posthog?.capture('add_to_order_started', {
      item_type: selectedElement.name,
      material: selectedMaterial.name,
      total_cost: calculations.totalCost,
    });

    setIsAddingItem(true);
    try {
      const edgeNamesShort = {
        front: 'Prednja',
        back: 'Zadnja',
        left: 'Lijeva',
        right: 'Desna',
      };
      const processedEdgesNames = Object.entries(processedEdges)
        .filter(([, selected]) => selected)
        .map(([edge]) => edgeNamesShort[edge as keyof typeof edgeNamesShort]);

      const okapnikEdgesNames = Object.entries(okapnikEdges)
        .filter(([, selected]) => selected)
        .map(([edge]) => edgeNamesShort[edge as keyof typeof edgeNamesShort]);

      const drawingResponse = await generateTechnicalDrawing({
        length,
        width,
        profileName: selectedProfile.name,
        surfaceFinishName: selectedFinish.name,
        processedEdges: processedEdgesNames,
        okapnikEdges: okapnikEdgesNames,
        isBunja: !!selectedElement.hasSpecialBunjaEdges,
        bunjaEdgeStyle: selectedElement.hasSpecialBunjaEdges
          ? bunjaEdgeStyle
          : undefined,
      });

      const newOrderItem: OrderItem = {
        orderId: Date.now(),
        id: specimenId,
        dims: { length, width, height },
        material: selectedMaterial,
        finish: selectedFinish,
        profile: selectedProfile,
        processedEdges,
        okapnikEdges,
        totalCost: calculations.totalCost,
        planSnapshotDataUri: drawingResponse.imageDataUri,
        planSnapshotUrl: drawingResponse.imageUrl,
        orderUnit: selectedElement.orderUnit,
        quantity,
        bunjaEdgeStyle: selectedElement.hasSpecialBunjaEdges
          ? bunjaEdgeStyle
          : undefined,
        textureOffset: { ...grainOffset },
      };

      setOrderItems((prev) => [...prev, newOrderItem]);
      toast({
        title: 'Stavka dodana',
        description: `${selectedElement.name} uspješno dodan.`,
      });

      posthog?.capture('add_to_order_completed', {
        item_id: specimenId,
        value: calculations.totalCost,
        currency: 'EUR',
      });

      // Increment Specimen ID
      const parts = specimenId.split(' ');
      const lastPart = parts.pop() || '00';
      const num = parseInt(lastPart);
      setSpecimenId(
        `${parts.join(' ')} ${(num + 1).toString().padStart(2, '0')}`
      );
    } catch (error) {
      toast({
        title: 'Greška',
        description:
          error instanceof Error ? error.message : 'AI nalog greška.',
        variant: 'destructive',
      });
    } finally {
      setIsAddingItem(false);
    }
  }, [
    selectedMaterial,
    selectedFinish,
    selectedProfile,
    specimenId,
    selectedElement,
    length,
    width,
    height,
    processedEdges,
    okapnikEdges,
    bunjaEdgeStyle,
    calculations.totalCost,
    quantity,
    grainOffset,
    toast,
    posthog,
    setSpecimenId,
  ]);

  const handleDownloadPdf = useCallback(async () => {
    if (orderItems.length === 0) return;
    try {
      const currentImage = canvasRef.current?.captureImage();
      const images3D = orderItems.map(
        (item) => item.planSnapshotDataUri || currentImage || null
      );
      const { generateEnhancedPdf } = await import('@/lib/pdf-enhanced');

      await generateEnhancedPdf(
        orderItems,
        { front: 'Prednja', back: 'Zadnja', left: 'Lijeva', right: 'Desna' },
        images3D,
        {
          companyName: 'Kamena Galanterija',
          orderNumber: `RN-${Date.now()}`,
          notes: projectNotes,
        }
      );
      toast({ title: 'PDF generiran' });
    } catch {
      toast({ title: 'Greška', variant: 'destructive' });
    }
  }, [orderItems, projectNotes, toast]);

  const { isListening, startListening, stopListening, transcript } =
    useVoiceCommands({
      setLength,
      setWidth,
      setHeight,
      addToOrder: handleAddToOrder,
      downloadPdf: handleDownloadPdf,
      reset: () => setOrderItems([]),
    });

  const handleOpenModal = useCallback(
    (type: ModalType, item?: EditableItem) => {
      setEditingItem(item || null);
      setModalOpen(type);
    },
    []
  );

  const handleSaveItem = useCallback(
    (item: EditableItem, type: ModalType) => {
      if (type === 'material')
        setMaterials((prev) =>
          prev.some((m) => m.id === item.id)
            ? prev.map((m) => (m.id === item.id ? (item as Material) : m))
            : [...prev, item as Material]
        );
      if (type === 'finish')
        setFinishes((prev) =>
          prev.some((f) => f.id === item.id)
            ? prev.map((f) => (f.id === item.id ? (item as SurfaceFinish) : f))
            : [...prev, item as SurfaceFinish]
        );
      if (type === 'profile')
        setProfiles((prev) =>
          prev.some((p) => p.id === item.id)
            ? prev.map((p) => (p.id === item.id ? (item as EdgeProfile) : p))
            : [...prev, item as EdgeProfile]
        );
      setModalOpen(null);
    },
    [setMaterials, setFinishes, setProfiles]
  );

  const handleCheckout = useCallback(async () => {
    if (orderItems.length === 0) return;
    setIsCheckingOut(true);
    try {
      const resp = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems }),
      });
      const { url } = await resp.json();
      if (url) window.location.href = url;
    } finally {
      setIsCheckingOut(false);
    }
  }, [orderItems]);

  const deferredVisualizationState = useDeferredValue(
    useMemo(
      () => ({
        dims: { length, width, height },
        material: selectedMaterial,
        finish: selectedFinish,
        profile: selectedProfile,
        processedEdges,
        okapnikEdges,
        grainOffset,
        grainRotation,
        mirrorGrain: config.mirrorGrain,
        showBookmatchPreview: config.showBookmatchPreview,
      }),
      [
        length,
        width,
        height,
        selectedMaterial,
        selectedFinish,
        selectedProfile,
        processedEdges,
        okapnikEdges,
        grainOffset,
        grainRotation,
        config.mirrorGrain,
        config.showBookmatchPreview,
      ]
    )
  );

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Učitavanje podataka...</span>
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8 pb-safe px-safe">
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 xl:grid-cols-4">
        {/* Sidebar */}
        <div className="flex flex-col gap-6 lg:col-span-1 xl:col-span-1 lg:order-1 order-2">
          <OrderForm
            selectedElement={selectedElement}
            handleElementTypeChange={handleElementTypeChange}
            length={length}
            setLength={setLength}
            width={width}
            setWidth={setWidth}
            height={height}
            setHeight={setHeight}
            quantity={quantity}
            setQuantity={setQuantity}
            specimenId={specimenId}
            setSpecimenId={setSpecimenId}
            isListening={isListening}
            startListening={startListening}
            stopListening={stopListening}
            transcript={transcript}
            handleFocus={handleFocus}
            handleBlur={handleBlur}
          />
          <MaterialSelection
            materials={materials}
            selectedMaterialId={selectedMaterialId?.toString() || ''}
            setSelectedMaterialId={(id) => setSelectedMaterialId(parseInt(id))}
            handleOpenModal={handleOpenModal}
            handleFocus={handleFocus}
            handleBlur={handleBlur}
          />
          <ProcessingConfig
            selectedElement={selectedElement}
            selectedFinishId={selectedFinishId?.toString() || ''}
            setSelectedFinishId={(id) => setSelectedFinishId(parseInt(id))}
            handleOpenModal={handleOpenModal}
            finishes={finishes}
            selectedProfileId={selectedProfileId?.toString() || ''}
            setSelectedProfileId={(id) => setSelectedProfileId(parseInt(id))}
            profiles={profiles}
            bunjaEdgeStyle={bunjaEdgeStyle}
            setBunjaEdgeStyle={setBunjaEdgeStyle}
            edgeNames={{
              front: 'Prednja',
              back: 'Zadnja',
              left: 'Lijeva',
              right: 'Desna',
            }}
            processedEdges={processedEdges}
            updateProcessedEdge={updateProcessedEdge}
            okapnikEdges={okapnikEdges}
            updateOkapnikEdge={updateOkapnikEdge}
            handleFocus={handleFocus}
            handleBlur={handleBlur}
          />
          <GrainAlignmentTool />
          <OrderSummary
            calculations={calculations}
            orderItems={orderItems}
            edgeNames={{
              front: 'Prednja',
              back: 'Zadnja',
              left: 'Lijeva',
              right: 'Desna',
            }}
            handleRemoveOrderItem={(id) =>
              setOrderItems((p) => p.filter((i) => i.orderId !== id))
            }
            onCheckout={handleCheckout}
            isCheckoutDisabled={isCheckingOut || orderItems.length === 0}
          />

          {/* Warnings */}
          {warnings.length > 0 && (
            <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader className="py-2">
                <CardTitle className="text-sm">Sigurnosna upozorenja</CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className="text-xs p-2 rounded border border-orange-500 bg-orange-100 text-orange-700"
                  >
                    <p className="font-bold">{w.message}</p>
                    <p className="mt-1">{w.suggestion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Canvas Area */}
        <div className="lg:col-span-2 xl:col-span-3 lg:order-2 order-1">
          <Card className="h-full min-h-[500px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>3D Vizualizacija</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant={showDimensions ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setShowDimensions(!showDimensions)}
                >
                  <Ruler className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRefreshKey((k) => k + 1)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="h-full pb-0 flex flex-col">
              <div className="flex-1 min-h-[400px]">
                <ErrorBoundary>
                  <VisualizationCanvas
                    ref={canvasRef}
                    key={refreshKey}
                    {...deferredVisualizationState}
                    showDimensions={showDimensions}
                  />
                </ErrorBoundary>
              </div>
              <div className="py-4 border-t mt-auto">
                <ARPreview config={deferredVisualizationState} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & History */}
        <div className="lg:col-span-3 xl:col-span-4 lg:order-3 order-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upravljanje nalogom</CardTitle>
              <div className="flex gap-2">
                <TemplateManager
                  templates={templates}
                  currentItems={orderItems}
                  onSave={saveTemplate}
                  onLoad={setOrderItems}
                  onDelete={deleteTemplate}
                  onMaterialSelect={(m: Material) => {
                    setMaterial(m);
                    setModalOpen(null);
                  }}
                  onFinishSelect={(f: SurfaceFinish) => {
                    setFinish(f);
                    setModalOpen(null);
                  }}
                  onProfileSelect={(p: EdgeProfile) => {
                    setProfile(p);
                    setModalOpen(null);
                  }}
                  onShare={shareProject}
                />
                <VersionHistoryDialog
                  versions={versions}
                  currentItems={orderItems}
                  onRestore={setOrderItems}
                  onDelete={deleteVersion}
                  onShare={shareProject}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row">
                <Button
                  onClick={handleAddToOrder}
                  className="flex-1 h-12"
                  disabled={isAddingItem}
                >
                  {isAddingItem ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Spremi stavku u nalog'
                  )}
                </Button>
                <Button
                  onClick={handleDownloadPdf}
                  variant="outline"
                  className="flex-1 h-12"
                  disabled={orderItems.length === 0}
                >
                  <FileDown className="mr-2 h-4 w-4" /> Preuzmi PDF
                </Button>
                <Button
                  onClick={() =>
                    saveVersion(
                      `Nalog ${new Date().toLocaleTimeString()}`,
                      orderItems
                    )
                  }
                  variant="ghost"
                  className="flex-1 h-12 border-dashed border-2"
                  disabled={orderItems.length === 0 || isLoadingHistory}
                >
                  Spremi verziju
                </Button>
              </div>
              <Separator className="my-6" />
              <div className="space-y-2">
                <Label htmlFor="lab-notes">Napomene uz cijeli nalog</Label>
                <Textarea
                  id="lab-notes"
                  placeholder="Unesite napomene..."
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <MaterialModal
        isOpen={modalOpen === 'material'}
        onClose={() => setModalOpen(null)}
        onSave={(item) => handleSaveItem(item, 'material')}
        item={editingItem as Material}
      />
      <FinishModal
        isOpen={modalOpen === 'finish'}
        onClose={() => setModalOpen(null)}
        onSave={(item) => handleSaveItem(item, 'finish')}
        item={editingItem as SurfaceFinish}
      />
      <ProfileModal
        isOpen={modalOpen === 'profile'}
        onClose={() => setModalOpen(null)}
        onSave={(item) => handleSaveItem(item, 'profile')}
        item={editingItem as EdgeProfile}
      />
    </main>
  );
}
