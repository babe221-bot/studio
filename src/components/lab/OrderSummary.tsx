'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, CreditCard } from 'lucide-react';
import type { OrderItem } from '@/types';
import { CalculationsResult } from '@/lib/calculations';

interface OrderSummaryProps {
  calculations: CalculationsResult;
  orderItems: OrderItem[];
  edgeNames: Record<string, string>;
  handleRemoveOrderItem: (id: number) => void;
  onCheckout: () => void;
  isCheckoutDisabled: boolean;
}

export const OrderSummary = React.memo<OrderSummaryProps>(
  ({
    calculations,
    orderItems,
    edgeNames,
    handleRemoveOrderItem,
    onCheckout,
    isCheckoutDisabled,
  }) => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>4. Kalkulacija trenutne stavke</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Površina</span>
            <span className="font-medium font-code">
              {calculations.surfaceArea.toFixed(2)} m²
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Težina</span>
            <span className="font-medium font-code">
              {calculations.weight.toFixed(1)} kg
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trošak materijala</span>
            <span className="font-medium font-code">
              €{calculations.materialCost.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trošak obrade</span>
            <span className="font-medium font-code">
              €{calculations.processingCost.toFixed(2)}
            </span>
          </div>
          {calculations.okapnikCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trošak okapnika</span>
              <span className="font-medium font-code">
                €{calculations.okapnikCost.toFixed(2)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold text-primary">
            <span>Ukupni trošak stavke</span>
            <span>€{calculations.totalCost.toFixed(2)}</span>
          </div>
          <Button
            onClick={onCheckout}
            className="w-full mt-2"
            variant="default"
            disabled={isCheckoutDisabled}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Plati depozit
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle>5. Radni nalog (Sadržaj)</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            {orderItems.length} stavki
          </span>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3 pr-4">
              {orderItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nema stavki u nalogu.
                </p>
              ) : (
                orderItems.map((item) => {
                  let quantityString = '';
                  switch (item.orderUnit) {
                    case 'piece':
                      quantityString = `${item.quantity} kom`;
                      break;
                    case 'sqm':
                      quantityString = `${item.quantity.toFixed(2)} m²`;
                      break;
                    case 'lm':
                      quantityString = `${item.quantity.toFixed(2)} m`;
                      break;
                  }

                  let description = `${item.material.name} | ${item.finish.name}`;
                  if (item.orderUnit !== 'sqm' && item.orderUnit !== 'lm') {
                    description += ` | ${item.profile.name}`;
                  }

                  return (
                    <div
                      key={item.orderId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-sm">
                          {item.id}{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({quantityString})
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {description}
                        </p>
                        <div className="mt-1">
                          {item.bunjaEdgeStyle ? (
                            <p className="text-[10px] text-muted-foreground">
                              Obrada: {item.bunjaEdgeStyle}
                            </p>
                          ) : (
                            <>
                              <p className="text-[10px] text-muted-foreground">
                                Ivice:{' '}
                                {Object.entries(item.processedEdges)
                                  .filter(([, selected]) => selected)
                                  .map(([edge]) => edgeNames[edge])
                                  .join(', ') || 'Nijedna'}
                              </p>
                              {Object.values(item.okapnikEdges).some(
                                Boolean
                              ) && (
                                <p className="text-[10px] text-muted-foreground">
                                  Okapnik:{' '}
                                  {Object.entries(item.okapnikEdges)
                                    .filter(([, selected]) => selected)
                                    .map(([edge]) => edgeNames[edge])
                                    .join(', ')}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-bold text-sm">
                          €{item.totalCost.toFixed(2)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveOrderItem(item.orderId)}
                          aria-label={`Ukloni stavku`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
);

OrderSummary.displayName = 'OrderSummary';
