import React from 'react';
import ContentList from '../components/ContentList';

// Import the JSON data
import contentListRecommend from '../mock-data/content-list-recomend.json';
import contentListRomance from '../mock-data/content-list-romance.json';
import contentListMusique from '../mock-data/content-list-musique.json';
import contentListAnimation from '../mock-data/content-list-animation.json';

const ContentScreen: React.FC = () => {
  const contentLists = [
    contentListRecommend,
    contentListRomance,
    contentListMusique,
    contentListAnimation
  ];

  return (
    <div className="min-h-screen bg-black text-kyool-blue">
      <div className="py-8">
        <div className="max-w-6xl mx-auto">
          {contentLists.map((contentList, index) => (
            <ContentList
              key={contentList.id || index}
              contentList={contentList}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContentScreen;