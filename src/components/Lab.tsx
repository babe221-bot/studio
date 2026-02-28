"use client";

import React, { useState, useMemo, useEffect, useRef, useDeferredValue, useCallback } from 'react';
// import { generateEnhancedPdf } from '@/lib/pdf-enhanced'; // Moved to dynamic import
import type { CanvasHandle } from '@/components/VisualizationCanvas';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { initialMaterials, initialSurfaceFinishes, initialEdgeProfiles } from '@/lib/data';
import { constructionElements } from '@/lib/constructionElements';
import dynamic from 'next/dynamic';

const VisualizationCanvas = dynamic(
  () => import('@/components/VisualizationCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex flex-col gap-4 p-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="flex-1 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    ),
  }
);

import MaterialModal from '@/components/modals/MaterialModal';
import FinishModal from '@/components/modals/FinishModal';
import ProfileModal from '@/components/modals/ProfileModal';
import type { Material, SurfaceFinish, EdgeProfile, OrderItem, ModalType, EditableItem, ProcessedEdges, ConstructionElement } from '@/types';
import { PlusIcon, Trash2, RefreshCw, FileDown, Loader2, Eye, Ruler } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { generateAndDownloadPdf } from '@/lib/pdf';
import { generateTechnicalDrawing } from '@/ai/flows/imageGenerationFlow';
import { ErrorBoundary } from './ErrorBoundary';
import { useOrderCalculations } from '@/hooks/useOrderCalculations';
import { useElementConfiguration } from '@/hooks/useElementConfiguration';
import { useProjectHistory } from '@/hooks/useProjectHistory';
import { VersionHistoryDialog } from './history/VersionHistoryDialog';
import { TemplateManager } from './history/TemplateManager';

// Memoized Sub-components
const OrderEntryForm = React.memo(({
  constructionElements, specimenId, setSpecimenId,
  length, setLength, width, setWidth, height, setHeight,
  quantity, setQuantity, selectedElement, handleElementTypeChange
}: any) => {
  const renderQuantityInput = () => {
    if (!selectedElement) return null;
    let label = '';
    switch (selectedElement.orderUnit) {
      case 'piece': label = 'Broj komada'; break;
      case 'sqm': label = 'Količina (m²)'; break;
      case 'lm': label = 'Količina (m)'; break;
    }
    return (
      <div className="space-y-2 pt-2">
        <Label htmlFor="quantity">{label}</Label>
        <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(parseFloat(e.target.value) || 0)} min="1" />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader><CardTitle>1. Unos naloga</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="element-type-select">Tip elementa</Label>
          <Select onValueChange={handleElementTypeChange} defaultValue={constructionElements[0].id}>
            <SelectTrigger id="element-type-select">
              <SelectValue placeholder="Odaberite tip elementa" />
            </SelectTrigger>
            <SelectContent>
              {constructionElements.map((el: any) => (
                <SelectItem key={el.id} value={el.id}>{el.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="specimen-id">ID / Naziv komada</Label>
          <Input id="specimen-id" value={specimenId} onChange={e => setSpecimenId(e.target.value)} placeholder="npr. Kuhinjska ploča K01" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="length">Dužina (cm)</Label>
            <Input id="length" type="number" value={length} onChange={e => setLength(parseFloat(e.target.value) || 0)} disabled={selectedElement?.hasSpecialBunjaEdges} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="width">Širina (cm)</Label>
            <Input id="width" type="number" value={width} onChange={e => setWidth(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Debljina (cm)</Label>
            <Input id="height" type="number" value={height} onChange={e => setHeight(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        {renderQuantityInput()}
      </CardContent>
    </Card>
  );
});

const MaterialSelection = React.memo(({
  materials, selectedMaterialId, setSelectedMaterialId, handleOpenModal
}: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>2. Odabir materijala</CardTitle>
      <Button variant="ghost" size="icon" onClick={() => handleOpenModal('material')} aria-label="Dodaj novi materijal">
        <PlusIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
    </CardHeader>
    <CardContent>
      <Label htmlFor="material-select">Vrsta kamena</Label>
      <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
        <SelectTrigger id="material-select"><SelectValue placeholder="Odaberite materijal" /></SelectTrigger>
        <SelectContent>
          {materials.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </CardContent>
  </Card>
));

const ProcessingConfig = React.memo(({
  selectedElement, selectedFinishId, setSelectedFinishId, handleOpenModal,
  finishes, bunjaEdgeStyle, setBunjaEdgeStyle, profiles, selectedProfileId, setSelectedProfileId,
  edgeNames, processedEdges, updateProcessedEdge, okapnikEdges, updateOkapnikEdge
}: any) => (
  <Card>
    <CardHeader><CardTitle>3. Definiranje obrade</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="surface-finish-select">Obrada lica</Label>
        <div className="flex items-center gap-2">
          <Select value={selectedFinishId} onValueChange={setSelectedFinishId}>
            <SelectTrigger id="surface-finish-select" aria-label="Odaberite obradu lica"><SelectValue placeholder="Odaberite obradu" /></SelectTrigger>
            <SelectContent>
              {finishes.map((f: any) => <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => handleOpenModal('finish')} aria-label="Dodaj novu obradu lica">
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {selectedElement?.hasSpecialBunjaEdges ? (
        <div className="space-y-3 pt-2">
          <Label className="text-base">Obrada ivica bunje</Label>
          <RadioGroup defaultValue="lomljene" value={bunjaEdgeStyle} onValueChange={(value) => setBunjaEdgeStyle(value as 'oštre' | 'lomljene')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lomljene" id="r-lomljene" />
              <Label htmlFor="r-lomljene" className="cursor-pointer">Lomljene ivice</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="oštre" id="r-ostre" />
              <Label htmlFor="r-ostre" className="cursor-pointer">Oštre ivice (pilano)</Label>
            </div>
          </RadioGroup>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Profil i obrada ivica</Label>
            <div className="flex items-center gap-2">
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger id="edge-profile-select" aria-label="Odaberite profil ivice"><SelectValue placeholder="Odaberite profil" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => handleOpenModal('profile')} aria-label="Dodaj novi profil ivice">
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Label className="text-sm">Primijeni obradu na ivicama:</Label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 text-sm">
              {Object.keys(edgeNames).map((edge) => (
                <div className="flex items-center space-x-2" key={edge}>
                  <Checkbox
                    id={`edge-${edge}`}
                    checked={processedEdges[edge as keyof ProcessedEdges]}
                    onCheckedChange={(checked) => updateProcessedEdge(edge as keyof ProcessedEdges, !!checked)}
                  />
                  <Label htmlFor={`edge-${edge}`} className="font-normal cursor-pointer">{edgeNames[edge as keyof typeof edgeNames]}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Label className="text-sm">Dodaj okapnik na ivicama:</Label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 text-sm">
              {Object.keys(edgeNames).map((edge) => (
                <div className="flex items-center space-x-2" key={`okapnik-${edge}`}>
                  <Checkbox
                    id={`okapnik-${edge}`}
                    checked={okapnikEdges[edge as keyof ProcessedEdges]}
                    onCheckedChange={(checked) => updateOkapnikEdge(edge as keyof ProcessedEdges, !!checked)}
                    disabled={!processedEdges[edge as keyof ProcessedEdges]}
                  />
                  <Label htmlFor={`okapnik-${edge}`} className={`font-normal cursor-pointer ${!processedEdges[edge as keyof ProcessedEdges] ? 'text-muted-foreground' : ''}`}>{edgeNames[edge as keyof typeof edgeNames]}</Label>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </CardContent>
  </Card>
));

const CalculationSummary = React.memo(({ calculations }: any) => (
  <Card>
    <CardHeader><CardTitle>4. Kalkulacija</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Površina</span>
        <span className="font-medium font-code">{calculations.surfaceArea.toFixed(2)} m²</span>
      </div>
      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Težina</span><span className="font-medium font-code">{calculations.weight.toFixed(1)} kg</span></div>
      <Separator />
      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trošak materijala</span><span className="font-medium font-code">€{calculations.materialCost.toFixed(2)}</span></div>
      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trošak obrade</span><span className="font-medium font-code">€{calculations.processingCost.toFixed(2)}</span></div>
      {calculations.okapnikCost > 0 && (
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trošak okapnika</span><span className="font-medium font-code">€{calculations.okapnikCost.toFixed(2)}</span></div>
      )}
      <Separator />
      <div className="flex justify-between text-lg font-bold text-primary"><span>Ukupni trošak</span><span>€{calculations.totalCost.toFixed(2)}</span></div>
    </CardContent>
  </Card>
));

const OrderList = React.memo(({ orderItems, edgeNames, handleRemoveOrderItem }: any) => (
  <ScrollArea className="h-64">
    <div className="space-y-3 pr-4">
      {orderItems.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nema stavkih u nalogu.</p>
      ) : (
        orderItems.map((item: any) => {
          let quantityString = '';
          switch (item.orderUnit) {
            case 'piece': quantityString = `${item.quantity} kom`; break;
            case 'sqm': quantityString = `${item.quantity.toFixed(2)} m²`; break;
            case 'lm': quantityString = `${item.quantity.toFixed(2)} m`; break;
          }

          let description = `${item.material.name} | ${item.finish.name}`;
          if (item.orderUnit !== 'sqm' && item.orderUnit !== 'lm') {
            description += ` | ${item.profile.name}`;
          }

          return (
            <div key={item.orderId} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex-1">
                <p className="font-semibold">{item.id} <span className="text-sm font-normal text-muted-foreground">({quantityString})</span></p>
                <p className="text-xs text-muted-foreground">{description}</p>
                {item.bunjaEdgeStyle ? (
                  <p className="text-xs text-muted-foreground">Obrada ivica: {item.bunjaEdgeStyle === 'lomljene' ? 'Lomljene' : 'Oštre'}</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Obrađene ivice: {(Object.entries(item.processedEdges)
                      .filter(([, selected]) => selected)
                      .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
                      .join(', ') || 'Nijedna')}</p>
                    <p className="text-xs text-muted-foreground">Okapnik: {(Object.entries(item.okapnikEdges || {})
                      .filter(([, selected]) => selected)
                      .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
                      .join(', ') || 'Nema')}</p>
                  </>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold">€{item.totalCost.toFixed(2)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={() => handleRemoveOrderItem(item.orderId)}
                aria-label={`Ukloni stavku ${item.id} iz radnog naloga`}
              >
                <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
              </Button>
            </div>
          )
        })
      )}
    </div>
  </ScrollArea>
));

export function Lab() {
  const { toast } = useToast();

  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [finishes, setFinishes] = useState<SurfaceFinish[]>(initialSurfaceFinishes);
  const [profiles, setProfiles] = useState<EdgeProfile[]>(initialEdgeProfiles);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const {
    versions, templates, saveVersion, saveTemplate, deleteVersion, deleteTemplate,
  } = useProjectHistory();

  const config = useElementConfiguration();
  const {
    selectedElement, length, setLength, width, setWidth, height, setHeight,
    quantity, setQuantity, specimenId, setSpecimenId,
    selectedMaterialId, setSelectedMaterialId,
    selectedFinishId, setSelectedFinishId,
    selectedProfileId, setSelectedProfileId,
    processedEdges, updateProcessedEdge,
    okapnikEdges, updateOkapnikEdge,
    bunjaEdgeStyle, setBunjaEdgeStyle,
    handleElementTypeChange
  } = config;

  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [announcement, setAnnouncement] = useState<string>('');
  const [showDimensions, setShowDimensions] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

  const selectedMaterial = useMemo(() => materials.find(m => m.id.toString() === selectedMaterialId), [materials, selectedMaterialId]);
  const selectedFinish = useMemo(() => finishes.find(f => f.id.toString() === selectedFinishId), [finishes, selectedFinishId]);
  const selectedProfile = useMemo(() => profiles.find(p => p.id.toString() === selectedProfileId), [profiles, selectedProfileId]);

  const calculations = useOrderCalculations({
    length, width, height,
    selectedMaterial, selectedFinish, selectedProfile,
    processedEdges, okapnikEdges,
    selectedElement, quantity, bunjaEdgeStyle
  });

  const deferredVisualizationState = useDeferredValue(useMemo(() => ({
    dims: { length, width, height },
    material: selectedMaterial,
    finish: selectedFinish,
    profile: selectedProfile,
    processedEdges: processedEdges,
    okapnikEdges: okapnikEdges,
  }), [length, width, height, selectedMaterial, selectedFinish, selectedProfile, processedEdges, okapnikEdges]));

  useEffect(() => {
    if (calculations.totalCost > 0) {
      const parts = [
        `Kalkulacija ažurirana. Ukupni trošak: ${calculations.totalCost.toFixed(2)} eura. `,
        `Površina: ${calculations.surfaceArea.toFixed(2)} m². Težina: ${calculations.weight.toFixed(1)} kg.`
      ];
      setAnnouncement(parts.join(''));
    }
  }, [calculations.totalCost, calculations.surfaceArea, calculations.weight]);

  const edgeNames = useMemo(() => ({
    front: 'Prednja', back: 'Zadnja', left: 'Lijeva', right: 'Desna'
  }), []);

  const handleAddToOrder = useCallback(async () => {
    if (!selectedMaterial || !selectedFinish || !selectedProfile || !specimenId || !selectedElement) {
      toast({ title: "Greška", description: "Molimo popunite sva polja.", variant: "destructive" });
      return;
    }

    setIsAddingItem(true);
    try {
      const processedEdgesNames = (Object.entries(processedEdges)
        .filter(([, selected]) => selected)
        .map(([edge]) => edgeNames[edge as keyof typeof edgeNames]));

      const okapnikEdgesNames = (Object.entries(okapnikEdges)
        .filter(([, selected]) => selected)
        .map(([edge]) => edgeNames[edge as keyof typeof edgeNames]));

      let drawingResponse;
      let retries = 0;
      const MAX_RETRIES = 2;

      while (retries <= MAX_RETRIES) {
        try {
          drawingResponse = await generateTechnicalDrawing({
            length, width, profileName: selectedProfile.name,
            surfaceFinishName: selectedFinish.name,
            processedEdges: processedEdgesNames,
            okapnikEdges: okapnikEdgesNames,
            isBunja: !!selectedElement.hasSpecialBunjaEdges,
            bunjaEdgeStyle: selectedElement.hasSpecialBunjaEdges ? bunjaEdgeStyle : undefined,
          });
          if (drawingResponse.imageDataUri) break;
        } catch (err) { console.error(`Attempt ${retries + 1} failed:`, err); }
        retries++;
        if (retries <= MAX_RETRIES) await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }

      if (!drawingResponse?.imageDataUri) throw new Error("AI nije uspio generirati sliku.");

      const newOrderItem: OrderItem = {
        orderId: Date.now(),
        id: specimenId,
        dims: { length, width, height },
        material: selectedMaterial,
        finish: selectedFinish,
        profile: selectedProfile,
        processedEdges: processedEdges,
        okapnikEdges: okapnikEdges,
        totalCost: calculations.totalCost,
        planSnapshotDataUri: drawingResponse.imageDataUri,
        planSnapshotUrl: drawingResponse.imageUrl,
        orderUnit: selectedElement.orderUnit,
        quantity: quantity,
        bunjaEdgeStyle: selectedElement.hasSpecialBunjaEdges ? bunjaEdgeStyle : undefined,
      };
      setOrderItems(prev => [...prev, newOrderItem]);
      toast({ title: "Stavka dodana", description: `${selectedElement.name} uspješno dodan.` });

      const currentNumber = parseInt(specimenId.split(' ').pop() || '0');
      setSpecimenId(`${selectedElement.name} ${(currentNumber + 1).toString().padStart(2, '0')}`);
    } catch (error) {
      toast({ title: "Greška", description: error instanceof Error ? error.message : "Greška.", variant: "destructive" });
    } finally { setIsAddingItem(false); }
  }, [selectedMaterial, selectedFinish, selectedProfile, specimenId, selectedElement, length, width, height, processedEdges, okapnikEdges, bunjaEdgeStyle, calculations.totalCost, quantity, edgeNames, toast, setSpecimenId]);

  const handleDownloadPdf = useCallback(async () => {
    if (orderItems.length === 0) return;
    try {
      const currentImage = canvasRef.current?.captureImage();
      const images3D = orderItems.map(item => item.planSnapshotDataUri || currentImage || null);

      const { generateEnhancedPdf } = await import('@/lib/pdf-enhanced');

      await generateEnhancedPdf(orderItems, edgeNames, images3D, {
        companyName: 'Kamena Galanterija',
        orderNumber: `RN-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`,
      });
      toast({ title: "PDF generiran", description: "Radni nalog je uspješno preuzet." });
    } catch (error) { toast({ title: "Greška", description: "Greška pri generiranju PDF-a.", variant: "destructive" }); }
  }, [orderItems, edgeNames, toast]);

  const handleRemoveOrderItem = useCallback((orderId: number) => {
    setOrderItems(prev => prev.filter(item => item.orderId !== orderId));
  }, []);

  const handleOpenModal = useCallback((type: ModalType, item?: EditableItem) => {
    setEditingItem(item || null);
    setModalOpen(type);
  }, []);

  const handleSaveItem = useCallback((item: EditableItem, type: ModalType) => {
    if (type === 'material') setMaterials(prev => {
      const idx = prev.findIndex(m => m.id === item.id);
      return idx > -1 ? [...prev.slice(0, idx), item as Material, ...prev.slice(idx + 1)] : [...prev, { ...item, id: Date.now() } as Material];
    });
    else if (type === 'finish') setFinishes(prev => {
      const idx = prev.findIndex(f => f.id === item.id);
      return idx > -1 ? [...prev.slice(0, idx), item as SurfaceFinish, ...prev.slice(idx + 1)] : [...prev, { ...item, id: Date.now() } as SurfaceFinish];
    });
    else if (type === 'profile') setProfiles(prev => {
      const idx = prev.findIndex(p => p.id === item.id);
      return idx > -1 ? [...prev.slice(0, idx), item as EdgeProfile, ...prev.slice(idx + 1)] : [...prev, { ...item, id: Date.now() } as EdgeProfile];
    });
    setModalOpen(null);
    toast({ title: "Spremljeno" });
  }, [toast]);

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8 pb-safe px-safe">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 xl:grid-cols-4">
        <div className="flex flex-col gap-6 lg:col-span-1 xl:col-span-1 lg:order-1 order-2">
          <OrderEntryForm
            constructionElements={constructionElements} specimenId={specimenId} setSpecimenId={setSpecimenId}
            length={length} setLength={setLength} width={width} setWidth={setWidth} height={height} setHeight={setHeight}
            quantity={quantity} setQuantity={setQuantity} selectedElement={selectedElement} handleElementTypeChange={handleElementTypeChange}
          />
          <MaterialSelection
            materials={materials} selectedMaterialId={selectedMaterialId} setSelectedMaterialId={setSelectedMaterialId} handleOpenModal={handleOpenModal}
          />
          <ProcessingConfig
            selectedElement={selectedElement} selectedFinishId={selectedFinishId} setSelectedFinishId={setSelectedFinishId}
            handleOpenModal={handleOpenModal} finishes={finishes} bunjaEdgeStyle={bunjaEdgeStyle} setBunjaEdgeStyle={setBunjaEdgeStyle}
            profiles={profiles} selectedProfileId={selectedProfileId} setSelectedProfileId={setSelectedProfileId}
            edgeNames={edgeNames} processedEdges={processedEdges} updateProcessedEdge={updateProcessedEdge}
            okapnikEdges={okapnikEdges} updateOkapnikEdge={updateOkapnikEdge}
          />
          <CalculationSummary calculations={calculations} />
        </div>

        <div className="lg:col-span-2 xl:col-span-3 lg:order-2 order-1">
          <Card className="h-full min-h-[400px] md:min-h-[500px] lg:min-h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>3D Vizualizacija</CardTitle>
              <div className="flex gap-1">
                <Button variant={showDimensions ? "secondary" : "ghost"} size="icon" onClick={() => setShowDimensions(!showDimensions)} aria-label="Dimenzije"><Ruler className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setRefreshKey(k => k + 1)} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="h-full pb-0">
              <ErrorBoundary>
                <VisualizationCanvas ref={canvasRef} key={refreshKey} {...deferredVisualizationState} showDimensions={showDimensions} />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 xl:col-span-4 lg:order-3 order-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>5. Radni nalog</CardTitle>
              <div className="flex gap-2">
                <TemplateManager templates={templates} currentItems={orderItems} onSave={saveTemplate} onLoad={setOrderItems} onDelete={deleteTemplate} />
                <VersionHistoryDialog versions={versions} currentItems={orderItems} onRestore={setOrderItems} onDelete={deleteVersion} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <Button onClick={handleAddToOrder} className="w-full md:w-auto flex-1 h-11" disabled={isAddingItem}>
                  {isAddingItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Dodaj stavku u nalog'}
                </Button>
                <Button onClick={handleDownloadPdf} variant="outline" className="w-full md:w-auto flex-1 h-11" disabled={orderItems.length === 0}>
                  <FileDown className="mr-2 h-4 w-4" /> Preuzmi Nalog (PDF)
                </Button>
                <Button onClick={() => saveVersion(`Verzija ${versions.length + 1}`, orderItems)} variant="ghost" className="w-full md:w-auto flex-1 h-11 border-dashed border-2" disabled={orderItems.length === 0}>
                  Spremi trenutnu verziju
                </Button>
              </div>
              <Separator className="my-4" />
              <OrderList orderItems={orderItems} edgeNames={edgeNames} handleRemoveOrderItem={handleRemoveOrderItem} />
            </CardContent>
          </Card>
        </div>
      </div>

      <MaterialModal isOpen={modalOpen === 'material'} onClose={() => setModalOpen(null)} onSave={(item) => handleSaveItem(item, 'material')} item={editingItem as Material | null} />
      <FinishModal isOpen={modalOpen === 'finish'} onClose={() => setModalOpen(null)} onSave={(item) => handleSaveItem(item, 'finish')} item={editingItem as SurfaceFinish | null} />
      <ProfileModal isOpen={modalOpen === 'profile'} onClose={() => setModalOpen(null)} onSave={(item) => handleSaveItem(item, 'profile')} item={editingItem as EdgeProfile | null} />
    </main>
  );
}
