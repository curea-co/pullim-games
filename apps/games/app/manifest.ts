import type { MetadataRoute } from "next";
import { palette } from "@/lib/design-tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "풀림 게임즈",
    short_name: "풀림 게임즈",
    description:
      "5분, 손가락으로 푸는 학습 게임. 푸는 동작이 곧 학습 메커니즘이 되도록 설계된 모바일 웹 학습 게임.",
    start_url: "/games",
    display: "standalone",
    orientation: "portrait",
    background_color: palette.paper,
    theme_color: palette.blue,
    lang: "ko-KR",
    categories: ["education", "games"],
  };
}
