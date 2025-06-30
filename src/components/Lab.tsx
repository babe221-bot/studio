"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { initialMaterials, initialSurfaceFinishes, initialEdgeProfiles } from '@/lib/data';
import VisualizationCanvas from '@/components/VisualizationCanvas';
import MaterialModal from '@/components/modals/MaterialModal';
import FinishModal from '@/components/modals/FinishModal';
import ProfileModal from '@/components/modals/ProfileModal';
import type { Material, SurfaceFinish, EdgeProfile, OrderItem, ModalType, EditableItem, ProcessedEdges } from '@/types';
import { PlusIcon, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { generatePdfAsDataUri } from '@/lib/pdf';
import { uploadPdfToStorage } from '@/app/actions';

type CanvasHandle = {
  getSnapshot: () => string | null;
};

export function Lab() {
  const { toast } = useToast();
  const canvasRef = useRef<CanvasHandle>(null);

  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [finishes, setFinishes] = useState<SurfaceFinish[]>(initialSurfaceFinishes);
  const [profiles, setProfiles] = useState<EdgeProfile[]>(initialEdgeProfiles);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [specimenId, setSpecimenId] = useState('Kuhinjska ploča K01');
  const [length, setLength] = useState(280);
  const [width, setWidth] = useState(62);
  const [height, setHeight] = useState(3);

  const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>(initialMaterials[0]?.id.toString());
  const [selectedFinishId, setSelectedFinishId] = useState<string | undefined>(initialSurfaceFinishes[0]?.id.toString());
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(initialEdgeProfiles[0]?.id.toString());

  const [processedEdges, setProcessedEdges] = useState<ProcessedEdges>({
    front: true,
    back: false,
    left: true,
    right: true,
  });

  const [okapnikEdges, setOkapnikEdges] = useState<ProcessedEdges>({
    front: true,
    back: false,
    left: false,
    right: false,
  });
  
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Auto-disable okapnik if the corresponding edge is not processed
    const newOkapnikEdges: ProcessedEdges = { ...okapnikEdges };
    let changed = false;
    for (const edge of Object.keys(processedEdges) as Array<keyof ProcessedEdges>) {
      if (!processedEdges[edge] && newOkapnikEdges[edge]) {
        newOkapnikEdges[edge] = false;
        changed = true;
      }
    }
    if (changed) {
      setOkapnikEdges(newOkapnikEdges);
    }
  }, [processedEdges, okapnikEdges]);

  const selectedMaterial = useMemo(() => materials.find(m => m.id.toString() === selectedMaterialId), [materials, selectedMaterialId]);
  const selectedFinish = useMemo(() => finishes.find(f => f.id.toString() === selectedFinishId), [finishes, selectedFinishId]);
  const selectedProfile = useMemo(() => profiles.find(p => p.id.toString() === selectedProfileId), [profiles, selectedProfileId]);

  const calculations = useMemo(() => {
    if (!selectedMaterial || !selectedFinish || !selectedProfile || !length || !width || !height) {
      return { surfaceArea: 0, weight: 0, materialCost: 0, processingCost: 0, totalCost: 0, okapnikCost: 0 };
    }
    const length_m = length / 100;
    const width_m = width / 100;
    const OKAPNIK_COST_PER_M = 5;
    
    let processed_perimeter_m = 0;
    if (processedEdges.front) processed_perimeter_m += length_m;
    if (processedEdges.back) processed_perimeter_m += length_m;
    if (processedEdges.left) processed_perimeter_m += width_m;
    if (processedEdges.right) processed_perimeter_m += width_m;

    let okapnik_perimeter_m = 0;
    if (okapnikEdges.front) okapnik_perimeter_m += length_m;
    if (okapnikEdges.back) okapnik_perimeter_m += length_m;
    if (okapnikEdges.left) okapnik_perimeter_m += width_m;
    if (okapnikEdges.right) okapnik_perimeter_m += width_m;

    const surfaceArea_m2 = length_m * width_m;
    const weight_kg = (length * width * height * selectedMaterial.density) / 1000;
    const materialCost = surfaceArea_m2 * selectedMaterial.cost_sqm;
    const processingCost = (surfaceArea_m2 * selectedFinish.cost_sqm) + (processed_perimeter_m * selectedProfile.cost_m);
    const okapnikCost = okapnik_perimeter_m * OKAPNIK_COST_PER_M;
    const totalCost = materialCost + processingCost + okapnikCost;
    
    return { surfaceArea: surfaceArea_m2, weight: weight_kg, materialCost, processingCost, okapnikCost, totalCost };
  }, [length, width, height, selectedMaterial, selectedFinish, selectedProfile, processedEdges, okapnikEdges]);

  const visualizationState = useMemo(() => ({
    dims: { length, width, height },
    material: selectedMaterial,
    finish: selectedFinish,
    profile: selectedProfile,
    processedEdges: processedEdges,
    okapnikEdges: okapnikEdges,
  }), [length, width, height, selectedMaterial, selectedFinish, selectedProfile, processedEdges, okapnikEdges]);

  const handleAddToOrder = () => {
    if (!selectedMaterial || !selectedFinish || !selectedProfile || !specimenId) {
      toast({ title: "Greška", description: "Molimo popunite sva polja.", variant: "destructive" });
      return;
    }
    const snapshotDataUri = canvasRef.current?.getSnapshot() || undefined;

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
      snapshotDataUri,
    };
    setOrderItems([...orderItems, newOrderItem]);
    toast({ title: "Stavka dodana", description: `${specimenId} je dodan u radni nalog.` });
  };
  
  const handleUploadPdf = async () => {
    if (orderItems.length === 0) {
      toast({ title: "Greška", description: "Nema stavki u nalogu za spremanje.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const dataUri = generatePdfAsDataUri(orderItems);
      const base64 = dataUri.split(',')[1];
      if (!base64) {
        throw new Error("Greška pri generiranju PDF-a.");
      }
      
      const fileName = `radni_nalog_${Date.now()}.pdf`;
      const result = await uploadPdfToStorage(base64, fileName);

      if (result.success) {
        toast({ title: "Spremanje uspješno", description: "Radni nalog je spremljen u Cloud Storage." });
      } else {
        throw new Error(result.error || "Nepoznata greška pri spremanju.");
      }
    } catch (error: any) {
      toast({ title: "Greška pri spremanju", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveOrderItem = (orderId: number) => {
    setOrderItems(orderItems.filter(item => item.orderId !== orderId));
  };

  const handleOpenModal = (type: ModalType, item?: EditableItem) => {
    setEditingItem(item || null);
    setModalOpen(type);
  };

  const handleSaveItem = (item: EditableItem, type: ModalType) => {
    if (type === 'material') {
        const newMaterials = [...materials];
        const index = newMaterials.findIndex(m => m.id === item.id);
        if (index > -1) newMaterials[index] = item as Material;
        else newMaterials.push({ ...item, id: Date.now() } as Material);
        setMaterials(newMaterials);
    } else if (type === 'finish') {
        const newFinishes = [...finishes];
        const index = newFinishes.findIndex(f => f.id === item.id);
        if (index > -1) newFinishes[index] = item as SurfaceFinish;
        else newFinishes.push({ ...item, id: Date.now() } as SurfaceFinish);
        setFinishes(newFinishes);
    } else if (type === 'profile') {
        const newProfiles = [...profiles];
        const index = newProfiles.findIndex(p => p.id === item.id);
        if (index > -1) newProfiles[index] = item as EdgeProfile;
        else newProfiles.push({ ...item, id: Date.now() } as EdgeProfile);
        setProfiles(newProfiles);
    }
    setModalOpen(null);
    toast({ title: "Spremljeno", description: "Stavka je uspješno spremljena." });
  };
  
  const edgeNames = {
    front: 'Prednja',
    back: 'Zadnja',
    left: 'Lijeva',
    right: 'Desna'
  };

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
        
        <div className="flex flex-col gap-6 lg:col-span-1 xl:col-span-1">
          <Card>
            <CardHeader><CardTitle>1. Unos naloga</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="specimen-id">ID / Naziv komada</Label>
                <Input id="specimen-id" value={specimenId} onChange={e => setSpecimenId(e.target.value)} placeholder="npr. Kuhinjska ploča K01" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="length">Dužina (cm)</Label>
                  <Input id="length" type="number" value={length} onChange={e => setLength(parseFloat(e.target.value) || 0)} />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>2. Odabir materijala</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => handleOpenModal('material')}><PlusIcon className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
                <Label htmlFor="material-select">Vrsta kamena</Label>
                <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                    <SelectTrigger id="material-select"><SelectValue placeholder="Odaberite materijal" /></SelectTrigger>
                    <SelectContent>
                        {materials.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>3. Definiranje obrade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="surface-finish-select">Obrada lica</Label>
                <div className="flex items-center gap-2">
                  <Select value={selectedFinishId} onValueChange={setSelectedFinishId}>
                      <SelectTrigger id="surface-finish-select"><SelectValue placeholder="Odaberite obradu" /></SelectTrigger>
                      <SelectContent>
                          {finishes.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenModal('finish')}><PlusIcon className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Profil i obrada ivica</Label>
                <div className="flex items-center gap-2">
                   <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                        <SelectTrigger id="edge-profile-select"><SelectValue placeholder="Odaberite profil" /></SelectTrigger>
                        <SelectContent>
                            {profiles.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                   <Button variant="ghost" size="icon" onClick={() => handleOpenModal('profile')}><PlusIcon className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2 pt-2">
                    <Label className="text-sm">Primijeni obradu na ivicama:</Label>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 text-sm">
                       {Object.keys(edgeNames).map((edge) => (
                          <div className="flex items-center space-x-2" key={edge}>
                            <Checkbox 
                                id={`edge-${edge}`} 
                                checked={processedEdges[edge as keyof ProcessedEdges]} 
                                onCheckedChange={(checked) => setProcessedEdges(prev => ({...prev, [edge]: !!checked}))}
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
                                onCheckedChange={(checked) => setOkapnikEdges(prev => ({...prev, [edge]: !!checked}))}
                                disabled={!processedEdges[edge as keyof ProcessedEdges]}
                            />
                            <Label htmlFor={`okapnik-${edge}`} className={`font-normal cursor-pointer ${!processedEdges[edge as keyof ProcessedEdges] ? 'text-muted-foreground' : ''}`}>{edgeNames[edge as keyof typeof edgeNames]}</Label>
                        </div>
                       ))}
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>

           <Card>
            <CardHeader><CardTitle>4. Kalkulacija</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Površina</span><span className="font-medium font-code">{calculations.surfaceArea.toFixed(2)} m²</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Težina</span><span className="font-medium font-code">{calculations.weight.toFixed(1)} kg</span></div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trošak materijala</span><span className="font-medium font-code">€{calculations.materialCost.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trošak obrade</span><span className="font-medium font-code">€{calculations.processingCost.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trošak okapnika</span><span className="font-medium font-code">€{calculations.okapnikCost.toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between text-lg font-bold text-primary"><span >Ukupni trošak</span><span>€{calculations.totalCost.toFixed(2)}</span></div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 xl:col-span-3">
          <Card className="h-full min-h-[400px] md:min-h-[600px] lg:min-h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>3D Vizualizacija</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setRefreshKey(k => k + 1)} title="Osvježi 3D prikaz">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="h-full pb-0">
               <VisualizationCanvas key={refreshKey} ref={canvasRef} {...visualizationState} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 xl:col-span-4">
          <Card>
            <CardHeader><CardTitle>5. Radni nalog</CardTitle></CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4 md:flex-row">
                    <Button onClick={handleAddToOrder} className="w-full md:w-auto md:flex-1">Dodaj stavku u nalog</Button>
                    <Button onClick={handleUploadPdf} variant="secondary" className="w-full md:w-auto" disabled={orderItems.length === 0 || isUploading}>
                      {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isUploading ? 'Spremanje...' : 'Spremi PDF u Cloud'}
                    </Button>
                </div>
                <Separator className="my-4" />
                <ScrollArea className="h-64">
                    <div className="space-y-3 pr-4">
                    {orderItems.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nema stavki u nalogu.</p>
                    ) : (
                        orderItems.map(item => {
                          const processedEdgesString = (Object.entries(item.processedEdges)
                                .filter(([, selected]) => selected)
                                .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
                                .join(', ') || 'Nijedna');
                          
                          const okapnikEdgesString = (Object.entries(item.okapnikEdges || {})
                                .filter(([, selected]) => selected)
                                .map(([edge]) => edgeNames[edge as keyof typeof edgeNames])
                                .join(', ') || 'Nema');

                          return (
                            <div key={item.orderId} className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex-1">
                                    <p className="font-semibold">{item.id}</p>
                                    <p className="text-xs text-muted-foreground">{item.material.name} | {item.finish.name} | {item.profile.name}</p>
                                    <p className="text-xs text-muted-foreground">Obrađene ivice: {processedEdgesString}</p>
                                    <p className="text-xs text-muted-foreground">Okapnik: {okapnikEdgesString}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">€{item.totalCost.toFixed(2)}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="ml-2" onClick={() => handleRemoveOrderItem(item.orderId)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        )})
                    )}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <MaterialModal 
        isOpen={modalOpen === 'material'} 
        onClose={() => setModalOpen(null)} 
        onSave={(item) => handleSaveItem(item, 'material')}
        item={editingItem as Material | null} 
      />
       <FinishModal 
        isOpen={modalOpen === 'finish'} 
        onClose={() => setModalOpen(null)} 
        onSave={(item) => handleSaveItem(item, 'finish')}
        item={editingItem as SurfaceFinish | null} 
      />
       <ProfileModal 
        isOpen={modalOpen === 'profile'} 
        onClose={() => setModalOpen(null)} 
        onSave={(item) => handleSaveItem(item, 'profile')}
        item={editingItem as EdgeProfile | null} 
      />
    </main>
  );
}
