
export type BuildingType = 'APARTMENT' | 'VILLA' | 'HOUSE' | 'OFFICETEL';
export type BuildingAge = 'UNDER_10' | 'BETWEEN_10_20' | 'OVER_20' | 'UNKNOWN';
export type LeakLocation = 'CEILING' | 'WALL' | 'FLOOR' | 'BOILER' | 'VERANDA' | 'ROOF' | 'UNKNOWN';
export type Symptom = 'DRIPPING' | 'STAINED' | 'MOLD' | 'RAIN_ONLY' | 'CONSTANT' | 'INTERMITTENT';
export type Timing = 'TODAY' | 'DAYS_AGO' | 'RECURRING' | 'SUDDEN';

export interface WizardData {
  safetyChecked: boolean;
  location: LeakLocation | '';
  symptoms: Symptom[];
  timing: Timing | '';
  buildingType: BuildingType | '';
  buildingAge: BuildingAge | '';
  upperFloorPossibility: 'UPPER' | 'MY_PIPE' | 'UNKNOWN' | '';
  additionalInfo: {
    airconUsed: boolean;
    recentRenovation: boolean;
    hotWaterWorsens: boolean;
    rainWorsens: boolean;
    leakSize: 'SMALL' | 'MEDIUM' | 'LARGE' | '';
  };
  photos: string[];
}

export interface AnalysisResult {
  detectionCost: string;
  repairCostInfo: string;
  overchargeThreshold: string;
  causes: {
    probability: 'High' | 'Medium' | 'Low';
    title: string;
    description: string;
  }[];
  scamCheckQuestions: string[];
  insurance: {
    probability: 'High' | 'Medium' | 'Low';
    prepList: string[];
    disclaimer: string;
  };
}
