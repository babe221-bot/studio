"use client";

import React from 'react';
import { OrderItem } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DiffViewerProps {
    versionA: OrderItem[];
    versionB: OrderItem[];
    labelA?: string;
    labelB?: string;
}

export function DiffViewer({ versionA, versionB, labelA = "Verzija A", labelB = "Verzija B" }: DiffViewerProps) {
    // Map items by their specimen ID and properties to detect changes
    // Note: orderId might change if items are re-added, so we use a combination
    const getFingerprint = (item: OrderItem) => {
        return `${item.id}-${item.dims.length}x${item.dims.width}x${item.dims.height}-${item.material.name}-${item.finish.name}-${item.profile.name}`;
    };

    const mapA = new Map(versionA.map(item => [item.orderId, item]));
    const mapB = new Map(versionB.map(item => [item.orderId, item]));

    const allIds = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));

    const diffs = allIds.map(id => {
        const itemA = mapA.get(id);
        const itemB = mapB.get(id);

        if (!itemA && itemB) return { type: 'added', item: itemB, id };
        if (itemA && !itemB) return { type: 'removed', item: itemA, id };

        // Check for modifications
        if (JSON.stringify(itemA) !== JSON.stringify(itemB)) {
            return { type: 'modified', itemA, itemB, id };
        }

        return { type: 'unchanged', item: itemA, id };
    });

    return (
        <ScrollArea className="h-[400px] w-full border rounded-md p-4">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm font-medium border-b pb-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{labelA}</Badge>
                        <span>({versionA.length} stavki)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{labelB}</Badge>
                        <span>({versionB.length} stavki)</span>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Stavka</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Promjene</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {diffs.map(({ type, item, itemA, itemB, id }) => (
                            <TableRow key={id} className={type === 'added' ? 'bg-green-500/10' : type === 'removed' ? 'bg-red-500/10' : type === 'modified' ? 'bg-blue-500/10' : ''}>
                                <TableCell className="font-medium">
                                    {item?.id || itemA?.id || itemB?.id}
                                </TableCell>
                                <TableCell>
                                    {type === 'added' && <Badge className="bg-green-600">Dodano</Badge>}
                                    {type === 'removed' && <Badge variant="destructive">Uklonjeno</Badge>}
                                    {type === 'modified' && <Badge variant="secondary" className="bg-blue-600 text-white">Izmijenjeno</Badge>}
                                    {type === 'unchanged' && <Badge variant="outline">Nepromijenjeno</Badge>}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {type === 'modified' && itemA && itemB && (
                                        <div className="space-y-1">
                                            {itemA.dims.length !== itemB.dims.length && <div>Dužina: {itemA.dims.length} → {itemB.dims.length}</div>}
                                            {itemA.dims.width !== itemB.dims.width && <div>Širina: {itemA.dims.width} → {itemB.dims.width}</div>}
                                            {itemA.material.id !== itemB.material.id && <div>Materijal: {itemA.material.name} → {itemB.material.name}</div>}
                                            {itemA.finish.id !== itemB.finish.id && <div>Obrada: {itemA.finish.name} → {itemB.finish.name}</div>}
                                            {itemA.totalCost !== itemB.totalCost && <div>Cijena: €{itemA.totalCost.toFixed(2)} → €{itemB.totalCost.toFixed(2)}</div>}
                                        </div>
                                    )}
                                    {type === 'added' && item && (
                                        <div className="text-muted-foreground">
                                            {item.dims.length}x{item.dims.width}x{item.dims.height} | {item.material.name}
                                        </div>
                                    )}
                                    {type === 'removed' && item && (
                                        <div className="text-muted-foreground">
                                            {item.dims.length}x{item.dims.width}x{item.dims.height} | {item.material.name}
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </ScrollArea>
    );
}
