/**
 * CelebrationAnimation — Premium Tata cars flyover on deal approval
 * 
 * Professional, subtle animation that triggers when deals are approved
 */
import { useEffect, useState, memo } from 'react';

const TATA_CARS = [
  { name: 'Punch', emoji: '🚗', color: '#1e3a5f' },
  { name: 'Nexon', emoji: '🚙', color: '#2d5a87' },
  { name: 'Harrier', emoji: '🚘', color: '#3d7ab5' },
  { name: 'Safari', emoji: '🛻', color: '#4a90d9' },
];

export default memo(function CelebrationAnimation({ show, onComplete }) {
  const [active, setActive] = useState(false);
  const [cars, setCars] = useState([]);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (show && !active) {
      setActive(true);
      setFadingOut(false);
      
      // Generate flying cars with random positions and delays
      const generatedCars = TATA_CARS.map((car, index) => ({
        ...car,
        id: `car-${Date.now()}-${index}`,
        top: 15 + (index * 18) + Math.random() * 10, // Stagger vertically
        delay: index * 0.3 + Math.random() * 0.2, // Stagger animation start
        scale: 0.7 + Math.random() * 0.4, // Vary size
        speed: 3 + Math.random() * 2, // Vary speed
      }));
      
      setCars(generatedCars);

      // Start fading out after 2 seconds
      const fadeTimer = setTimeout(() => {
        setFadingOut(true);
      }, 2000);

      // Clear after animation completes (2s visible + 0.5s fade)
      const clearTimer = setTimeout(() => {
        setActive(false);
        setFadingOut(false);
        setCars([]);
        onComplete?.();
      }, 3500);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [show, active, onComplete]);

  if (!active) return null;

  return (
    <div className="celebration-overlay" aria-hidden="true">
      <div className="celebration-bg-gradient" />
      
      {/* Flying cars */}
      {cars.map((car) => (
        <div
          key={car.id}
          className="flying-car"
          style={{
            top: `${car.top}%`,
            animationDelay: `${car.delay}s`,
            animationDuration: `${car.speed}s`,
            transform: `scale(${car.scale})`,
          }}
        >
          <div className="car-container" style={{ '--car-color': car.color }}>
            <span className="car-icon">{car.emoji}</span>
            <div className="car-glow" />
            <div className="car-trail" />
          </div>
        </div>
      ))}

      {/* Sparkle particles */}
      <div className="sparkles">
        {[...Array(20)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`,
            }}
          />
        ))}
      </div>

      {/* Success message - fades out after 2 seconds */}
      <div className={`celebration-message ${fadingOut ? 'fade-out' : ''}`}>
        <div className="message-badge">
          <span className="badge-icon">✓</span>
          <span className="badge-text">Deal Approved</span>
        </div>
      </div>
    </div>
  );
});
