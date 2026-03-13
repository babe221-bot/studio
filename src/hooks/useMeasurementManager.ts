import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { CanvasHandle, VisualizationProps } from './VisualizationCanvas';
import type { MeasurementToolType } from '../MeasurementTools';
import type {
  Measurement,
  MeasurementPoint,
} from '@/lib/measurement/MeasurementTool';
import { DistanceTool } from '@/lib/measurement/DistanceTool';
import { AngleTool } from '@/lib/measurement/AngleTool';
import { AreaTool } from '@/lib/measurement/AreaTool';
import type { CADContextData } from '@/lib/cad-context';

const MEASUREMENT_PREVIEW_COLOR = 0xff00ff; // Magenta
const MEASUREMENT_POINT_COLOR = 0xffff00; // Yellow
const MEASUREMENT_LINE_COLOR = 0xffffff; // White

interface MeasurementState {
  tool: DistanceTool | AngleTool | AreaTool | null;
  points: MeasurementPoint[];
  previewPoint: MeasurementPoint | null;
  activeMeasurement: Measurement | null;
  measurements: Measurement[];
}

export function useMeasurementManager(props: VisualizationProps) {
  const { scene, camera, gl } = useThree();
  const { cadData, setCadData } = useCadContext();

  const [measurementState, setMeasurementState] = useState<MeasurementState>(
    () => {
      const initialTool = getToolInstance(cadData.activeMeasurementTool);
      return {
        tool: initialTool,
        points: initialTool ? initialTool.getPoints() : [],
        previewPoint: null,
        activeMeasurement: null,
        measurements: cadData.measurements || [],
      };
    }
  );

  // Effect to update tool when activeMeasurementTool changes in context
  useEffect(() => {
    const newTool = getToolInstance(cadData.activeMeasurementTool);
    setMeasurementState((prevState) => ({
      ...prevState,
      tool: newTool,
      points: newTool ? newTool.getPoints() : [],
      activeMeasurement: null, // Reset active measurement when tool changes
    }));
  }, [cadData.activeMeasurementTool]);

  // Effect to update CadContext when measurements change
  useEffect(() => {
    setCadData((prevData) => ({
      ...prevData,
      activeMeasurementTool: measurementState.tool
        ? getToolType(measurementState.tool)
        : null,
      measurements: measurementState.measurements,
    }));
  }, [measurementState.tool, measurementState.measurements, setCadData]);

  // Handle mouse move for previewing points
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!measurementState.tool || !containerRef.current || !camera || !gl)
        return;

      const { clientX, clientY } = event;
      const domElement = containerRef.current;

      const previewPoint = measurementState.tool.onMouseMove(
        clientX,
        clientY,
        domElement
      );
      setMeasurementState((prevState) => ({ ...prevState, previewPoint }));
    },
    [measurementState.tool, camera, gl]
  );

  // Handle mouse click for placing points or completing measurements
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!measurementState.tool || !containerRef.current || !camera || !gl)
        return;

      const { clientX, clientY } = event;
      const domElement = containerRef.current;

      const newMeasurement = measurementState.tool.onClick(
        clientX,
        clientY,
        domElement
      );

      if (newMeasurement) {
        setMeasurementState((prevState) => {
          const updatedMeasurements = [
            ...prevState.measurements,
            newMeasurement,
          ];
          // Optionally call onMeasurementComplete prop here
          return {
            ...prevState,
            points: [], // Reset points after completing measurement
            previewPoint: null,
            activeMeasurement: newMeasurement,
            measurements: updatedMeasurements,
          };
        });
      } else {
        // If no new measurement, just update the points array
        const updatedPoints = measurementState.tool.getPoints();
        setMeasurementState((prevState) => ({
          ...prevState,
          points: updatedPoints,
        }));
      }
    },
    [measurementState.tool, camera, gl]
  ); // Re-add camera and gl if they change

  // Effect to add/remove event listeners
  useEffect(() => {
    const canvasElement = containerRef.current;
    if (!canvasElement) return;

    canvasElement.addEventListener('mousemove', handleMouseMove);
    canvasElement.addEventListener('click', handleClick);

    return () => {
      canvasElement.removeEventListener('mousemove', handleMouseMove);
      canvasElement.removeEventListener('click', handleClick);
    };
  }, [handleMouseMove, handleClick]);

  // Effect to update tool instances when scene/camera is ready
  useEffect(() => {
    if (measurementState.tool && scene && camera) {
      measurementState.tool.setScene(scene, camera);
    }
  }, [measurementState.tool, scene, camera]);

  // Use useFrame for rendering measurements
  useFrame(() => {
    if (!measurementState.tool || !camera || !gl || !scene) return;

    // Draw preview point
    if (measurementState.previewPoint) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [
            measurementState.previewPoint.position.x,
            measurementState.previewPoint.position.y,
            measurementState.previewPoint.position.z,
          ],
          3
        )
      );
      const material = new THREE.PointsMaterial({
        color: MEASUREMENT_PREVIEW_COLOR,
        size: 0.05,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      // Cleanup geometry and material after render
      return () => {
        scene.remove(points);
        geometry.dispose();
        material.dispose();
      };
    }

    // Draw measurement points
    measurementState.points.forEach((p, i) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [p.position.x, p.position.y, p.position.z],
          3
        )
      );
      const material = new THREE.PointsMaterial({
        color: MEASUREMENT_POINT_COLOR,
        size: 0.03,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      // Cleanup geometry and material after render
      return () => {
        scene.remove(points);
        geometry.dispose();
        material.dispose();
      };
    });

    // Draw measurement lines/angles
    if (measurementState.activeMeasurement) {
      const { type, points, value, unit } = measurementState.activeMeasurement;
      const lineMaterial = new THREE.LineBasicMaterial({
        color: MEASUREMENT_LINE_COLOR,
      });
      const geometry = new THREE.BufferGeometry();

      if (type === 'distance' && points.length === 2) {
        geometry.setFromPoints([points[0].position, points[1].position]);
      } else if (type === 'angle' && points.length === 3) {
        geometry.setFromPoints([
          points[0].position,
          points[1].position,
          points[2].position,
        ]);
      } else if (type === 'area' && points.length >= 3) {
        geometry.setFromPoints(points.map((p) => p.position));
      }

      if (geometry.attributes.position.count > 0) {
        const line = new THREE.Line(geometry, lineMaterial);
        scene.add(line);
        // Cleanup geometry and material after render
        return () => {
          scene.remove(line);
          geometry.dispose();
          lineMaterial.dispose();
        };
      }
    }
  });

  // Helper function to get tool instance based on type string
  function getToolInstance(
    toolType: MeasurementToolType
  ): DistanceTool | AngleTool | AreaTool | null {
    switch (toolType) {
      case 'distance':
        return new DistanceTool();
      case 'angle':
        return new AngleTool();
      case 'area':
        return new AreaTool();
      default:
        return null;
    }
  }

  // Helper function to get tool type string from instance
  function getToolType(
    tool: DistanceTool | AngleTool | AreaTool | null
  ): MeasurementToolType {
    if (tool instanceof DistanceTool) return 'distance';
    if (tool instanceof AngleTool) return 'angle';
    if (tool instanceof AreaTool) return 'area';
    return null;
  }

  // Return values for the component
  return {
    measurementState,
    setMeasurementState,
    measurementPreview,
    setMeasurementPreview,
    containerRef,
    setMeasurementTool,
    handleClick,
    handleMouseMove,
  };
}
