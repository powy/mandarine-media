import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import Footer from './components/Footer';
import LoginScreen from './screens/LoginScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import TopScreen from './screens/TopScreen';
import VideoScreen from './screens/VideoScreen';
import SeasonScreen from './screens/SeasonScreen';
import ProgramScreen from './screens/ProgramScreen';
import SearchScreen from './screens/SearchScreen';
import ErrorScreen from './screens/ErrorScreen';
import WipScreen from './screens/WipScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-black text-kyool-blue flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/search" element={<SearchScreen />} />
              <Route path="/screen/:screenId" element={<TopScreen />} />
              <Route path="/video/:id" element={<VideoScreen />} />
              <Route path="/season/:id" element={<SeasonScreen />} />
              <Route path="/program/:id" element={<ProgramScreen />} />
              <Route path="/error" element={<ErrorScreen />} />
              <Route path="/films" element={<TopScreen />} />
              <Route path="/dramas" element={<TopScreen />} />
              <Route path="/tv-shows" element={<TopScreen />} />
              <Route path="/autre" element={<TopScreen />} />
              <Route path="/" element={<WelcomeScreen />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
