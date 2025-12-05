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
import CgvScreen from './screens/legal/CgvScreen';
import PrivacyScreen from './screens/legal/PrivacyScreen';
import CookiesScreen from './screens/legal/CookiesScreen';
import MentionsLegalesScreen from './screens/legal/MentionsLegalesScreen';
import ContactScreen from './screens/ContactScreen';
import RequestPasswordResetScreen from './screens/RequestPasswordResetScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import RegisterScreen from './screens/RegisterScreen';

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
          <Route path="/contact" element={<ContactScreen />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Route>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/request-password-reset" element={<RequestPasswordResetScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        <Route path="/legal/cgv" element={<CgvScreen />} />
        <Route path="/legal/privacy" element={<PrivacyScreen />} />
        <Route path="/legal/cookies" element={<CookiesScreen />} />
        <Route path="/legal/mentions" element={<MentionsLegalesScreen />} />
      </Routes>
    </main>
  );
};

export default MainContent;
