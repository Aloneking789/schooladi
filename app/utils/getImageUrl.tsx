import React from "react";
import { Image, ImageProps } from "react-native";

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "/no-photo.png";
  return `https://1rzlgxk8-5001.inc1.devtunnels.ms/${path.replace(/\\/g, "/")}`;
}

interface RemoteImageProps extends Omit<ImageProps, 'source'> {
  path: string | null | undefined;
  alt?: string;
}

const RemoteImage: React.FC<RemoteImageProps> = ({ path, alt, ...props }) => {
  return (
    <Image
      source={{ uri: getImageUrl(path) }}
      accessibilityLabel={alt}
      {...props}
    />
  );
};

export default RemoteImage;
