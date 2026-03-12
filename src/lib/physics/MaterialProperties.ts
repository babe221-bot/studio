import type { Material } from '@/types';

/**
 * Material properties for physics simulation
 * Maps material data to physical properties needed for simulation
 */
export class MaterialProperties {
  /**
   * Get comprehensive material properties for physics calculations
   * Estimates missing properties based on material type and known values
   */
  static getMaterialProperties(material: Material): {
    density: number; // kg/m³
    elasticModulus: number; // Pa (Young's modulus)
    poissonRatio: number; // dimensionless
    compressiveStrength: number; // Pa
    flexuralStrength: number; // Pa
  } {
    // Convert density from g/cm³ to kg/m³
    const density = (material.density || 2.7) * 1000;

    // Estimate elastic modulus based on material type and density
    // These are approximate values for natural stones
    let elasticModulus: number;

    if (material.category_id === 'granite') {
      // Granite: 30-70 GPa
      elasticModulus = 50e9; // 50 GPa
    } else if (material.category_id === 'marble') {
      // Marble: 40-80 GPa
      elasticModulus = 60e9; // 60 GPa
    } else if (material.category_id === 'quartz') {
      // Quartz/Engineered stone: 60-90 GPa
      elasticModulus = 75e9; // 75 GPa
    } else if (material.category_id === 'limestone') {
      // Limestone: 20-40 GPa
      elasticModulus = 30e9; // 30 GPa
    } else if (material.category_id === 'slate') {
      // Slate: 80-120 GPa
      elasticModulus = 100e9; // 100 GPa
    } else if (material.category_id === 'soapstone') {
      // Soapstone: 10-20 GPa (softer)
      elasticModulus = 15e9; // 15 GPa
    } else if (material.category_id === 'onyx') {
      // Onyx: similar to marble
      elasticModulus = 50e9; // 50 GPa
    } else if (material.category_id === 'porcelain') {
      // Porcelain: 60-80 GPa
      elasticModulus = 70e9; // 70 GPa
    } else {
      // Default fallback
      elasticModulus = 50e9; // 50 GPa
    }

    // Adjust elastic modulus based on density (simplified)
    const densityFactor = density / 2700; // Normalize to typical stone density
    elasticModulus *= Math.pow(densityFactor, 1.5);

    // Typical Poisson's ratio for stone materials
    const poissonRatio = 0.2;

    // Estimate strength properties (convert from MPa to Pa if needed)
    // These are approximate values
    let compressiveStrength = 50e6; // 50 MPa default
    let flexuralStrength = 10e6; // 10 MPa default

    if (material.category_id === 'granite') {
      compressiveStrength = 150e6; // 150 MPa
      flexuralStrength = 15e6; // 15 MPa
    } else if (material.category_id === 'marble') {
      compressiveStrength = 80e6; // 80 MPa
      flexuralStrength = 12e6; // 12 MPa
    } else if (material.category_id === 'quartz') {
      compressiveStrength = 200e6; // 200 MPa
      flexuralStrength = 20e6; // 20 MPa
    } else if (material.category_id === 'limestone') {
      compressiveStrength = 40e6; // 40 MPa
      flexuralStrength = 8e6; // 8 MPa
    } else if (material.category_id === 'slate') {
      compressiveStrength = 100e6; // 100 MPa
      flexuralStrength = 15e6; // 15 MPa
    } else if (material.category_id === 'soapstone') {
      compressiveStrength = 20e6; // 20 MPa
      flexuralStrength = 5e6; // 5 MPa
    } else if (material.category_id === 'onyx') {
      compressiveStrength = 60e6; // 60 MPa
      flexuralStrength = 10e6; // 10 MPa
    } else if (material.category_id === 'porcelain') {
      compressiveStrength = 120e6; // 120 MPa
      flexuralStrength = 15e6; // 15 MPa
    }

    // Adjust strength based on density
    compressiveStrength *= densityFactor;
    flexuralStrength *= densityFactor;

    return {
      density,
      elasticModulus,
      poissonRatio,
      compressiveStrength,
      flexuralStrength,
    };
  }

  /**
   * Get material density in kg/m³
   */
  static getDensity(material: Material): number {
    return (material.density || 2.7) * 1000;
  }

  /**
   * Get estimated elastic modulus (Young's modulus) in Pa
   */
  static getElasticModulus(material: Material): number {
    const props = this.getMaterialProperties(material);
    return props.elasticModulus;
  }

  /**
   * Get estimated compressive strength in Pa
   */
  static getCompressiveStrength(material: Material): number {
    const props = this.getMaterialProperties(material);
    return props.compressiveStrength;
  }

  /**
   * Get estimated flexural strength in Pa
   */
  static getFlexuralStrength(material: Material): number {
    const props = this.getMaterialProperties(material);
    return props.flexuralStrength;
  }

  /**
   * Get material category name for display
   */
  static getCategoryName(categoryId: string | undefined): string {
    if (!categoryId) return 'Natural Stone';

    const categoryMap: Record<string, string> = {
      marble: 'Marble',
      granite: 'Granite',
      quartz: 'Quartz',
      limestone: 'Limestone',
      slate: 'Slate',
      soapstone: 'Soapstone',
      onyx: 'Onyx',
      porcelain: 'Porcelain',
    };

    return (
      categoryMap[categoryId] ||
      categoryId.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }
}
