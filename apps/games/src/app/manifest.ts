import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "풀림 게임즈",
    short_name: "풀림 게임즈",
    description:
      "5분, 손가락으로 푸는 학습 게임. 푸는 동작이 곧 학습 메커니즘이 되도록 설계된 모바일 웹 학습 게임.",
    start_url: "/games",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBFAF8",
    theme_color: "#0362DA",
    lang: "ko-KR",
    categories: ["education", "games"],
  };
}
