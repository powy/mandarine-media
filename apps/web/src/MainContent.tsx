import { FC } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import TopScreen from './screens/TopScreen';
import VideoScreen from './screens/VideoScreen';
import SeasonScreen from './screens/SeasonScreen';
import ProgramScreen from './screens/ProgramScreen';
import ErrorScreen from './screens/ErrorScreen';
import SearchScreen from './screens/SearchScreen';
import PrivateRoutes from './PrivateRoutes';

const MainContent: FC = () => {
  return (
    <main className="flex-1">
      <Routes>
        <Route element={<PrivateRoutes />}>
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/home" element={<TopScreen />} />
          <Route path="/screen/:screenId" element={<TopScreen />} />
          <Route path="/video/:id" element={<VideoScreen />} />
          <Route path="/season/:id" element={<SeasonScreen />} />
          <Route path="/program/:id" element={<ProgramScreen />} />
          <Route path="/error" element={<ErrorScreen />} />
          <Route path="/films" element={<TopScreen />} />
          <Route path="/dramas" element={<TopScreen />} />
          <Route path="/tv-shows" element={<TopScreen />} />
          <Route path="/autre" element={<TopScreen />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Route>
        <Route path="/login" element={<LoginScreen />} />
      </Routes>
    </main>
  );
};

export default MainContent;
