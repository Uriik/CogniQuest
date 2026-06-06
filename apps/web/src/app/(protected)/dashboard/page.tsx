"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardPage() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(1);
  const games = [
    {
      id: "orbital",
      title: "GALACTIC VOYAGER",
      subtitle: "Spaceship",
      cover: "/orbital_cover.png",
      locked: true,
      progress: 40,
      progressColor: "var(--accent-purple)",
    },
    {
      id: "naval",
      title: "NAVAL ODYSSEY",
      subtitle: "Naval Ship",
      cover: "/naval_cover.png",
      locked: false,
      progress: 65,
      progressColor: "linear-gradient(to right, var(--accent-purple), var(--primary))",
    },
    {
      id: "eco",
      title: "BIO-EXPLORER",
      subtitle: "Bio-Plant",
      cover: "/eco_cover.png",
      locked: true,
      progress: 25,
      progressColor: "var(--accent-purple)",
    },
  ];

  const handlePrev = () => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => Math.min(games.length - 1, prev + 1));
  };

  const handlePlayNaval = () => {
    router.push("/lobby");
  };

  return (
    <div className="games-carousel-section">
      <h1 className="section-title">Escolha seu Desafio</h1>
      <p className="section-subtitle">Navegue pelas missões e selecione seu jogo educativo</p>

      <div className="carousel-container">
        <button 
          className="carousel-nav-btn prev-btn" 
          onClick={handlePrev}
          disabled={activeIndex === 0}
          style={{ opacity: activeIndex === 0 ? 0.3 : 1 }}
        >
          ←
        </button>

        <div className="carousel-track-wrapper">
          <motion.div 
            className="carousel-track"
            initial={false}
            animate={{ x: `calc(50% - 125px - ${activeIndex * 278}px)` }} 
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {games.map((game, index) => {
              const isActive = index === activeIndex;
              return (
                <div 
                  key={game.id} 
                  className={`carousel-card ${isActive ? 'active' : ''} ${game.locked ? 'card-locked' : ''}`}
                  onClick={() => setActiveIndex(index)}
                >
                  <div className="card-bg-img" style={{ backgroundImage: `url(${game.cover})` }}></div>
                  <div className="card-overlay"></div>
                  <div className="card-body">
                    <h3>{game.title}</h3>
                    <p>{game.subtitle}</p>
                    <div className="card-footer">
                      {game.locked ? (
                        <button className="card-action-btn locked">Bloqueado</button>
                      ) : (
                        <button 
                          className="card-action-btn active" 
                          onClick={(e) => { e.stopPropagation(); handlePlayNaval(); }}
                        >
                          Jogar
                        </button>
                      )}
                      <div className="card-progress-bar">
                        <div className="progress-fill" style={{ width: `${game.progress}%`, background: game.progressColor }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>

        <button 
          className="carousel-nav-btn next-btn" 
          onClick={handleNext}
          disabled={activeIndex === games.length - 1}
          style={{ opacity: activeIndex === games.length - 1 ? 0.3 : 1 }}
        >
          →
        </button>
      </div>

      {/* Indicadores do Carrossel */}
      <div className="carousel-dots">
        {games.map((_, idx) => (
          <span 
            key={idx} 
            className={`dot ${idx === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(idx)}
            style={{ cursor: "pointer" }}
          ></span>
        ))}
      </div>
    </div>
  );
}
