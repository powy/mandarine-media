import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Mock the image assets
jest.mock('../assets/KYOOL_logo.png', () => 'KYOOL_logo.png');
jest.mock('../assets/welcome_page_content/list_1_carrousel/1 - 810-1080 The Sweet Blood.png', () => 'mock-image.png');

// Mock all the required images to avoid file loading errors
const mockImages = [
  '../assets/footer/1_acceuil.png',
  '../assets/footer/2_lecture.png',
  '../assets/footer/3_decouvre.png',
  '../assets/footer/4_coins.png',
  '../assets/footer/5_recompenses.png',
  '../assets/footer/6_jeux.png',
  '../assets/footer/7_compte.png',
];

mockImages.forEach(imagePath => {
  jest.mock(imagePath, () => 'mock-footer-icon.png');
});

describe('App', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<App />);
    // Since we don't have testIDs in the components yet, we'll just check if render doesn't throw
    expect(true).toBe(true);
  });
});

// Test individual components
import Header from '../components/Header';
import Footer from '../components/Footer';
import Carousel from '../components/Carousel';
import HorizontalList from '../components/HorizontalList';

describe('Header Component', () => {
  it('renders without crashing', () => {
    render(<Header />);
  });
});

describe('Footer Component', () => {
  it('renders without crashing', () => {
    render(<Footer />);
  });
});

describe('Carousel Component', () => {
  it('renders without crashing', () => {
    const mockData = [
      { id: '1', image: 'mock-image.png' },
      { id: '2', image: 'mock-image.png' },
    ];
    render(<Carousel data={mockData} />);
  });
});

describe('HorizontalList Component', () => {
  it('renders without crashing', () => {
    const mockData = [
      { id: '1', image: 'mock-image.png', title: 'Test Title' },
    ];
    render(<HorizontalList title="Test List" data={mockData} />);
  });
});