
import React from 'react';

export const LOCATION_LABELS: Record<string, string> = {
  CEILING: '천장',
  WALL: '벽',
  FLOOR: '바닥',
  BOILER: '보일러/온수',
  VERANDA: '베란다/창가',
  ROOF: '옥상/외벽',
  UNKNOWN: '모르겠음'
};

export const SYMPTOM_LABELS: Record<string, string> = {
  DRIPPING: '물방울이 떨어진다',
  STAINED: '젖어 있거나 번진 흔적',
  MOLD: '곰팡이/냄새 발생',
  RAIN_ONLY: '비 올 때만 발생',
  CONSTANT: '계속 샌다',
  INTERMITTENT: '가끔 발생'
};

export const TIMING_LABELS: Record<string, string> = {
  TODAY: '오늘 처음',
  DAYS_AGO: '며칠 전부터',
  RECURRING: '예전부터 반복',
  SUDDEN: '방금 갑자기'
};

export const BUILDING_TYPE_LABELS: Record<string, string> = {
  APARTMENT: '아파트',
  VILLA: '빌라(다세대)',
  HOUSE: '단독주택',
  OFFICETEL: '오피스텔'
};

export const BUILDING_AGE_LABELS: Record<string, string> = {
  UNDER_10: '10년 미만',
  BETWEEN_10_20: '10~20년',
  OVER_20: '20년 이상',
  UNKNOWN: '모름'
};

export const PROBABILITY_COLORS: Record<string, string> = {
  High: 'text-red-600 bg-red-50',
  Medium: 'text-yellow-600 bg-yellow-50',
  Low: 'text-blue-600 bg-blue-50'
};

export const PROBABILITY_LABELS: Record<string, string> = {
  High: '높음',
  Medium: '중간',
  Low: '낮음'
};
