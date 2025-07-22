import React from 'react';
import { Player } from 'lottie-react';

const LottieLoader: React.FC = () => (
  <div style={{ width: 120, height: 120, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <Player
      autoplay
      loop
      src="https://cdn.lottielab.com/l/5sVSEnWYQNEv1F.json"
      style={{ width: '100%', height: '100%' }}
    />
  </div>
);

export default LottieLoader; 