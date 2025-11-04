import React from 'react';
import styled from 'styled-components';

type BtnDirection = 'left' | 'right';

interface ShowcaseBtnProps {
  isVisible: boolean;
  direction: BtnDirection;
  onBtnClick: () => void;
}

export const StyledArrowBtn = styled.button(() => ({
  width: '32px',
  height: '32px',
}));

const ShowcaseBtn: React.FC<ShowcaseBtnProps> = ({
  direction,
  isVisible,
  onBtnClick,
}) => {
  return (
    <div
      className={`absolute bottom-0 ${direction == 'left' ? 'left-0' : 'right-0'} top-0 grid place-items-center`}
    >
      {isVisible && (
        <StyledArrowBtn
          onClick={() => {
            console.log('proper btn');
            onBtnClick();
          }}
          className="z-10 bg-kyool-blue/100 hover:cursor-pointer hover:bg-kyool-blue-dark/100 text-white rounded-full p-1 transition-all duration-200"
          aria-label="Scroll left"
        >
          <svg
            width="18"
            height="18"
            viewBox={direction == 'left' ? '0 0 18 24' : '0 0 14 24'}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={direction == 'left' ? 'M15 18L9 12L15 6' : 'M9 18L15 12L9 6'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </StyledArrowBtn>
      )}
    </div>
  );
};

export default ShowcaseBtn;
