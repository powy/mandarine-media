import { Image } from 'react-native';

describe('Asset Loading', () => {
  it('should be able to require logo asset', () => {
    const logo = require('../assets/KYOOL_logo.png');
    expect(logo).toBeDefined();
  });

  it('should be able to require footer assets', () => {
    const footerIcon = require('../assets/footer/1_acceuil.png');
    expect(footerIcon).toBeDefined();
  });

  it('should be able to require carousel assets', () => {
    const carouselImage = require('../assets/welcome_page_content/list_1_carrousel/1_810_1080_The_Sweet_Blood.png');
    expect(carouselImage).toBeDefined();
  });

  it('should be able to require film assets', () => {
    const filmImage = require('../assets/welcome_page_content/list_2_films/01_810_1080_Juror_8.png');
    expect(filmImage).toBeDefined();
  });

  it('should be able to require all renamed asset files', () => {
    // Test a sample from each category
    const assets = [
      require('../assets/welcome_page_content/list_3_short_dramas/01_810_1080_Love_as_You_Taste.png'),
      require('../assets/welcome_page_content/list_4_webtoons/01_860_1215_hell_bound.png'),
      require('../assets/welcome_page_content/list_5_dramas/01_1920_1080_Drama_Another_Miss_Oh.png'),
      require('../assets/welcome_page_content/list_6_recommandes/01_1080_1920_The_Innerview_Regarder_1.png'),
      require('../assets/welcome_page_content/list_7_plus_regardes/01_1080_1080_N_1_Inkigayo_1260.png'),
      require('../assets/welcome_page_content/list_8_continue/01_810_1080_Film_microhabitat.png'),
      require('../assets/welcome_page_content/list_9_concerts/01_1920_1080_concert_01.png'),
      require('../assets/welcome_page_content/list_10_tv_shows/01_1080_1080_SBS_Running_Man_744.png'),
    ];

    assets.forEach(asset => {
      expect(asset).toBeDefined();
    });
  });
});