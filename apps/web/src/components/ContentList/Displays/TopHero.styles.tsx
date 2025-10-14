import { Button } from '@heroui/react';
import styled from 'styled-components';

export const contentTypeColors = {
  program: '#BB6BD9',
  tvshow: '#EB3F5E',
};

export const ContentThemedButton = styled(Button)`
  background: ${contentTypeColors['program']};
  color: white;
`;
