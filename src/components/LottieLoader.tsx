import React from 'react';

const LottieLoader: React.FC = () => (
  <div style={{ width: 120, height: 120, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <lottie-player
      src="https://cdn.lottielab.com/l/5sVSEnWYQNEv1F.json"
      background="transparent"
      speed="1"
      style={{ width: '100%', height: '100%' }}
      loop
      autoplay
    ></lottie-player>
  </div>
);

export default LottieLoader; 