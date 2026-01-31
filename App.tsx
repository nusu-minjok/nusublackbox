
import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { WizardData, AnalysisResult } from './types';
import { analyzeLeakage, checkPhotoRelevance } from './services/geminiService';
import { 
  LOCATION_LABELS, SYMPTOM_LABELS, 
  BUILDING_TYPE_LABELS, 
  FREQUENCY_LABELS, HISTORY_LABELS,
  PROBABILITY_COLORS, PROBABILITY_LABELS 
} from './constants';

// EmailJS 설정 정보
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_fljvucl',
  TEMPLATE_ID: 'template_why7hhh',
  PUBLIC_KEY: 'Vzd_EfDlK-UJnq5Qk',
};

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_CWzRX'; // 카카오톡 채널 URL

const INITIAL_WIZARD_DATA: WizardData = {
  safetyChecked: false,
  location: '',
  symptoms: [],
  timing: '',
  buildingType: '',
  buildingAge: '',
  upperFloorPossibility: '',
  repairHistory: '',
  frequency: '',
  extraNote: '',
  additionalInfo: {
    airconUsed: false,
    recentRenovation: false,
    hotWaterWorsens: false,
    rainWorsens: false,
    leakSize: '',
  },
  photos: []
};

type LeadStatus = '미확인' | '상담중' | '완료' | '삭제됨';

interface Lead {
  id: number;
  date: string;
  region: string;
  phone: string;
  status: LeadStatus;
}

const App: React.FC = () => {
  type ViewState = 'LANDING' | 'WIZARD' | 'LOADING' | 'RESULT' | 'CONSULTATION' | 'SERVICE_GUIDE' | 'INSURANCE_GUIDE' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD';
  const [view, setView] = useState<ViewState>('LANDING');
  const [history, setHistory] = useState<ViewState[]>([]); 
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_WIZARD_DATA);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasClickedChannel, setHasClickedChannel] = useState(false); // 채널 클릭 여부 추적
  const [photoError, setPhotoError] = useState<string | null>(null); // 사진 관련 안내 문구
  
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [emergencyChecks, setEmergencyChecks] = useState([false, false, false]);

  // Admin states
  const [adminId, setAdminId] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [adminFilter, setAdminFilter] = useState<LeadStatus>('미확인');
  
  // Local DB (LocalStorage 활용)
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem('leakage_leads');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('leakage_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    if (EMAILJS_CONFIG.PUBLIC_KEY) {
      emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
    }
  }, []);

  useEffect(() => {
    const handleScroll = (e: any) => {
      setIsScrolled(e.target.scrollTop > 20);
    };
    const container = document.getElementById('mobile-container');
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    if (numbers.length <= 11) return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const navigateTo = (next: ViewState) => {
    setHistory(prev => [...prev, view]);
    setView(next);
    document.getElementById('mobile-container')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(prevH => prevH.slice(0, -1));
      setView(prev);
    } else {
      setView('LANDING');
    }
  };

  const startWizard = () => {
    setData(INITIAL_WIZARD_DATA);
    setStep(0);
    setEmergencyChecks([false, false, false]);
    setIsPaid(false);
    setPhotoError(null);
    navigateTo('WIZARD');
  };

  const handleNext = () => {
    if (step < 9) setStep(prev => prev + 1);
    else handleAnalyze();
  };

  const handleWizardBack = () => {
    if (step > 0) setStep(prev => prev - 1);
    else goBack();
  };

  const removePhoto = (index: number) => {
    setData(prev => {
      const newPhotos = [...prev.photos];
      newPhotos.splice(index, 1);
      return { ...prev, photos: newPhotos };
    });
  };

  const handleAnalyze = async () => {
    if (data.photos.length === 0) {
      alert("정밀 분석을 위해 현장 사진 업로드가 필요합니다.");
      return;
    }
    setPhotoError(null);
    navigateTo('LOADING');
    try {
      const isRelevant = await checkPhotoRelevance(data.photos);
      if (!isRelevant) {
        setPhotoError("누수 현장과 관련 없는 사진이 감지되었습니다. 현장을 잘 확인할 수 있는 사진으로 다시 업로드 해주세요.");
        setView('WIZARD'); 
        setStep(9); 
        return;
      }
      const analysis = await analyzeLeakage(data);
      setResult(analysis);
      setView('RESULT'); 
    } catch (err: any) {
      alert(`분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`);
      setView('WIZARD');
      setStep(9);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminId === 'admin' && adminPw === 'dhr310091!') {
      setAdminFilter('미확인');
      navigateTo('ADMIN_DASHBOARD');
    } else {
      alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const updateLeadStatus = (id: number, status: LeadStatus) => {
    setLeads(currentLeads => currentLeads.map(lead => lead.id === id ? { ...lead, status } : lead));
  };

  const deleteLead = (id: number) => {
    if (window.confirm('해당 내역을 삭제하시겠습니까?')) {
      setLeads(currentLeads => currentLeads.map(lead => 
        lead.id === id ? { ...lead, status: '삭제됨' as LeadStatus } : lead
      ));
    }
  };

  const CommonHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <header className="h-16 flex items-center px-4 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-xl z-50 w-full">
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h1 className="flex-1 text-center font-bold text-base tracking-tight text-slate-900">{title}</h1>
      <div className="w-10"></div>
    </header>
  );

  const SelectionCard = ({ label, isSelected, onClick, emoji, sub }: { label: string, isSelected: boolean, onClick: () => void, emoji?: string, sub?: string }) => (
    <button onClick={onClick} className={`w-full p-6 rounded-[2rem] border-2 transition-all text-left flex items-center justify-between group mb-4 shadow-sm ${isSelected ? 'border-blue-600 bg-blue-50/40 text-blue-700 ring-4 ring-blue-50' : 'border-slate-50 bg-white hover:border-slate-200 text-slate-700'}`}>
      <div className="flex items-center gap-4">
        {emoji && <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-white shadow-sm border border-slate-50 ${isSelected ? 'scale-110' : ''} transition-transform`}>{emoji}</div>}
        <div className="flex-1 min-w-0">
          <span className={`font-black text-lg block break-keep ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{label}</span>
          {sub && <span className="text-[12px] text-slate-400 font-bold block mt-1 leading-snug break-keep">{sub}</span>}
        </div>
      </div>
    </button>
  );

  const renderLandingView = () => (
    <div className="bg-white min-h-full">
      <nav className={`fixed top-0 w-full max-w-[480px] z-[100] transition-all duration-500 h-16 flex items-center px-6 justify-between ${isScrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm' : 'bg-transparent'}`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('LANDING')}>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-md"><svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h14v-8h3L12 2zm0 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg></div>
          <span className="font-black text-lg tracking-tighter text-gray-900 font-heading">누수 블랙박스</span>
        </div>
        <button onClick={startWizard} className="bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold text-[12px] shadow-lg shadow-blue-100 active:scale-95 transition-all">무료 진단</button>
      </nav>

      <section className="pt-24 pb-12 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-[10px] font-black text-blue-600 mb-5 uppercase tracking-widest font-heading">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
          누수 진단의 정석
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4 leading-[1.3] tracking-tight font-heading">
          누수,<br />
          내 상황에 맞는<br />
          <span className="text-blue-600">견적 알고</span> 상담 받자!
        </h1>
        <p className="text-gray-400 font-bold leading-relaxed keep-all mb-8 px-2 text-sm">
          수만 건 이상의 사건 분석을 통해 바가지 없는<br/>정확한 비용과 해결책을 안내드립니다.
        </p>
        <button 
          onClick={startWizard}
          className="w-full bg-blue-600 text-white py-5 rounded-[1.25rem] text-lg font-black shadow-xl shadow-blue-100 active:scale-95 flex items-center justify-center gap-3 font-heading group"
        >
          1분 무료 진단하기
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </section>

      <section className="px-6 pb-6">
        <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-50 group">
          <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200" alt="Modern House" className="w-full aspect-[4/3] object-cover transition-all duration-700" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[80%] bg-white/95 backdrop-blur-2xl p-5 rounded-[1.25rem] border border-white/50 text-center shadow-2xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.15em] font-heading">인공지능 정밀 진단</span>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-blue-100 rounded-full"></div>
              </div>
            </div>
            <p className="text-[14px] font-black text-slate-800 leading-snug keep-all">
              배관의 미세 균열이 감지되었습니다.<br/>
              <span className="text-blue-600 underline decoration-blue-200 decoration-2 underline-offset-4">온수 배관 점검</span>을 권장합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="px-10 py-10">
        <div className="grid grid-cols-2 gap-x-10 gap-y-12">
          <div className="flex flex-col">
            <span className="text-[26px] font-black text-blue-600 font-heading leading-none mb-2">154,200+</span>
            <span className="text-[12px] font-bold text-slate-400 break-keep">누적 진단 케이스</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[26px] font-black text-slate-900 font-heading leading-none mb-2">5.2만 건</span>
            <span className="text-[12px] font-bold text-slate-400 break-keep">불필요 공사 예방</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[26px] font-black text-slate-900 font-heading leading-none mb-2">92.4%</span>
            <span className="text-[12px] font-bold text-slate-400 break-keep">보험 청구 성공률</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[26px] font-black text-blue-600 font-heading leading-none mb-2">45초</span>
            <span className="text-[12px] font-bold text-slate-400 break-keep">평균 리포트 발행</span>
          </div>
        </div>
      </section>

      <section className="pt-20 pb-10 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full text-[10px] font-black text-blue-600 mb-5 font-heading">
          <span className="text-xs">★</span> 검증된 비용 절감 사례
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-5 font-heading">누수탐지 비용,<br/><span className="text-blue-600">이만큼</span> 절약했습니다</h2>
        
        <div className="space-y-5">
          {[
            { 
              title: "분석 리포트로 '온수관 단일 문제' 확신", 
              before: "120만원", after: "45만원", 
              saved: "75만원 절감",
              text: "누수 때문에 바닥을 다 뜯어야 한다고 했는데,\n진단 리포트를 보여주니 45만원에 끝났어요.", 
              user: "서울 강남구 이OO 님" 
            },
            { 
              title: "보험 적용 범위 및 적정 시세 가이드 활용", 
              before: "80만원", after: "30만원", 
              saved: "50만원 절감",
              text: "누수는 처음이라 막막했는데, 진단 리포트가 기준점이\n되어주었습니다. 업체 상담시 분석 내용을 이야기하니\n견적이 정상적인 수준으로 조정됐고, \n보험 보상 가이드도 큰 도움이 됐습니다.", 
              user: "경기 수원시 박OO 님" 
            }
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-[1.75rem] p-6 border border-slate-100 shadow-lg shadow-slate-200/50 text-left">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">P</div>
                <h4 className="font-bold text-slate-800 leading-tight keep-all text-base">{c.title}</h4>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between mb-6">
                 <div>
                    <p className="text-[9px] font-bold text-slate-300 uppercase mb-0.5">절감 전</p>
                    <p className="text-slate-400 font-bold text-base line-through">{c.before}</p>
                 </div>
                 <div className="w-px h-6 bg-slate-200"></div>
                 <div className="text-right">
                    <p className="text-[9px] font-bold text-blue-400 uppercase mb-0.5">절감 후</p>
                    <p className="text-slate-900 font-black text-xl font-heading">{c.after}</p>
                 </div>
              </div>
              <p className="text-slate-800 font-semibold leading-relaxed mb-8 italic keep-all text-[13px] whitespace-pre-wrap">{c.text}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[8px] font-black text-slate-400 uppercase">User</div>
                  <span className="text-slate-900 font-bold text-xs">{c.user}</span>
                </div>
                <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[9px] font-black">{c.saved}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="bg-blue-600 rounded-[3rem] p-12 text-center text-white shadow-[0_20px_40px_rgba(37,99,235,0.25)]">
           <h3 className="text-[22px] font-black mb-10 leading-snug tracking-tight font-heading break-keep">
             당신도 '분석 리포트'로<br/>
             비용을 아낄 수 있습니다
           </h3>
           <button onClick={startWizard} className="bg-white text-blue-600 px-10 py-5 rounded-full font-black text-[15px] active:scale-95 transition-all w-full max-w-[280px] shadow-lg shadow-blue-700/20">
             지금 무료 진단 리포트 받기
           </button>
        </div>
      </section>

      <footer className="pt-10 pb-16 px-8 text-left bg-slate-50">
        <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => navigateTo('LANDING')}>
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-md"><svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h14v-8h3L12 2zm0 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg></div>
          <span className="font-black text-lg tracking-tighter text-gray-900 font-heading">누수 블랙박스</span>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-16">
          <div>
            <h5 className="font-black text-slate-900 mb-4 text-[10px] uppercase tracking-widest">서비스</h5>
            <ul className="space-y-3 text-slate-400 font-bold text-[12px]">
              <li onClick={startWizard} className="cursor-pointer hover:text-blue-600 transition-colors">AI 정밀 자가진단</li>
              <li onClick={() => navigateTo('INSURANCE_GUIDE')} className="cursor-pointer hover:text-blue-600 transition-colors">보험 보상 가이드</li>
            </ul>
          </div>
          <div>
            <h5 className="font-black text-slate-900 mb-4 text-[10px] uppercase tracking-widest">고객 지원</h5>
            <ul className="space-y-3 text-slate-400 font-bold text-[12px]">
              <li onClick={() => window.open('http://pf.kakao.com/_CWzRX/chat', '_blank')} className="cursor-pointer hover:text-blue-600 transition-colors text-blue-600 font-black">카카오톡 문의하기</li>
              <li onClick={() => navigateTo('ADMIN_LOGIN')} className="cursor-pointer hover:text-blue-600 transition-colors">관리자 로그인</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );

  const renderWizardView = () => {
    const renderStep = () => {
      switch (step) {
        case 0:
          const isAllChecked = emergencyChecks.every(Boolean);
          return (
            <div className="step-transition">
              <div className="mb-10">
                <span className="inline-block px-3 py-1 bg-orange-100 text-orange-600 text-[10px] font-black rounded-full mb-3 uppercase tracking-wider">Safety First</span>
                <h2 className="text-[28px] font-black text-slate-900 font-heading leading-tight break-keep">응급 상황을 먼저 체크해주세요.</h2>
              </div>
              <div className="bg-orange-50/50 rounded-[2.5rem] p-8 mb-10 border border-orange-100 shadow-sm">
                <div className="space-y-7">
                  {[
                    { label: "전기 콘센트 주변에 물기가 있나요?", sub: "누전 및 감전 사고의 위험이 매우 높습니다." },
                    { label: "천장이 심하게 처져 보이나요?", sub: "갑작스러운 하중 증가로 인한 붕괴 위험이 있습니다." },
                    { label: "누전 차단기가 내려가나요?", sub: "이미 전기 계통에 문제가 발생한 상황입니다." }
                  ].map((item, i) => (
                    <label key={i} className="flex gap-4 items-start cursor-pointer group">
                      <div className="relative mt-1">
                        <input type="checkbox" checked={emergencyChecks[i]} onChange={(e) => {
                          const newChecks = [...emergencyChecks]; newChecks[i] = e.target.checked; setEmergencyChecks(newChecks);
                        }} className="w-7 h-7 rounded-xl border-2 border-orange-200 bg-white appearance-none cursor-pointer relative checked:bg-orange-500 transition-all shadow-sm after:content-[''] after:absolute after:top-[4px] after:left-[9px] after:w-2 after:h-4 after:border-white after:border-b-[4px] after:border-r-[4px] after:rotate-45 after:hidden checked:after:block" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-orange-950 font-black text-lg leading-snug break-keep ${emergencyChecks[i] ? 'line-through opacity-40' : ''}`}>{item.label}</p>
                        <p className="text-orange-400 font-bold text-[12px] mt-1 break-keep">{item.sub}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button disabled={!isAllChecked} onClick={handleNext} className={`w-full py-7 rounded-[2rem] font-black text-xl shadow-2xl transition-all font-heading ${isAllChecked ? 'bg-slate-900 text-white hover:bg-black active:scale-[0.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>모든 사항을 확인했습니다</button>
            </div>
          );
        case 1:
          return (
            <div className="step-transition">
              <div className="mb-10">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black rounded-full mb-3 uppercase tracking-wider">Step 01</span>
                <h2 className="text-[28px] font-black text-slate-900 font-heading leading-tight break-keep">누수가 발생한 위치는?</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(LOCATION_LABELS).map(([key, label]) => {
                  const emojiMap: any = { CEILING: '🏠', WALL: '🧱', FLOOR: '🪜', BOILER: '♨️', VERANDA: '🪟', ROOF: '🏚️', UNKNOWN: '❓' };
                  return (
                    <SelectionCard key={key} label={label} emoji={emojiMap[key]} isSelected={data.location === key} onClick={() => { setData({...data, location: key as any}); handleNext(); }} />
                  );
                })}
              </div>
            </div>
          );
        case 7:
          return (
            <div className="step-transition">
              <div className="mb-10 text-left">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black rounded-full mb-3 uppercase tracking-wider">Step 07</span>
                <h2 className="text-[28px] font-black text-slate-900 font-heading leading-tight break-keep">누수 피해 규모가 어느 정도인가요?</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 {[
                   { key: 'SMALL', label: '미세함 (번짐/습기)', sub: '벽지가 젖어있거나 곰팡이가 피는 정도' },
                   { key: 'MEDIUM', label: '보통 (규칙적인 낙수)', sub: '물방울이 맺혀서 조금씩 떨어지는 상태' },
                   { key: 'LARGE', label: '심각함 (쏟아짐/고임)', sub: '물이 계속 쏟아지거나 바닥에 고이는 상태' }
                 ].map((item) => (
                    <SelectionCard 
                      key={item.key} 
                      label={item.label} 
                      sub={item.sub}
                      isSelected={data.additionalInfo.leakSize === item.key} 
                      onClick={() => { 
                        setData({
                          ...data, 
                          additionalInfo: { ...data.additionalInfo, leakSize: item.key as any }
                        }); 
                        handleNext(); 
                      }} 
                    />
                 ))}
              </div>
            </div>
          );
        case 8:
          return (
            <div className="step-transition">
              <div className="mb-10 text-left">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black rounded-full mb-3 uppercase tracking-wider">Step 08</span>
                <h2 className="text-[28px] font-black text-slate-900 font-heading leading-tight break-keep">추가로 전달하고 싶은 내용이 있다면 적어주세요 (선택)</h2>
              </div>
              <textarea 
                value={data.extraNote}
                onChange={(e) => setData({...data, extraNote: e.target.value})}
                placeholder="예: 아래층 천장에 물이 조금씩 번지고 있어요. 며칠 전부터 시작된 것 같아요."
                className="w-full h-40 p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-900 outline-none text-base resize-none mb-8"
              />
              <button onClick={handleNext} className="w-full py-6 rounded-[2rem] bg-blue-600 text-white font-black text-xl shadow-xl shadow-blue-100 active:scale-95 transition-all">다음 단계로</button>
            </div>
          );
        case 9:
          return (
            <div className="step-transition text-center">
              <div className="mb-10 text-left">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-black rounded-full mb-3 uppercase tracking-wider">Final Step</span>
                <h2 className="text-[28px] font-black font-heading leading-tight break-keep">현장 사진을 업로드해주세요.</h2>
              </div>
              
              {photoError && (
                <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-[2rem] text-red-600 text-[13px] font-black leading-relaxed text-left animate-slideUp">
                  <div className="flex items-center gap-2 mb-2 font-black text-base">
                    <span>⚠️</span> 안내
                  </div>
                  {photoError}
                </div>
              )}

              <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" id="photo-upload" />
              
              <div className="grid grid-cols-2 gap-4 mb-12">
                {data.photos.map((p, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={p} className="w-full h-full object-cover rounded-3xl shadow-xl ring-4 ring-white" alt="Preview" />
                    <button 
                      onClick={(e) => { e.preventDefault(); removePhoto(i); }}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all z-10 active:scale-90"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
                {data.photos.length < 6 && (
                  <label htmlFor="photo-upload" className="aspect-square border-4 border-dashed border-slate-100 rounded-3xl cursor-pointer flex flex-col items-center justify-center bg-slate-50/50 hover:bg-white transition-all group relative overflow-hidden">
                    <div className="w-12 h-12 bg-white text-blue-500 rounded-2xl flex items-center justify-center text-2xl shadow-md mb-2">📸</div>
                    <span className="font-black text-slate-400 text-xs">사진 추가</span>
                  </label>
                )}
              </div>

              <button disabled={data.photos.length === 0} onClick={handleAnalyze} className={`w-full py-8 rounded-[2rem] font-black text-2xl shadow-2xl transition-all font-heading ${data.photos.length > 0 ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                무료 정밀 분석 시작
              </button>
            </div>
          );
        default:
          let title = "";
          let labels: Record<string, string> = {};
          let currentKey = "";
          if (step === 2) { title = "누수 빈도는 어떠한가요?"; labels = FREQUENCY_LABELS; currentKey = "frequency"; }
          else if (step === 3) { title = "위층 거주 여부를 알려주세요."; labels = {YES:'네, 위층에 다른 세대가 있습니다', NO:'아니오, 최상층이거나 단독 건물입니다', UNKNOWN:'정확히 모르겠습니다'}; currentKey = "upperFloorPossibility"; }
          else if (step === 4) { title = "과거 수리 이력이 있으신가요?"; labels = HISTORY_LABELS; currentKey = "repairHistory"; }
          else if (step === 5) { title = "건물 유형을 선택해주세요."; labels = BUILDING_TYPE_LABELS; currentKey = "buildingType"; }
          else if (step === 6) { title = "나타나는 증상을 선택해주세요."; labels = SYMPTOM_LABELS; currentKey = "symptoms"; }

          return (
             <div className="step-transition">
                <div className="mb-10 text-left"><h2 className="text-[28px] font-black text-slate-900 font-heading leading-tight break-keep">{title}</h2></div>
                <div className="grid grid-cols-1 gap-4">
                   {Object.entries(labels).map(([key, label]) => (
                      <SelectionCard key={key} label={label} isSelected={step === 6 ? data.symptoms.includes(key as any) : data[currentKey as keyof WizardData] === key} onClick={() => { 
                        if (step === 6) {
                          setData({...data, symptoms: data.symptoms.includes(key as any) ? data.symptoms.filter(s => s !== key) : [...data.symptoms, key as any]});
                        } else {
                          setData({...data, [currentKey]: key as any}); handleNext();
                        }
                      }} />
                   ))}
                </div>
                {step === 6 && <button onClick={handleNext} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl mt-8">다음 단계로</button>}
             </div>
          );
      }
    };

    return (
      <div className="min-h-full bg-white">
        <header className="h-20 flex items-center px-6 border-b border-gray-50 sticky top-0 bg-white/90 backdrop-blur-xl z-50">
           <button onClick={handleWizardBack} className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-2xl text-slate-500 hover:bg-slate-200 transition-colors"><svg className="w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg></button>
           <div className="flex-1 px-8">
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(37,99,235,0.4)]" style={{ width: `${Math.round((step + 1) / 10 * 100)}%` }}></div>
              </div>
           </div>
        </header>
        <div className="pt-10 px-8 pb-24">{renderStep()}</div>
      </div>
    );
  };

  const renderResultView = () => {
    if (!result) return null;
    return (
      <div className="min-h-full bg-slate-50 relative">
        <CommonHeader title="정밀 분석 리포트" onBack={goBack} />
        <div className="px-6 py-8 pb-32">
          {/* 상단 요약 섹션 */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 mb-8 border border-slate-100 text-center relative">
            <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-6 inline-block">AI ANALYSIS REPORT</span>
            <div className="text-5xl font-black font-heading text-slate-900 mb-4">{result.riskScore}%</div>
            <h3 className="text-xl font-black text-slate-900 mb-2 font-heading tracking-tight break-keep">{result.riskScore > 70 ? '바가지 위험 높음' : '안전한 견적 범위'}</h3>
            <p className="text-slate-600 text-[15px] font-medium leading-relaxed break-keep whitespace-pre-wrap text-left bg-slate-50/80 p-5 rounded-2xl border border-slate-100">{result.summary}</p>
          </div>

          {/* 견적 섹션 (직관적인 경고 강화) */}
          <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white p-6 rounded-[2rem] border-2 border-emerald-50 shadow-sm text-center flex flex-col justify-center min-h-[140px]">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm">✓</div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">분석 예상 탐지비</p>
                <p className="text-lg font-black text-slate-900 font-heading break-keep leading-snug">{result.detectionCost}</p>
                <p className="text-[10px] text-emerald-500 font-bold mt-1 break-keep">상황별 권장 가격</p>
              </div>
              <div className="bg-red-50 p-6 rounded-[2rem] border-2 border-red-100 shadow-md text-center flex flex-col justify-center min-h-[140px]">
                <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2 text-sm animate-pulse">⚠️</div>
                <p className="text-[10px] font-black text-red-500 uppercase mb-2 tracking-widest">바가지 위험 경보</p>
                <p className="text-lg font-black text-red-700 font-heading break-keep leading-snug">{result.overchargeThreshold}</p>
                <p className="text-[10px] text-red-400 font-bold mt-1 break-keep">이 이상은 과다 견적</p>
              </div>
          </div>

          {/* 유료 상세 리포트 영역 */}
          <div className="relative mb-24">
             <div className={`transition-all duration-700 ${!isPaid ? 'blur-2xl opacity-20 pointer-events-none max-h-[400px] overflow-hidden' : ''}`}>
               {/* 원인 분석 섹션 */}
               <div className="bg-white rounded-[2.5rem] p-8 shadow-xl mb-8 border border-slate-100">
                <h3 className="text-lg font-black mb-6 text-slate-900 font-heading flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                  AI 예측 원인 분석
                </h3>
                <div className="space-y-4">
                  {result.causes.map((cause, idx) => (
                    <div key={idx} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-50">
                       <div className="flex items-center justify-between mb-3">
                          <h5 className="font-black text-slate-800 break-keep">{cause.title}</h5>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${PROBABILITY_COLORS[cause.probability] || ''}`}>{PROBABILITY_LABELS[cause.probability] || ''}</span>
                       </div>
                       <p className="text-slate-500 text-xs font-bold leading-relaxed break-keep whitespace-pre-wrap">{cause.description}</p>
                    </div>
                  ))}
                </div>
               </div>

               {/* 전문가 상세 가이드 (UI 직관적 개선) */}
               <div className="bg-white rounded-[3rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] mb-8 border-t-8 border-blue-600 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-100">★</div>
                    <h3 className="text-2xl font-black text-slate-900 font-heading">전문가 상세 솔루션</h3>
                  </div>
                  <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 mb-8">
                     <p className="text-blue-900 font-semibold whitespace-pre-wrap leading-[1.8] text-[15px] break-keep">{result.expertGuide}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-black text-blue-500 uppercase tracking-widest">
                    <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                    Premium Expert Insights
                  </div>
               </div>

               {/* 업체 대응 전략 섹션 */}
               <div className="bg-white rounded-[2.5rem] p-8 shadow-xl mb-12 border border-slate-100">
                  <h3 className="text-lg font-black mb-8 text-slate-900 font-heading flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-600 rounded-full"></span>
                    업체 선정 및 대처법 (Q&A)
                  </h3>
                  <div className="space-y-6">
                    {result.scamCheckQuestions.map((qText, i) => {
                      const parts = qText.split('|');
                      return (
                        <div key={i} className="border-b border-slate-100 pb-6 last:border-0">
                           <div className="flex gap-3 mb-4">
                              <span className="text-blue-600 font-black text-lg">Q.</span>
                              <p className="font-black text-slate-900 leading-snug break-keep text-[15px]">{parts[0]?.replace('질문:', '').trim()}</p>
                           </div>
                           <div className="bg-red-50 p-4 rounded-2xl mb-3 flex gap-3">
                              <div className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px] mt-0.5 shrink-0">!</div>
                              <p className="text-red-900 text-xs font-bold leading-relaxed break-keep">{parts[1]?.replace('위험답변:', '').trim()}</p>
                           </div>
                           <div className="bg-slate-50 p-4 rounded-2xl flex gap-3">
                              <div className="w-5 h-5 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-[10px] mt-0.5 shrink-0">?</div>
                              <p className="text-slate-600 text-xs font-medium leading-relaxed break-keep">{parts[2]?.replace('판단근거:', '').trim()}</p>
                           </div>
                        </div>
                      )
                    })}
                  </div>
               </div>
             </div>

             {/* 잠금 해제 안내 화면 */}
             {!isPaid && (
               <div className="absolute top-0 inset-x-0 bottom-0 flex flex-col items-center justify-start pt-16 p-6 z-10">
                 <div className="bg-white/95 backdrop-blur-3xl p-10 rounded-[3.5rem] shadow-2xl border-2 border-blue-100 text-center w-full sticky top-32">
                    <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6">🔒</div>
                    <h4 className="text-[22px] font-black text-slate-900 mb-4 font-heading tracking-tight break-keep">상세 정밀 리포트 잠금 해제</h4>
                    <p className="text-slate-500 font-bold mb-10 text-[13px] break-keep">현실적인 원인 분석과 전문가 대응 전략을 확인하고 수백만원의 피해를 예방하세요.</p>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => {
                          setHasClickedChannel(false); // 모달 열기 전 초기화
                          setIsPaymentModalOpen(true);
                        }} 
                        className="w-full bg-[#FEE500] text-[#191919] py-6 rounded-[2rem] font-black text-lg shadow-xl shadow-yellow-100 transition-all font-heading active:scale-95 flex items-center justify-center gap-2"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 3.134-9 7 0 2.383 1.513 4.47 3.845 5.72-.15.524-.54 1.884-.618 2.164-.097.35.12.345.253.256.104-.07 1.656-1.127 2.316-1.574.39.055.79.084 1.204.084 4.97 0 9-3.134 9-7s-4.03-7-9-7z"/></svg>
                        채널 추가하고 무료로 읽기
                      </button>
                      <button onClick={() => navigateTo('CONSULTATION')} className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-bold text-sm transition-all active:scale-95">업체 무료상담 먼저 받기</button>
                    </div>
                 </div>
               </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4 sticky bottom-8 z-[100] mt-12 bg-slate-50/80 backdrop-blur-md p-4 -mx-4 rounded-t-3xl border-t border-slate-200/50">
             <button onClick={startWizard} className="bg-[#0f172a] text-white py-6 rounded-[2rem] font-black text-lg shadow-xl active:scale-95">다시 진단</button>
             <button onClick={() => navigateTo('CONSULTATION')} className="bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-blue-200 active:scale-95">상담 접수</button>
          </div>
        </div>
      </div>
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setPhotoError(null); // 새로운 파일 업로드 시 에러 초기화
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setData(prev => ({ ...prev, photos: [...prev.photos, reader.result as string] }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <div className="flex justify-center min-h-screen">
      <div id="mobile-container" className="w-full max-w-[480px] bg-white h-screen overflow-y-auto relative scroll-smooth selection:bg-blue-100 selection:text-blue-900">
        {view === 'LANDING' && renderLandingView()}
        {view === 'WIZARD' && renderWizardView()}
        {view === 'RESULT' && renderResultView()}
        {view === 'LOADING' && (
          <div className="min-h-full bg-white flex flex-col items-center justify-center p-10 text-center">
            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-10"></div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 font-heading tracking-tight break-keep">AI 정밀 분석 중</h2>
            <p className="text-slate-500 font-bold text-sm break-keep">현장 데이터와 증상을 심층 분석하여 현실적인 리포트를 생성하고 있습니다.</p>
          </div>
        )}
        {view === 'CONSULTATION' && (
          <div className="min-h-full bg-slate-50 relative">
            <CommonHeader title="업체 상담 신청" onBack={goBack} />
            <div className="px-6 py-8 pb-32">
              <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 mb-8 border border-slate-100">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">📩</div>
                <h3 className="text-xl font-black mb-3 font-heading text-slate-900">상담 정보 입력</h3>
                <p className="text-slate-500 font-bold mb-8 text-[12px] leading-relaxed keep-all">전문 업체가 분석 리포트를 검토한 후{"\n"}정확한 견적 상담을 위해 연락드립니다.</p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest px-1">연락처</label>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={handlePhoneChange} 
                      maxLength={13}
                      placeholder="010-0000-0000" 
                      className="w-full p-5 bg-slate-50 rounded-[1.25rem] border-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-900 outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest px-1">방문 희망 지역</label>
                    <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="예: 부산시 금정구 금강로" className="w-full p-5 bg-slate-50 rounded-[1.25rem] border-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-900 outline-none text-sm" />
                  </div>
                </div>
              </div>
              <button 
                disabled={isSending}
                onClick={async () => {
                  if(!phone || !region) { alert('연락처와 지역을 입력해주세요.'); return; }
                  
                  // 휴대폰 번호 형식 유효성 검사 (010-0000-0000)
                  const phoneRegex = /^010-\d{3,4}-\d{4}$/;
                  if (!phoneRegex.test(phone)) {
                    alert('연락처 형식을 확인해주세요. (010-0000-0000)');
                    return;
                  }

                  setIsSending(true);
                  try {
                    // Local Leads 업데이트
                    setLeads(prev => [{ id: Date.now(), date: new Date().toLocaleString(), region, phone, status: '미확인' }, ...prev]);
                    
                    // 이메일 전송 (공개키를 직접 전달하여 초기화 누락 방지)
                    await emailjs.send(
                      EMAILJS_CONFIG.SERVICE_ID,
                      EMAILJS_CONFIG.TEMPLATE_ID,
                      {
                        region: region,
                        phone: phone,
                        date: new Date().toLocaleString(),
                        message: "누수 블랙박스에 새로운 상담 요청이 접수되었습니다."
                      },
                      EMAILJS_CONFIG.PUBLIC_KEY
                    );
                    
                    alert('상담 신청이 완료되었습니다. 관리자가 확인 후 곧 연락드리겠습니다.');
                    navigateTo('LANDING');
                  } catch (err) {
                    console.error("Submission error:", err);
                    alert('상담 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                  } finally {
                    setIsSending(false);
                  }
                }} 
                className={`w-full ${isSending ? 'bg-slate-400 animate-pulse cursor-not-allowed' : 'bg-blue-600 active:scale-95'} text-white py-6 rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-200 transition-all font-heading`}
              >
                {isSending ? '전송 중...' : '상담 신청하기'}
              </button>
            </div>
          </div>
        )}
        {view === 'INSURANCE_GUIDE' && (
          <div className="min-h-full bg-white relative">
            <CommonHeader title="보험 보상 가이드" onBack={goBack} />
            <div className="px-6 py-8">
              <h2 className="text-2xl font-black text-slate-900 mb-8 font-heading leading-tight break-keep">누수 피해,{"\n"}<span className="text-emerald-600">보험</span>으로 해결하세요</h2>
              <p className="text-slate-500 font-medium leading-relaxed keep-all text-sm mb-5">아랫집 피해 복구 및 수리비 보상이 가능합니다. 정확한 내용은 약관 확인이 필요합니다.</p>
            </div>
          </div>
        )}
        {view === 'ADMIN_LOGIN' && (
          <div className="min-h-full bg-slate-50 relative">
            <CommonHeader title="관리자 시스템 로그인" onBack={goBack} />
            <div className="px-8 py-16">
              <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100">
                <form onSubmit={handleAdminLogin} className="space-y-8">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest px-1">Identity</label>
                    <input type="text" value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="ID" className="w-full p-6 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-blue-100 transition-all font-black text-slate-900 outline-none text-lg" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-3 uppercase tracking-widest px-1">Security Key</label>
                    <input type="password" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} placeholder="Password" className="w-full p-6 bg-slate-50 rounded-2xl border-none focus:ring-4 focus:ring-blue-100 transition-all font-black text-slate-900 outline-none text-lg" />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white py-7 rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-all font-heading">인증 및 접속</button>
                </form>
              </div>
            </div>
          </div>
        )}
        {view === 'ADMIN_DASHBOARD' && (
          <div className="min-h-full bg-slate-100 relative">
            <header className="h-16 flex items-center px-6 bg-slate-900 text-white sticky top-0 z-50 justify-between">
               <h1 className="font-black font-heading text-lg">ADMIN CENTER</h1>
               <button onClick={() => setView('LANDING')} className="text-xs font-bold bg-slate-800 px-3 py-1 rounded">로그아웃</button>
            </header>
            <div className="p-6">
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar">
                {(['미확인', '상담중', '완료', '삭제됨'] as LeadStatus[]).map(status => (
                  <button 
                    key={status} 
                    onClick={() => setAdminFilter(status)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-black transition-all shadow-sm ${
                      adminFilter === status ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'
                    }`}
                  >
                    {status} ({leads.filter(l => l.status === status).length})
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                {leads.filter(lead => lead.status === adminFilter).map(lead => (
                  <div key={lead.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                     <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black text-slate-400">{lead.date}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${lead.status === '완료' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{lead.status}</span>
                     </div>
                     <p className="text-lg font-black text-slate-900 mb-1">{lead.region}</p>
                     <p className="text-sm font-bold text-blue-600 mb-6">{lead.phone}</p>
                     <div className="flex gap-2 border-t border-slate-50 pt-4">
                        <button onClick={() => updateLeadStatus(lead.id, '상담중')} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black">상담중</button>
                        <button onClick={() => updateLeadStatus(lead.id, '완료')} className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black">완료</button>
                        <button onClick={() => deleteLead(lead.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black ml-auto">삭제</button>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {isPaymentModalOpen && (
          <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-8">
            <div className="bg-white w-full rounded-[3rem] overflow-hidden shadow-2xl p-10 animate-slideUp text-center">
               <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">💬</div>
               <h5 className="text-xl font-black font-heading tracking-tight mb-4 break-keep">채널 추가 후 확인을 눌러주세요</h5>
               <p className="text-slate-500 font-bold mb-8 text-sm break-keep">리포트 무료 열람을 위해 '누수 블랙박스' 카카오 채널 추가가 필요합니다.</p>
               <div className="space-y-4">
                  <a 
                    href={KAKAO_CHANNEL_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => setHasClickedChannel(true)} // 링크 클릭 추적
                    className="block w-full p-6 rounded-[1.5rem] bg-[#FEE500] text-[#191919] font-black text-lg active:scale-95 transition-transform"
                  >
                    1. 채널 추가하러 가기
                  </a>
                  <button 
                    disabled={!hasClickedChannel} // 링크 클릭 전까지 비활성화
                    onClick={() => {
                      setIsPaymentModalOpen(false); 
                      setIsPaid(true);
                      alert('채널 추가 확인이 완료되었습니다. 리포트가 공개되었습니다.');
                    }} 
                    className={`w-full p-6 rounded-[1.5rem] font-black text-lg transition-all ${
                      hasClickedChannel ? 'bg-slate-900 text-white active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    2. 추가 완료 (리포트 열기)
                  </button>
                  <button onClick={() => setIsPaymentModalOpen(false)} className="w-full p-4 text-slate-400 font-bold">취소</button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
