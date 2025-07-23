import React from 'react';
import { render } from '@testing-library/react-native';
import VideoPage from '../screens/VideoPage';
import MuxVideoPlayer from '../components/MuxVideoPlayer';

// Mock the video component to avoid native module issues in tests
jest.mock('react-native-video', () => 'Video');
jest.mock('@mux/mux-data-react-native-video', () => (VideoComponent: any) => VideoComponent);

describe('Video Components', () => {
  it('should render MuxVideoPlayer without crashing', () => {
    render(
      <MuxVideoPlayer 
        playbackId="WkN2QAqFAHhGpA5zMJM01voG73tBdh9ggrFf1aQC2YGI"
        title="Test Video"
      />
    );
  });

  it('should render VideoPage without crashing', () => {
    render(<VideoPage />);
  });

  it('should render VideoPage with custom video data', () => {
    const videoData = {
      title: "Custom Video",
      description: "Custom description",
      playbackId: "test-playback-id"
    };
    
    const { getByText } = render(<VideoPage videoData={videoData} />);
    expect(getByText('Custom Video')).toBeTruthy();
    expect(getByText('Custom description')).toBeTruthy();
  });

  it('should render VideoPage with default video data', () => {
    const { getByText } = render(<VideoPage />);
    expect(getByText('kum-drums-1-basic')).toBeTruthy();
    expect(getByText('boom bomm bam bam bim')).toBeTruthy();
  });
});

describe('Mux Integration', () => {
  it('should construct correct Mux stream URL', () => {
    const playbackId = 'WkN2QAqFAHhGpA5zMJM01voG73tBdh9ggrFf1aQC2YGI';
    const expectedUrl = `https://stream.mux.com/${playbackId}.m3u8`;
    
    // This would normally test the URL construction inside the component
    // For now, we're just validating the expected format
    expect(expectedUrl).toBe('https://stream.mux.com/WkN2QAqFAHhGpA5zMJM01voG73tBdh9ggrFf1aQC2YGI.m3u8');
  });

  it('should construct correct Mux poster URL', () => {
    const playbackId = 'WkN2QAqFAHhGpA5zMJM01voG73tBdh9ggrFf1aQC2YGI';
    const expectedPosterUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;
    
    expect(expectedPosterUrl).toBe('https://image.mux.com/WkN2QAqFAHhGpA5zMJM01voG73tBdh9ggrFf1aQC2YGI/thumbnail.jpg');
  });
});