import React, { useState } from 'react';
import { Admin, Resource, Layout, AppBar, Menu, MenuItemLink, useSidebarState, Button, useNotify } from 'react-admin';
import { dataProvider } from './dataProvider';
import { authProvider } from './authProvider';
import { CountryList, CountryCreate, CountryEdit, CountryShow } from './components/resources/Countries';
import { LanguageList, LanguageCreate, LanguageEdit, LanguageShow } from './components/resources/Languages';
import { MediaDescriptionList, MediaDescriptionCreate, MediaDescriptionEdit, MediaDescriptionShow } from './components/resources/MediaDescriptions';
import { PublicPersonList, PublicPersonCreate, PublicPersonEdit, PublicPersonShow } from './components/resources/PublicPersons';
import { ProgramList, ProgramCreate, ProgramEdit, ProgramShow } from './components/resources/Programs';
import { SeasonList, SeasonCreate, SeasonEdit, SeasonShow } from './components/resources/Seasons';
import { PictureList, PictureCreate, PictureEdit, PictureShow } from './components/resources/Pictures';
import { UserList, UserCreate, UserEdit, UserShow } from './components/resources/Users';
import { MediaShowcaseList, MediaShowcaseCreate, MediaShowcaseEdit, MediaShowcaseShow } from './components/resources/MediaShowcases';
import { MediaDescriptionPeopleList, MediaDescriptionPeopleCreate, MediaDescriptionPeopleEdit, MediaDescriptionPeopleShow } from './components/resources/MediaDescriptionPeople';
import { DescriptionReportList, DescriptionReportShow } from './components/resources/DescriptionReports';
import { ScreenContentList, ScreenContentCreate, ScreenContentEdit, ScreenContentShow } from './components/resources/ScreenContents';
import { VideoFileList, VideoFileCreate, VideoFileEdit, VideoFileShow } from './components/resources/VideoFiles';
import { MediaThemeList, MediaThemeCreate, MediaThemeEdit, MediaThemeShow } from './components/resources/MediaThemes';
import { VideoFileReportList, VideoFileReportShow } from './components/resources/VideoFileReports';
import { AudienceCategoryList, AudienceCategoryCreate, AudienceCategoryEdit, AudienceCategoryShow } from './components/resources/AudienceCategories';
import { SubscriptionPlanList, SubscriptionPlanCreate, SubscriptionPlanEdit, SubscriptionPlanShow } from './components/resources/SubscriptionPlans';
import { Tooltip } from '@mui/material';
import { regenerateAllScreenDescriptionJSON } from 'share';
import Footer from './components/Footer';


// Custom Menu for better organization
const CustomMenu = () => {
  const [open] = useSidebarState();
  
  return (
    <Menu>
      {/* Core Content Management */}
      <MenuItemLink
        to="/media-descriptions"
        primaryText="Media Descriptions"
        leftIcon={<span>🎬</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/programs"
        primaryText="Programs"
        leftIcon={<span>📺</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/seasons"
        primaryText="Seasons"
        leftIcon={<span>📋</span>}
        dense={!open}
      />
      
      {/* Content Organization */}
      <MenuItemLink
        to="/media-showcases"
        primaryText="Media Showcases"
        leftIcon={<span>🎭</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/screen-descriptions"
        primaryText="Screen Descriptions"
        leftIcon={<span>🖥️</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/media-description-people"
        primaryText="People Assignments"
        leftIcon={<span>👥</span>}
        dense={!open}
      />
      
      {/* People & Assets */}
      <MenuItemLink
        to="/public-persons"
        primaryText="Public Persons"
        leftIcon={<span>👤</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/pictures"
        primaryText="Pictures"
        leftIcon={<span>🖼️</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/video-files"
        primaryText="Video Files"
        leftIcon={<span>🎥</span>}
        dense={!open}
      />
      
      {/* Reference Data */}
      <MenuItemLink
        to="/countries"
        primaryText="Countries"
        leftIcon={<span>🌍</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/languages"
        primaryText="Languages"
        leftIcon={<span>🗣️</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/audience-categories"
        primaryText="Audience Categories"
        leftIcon={<span>👁️</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/media-themes"
        primaryText="Media Themes"
        leftIcon={<span>🎨</span>}
        dense={!open}
      />
      
      {/* Reports */}
      <MenuItemLink
        to="/description-reports"
        primaryText="Description Reports"
        leftIcon={<span>📋</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/video-file-reports"
        primaryText="Video File Reports"
        leftIcon={<span>📊</span>}
        dense={!open}
      />
      
      {/* System */}
      <MenuItemLink
        to="/users"
        primaryText="Users"
        leftIcon={<span>👥</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/subscription-plans"
        primaryText="Subscription Plans"
        leftIcon={<span>💳</span>}
        dense={!open}
      />
    </Menu>
  );
};

// Custom AppBar
const CustomAppBar = () => (
  <AppBar>
    <span style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
      KYOOL Media Backoffice
    </span>
  </AppBar>
);

// Custom Layout
const CustomLayout = (props: any) => (
  <>
    <Layout
      {...props}
      appBar={CustomAppBar}
      menu={CustomMenu}
      sx={{
        '& .RaLayout-content': {
          paddingBottom: '48px',
        }
      }}
    />
    <Footer />
  </>
);

// Dashboard component - placeholder for now
const Dashboard = () => {
  const notify = useNotify();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegenerateAll = async () => {
    setIsLoading(true);
    try {
      const result = await regenerateAllScreenDescriptionJSON();
      notify(
        `Successfully regenerated ${result.results.updated} screen description JSONs`,
        { type: 'success' }
      );
      if (result.results.failed > 0) {
        notify(
          `${result.results.failed} screen descriptions failed to regenerate`,
          { type: 'warning' }
        );
      }
    } catch (error) {
      notify(`Error regenerating all JSONs: ${error.message}`, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome to KYOOL Media Backoffice</h1>
      <p>Select a resource from the sidebar to start managing your content.</p>

      <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <Tooltip title="Mise à jour des écrans du site en production et des showcases à l'intérieur de ceux-ci.">
          <Button
            onClick={handleRegenerateAll}
            disabled={isLoading}
            label={isLoading ? "Updating..." : "Update the website display (json)"}
            variant="contained"
            sx={{
              backgroundColor: '#ff9800',
              color: '#fff',
              '&:hover': {
                backgroundColor: '#f57c00',
              },
              '&:disabled': {
                backgroundColor: '#ffcc80',
                color: '#fff',
              },
            }}
          />
        </Tooltip>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Quick Stats</h2>
        <p>📊 Dashboard with metrics and charts will be implemented in the next phase.</p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Recent Activity</h2>
        <p>📈 Recent operations and system status will be displayed here.</p>
      </div>
    </div>
  );
};

export const App = () => (
  <Admin
    dataProvider={dataProvider}
    authProvider={authProvider}
    dashboard={Dashboard}
    layout={CustomLayout}
    title="KYOOL Media Backoffice"
  >
    {/* Core Content Management */}
    <Resource
      name="media-descriptions"
      list={MediaDescriptionList}
      create={MediaDescriptionCreate}
      edit={MediaDescriptionEdit}
      show={MediaDescriptionShow}
      options={{ label: 'Media Descriptions' }}
    />
    
    {/* Reference Data */}
    <Resource
      name="countries"
      list={CountryList}
      create={CountryCreate}
      edit={CountryEdit}
      show={CountryShow}
      options={{ label: 'Countries' }}
    />
    
    
    <Resource
      name="languages"
      list={LanguageList}
      create={LanguageCreate}
      edit={LanguageEdit}
      show={LanguageShow}
      options={{ label: 'Languages' }}
    />
    
    <Resource
      name="audience-categories"
      list={AudienceCategoryList}
      create={AudienceCategoryCreate}
      edit={AudienceCategoryEdit}
      show={AudienceCategoryShow}
      options={{ label: 'Audience Categories' }}
    />
    
    <Resource
      name="subscription-plans"
      list={SubscriptionPlanList}
      create={SubscriptionPlanCreate}
      edit={SubscriptionPlanEdit}
      show={SubscriptionPlanShow}
      options={{ label: 'Subscription Plans' }}
    />
    
    
    <Resource
      name="media-themes"
      list={MediaThemeList}
      create={MediaThemeCreate}
      edit={MediaThemeEdit}
      show={MediaThemeShow}
      options={{ label: 'Media Themes' }}
    />
    
    {/* Fully implemented resources */}
    <Resource
      name="programs"
      list={ProgramList}
      create={ProgramCreate}
      edit={ProgramEdit}
      show={ProgramShow}
      options={{ label: 'Programs' }}
    />
    
    <Resource
      name="seasons"
      list={SeasonList}
      create={SeasonCreate}
      edit={SeasonEdit}
      show={SeasonShow}
      options={{ label: 'Seasons' }}
    />
    
    <Resource
      name="public-persons"
      list={PublicPersonList}
      create={PublicPersonCreate}
      edit={PublicPersonEdit}
      show={PublicPersonShow}
      options={{ label: 'Public Persons' }}
    />
    
    <Resource
      name="pictures"
      list={PictureList}
      create={PictureCreate}
      edit={PictureEdit}
      show={PictureShow}
      options={{ label: 'Pictures' }}
    />
    
    
    <Resource
      name="users"
      list={UserList}
      create={UserCreate}
      edit={UserEdit}
      show={UserShow}
      options={{ label: 'Users' }}
    />

    {/* Content organization resources */}

    <Resource
      name="media-showcases"
      list={MediaShowcaseList}
      create={MediaShowcaseCreate}
      edit={MediaShowcaseEdit}
      show={MediaShowcaseShow}
      options={{ label: 'Media Showcases' }}
    />

    <Resource
      name="media-description-people"
      list={MediaDescriptionPeopleList}
      create={MediaDescriptionPeopleCreate}
      edit={MediaDescriptionPeopleEdit}
      show={MediaDescriptionPeopleShow}
      options={{ label: 'People Assignments' }}
    />

    <Resource
      name="description-reports"
      list={DescriptionReportList}
      show={DescriptionReportShow}
      options={{ label: 'Description Reports' }}
    />
    
    <Resource
      name="screen-descriptions"
      list={ScreenContentList}
      create={ScreenContentCreate}
      edit={ScreenContentEdit}
      show={ScreenContentShow}
      options={{ label: 'Screen Descriptions' }}
    />
    
    {/* Video Files Resource */}
    <Resource
      name="video-files"
      list={VideoFileList}
      create={VideoFileCreate}
      edit={VideoFileEdit}
      show={VideoFileShow}
      options={{ label: 'Video Files' }}
    />
    
    {/* Video File Reports Resource - Read Only */}
    <Resource
      name="video-file-reports"
      list={VideoFileReportList}
      show={VideoFileReportShow}
      options={{ label: 'Video File Reports' }}
    />
    
  </Admin>
);