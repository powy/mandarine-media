import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import Footer from './components/Footer';
import { HeroUIProvider } from '@heroui/react';
import { AppContextProvider } from './AppContext';
import MainContent from './MainContent';

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
    <HeroUIProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppContextProvider>
            <div className="min-h-screen bg-black text-kyool-blue flex flex-col">
              <Header />
              <MainContent />
              <Footer />
            </div>
          </AppContextProvider>
        </Router>
      </QueryClientProvider>
    </HeroUIProvider>
  );
}

export default App;
