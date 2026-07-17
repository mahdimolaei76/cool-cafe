import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { useAppStore } from '@/store';
const slides = [
  '/images/hero-1.jpg',
  '/images/hero-2.jpg',
  '/images/hero-3.jpg',
  '/images/hero-4.jpg',
];
const logoIcon = '/images/logo.jpg'
const AUTO_PLAY_DURATION = 5000;

export default function MenuHero() {
  const { settings } = useAppStore();

  const [activeSlide, setActiveSlide] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextSlide = () => {
    setActiveSlide((prev) =>
      prev === slides.length - 1 ? 0 : prev + 1
    );
  };


  const prevSlide = () => {
    setActiveSlide((prev) =>
      prev === 0 ? slides.length - 1 : prev - 1
    );
  };


  const goToSlide = (index: number) => {
    setActiveSlide(index);
  };


  useEffect(() => {
    if (imagesReady) {
      setActiveSlide(0);
      timerRef.current = setInterval(() => {
        nextSlide();
      }, AUTO_PLAY_DURATION);


      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [imagesReady]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        prevSlide();
      }

      if (event.key === 'ArrowRight') {
        nextSlide();
      }
    };


    window.addEventListener(
      'keydown',
      handleKey
    );


    return () => {
      window.removeEventListener(
        'keydown',
        handleKey
      );
    };
  }, []);
  useEffect(() => {
    let cancelled = false;

    Promise.all(
      slides.map((src) => {
        return new Promise<void>((resolve) => {
          const img = new Image();

          img.src = src;

          const done = () => resolve();

          img.onload = () => {
            if (img.decode) {
              img.decode().then(done).catch(done);
            } else {
              done();
            }
          };

          img.onerror = done;
        });
      })
    ).then(() => {
      if (!cancelled) {
        setImagesReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);
  const currentSlides = imagesReady ? slides : [slides[0]];

  return (
    <div
      className="
      relative
      h-[60vh]
      min-h-[420px]
      max-h-[700px]
      overflow-hidden
      bg-zinc-950
      "
    >

      {/* Background Slider */}
      <div className="absolute inset-0">

        <AnimatePresence mode="wait">

          {currentSlides.map((slide, index) => (
            <div
              key={slide}
              className="
      absolute
      inset-0
      overflow-hidden
    "
            >

              {/* Background blurred image */}
              <motion.img
                src={slide}
                className="
        absolute
        inset-0
        w-full
        h-full
        object-cover
        scale-110
        blur-2xl
        brightness-50
      "
                animate={{
                  opacity: index === activeSlide ? 1 : 0,
                }}
                transition={{
                  duration: 1,
                }}
              />


              {/* Main image */}
              <motion.img
                src={slide}
                loading="eager"
                decoding="async"
                className="
        absolute
        inset-0
        w-full
        h-full
        object-contain
        mx-auto
      "
                initial={false}
                animate={{
                  opacity: index === activeSlide ? 1 : 0,
                  scale: index === activeSlide ? 1.05 : 1,
                }}
                transition={{
                  duration: 1,
                }}
              />

            </div>
          ))}
        </AnimatePresence>


        {/* Dark Overlay */}
        <div
          className="
            absolute
            inset-0
            bg-gradient-to-b
            from-black/70
            via-black/50
            to-zinc-50
            dark:to-zinc-950
          "
        />

      </div>



      {/* Slider Controls */}

      <div
        className="
          absolute
          inset-x-0
          top-1/2
          -translate-y-1/2
          flex
          justify-between
          px-5
          z-20
        "
      >

        <button
          onClick={prevSlide}
          className="
            w-10
            h-10
            rounded-full
            flex
            items-center
            justify-center
            bg-black/30
            backdrop-blur-md
            border
            border-white/20
            text-white
            hover:bg-black/50
            transition
          "
        >
          <ChevronRight className="w-5 h-5" />
        </button>


        <button
          onClick={nextSlide}
          className="
            w-10
            h-10
            rounded-full
            flex
            items-center
            justify-center
            bg-black/30
            backdrop-blur-md
            border
            border-white/20
            text-white
            hover:bg-black/50
            transition
          "
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

      </div>
      {/* Content */}
      <div
        className="
          relative
          h-full
          flex
          flex-col
          items-center
          justify-center
          text-center
          px-6
          z-10
        "
      >

        <motion.div
          initial={{
            opacity: 0,
            y: 40,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 1,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="
            flex
            flex-col
            items-center
          "
        >


          {/* Logo Badge */}

          <motion.div
            initial={{
              opacity: 0,
              scale: 0,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              delay: 0.3,
              type: 'spring',
              stiffness: 200,
            }}
            className="
              w-20
              h-20
              md:w-24
              md:h-24
              bg-white
              rounded-[1.5rem]
              shadow-2xl
              flex
              items-center
              justify-center
              mb-6
            "
          >

            <img
              className="
                text-brand-600
                font-black
                text-3xl
                md:text-4xl
                rounded-3xl
              "
              src={logoIcon}
            >

            </img>

          </motion.div>



          {/* Name */}

          <h1
            className="
              text-5xl
              md:text-7xl
              font-black
              text-white
              tracking-tight
              leading-none
            "
            style={{
              fontFamily:
                'Playfair Display, serif',
            }}
          >
            COOL
          </h1>


          <p
            className="
              text-brand-300
              text-xs
              md:text-sm
              font-bold
              tracking-[0.4em]
              uppercase
              mt-2
            "
          >
            Specialty Coffee
          </p>



          {/* Info Pills */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.6,
              duration: 0.6,
            }}
            className="
              mt-6
              flex
              flex-wrap
              items-center
              justify-center
              gap-3
            "
          >

            <div
              className="
                flex
                items-center
                gap-1.5
                px-4
                py-2
                rounded-full
                bg-white/10
                backdrop-blur-md
                border
                border-white/10
                text-white/80
                text-xs
              "
            >

              <Clock
                className="
                  w-3.5
                  h-3.5
                "
              />

              {settings.workingHours || '۷ صبح – ۱۰ شب'}

            </div>



            <Link
              to="/track"
              className="
                flex
                items-center
                gap-1.5
                px-4
                py-2
                rounded-full
                bg-white
                text-brand-800
                text-xs
                font-bold
                shadow-sm
                hover:bg-white/90
                transition-colors
              "
            >

              <Search
                className="
                  w-3.5
                  h-3.5
                "
              />

              پیگیری سفارش

            </Link>


          </motion.div>
          {/* Tagline */}

          <motion.p
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.8,
            }}
            className="
              mt-5
              text-white/50
              text-sm
              font-light
              max-w-xs
            "
          >
            قهوه تخصصی · شیرینی دست‌ساز · فضای دنج
          </motion.p>


        </motion.div>


      </div>



      {/* Pagination */}

      <div
        className="
          absolute
          bottom-6
          left-1/2
          -translate-x-1/2
          z-30
          flex
          items-center
          gap-2
        "
      >

        {slides.map((_, index) => (

          <button
            key={index}
            onClick={() => goToSlide(index)}
            className="
              relative
              overflow-hidden
              h-2
              rounded-full
              bg-white/30
              transition-all
              duration-300
            "
            style={{
              width:
                index === activeSlide
                  ? 40
                  : 10,
            }}
          >

            {index === activeSlide && (

              <motion.span
                key={activeSlide}
                initial={{
                  width: '0%',
                }}
                animate={{
                  width: '100%',
                }}
                transition={{
                  duration:
                    AUTO_PLAY_DURATION / 1000,
                  ease: 'linear',
                }}
                className="
                  absolute
                  inset-y-0
                  left-0
                  bg-white
                  rounded-full
                "
              />

            )}

          </button>

        ))}


      </div>


    </div>
  );
}