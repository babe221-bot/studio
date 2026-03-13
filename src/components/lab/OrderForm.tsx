'use client';

import React from 'react';
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
import { Mic, MicOff } from 'lucide-react';
import { constructionElements } from '@/lib/constructionElements';
import type { ConstructionElement } from '@/types';
import { ActiveSelectionIndicator } from '../collaboration/ActiveSelectionIndicator';

interface OrderFormProps {
  selectedElement: ConstructionElement | undefined;
  handleElementTypeChange: (id: string) => void;
  length: number;
  setLength: (l: number | ((prev: number) => number)) => void;
  width: number;
  setWidth: (w: number | ((prev: number) => number)) => void;
  height: number;
  setHeight: (h: number | ((prev: number) => number)) => void;
  quantity: number;
  setQuantity: (q: number) => void;
  specimenId: string;
  setSpecimenId: (id: string) => void;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
  handleFocus: (fieldName: string) => void;
  handleBlur: () => void;
}

export const OrderForm = React.memo<OrderFormProps>(
  ({
    selectedElement,
    handleElementTypeChange,
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
    isListening,
    startListening,
    stopListening,
    transcript,
    handleFocus,
    handleBlur,
  }) => {
    const renderQuantityInput = () => {
      const label =
        selectedElement?.orderUnit === 'sqm'
          ? 'Količina (m²)'
          : selectedElement?.orderUnit === 'lm'
            ? 'Količina (dužni metri)'
            : 'Količina (komada)';

      const step =
        selectedElement?.orderUnit === 'sqm'
          ? 0.01
          : selectedElement?.orderUnit === 'lm'
            ? 0.1
            : 1;
      const min = selectedElement?.orderUnit === 'piece' ? 1 : step;

      return (
        <ActiveSelectionIndicator fieldName="quantity">
          <div className="space-y-2">
            <Label htmlFor="quantity">{label}</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || min)}
              min={min}
              step={step}
              onFocus={() => handleFocus('quantity')}
              onBlur={handleBlur}
            />
          </div>
        </ActiveSelectionIndicator>
      );
    };

    return (
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle>1. Osnovne informacije</CardTitle>
          <Button
            variant={isListening ? 'destructive' : 'outline'}
            size="sm"
            onClick={isListening ? stopListening : startListening}
            className={isListening ? 'animate-pulse' : ''}
          >
            {isListening ? (
              <MicOff className="h-4 w-4 mr-2" />
            ) : (
              <Mic className="h-4 w-4 mr-2" />
            )}
            {isListening ? 'Slušam...' : 'Glasovne naredbe'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isListening && transcript && (
            <div className="bg-muted p-2 rounded text-xs italic mb-2">
              "{transcript}"
            </div>
          )}

          <ActiveSelectionIndicator fieldName="elementType">
            <div className="space-y-2">
              <Label htmlFor="element-type-select">Tip elementa</Label>
              <Select
                onValueChange={handleElementTypeChange}
                value={selectedElement?.id || constructionElements[0].id}
              >
                <SelectTrigger id="element-type-select">
                  <SelectValue placeholder="Odaberite tip elementa" />
                </SelectTrigger>
                <SelectContent>
                  {constructionElements.map((el) => (
                    <SelectItem key={el.id} value={el.id.toString()}>
                      {el.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </ActiveSelectionIndicator>

          <ActiveSelectionIndicator fieldName="specimenId">
            <div className="space-y-2">
              <Label htmlFor="specimen-id">ID / Naziv komada</Label>
              <Input
                id="specimen-id"
                value={specimenId}
                onChange={(e) => setSpecimenId(e.target.value)}
                placeholder="npr. Kuhinjska ploča K01"
                onFocus={() => handleFocus('specimenId')}
                onBlur={handleBlur}
              />
            </div>
          </ActiveSelectionIndicator>

          <div className="grid grid-cols-3 gap-4">
            <ActiveSelectionIndicator fieldName="length">
              <div className="space-y-2">
                <Label htmlFor="length">Dužina (cm)</Label>
                <Input
                  id="length"
                  type="number"
                  value={length}
                  onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                  disabled={selectedElement?.hasSpecialBunjaEdges}
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
          </div>
          {renderQuantityInput()}
        </CardContent>
      </Card>
    );
  }
);

OrderForm.displayName = 'OrderForm';
