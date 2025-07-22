import React from 'react';

const LottieLoader: React.FC = () => (
  <div
    style={{
      width: 120,
      height: 90, // 120px - 30px crop
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative'
    }}
  >
    <lottie-player
      src="https://cdn.lottielab.com/l/5sVSEnWYQNEv1F.json"
      background="transparent"
      speed="1"
      style={{
        width: '100%',
        height: 120 // no marginTop, crop is at the bottom
      }}
      loop
      autoplay
    ></lottie-player>
  </div>
);

export default LottieLoader; 