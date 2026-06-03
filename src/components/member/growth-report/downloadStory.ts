import { domToPng } from "modern-screenshot";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

/**
 * 인스타그램 스토리 규격(1080×1920) PNG 다운로드
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * await downloadInstagramStory(ref.current, "smarpt-weekly-story");
 */
export async function downloadInstagramStory(
  element: HTMLElement | null,
  filename = "smarpt-growth-story"
): Promise<void> {
  if (!element) throw new Error("스토리 카드 요소를 찾을 수 없습니다.");

  const dataUrl = await domToPng(element, {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    scale: 1,
    backgroundColor: "#f7f8f4",
  });

  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

export { STORY_WIDTH, STORY_HEIGHT };
