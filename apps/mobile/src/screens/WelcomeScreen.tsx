import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Carousel from '../components/Carousel';
import HorizontalList from '../components/HorizontalList';

interface WelcomeScreenProps {
  onItemPress?: (item: any) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onItemPress }) => {
  // Carousel data (list 1)
  const carouselData = [
    { id: '1', image: require('../assets/welcome_page_content/list_1_carrousel/1_810_1080_The_Sweet_Blood.png') },
    { id: '2', image: require('../assets/welcome_page_content/list_1_carrousel/2_810_1080_On_your_Wedding_Day.png') },
    { id: '3', image: require('../assets/welcome_page_content/list_1_carrousel/3_810_1080_Love_as_You_Taste.png') },
    { id: '4', image: require('../assets/welcome_page_content/list_1_carrousel/4_810_1080_Running_Man.png') },
    { id: '5', image: require('../assets/welcome_page_content/list_1_carrousel/5_810_1080_The_adventure_of_a.png') },
    { id: '6', image: require('../assets/welcome_page_content/list_1_carrousel/6_810_1080_Phantom_School.png') },
    { id: '7', image: require('../assets/welcome_page_content/list_1_carrousel/7_810_1080_The_Kings_Letters.png') },
    { id: '8', image: require('../assets/welcome_page_content/list_1_carrousel/8_810_1080_Mojiri_1_Petit_testicule.png') },
  ];

  // Films data (list 2)
  const filmsData = [
    { id: '1', image: require('../assets/welcome_page_content/list_2_films/01_810_1080_Juror_8.png') },
    { id: '2', image: require('../assets/welcome_page_content/list_2_films/02_810_1080_The_Kings_Letters.png') },
    { id: '3', image: require('../assets/welcome_page_content/list_2_films/03_810_1080_On_your_Wedding_Day.png') },
    { id: '4', image: require('../assets/welcome_page_content/list_2_films/04_810_1080_Derailed.png') },
    { id: '5', image: require('../assets/welcome_page_content/list_2_films/05_810_1080_Film_microhabitat.png') },
    { id: '6', image: require('../assets/welcome_page_content/list_2_films/06_810_1080_The_ODD_Family.png') },
  ];

  // Short Dramas data (list 3)
  const shortDramasData = [
    { id: '1', image: require('../assets/welcome_page_content/list_3_short_dramas/01_810_1080_Love_as_You_Taste.png') },
    { id: '2', image: require('../assets/welcome_page_content/list_3_short_dramas/02_810_1080_The_Sweet_Blood.png') },
    { id: '3', image: require('../assets/welcome_page_content/list_3_short_dramas/03_810_1080_Phantom_School.png') },
  ];

  // Webtoons data (list 4)
  const webtoonsData = [
    { id: '1', image: require('../assets/welcome_page_content/list_4_webtoons/01_860_1215_hell_bound.png') },
    { id: '2', image: require('../assets/welcome_page_content/list_4_webtoons/02_860_1215_Sweet_Home.png') },
    { id: '3', image: require('../assets/welcome_page_content/list_4_webtoons/03_860_1215_Webtoon_2.png') },
    { id: '4', image: require('../assets/welcome_page_content/list_4_webtoons/04_860_1215_True_Beauty.png') },
    { id: '5', image: require('../assets/welcome_page_content/list_4_webtoons/05_860_1215_Mojiri_1_Petit_testicule.png') },
    { id: '6', image: require('../assets/welcome_page_content/list_4_webtoons/06_860_1215_Journal_Etrange.png') },
    { id: '7', image: require('../assets/welcome_page_content/list_4_webtoons/07_860_1215_Mojiri_1_Petit_testicule_2.png') },
  ];

  // Dramas data (list 5)
  const dramasData = [
    { id: '1', image: require('../assets/welcome_page_content/list_5_dramas/01_1920_1080_Drama_Another_Miss_Oh.png') },
    { id: '2', image: require('../assets/welcome_page_content/list_5_dramas/02_1920_1080_DRAMA_Touch_Your_Heart.png') },
    { id: '3', image: require('../assets/welcome_page_content/list_5_dramas/03_1920_1080_Drama_work_later_S01.png') },
    { id: '4', image: require('../assets/welcome_page_content/list_5_dramas/04_1920_1080_Drama_WORK_LATER_DRINK_NOW_2.png') },
  ];

  // Recommandés data (list 6)
  const recommandesData = [
    { id: '1', image: require('../assets/welcome_page_content/list_6_recommandes/01_1080_1920_The_Innerview_Regarder_1.png') },
    { id: '2', image: require('../assets/welcome_page_content/list_6_recommandes/02_1080_1920_Mr_Hashtag_Regarder_2.png') },
    { id: '3', image: require('../assets/welcome_page_content/list_6_recommandes/03_1080_1920_Horror_Delivery_Service_Regarder_3.png') },
  ];

  // Les plus regardés data (list 7)
  const plusRegardesData = [
    { id: '1', image: require('../assets/welcome_page_content/list_7_plus_regardes/01_1080_1080_N_1_Inkigayo_1260.png') },
    { id: '2', image: require('../assets/welcome_page_content/list_7_plus_regardes/02_1080_1080_N_2_Becoming_The_Monarch_EP01_.png') },
    { id: '3', image: require('../assets/welcome_page_content/list_7_plus_regardes/03_1080_1080_N_3_Phantom_School.png') },
    { id: '4', image: require('../assets/welcome_page_content/list_7_plus_regardes/04_1080_1080_N_4_Mojiri_1_Petit_testicule.png') },
    { id: '5', image: require('../assets/welcome_page_content/list_7_plus_regardes/05_1080_1080_N_10_The_Innerview.png') },
    { id: '6', image: require('../assets/welcome_page_content/list_7_plus_regardes/06_1080_1080_N_06_The_Sweet_Blood.png') },
    { id: '7', image: require('../assets/welcome_page_content/list_7_plus_regardes/07_1080_1080_N_07_On_Your_Wedding_Day.png') },
    { id: '8', image: require('../assets/welcome_page_content/list_7_plus_regardes/08_1080_1080_N_08_The_Adventure_of_a_Demon.png') },
    { id: '9', image: require('../assets/welcome_page_content/list_7_plus_regardes/09_1080_1080_N_09_Love_as_You_Taste.png') },
    { id: '10', image: require('../assets/welcome_page_content/list_7_plus_regardes/10_1080_1080_N_10_The_Kings_Letters.png') },
  ];

  // Continue à regarder data (list 8)
  const continueData = [
    { id: '1', image: require('../assets/welcome_page_content/list_8_continue/01_810_1080_Film_microhabitat.png') },
    { id: '2', image: require('../assets/welcome_page_content/list_8_continue/02_810_x_1080_Miss_Baek.png') },
    { id: '3', image: require('../assets/welcome_page_content/list_8_continue/03_810_x_1080_Dongju.png') },
    { id: '4', image: require('../assets/welcome_page_content/list_8_continue/04_810_1080_the_adventure.png') },
    { id: '5', image: require('../assets/welcome_page_content/list_8_continue/05_810_1080_Running_Man.png') },
    { id: '6', image: require('../assets/welcome_page_content/list_8_continue/06_810_1080_Phantom_School.png') },
    { id: '7', image: require('../assets/welcome_page_content/list_8_continue/07_810_1080_Mojiri_1_Petit_testicule.png') },
  ];

  // Concerts data (list 9)
  const concertsData = [
    { id: '1', image: require('../assets/welcome_page_content/list_9_concerts/01_1920_1080_concert_01.png') },
    { id: '2', image: require('../assets/welcome_page_content/list_9_concerts/02_1920_1080_concert_02.png') },
    { id: '3', image: require('../assets/welcome_page_content/list_9_concerts/03_1920_1080_concert_03.png') },
  ];

  // TV shows data (list 10)
  const tvShowsData = [
    { id: '1', image: require('../assets/welcome_page_content/list_10_tv_shows/01_1080_1080_SBS_Running_Man_744.png') },
    { id: '2', image: require('../assets/welcome_page_content/list_10_tv_shows/02_1080_1080_SBS_fantastic_duo.png') },
  ];

  const handleItemPress = (item: any) => {
    // Navigate to video screen
    console.log('Navigate to video screen with item:', item.id);
    onItemPress?.(item);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Carousel */}
        <Carousel data={carouselData} onItemPress={handleItemPress} />

        {/* Films */}
        <HorizontalList
          title="FILMS"
          data={filmsData}
          onItemPress={handleItemPress}
          itemWidth={120}
          itemHeight={160}
        />

        {/* Short Dramas */}
        <HorizontalList
          title="SHORT DRAMAS"
          data={shortDramasData}
          onItemPress={handleItemPress}
          itemWidth={120}
          itemHeight={160}
        />

        {/* Webtoons */}
        <HorizontalList
          title="WEBTOONS"
          data={webtoonsData}
          onItemPress={handleItemPress}
          itemWidth={130}
          itemHeight={185}
        />

        {/* Dramas */}
        <HorizontalList
          title="DRAMAS"
          data={dramasData}
          onItemPress={handleItemPress}
          itemWidth={160}
          itemHeight={90}
        />

        {/* Recommandés */}
        <HorizontalList
          title="RECOMMANDÉS"
          data={recommandesData}
          onItemPress={handleItemPress}
          itemWidth={110}
          itemHeight={195}
        />

        {/* Les plus regardés */}
        <HorizontalList
          title="LES PLUS REGARDÉS"
          data={plusRegardesData}
          onItemPress={handleItemPress}
          itemWidth={120}
          itemHeight={120}
        />

        {/* Continue à regarder */}
        <HorizontalList
          title="CONTINUE À REGARDER"
          data={continueData}
          onItemPress={handleItemPress}
          itemWidth={120}
          itemHeight={160}
        />

        {/* Concerts */}
        <HorizontalList
          title="CONCERTS"
          data={concertsData}
          onItemPress={handleItemPress}
          itemWidth={160}
          itemHeight={90}
        />

        {/* TV Shows */}
        <HorizontalList
          title="TV SHOWS"
          data={tvShowsData}
          onItemPress={handleItemPress}
          itemWidth={120}
          itemHeight={120}
        />

        {/* Bottom spacing for footer */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      <Footer activeTab="acceuil" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default WelcomeScreen;