import { existsSync } from 'fs';
import { join } from 'path';

describe('Project Structure', () => {
  const srcPath = join(__dirname, '..');

  it('should have required component files', () => {
    const requiredFiles = [
      'components/Header.tsx',
      'components/Footer.tsx', 
      'components/Carousel.tsx',
      'components/HorizontalList.tsx',
      'screens/WelcomeScreen.tsx',
      'screens/TempScreen.tsx',
    ];

    requiredFiles.forEach(file => {
      const filePath = join(srcPath, file);
      expect(existsSync(filePath)).toBe(true);
    });
  });

  it('should have assets directory', () => {
    const assetsPath = join(srcPath, 'assets');
    expect(existsSync(assetsPath)).toBe(true);
  });
});