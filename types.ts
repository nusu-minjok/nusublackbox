
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
  upperFloorPossibility: 'YES' | 'NO' | 'UNKNOWN' | ''; // 위층 거주 여부
  repairHistory: 'NONE' | 'ONCE' | 'MANY' | ''; // 공사 이력
  frequency: 'SUDDEN' | 'RAIN_ONLY' | 'CONSTANT' | ''; // 누수 빈도
  extraNote: string; // 사용자가 추가로 입력하는 상세 내용
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
  summary: string; // 무료 요약
  riskScore: number; // 바가지 위험 지수 (0-100)
  detectionCost: string;
  repairCostInfo: string;
  overchargeThreshold: string;
  causes: {
    probability: 'High' | 'Medium' | 'Low';
    title: string;
    description: string;
  }[];
  expertGuide: string; // 유료 상세 가이드
  scamCheckQuestions: string[];
  insurance: {
    probability: 'High' | 'Medium' | 'Low';
    prepList: string[];
    disclaimer: string;
  };
}
