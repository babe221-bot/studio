'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusIcon } from 'lucide-react';
import type {
  ConstructionElement,
  SurfaceFinish,
  EdgeProfile,
  ProcessedEdges,
  ModalType,
  EditableItem,
} from '@/types';
import { ActiveSelectionIndicator } from '../collaboration/ActiveSelectionIndicator';

interface ProcessingConfigProps {
  selectedElement: ConstructionElement | undefined;
  selectedFinishId: string;
  setSelectedFinishId: (id: string) => void;
  handleOpenModal: (type: ModalType, item?: EditableItem) => void;
  finishes: SurfaceFinish[];
  bunjaEdgeStyle: 'oštre' | 'lomljene';
  setBunjaEdgeStyle: (style: 'oštre' | 'lomljene') => void;
  profiles: EdgeProfile[];
  selectedProfileId: string;
  setSelectedProfileId: (id: string) => void;
  edgeNames: Record<string, string>;
  processedEdges: ProcessedEdges;
  updateProcessedEdge: (edge: keyof ProcessedEdges, value: boolean) => void;
  okapnikEdges: ProcessedEdges;
  updateOkapnikEdge: (edge: keyof ProcessedEdges, value: boolean) => void;
  handleFocus: (fieldName: string) => void;
  handleBlur: () => void;
}

export const ProcessingConfig = React.memo<ProcessingConfigProps>(
  ({
    selectedElement,
    selectedFinishId,
    setSelectedFinishId,
    handleOpenModal,
    finishes,
    bunjaEdgeStyle,
    setBunjaEdgeStyle,
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    edgeNames,
    processedEdges,
    updateProcessedEdge,
    okapnikEdges,
    updateOkapnikEdge,
    handleFocus,
    handleBlur,
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>3. Obrada i profili</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActiveSelectionIndicator fieldName="finish">
          <div className="space-y-2">
            <Label>Vrsta obrade lica</Label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedFinishId}
                onValueChange={setSelectedFinishId}
              >
                <SelectTrigger
                  id="surface-finish-select"
                  onFocus={() => handleFocus('finish')}
                  onBlur={handleBlur}
                >
                  <SelectValue placeholder="Odaberite obradu" />
                </SelectTrigger>
                <SelectContent>
                  {finishes.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenModal('finish')}
                aria-label="Dodaj novu obradu lica"
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </ActiveSelectionIndicator>

        {selectedElement?.hasSpecialBunjaEdges ? (
          <ActiveSelectionIndicator fieldName="bunjaStyle">
            <div className="space-y-3 pt-2">
              <Label className="text-base">Obrada ivica bunje</Label>
              <RadioGroup
                defaultValue="lomljene"
                value={bunjaEdgeStyle}
                onValueChange={(value) =>
                  setBunjaEdgeStyle(value as 'oštre' | 'lomljene')
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lomljene" id="r-lomljene" />
                  <Label htmlFor="r-lomljene" className="cursor-pointer">
                    Lomljene ivice
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oštre" id="r-ostre" />
                  <Label htmlFor="r-ostre" className="cursor-pointer">
                    Oštre ivice (pilano)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </ActiveSelectionIndicator>
        ) : (
          <>
            <ActiveSelectionIndicator fieldName="profile">
              <div className="space-y-2">
                <Label>Profil i obrada ivica</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedProfileId}
                    onValueChange={setSelectedProfileId}
                  >
                    <SelectTrigger
                      id="edge-profile-select"
                      onFocus={() => handleFocus('profile')}
                      onBlur={handleBlur}
                    >
                      <SelectValue placeholder="Odaberite profil" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenModal('profile')}
                    aria-label="Dodaj novi profil ivice"
                  >
                    <PlusIcon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </ActiveSelectionIndicator>

            <div className="space-y-2 pt-2">
              <Label className="text-sm">Primijeni obradu na ivicama:</Label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 text-sm">
                {(Object.keys(edgeNames) as Array<keyof ProcessedEdges>).map(
                  (edge) => (
                    <div className="flex items-center space-x-2" key={edge}>
                      <Checkbox
                        id={`edge-${edge}`}
                        checked={processedEdges[edge]}
                        onCheckedChange={(checked) =>
                          updateProcessedEdge(edge, !!checked)
                        }
                      />
                      <Label
                        htmlFor={`edge-${edge}`}
                        className="font-normal cursor-pointer"
                      >
                        {edgeNames[edge]}
                      </Label>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-sm">Dodaj okapnik na ivicama:</Label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1 text-sm">
                {(Object.keys(edgeNames) as Array<keyof ProcessedEdges>).map(
                  (edge) => (
                    <div
                      className="flex items-center space-x-2"
                      key={`okapnik-${edge}`}
                    >
                      <Checkbox
                        id={`okapnik-${edge}`}
                        checked={okapnikEdges[edge]}
                        onCheckedChange={(checked) =>
                          updateOkapnikEdge(edge, !!checked)
                        }
                        disabled={!processedEdges[edge]}
                      />
                      <Label
                        htmlFor={`okapnik-${edge}`}
                        className={`font-normal cursor-pointer ${!processedEdges[edge] ? 'text-muted-foreground' : ''}`}
                      >
                        {edgeNames[edge]}
                      </Label>
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
);

ProcessingConfig.displayName = 'ProcessingConfig';
