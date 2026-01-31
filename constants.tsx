
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
  DRIPPING: '물방울이 뚝뚝 떨어진다',
  STAINED: '천장/벽이 젖어 있거나 번짐',
  MOLD: '곰팡이가 피거나 냄새가 남',
  RAIN_ONLY: '비가 올 때만 샌다',
  CONSTANT: '24시간 내내 계속 샌다',
  INTERMITTENT: '샌다 안 샌다 반복함'
};

export const TIMING_LABELS: Record<string, string> = {
  TODAY: '오늘 처음 발견',
  DAYS_AGO: '며칠 전부터 조금씩',
  RECURRING: '과거에도 있었던 증상',
  SUDDEN: '갑자기 양이 늘어남'
};

export const FREQUENCY_LABELS: Record<string, string> = {
  SUDDEN: '갑자기 발생함',
  RAIN_ONLY: '비올 때만 영향 받음',
  CONSTANT: '끊임없이 지속됨'
};

export const HISTORY_LABELS: Record<string, string> = {
  NONE: '전혀 없음(처음 발생)',
  ONCE: '과거에 1회 수리함',
  MANY: '여러 번 반복 공사함'
};

export const BUILDING_TYPE_LABELS: Record<string, string> = {
  APARTMENT: '아파트',
  VILLA: '빌라(다세대/연립)',
  HOUSE: '단독/다중주택',
  OFFICETEL: '오피스텔'
};

export const BUILDING_AGE_LABELS: Record<string, string> = {
  UNDER_10: '10년 미만(신축급)',
  BETWEEN_10_20: '10~20년 사이',
  OVER_20: '20년 이상(노후)',
  UNKNOWN: '정확히 모름'
};

export const PROBABILITY_COLORS: Record<string, string> = {
  High: 'text-red-600 bg-red-50',
  Medium: 'text-yellow-600 bg-yellow-50',
  Low: 'text-blue-600 bg-blue-50'
};

export const PROBABILITY_LABELS: Record<string, string> = {
  High: '확률 높음',
  Medium: '확률 보통',
  Low: '확률 낮음'
};
