import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import imagesLoaded from 'imagesloaded';
import './PaintingSelector.css';

interface PaintingSelectorProps {
  onSelect: (paintingId: string) => void;
}

const PaintingSelector: React.FC<PaintingSelectorProps> = ({ onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const buttons = {
      prev: container.querySelector(".btn--left") as HTMLButtonElement,
      next: container.querySelector(".btn--right") as HTMLButtonElement,
    };
    const cardsContainerEl = container.querySelector(".cards__wrapper") as HTMLElement;
    const appBgContainerEl = container.querySelector(".selector__bg") as HTMLElement;
    const cardInfosContainerEl = container.querySelector(".info__wrapper") as HTMLElement;

    if (!buttons.prev || !buttons.next || !cardsContainerEl || !appBgContainerEl || !cardInfosContainerEl) return;

    function swapCards(direction: "left" | "right") {
      const currentCardEl = cardsContainerEl.querySelector(".current--card") as HTMLElement;
      const previousCardEl = cardsContainerEl.querySelector(".previous--card") as HTMLElement;
      const nextCardEl = cardsContainerEl.querySelector(".next--card") as HTMLElement;

      const currentBgImageEl = appBgContainerEl.querySelector(".current--image") as HTMLElement;
      const previousBgImageEl = appBgContainerEl.querySelector(".previous--image") as HTMLElement;
      const nextBgImageEl = appBgContainerEl.querySelector(".next--image") as HTMLElement;

      changeInfo(direction);
      swapCardsClass();
      removeCardEvents(currentCardEl);

      function swapCardsClass() {
        currentCardEl.classList.remove("current--card");
        previousCardEl.classList.remove("previous--card");
        nextCardEl.classList.remove("next--card");

        currentBgImageEl.classList.remove("current--image");
        previousBgImageEl.classList.remove("previous--image");
        nextBgImageEl.classList.remove("next--image");

        currentCardEl.style.zIndex = "50";
        currentBgImageEl.style.zIndex = "-2";

        if (direction === "right") {
          previousCardEl.style.zIndex = "20";
          nextCardEl.style.zIndex = "30";
          nextBgImageEl.style.zIndex = "-1";

          currentCardEl.classList.add("previous--card");
          previousCardEl.classList.add("next--card");
          nextCardEl.classList.add("current--card");

          currentBgImageEl.classList.add("previous--image");
          previousBgImageEl.classList.add("next--image");
          nextBgImageEl.classList.add("current--image");
        } else if (direction === "left") {
          previousCardEl.style.zIndex = "30";
          nextCardEl.style.zIndex = "20";
          previousBgImageEl.style.zIndex = "-1";

          currentCardEl.classList.add("next--card");
          previousCardEl.classList.add("current--card");
          nextCardEl.classList.add("previous--card");

          currentBgImageEl.classList.add("next--image");
          previousBgImageEl.classList.add("current--image");
          nextBgImageEl.classList.add("previous--image");
        }
      }
    }

    function changeInfo(direction: "left" | "right") {
      const currentInfoEl = cardInfosContainerEl.querySelector(".current--info") as HTMLElement;
      const previousInfoEl = cardInfosContainerEl.querySelector(".previous--info") as HTMLElement;
      const nextInfoEl = cardInfosContainerEl.querySelector(".next--info") as HTMLElement;

      gsap.timeline()
        .to([buttons.prev, buttons.next], {
          duration: 0.2,
          opacity: 0.5,
          pointerEvents: "none",
        })
        .to(
          currentInfoEl.querySelectorAll(".text"),
          {
            duration: 0.4,
            stagger: 0.1,
            translateY: "-120px",
            opacity: 0,
          },
          "-="
        )
        .call(() => {
          swapInfosClass();
        })
        .call(() => initCardEvents())
        .fromTo(
          direction === "right"
            ? nextInfoEl.querySelectorAll(".text")
            : previousInfoEl.querySelectorAll(".text"),
          {
            opacity: 0,
            translateY: "40px",
          },
          {
            duration: 0.4,
            stagger: 0.1,
            translateY: "0px",
            opacity: 1,
          }
        )
        .to([buttons.prev, buttons.next], {
          duration: 0.2,
          opacity: 1,
          pointerEvents: "all",
        });

      function swapInfosClass() {
        currentInfoEl.classList.remove("current--info");
        previousInfoEl.classList.remove("previous--info");
        nextInfoEl.classList.remove("next--info");

        if (direction === "right") {
          currentInfoEl.classList.add("previous--info");
          nextInfoEl.classList.add("current--info");
          previousInfoEl.classList.add("next--info");
        } else if (direction === "left") {
          currentInfoEl.classList.add("next--info");
          nextInfoEl.classList.add("previous--info");
          previousInfoEl.classList.add("current--info");
        }
      }
    }

    function updateCard(e: PointerEvent) {
      const card = e.currentTarget as HTMLElement;
      const box = card.getBoundingClientRect();
      const centerPosition = {
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
      };
      const angle = Math.atan2(e.pageX - centerPosition.x, 0) * (35 / Math.PI);
      gsap.set(card, {
        "--current-card-rotation-offset": `${angle}deg`,
      });
      const currentInfoEl = cardInfosContainerEl.querySelector(".current--info");
      if (currentInfoEl) {
        gsap.set(currentInfoEl, {
          rotateY: `${angle}deg`,
        });
      }
    }

    function resetCardTransforms(e: PointerEvent) {
      const card = e.currentTarget as HTMLElement;
      const currentInfoEl = cardInfosContainerEl.querySelector(".current--info");
      gsap.set(card, {
        "--current-card-rotation-offset": 0,
      });
      if (currentInfoEl) {
        gsap.set(currentInfoEl, {
          rotateY: 0,
        });
      }
    }

    function initCardEvents() {
      const currentCardEl = cardsContainerEl.querySelector(".current--card") as HTMLElement;
      if (currentCardEl) {
        currentCardEl.addEventListener("pointermove", updateCard as any);
        currentCardEl.addEventListener("pointerout", resetCardTransforms as any);
      }
    }

    function removeCardEvents(card: HTMLElement) {
      if (card) {
        card.removeEventListener("pointermove", updateCard as any);
        card.removeEventListener("pointerout", resetCardTransforms as any);
      }
    }

    function init() {
      const tl = gsap.timeline();
      tl.to(cardsContainerEl.children, {
        delay: 0.15,
        duration: 0.5,
        stagger: {
          ease: "power4.inOut",
          from: "right" as any,
          amount: 0.1,
        },
        "--card-translateY-offset": "0%",
      })
        .to(cardInfosContainerEl.querySelector(".current--info")!.querySelectorAll(".text"), {
          delay: 0.5,
          duration: 0.4,
          stagger: 0.1,
          opacity: 1,
          translateY: 0,
        })
        .to(
          [buttons.prev, buttons.next],
          {
            duration: 0.4,
            opacity: 1,
            pointerEvents: "all",
          },
          "-=0.4"
        );
    }

    const waitForImages = () => {
      const images = Array.from(container.querySelectorAll("img"));
      const totalImages = images.length;
      let loadedImages = 0;
      const loaderEl = container.querySelector(".loader span") as HTMLElement;

      gsap.set(cardsContainerEl.children, {
        "--card-translateY-offset": "100vh",
      });
      
      const currentInfoTexts = cardInfosContainerEl.querySelector(".current--info")?.querySelectorAll(".text");
      if (currentInfoTexts) {
          gsap.set(currentInfoTexts, {
            translateY: "40px",
            opacity: 0,
          });
      }
      gsap.set([buttons.prev, buttons.next], {
        pointerEvents: "none",
        opacity: "0",
      });

      if (totalImages === 0) {
        init();
        return;
      }

      images.forEach((image) => {
        imagesLoaded(image, (instance: any) => {
          if (instance.isComplete) {
            loadedImages++;
            const loadProgress = loadedImages / totalImages;

            gsap.to(loaderEl, {
              duration: 1,
              scaleX: loadProgress,
              backgroundColor: `hsl(${loadProgress * 120}, 100%, 50%)`,
            });

            if (totalImages === loadedImages) {
              gsap.timeline()
                .to(container.querySelector(".loading__wrapper"), {
                  duration: 0.8,
                  opacity: 0,
                  pointerEvents: "none",
                })
                .call(() => init());
            }
          }
        });
      });
    };

    const handleLeftClick = () => swapCards("left");
    const handleRightClick = () => swapCards("right");

    buttons.prev.addEventListener("click", handleLeftClick);
    buttons.next.addEventListener("click", handleRightClick);
    
    // Select painting on click of any card
    const handleCardClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const clickedCard = target.closest(".card");
        if (clickedCard) {
            const paintingId = clickedCard.getAttribute("data-painting-id");
            if (paintingId) {
                onSelect(paintingId);
            }
        }
    };
    cardsContainerEl.addEventListener("click", handleCardClick);

    waitForImages();
    initCardEvents();

    return () => {
      buttons.prev.removeEventListener("click", handleLeftClick);
      buttons.next.removeEventListener("click", handleRightClick);
      cardsContainerEl.removeEventListener("click", handleCardClick);
      const currentCardEl = cardsContainerEl.querySelector(".current--card") as HTMLElement;
      if (currentCardEl) removeCardEvents(currentCardEl);
    };
  }, [onSelect]);

  return (
    <div className="selector-container" ref={containerRef}>
      <h1 className="main-title">人物故事图册三则——仇英</h1>
      
      <div className="selector-app">
        <div className="cardList">
          <button className="cardList__btn btn btn--left">
            <div className="icon">
              <svg>
                <use xlinkHref="#arrow-left"></use>
              </svg>
            </div>
          </button>

          <div className="cards__wrapper">
            <div className="card current--card" data-painting-id="qy_guifei">
              <div className="card__image">
                <img src="/assets/贵妃晓妆.jpg" alt="贵妃晓妆" />
              </div>
            </div>

            <div className="card next--card" data-painting-id="qy_gaoshan">
              <div className="card__image">
                <img src="/assets/高山流水.jpg" alt="高山流水" />
              </div>
            </div>

            <div className="card previous--card" data-painting-id="qy_xunyang">
              <div className="card__image">
                <img src="/assets/浔阳琵琶.jpg" alt="浔阳琵琶" />
              </div>
            </div>
          </div>

          <button className="cardList__btn btn btn--right">
            <div className="icon">
              <svg>
                <use xlinkHref="#arrow-right"></use>
              </svg>
            </div>
          </button>
        </div>

        <div className="infoList">
          <div className="info__wrapper">
            <div className="info current--info">
              <h1 className="text name">贵妃晓妆</h1>
              <h4 className="text location">人物故事图册</h4>
              <p className="text description">仇英 · 明代</p>
            </div>

            <div className="info next--info">
              <h1 className="text name">高山流水</h1>
              <h4 className="text location">人物故事图册</h4>
              <p className="text description">仇英 · 明代</p>
            </div>

            <div className="info previous--info">
              <h1 className="text name">浔阳琵琶</h1>
              <h4 className="text location">人物故事图册</h4>
              <p className="text description">仇英 · 明代</p>
            </div>
          </div>
        </div>

        <div className="selector__bg">
          <div className="selector__bg__image current--image">
            <img src="/assets/贵妃晓妆.jpg" alt="贵妃晓妆" />
          </div>
          <div className="selector__bg__image next--image">
            <img src="/assets/高山流水.jpg" alt="高山流水" />
          </div>
          <div className="selector__bg__image previous--image">
            <img src="/assets/浔阳琵琶.jpg" alt="浔阳琵琶" />
          </div>
        </div>
      </div>

      <div className="loading__wrapper">
        <div className="loader--text">加载中...</div>
        <div className="loader">
          <span></span>
        </div>
      </div>

      <svg className="icons" style={{ display: "none" }}>
        <symbol id="arrow-left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <polyline
            points="328 112 184 256 328 400"
            style={{
              fill: "none",
              stroke: "#fff",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "48px",
            }}
          />
        </symbol>
        <symbol id="arrow-right" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <polyline
            points="184 112 328 256 184 400"
            style={{
              fill: "none",
              stroke: "#fff",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: "48px",
            }}
          />
        </symbol>
      </svg>
    </div>
  );
};

export default PaintingSelector;
