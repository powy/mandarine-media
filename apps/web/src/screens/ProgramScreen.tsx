import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProgramScreenDataByProgramId } from 'share';
import type { Program, Season, PublicPerson, Language, Country } from 'share';

interface ProgramScreenData {
  program: Program;
  currentSeason: Season;
  programImageUrl: string | null;
  synopsis: string | null;
  description: string | null;
  genres: string[];
  audioLanguages: Language[];
  subtitleLanguages: Language[];
  releaseDate: number | null;
  originCountries: Country[];
  actors: PublicPerson[];
  directors: PublicPerson[];
  producers: PublicPerson[];
  allSeasons: Array<Season & {
    thumbnailUrl: string | null;
    episodeCount: number;
  }>;
}

const ProgramScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: programData,
    isLoading,
    error,
  } = useQuery<ProgramScreenData>({
    queryKey: ['program-screen', id],
    queryFn: async () => {
      if (!id) throw new Error('Program ID is required');
      console.log('🔍 ProgramScreen: Fetching data for program ID:', id);
      console.log('🔍 ProgramScreen: API call starting...');
      try {
        const result = await getProgramScreenDataByProgramId(id);
        console.log('✅ ProgramScreen: API call successful:', result);
        return result;
      } catch (error) {
        console.error('❌ ProgramScreen: API call failed:', error);
        console.error('❌ ProgramScreen: Error details:', {
          message: (error as any)?.message,
          response: (error as any)?.response,
          status: (error as any)?.response?.status,
          data: (error as any)?.response?.data
        });
        throw error;
      }
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (error) {
      console.error('🚨 ProgramScreen: Error in useEffect, redirecting to error page:', error);
      navigate('/error', { replace: true });
    }
  }, [error, navigate]);

  useEffect(() => {
    console.log('🔍 ProgramScreen: Component mounted/updated');
    console.log('🔍 ProgramScreen: Program ID from URL:', id);
    console.log('🔍 ProgramScreen: isLoading:', isLoading);
    console.log('🔍 ProgramScreen: error:', error);
    console.log('🔍 ProgramScreen: programData:', programData);
  });

  const handleSeasonClick = (seasonId: string) => {
    navigate(`/season/${seasonId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-kyool-blue">Chargement du programme...</div>
      </div>
    );
  }

  if (error || !programData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Erreur</h1>
          <p className="text-gray-300">Impossible de charger ce programme.</p>
        </div>
      </div>
    );
  }

  const { 
    program, 
    programImageUrl,
    synopsis,
    description,
    genres,
    audioLanguages,
    subtitleLanguages,
    releaseDate,
    originCountries,
    actors, 
    directors, 
    producers,
    allSeasons
  } = programData;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Program Header Section */}
        <div className="mb-8">
          {/* Program Title */}
          <h1 className="text-4xl font-bold text-kyool-blue mb-6">
            {program.program_name}
          </h1>

          {/* Program Image */}
          {programImageUrl && (
            <div className="mb-6">
              <img
                src={programImageUrl}
                alt={program.program_name}
                className="w-full h-64 md:h-96 object-cover rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Synopsis Section */}
        {synopsis && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-kyool-blue mb-4">Synopsis</h3>
            <p className="text-gray-300 leading-relaxed">
              {synopsis}
            </p>
          </div>
        )}

        {/* Details Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-kyool-blue mb-4">Détails</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {genres.length > 0 && (
              <div>
                <span className="text-gray-400">Genres: </span>
                <span className="text-white">
                  {genres.join(', ')}
                </span>
              </div>
            )}
            {audioLanguages.length > 0 && (
              <div>
                <span className="text-gray-400">Langues audio: </span>
                <span className="text-white">
                  {audioLanguages.map(lang => lang.name).join(', ')}
                </span>
              </div>
            )}
            {subtitleLanguages.length > 0 && (
              <div>
                <span className="text-gray-400">Sous-titres: </span>
                <span className="text-white">
                  {subtitleLanguages.map(lang => lang.name).join(', ')}
                </span>
              </div>
            )}
            {releaseDate && (
              <div>
                <span className="text-gray-400">Année de sortie: </span>
                <span className="text-white">{releaseDate}</span>
              </div>
            )}
            {originCountries.length > 0 && (
              <div>
                <span className="text-gray-400">Pays d'origine: </span>
                <span className="text-white">
                  {originCountries.map(country => country.name).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Crew Section */}
        {(actors.length > 0 || directors.length > 0 || producers.length > 0) && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-kyool-blue mb-4">Distribution et équipe</h3>
            <div className="text-gray-300 leading-relaxed">
              {producers.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-400">Producteur{producers.length > 1 ? 's' : ''}: </span>
                  <span className="text-white">
                    {producers.map(p => p.stage_name_roman || `${p.first_name_roman || ''} ${p.last_name_roman || ''}`).join(', ')}
                  </span>
                </div>
              )}
              {directors.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-400">Réalisateur{directors.length > 1 ? 's' : ''}: </span>
                  <span className="text-white">
                    {directors.map(d => d.stage_name_roman || `${d.first_name_roman || ''} ${d.last_name_roman || ''}`).join(', ')}
                  </span>
                </div>
              )}
              {actors.length > 0 && (
                <div>
                  <span className="text-gray-400">avec </span>
                  <span className="text-white">
                    {actors.map(a => a.stage_name_roman || `${a.first_name_roman || ''} ${a.last_name_roman || ''}`).join(', ')}
                  </span>
                  <span className="text-gray-400"> (acteur{actors.length > 1 ? 's' : ''})</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description Section - Temporarily hidden */}
        {false && description && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-kyool-blue mb-4">Description</h3>
            <p className="text-gray-300 leading-relaxed">
              {description}
            </p>
          </div>
        )}

        {/* List of Seasons Section */}
        {allSeasons.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-kyool-blue mb-4">
              Liste des saisons ({allSeasons.length})
            </h3>
            <div className="space-y-3">
              {allSeasons.map((season) => (
                <div
                  key={season.id}
                  onClick={() => handleSeasonClick(season.id)}
                  className="flex items-center p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  {/* Season Number */}
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className="text-kyool-blue font-bold text-lg">
                      {season.season_number}
                    </span>
                  </div>

                  {/* Season Thumbnail */}
                  <div className="flex-shrink-0 w-40 h-24 ml-4 mr-6">
                    {season.thumbnailUrl ? (
                      <img
                        src={season.thumbnailUrl}
                        alt={`Saison ${season.season_number}`}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-600 flex items-center justify-center rounded">
                        <span className="text-gray-400 text-xs">Pas d'image</span>
                      </div>
                    )}
                  </div>

                  {/* Season Title and Info */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-lg mb-1">
                      Saison {season.season_number}
                    </h4>
                    <p className="text-gray-400 text-sm">
                      {season.episodeCount} épisode{season.episodeCount > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex-shrink-0 ml-4">
                    <span className="text-gray-400 text-xl">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramScreen;