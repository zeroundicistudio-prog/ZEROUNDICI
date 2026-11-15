import React from 'react';
import {Composition} from 'remotion';
import {JustGuide, VideoProps} from './Video';
import {FPS, H, W} from './theme';

const defaults: VideoProps = {brand: 'ZERO|UNDICI', mark: '01', tagline: 'sewing tips'};

export const Root: React.FC = () => (
  <Composition id="JustGuide" component={JustGuide} durationInFrames={32 * FPS} fps={FPS} width={W} height={H} defaultProps={defaults} />
);
