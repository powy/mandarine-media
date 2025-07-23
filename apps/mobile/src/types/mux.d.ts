declare module '@mux/mux-data-react-native-video' {
  import { ComponentType } from 'react';
  import { VideoProperties } from 'react-native-video';

  interface MuxOptions {
    application_name: string;
    application_version?: string;
    data: {
      env_key: string;
      video_id: string;
      video_title?: string;
      player_name?: string;
      player_software_version?: string;
    };
  }

  interface MuxVideoProps extends VideoProperties {
    muxOptions: MuxOptions;
  }

  function muxReactNativeVideo<T>(VideoComponent: ComponentType<T>): ComponentType<T & { muxOptions: MuxOptions }>;
  
  export default muxReactNativeVideo;
  export { MuxOptions, MuxVideoProps };
}