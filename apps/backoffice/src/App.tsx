import React from 'react';
import { Admin, Resource, Layout, AppBar, Menu, MenuItemLink, useSidebarState } from 'react-admin';
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
import { ContentListList, ContentListCreate, ContentListEdit, ContentListShow } from './components/resources/ContentLists';
import { ScreenContentList, ScreenContentCreate, ScreenContentEdit, ScreenContentShow } from './components/resources/ScreenContents';
import { VideoFileList, VideoFileCreate, VideoFileEdit, VideoFileShow } from './components/resources/VideoFiles';
import { ThemeList, ThemeCreate, ThemeEdit, ThemeShow } from './components/resources/Themes';

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
        to="/content-lists"
        primaryText="Content Lists"
        leftIcon={<span>📝</span>}
        dense={!open}
      />
      <MenuItemLink
        to="/screen-descriptions"
        primaryText="Screen Descriptions"
        leftIcon={<span>🖥️</span>}
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
        to="/themes"
        primaryText="Themes"
        leftIcon={<span>🎭</span>}
        dense={!open}
      />
      
      {/* Reports */}
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
  <Layout {...props} appBar={CustomAppBar} menu={CustomMenu} />
);

// Dashboard component - placeholder for now
const Dashboard = () => (
  <div style={{ padding: '2rem' }}>
    <h1>Welcome to KYOOL Media Backoffice</h1>
    <p>Select a resource from the sidebar to start managing your content.</p>
    
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
      name="themes"
      list={ThemeList}
      create={ThemeCreate}
      edit={ThemeEdit}
      show={ThemeShow}
      options={{ label: 'Themes' }}
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
      name="content-lists"
      list={ContentListList}
      create={ContentListCreate}
      edit={ContentListEdit}
      show={ContentListShow}
      options={{ label: 'Content Lists' }}
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
    
  </Admin>
);