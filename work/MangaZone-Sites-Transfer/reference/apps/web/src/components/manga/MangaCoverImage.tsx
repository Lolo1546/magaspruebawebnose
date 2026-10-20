import Image, { type ImageProps } from "next/image";
import { isControlledMangaCover } from "@/utils/controlled-manga-cover";

export default function MangaCoverImage(props: ImageProps) {
  return (
    <Image
      {...props}
      alt={props.alt}
      unoptimized={isControlledMangaCover(props.src) || props.unoptimized}
    />
  );
}
