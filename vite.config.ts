
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 현재 디렉토리에서 환경 변수를 로드합니다.
  // 세 번째 인자를 ''로 설정하여 VITE_ 접두사가 없는 변수(예: API_KEY)도 가져옵니다.
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    // 빌드 시점에 환경 변수를 클라이언트 코드에 주입합니다.
    // Vercel 환경 변수(process.env.API_KEY)와 .env 파일의 변수를 모두 지원합니다.
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
    },
    build: {
      outDir: 'dist',
      // 속도가 빠른 esbuild를 사용하여 코드를 압축합니다.
      minify: 'esbuild',
      // 최신 브라우저를 타겟으로 하여 불필요한 폴리필을 줄이고 성능을 높입니다.
      target: 'esnext',
      // 프로덕션 환경에서 소스맵을 비활성화하여 빌드 크기를 줄이고 보안을 강화합니다.
      sourcemap: false,
      // 빌드 시간을 단축하기 위해 압축 결과 보고를 비활성화합니다.
      reportCompressedSize: false,
      // 대용량 라이브러리(Gemini SDK, React)를 별도 청크로 분리하여 초기 로딩 속도를 최적화합니다.
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ai': ['@google/genai']
          }
        }
      }
    },
    server: {
      port: 3000,
      host: true,
      open: true
    }
  }
})
