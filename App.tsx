
import React, { useState, useEffect } from 'react';
import { WizardData, AnalysisResult } from './types';
import { analyzeLeakage } from './geminiService';
import { 
  LOCATION_LABELS, SYMPTOM_LABELS, TIMING_LABELS, 
  BUILDING_TYPE_LABELS, BUILDING_AGE_LABELS, 
  PROBABILITY_COLORS, PROBABILITY_LABELS 
} from './constants';

const INITIAL_WIZARD_DATA: WizardData = {
  safetyChecked: false,
  location: '',
  symptoms: [],
  timing: '',
  buildingType: '',
  buildingAge: '',
  upperFloorPossibility: '',
  additionalInfo: {
    airconUsed: false,
    recentRenovation: false,
    hotWaterWorsens: false,
    rainWorsens: false,
    leakSize: '',
  },
  photos: []
};

const App: React.FC = () => {
  type ViewState = 'LANDING' | 'WIZARD' | 'LOADING' | 'RESULT' | 'CONSULTATION' | 'ADMIN_LOGIN' | 'SERVICE_GUIDE' | 'INSURANCE_GUIDE' | 'BUSINESS_PROPOSAL';
  const [view, setView] = useState<ViewState>('LANDING');
  const [history, setHistory] = useState<ViewState[]>([]); 
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_WIZARD_DATA);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [consultForm, setConsultForm] = useState({ phone: '', region: '' });
  const [isConsulted, setIsConsulted] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigateTo = (next: ViewState) => {
    setHistory(prev => [...prev, view]);
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(prevH => prevH.slice(0, -1));
      setView(prev);
    } else {
      setView('LANDING');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startWizard = () => {
    setData(INITIAL_WIZARD_DATA);
    setStep(0);
    setIsConsulted(false);
    navigateTo('WIZARD');
  };

  const handleNext = () => {
    if (step < 5) setStep(prev => prev + 1);
    else handleAnalyze();
    window.scrollTo(0, 0);
  };

  const handleWizardBack = () => {
    if (step > 0) setStep(prev => prev - 1);
    else goBack();
    window.scrollTo(0, 0);
  };

  const handleAnalyze = async () => {
    if (!process.env.API_KEY) {
      alert("서비스 설정 오류: API 키가 누락되었습니다.");
      setView('LANDING');
      return;
    }

    navigateTo('LOADING');
    try {
      const analysis = await analyzeLeakage(data);
      setResult(analysis);
      setView('RESULT'); 
    } catch (err: any) {
      alert(`분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`);
      setView('WIZARD');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      fileArray.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result;
          if (typeof res === 'string') {
            setData(prev => ({ ...prev, photos: [...prev.photos, res] }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const CommonHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <header className="h-16 md:h-24 flex items-center px-4 md:px-10 border-b border-gray-100 sticky top-0 glass z-50 w-full">
      <button onClick={onBack} className="w-9 h-9 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-gray-50 text-gray-400 hover:text-black transition-all">
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h1 className="flex-1 text-center font-bold text-base md:text-xl tracking-tight px-2 overflow-hidden text-ellipsis whitespace-nowrap">{title}</h1>
      <div className="w-9 md:w-12"></div>
    </header>
  );

  const renderLandingView = () => (
    <div className="min-h-screen bg-white">
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${isScrolled ? 'h-14 md:h-20 glass border-b border-gray-100' : 'h-16 md:h-24 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => setView('LANDING')}>
            <div className="w-8 h-8 md:w-11 md:h-11 bg-black rounded-lg md:rounded-2xl flex items-center justify-center shadow-2xl shadow-gray-200 group-hover:scale-105 transition-transform duration-500">
               <svg className="w-5 h-5 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h14v-8h3L12 2zm0 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
            </div>
            <span className="font-black text-lg md:text-2xl tracking-tighter text-gray-900 font-heading">누수 블랙박스</span>
          </div>
          <div className="hidden md:flex items-center gap-12 text-[15px] font-bold text-gray-400">
            <button onClick={() => navigateTo('SERVICE_GUIDE')} className="hover:text-blue-600 transition-colors">이용 안내</button>
            <button onClick={() => navigateTo('CONSULTATION')} className="hover:text-blue-600 transition-colors">업체 매칭</button>
            <button onClick={startWizard} className="bg-gray-900 text-white px-10 py-4 rounded-2xl hover:bg-black transition-all shadow-2xl shadow-gray-200 active:scale-95">무료 진단</button>
          </div>
          <button onClick={startWizard} className="md:hidden bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold text-[13px] shadow-lg active:scale-95">무료 진단</button>
        </div>
      </nav>

      <section className="relative pt-24 md:pt-60 pb-16 md:pb-40 px-5 md:px-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-50/30 -skew-x-12 translate-x-32 hidden lg:block"></div>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 md:gap-24 items-center text-center lg:text-left">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-blue-100/50 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full text-[9px] md:text-[12px] font-black text-blue-700 mb-6 md:mb-10 uppercase tracking-[0.2em] font-heading">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              누수 진단의 정석
            </div>
            <h1 className="text-3xl md:text-[4.8rem] font-black text-slate-900 mb-6 md:mb-10 leading-[1.3] md:leading-[1.1] tracking-tight font-heading">
              누수,<br />
              내 상황에 맞는<br/>
              <span className="text-gradient">견적 알고</span> 상담 받자!
            </h1>
            <p className="text-base md:text-2xl text-slate-400 mb-8 md:mb-14 leading-relaxed max-w-lg mx-auto lg:mx-0 font-medium">
              수만 건 이상의 사건 분석을 통해 바가지 없는<br/>정확한 비용과 해결책을 안내드립니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center lg:justify-start">
              <button 
                onClick={startWizard}
                className="bg-blue-600 text-white py-4 md:py-6 px-8 md:px-16 rounded-2xl md:rounded-[2.5rem] text-lg md:text-2xl font-black hover:bg-blue-700 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 font-heading"
              >
                1분 무료 진단하기
                <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </div>
          <div className="relative mt-12 lg:mt-0">
            <div className="relative w-full max-w-[340px] md:max-w-[540px] mx-auto">
              <div className="absolute -top-6 -left-6 w-24 md:w-40 h-24 md:h-40 bg-blue-100 rounded-full blur-[40px] md:blur-[80px] opacity-60"></div>
              <div className="bg-white rounded-[2.5rem] md:rounded-[4.5rem] shadow-xl border border-slate-100 p-2 md:p-4 transform rotate-1 md:rotate-2 hover:rotate-0 transition-transform duration-1000">
                <img 
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200" 
                  alt="Modern Professional Interior" 
                  className="rounded-[2rem] md:rounded-[3.8rem] w-full aspect-[4/5] object-cover"
                />
                <div className="absolute bottom-6 md:bottom-12 left-4 md:left-8 right-4 md:right-8 floating">
                  <div className="glass p-4 md:p-8 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl border border-white/50">
                    <div className="flex items-center justify-between mb-3 md:mb-6">
                      <div className="text-[8px] md:text-[11px] font-black uppercase text-blue-600 tracking-[0.2em] font-heading">인공지능 정밀 진단</div>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-blue-600 rounded-full"></div>
                        <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="text-[13px] md:text-[18px] font-bold text-slate-800 leading-snug">
                      배관의 미세 균열이 감지되었습니다.<br/>
                      <span className="text-blue-600">온수 배관 점검</span>을 권장합니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24 px-5 md:px-8 border-y border-gray-50 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-12 text-center font-heading">
           {[
             { label: "누적 진단 케이스", value: "154,200+", color: "text-blue-600" },
             { label: "불필요 공사 예방", value: "5.2만 건", color: "text-slate-900" },
             { label: "보험 청구 성공률", value: "92.4%", color: "text-slate-900" },
             { label: "평균 리포트 발행", value: "45초", color: "text-blue-600" }
           ].map((stat, i) => (
             <div key={i} className="flex flex-col gap-1 md:gap-3 group">
               <span className={`text-xl md:text-5xl font-black ${stat.color} tracking-tighter group-hover:scale-110 transition-transform duration-500`}>{stat.value}</span>
               <span className="text-[9px] md:text-[12px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
             </div>
           ))}
        </div>
      </section>

      <section className="py-16 md:py-40 px-5 md:px-8 bg-gray-50/50 overflow-hidden relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-28">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 md:px-6 py-1.5 md:py-2 rounded-full text-[9px] md:text-[12px] font-black uppercase tracking-[0.4em] mb-4 md:mb-8 font-heading">
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              검증된 비용 절감 사례
            </div>
            <h3 className="text-2xl md:text-[4.2rem] font-black text-slate-900 leading-[1.3] md:leading-[1.1] tracking-tight mb-4 md:mb-8">누수탐지 비용,<br /><span className="text-blue-600">이만큼</span> 절약했습니다</h3>
            <p className="text-slate-400 text-sm md:text-2xl font-bold max-w-2xl mx-auto leading-relaxed">
              정보가 없어 당할 뻔한 과다 견적,<br/>
              분석 리포트 하나로 정직하게 해결한 실제 사례입니다.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 md:gap-12">
            {[
              { 
                before: "120만원", after: "45만원", saving: "75만원 절감", 
                reason: "분석 리포트로 '온수관 단일 문제' 확신", 
                review: "누수 때문에 바닥을 다 뜯어야 한다고\n했는데, 진단 리포트를 보여주니\n45만원에 끝났어요.", 
                user: "서울 강남구 이OO 님" 
              },
              { 
                before: "80만원", after: "30만원", saving: "50만원 절감", 
                reason: "보험 적용 범위 및 적정 시세 가이드 활용", 
                review: "누수는 처음이라 막막했는데,\n진단 리포트가 기준점이 되어주었습니다.\n업체 상담 시 분석 내용을 이야기하니\n견적이 정상적인 수준으로 조정됐고,\n보험 보상 가이드도 큰 도움이 됐습니다.", 
                user: "경기 수원시 박OO 님" 
              },
              { 
                before: "210만원", after: "85만원", saving: "125만원 절감", 
                reason: "불필요한 전체 관로 교체 차단", 
                review: "건물이 오래됐다는 이유로\n전체 교체를 권유받았지만,\n진단 리포트를 받아보니, \n부분 수리만으로 충분했습니다.\n실제로 문제없이 해결됐고\n데이터가 왜 필요한지 확실히 느꼈습니다.", 
                user: "인천 미추홀구 김OO 님" 
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[4.5rem] shadow-xl md:shadow-2xl border border-white hover:-translate-y-2 transition-all duration-500 group">
                <div className="flex flex-col gap-4 md:gap-6 mb-6 md:mb-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-600 rounded-lg md:rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <span className="text-blue-600 font-black text-[13px] md:text-lg tracking-tight">{item.reason}</span>
                  </div>
                  <div className="flex items-end gap-3 md:gap-4 bg-gray-50 p-5 md:p-8 rounded-[1.5rem] md:rounded-[3rem]">
                    <div className="flex-1">
                      <p className="text-[8px] md:text-[11px] font-black text-gray-400 uppercase tracking-widest mb-0.5 font-heading">절감 전</p>
                      <p className="text-base md:text-2xl font-bold text-gray-400 line-through decoration-red-400/50">{item.before}</p>
                    </div>
                    <div className="w-px h-6 md:h-10 bg-gray-200"></div>
                    <div className="flex-1">
                      <p className="text-[8px] md:text-[11px] font-black text-blue-600 uppercase tracking-widest mb-0.5 font-heading">절감 후</p>
                      <p className="text-lg md:text-3xl font-black text-slate-900">{item.after}</p>
                    </div>
                  </div>
                </div>
                <p className="text-slate-500 text-[14px] md:text-lg font-bold leading-relaxed mb-6 italic whitespace-pre-line">{item.review}</p>
                <div className="pt-5 md:pt-8 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-100 flex items-center justify-center text-[7px] md:text-[10px] font-black text-slate-400">후기</div>
                    <span className="text-slate-900 font-black text-[11px] md:text-sm">{item.user}</span>
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 px-3 md:px-4 py-1 rounded-full text-[9px] md:text-[12px] font-black">
                    {item.saving}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 md:mt-28 p-8 md:p-16 bg-blue-600 rounded-[2rem] md:rounded-[4rem] text-center relative overflow-hidden shadow-2xl">
            <h4 className="text-xl md:text-4xl font-black text-white mb-6 md:mb-8 tracking-tight">당신도 '분석 리포트'로<br />비용을 아낄 수 있습니다</h4>
            <button onClick={startWizard} className="bg-white text-blue-600 py-4 md:py-6 px-10 md:px-16 rounded-full text-base md:text-xl font-black hover:bg-gray-50 transition-all shadow-lg active:scale-95">지금 무료 진단 리포트 받기</button>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-40 px-5 md:px-8 bg-slate-900 relative overflow-hidden text-center">
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-6xl font-black text-white mb-6 md:mb-10 leading-tight font-heading">지금 바로 누수 진단하고,<br />정확한 해결책을 확인하세요!</h2>
          <p className="text-slate-400 text-sm md:text-xl mb-10 md:mb-16 font-bold">복잡한 원인 파악, 1분이면 충분!<br/>명확한 해결책과 정확한 견적을 알려드립니다.</p>
          <button onClick={startWizard} className="bg-white text-slate-900 py-4 md:py-7 px-10 md:px-20 rounded-full text-lg md:text-2xl font-black hover:bg-gray-100 transition-all shadow-2xl active:scale-95">무료 진단 시작하기</button>
        </div>
      </section>

      <footer className="bg-white py-16 md:py-36 px-5 md:px-8 text-gray-400 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-32 mb-16 md:mb-32">
            <div>
              <div className="flex items-center gap-2 mb-6 md:mb-10">
                <div className="w-8 h-8 md:w-11 md:h-11 bg-black rounded-lg md:rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 md:w-7 md:h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h14v-8h3L12 2zm0 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
                </div>
                <span className="font-black text-slate-900 text-lg md:text-2xl tracking-tighter font-heading">누수 블랙박스</span>
              </div>
              <p className="max-w-md text-sm md:text-xl leading-relaxed font-bold text-gray-400">우리는 기술과 빅데이터를 통해 누수 해결의 새로운 기준을 제시합니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-4 md:gap-8">
                <h5 className="text-slate-900 font-black text-[10px] md:text-[12px] uppercase tracking-widest font-heading">서비스</h5>
                <ul className="space-y-3 md:space-y-5 text-[13px] md:text-[17px] font-bold">
                  <li><button onClick={startWizard} className="hover:text-blue-600 text-left">AI 정밀 자가진단</button></li>
                  <li><button onClick={() => navigateTo('INSURANCE_GUIDE')} className="hover:text-blue-600 text-left">보험 보상 가이드</button></li>
                </ul>
              </div>
              <div className="flex flex-col gap-4 md:gap-8">
                <h5 className="text-slate-900 font-black text-[10px] md:text-[12px] uppercase tracking-widest font-heading">고객 지원</h5>
                <ul className="space-y-3 md:space-y-5 text-[13px] md:text-[17px] font-bold">
                  <li><a href="https://open.kakao.com/me/partnerreview" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">카카오톡 문의</a></li>
                  <li><button onClick={() => navigateTo('ADMIN_LOGIN')} className="hover:text-blue-600 text-left">관리자 로그인</button></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-8 md:pt-16 border-t border-gray-100 text-[10px] md:text-[13px] flex flex-col md:flex-row justify-between items-center gap-4 font-black uppercase tracking-widest">
            <p>© 2025 누수 블랙박스. All rights reserved.</p>
            <div className="flex gap-8">
              <span className="cursor-pointer hover:text-black">Privacy</span>
              <span className="cursor-pointer hover:text-black">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );

  const renderResultView = () => {
    if (!result) return null;
    return (
      <div className="min-h-screen bg-gray-50/60 pb-40">
        <CommonHeader title="AI 정밀 분석 리포트" onBack={() => setView('LANDING')} />
        <div className="max-w-2xl mx-auto p-5 md:p-12 space-y-8 md:space-y-12">
          <div className="bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[4.5rem] shadow-xl md:shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
               <svg className="w-32 md:w-48 h-32 md:h-48 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </div>
            <p className="text-[11px] md:text-[14px] text-blue-600 font-black uppercase tracking-widest mb-6 md:mb-8">예상 탐지 비용</p>
            <h2 className="text-2xl md:text-5xl font-black text-slate-900 mb-8 md:mb-12 tracking-tight leading-tight break-keep">{result.detectionCost}</h2>
            <div className="p-6 md:p-10 bg-[#fffbeb] border border-[#fef3c7] rounded-[1.5rem] md:rounded-[3rem] flex gap-4 md:gap-6 items-start">
              <span className="text-2xl md:text-4xl">💡</span>
              <p className="text-sm md:text-[19px] text-[#92400e] font-black leading-tight break-keep">{result.overchargeThreshold}</p>
            </div>
          </div>

          <div className="bg-white p-8 md:p-16 rounded-[2rem] md:rounded-[4.5rem] shadow-xl border border-gray-50">
            <h3 className="font-black text-xl md:text-3xl mb-12 md:mb-20 text-slate-900 tracking-tight font-heading">AI 정밀 분석 결과</h3>
            <div className="space-y-12 md:space-y-16">
              {result.causes.map((c, i) => (
                <div key={i} className="relative pl-8 md:pl-12 group">
                  <div className={`absolute left-0 top-0 w-1.5 md:w-2.5 h-full rounded-full ${c.probability === 'High' ? 'bg-red-500' : c.probability === 'Medium' ? 'bg-amber-400' : 'bg-blue-400'}`}></div>
                  <div className="flex flex-col gap-4 md:gap-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <span className={`inline-block w-fit text-[9px] md:text-[12px] px-3 md:px-5 py-1 md:py-2 rounded-full font-black uppercase tracking-widest ${PROBABILITY_COLORS[c.probability]}`}>{PROBABILITY_LABELS[c.probability]} 확률</span>
                      <span className="font-black text-lg md:text-3xl text-slate-900 tracking-tight">{c.title}</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed font-bold text-sm md:text-xl max-w-lg break-keep whitespace-pre-line">{c.description.replace(/([.,])\s*/g, '$1\n')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 pt-10 md:pt-16">
             <button onClick={() => navigateTo('CONSULTATION')} className="w-full bg-slate-900 text-white py-6 md:py-9 rounded-full font-black text-lg md:text-3xl shadow-xl active:scale-95 uppercase tracking-tight">전문가 상담 신청하기</button>
             <button onClick={() => setView('LANDING')} className="w-full bg-white text-gray-400 py-4 md:py-7 rounded-full font-black text-[14px] hover:text-black uppercase tracking-widest border border-gray-100">홈으로 돌아가기</button>
          </div>
        </div>
      </div>
    );
  };
  
  // 기타 뷰 렌더링 생략 (기존과 동일)
  return <div className="antialiased overflow-x-hidden">{/* ... */}</div>;
};

export default App;
