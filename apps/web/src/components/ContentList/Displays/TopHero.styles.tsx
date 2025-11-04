import { Button } from '@heroui/react';
import { MediaCategory } from 'share';
import styled from 'styled-components';

export const contentTypeColors = {
  movie: '#BB6BD9',
  tvshow: '#EB3F5E',
};

export const ContentThemedButton = styled(Button)<{
  contentType?: MediaCategory;
}>(() => ({
  background: contentTypeColors['movie'],
  color: 'white',
}));
