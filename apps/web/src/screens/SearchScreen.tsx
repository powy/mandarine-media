import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mediaApi, picturesApi, useDebounce, resolveMediaDescriptionId } from 'share';
import type { MediaDescription } from 'share';

const RESULTS_PER_PAGE = 20;

const SearchScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input to avoid excessive API calls
  const debouncedSearch = useDebounce(searchInput, 500);

  // Fetch search results
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['mediaSearch', debouncedSearch, currentPage],
    queryFn: async () => {
      if (!debouncedSearch.trim()) {
        return { items: [], total: 0 };
      }

      const skip = (currentPage - 1) * RESULTS_PER_PAGE;
      const response = await mediaApi.getMediaDescriptions({
        q: debouncedSearch,
        skip,
        limit: RESULTS_PER_PAGE,
      });

      // Fetch thumbnails for results
      const itemsWithThumbnails = await Promise.all(
        response.data.map(async (item: MediaDescription) => {
          let thumbnailUrl = '';
          if (item.image_1920_1080_id) {
            try {
              const picture = await picturesApi.getById(item.image_1920_1080_id);
              thumbnailUrl = picture.image_url;
            } catch (err) {
              console.error('Failed to fetch thumbnail:', err);
            }
          }
          return { ...item, thumbnailUrl };
        })
      );

      return {
        items: itemsWithThumbnails,
        total: response.pagination.total,
      };
    },
    enabled: debouncedSearch.trim().length > 0,
    keepPreviousData: true,
    staleTime: 60 * 1000, // 1 minute
  });

  const handleMediaClick = async (mediaDescription: MediaDescription) => {
    try {
      const resolution = await resolveMediaDescriptionId(mediaDescription.id);
      if (resolution.isMediaDescription && resolution.redirectPath) {
        navigate(resolution.redirectPath);
      } else {
        // Fallback to video route
        navigate(`/video/${mediaDescription.id}`);
      }
    } catch (error) {
      console.error('Failed to resolve media description:', error);
      navigate(`/video/${mediaDescription.id}`);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const totalPages = searchResults?.total
    ? Math.ceil(searchResults.total / RESULTS_PER_PAGE)
    : 0;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-black text-kyool-blue">
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-kyool-blue mb-4">Search Media</h1>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={handleSearch}
                placeholder="Search for videos, seasons, programs..."
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-kyool-blue focus:outline-none focus:ring-2 focus:ring-kyool-blue focus:ring-opacity-50 transition-all"
                autoFocus
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Search Info */}
            {debouncedSearch && searchResults && (
              <p className="text-gray-400 text-sm mt-2">
                Found {searchResults.total} result{searchResults.total !== 1 ? 's' : ''} for "{debouncedSearch}"
              </p>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kyool-blue mx-auto mb-4"></div>
                <p className="text-kyool-blue">Searching...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-16">
              <p className="text-red-500 text-lg">
                {error instanceof Error ? error.message : 'An error occurred while searching'}
              </p>
            </div>
          )}

          {/* Empty State - No Search */}
          {!debouncedSearch && !isLoading && (
            <div className="text-center py-16">
              <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500 text-lg">Start typing to search for media</p>
            </div>
          )}

          {/* Empty State - No Results */}
          {debouncedSearch && !isLoading && searchResults && searchResults.items.length === 0 && (
            <div className="text-center py-16">
              <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-lg">No results found for "{debouncedSearch}"</p>
              <p className="text-gray-600 text-sm mt-2">Try searching with different keywords</p>
            </div>
          )}

          {/* Search Results Grid */}
          {searchResults && searchResults.items.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                {searchResults.items.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => handleMediaClick(item)}
                    className="cursor-pointer group"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video rounded-lg overflow-hidden mb-2 bg-gray-800">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.episode_title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">No Image</span>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                        <svg
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-12 h-12 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-kyool-blue text-sm font-medium leading-tight line-clamp-2 group-hover:text-white transition-colors">
                      {item.episode_title}
                    </h3>

                    {/* Description */}
                    {item.descriptive_summary_text && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2 group-hover:text-gray-300 transition-colors">
                        {item.descriptive_summary_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 pb-8">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === 1
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 text-kyool-blue hover:bg-gray-700'
                    }`}
                    aria-label="Previous page"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Page Numbers */}
                  {getPageNumbers().map((page, index) => (
                    typeof page === 'number' ? (
                      <button
                        key={index}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-kyool-blue text-white font-bold'
                            : 'bg-gray-800 text-kyool-blue hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ) : (
                      <span key={index} className="px-2 text-gray-500">
                        {page}
                      </span>
                    )
                  ))}

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === totalPages
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 text-kyool-blue hover:bg-gray-700'
                    }`}
                    aria-label="Next page"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchScreen;
