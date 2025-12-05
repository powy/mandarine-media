import { FC, ReactNode } from 'react';

interface LegalPageTemplateProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

const LegalPageTemplate: FC<LegalPageTemplateProps> = ({
  title,
  lastUpdated,
  children
}) => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1920px] m-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-kyool-blue mb-4">{title}</h1>
          <p className="text-gray-400 text-sm mb-8">
            Dernière mise à jour : {lastUpdated}
          </p>
          <div className="prose prose-invert max-w-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPageTemplate;
